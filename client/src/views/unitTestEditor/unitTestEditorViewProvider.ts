import * as fs from 'fs';
import * as vscode from 'vscode';
import * as path from 'path';

import { Configuration } from '../../models/configuration';
import { BaseUnitTest } from '../../models/tests/baseUnitTest';
import { TestHelper } from '../../helpers/testHelper';
import { TestStatus } from '../../models/tests/testStatus';
import { FileSystemHelper } from '../../helpers/fileSystemHelper';
import { MustacheFormatter } from '../mustacheFormatter';
import { ExtensionHelper } from '../../helpers/extensionHelper';
import { ExceptionHelper } from '../../helpers/exceptionHelper';
import { UnitTestsListViewProvider } from './unitTestsListViewProvider';
import { SiemjManager } from '../../models/siemj/siemjManager';

export class UnitTestContentEditorViewProvider  {

	public static readonly viewId = 'ModularTestContentEditorView';

	public static readonly showEditorCommand = "ModularTestContentEditorView.showEditor";
	public static readonly onTestSelectionChangeCommand = "ModularTestContentEditorView.onTestSelectionChange";

	private _view?: vscode.WebviewPanel;
	private _test: BaseUnitTest;

	public constructor(
		private readonly _config: Configuration,
		private readonly _templatePath: string) {
	}

	public static init(config: Configuration) {
		const context = config.getContext();

		// Форма создания визуалиации интеграционных тестов.
		const templatePath = path.join(
			config.getExtensionPath(), 
			path.join("client", "templates", "UnitTestEditor.html")
		);

		const provider = new UnitTestContentEditorViewProvider(config, templatePath);

		// Открытие кода теста по нажатию на его номер.
		context.subscriptions.push(
			vscode.commands.registerCommand(
				UnitTestContentEditorViewProvider.showEditorCommand, 
				async (test: BaseUnitTest) => {
					const testPath = test.getTestExpectationPath();
					if (!fs.existsSync(testPath)) {
						vscode.window.showWarningMessage(`Не удалось открыть тест по пути '${testPath}'`);
						return;
					}
					// test.show();
					provider.showEditor(test);
				}
			)
		);	

		context.subscriptions.push(
			vscode.commands.registerCommand(
				UnitTestContentEditorViewProvider.onTestSelectionChangeCommand, 
				async (test: BaseUnitTest) => {
					// Открываем код теста.
					vscode.commands.executeCommand(UnitTestContentEditorViewProvider.showEditorCommand, test);

					// Показываем вывод теста, если он есть.
					const testOutput = test.getOutput();
					if(!testOutput) {
						return;
					}

					const outputChannel = Configuration.get().getOutputChannel();
					outputChannel.clear();
					outputChannel.append(testOutput);
				}
			)
		);
	}

	public async showEditor(unitTest: BaseUnitTest)  {

		if(this._view) {
			this._test = null;
			this._view.dispose();
		}

		if(!(unitTest instanceof BaseUnitTest)) {
			return;
		}

		this._test = unitTest;
		const rule = this._test.getRule();

		// Создать и показать панель.
		const viewTitle = `Тест №${this._test.getNumber()} правила '${rule.getName()}'`;
		this._view = vscode.window.createWebviewPanel(
			UnitTestContentEditorViewProvider.viewId,
			viewTitle,
			vscode.ViewColumn.One, 
			{
				retainContextWhenHidden : true,
				enableFindWidget : true
			});

		this._view.webview.options = {
			enableScripts: true
		};

		this._view.webview.onDidReceiveMessage(
			this.receiveMessageFromWebView,
			this
		);

		await this.updateView();
	}

	private async updateView() : Promise<void> {

		const rule = this._test.getRule();

		const resoucesUri = this._config.getExtensionUri();
		const extensionBaseUri = this._view.webview.asWebviewUri(resoucesUri);

		const plain = {
			"UnitTest" : null,
			"ExtensionBaseUri" : extensionBaseUri, 
			"RuleName" : rule.getName()
		};

		try {

			const formattedTestInput = TestHelper.formatTestCodeAndEvents(this._test.getTestInputData());
			const formattedTestExpectation = TestHelper.formatTestCodeAndEvents(this._test.getTestExpectation());

			let testStatusStyle : string;
			const testStatus = this._test.getStatus();
			vscode.commands.executeCommand(UnitTestsListViewProvider.refreshCommand);
			switch(testStatus) {
				case TestStatus.Unknown: {
					testStatusStyle = "";
					break;
				}
				case TestStatus.Success: {
					testStatusStyle = "success";
					break;
				}
				case TestStatus.Failed: {
					testStatusStyle = "failure";
					break;
				}
			}

			plain["UnitTest"] = {
				"TestNumber" : this._test.getNumber(),
				"TestInput" : formattedTestInput,
				"TestExpectation" :  formattedTestExpectation,
				"TestOutput" : this._test.getOutput(),
				"TestStatus" : testStatusStyle,
			};
			
			const template = await FileSystemHelper.readContentFile(this._templatePath);
			const formatter = new MustacheFormatter(template);
			const htmlContent = formatter.format(plain);

			this._view.webview.html = htmlContent;
		}
		catch(error) {
			ExtensionHelper.showError("Ошибка открытия интеграционных тестов.", error);
		}
	}

	private async receiveMessageFromWebView(message: any) {
		switch (message.command) {
			case 'saveTest': {				
				this.saveTest(message);
				this.updateView();
				return;
			}

			case 'runTest': {
				this.saveTest(message);
				await this.runUnitTest(message);
				return;
			}

			default: {
				ExtensionHelper.showUserInfo("Данная команда в настоящий момент не поддерживается. Stay tuned!");
			}
		}
	}

	private saveTest(message: any){
		const testInfo = message.test;
		try {
			const rawEvent = testInfo.rawEvent;
			if(!rawEvent) {
				throw new Error(`Не задано сырое событие для теста №${this._test.getNumber()}. Добавьте его и повторите.`);
			}
			this._test.setTestInputData(rawEvent);
			const expectation = testInfo.expectation;
			if(!expectation) {
				throw new Error(`Не задано ожидаемое нормализованное событие для теста №${this._test.getNumber()}. Добавьте его и повторите.`);
			}
			this._test.setTestExpectation(expectation);
			this._test.save();
		}
		catch(error) {
			ExceptionHelper.show(error, `Ошибка сохранения теста №${this._test.label} правила ${this._test.getRule().getName()}`);
			return;
		}
	}

	private async runUnitTest(message: any) {
		if(!message.test) {
			ExtensionHelper.showUserError("Сохраните тест перед запуском нормализации сырых событий и повторите.");
			return;
		}

		const rule = this._test.getRule();
		const root = this._config.getRootByPath(rule.getDirectoryPath());
		const rootFolder = path.basename(root);
		const schemaFullPath = this._config.getSchemaFullPath(rootFolder);

		return vscode.window.withProgress({
			location: vscode.ProgressLocation.Notification,
			cancellable: false
		}, async (progress) => {
			try {
				// Схема БД необходима для запуска юнит-тестов.
				if(!fs.existsSync(schemaFullPath)) {
					progress.report( {message : "Сборка схемы БД, которая необходима для запуска тестов."});
					const siemjManager = new SiemjManager(this._config);
					await siemjManager.buildSchema(rule);
				}
				
				progress.report( {message : `Выполнение теста №${this._test.getNumber()}'`});
				const runner = rule.getUnitTestRunner();
				this._test = await runner.run(this._test);			
				this.updateView();
			}
			catch(error) {
				ExceptionHelper.show(error);
			}
		});
	}
}
