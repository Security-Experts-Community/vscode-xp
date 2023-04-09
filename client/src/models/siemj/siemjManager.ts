import * as fs from 'fs';

import { FileSystemHelper } from '../../helpers/fileSystemHelper';
import { ProcessHelper } from '../../helpers/processHelper';
import { Configuration } from '../configuration';
import { XpException } from '../xpException';
import { RuleBaseItem } from '../content/ruleBaseItem';
import { SiemjConfigHelper } from './siemjConfigHelper';
import { FileNotFoundException } from '../fileNotFounException';
import { SiemjConfBuilder } from './siemjConfigBuilder';

export class SiemjManager {

	constructor(private _config : Configuration) {}

	public async normalize(rule: RuleBaseItem, rawEventsFilePath: string) : Promise<string> {

		if(!fs.existsSync(rawEventsFilePath)) {
			throw new FileNotFoundException(`Файл сырых событий '${rawEventsFilePath}' не существует.`);
		}

		const contentFullPath = rule.getPackagePath(this._config);
		if(!fs.existsSync(contentFullPath)) {
			throw new FileNotFoundException(`Директория контента '${contentFullPath}' не существует.`);
		}

		await SiemjConfigHelper.clearArtifacts(this._config);

		const outputDirName = this._config.getPathHelper().getOutputDirName();
		const outputFolder = this._config.getOutputDirectoryPath(outputDirName);

		if(!fs.existsSync(outputFolder)) {
			fs.mkdirSync(outputFolder);
		}
		
		// Получаем нужный конфиг для нормализации событий.
		const configBuilder = new SiemjConfBuilder(this._config);
		configBuilder.addNfgraphBuilding(false);
		configBuilder.addEventsNormalize(rawEventsFilePath);
		const siemjConfContent = configBuilder.build();

		// Централизованно сохраняем конфигурационный файл для siemj.
		const siemjConfigPath = this._config.getTmpSiemjConfigPath();
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

		const normEventsFilePath = this._config.getNormEventsFilePath(outputDirName);
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

		const outputDirName = this._config.getPathHelper().getOutputDirName();
		const outputFolder = this._config.getOutputDirectoryPath(outputDirName);

		if(!fs.existsSync(outputFolder)) {
			fs.mkdirSync(outputFolder);
		}
		
		const configBuilder = new SiemjConfBuilder(this._config);
		configBuilder.addNfgraphBuilding(false);
		configBuilder.addTablesSchemaBuilding();
		configBuilder.addTablesDbBuilding();
		configBuilder.addEfgraphBuilding(false);
		configBuilder.addEventsNormalize(rawEventsFilePath);
		configBuilder.addEventsEnrich();
		const siemjConfContent = configBuilder.build();

		// Централизованно сохраняем конфигурационный файл для siemj.
		const siemjConfigPath = this._config.getTmpSiemjConfigPath();
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

		const enrichEventsFilePath = this._config.getEnrichEventsFilePath(outputDirName);
		if(!fs.existsSync(enrichEventsFilePath)) {
			throw new XpException("Ошибка нормализации событий. Файл с результирующим событием не создан.");
		}

		const enrichEventsContent = await FileSystemHelper.readContentFile(enrichEventsFilePath);
		if(!enrichEventsContent) {
			throw new XpException("Нормализатор вернул пустое событие. Проверьте наличие правильного конверта события и наличие необходимой нормализации в дереве контента.");
		}

		await fs.promises.unlink(siemjConfigPath);
		return enrichEventsContent;
	}



}