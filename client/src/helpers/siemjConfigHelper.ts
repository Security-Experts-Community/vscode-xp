import * as path from 'path';
import * as fs from 'fs';

import { Configuration } from '../models/configuration';
import { RuleBaseItem } from '../models/content/ruleBaseItem';

export class SiemjConfigHelper {

	public static getBuildAllGraphs(config : Configuration ) : string[] {
		const ptsiem_sdk = config.getSiemSdkDirectoryPath();
		const build_tools = config.getBuildToolsDirectoryPath();
		const taxonomy = config.getTaxonomyFullPath();
		const temp = config.getTmpDirectoryPath();
		const kbPaths = Configuration.get().getPathHelper();
		const roots = kbPaths.getContentRoots();
		const xpAppendixPath = kbPaths.getAppendixPath();
		const tables_contract = kbPaths.getTablesContract();
		const rfilters_src = kbPaths.getRulesDirFilters();
		const corrulesGraphName = kbPaths.getCorrulesGraphFileName();

		return roots.map(root => { 
			const output_folder = config.getOutputDirectoryPath(path.basename(root));
			if(!fs.existsSync(output_folder)) {
				fs.mkdirSync(output_folder, {recursive: true});
			}
			// rules_src = "c:\\Work\\-=XDR=-\\Content\\edr-rules\\";
			// xpAppendixPath = "c:\\Work\\-=XDR=-\\Content\\edr-rules\\resources\\build-resources\\contracts\\xp_appendix\\appendix.xp";
			// tables_contract = "c:\\Work\\-=XDR=-\\Content\\edr-rules\\resources\\build-resources\\_extra\\tabular_lists\\_extra\\tabular_lists\\tables_contract.yaml"
			// rfilters_src = "c:\\Work\\-=XDR=-\\Content\\edr-rules\\resources\\build-resources\\common\\rules_filters\\"

			const siemjConfContent = 
`[DEFAULT]
ptsiem_sdk=${ptsiem_sdk}
build_tools=${build_tools}
taxonomy=${taxonomy}
output_folder=${output_folder}
temp=${temp}
[make-nfgraph]
type=BUILD_RULES
rcc_lang=n
rules_src=${root}
xp_appendix=${xpAppendixPath}
out=\${output_folder}\\formulas_graph.json
[make-tables-schema]
type=BUILD_TABLES_SCHEMA
table_list_schema_src=${root}
contract=${tables_contract}
out=\${output_folder}
[make-ergraph]
type=BUILD_RULES
rcc_lang=e
rules_src=${root}
rfilters_src=${rfilters_src}
table_list_schema=\${output_folder}\\schema.json
out=\${output_folder}\\enrules_graph.json
[make-crgraph]
type=BUILD_RULES
rcc_lang=c
rules_src=${root}
rfilters_src=${rfilters_src}
table_list_schema=\${output_folder}\\schema.json
out=\${output_folder}\\${corrulesGraphName}
[main]
type=SCENARIO
scenario=make-nfgraph make-tables-schema make-ergraph make-crgraph`;

		return siemjConfContent;});
	}


	/**
	 * Получаем конфиг для правила, которое использует сабрули. То есть для него будет дополнительно
	 * собираться весь граф корреляций.
	 * @param rule правило
	 * @param config настройки расширения
	 * @returns конфиг siemj
	 */
	public static getTestConfigForRuleWithSubrules(rule : RuleBaseItem, config : Configuration ) : string {
		const ptsiem_sdk = config.getSiemSdkDirectoryPath();
		const build_tools = config.getBuildToolsDirectoryPath();
		const taxonomy = config.getTaxonomyFullPath();
		const root = config.getPathHelper().getRootByPath(rule.getDirectoryPath());
		const output_folder = config.getOutputDirectoryPath(path.basename(root));
		if(!fs.existsSync(output_folder)) {
			fs.mkdirSync(output_folder, {recursive: true});
		}
		const temp = config.getTmpDirectoryPath();
		const kbPaths = Configuration.get().getPathHelper();
		const rules_src = rule.getContentRoot(config);
		const xpAppendixPath = kbPaths.getAppendixPath();
		const tables_contract = kbPaths.getTablesContract();
		const rfilters_src = kbPaths.getRulesDirFilters();

		// Проверяем наличие графа нормализации.
		const testRuleFullPath = rule.getDirectoryPath();

		const siemjConfContent = 
`[DEFAULT]
ptsiem_sdk=${ptsiem_sdk}
build_tools=${build_tools}
taxonomy=${taxonomy}
output_folder=${output_folder}
temp=${temp}
content_root=${rules_src}
[make-nfgraph]
type=BUILD_RULES
rcc_lang=n
rules_src=\${content_root}
xp_appendix=${xpAppendixPath}
out=\${output_folder}\\formulas_graph.json
[make-tables-schema]
type=BUILD_TABLES_SCHEMA
table_list_schema_src=\${content_root}
contract=${tables_contract}
out=\${output_folder}
[make-ergraph]
type=BUILD_RULES
rcc_lang=e
rules_src=\${content_root}
rfilters_src=${rfilters_src}
table_list_schema=\${output_folder}\\schema.json
out=\${output_folder}\\enrules_graph.json
[make-crgraph]
type=BUILD_RULES
rcc_lang=c
rules_src=${rules_src}
rfilters_src=${rfilters_src}
table_list_schema=\${output_folder}\\schema.json
out=\${output_folder}\\corrules_graph.json
[rules-tests]
type=TEST_RULES
formulas=\${make-nfgraph:out}
enrules=\${make-ergraph:out}
corrules=\${make-crgraph:out}
table_list_defaults=\${output_folder}\\correlation_defaults.json
rules_src=${testRuleFullPath}
[main]
type=SCENARIO
scenario=make-nfgraph make-tables-schema make-ergraph make-crgraph rules-tests`;
		return siemjConfContent;
	}


	public static getStartTestForSingleRule(rule : RuleBaseItem, config : Configuration ) : string {
		const ptsiem_sdk = config.getSiemSdkDirectoryPath();
		const build_tools = config.getBuildToolsDirectoryPath();
		const taxonomy = config.getTaxonomyFullPath();
		const root = config.getPathHelper().getRootByPath(rule.getDirectoryPath());
		const output_folder = config.getOutputDirectoryPath(path.basename(root));
		if(!fs.existsSync(output_folder)) {
			fs.mkdirSync(output_folder, {recursive: true});
		}
		const temp = config.getTmpDirectoryPath();

		// Проверяем наличие графа нормализации.
		const testRuleFullPath = rule.getDirectoryPath();

		// ОСТОРОЖНО! Эксперимент. Так в SDK GUI не делается.
		const siemjConfContent = 
`[DEFAULT]
ptsiem_sdk=${ptsiem_sdk}
build_tools=${build_tools}
taxonomy=${taxonomy}
output_folder=${output_folder}
temp=${temp}
[rules-tests]
type=TEST_RULES
formulas=\${output_folder}\\formulas_graph.json
enrules=\${output_folder}\\enrules_graph.json
corrules=\${output_folder}\\corrules_graph.json
table_list_defaults=\${output_folder}\\correlation_defaults.json
rules_src=${testRuleFullPath}
[main]
type=SCENARIO
scenario=rules-tests`;

		return siemjConfContent;
	}

	/**
	 * Генерирует конфиг siemj для правила без сабрулей.
	 * @param rule правило
	 * @param config настройки приложения
	 * @returns конфиг siemj
	 */
	public static getTestConfig(rule : RuleBaseItem, config : Configuration ) : string {
		const ptsiem_sdk = config.getSiemSdkDirectoryPath();
		const build_tools = config.getBuildToolsDirectoryPath();
		const taxonomy = config.getTaxonomyFullPath();
		const root = config.getPathHelper().getRootByPath(rule.getDirectoryPath());
		const output_folder = config.getOutputDirectoryPath(path.basename(root));
		if(!fs.existsSync(output_folder)) {
			fs.mkdirSync(output_folder, {recursive: true});
		}
		const temp = config.getTmpDirectoryPath();
		const kbPaths = Configuration.get().getPathHelper();
		const rules_src = rule.getContentRoot(config);
		const xpAppendixPath = kbPaths.getAppendixPath();
		const tables_contract = kbPaths.getTablesContract();
		const rfilters_src = kbPaths.getRulesDirFilters();

		// TODO: тесты с контентом для XDR
		// rules_src = "c:\\Work\\-=XDR=-\\Content\\edr-rules\\";
		// xpAppendixPath = "c:\\Work\\-=XDR=-\\Content\\edr-rules\\resources\\build-resources\\contracts\\xp_appendix\\appendix.xp";
		// tables_contract = "c:\\Work\\-=XDR=-\\Content\\edr-rules\\resources\\build-resources\\_extra\\tabular_lists\\_extra\\tabular_lists\\tables_contract.yaml"
		// rfilters_src = "c:\\Work\\-=XDR=-\\Content\\edr-rules\\resources\\build-resources\\common\\rules_filters\\"

		// Проверяем наличие графа нормализации.
		const testRuleFullPath = rule.getDirectoryPath();
		// Иногда фильтры лежат на уровне пакета, поэтому при сборке
		// графа корреляций указываем путь к всему пакету
		const rulePackage = rule.getPackagePath(config);

		const siemjConfContent = 
`[DEFAULT]
ptsiem_sdk=${ptsiem_sdk}
build_tools=${build_tools}
taxonomy=${taxonomy}
output_folder=${output_folder}
temp=${temp}
[make-nfgraph]
type=BUILD_RULES
rcc_lang=n
rules_src=${rules_src}
xp_appendix=${xpAppendixPath}
out=\${output_folder}\\formulas_graph.json
[make-tables-schema]
type=BUILD_TABLES_SCHEMA
table_list_schema_src=${rules_src}
contract=${tables_contract}
out=\${output_folder}
[make-ergraph]
type=BUILD_RULES
rcc_lang=e
rules_src=${rules_src}
rfilters_src=${rfilters_src}
table_list_schema=\${output_folder}\\schema.json
out=\${output_folder}\\enrules_graph.json
[make-crgraph]
type=BUILD_RULES
rcc_lang=c
rules_src=${rulePackage}
rfilters_src=${rfilters_src}
table_list_schema=\${output_folder}\\schema.json
out=\${output_folder}\\corrules_graph.json
[rules-tests]
type=TEST_RULES
formulas=\${make-nfgraph:out}
enrules=\${make-ergraph:out}
corrules=\${make-crgraph:out}
table_list_defaults=\${output_folder}\\correlation_defaults.json
rules_src=${testRuleFullPath}
[main]
type=SCENARIO
scenario=make-nfgraph make-tables-schema make-ergraph make-crgraph rules-tests`;

		return siemjConfContent;
	}

	public static async saveSiemjConfig(siemjConfigContent: string, siemjConfigPath: string) : Promise<void> {
		// Проверяем, что директория для записи файла существует
		const siemjFolder = path.dirname(siemjConfigPath);
		if(!fs.existsSync(siemjFolder)) {
			fs.mkdirSync(siemjFolder, {recursive: true});
		}
		// Сохраняем конфигурационный файл для siemj.
		return fs.promises.writeFile(siemjConfigPath, siemjConfigContent);
	}
}