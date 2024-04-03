import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as vscode from 'vscode';

import { FileSystemHelper } from '../../helpers/fileSystemHelper';
import { ExecutionResult, ProcessHelper } from '../../helpers/processHelper';
import { Configuration } from '../configuration';
import { XpException } from '../xpException';
import { RuleBaseItem } from '../content/ruleBaseItem';
import { SiemjConfigHelper } from './siemjConfigHelper';
import { FileSystemException } from '../fileSystemException';
import { SiemjConfBuilder } from './siemjConfigBuilder';
import { DialogHelper } from '../../helpers/dialogHelper';
import { LocalizationExample } from '../content/localization';
import { TestHelper } from '../../helpers/testHelper';
import { RegExpHelper } from '../../helpers/regExpHelper';

export class SiemjManager {

	constructor(private config : Configuration, private _token?: vscode.CancellationToken) {}

	public async buildSchema(rule: RuleBaseItem) : Promise<string> {

		await SiemjConfigHelper.clearArtifacts(this.config);

		const contentRootPath = rule.getContentRootPath(this.config);
		const contentRootFolder = path.basename(contentRootPath);
		const outputFolder = this.config.getOutputDirectoryPath(contentRootFolder);

		if(!fs.existsSync(outputFolder)) {
			fs.mkdirSync(outputFolder, {recursive: true});
		}
		
		// Получаем нужный конфиг для нормализации событий.
		const configBuilder = new SiemjConfBuilder(this.config, contentRootPath);
		configBuilder.addTablesSchemaBuilding();
		const siemjConfContent = configBuilder.build();

		const siemjOutput = await this.executeSiemjConfigForRule(rule, siemjConfContent);
		this.processOutput(siemjOutput.output);

		const schemaFilePath = this.config.getSchemaFullPath(contentRootFolder);
		if(!fs.existsSync(schemaFilePath)) {
			throw new XpException("Ошибка компиляции схемы БД. Результирующий файл не создан");
		}

		return schemaFilePath;
	}

	public async normalize(rule: RuleBaseItem, rawEventsFilePath: string) : Promise<string> {

		if(!fs.existsSync(rawEventsFilePath)) {
			throw new FileSystemException(`Файл сырых событий '${rawEventsFilePath}' не существует`);
		}

		const contentFullPath = rule.getPackagePath(this.config);
		if(!fs.existsSync(contentFullPath)) {
			throw new FileSystemException(`Директория контента '${contentFullPath}' не существует`);
		}

		await SiemjConfigHelper.clearArtifacts(this.config);

		const contentRootPath = rule.getContentRootPath(this.config);
		const contentRootFolder = path.basename(contentRootPath);
		const outputFolder = this.config.getOutputDirectoryPath(contentRootFolder);

		if(!fs.existsSync(outputFolder)) {
			fs.mkdirSync(outputFolder, {recursive: true});
		}
		
		// Получаем нужный конфиг для нормализации событий.
		const configBuilder = new SiemjConfBuilder(this.config, contentRootPath);
		configBuilder.addNormalizationsGraphBuilding(false);
		configBuilder.addTablesSchemaBuilding();
		configBuilder.addEventsNormalization(rawEventsFilePath);
		const siemjConfContent = configBuilder.build();

		const siemjExecutionResult = await this.executeSiemjConfigForRule(rule, siemjConfContent);
		this.processOutput(siemjExecutionResult.output);

		const normEventsFilePath = this.config.getNormalizedEventsFilePath(contentRootFolder);
		if(!fs.existsSync(normEventsFilePath)) {
			throw new XpException("Ошибка нормализации событий. Файл с результирующим событием не создан");
		}

		let normEventsContent = await FileSystemHelper.readContentFile(normEventsFilePath);
		normEventsContent = TestHelper.removeFieldsFromJsonl(normEventsContent, 'body');

		if(!normEventsContent) {
			throw new XpException("Нормализатор вернул пустое событие. Проверьте наличие правильного конверта события и наличие необходимой нормализации в дереве контента");
		}

		return normEventsContent;
	}

	public async normalizeAndEnrich(rule: RuleBaseItem, rawEventsFilePath: string) : Promise<string> {
		if(!fs.existsSync(rawEventsFilePath)) {
			throw new FileSystemException(`Файл сырых событий '${rawEventsFilePath}' не существует`);
		}

		const contentFullPath = rule.getPackagePath(this.config);
		if(!fs.existsSync(contentFullPath)) {
			throw new FileSystemException(`Директория контента '${contentFullPath}' не существует`);
		}

		await SiemjConfigHelper.clearArtifacts(this.config);

		const contentRootPath = rule.getContentRootPath(this.config);
		const contentRootFolder = path.basename(contentRootPath);
		const outputFolder = this.config.getOutputDirectoryPath(contentRootFolder);

		if(!fs.existsSync(outputFolder)) {
			fs.mkdirSync(outputFolder, {recursive: true});
		}
		
		const configBuilder = new SiemjConfBuilder(this.config, contentRootPath);
		configBuilder.addNormalizationsGraphBuilding(false);
		configBuilder.addTablesSchemaBuilding();
		configBuilder.addTablesDbBuilding();
		configBuilder.addEnrichmentsGraphBuilding();
		configBuilder.addEventsNormalization(rawEventsFilePath);
		configBuilder.addEventsEnrichment();
		const siemjConfContent = configBuilder.build();

		const siemjExecutionResult = await this.executeSiemjConfigForRule(rule, siemjConfContent);
		this.processOutput(siemjExecutionResult.output);

		const enrichEventsFilePath = this.config.getEnrichedEventsFilePath(contentRootFolder);
		
		if(!fs.existsSync(enrichEventsFilePath)) {
			throw new XpException("Ошибка нормализации и обогащения событий. Файл с результирующим событием не создан");
		}

		let enrichEventsContent = await FileSystemHelper.readContentFile(enrichEventsFilePath);
		enrichEventsContent = TestHelper.removeFieldsFromJsonl(enrichEventsContent, 'body');
		
		if(!enrichEventsContent) {
			throw new XpException("Обогатитель вернул пустое событие. Проверьте наличие правильного конверта события и наличие необходимой нормализации в дереве контента");
		}

		return enrichEventsContent;
	}

	public async executeSiemjConfigForRule(rule: RuleBaseItem, siemjConfContent: string) : Promise<ExecutionResult> { 
	
		// Централизованно сохраняем конфигурационный файл для siemj.
		const contentRootPath = rule.getContentRootPath(this.config);
		const contentRootFolder = path.basename(contentRootPath);
		const outputFolderPath = this.config.getOutputDirectoryPath(contentRootFolder);

		// Создаем пустую схему и дефолты для того, чтобы работали все утилиты.	
		if (!FileSystemHelper.checkIfFilesIsExisting(contentRootPath, /\.tl$/)) {
			const corrDefaultsPath = path.join(outputFolderPath, "correlation_defaults.json");
			await FileSystemHelper.writeContentFile(corrDefaultsPath,  "{}");

			const schemaPath = path.join(outputFolderPath, "schema.json");
			await FileSystemHelper.writeContentFile(schemaPath,  "{}");
		}	
		
		const siemjConfigPath = this.config.getTmpSiemjConfigPath(contentRootFolder);
		await SiemjConfigHelper.saveSiemjConfig(siemjConfContent, siemjConfigPath);
		const siemjExePath = this.config.getSiemjPath();

		// Типовая команда выглядит так:
		// "C:\\PTSIEMSDK_GUI.4.0.0.738\\tools\\siemj.exe" -c C:\\PTSIEMSDK_GUI.4.0.0.738\\temp\\siemj.conf main");
		const result = await ProcessHelper.execute(
			siemjExePath,
			["-c", siemjConfigPath, "main"],
			{	
				encoding: this.config.getSiemjOutputEncoding(),
				outputChannel: this.config.getOutputChannel(),
				cancellationToken: this._token
			}
		);
		return result;
	}

	public async executeSiemjConfig(contentRootPath: string, siemjConfContent: string) : Promise<ExecutionResult> { 
	
		// Централизованно сохраняем конфигурационный файл для siemj.
		const contentRootFolder = path.basename(contentRootPath);
		const outputFolderPath = this.config.getOutputDirectoryPath(contentRootFolder);

		// Создаем пустую схему и дефолты для того, чтобы работали все утилиты.	
		if (!FileSystemHelper.checkIfFilesIsExisting(contentRootPath, /\.tl$/)) {
			const corrDefaultsPath = path.join(outputFolderPath, "correlation_defaults.json");
			await FileSystemHelper.writeContentFile(corrDefaultsPath,  "{}");

			const schemaPath = path.join(outputFolderPath, "schema.json");
			await FileSystemHelper.writeContentFile(schemaPath,  "{}");
		}	
		
		const siemjConfigPath = this.config.getTmpSiemjConfigPath(contentRootFolder);
		await SiemjConfigHelper.saveSiemjConfig(siemjConfContent, siemjConfigPath);
		const siemjExePath = this.config.getSiemjPath();

		// Типовая команда выглядит так:
		// "C:\\PTSIEMSDK_GUI.4.0.0.738\\tools\\siemj.exe" -c C:\\PTSIEMSDK_GUI.4.0.0.738\\temp\\siemj.conf main");
		const result = await ProcessHelper.execute(
			siemjExePath,
			["-c", siemjConfigPath, "main"],
			{	
				encoding: this.config.getSiemjOutputEncoding(),
				outputChannel: this.config.getOutputChannel(),
				cancellationToken: this._token
			}
		);
		return result;
	}

	/**
	 * Генерирует тестовые локализации для правила на основе временных файлов интеграционных тестов.
	 * @param rule правило для генерации тестов
	 * @param integrationTestsTmpDirPath директория с файлами интеграционного теста. 
	 * @returns список примеров локализаций
	 */
	public async buildLocalizationExamples(rule: RuleBaseItem, integrationTestsTmpDirPath : string) : Promise<LocalizationExample[]> {
		const contentFullPath = rule.getPackagePath(this.config);
		if(!fs.existsSync(contentFullPath)) {
			throw new FileSystemException(`Директория контента '${contentFullPath}' не существует`);
		}

		if(!fs.existsSync(integrationTestsTmpDirPath)) {
			throw new FileSystemException(`Файлы интеграционных тестов по пути '${integrationTestsTmpDirPath}' не были получены`);
		}

		// Нужно собрать все корреляционные события в один файл, который и передать на генерацию локализаций.
		// raw_events_1_norm_enr_cor(r)?_enr.json
		const files = FileSystemHelper.getRecursiveFilesSync(integrationTestsTmpDirPath);
		const correlatedEventFilePaths = files.filter(fp => {
			return RegExpHelper.getEnrichedCorrTestEventsFileName(rule.getName()).test(fp);
		});

		if(correlatedEventFilePaths.length === 0) {
			throw new XpException("Корреляционные события не найдены");
		}

		const contentRootPath = rule.getContentRootPath(this.config);
		const contentRootFolder = path.basename(contentRootPath);

		const correlateEvents = [];
		for(const correlatedEventFilePath of correlatedEventFilePaths) {
			let correlateEventsFileContent = await FileSystemHelper.readContentFile(correlatedEventFilePath);
			correlateEventsFileContent = correlateEventsFileContent.trimEnd();
			if(correlateEventsFileContent) {
				correlateEvents.push(correlateEventsFileContent);
			}
		}

		// Собираем все коррелированные события вместе.
		const correlateEventsContent = correlateEvents.join(os.EOL);
		
		// Записываем их в файл.
		const allCorrelateEventsFilePath = path.join(integrationTestsTmpDirPath, this.ALL_CORR_EVENTS_FILENAME);
		await FileSystemHelper.writeContentFile(allCorrelateEventsFilePath, correlateEventsContent);

		await SiemjConfigHelper.clearArtifacts(this.config);

		const outputFolder = this.config.getOutputDirectoryPath(contentRootFolder);
		if(!fs.existsSync(outputFolder)) {
			await fs.promises.mkdir(outputFolder, {recursive: true});
		}

		// Удаляем файлы предыдущих локализаций.
		const ruLocalizationFilePath = this.config.getRuRuleLocalizationFilePath(contentRootFolder);
		if(fs.existsSync(ruLocalizationFilePath)) {
			await fs.promises.unlink(ruLocalizationFilePath);
		}

		const enLocalizationFilePath = this.config.getEnRuleLocalizationFilePath(contentRootFolder);
		if(fs.existsSync(enLocalizationFilePath)) {
			await fs.promises.unlink(enLocalizationFilePath);
		}

		const configBuilder = new SiemjConfBuilder(this.config, contentRootPath);
		configBuilder.addLocalizationsBuilding({
				rulesSrcPath: rule.getDirectoryPath(),
				force: true
			}
		);
		configBuilder.addLocalizationForCorrelatedEvents(allCorrelateEventsFilePath);
		const siemjConfContent = configBuilder.build();
		
		const siemjOutput = await this.executeSiemjConfigForRule(rule, siemjConfContent);
		this.processOutput(siemjOutput.output);

		const locExamples = await this.readCurrentLocalizationExample(contentRootFolder, rule.getName());
		return locExamples;
	}

	private async readCurrentLocalizationExample(contentRootFolder : string, correlationName : string) : Promise<LocalizationExample[]> {

		// Читаем события с русской локализацией.
		const ruLocalizationFilePath = this.config.getRuRuleLocalizationFilePath(contentRootFolder);
		if(!fs.existsSync(ruLocalizationFilePath)) {
			return [];
		}
		const ruLocalizationEvents = await FileSystemHelper.readContentFile(ruLocalizationFilePath);

		// Читаем события с английской локализацией.
		const enLocalizationFilePath = this.config.getEnRuleLocalizationFilePath(contentRootFolder);
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
			DialogHelper.showError(`Ошибка разбора локализации из теста`, error);
			return null;
		}

		return locExamples;
	}

	private processOutput(siemjOutput: string): void {
		if(siemjOutput.includes(this.ERROR_SUBSTRING)) {
			this.config.getOutputChannel().show();
			throw new XpException("Ошибка выполнения siemj. [Смотри Output](command:xp.commonCommands.showOutputChannel)");
		}
	}

	get siemjTmpFilesPath(): string {
		return this._siemjTmpFilesPath;
	}

	private _siemjTmpFilesPath: string;


	public ALL_CORR_EVENTS_FILENAME = "all_corr_events.json";

	public ERROR_SUBSTRING = "SUBPROCESS EXIT CODE: 1";
}
