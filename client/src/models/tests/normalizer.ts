import * as fs from 'fs';
import * as path from 'path';

import { ExtensionHelper } from '../../helpers/extensionHelper';
import { FileSystemHelper } from '../../helpers/fileSystemHelper';
import { ProcessHelper } from '../../helpers/processHelper';
import { Configuration } from '../configuration';
import { VsCodeApiHelper } from '../../helpers/vsCodeApiHelper';
import { XpException } from '../xpException';
import { RuleBaseItem } from '../content/ruleBaseItem';
import { SiemjConfigHelper } from '../siemj/siemjConfigHelper';


export class Normalizer {

	constructor(private _config : Configuration) {}

	public async Normalize(rule: RuleBaseItem, rawEventsFilePath: string) : Promise<string> {

		if(!fs.existsSync(rawEventsFilePath)) {
			throw new XpException(`Файл сырых событий '${rawEventsFilePath}' не существует.`);
		}

		const contentFullPath = rule.getPackagePath(this._config);
		if(!fs.existsSync(contentFullPath)) {
			throw new XpException(`Директория контента '${contentFullPath}' не существует.`);
		}

		const config = Configuration.get();

		// Проверка доступости нужных утилит.
		if(!fs.existsSync(config.getSiemSdkDirectoryPath())) {
			ExtensionHelper.showUserError(`Заданный в настройках расширения путь '${config.getSiemSdkDirectoryPath()}' недоступен. Запуск тестов, нормализация событий и т.д. будут невозможны.`);
			await VsCodeApiHelper.openSettings(this._config.getExtentionSettingsPrefix());
			return;
		}

		if(!fs.existsSync(config.getTaxonomyFullPath())) {
			ExtensionHelper.showUserError(`Заданный в настройках путь '${config.getTaxonomyFullPath()}' к файлу таксономии недоступен. Запуск тестов, нормализация событий и т.д. будут невозможны.`);
			await VsCodeApiHelper.openSettings(this._config.getExtentionSettingsPrefix());
			return;
		}

		const ptsiem_sdk = config.getSiemSdkDirectoryPath();
		const build_tools = config.getBuildToolsDirectoryFullPath();
		const taxonomy = config.getTaxonomyFullPath();
		const root = this._config.getPathHelper().getRootByPath(rule.getDirectoryPath());
		const rootFolder = path.basename(root);
		const output_folder = this._config.getOutputDirectoryPath(rootFolder);
		if(!fs.existsSync(output_folder)) {
			fs.mkdirSync(output_folder);
		}
		
		const temp = config.getTmpDirectoryPath();		
		const rulesSrcPath = rule.getContentRoot(config);
		const xpAppendixPath = config.getAppendixFullPath();

		// Проверяем наличие графа нормализации.
		const formulas_graph = config.getFormulasGraphFilePath(rootFolder);
		let siemjConfContent = "";

		// Если есть граф формул нормализаций, тогда запускаем только нормализацию событий.
		if(fs.existsSync(formulas_graph)) {
			siemjConfContent = 
`[DEFAULT]
ptsiem_sdk=${ptsiem_sdk}
build_tools=${build_tools}
taxonomy=${taxonomy}
output_folder=${output_folder}
temp=${temp}
[run-normalize]
type=NORMALIZE
formulas=${formulas_graph}
in=${rawEventsFilePath}
raw_without_envelope=no
out=\${output_folder}\\norm_events.json
[main]
type=SCENARIO
scenario=run-normalize`;
		} else {
			// Если нет графа формул нормализаций, тогда сначала соберем граф, потом уже запускаем нормализацию событий.
			siemjConfContent = 
`[DEFAULT]
ptsiem_sdk=${ptsiem_sdk}
build_tools=${build_tools}
taxonomy=${taxonomy}
output_folder=${output_folder}
temp=${temp}
[make-nfgraph]
type=BUILD_RULES
rcc_lang=n
rules_src=${rulesSrcPath}
xp_appendix=${xpAppendixPath}
out=\${output_folder}\\formulas_graph.json
[run-normalize]
type=NORMALIZE
formulas=\${make-nfgraph:out}
in=${rawEventsFilePath}
raw_without_envelope=no
out=\${output_folder}\\norm_events.json
[main]
type=SCENARIO
scenario=make-nfgraph run-normalize`;
		}

		const siemjConfigPath = config.getTmpSiemjConfigPath();
		// Централизованно сохраняем конфигурационный файл для siemj.
		await SiemjConfigHelper.saveSiemjConfig(siemjConfContent, siemjConfigPath);
		const siemjExePath = config.getSiemjPath();

		// Типовая команда выглядит так:
		// "C:\\Work\\-=SIEM=-\\PTSIEMSDK_GUI.4.0.0.738\\tools\\siemj.exe" -c C:\\Work\\-=SIEM=-\\PTSIEMSDK_GUI.4.0.0.738\\temp\\siemj.conf main");
		await ProcessHelper.ExecuteWithArgsWithRealtimeOutput(
			siemjExePath,
			["-c", siemjConfigPath, "main"],
			this._config.getOutputChannel()
		);

		const normEventsFilePath = config.getNormEventsFilePath(rootFolder);
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
}