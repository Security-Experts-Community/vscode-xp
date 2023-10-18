import * as fs from 'fs';
import * as path from 'path';

import { Configuration } from '../configuration';
import { FileSystemHelper } from '../../helpers/fileSystemHelper';
import { Log } from '../../extension';
import { XpException } from '../xpException';


/**
 * Билдер конфига для упрощения его формирования по заданным параметрам.
 */
export class SiemjConfBuilder {

	constructor(private _config : Configuration, private _contentRootPath: string) {
		this._contentRootFolder = path.basename(this._contentRootPath);
		this._outputFolder = this._config.getOutputDirectoryPath(this._contentRootFolder);

		// Заполнение конфига по умолчанию.
		this._siemjConfigSection = 
`[DEFAULT]
ptsiem_sdk=${this._config.getSiemSdkDirectoryPath()}
build_tools=${this._config.getBuildToolsDirectoryFullPath()}
taxonomy=${this._config.getTaxonomyFullPath()}
output_folder=${this._outputFolder}
temp=${this._config.getTmpDirectoryPath(this._contentRootFolder)}`;
	}

	/**
	 * Добавить сборку графа нормализации
	 * @param force пересобирать ли ранее собранный	граф
	 */
	public addNormalizationsGraphBuilding(force = true) : void {

		if(this._scenarios.includes(SiemjConfBuilder.MAKE_NFGRAPH_SCENARIO)) {
			throw new XpException(`Дублирование сценария ${SiemjConfBuilder.MAKE_NFGRAPH_SCENARIO} при генерации конфигурационного файла siemj.conf`);
		}

		const xpAppendixPath = this._config.getAppendixFullPath();

		if (!force){
			const normGraphFilePath = this._config.getNormalizationsGraphFilePath(this._contentRootFolder);
			if(fs.existsSync(normGraphFilePath)) {
				return;
			}
		}

		const output = path.join('${output_folder}', this._config.getNormalizationsGraphFileName());
		const nfgraphBuildingSection = 
`
[make-nfgraph]
type=BUILD_RULES
rcc_lang=n
rules_src=${this._contentRootPath}
xp_appendix=${xpAppendixPath}
out=${output}`;

		this._siemjConfigSection += nfgraphBuildingSection;
		this._scenarios.push(SiemjConfBuilder.MAKE_NFGRAPH_SCENARIO);
	}

	/**
	 * (Пока не используется) Рекурсивная проверка по регулярному выражению наличия файлов в директории 
	 * @param startPath начальная директория для рекурсивного поиска
	 * @param fileNameRegexPattern регулярное выражение для поиска
	 * @returns 
	 */


	public addTablesSchemaBuilding() : void {
		// Если нет табличных списков, то не собираем схему		
		// TODO: данная логика тут лишняя, вынести на уровень выше.
		if (!FileSystemHelper.checkIfFilesIsExisting(this._contentRootPath, /\.tl$/)) {

			const corrDefaultsPath = path.join(this._outputFolder, "correlation_defaults.json");
			const schemaPath = path.join(this._outputFolder, "schema.json");
			return;
		}		

		const contract = this._config.getTablesContract();
		const tablesSchemaBuildingSection = 
`
[make-tables-schema]
type=BUILD_TABLES_SCHEMA
table_list_schema_src=${this._contentRootPath}
contract=${contract}
out=\${output_folder}`;

		this._siemjConfigSection += tablesSchemaBuildingSection;
		this._scenarios.push("make-tables-schema");
	}

	public addTablesDbBuilding() : void {

		const table_list_schema = path.join('${output_folder}', this._config.getSchemaFileName());
		const table_list_defaults= path.join('${output_folder}', this._config.getCorrelationDefaultsFileName());
		const output = path.join('${output_folder}', this._config.getFptaDbFileName());
		const tablesDatabaseBuildingSection = 
`
[make-tables-db]
type=BUILD_TABLES_DATABASE
table_list_filltype=All
table_list_schema=${table_list_schema}
table_list_defaults=${table_list_defaults}
out=${output}`;

		this._siemjConfigSection += tablesDatabaseBuildingSection;
		this._scenarios.push("make-tables-db");
	}

	/**
	 * Добавить сборку графа корреляций
	 * @param force принудительно пересобрать граф корреляций
	 * @param contentSubdirPath собирать определенную часть контента
	 * @returns 
	 */
	public addCorrelationsGraphBuilding(force = true, contentSubdirPath? : string|string[]) : void {
		
		// Не собираем граф, если он уже есть.
		if(!force) {
			const enrichGraphFilePath = this._config.getEnrichmentsGraphFilePath(this._contentRootPath);
			if(fs.existsSync(enrichGraphFilePath)) {
				return;
			}
		}

		let rulesSrcPath : string;
		if(contentSubdirPath) {
			if(Array.isArray(contentSubdirPath)) {
				rulesSrcPath = contentSubdirPath.join(",");
			} else {
				rulesSrcPath = contentSubdirPath;
			}
		}
		else {
			rulesSrcPath = this._contentRootPath;
		}

		const rulesFilters = this._config.getRulesDirFilters();
		const table_list_schema = path.join('${output_folder}', this._config.getSchemaFileName());
		const output = path.join('${output_folder}', this._config.getCorrelationsGraphFileName());
		const cfgraphBuildingSection = 
`
[make-crgraph]
type=BUILD_RULES
rcc_lang=c
rules_src=${rulesSrcPath}
rfilters_src=${rulesFilters}
table_list_schema=${table_list_schema}
out=${output}`;

		this._siemjConfigSection += cfgraphBuildingSection;
		this._scenarios.push("make-crgraph");
	}

	public addEnrichmentsGraphBuilding(force = true) : void {
		// Не собираем граф, если он уже есть.
		if(!force) {
			const enrichGraphFilePath = this._config.getEnrichmentsGraphFilePath(this._contentRootFolder);
			if(fs.existsSync(enrichGraphFilePath)) {
				return;
			}
		}

		const rulesFilters = this._config.getRulesDirFilters();
		const table_list_schema = path.join('${output_folder}', this._config.getSchemaFileName());
		const output = path.join('${output_folder}', this._config.getEnrichmentsGraphFileName());

		const efgraphBuildingSection = 
`
[make-ergraph]
type=BUILD_RULES
rcc_lang=e
rules_src=${this._contentRootPath}
rfilters_src=${rulesFilters}
table_list_schema=${table_list_schema}
out=${output}`;

		this._siemjConfigSection += efgraphBuildingSection;
		this._scenarios.push("make-ergraph");
	}

	public addLocalizationsBuilding(rulesSrcPath? : string) : void {
		let rulesSrcPathResult : string;
		if(!rulesSrcPath) {
			rulesSrcPathResult = this._contentRootPath;
		} else {
			rulesSrcPathResult = rulesSrcPath;
		}

		const output = path.join('${output_folder}', this._config.getLocalizationsFolder());
		const localizationBuildingSection = 
`
[make-loca]
type=BUILD_EVENT_LOCALIZATION
rules_src=${rulesSrcPathResult}
out=${output}`;

		this._siemjConfigSection += localizationBuildingSection;
		this._scenarios.push("make-loca");
	}

	public addEventsNormalization(rawEventsFilePath : string) : void {

		const formulas = path.join('${output_folder}', this._config.getNormalizationsGraphFileName());
		const not_norm_events = path.join('${output_folder}', this._config.getNotNormalizedEventsFileName());
		const output = path.join('${output_folder}', this._config.getNormalizedEventsFileName());
		const eventNormalizationSection = 
`
[run-normalize]
type=NORMALIZE
formulas=${formulas}
in=${rawEventsFilePath}
raw_without_envelope=no
print_statistics=yes
not_norm_events=${not_norm_events}
out=${output}`;

		this._siemjConfigSection += eventNormalizationSection;
		this._scenarios.push("run-normalize");
	}

	public addEventsEnrichment() : void {

		const enrules = path.join('${output_folder}', this._config.getEnrichmentsGraphFileName());
		const input = path.join('${output_folder}', this._config.getNormalizedEventsFileName());
		const output = path.join('${output_folder}', this._config.getEnrichedEventsFileName());
		const eventEnrichSection = 
`
[run-enrich]
type=ENRICH
enrules=${enrules}
in=${input}
out=${output}`;

		this._siemjConfigSection += eventEnrichSection;
		this._scenarios.push("run-enrich");
	}

	/**
	 * Добавляет выполнение всех тестов из заданной директории.
	 * @param testsRuleFullPath директория из которой запускаются тесты.
	 * @param keepTmpFiles флаг сохранения временных файлов
	 * @returns путь к директории с временными файлами.
	 */
	public addTestsRun(testsRuleFullPath: string, tmpFilesPath?: string) : void {

		const formulas = path.join('${output_folder}', this._config.getNormalizationsGraphFileName());
		const enrules = path.join('${output_folder}', this._config.getEnrichmentsGraphFileName());
		const corrules = path.join('${output_folder}', this._config.getCorrelationsGraphFileName());
		const table_list_defaults = path.join('${output_folder}', this._config.getCorrelationDefaultsFileName());
		const crTimeout = this._config.getСorrelatorTimeoutPerSecond();
		
		let rulesTestsSection = 
`
[rules-tests]
type=TEST_RULES
cr_timeout=${crTimeout}
formulas=${formulas}
enrules=${enrules}
corrules=${corrules}
table_list_defaults=${table_list_defaults}
rules_src=${testsRuleFullPath}`;

		// Добавляем директорию для получения временных файлов, после тестов.
		if(tmpFilesPath) {
			rulesTestsSection += `
temp=${tmpFilesPath}
keep_temp_files=yes`;
		}

		this._siemjConfigSection += rulesTestsSection;
		this._scenarios.push("rules-tests");
	}	

	public addCorrelateEnrichedEvents() : void {

		const corrules = path.join('${output_folder}', this._config.getCorrelationsGraphFileName());
		const input = path.join('${output_folder}', this._config.getEnrichedEventsFileName());
		const table_list_database = path.join('${output_folder}', this._config.getFptaDbFileName());
		const output = path.join('${output_folder}', this._config.getCorrelatedEventsFileName());
		const eventEnrichSection = 
`
[run-correlate]
type=CORRELATE
corrules=${corrules}
in=${input}
table_list_database=${table_list_database}
out=${output}`;

		this._siemjConfigSection += eventEnrichSection;
		this._scenarios.push("run-correlate");
	}

	public addCorrelateNormalizedEvents() : void {

		const corrules = path.join('${output_folder}', this._config.getCorrelationsGraphFileName());
		const input = path.join('${output_folder}', this._config.getNormalizedEventsFileName());
		const table_list_database = path.join('${output_folder}', this._config.getFptaDbFileName());
		const output = path.join('${output_folder}', this._config.getCorrelatedEventsFileName());
		const eventEnrichSection = 
`
[run-correlate]
type=CORRELATE
corrules=${corrules}
in=${input}
table_list_database=${table_list_database}
out=${output}`;

		this._siemjConfigSection += eventEnrichSection;
		this._scenarios.push("run-correlate");
	}

	/**
	 * Добавить генерацию локализаций по скоррелированным событиям.
	 */
	public addLocalizationForCorrelatedEvents(correlatedEventsFilePath? : string) : void {

		let resultCorrelatedEventsFilePath : string;
		if(!correlatedEventsFilePath) {
			resultCorrelatedEventsFilePath = path.join('${output_folder}', this._config.getCorrelatedEventsFileName());
		} else {
			resultCorrelatedEventsFilePath = correlatedEventsFilePath;
		}

		const locaRulesDir = path.join('${output_folder}', this._config.getLangsDirName());

		const ruLocalization = 
`
[run-loca-ru]
type=FRONTEND
lang=ru
locarules=${locaRulesDir}
in=${resultCorrelatedEventsFilePath}
out=\${output_folder}\\ru_events.json

[run-loca-en]
type=FRONTEND
lang=en
locarules=${locaRulesDir}
in=${resultCorrelatedEventsFilePath}
out=\${output_folder}\\en_events.json`;

		this._siemjConfigSection += ruLocalization;
		this._scenarios.push("run-loca-ru");
		this._scenarios.push("run-loca-en");
	}

	public build() : string {
		const resultConfig = 
`${this._siemjConfigSection}
[main]
type=SCENARIO
scenario=${this._scenarios.join(" ")}
`;
		Log.info(`siemj.conf`);
		Log.info(resultConfig);
		return resultConfig;
	}

	private _contentRootFolder : string;
	private _outputFolder : string;

	private _siemjConfigSection : string;
	private _scenarios : string[] = [];

	private static MAKE_NFGRAPH_SCENARIO = "make-nfgraph";
}
