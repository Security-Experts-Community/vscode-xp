import * as fs from 'fs';

import { Configuration } from '../configuration';


/**
 * Билдер конфига для упрощения его формирования по заданным параметрам.
 */
export class SiemjConfBuilder {

	constructor(private _config : Configuration) {

		const ptsiemSdk = this._config.getSiemSdkDirectoryPath();
		const buildTools = this._config.getBuildToolsDirectoryFullPath();
		const taxonomy = this._config.getTaxonomyFullPath();
		const temp = this._config.getTmpDirectoryPath();

		const pathHelper = this._config.getPathHelper();
		const outputDirName = pathHelper.getOutputDirName();
		const outputFolder = this._config.getOutputDirectoryPath(outputDirName);

		// Заполнение конфига по умолчанию.
		this._siemjConfigSection = 
`[DEFAULT]
ptsiem_sdk=${ptsiemSdk}
build_tools=${buildTools}
taxonomy=${taxonomy}
output_folder=${outputFolder}
temp=${temp}`;
	}

	/**
	 * Добавить сборку графа нормализации
	 * @param force пересобирать ли ранее собранный	граф
	 */
	public addNfgraphBuilding(force : boolean = true) : void {
		const pathLocator = this._config.getPathHelper();
		const xpAppendixPath = pathLocator.getAppendixPath();
		const contentRoots = pathLocator.getContentRoots();

		// Не собираем граф, если он уже есть.
		if(!force) {
			const normGraphFilePath = this._config.getNormGraphFilePath();
			if(fs.existsSync(normGraphFilePath)) {
				return;
			}
		}
		
		// Собираем граф нормализации из всех источников контента, их несколько для EDR.
		const rulesSrcPath = contentRoots.join(",");

		const nfgraphBuildingSection = 
`
[make-nfgraph]
type=BUILD_RULES
rcc_lang=n
rules_src=${rulesSrcPath}
xp_appendix=${xpAppendixPath}
out=\${output_folder}\\formulas_graph.json`;

		this._siemjConfigSection += nfgraphBuildingSection;
		this._scenarios.push("make-nfgraph");
	}

	public addTablesSchemaBuilding() : void {
		const pathLocator = this._config.getPathHelper();
		const contentRoots = pathLocator.getContentRoots();
		const contract = pathLocator.getTablesContract();

		// Собираем граф нормализации из всех источников контента, их несколько для EDR.
		const rulesSrcPath = contentRoots.join(",");

		const tablesSchemaBuildingSection = 
`
[make-tables-schema]
type=BUILD_TABLES_SCHEMA
table_list_schema_src=${rulesSrcPath}
contract=${contract}
out=\${output_folder}`;

		this._siemjConfigSection += tablesSchemaBuildingSection;
		this._scenarios.push("make-tables-schema");
	}

	public addTablesDbBuilding() : void {
		const tablesDatabaseBuildingSection = 
`
[make-tables-db]
type=BUILD_TABLES_DATABASE
table_list_filltype=All
table_list_schema=\${output_folder}\\schema.json
table_list_defaults=\${output_folder}\\correlation_defaults.json
out=\${output_folder}\\fpta_db.db`;

		this._siemjConfigSection += tablesDatabaseBuildingSection;
		this._scenarios.push("make-tables-db");
	}

	/**
	 * Добавить сборку графа корреляций
	 * @param force принудительно пересобрать граф корреляций
	 * @param contentSubdirPath собирать определенную часть контента
	 * @returns 
	 */
	public addCfgraphBuilding(force : boolean = true, contentSubdirPath? : string) : void {
		const pathLocator = this._config.getPathHelper();
		const rulesFilters = pathLocator.getRulesDirFilters();
		const contentRoots = pathLocator.getContentRoots();

		// Не собираем граф, если он уже есть.
		if(!force) {
			const enrichGraphFilePath = this._config.getEnrulesGraphFilePath();
			if(fs.existsSync(enrichGraphFilePath)) {
				return;
			}
		}
		
		let rulesSrcPath : string;
		if(contentSubdirPath) {
			rulesSrcPath = contentSubdirPath;
		}
		else {
			// Собираем граф нормализации из всех источников контента, их несколько для EDR.
			rulesSrcPath = contentRoots.join(",");
		}

		const cfgraphBuildingSection = 
`
[make-crgraph]
type=BUILD_RULES
rcc_lang=c
rules_src=${rulesSrcPath}
rfilters_src=${rulesFilters}
table_list_schema=\${output_folder}\\schema.json
out=\${output_folder}\\corrules_graph.json`;

		this._siemjConfigSection += cfgraphBuildingSection;
		this._scenarios.push("make-crgraph");
	}

	public addEfgraphBuilding(force : boolean = true) : void {
		const pathLocator = this._config.getPathHelper();
		const rulesFilters = pathLocator.getRulesDirFilters();
		const contentRoots = pathLocator.getContentRoots();

		// Не собираем граф, если он уже есть.
		if(!force) {
			const enrichGraphFilePath = this._config.getEnrulesGraphFilePath();
			if(fs.existsSync(enrichGraphFilePath)) {
				return;
			}
		}
		
		// Собираем граф нормализации из всех источников контента, их несколько для EDR.
		const rulesSrcPath = contentRoots.join(",");

		const efgraphBuildingSection = 
`
[make-ergraph]
type=BUILD_RULES
rcc_lang=e
rules_src=${rulesSrcPath}
rfilters_src=${rulesFilters}
table_list_schema=\${output_folder}\\schema.json
out=\${output_folder}\\enrules_graph.json`;

		this._siemjConfigSection += efgraphBuildingSection;
		this._scenarios.push("make-ergraph");
	}

	public addLocalizationBuilding(rulesSrcPath? : string) : void {

		let rulesSrcPathResult : string;
		if(!rulesSrcPath) {
			const pathLocator = this._config.getPathHelper();
			const contentRoots = pathLocator.getContentRoots();

			rulesSrcPathResult = contentRoots.join(",");
		} else {
			rulesSrcPathResult = rulesSrcPath;
		}

		const localizationBuildingSection = 
`
[make-loca]
type=BUILD_EVENT_LOCALIZATION
rules_src=${rulesSrcPathResult}
out=\${output_folder}\\langs`;

		this._siemjConfigSection += localizationBuildingSection;
		this._scenarios.push("make-loca");
	}

	public addEventsNormalize(rawEventsFilePath : string) : void {

		const eventNormalizationSection = 
`
[run-normalize]
type=NORMALIZE
formulas=\${output_folder}\\formulas_graph.json
in=${rawEventsFilePath}
raw_without_envelope=no
print_statistics=yes
not_norm_events=\${output_folder}\\not_normalized.json
out=\${output_folder}\\norm_events.json`;

		this._siemjConfigSection += eventNormalizationSection;
		this._scenarios.push("run-normalize");
	}

	public addEventsEnrich() : void {

		const eventEnrichSection = 
`
[run-enrich]
type=ENRICH
enrules=\${output_folder}\\enrules_graph.json
in=\${output_folder}\\norm_events.json
out=\${output_folder}\\enrich_events.json`;

		this._siemjConfigSection += eventEnrichSection;
		this._scenarios.push("run-enrich");
	}

	public addTestsRun(testsRuleFullPath: string) : void {

		const rulesTestsSection = 
`
[rules-tests]
type=TEST_RULES
cr_timeout=${this._crTimeout}
formulas=\${output_folder}\\formulas_graph.json
enrules=\${output_folder}\\enrules_graph.json
corrules=\${output_folder}\\corrules_graph.json
table_list_defaults=\${output_folder}\\correlation_defaults.json
rules_src=${testsRuleFullPath}`

		this._siemjConfigSection += rulesTestsSection;
		this._scenarios.push("rules-tests");
	}

	public addEventsCorrelate() : void {

		const eventEnrichSection = 
`
[run-correlate]
type=CORRELATE
corrules=\${output_folder}\\corrules_graph.json
in=\${output_folder}\\enrich_events.json
table_list_database=\${output_folder}\\fpta_db.db
out=\${output_folder}\\corr_events.json`;

		this._siemjConfigSection += eventEnrichSection;
		this._scenarios.push("run-correlate");
	}

	public build() : string {
		const resultConfig = 
`${this._siemjConfigSection}
[main]
type=SCENARIO
scenario=${this._scenarios.join(" ")}
`;
		return resultConfig;
	}

	private _siemjConfigSection : string;
	private _scenarios : string[] = [];
	private _crTimeout : number = 45;
}