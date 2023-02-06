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

		// Настройки среды.
		// const ecaTestParam = `C:\\Work\\-=SIEM=-\\Tools\\0.22.774\\any\\any\\win\\ecatest.exe`;
		const ecaTestParam = this._config.getEcatestFullPath();
		if(!fs.existsSync(ecaTestParam)) {
			ExtensionHelper.showUserError(`Файл по пути '${ecaTestParam}' не найден. Проверьте заданые в настройках расширения пути, а также наличие данной утилиты.`);
			await VsCodeApiHelper.openSettings(this._config.getExtentionSettingsPrefix());
			return;
		}

		// const sdkParam = `C:\\Work\\-=SIEM=-\\Tools\\25.0.9349\\vc150\\x86_64\\win`;
		if(!fs.existsSync(this._config.getSiemSdkDirectoryPath())) {
			ExtensionHelper.showUserError(`Заданный в настройках расширения путь '${this._config.getSiemSdkDirectoryPath()}' недоступен. Запуск тестов, нормализация событий и т.д. будут невозможны.`);
			await VsCodeApiHelper.openSettings(this._config.getExtentionSettingsPrefix());
			return;
		}

		if(!fs.existsSync(this._config.getBuildToolsDirectoryPath())) {
			ExtensionHelper.showUserError(`Заданный в настройках расширения путь '${this._config.getBuildToolsDirectoryPath()}' недоступен. Запуск тестов, нормализация событий и т.д. будут невозможны.`);
			await VsCodeApiHelper.openSettings(this._config.getExtentionSettingsPrefix());
			return;
		}

		// const taxonomy = `C:\\Work\\-=SIEM=-\\PTSIEMSDK_GUI.4.0.0.738\\packages\\taxonomy\\develop\\25.0.579\\taxonomy.json`;
		if(!fs.existsSync(this._config.getTaxonomyFullPath())) {
			ExtensionHelper.showUserError(`Заданный в настройках путь '${this._config.getTaxonomyFullPath()}' к файлу таксономии недоступен. Запуск тестов, нормализация событий и т.д. будут невозможны.`);
			await VsCodeApiHelper.openSettings(this._config.getExtentionSettingsPrefix());
			return;
		}

		const sdkDirPath = this._config.getSiemSdkDirectoryPath();
		const taxonomyFilePath= this._config.getTaxonomyFullPath();

		// const tmp = `--temp "c:\\Work\\-=SIEM=-\\Output\\temp"`;
		const root = this._config.getPathHelper().getRootByPath(test.getRule().getDirectoryPath());
		const rootFolder = path.basename(root);
		const outputFolder = this._config.getOutputDirectoryPath(rootFolder);
		if(!fs.existsSync(outputFolder)) {
			fs.mkdirSync(outputFolder);
		}
		
		// const tmp = `c:\\Work\\-=SIEM=-\\Output\\temp`;
		const tmpDirPath = this._config.getTmpDirectoryPath();
		if(!fs.existsSync(tmpDirPath)) {
			fs.mkdirSync(tmpDirPath);
		}

		const pathHelper = Configuration.get().getPathHelper();
		if(!pathHelper.isKbOpened()) {
			ExtensionHelper.showUserError("Не открыта база знаний");
			return;
		}

		// const ruleFiltersDirPath = `C:\\Work\\-=SIEM=-\\Content\\knowledgebase\\common\\rules_filters`;
		const ruleFiltersDirPath = pathHelper.getRulesDirFilters();
		if(!fs.existsSync(ruleFiltersDirPath)) {
			ExtensionHelper.showUserError(`Файл по пути '${ruleFiltersDirPath}' не найден. База знаний повреждена.`);
			return;
		}

		// const schemaFilePath = `C:\\Work\\-=SIEM=-\\Output\\schema.json`;
		const schemaFilePath = this._config.getSchemaFullPath(rootFolder);
		if(!fs.existsSync(schemaFilePath)) {
			ExtensionHelper.showUserError(`Файл по пути '${schemaFilePath}' не найден. Необходимо [собрать графы](command:KnowledgebaseTree.buildAll) и повторить запуск тестов.`);
			return;
		}

		// const fptDefaults = `C:\\Work\\-=SIEM=-\\Output\\correlation_defaults.json`;
		const fptDefaults = this._config.getCorrelationDefaultsFilePath(rootFolder);
		if(!fs.existsSync(fptDefaults)) {
			ExtensionHelper.showUserError(`Файл по пути '${fptDefaults}' не найден. Необходимо [собрать графы](command:KnowledgebaseTree.buildAll) и повторить запуск тестов.`);
			return;
		}

		// Параметры теста.
		// c:\Work\-=SIEM=-\Content\knowledgebase\packages\esc_profiling\correlation_rules\devops\ESC_Anomaly_Logon_to_UsWeb\rule.co
		const ruleFilePath = test.getRuleFullPath();
		if(!fs.existsSync(ruleFilePath)) {
			ExtensionHelper.showUserError(`Не найден путь '${ruleFilePath}' к файлу правила.`);
			test.setStatus(TestStatus.Unknown);
			return;
		}

		// c:\Work\-=SIEM=-\Content\knowledgebase\packages\esc_profiling\correlation_rules\devops\ESC_Anomaly_Logon_to_UsWeb\tests\test_1.sc
		const testFilepath = test.getTestPath();
		if(!fs.existsSync(testFilepath)) {
			vscode.window.showErrorMessage(`Не найден путь '${testFilepath}' к файлу модульного теста.`);
			test.setStatus(TestStatus.Unknown);
			return;
		}

		try {
			// "C:\\Work\\-=SIEM=-\\Tools\\0.22.774\\any\\any\\win\\ecatest.exe" 
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