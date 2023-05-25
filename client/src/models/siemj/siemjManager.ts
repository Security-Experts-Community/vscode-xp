import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

import { FileSystemHelper } from '../../helpers/fileSystemHelper';
import { ProcessHelper } from '../../helpers/processHelper';
import { Configuration } from '../configuration';
import { XpException } from '../xpException';
import { RuleBaseItem } from '../content/ruleBaseItem';
import { SiemjConfigHelper } from './siemjConfigHelper';
import { FileNotFoundException } from '../fileNotFoundException';
import { SiemjConfBuilder } from './siemjConfigBuilder';
import { ExceptionHelper } from '../../helpers/exceptionHelper';
import { ExtensionHelper } from '../../helpers/extensionHelper';
import { Localization, LocalizationExample } from '../content/localization';
import { IntegrationTest } from '../tests/integrationTest';

export class SiemjManager {

	constructor(private _config : Configuration) {}

	public async buildSchema(rule: RuleBaseItem) : Promise<void> {

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

		// Централизованно сохраняем конфигурационный файл для siemj.
		const siemjConfigPath = this._config.getTmpSiemjConfigPath(contentRootFolder);
		await SiemjConfigHelper.saveSiemjConfig(siemjConfContent, siemjConfigPath);
		const siemjExePath = this._config.getSiemjPath();

		this._config.getOutputChannel().clear();

		// Типовая команда выглядит так:
		// "C:\\PTSIEMSDK_GUI.4.0.0.738\\tools\\siemj.exe" -c C:\\PTSIEMSDK_GUI.4.0.0.738\\temp\\siemj.conf main");
		await ProcessHelper.ExecuteWithArgsWithRealtimeOutput(
			siemjExePath,
			["-c", siemjConfigPath, "main"],
			this._config.getOutputChannel()
		);

		const schemaFilePath = this._config.getSchemaFullPath(contentRootFolder);
		if(!fs.existsSync(schemaFilePath)) {
			throw new XpException("Ошибка компиляции схемы БД. Результирующий файл не создан.");
		}
	}

	public async normalize(rule: RuleBaseItem, rawEventsFilePath: string) : Promise<string> {

		if(!fs.existsSync(rawEventsFilePath)) {
			throw new FileNotFoundException(`Файл сырых событий '${rawEventsFilePath}' не существует.`);
		}

		const contentFullPath = rule.getPackagePath(this._config);
		if(!fs.existsSync(contentFullPath)) {
			throw new FileNotFoundException(`Директория контента '${contentFullPath}' не существует.`);
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

		// Централизованно сохраняем конфигурационный файл для siemj.
		const siemjConfigPath = this._config.getTmpSiemjConfigPath(contentRootFolder);
		await SiemjConfigHelper.saveSiemjConfig(siemjConfContent, siemjConfigPath);
		const siemjExePath = this._config.getSiemjPath();

		this._config.getOutputChannel().clear();

		// Типовая команда выглядит так:
		// "C:\\PTSIEMSDK_GUI.4.0.0.738\\tools\\siemj.exe" -c C:\\PTSIEMSDK_GUI.4.0.0.738\\temp\\siemj.conf main");
		await ProcessHelper.ExecuteWithArgsWithRealtimeOutput(
			siemjExePath,
			["-c", siemjConfigPath, "main"],
			this._config.getOutputChannel()
		);

		const normEventsFilePath = this._config.getNormalizedEventsFilePath(contentRootFolder);
		if(!fs.existsSync(normEventsFilePath)) {
			throw new XpException("Ошибка нормализации событий. Файл с результирующим событием не создан.");
		}

		const normEventsContent = await FileSystemHelper.readContentFile(normEventsFilePath);
		if(!normEventsContent) {
			throw new XpException("Нормализатор вернул пустое событие. Проверьте наличие правильного конверта события и наличие необходимой нормализации в дереве контента.");
		}

		await fs.promises.unlink(siemjConfigPath);
		return normEventsContent;
	}

	public async normalizeAndEnrich(rule: RuleBaseItem, rawEventsFilePath: string) : Promise<string> {
		if(!fs.existsSync(rawEventsFilePath)) {
			throw new FileNotFoundException(`Файл сырых событий '${rawEventsFilePath}' не существует.`);
		}

		const contentFullPath = rule.getPackagePath(this._config);
		if(!fs.existsSync(contentFullPath)) {
			throw new FileNotFoundException(`Директория контента '${contentFullPath}' не существует.`);
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

		// Централизованно сохраняем конфигурационный файл для siemj.
		const siemjConfigPath = this._config.getTmpSiemjConfigPath(contentRootFolder);
		await SiemjConfigHelper.saveSiemjConfig(siemjConfContent, siemjConfigPath);
		const siemjExePath = this._config.getSiemjPath();

		this._config.getOutputChannel().clear();
		
		// Типовая команда выглядит так:
		// "C:\\PTSIEMSDK_GUI.4.0.0.738\\tools\\siemj.exe" -c C:\\PTSIEMSDK_GUI.4.0.0.738\\temp\\siemj.conf main");
		await ProcessHelper.ExecuteWithArgsWithRealtimeOutput(
			siemjExePath,
			["-c", siemjConfigPath, "main"],
			this._config.getOutputChannel()
		);

		const enrichEventsFilePath = this._config.getEnrichedEventsFilePath(contentRootFolder);
		if(!fs.existsSync(enrichEventsFilePath)) {
			throw new XpException("Ошибка нормализации и обогащения событий. Файл с результирующим событием не создан.");
		}

		const enrichEventsContent = await FileSystemHelper.readContentFile(enrichEventsFilePath);
		if(!enrichEventsContent) {
			throw new XpException("Обогатитель вернул пустое событие. Проверьте наличие правильного конверта события и наличие необходимой нормализации в дереве контента.");
		}

		await fs.promises.unlink(siemjConfigPath);
		return enrichEventsContent;
	}

	public async getLocalizationExamples(rule: RuleBaseItem) : Promise<LocalizationExample[]> {
		const contentFullPath = rule.getPackagePath(this._config);
		if(!fs.existsSync(contentFullPath)) {
			throw new FileNotFoundException(`Директория контента '${contentFullPath}' не существует.`);
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

		// Проверяем фильтруем тесты и проверяем, что есть тесты ожидающие события и без табличных списков.
		const filtredTest = rule.getIntegrationTests().filter( it => {
			// Исключаем тесты, которые не порождают события (вайтлистинг и тесты на фолзы).
			const expectOneRegex = /expect\s+1\s+{/gm;
			const tableListRegex = /\btable_list\s+{/gm;

			const testCode = it.getTestCode();
			if(!expectOneRegex.test(testCode) || tableListRegex.test(testCode)) {
				return false;
			}

			return true;
		});

		if(filtredTest.length === 0) {
			return [];
		}
		
		// Собираем общую часть для всех тестов правила.
		const configBuilder = new SiemjConfBuilder(this._config, contentRootPath);
		configBuilder.addNormalizationsGraphBuilding(false);
		configBuilder.addCorrelationsGraphBuilding();
		configBuilder.addTablesSchemaBuilding();
		configBuilder.addTablesDbBuilding();
		configBuilder.addEnrichmentsGraphBuilding();
		configBuilder.addLocalizationsBuilding(rule.getDirectoryPath());

		const siemjConfContent = configBuilder.build();
		await this.saveConfigAndExecute(contentRootFolder, siemjConfContent);

		const locExamples : LocalizationExample[] = [];
		for (const test of filtredTest) {

			// Нормализуем, коррелируем, обогащаем каждое событие.
			const configBuilder = new SiemjConfBuilder(this._config, contentRootPath);
			configBuilder.addEventsNormalization(test.getRawEventsFilePath());
			// configBuilder.addEventsEnrichment();
			configBuilder.addCorrelateNormalizedEvents();
			configBuilder.addLocalization();

			const siemjConfContent = configBuilder.build();
			await this.saveConfigAndExecute(contentRootFolder, siemjConfContent);
	
			const currLocExample = new LocalizationExample();
			currLocExample.ruText = await this.readCurrentLocalizationExample(
				ruLocalizationFilePath,
				rule.getName(),
				test);

			currLocExample.enText = await this.readCurrentLocalizationExample(
				enLocalizationFilePath,
				rule.getName(),
				test);

			// Проверяем наличие дубликатов.
			const duplicate = locExamples.find(le => le.ruText === currLocExample.ruText && le.enText === currLocExample.enText);
			if(!duplicate && currLocExample.ruText && currLocExample.enText) {
				locExamples.push(currLocExample);
			}
		}

		return locExamples;
	}

	private async readCurrentLocalizationExample(localizationFilePath : string, correlationName : string, test : IntegrationTest) : Promise<string> {
		if(!fs.existsSync(localizationFilePath)) {
			return null;
		}

		const localizationEvent = await FileSystemHelper.readContentFile(localizationFilePath);
		if(!localizationEvent) {
			return null;
		}

		// localizationEvent = localizationEvent.trim();
		try {
			for (const jsonLine of localizationEvent.split(os.EOL)) {
				// Разделяем несколько корреляционных событий.
				const event = JSON.parse(jsonLine);

				// Могут отработать другие корреляции
				if(event?.correlation_name !== correlationName) {
					continue;
				}

				if(event?.text) {
					return event?.text;
				}
			}
		}
		catch (error) {
			ExtensionHelper.showUserError(`Ошибка разбора локализации из теста №${test.getNumber()}`);
			return null;
		}
	}

	private async saveConfigAndExecute(contentRootFolder: string, siemjConfContent: string) : Promise<string> {
		// Централизованно сохраняем конфигурационный файл для siemj.
		const siemjConfigPath = this._config.getRandTmpSubDirectoryPath(contentRootFolder);
		await SiemjConfigHelper.saveSiemjConfig(siemjConfContent, siemjConfigPath);
		const siemjExePath = this._config.getSiemjPath();

		// Типовая команда выглядит так:
		// "C:\\PTSIEMSDK_GUI.4.0.0.738\\tools\\siemj.exe" -c C:\\PTSIEMSDK_GUI.4.0.0.738\\temp\\siemj.conf main");
		const output = await ProcessHelper.ExecuteWithArgsWithRealtimeOutput(
			siemjExePath,
			["-c", siemjConfigPath, "main"],
			this._config.getOutputChannel()
		);

		return output;
	}
}
