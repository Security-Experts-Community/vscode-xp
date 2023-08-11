import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

import { FileSystemHelper } from '../../helpers/fileSystemHelper';
import { ExecutionResult, ProcessHelper } from '../../helpers/processHelper';
import { Configuration } from '../configuration';
import { XpException } from '../xpException';
import { RuleBaseItem } from '../content/ruleBaseItem';
import { SiemjConfigHelper } from './siemjConfigHelper';
import { FileSystemException } from '../fileSystemException';
import { SiemjConfBuilder } from './siemjConfigBuilder';
import { ExceptionHelper } from '../../helpers/exceptionHelper';
import { ExtensionHelper } from '../../helpers/extensionHelper';
import { Localization, LocalizationExample } from '../content/localization';
import { IntegrationTest } from '../tests/integrationTest';
import { StringHelper } from '../../helpers/stringHelper';
import { EOF } from 'dns';
import { TestHelper } from '../../helpers/testHelper';

export class SiemjManager {

	constructor(private _config : Configuration) {}

	public async buildSchema(rule: RuleBaseItem) : Promise<string> {

		await SiemjConfigHelper.clearArtifacts(this._config);

		const contentRootPath = rule.getContentRootPath(this._config);
		const contentRootFolder = path.basename(contentRootPath);
		const outputFolder = this._config.getOutputDirectoryPath(contentRootFolder);

		if(!fs.existsSync(outputFolder)) {
			fs.mkdirSync(outputFolder, {recursive: true});
		}
		
		// Получаем нужный конфиг для нормализации событий.
		const configBuilder = new SiemjConfBuilder(this._config, contentRootPath);
		configBuilder.addTablesSchemaBuilding();
		const siemjConfContent = configBuilder.build();

		const siemjOutput = await this.executeSiemjConfig(rule, siemjConfContent);
		this.processOutput(siemjOutput.output);

		const schemaFilePath = this._config.getSchemaFullPath(contentRootFolder);
		if(!fs.existsSync(schemaFilePath)) {
			throw new XpException("Ошибка компиляции схемы БД. Результирующий файл не создан.");
		}

		return schemaFilePath;
	}

	public async normalize(rule: RuleBaseItem, rawEventsFilePath: string) : Promise<string> {

		if(!fs.existsSync(rawEventsFilePath)) {
			throw new FileSystemException(`Файл сырых событий '${rawEventsFilePath}' не существует.`);
		}

		const contentFullPath = rule.getPackagePath(this._config);
		if(!fs.existsSync(contentFullPath)) {
			throw new FileSystemException(`Директория контента '${contentFullPath}' не существует.`);
		}

		await SiemjConfigHelper.clearArtifacts(this._config);

		const contentRootPath = rule.getContentRootPath(this._config);
		const contentRootFolder = path.basename(contentRootPath);
		const outputFolder = this._config.getOutputDirectoryPath(contentRootFolder);

		if(!fs.existsSync(outputFolder)) {
			fs.mkdirSync(outputFolder, {recursive: true});
		}
		
		// Получаем нужный конфиг для нормализации событий.
		const configBuilder = new SiemjConfBuilder(this._config, contentRootPath);
		configBuilder.addNormalizationsGraphBuilding(false);
		configBuilder.addTablesSchemaBuilding();
		configBuilder.addEventsNormalization(rawEventsFilePath);
		const siemjConfContent = configBuilder.build();

		const siemjExecutionResult = await this.executeSiemjConfig(rule, siemjConfContent);
		this.processOutput(siemjExecutionResult.output);

		const normEventsFilePath = this._config.getNormalizedEventsFilePath(contentRootFolder);
		if(!fs.existsSync(normEventsFilePath)) {
			throw new XpException("Ошибка нормализации событий. Файл с результирующим событием не создан.");
		}

		let normEventsContent = await FileSystemHelper.readContentFile(normEventsFilePath);
		normEventsContent = TestHelper.removeFieldsFromJsonl(normEventsContent, 'body');

		if(!normEventsContent) {
			throw new XpException("Нормализатор вернул пустое событие. Проверьте наличие правильного конверта события и наличие необходимой нормализации в дереве контента.");
		}

		return normEventsContent;
	}

	public async normalizeAndEnrich(rule: RuleBaseItem, rawEventsFilePath: string) : Promise<string> {
		if(!fs.existsSync(rawEventsFilePath)) {
			throw new FileSystemException(`Файл сырых событий '${rawEventsFilePath}' не существует.`);
		}

		const contentFullPath = rule.getPackagePath(this._config);
		if(!fs.existsSync(contentFullPath)) {
			throw new FileSystemException(`Директория контента '${contentFullPath}' не существует.`);
		}

		await SiemjConfigHelper.clearArtifacts(this._config);

		const contentRootPath = rule.getContentRootPath(this._config);
		const contentRootFolder = path.basename(contentRootPath);
		const outputFolder = this._config.getOutputDirectoryPath(contentRootFolder);

		if(!fs.existsSync(outputFolder)) {
			fs.mkdirSync(outputFolder, {recursive: true});
		}
		
		const configBuilder = new SiemjConfBuilder(this._config, contentRootPath);
		configBuilder.addNormalizationsGraphBuilding(false);
		configBuilder.addTablesSchemaBuilding();
		configBuilder.addTablesDbBuilding();
		configBuilder.addEnrichmentsGraphBuilding();
		configBuilder.addEventsNormalization(rawEventsFilePath);
		configBuilder.addEventsEnrichment();
		const siemjConfContent = configBuilder.build();

		const siemjExecutionResult = await this.executeSiemjConfig(rule, siemjConfContent);
		this.processOutput(siemjExecutionResult.output);

		const enrichEventsFilePath = this._config.getEnrichedEventsFilePath(contentRootFolder);
		
		if(!fs.existsSync(enrichEventsFilePath)) {
			throw new XpException("Ошибка нормализации и обогащения событий. Файл с результирующим событием не создан.");
		}

		let enrichEventsContent = await FileSystemHelper.readContentFile(enrichEventsFilePath);
		enrichEventsContent = TestHelper.removeFieldsFromJsonl(enrichEventsContent, 'body');
		
		if(!enrichEventsContent) {
			throw new XpException("Обогатитель вернул пустое событие. Проверьте наличие правильного конверта события и наличие необходимой нормализации в дереве контента.");
		}

		return enrichEventsContent;
	}

	public async executeSiemjConfig(rule: RuleBaseItem, siemjConfContent: string) : Promise<ExecutionResult> { 
	
		// Централизованно сохраняем конфигурационный файл для siemj.
		const contentRootPath = rule.getContentRootPath(this._config);
		const contentRootFolder = path.basename(contentRootPath);
		const outputFolder = this._config.getOutputDirectoryPath(contentRootFolder);

		// Создаем пустую схему и дефолты для того, чтобы работали все утилиты.	
		if (!FileSystemHelper.checkIfFilesIsExisting(contentRootPath, /\.tl$/)) {
			const corrDefaultsPath = path.join(outputFolder, "correlation_defaults.json");
			await FileSystemHelper.writeContentFile(corrDefaultsPath,  "{}");

			const schemaPath = path.join(outputFolder, "schema.json");
			await FileSystemHelper.writeContentFile(schemaPath,  "{}");
		}	
		
		const siemjConfigPath = this._config.getTmpSiemjConfigPath(contentRootFolder);
		await SiemjConfigHelper.saveSiemjConfig(siemjConfContent, siemjConfigPath);
		const siemjExePath = this._config.getSiemjPath();

		this._config.getOutputChannel().clear();
		
		// Типовая команда выглядит так:
		// "C:\\PTSIEMSDK_GUI.4.0.0.738\\tools\\siemj.exe" -c C:\\PTSIEMSDK_GUI.4.0.0.738\\temp\\siemj.conf main");
		const result = await ProcessHelper.execute(
			siemjExePath,
			["-c", siemjConfigPath, "main"],
			{	
				encoding: this._config.getSiemjOutputEncoding(),
				outputChannel: this._config.getOutputChannel()
			}
		);
		return result;
	}

	public async correlateAndGetLocalizationExamples(rule: RuleBaseItem, filtredTest : IntegrationTest[]) : Promise<LocalizationExample[]> {
		const contentFullPath = rule.getPackagePath(this._config);
		if(!fs.existsSync(contentFullPath)) {
			throw new FileSystemException(`Директория контента '${contentFullPath}' не существует.`);
		}

		await SiemjConfigHelper.clearArtifacts(this._config);

		const contentRootPath = rule.getContentRootPath(this._config);
		const contentRootFolder = path.basename(contentRootPath);
		const outputFolder = this._config.getOutputDirectoryPath(contentRootFolder);

		if(!fs.existsSync(outputFolder)) {
			fs.mkdirSync(outputFolder, {recursive: true});
		}

		// Удаляем файлы предыдущих локализаций.
		const ruLocalizationFilePath = this._config.getRuLocalizationFilePath(contentRootFolder);
		if(fs.existsSync(ruLocalizationFilePath)) {
			await fs.promises.unlink(ruLocalizationFilePath);
		}

		const enLocalizationFilePath = this._config.getEnLocalizationFilePath(contentRootFolder);
		if(fs.existsSync(enLocalizationFilePath)) {
			await fs.promises.unlink(enLocalizationFilePath);
		}

		// Объединяем все сырые события для тестов в один файл.
		// Это нужно для ускорения процесса получения скоррелированных событий.
		const rawEventsOfAllTest = filtredTest.map(ft => ft.getRawEvents()).join(os.EOL);
		const tmpDir = this._config.getRandTmpSubDirectoryPath();
		await fs.promises.mkdir(tmpDir);

		const rawEventsOfAllTestsFilePath = path.join(tmpDir, this.LOCALIZATION_TEST_FILENAME);
		await FileSystemHelper.writeContentFile(rawEventsOfAllTestsFilePath, rawEventsOfAllTest);

		// Собираем общую часть для всех тестов правила.
		const configBuilder = new SiemjConfBuilder(this._config, contentRootPath);
		configBuilder.addNormalizationsGraphBuilding(false);
		configBuilder.addTablesSchemaBuilding();
		configBuilder.addTablesDbBuilding();
		configBuilder.addCorrelationsGraphBuilding();
		configBuilder.addEnrichmentsGraphBuilding();
		configBuilder.addLocalizationsBuilding(rule.getDirectoryPath());

		configBuilder.addEventsNormalization(rawEventsOfAllTestsFilePath);
		configBuilder.addCorrelateNormalizedEvents();
		configBuilder.addLocalization();

		const siemjConfContent = configBuilder.build();
		const siemjOutput = await this.executeSiemjConfig(rule, siemjConfContent);
		this.processOutput(siemjOutput.output);

		const locExamples = this.readCurrentLocalizationExample(contentRootFolder, rule.getName());
		return locExamples;
	}

	private async readCurrentLocalizationExample(contentRootFolder : string, correlationName : string) : Promise<LocalizationExample[]> {

		// Читаем события с русской локализацией.
		const ruLocalizationFilePath = this._config.getRuLocalizationFilePath(contentRootFolder);
		if(!fs.existsSync(ruLocalizationFilePath)) {
			return [];
		}
		const ruLocalizationEvents = await FileSystemHelper.readContentFile(ruLocalizationFilePath);

		// Читаем события с английской локализацией.
		const enLocalizationFilePath = this._config.getEnLocalizationFilePath(contentRootFolder);
		if(!fs.existsSync(enLocalizationFilePath)) {
			return [];
		}
		const enLocalizationEvents = await FileSystemHelper.readContentFile(enLocalizationFilePath);
		
		// Пустые файлы могут быть, если ничего не попало под критерий.
		if(!ruLocalizationEvents || !enLocalizationEvents) {
			return [];
		}

		const locExamples: LocalizationExample[] = [];
		try {
			const enEvents = enLocalizationEvents.split(os.EOL);
			const ruEvents = ruLocalizationEvents.split(os.EOL);

			for (let index = 0; index < ruEvents.length; index++) {
				// Разделяем несколько корреляционных событий.
				const currRuEventString = ruEvents?.[index];
				if(!currRuEventString) {
					continue;
				}

				const currRuEventObject = JSON.parse(currRuEventString);

				// Могут отработать другие корреляции
				if(currRuEventObject?.correlation_name !== correlationName) {
					continue;
				}

				if(currRuEventObject?.text) {
					// Добавляем русскую локализацию.
					const currLocExample = new LocalizationExample();
					currLocExample.ruText = currRuEventObject?.text;

					// Добавляем соответствующую английскую.
					const currEnEventString = enEvents?.[index];
					if(!currEnEventString) {
						continue;
					}
					const currEnEventObject = JSON.parse(currEnEventString);
					currLocExample.enText = currEnEventObject?.text;
					
					// Проверяем наличие дубликатов.
					const duplicate = locExamples.find(le => le.ruText === currLocExample.ruText && le.enText === currLocExample.enText);
					if(!duplicate && currLocExample.ruText && currLocExample.enText) {
						locExamples.push(currLocExample);
					}
				}
			}
		}
		catch (error) {
			ExtensionHelper.showUserError(`Ошибка разбора локализации из теста`);
			return null;
		}

		return locExamples;
	}

	private processOutput(siemjOutput: string) {
		if(siemjOutput.includes(this.ERROR_SUBSTRING)) {
			this._config.getOutputChannel().show();
			throw new XpException("Ошибка выполнения siemj. Смотри Output.");
		}
	}

	public LOCALIZATION_TEST_FILENAME = "alltestevents.json";

	public ERROR_SUBSTRING = "SUBPROCESS EXIT CODE: 1";
}
