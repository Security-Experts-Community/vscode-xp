// import * as vscode from 'vscode';
// import * as assert from 'assert';
// import * as fs from 'fs';
// import * as path from 'path';

// import { TestFixture } from '../../helper';
// import { Test } from 'mocha';
// import { Normalization } from '../../../models/content/normalization';
// import { ContentTreeProvider } from '../../../views/contentTree/contentTreeProvider';
// import { SiemjConfigHelper } from '../../../helpers/siemjConfigHelper';
// import { Configuration } from '../../../models/configuration';
// import { Correlation } from '../../../models/content/correlation';
// import { KbPaths } from '../../../helpers/kbHelper';
// import { ExtensionHelper } from '../../../helpers/extensionHelper';

// suite('SiemjConfigHelper', () => {

// 	test('Конфиг при запуске интеграционных тестов для правила без сабрулей', () => {

// 		const config = Configuration.get();
// 		const rule = Correlation.create("ESC_TestCorrelation", `C:\\KnowledgeBase\\`);
// 		const testKnowlegabase = path.join(ExtensionHelper.getExtensionPath(), "client", "testFixture");
// 		const kbPath = new KbPaths(testKnowlegabase);

// 		const actualConfig = SiemjConfigHelper.getTestConfig(rule, config);

// 		const expectedConfig =
// 			"[DEFAULT]\n" +
// 			"ptsiem_sdk=C:\\Tools\\25.0.9349\\vc150\\x86_64\\win\n" +
// 			"build_tools=C:\\Tools\\0.22.774\\any\\any\\win\n" +
// 			"taxonomy=C:\\PTSIEMSDK_GUI.4.0.0.738\\packages\\taxonomy\\develop\\25.0.579\\taxonomy.json\n" +
// 			"output_folder=C:\\Output\n" +
// 			"temp=C:\\Output\\temp\n" +
// 			"[make-nfgraph]\n" +
// 			"type=BUILD_RULES\n" +
// 			"rcc_lang=n\n" +
// 			`rules_src=${kbPath.getPackagesPath()}\n` +
// 			`xp_appendix=${kbPath.getAppendixPath()}\n` +
// 			"out=${output_folder}\\formulas_graph.json\n" +
// 			"[make-tables-schema]\n" +
// 			"type=BUILD_TABLES_SCHEMA\n" +
// 			`table_list_schema_src=${kbPath.getPackagesPath()}\n` +
// 			`contract=${kbPath.getTablesContract()}\n` +
// 			"out=${output_folder}\n" +
// 			"[make-ergraph]\n" +
// 			"type=BUILD_RULES\n" +
// 			"rcc_lang=e\n" +
// 			`rules_src=${kbPath.getPackagesPath()}\n` +
// 			`rfilters_src=${kbPath.getRulesDirFilters()}\n` +
// 			"table_list_schema=${output_folder}\\schema.json\n" +
// 			"out=${output_folder}\\enrules_graph.json\n" +
// 			"[make-crgraph]\n" +
// 			"type=BUILD_RULES\n" +
// 			"rcc_lang=c\n" +
// 			`rules_src=${rule.getDirectoryPath()}\n` +
// 			`rfilters_src=${kbPath.getRulesDirFilters()}\n` +
// 			"table_list_schema=${output_folder}\\schema.json\n" +
// 			"out=${output_folder}\\corrules_graph.json\n" +
// 			"[rules-tests]\n" +
// 			"type=TEST_RULES\n" +
// 			"formulas=${make-nfgraph:out}\n" +
// 			"enrules=${make-ergraph:out}\n" +
// 			"corrules=${make-crgraph:out}\n" +
// 			"table_list_defaults=${output_folder}\\correlation_defaults.json\n" +
// 			`rules_src=${rule.getDirectoryPath()}\n` +
// 			"[main]\n" +
// 			"type=SCENARIO\n" +
// 			"scenario=make-nfgraph make-tables-schema make-ergraph make-crgraph rules-tests";

// 		// TODO: тест не переносим.
// 		// assert.strictEqual(actualConfig, expectedConfig);
// 	});

// 	test('Конфиг при запуске интеграционных тестов для правила с сабрулями', () => {

// 		const config = Configuration.get();
// 		const rule = Correlation.create("ESC_TestCorrelation", `C:\\KnowledgeBase\\packages\\esc`);
// 		const testKnowlegabase = path.join(ExtensionHelper.getExtensionPath(), "client", "testFixture");
// 		const kbPath = new KbPaths(testKnowlegabase);

// 		const actualConfig = SiemjConfigHelper.getTestConfigForRuleWithSubrules(rule, config);

// 		const expectedConfig =
// 			"[DEFAULT]\n" +
// 			"ptsiem_sdk=C:\\Tools\\25.0.9349\\vc150\\x86_64\\win\n" +
// 			"build_tools=C:\\Tools\\0.22.774\\any\\any\\win\n" +
// 			"taxonomy=C:\\PTSIEMSDK_GUI.4.0.0.738\\packages\\taxonomy\\develop\\25.0.579\\taxonomy.json\n" +
// 			"output_folder=C:\\Output\n" +
// 			"temp=C:\\Output\\temp\n" +
// 			"[make-nfgraph]\n" +
// 			"type=BUILD_RULES\n" +
// 			"rcc_lang=n\n" +
// 			`rules_src=${kbPath.getPackagesPath()}\n` +
// 			`xp_appendix=${kbPath.getAppendixPath()}\n` +
// 			"out=${output_folder}\\formulas_graph.json\n" +
// 			"[make-tables-schema]\n" +
// 			"type=BUILD_TABLES_SCHEMA\n" +
// 			`table_list_schema_src=${kbPath.getPackagesPath()}\n` +
// 			`contract=${kbPath.getTablesContract()}\n` +
// 			"out=${output_folder}\n" +
// 			"[make-ergraph]\n" +
// 			"type=BUILD_RULES\n" +
// 			"rcc_lang=e\n" +
// 			`rules_src=${kbPath.getPackagesPath()}\n` +
// 			`rfilters_src=${kbPath.getRulesDirFilters()}\n` +
// 			"table_list_schema=${output_folder}\\schema.json\n" +
// 			"out=${output_folder}\\enrules_graph.json\n" +
// 			"[make-crgraph]\n" +
// 			"type=BUILD_RULES\n" +
// 			"rcc_lang=c\n" +
// 			`rules_src=C:\\KnowledgeBase\\packages\\esc\n` +
// 			`rfilters_src=${kbPath.getRulesDirFilters()}\n` +
// 			"table_list_schema=${output_folder}\\schema.json\n" +
// 			"out=${output_folder}\\corrules_graph.json\n" +
// 			"[rules-tests]\n" +
// 			"type=TEST_RULES\n" +
// 			"formulas=${make-nfgraph:out}\n" +
// 			"enrules=${make-ergraph:out}\n" +
// 			"corrules=${make-crgraph:out}\n" +
// 			"table_list_defaults=${output_folder}\\correlation_defaults.json\n" +
// 			`rules_src=${rule.getDirectoryPath()}\n` +
// 			"[main]\n" +
// 			"type=SCENARIO\n" +
// 			"scenario=make-nfgraph make-tables-schema make-ergraph make-crgraph rules-tests";
// 	});

// });
