import * as fs from 'fs';
import * as path from 'path';

import { ExtensionHelper } from '../../helpers/extensionHelper';
import { FileSystemHelper } from '../../helpers/fileSystemHelper';
import { ProcessHelper } from '../../helpers/processHelper';
import { Configuration } from '../configuration';
import { VsCodeApiHelper } from '../../helpers/vsCodeApiHelper';
import { XpExtentionException } from '../xpException';
import { RuleBaseItem } from '../content/ruleBaseItem';
import { SiemjConfigHelper } from '../../helpers/siemjConfigHelper';
import { FileNotFoundException } from '../fileNotFounException';

export class Normalizer {

	constructor(private _config : Configuration) {}

	public async normalize(rule: RuleBaseItem, rawEventsFilePath: string) : Promise<string> {

		if(!fs.existsSync(rawEventsFilePath)) {
			throw new FileNotFoundException(`Файл сырых событий '${rawEventsFilePath}' не существует.`);
		}

		const contentFullPath = rule.getPackagePath(this._config);
		if(!fs.existsSync(contentFullPath)) {
			throw new FileNotFoundException(`Директория контента '${contentFullPath}' не существует.`);
		}

		const root = this._config.getPathHelper().getRootByPath(rule.getDirectoryPath());
		const rootFolder = path.basename(root);

		const output_folder = this._config.getOutputDirectoryPath(rootFolder);
		if(!fs.existsSync(output_folder)) {
			fs.mkdirSync(output_folder);
		}
		
		// Проверяем наличие графа нормализации.
		const formulas_graph = this._config.getFormulasGraphFilePath(rootFolder);
		let siemjConfContent = "";

		// Если есть граф формул нормализаций, тогда запускаем только нормализацию событий.
		if(fs.existsSync(formulas_graph)) {
			siemjConfContent = SiemjConfigHelper.getNormalizerConfig(rule, rawEventsFilePath, this._config);
		} else {
			// Если нет графа формул нормализаций, тогда сначала соберем граф, потом уже запускаем нормализацию событий.
			siemjConfContent = SiemjConfigHelper.getNgraphBuildAndNormalizerConfig(rule, rawEventsFilePath, this._config);
		}

		// Централизованно сохраняем конфигурационный файл для siemj.
		const siemjConfigPath = this._config.getTmpSiemjConfigPath();
		await SiemjConfigHelper.saveSiemjConfig(siemjConfContent, siemjConfigPath);
		const siemjExePath = this._config.getSiemjPath();

		// Типовая команда выглядит так:
		// "C:\\Work\\-=SIEM=-\\PTSIEMSDK_GUI.4.0.0.738\\tools\\siemj.exe" -c C:\\Work\\-=SIEM=-\\PTSIEMSDK_GUI.4.0.0.738\\temp\\siemj.conf main");
		await ProcessHelper.ExecuteWithArgsWithRealtimeOutput(
			siemjExePath,
			["-c", siemjConfigPath, "main"],
			this._config.getOutputChannel()
		);

		const normEventsFilePath = this._config.getNormEventsFilePath(rootFolder);
		if(!fs.existsSync(normEventsFilePath)) {
			throw new XpExtentionException("Ошибка нормализации событий. Файл с результирующим событием не создан.");
		}

		const normEventsContent = await FileSystemHelper.readContentFile(normEventsFilePath);
		if(!normEventsContent) {
			throw new XpExtentionException("Нормализатор вернул пустое событие. Проверьте наличие правильного конверта события и наличие необходимой нормализации в дереве контента.");
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

		const root = this._config.getPathHelper().getRootByPath(rule.getDirectoryPath());
		const rootFolder = path.basename(root);

		const output_folder = this._config.getOutputDirectoryPath(rootFolder);
		if(!fs.existsSync(output_folder)) {
			fs.mkdirSync(output_folder);
		}
		
		let siemjConfContent = SiemjConfigHelper.getBuildNormalizationGraphAndNormalizeAndEnrichConfig(rule, rawEventsFilePath, this._config);

		// Централизованно сохраняем конфигурационный файл для siemj.
		const siemjConfigPath = this._config.getTmpSiemjConfigPath();
		await SiemjConfigHelper.saveSiemjConfig(siemjConfContent, siemjConfigPath);
		const siemjExePath = this._config.getSiemjPath();

		// Типовая команда выглядит так:
		// "C:\\Work\\-=SIEM=-\\PTSIEMSDK_GUI.4.0.0.738\\tools\\siemj.exe" -c C:\\Work\\-=SIEM=-\\PTSIEMSDK_GUI.4.0.0.738\\temp\\siemj.conf main");
		await ProcessHelper.ExecuteWithArgsWithRealtimeOutput(
			siemjExePath,
			["-c", siemjConfigPath, "main"],
			this._config.getOutputChannel()
		);

		const enrichEventsFilePath = this._config.getEnrichEventsFilePath(rootFolder);
		if(!fs.existsSync(enrichEventsFilePath)) {
			throw new XpExtentionException("Ошибка нормализации событий. Файл с результирующим событием не создан.");
		}

		const enrichEventsContent = await FileSystemHelper.readContentFile(enrichEventsFilePath);
		if(!enrichEventsContent) {
			throw new XpExtentionException("Нормализатор вернул пустое событие. Проверьте наличие правильного конверта события и наличие необходимой нормализации в дереве контента.");
		}

		await fs.promises.unlink(siemjConfigPath);
		return enrichEventsContent;
	}
}