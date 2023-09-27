import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

import { EOL } from 'os';
import { ExecutionResult, ProcessHelper } from '../../helpers/processHelper';
import { TestHelper } from '../../helpers/testHelper';
import { DialogHelper } from '../../helpers/dialogHelper';
import { Configuration } from '../configuration';
import { TestStatus } from './testStatus';
import { FileSystemHelper } from '../../helpers/fileSystemHelper';
import { BaseUnitTest } from './baseUnitTest';
import { UnitTestRunner } from './unitTestsRunner';
import { UnitTestOutputParser } from './unitTestOutputParser';
import { SiemjManager } from '../siemj/siemjManager';
import { Log } from '../../extension';

export class CorrelationUnitTestsRunner implements UnitTestRunner {

	constructor(private _config: Configuration, private _outputParser : UnitTestOutputParser) {
	}

	public async run(test: BaseUnitTest): Promise<BaseUnitTest> {

		const root = this._config.getRootByPath(test.getRule().getDirectoryPath());
		const rootFolder = path.basename(root);
		const outputFolder = this._config.getOutputDirectoryPath(rootFolder);
		if(!fs.existsSync(outputFolder)) {
			fs.mkdirSync(outputFolder, {recursive: true});
		}
		
		const tmpDirPath = this._config.getTmpDirectoryPath(rootFolder);
		if(!fs.existsSync(tmpDirPath)) {
			fs.mkdirSync(tmpDirPath, {recursive: true});
		}

		if(!this._config.isKbOpened()) {
			DialogHelper.showError("Не выбрана база знаний.");
			return;
		}

		const rule = test.getRule();
		const schemaFullPath = this._config.getSchemaFullPath(rootFolder);
		
		// Схема БД необходима для запуска юнит-тестов.
		if(!fs.existsSync(schemaFullPath)) {
			await vscode.window.withProgress({
				location: vscode.ProgressLocation.Notification,
				cancellable: false
			}, async (progress) => {
				const message = "Сборка схемы БД, которая необходима для запуска тестов";
				progress.report( {message : message});
				Log.info(message);
				
				const siemjManager = new SiemjManager(this._config);
				await siemjManager.buildSchema(rule);
			});
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
			const ruleFilePath = test.getRuleFullPath();

			// const ecaTestParam = `C:\\Tools\\0.22.774\\any\\any\\win\\ecatest.exe`;
			const ecaTestParam = this._config.getEcatestFullPath();
			const sdkDirPath = this._config.getSiemSdkDirectoryPath();
			const taxonomyFilePath= this._config.getTaxonomyFullPath();
			const testFilepath = test.getTestExpectationPath();
			const fptDefaults = this._config.getCorrelationDefaultsFilePath(rootFolder);
			const schemaFilePath = this._config.getSchemaFullPath(rootFolder);
			const ruleFiltersDirPath = this._config.getRulesDirFilters();

			const output = await ProcessHelper.execute(ecaTestParam,
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
				{
					encoding : "utf-8",
					outputChannel : this._config.getOutputChannel()
				}
			);

			if(!output.output) {
				DialogHelper.showError('Не удалось запустить модульные тесты, команда запуска не вернула ожидаемые данные. Проверьте путь до утилит KBT [в настройках расширения](command:workbench.action.openSettings?["xpConfig.kbtBaseDirectory"]).');
				test.setStatus(TestStatus.Unknown);
				return test;
			}
			
			// Получаем путь к правилу для которого запускали тест
			const ruleFileUri = vscode.Uri.file(ruleFilePath);

			if(output.output.includes(this.SUCCESS_TEST_SUBSTRING)) {
				// Обновление статуса теста.
				test.setStatus(TestStatus.Success);

				// Вывод теста содержит событие, подходящее под expect секцию, поэтому извлекаем его и очищаем, как код теста.
				const extrectedResult = this._outputParser.parseSuccessOutput(output.output);
				const clearedResult = TestHelper.cleanModularTestResult(extrectedResult);

				// Так как тест успешный, то можно сохранить отформатированный результат.
				test.setOutput(clearedResult);

				// Добавляем отформатированный результат в окно вывода.				
				this._config.getOutputChannel().append("\n\nFormatted result:\n" + clearedResult);

				// Очищаем ранее выявленные ошибки, если такие были.
				this._config.getDiagnosticCollection().set(ruleFileUri, []);
				return test;
			}

			test.setStatus(TestStatus.Failed);
			const expectation = test.getTestExpectation();
			test.setOutput(this._outputParser.parseFailedOutput(output.output, expectation));

			// Парсим ошибки из вывода.
			let diagnostics = this._outputParser.parse(output.output);

			// Коррекция вывода.
			const ruleContent = await FileSystemHelper.readContentFile(ruleFilePath);
			const lines = ruleContent.split(EOL);
			lines.forEach(line => {if(line.includes("\n")){DialogHelper.showInfo(`File ${ruleFilePath} contains mixed ends of lines`);}});

			diagnostics = TestHelper.correctWhitespaceCharacterFromErrorLines(ruleContent, diagnostics);

			// Выводим ошибки в нативной для VsCode форме.
			this._config.getDiagnosticCollection().set(ruleFileUri, diagnostics);
			
			return test;
		}
		catch (error) {
			test.setStatus(TestStatus.Unknown);
			DialogHelper.showError("Тест завершился неожиданной ошибкой", error);
			return test;
		}
	}

	private readonly SUCCESS_TEST_SUBSTRING = "SUCCESS!";
}
