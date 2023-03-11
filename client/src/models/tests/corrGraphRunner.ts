import * as fs from 'fs';
import * as path from 'path';

import { ExtensionHelper } from '../../helpers/extensionHelper';
import { FileSystemHelper } from '../../helpers/fileSystemHelper';
import { ProcessHelper } from '../../helpers/processHelper';
import { Configuration } from '../configuration';
import { VsCodeApiHelper } from '../../helpers/vsCodeApiHelper';
import { XpException } from '../xpException';

export class CorrGraphRunner {

	constructor(private _config : Configuration) {}

	public async Run(correlationsFullPath: string, rawEventsFilePath: string) : Promise<string> {

		if(!fs.existsSync(rawEventsFilePath)) {
			throw new XpException(`Файл сырых событий '${rawEventsFilePath}' не доступен.`);
		}

		if(!fs.existsSync(correlationsFullPath)) {
			throw new XpException(`Директория контента '${correlationsFullPath}' не существует.`);
		}

		const ptsiem_sdk = this._config.getSiemSdkDirectoryPath();
		const build_tools = this._config.getBuildToolsDirectoryFullPath();
		const taxonomy = this._config.getTaxonomyFullPath();
		const root = this._config.getPathHelper().getRootByPath(correlationsFullPath);

		// В зависимости от типа контента получаем нужную выходную директорию.
		const rootFolder = path.basename(root);
		const output_folder = this._config.getOutputDirectoryPath(rootFolder);

		if(!fs.existsSync(output_folder)) {
			await fs.promises.mkdir(output_folder);
		}
		
		const temp = this._config.getTmpDirectoryPath();
		const formulasGraph = this._config.getFormulasGraphFilePath(rootFolder);
		const kbPaths = Configuration.get().getPathHelper();
		const rulesFilter = kbPaths.getRulesDirFilters();
		const correlationDefaults = this._config.getCorrelationDefaultsFilePath(rootFolder);
		const schema = this._config.getSchemaFullPath(rootFolder);

		const siemjConfContent =
`[DEFAULT]
ptsiem_sdk=${ptsiem_sdk}
build_tools=${build_tools}
taxonomy=${taxonomy}
output_folder=${output_folder}
temp=${temp}
[make-tables-db]
type=BUILD_TABLES_DATABASE
table_list_filltype=All
table_list_schema=${schema}
table_list_defaults=${correlationDefaults}
out=\${output_folder}\\fpta_db.db
[make-crgraph]
type=BUILD_RULES
rcc_lang=c
rules_src=${root}
rfilters_src=${rulesFilter}
table_list_schema=${schema}
out=\${output_folder}\\corrules_graph.json
[run-normalize]
type=NORMALIZE
formulas=${formulasGraph}
in=${rawEventsFilePath}
raw_without_envelope=no
out=${output_folder}\\norm_events.json
[run-enrich]
type=ENRICH
enrules=\${output_folder}\\enrules_graph.json
in=\${run-normalize:out}
out=\${output_folder}\\enrich_events.json
[run-correlate]
type=CORRELATE
corrules=\${make-crgraph:out}
in=\${run-enrich:out}
table_list_database=\${output_folder}\\fpta_db.db
out=\${output_folder}\\corr_events.json
[main]
type=SCENARIO
scenario=make-tables-db make-crgraph run-normalize run-enrich run-correlate 
`;
		const randTmpDir = this._config.getRandTmpSubDirectoryPath();
		await fs.promises.mkdir(randTmpDir);

		// Сохраняем конфигурационный файл для siemj.
		const siemjConfigPath = path.join(randTmpDir, "siemj.conf");
		const siemjExePath = this._config.getSiemjPath();
		await FileSystemHelper.writeContentFile(siemjConfigPath, siemjConfContent);

		// Без удаления базы возникали странные ошибки filler-а, но это не точно.
		const ftpaDbPath = this._config.getFptaDbFilePath(rootFolder);
		if(fs.existsSync(ftpaDbPath)) {
			await fs.promises.unlink(ftpaDbPath);
		}
		
		// Удаляем скорреклированные события, если такие были.
		const corrEventFilePath = this._config.getCorrEventsFilePath(rootFolder);
		if(fs.existsSync(corrEventFilePath)) {
			await fs.promises.unlink(corrEventFilePath);
		}

		// Типовая команда выглядит так:
		// "C:\\Work\\-=SIEM=-\\PTSIEMSDK_GUI.4.0.0.738\\tools\\siemj.exe" -c C:\\Work\\-=SIEM=-\\PTSIEMSDK_GUI.4.0.0.738\\temp\\siemj.conf main");
		const result = await ProcessHelper.ExecuteWithArgsWithRealtimeOutput(
			siemjExePath,
			["-c", siemjConfigPath, "main"],
			this._config.getOutputChannel());

		const corrEventsFilePath = this._config.getCorrEventsFilePath(rootFolder);
		if(!fs.existsSync(corrEventsFilePath)) {
			throw new XpException("Ошибка прогона события на графе корреляций.");
		}
		
		const normEventsContent = await FileSystemHelper.readContentFile(corrEventsFilePath);
		await fs.promises.unlink(siemjConfigPath);
		return normEventsContent;
	}
}
