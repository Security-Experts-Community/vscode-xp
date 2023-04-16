import * as fs from 'fs';

import { Configuration } from '../configuration';


/**
 * Билдер конфига для упрощения его формирования по заданным параметрам.
 */
export class SiemjConfBuilder {

	constructor(private _config : Configuration, private _contentRootFolder: string) {
		const outputFolder = this._config.getOutputDirectoryPath(this._contentRootFolder);

		// Заполнение конфига по умолчанию.
		this._siemjConfigSection = 
`[DEFAULT]
ptsiem_sdk=${this._config.getSiemSdkDirectoryPath()}
build_tools=${this._config.getBuildToolsDirectoryFullPath()}
taxonomy=${this._config.getTaxonomyFullPath()}
output_folder=${outputFolder}
temp=${this._config.getTmpDirectoryPath()}`;
	}

	public addNormalizationsGraphBuilding(force = true) : void {
		const xpAppendixPath = this._config.getAppendixFullPath();

		if (!force){
			const normGraphFilePath = this._config.getNormalizationsGraphFilePath(this._contentRootFolder);
			if(fs.existsSync(normGraphFilePath)) {
				return;
			}
		}

		const nfgraphBuildingSection = 
`
[make-nfgraph]
type=BUILD_RULES
rcc_lang=n
rules_src=${this._contentRootFolder}
xp_appendix=${xpAppendixPath}
out=\${output_folder}\\${this._config.getNormalizationsGraphFileName()}`;

		this._siemjConfigSection += nfgraphBuildingSection;
		this._scenarios.push("make-nfgraph");
	}

	public addTablesSchemaBuilding() : void {
		const contract = this._config.getTablesContract();
		const tablesSchemaBuildingSection = 
`
[make-tables-schema]
type=BUILD_TABLES_SCHEMA
table_list_schema_src=${this._contentRootFolder}
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
table_list_schema=\${output_folder}\\${this._config.getSchemaFileName()}
table_list_defaults=\${output_folder}\\${this._config.getCorrelationDefaultsFileName()}
out=\${output_folder}\\${this._config.getFptaDbFileName()}`;

		this._siemjConfigSection += tablesDatabaseBuildingSection;
		this._scenarios.push("make-tables-db");
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
		const efgraphBuildingSection = 
`
[make-ergraph]
type=BUILD_RULES
rcc_lang=e
rules_src=${this._contentRootFolder}
rfilters_src=${rulesFilters}
table_list_schema=\${output_folder}\\${this._config.getSchemaFileName()}
out=\${output_folder}\\${this._config.getEnrichmentsGraphFileName()}`;

		this._siemjConfigSection += efgraphBuildingSection;
		this._scenarios.push("make-ergraph");
	}
	
	/**
	 * Добавить сборку графа корреляций
	 * @param force принудительно пересобрать граф корреляций
	 * @param contentSubdirPath собирать определенную часть контента
	 * @returns 
	 */
	public addCorrelationsGraphBuilding(force = true, contentSubdirPath? : string) : void {
		
		// Не собираем граф, если он уже есть.
		if(!force) {
			const enrichGraphFilePath = this._config.getEnrichmentsGraphFilePath(this._contentRootFolder);
			if(fs.existsSync(enrichGraphFilePath)) {
				return;
			}
		}
		
		let rulesSrcPath : string;
		if(contentSubdirPath) {
			rulesSrcPath = contentSubdirPath;
		}
		else {
			rulesSrcPath = this._contentRootFolder;
		}

		const rulesFilters = this._config.getRulesDirFilters();
		const cfgraphBuildingSection = 
`
[make-crgraph]
type=BUILD_RULES
rcc_lang=c
rules_src=${rulesSrcPath}
rfilters_src=${rulesFilters}
table_list_schema=\${output_folder}\\${this._config.getSchemaFileName()}
out=\${output_folder}\\${this._config.getCorrelatedEventsFileName()}`;

		this._siemjConfigSection += cfgraphBuildingSection;
		this._scenarios.push("make-crgraph");
	}

	public addEventsNormalization(rawEventsFilePath : string) : void {

		const eventNormalizationSection = 
`
[run-normalize]
type=NORMALIZE
formulas=\${make-nfgraph:out}
in=${rawEventsFilePath}
raw_without_envelope=no
print_statistics=yes
not_norm_events=\${output_folder}\\${this._config.getNotNormalizedEventsFileName()}
out=\${output_folder}\\${this._config.getNormalizedEventsFileName()}`;

		this._siemjConfigSection += eventNormalizationSection;
		this._scenarios.push("run-normalize");
	}

	public addEventsEnrichment() : void {

		const eventEnrichSection = 
`
[run-enrich]
type=ENRICH
enrules=\${make-ergraph:out}
in=\${run-normalize:out}
out=\${output_folder}\\${this._config.getEnrichedEventsFileName()}`;

		this._siemjConfigSection += eventEnrichSection;
		this._scenarios.push("run-enrich ");
	}

	public addTestsRun(testsRuleFullPath: string) : void {

		const rulesTestsSection = 
`
[rules-tests]
type=TEST_RULES
cr_timeout=${this._crTimeout}
formulas=\${output_folder}\\${this._config.getNormalizationsGraphFileName()}
enrules=\${output_folder}\\${this._config.getEnrichmentsGraphFileName()}
corrules=\${output_folder}\\${this._config.getCorrelationsGraphFileName()}
table_list_defaults=\${output_folder}\\${this._config.getCorrelationDefaultsFileName()}
rules_src=${testsRuleFullPath}`;

		this._siemjConfigSection += rulesTestsSection;
		this._scenarios.push("rules-tests");
	}

	public addEventsCorrelate() : void {

		const eventEnrichSection = 
`
[run-correlate]
type=CORRELATE
corrules=\${output_folder}\\${this._config.getCorrelationsGraphFileName()}
in=\${output_folder}\\${this._config.getEnrichmentsGraphFileName()}
table_list_database=\${output_folder}\\${this._config.getFptaDbFileName()}
out=\${output_folder}\\${this._config.getCorrelatedEventsFileName()}`;

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
	private _crTimeout = 45;
}