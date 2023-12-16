import * as fs from 'fs';
import * as vscode from 'vscode';
import * as path from 'path';

import { Configuration } from '../../models/configuration';
import { BaseUnitTest } from '../../models/tests/baseUnitTest';
import { TestHelper } from '../../helpers/testHelper';
import { TestStatus } from '../../models/tests/testStatus';
import { FileSystemHelper } from '../../helpers/fileSystemHelper';
import { MustacheFormatter } from '../mustacheFormatter';
import { DialogHelper } from '../../helpers/dialogHelper';
import { ExceptionHelper } from '../../helpers/exceptionHelper';
import { UnitTestsListViewProvider } from './unitTestsListViewProvider';
import { XpException } from '../../models/xpException';
import { RegExpHelper } from '../../helpers/regExpHelper';
import { Correlation } from '../../models/content/correlation';
import { Normalization } from '../../models/content/normalization';

export class UnitTestContentEditorViewProvider {

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

		// Форма создания визуализации интеграционных тестов.
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
						vscode.window.showWarningMessage(`Не удалось открыть тест: '${testPath}'`);
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
				}
			)
		);
	}

	public async showEditor(unitTest: BaseUnitTest) {

		if (this._view) {
			this._test = null;
			this._view.dispose();
		}

		if (!(unitTest instanceof BaseUnitTest)) {
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
				retainContextWhenHidden: true,
				enableFindWidget: true
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

	private async updateView(): Promise<void> {

		const rule = this._test.getRule();

		const resourcesUri = this._config.getExtensionUri();
		const extensionBaseUri = this._view.webview.asWebviewUri(resourcesUri);

		const plain = {
			"UnitTest": null,
			"ExtensionBaseUri": extensionBaseUri,
			"RuleName": rule.getName()
		};

		try {

			const formattedTestInput = TestHelper.formatTestCodeAndEvents(this._test.getTestInputData());
			const formattedTestExpectation = TestHelper.formatTestCodeAndEvents(this._test.getTestExpectation());

			let testStatusStyle: string;
			const testStatus = this._test.getStatus();
			vscode.commands.executeCommand(UnitTestsListViewProvider.refreshCommand);
			switch (testStatus) {
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
				"TestNumber": this._test.getNumber(),
				"TestInput": formattedTestInput,
				"TestExpectation": formattedTestExpectation,
				"TestOutput": this._test.getOutput(),
				"TestStatus": testStatusStyle,
			};

			const template = await FileSystemHelper.readContentFile(this._templatePath);
			const formatter = new MustacheFormatter(template);
			const htmlContent = formatter.format(plain);

			this._view.webview.html = htmlContent;
		}
		catch (error) {
			DialogHelper.showError("Не удалось открыть интеграционные тесты.", error);
		}
	}

	private async receiveMessageFromWebView(message: any) {
		switch (message.command) {
			case 'saveTest': {
				await this.saveTest(message);
				this.updateView();
				return;
			}

			case 'runTest': {
				await this.saveTest(message);
				await this.runUnitTest(message);
				this.updateView();
				return;
			}

			case 'updateExpectEvent': {
				const actualEvent = this._test.getActualEvent();
				if(!actualEvent) {
					DialogHelper.showWarning("Фактическое событие не получено. Запустите тест для получения фактического события, после чего можно заменить ожидаемое событие фактическим");
					return;
				}

				const rule = this._test.getRule();
				let resultTestCode: string;

				// В модульных тестах корреляций есть expect и возможны комментарии, поэтому надо заменить события, сохранив остальное.
				if(rule instanceof Correlation) {
					const newTestCode = `expect 1 ${actualEvent}`;
					const currentTestCode = this._test.getTestExpectation();
					resultTestCode = currentTestCode.replace(
						RegExpHelper.getExpectSectionRegExp(),
						// Фикс того, что из newTestCode пропадают доллары
						// https://stackoverflow.com/questions/9423722/string-replace-weird-behavior-when-using-dollar-sign-as-replacement
						function () {return newTestCode;}
					);
				}

				// Для нормализации просто сохраняем фактическое событие без дополнительных преобразований.
				if(rule instanceof Normalization) {
					resultTestCode = actualEvent;
				}
				
				// Обновляем ожидаемое событие на диске и во вьюшке и запускаем тесты.
				this._test.setTestExpectation(resultTestCode);
				await this._test.save();
				await this.runUnitTest(message);
				this.updateView();

				DialogHelper.showInfo("Ожидаемое событие обновлено и тест перезапущен");
				return;
			}

			default: {
				DialogHelper.showError("Переданная команда не поддерживается");
			}
		}
	}

	private async saveTest(message: any) {
		const testInfo = message.test;
		try {
			const rawEvent = testInfo.rawEvent;
			if (!rawEvent) {
				throw new XpException(`Не задано сырое событие для теста №${this._test.getNumber()}. Добавьте его и повторите.`);
			}
			const compressedRawEvent = TestHelper.compressTestCode(rawEvent);
			this._test.setTestInputData(compressedRawEvent);

			const expectation = testInfo.expectation;
			if (!expectation) {
				throw new XpException(`Не задано ожидаемое нормализованное событие для теста №${this._test.getNumber()}. Добавьте его и повторите.`);
			}
			
			this._test.setTestExpectation(expectation);
			await this._test.save();

			DialogHelper.showInfo("Тест успешно сохранён");
		}
		catch (error) {
			ExceptionHelper.show(error, `Не удалось сохранить модульный тест №${this._test.label} правила ${this._test.getRule().getName()}`);
			return;
		}
	}

	private async runUnitTest(message: any) {
		const rule = this._test.getRule();
		return vscode.window.withProgress({
			location: vscode.ProgressLocation.Notification,
			cancellable: false
		}, async (progress) => {
			try {
				progress.report({ message: `Выполнение теста №${this._test.getNumber()}` });
				const runner = rule.getUnitTestRunner();
				this._test = await runner.run(this._test);
			}
			catch (error) {
				ExceptionHelper.show(error, "Неожиданная ошибка выполнения модульного теста");
			}
		});
	}
}
