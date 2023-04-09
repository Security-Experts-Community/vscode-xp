import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { EOL } from 'os';

import { ProcessHelper } from '../../helpers/processHelper';
import { TestHelper } from '../../helpers/testHelper';
import { CorrelationUnitTest } from './correlationUnitTest';
import { ExtensionHelper } from '../../helpers/extensionHelper';
import { Configuration } from '../configuration';
import { TestStatus } from './testStatus';
import { ModuleTestOutputParser } from '../../views/modularTestsEditor/modularTestOutputParser';
import { ContentTreeProvider } from '../../views/contentTree/contentTreeProvider';
import { VsCodeApiHelper } from '../../helpers/vsCodeApiHelper';
import { FileSystemHelper } from '../../helpers/fileSystemHelper';
import { Test } from 'mocha';

export class UnitTestsRunner {

	constructor(private _config: Configuration, private _outputParser : ModuleTestOutputParser) {
	}

	public async run(test: CorrelationUnitTest): Promise<CorrelationUnitTest> {

		// const tmp = `--temp "C:\\Output\\temp"`;
		const root = this._config.getPathHelper().getRootByPath(test.getRule().getDirectoryPath());
		const rootFolder = path.basename(root);
		const outputFolder = this._config.getOutputDirectoryPath(rootFolder);
		if(!fs.existsSync(outputFolder)) {
			fs.mkdirSync(outputFolder);
		}
		
		// const tmp = `C:\\Output\\temp`;
		const tmpDirPath = this._config.getTmpDirectoryPath();
		if(!fs.existsSync(tmpDirPath)) {
			fs.mkdirSync(tmpDirPath);
		}

		const pathHelper = Configuration.get().getPathHelper();
		if(!pathHelper.isKbOpened()) {
			ExtensionHelper.showUserError("Не открыта база знаний");
			return;
		}

		try {
			// "C:\\Tools\\0.22.774\\any\\any\\win\\ecatest.exe" 
			// 	--sdk "C:\Work\-=SIEM=-\Tools\25.0.9349\vc150\x86_64\win" 
			// 	--taxonomy "C:\Work\-=SIEM=-\PTSIEMSDK_GUI.4.0.0.738\packages\taxonomy\develop\25.0.579\taxonomy.json" 
			// 	--temp "C:\Work\Coding\PTSIEMSDK_GUI\PTSIEMSDK_GUI\bin\Debug\temp" 
			// 	-s "c:\Work\-=SIEM=-\Content\knowledgebase\packages\esc_profiling\correlation_rules\devops\ESC_Anomaly_Logon_to_UsWeb\rule.co" 
			// 	-c "c:\Work\-=SIEM=-\Content\knowledgebase\packages\esc_profiling\correlation_rules\devops\ESC_Anomaly_Logon_to_UsWeb\tests\test_1.sc" 
			// 	--schema "C:\Work\-=SIEM=-\Output\schema.json" 
			// 	--fpta-defaults "C:\Work\-=SIEM=-\Output\correlation_defaults.json" 
			// 	--rules-filters "C:\Work\-=SIEM=-\Content\knowledgebase\common\rules_filters"

			// Очищаем и показываем окно Output
			this._config.getOutputChannel().clear();
			this._config.getOutputChannel().show();
			const ruleFilePath = test.getRuleFullPath();

			// const ecaTestParam = `C:\\Tools\\0.22.774\\any\\any\\win\\ecatest.exe`;
			const ecaTestParam = this._config.getEcatestFullPath();
			const sdkDirPath = this._config.getSiemSdkDirectoryPath();
			const taxonomyFilePath= this._config.getTaxonomyFullPath();
			const testFilepath = test.getTestPath();
			const fptDefaults = this._config.getCorrelationDefaultsFilePath(rootFolder);
			const schemaFilePath = this._config.getSchemaFullPath(rootFolder);
			const ruleFiltersDirPath = pathHelper.getRulesDirFilters();

			const output = await ProcessHelper.ExecuteWithArgsWithRealtimeOutput(ecaTestParam,
				[
					"--sdk", sdkDirPath,
					"--taxonomy", taxonomyFilePath,
					"--temp", tmpDirPath,
					"-s", ruleFilePath,
					"-c", testFilepath,
					"--schema", schemaFilePath,
					"--fpta-defaults", fptDefaults,
					"--rules-filters", ruleFiltersDirPath
				],
				this._config.getOutputChannel()
			);

			if(!output) {
				ExtensionHelper.showUserError("Ошибка запуска юнит-тестов, команда запуска не вернула ожидаемые данные. Проверьте пути до утилит.");
				test.setStatus(TestStatus.Unknown);
				return test;
			}
			
			// Получаем путь к правилу для которого запускали тест
			const ruleFileUri = vscode.Uri.file(ruleFilePath);

			// Обновление статуса теста.
			if(output.includes(this.SUCCESS_TEST_SUBSTRING)) {
				// Так как тест успешный, то можно сохранить отформатированный результат.
				test.setStatus(TestStatus.Success);

				const formatedOutput = TestHelper.formatTestCodeAndEvents(output);
				test.setOutput(formatedOutput);

				// Очищаем неформатированный вывод и добавляем отформатированный.
				this._config.getOutputChannel().clear();
				this._config.getOutputChannel().append(formatedOutput);

				// Очищаем ранее выявленные ошибки, если такие были.
				this._config.getDiagnosticCollection().set(ruleFileUri, []);
				return test;
			}

			test.setStatus(TestStatus.Failed);
			test.setOutput(output);

			// Парсим ошибки из вывода.
			let diagnostics = this._outputParser.parse(output);

			// Коррекция вывода.
			const ruleContent = await FileSystemHelper.readContentFile(ruleFilePath);
			const lines = ruleContent.split(EOL);
			lines.forEach(line => {if(line.includes("\n")){ExtensionHelper.showUserInfo(`File ${ruleFilePath} contains mixed ends of lines`);}});

			diagnostics = TestHelper.correctWhitespaceCharacterFromErrorLines(ruleContent, diagnostics);

			// Выводим ошибки в нативной для VsCode форме.
			this._config.getDiagnosticCollection().set(ruleFileUri, diagnostics);
			
			return test;
		}
		catch (error) {
			test.setStatus(TestStatus.Unknown);
			ExtensionHelper.showError("Тест завернился неожиданной ошибкой.", error);
			return test;
		}
	}

	private readonly SUCCESS_TEST_SUBSTRING = "SUCCESS!";
}