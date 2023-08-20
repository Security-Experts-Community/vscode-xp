import * as fs from 'fs';
import * as vscode from 'vscode';
import * as path from 'path';

import { ExtensionHelper } from '../../helpers/extensionHelper';
import { MustacheFormatter } from '../mustacheFormatter';
import { EventMimeType as EventMimeType, TestHelper } from '../../helpers/testHelper';
import { IntegrationTest } from '../../models/tests/integrationTest';
import { Correlation } from '../../models/content/correlation';
import { Enrichment } from '../../models/content/enrichment';
import { RuleBaseItem } from '../../models/content/ruleBaseItem';
import { Configuration } from '../../models/configuration';
import { SiemjManager } from '../../models/siemj/siemjManager';
import { CorrelationUnitTestsRunner } from '../../models/tests/correlationUnitTestsRunner';
import { FileSystemHelper } from '../../helpers/fileSystemHelper';
import { IntegrationTestRunner } from '../../models/tests/integrationTestRunner';
import { RegExpHelper } from '../../helpers/regExpHelper';
import { FastTest } from '../../models/tests/fastTest';
import { VsCodeApiHelper } from '../../helpers/vsCodeApiHelper';
import { TestStatus } from '../../models/tests/testStatus';
import { SiemJOutputParser } from '../../models/siemj/siemJOutputParser';
import { ExceptionHelper } from '../../helpers/exceptionHelper';
import { XpException } from '../../models/xpException';
import { Enveloper } from '../../models/enveloper';
import { ExtensionState } from '../../models/applicationState';

export class IntegrationTestEditorViewProvider  {

	public static readonly viewId = 'IntegrationTestEditorView';
	public static readonly onTestSelectionChangeCommand = "IntegrationTestEditorView.onTestSelectionChange";

	private _view?: vscode.WebviewPanel;
	private _rule: RuleBaseItem;

	public constructor(
		private readonly _config: Configuration,
		private readonly _templatePath: string) {
	}

	public static init(config: Configuration) {

		// Форма создания визуалиации интеграционных тестов.
		const templatePath = path.join(
			config.getExtensionPath(), 
			path.join("client", "templates", "IntegrationTestEditor.html")
		);

		const provider = new IntegrationTestEditorViewProvider(config, templatePath);

		// Открытие формы тестов.
		config.getContext().subscriptions.push(
			vscode.commands.registerCommand(
				IntegrationTestEditorViewProvider.showEditorCommand, 
				async (rule: Correlation|Enrichment) => {
					// Обновляем интеграционные тесты для того, чтобы можно было увидеть актуальные тесты при их модификации на ЖД.
					if(!rule) {
						ExtensionHelper.showUserError("Правило еще не успело подгрузиться. Повторите еще раз.");
						return;
					}
					rule.reloadIntegrationalTests();
					return provider.showEditor(rule);
				}
			)
		);

		config.getContext().subscriptions.push(
			vscode.commands.registerCommand(
				IntegrationTestEditorViewProvider.onTestSelectionChangeCommand, 
				async (test: IntegrationTest) => {
					vscode.commands.executeCommand(IntegrationTestEditorViewProvider.showEditorCommand);
				}
			)
		);
	}

	public static readonly showEditorCommand = "IntegrationTestEditorView.showEditor";
	public async showEditor(rule: Correlation|Enrichment)  {

		if(this._view) {
			this._rule = null;
			this._view.dispose();
		}

		if(!(rule instanceof Correlation || rule instanceof Enrichment)) {
			return;
		}

		this._rule = rule;

		// Создать и показать панель.
		const viewTitle = `Тесты '${this._rule.getName()}'`;
		this._view = vscode.window.createWebviewPanel(
			IntegrationTestEditorViewProvider.viewId,
			viewTitle,
			vscode.ViewColumn.One, 
			{
				retainContextWhenHidden : true,
				enableFindWidget : true
			});

		this._view.onDidDispose( (e: void) => {
			this._view = undefined;
		},
		this);

		this._view.webview.options = {
			enableScripts: true
		};

		this._view.webview.onDidReceiveMessage(
			this.receiveMessageFromWebView,
			this
		);

		await this.updateView();
	}

	private async updateView(focusTestNumber?: number) : Promise<void> {

		// Пользователь уже закрыл вьюшку.
		if(!this._view) {
			return;
		}

		const resoucesUri = this._config.getExtensionUri();
		const extensionBaseUri = this._view.webview.asWebviewUri(resoucesUri);

		const plain = {
			"IntegrationalTests" : [],
			"ExtensionBaseUri" : extensionBaseUri, 
			"RuleName" : this._rule.getName(),
			"ActiveTestNumber" : focusTestNumber == null ? 1 : focusTestNumber,
		};

		try {
			const intergrationalTest = this._rule.getIntegrationTests();

			// Если тестов нет, то создаём пустую форму для первого теста
			if (intergrationalTest.length === 0){
				plain["IntegrationalTests"].push({
					"TestNumber" : 1,
					"RawEvents" : '',
					"NormEvents" : '',
					"TestCode" : `expect 1 {"correlation_name" : "${this._rule.getName()}"}`,
					"TestOutput" : '',
					"JsonedTestObject" : '',
					"TestStatus" : '',
				});
			}
			else{
				intergrationalTest.forEach(it => {
					const jsonedTestObject = JSON.stringify(it);

					const rawEvents = it.getRawEvents();
					const formattedTestCode = TestHelper.formatTestCodeAndEvents(it.getTestCode());
					const formattedNormalizedEvents = TestHelper.formatTestCodeAndEvents(it.getNormalizedEvents());

					let testStatusStyle : string;
					const testStatus = it.getStatus();
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

					plain["IntegrationalTests"].push({
						"TestNumber" : it.getNumber(),
						"RawEvents" : rawEvents,
						"NormEvents" : formattedNormalizedEvents,
						"TestCode" : formattedTestCode,
						"TestOutput" : it.getOutput(),
						"JsonedTestObject" : jsonedTestObject,
						"TestStatus" : testStatusStyle,
					});
				});
			}

			const template = await FileSystemHelper.readContentFile(this._templatePath);
			const formatter = new MustacheFormatter(template);
			const htmlContent = formatter.format(plain);

			this._view.webview.html = htmlContent;
		}
		catch(error) {
			ExtensionHelper.showError("Не удалось открыть интеграционные тесты", error);
		}
	}

	private async receiveMessageFromWebView(message: any) {

		await this.runToolingAction(message);

		// События, не требующие запуска утилит.
		switch (message.command) {
			case 'saveTest': {
				const currTest = IntegrationTest.convertFromObject(message.test);
				try {
					await this.saveTest(message);
				}
				catch(error) {
					ExceptionHelper.show(error, `Не удалось сохранить тест №${currTest}.`);
					return;
				}

				const activeTestNumber = this.getActiveTestNumber(message);
				this.updateView(activeTestNumber);
				return;
			}

			case 'saveAllTests': {
				try {
					// В данном руле сохраняются в памяти нормализованные события.
					this._rule = await this.saveAllTests(message);
					ExtensionHelper.showUserInfo(`Все тесты сохранены`);
				
					// Добавляем в DOM новый тест.
					const activeTestNumber = this.getActiveTestNumber(message);
					this.updateView(activeTestNumber);
				}
				catch(error) {
					ExceptionHelper.show(error, `Не удалось сохранить тест`);
				}
				return;
			}

			case 'addEnvelope': {
				const rawEvents = message?.rawEvents as string;
				const mimeType = message?.mimeType as EventMimeType;
                
                return vscode.window.withProgress({
                    location: vscode.ProgressLocation.Notification,
                    cancellable: false,
                    title: `Идёт добавление конверта на сырые события`
                }, async (progress) => {
                    try {
                        return this.addEnvelope(rawEvents, mimeType);
                    }
                    catch(error) {
                        ExceptionHelper.show(error, "Ошибка добавления конверта на сырые события");
                    }
                });
			}

			case 'cleanTestCode': {
				return this.cleanTestCode(message);
			}
		}
	}

	private async runToolingAction(message : any) {
		// Проверяем, что комманда использует утилиты.
		const commandName = message.command as string;
		if(!['normalize', 'normalizeAndEnrich', 'fastTest', 'fullTest'].includes(commandName)) {
			return;
		}

		if(ExtensionState.get().isToolingExecution()) {
			return ExtensionHelper.showUserError("Дождитесь окончания выполняющихся процессов и повторите.");
		}

		ExtensionState.get().runToolingExecution();

		try {
			switch (message.command) {
				case 'normalize': {
					if(!message.test) {
						ExtensionHelper.showUserInfo("Сохраните тест перед запуском нормализации сырых событий и повторите действие.");
						return;
					}
	
					// Актуализируем сырые события в тесте из вьюшки.
					let rawEvents = message.rawEvents;
					if(!rawEvents) {
						ExtensionHelper.showUserInfo("Не заданы сырые события для нормализации. Задайте события и повторите.");
						return;
					}

					const currTest = IntegrationTest.convertFromObject(message.test);
					rawEvents = TestHelper.compressTestCode(rawEvents);
					currTest.setRawEvents(rawEvents);
					await currTest.save();
	
					await this.normalizeRawEvents(false, currTest);
					break;
				}
				case 'normalizeAndEnrich': {
					if(!message.test) {
						ExtensionHelper.showUserInfo("Сохраните тест перед запуском нормализации сырых событий и повторите действие.");
						return;
					}
	
					// Актуализируем сырые события в тесте из вьюшки.
					const rawEvents = message.rawEvents;
					if(!rawEvents) {
						ExtensionHelper.showUserInfo("Не заданы сырые события для нормализации. Задайте события и повторите.");
						return;
					}

					const currTest = IntegrationTest.convertFromObject(message.test);
					currTest.setRawEvents(rawEvents);
					await currTest.save();

					await this.normalizeRawEvents(true, currTest);
					break;
				}

				case 'fastTest': {
					const newTestCode = await this.generateTestCode(message);
					return this.updateTestCode(newTestCode);
				}

				case 'fullTest': {
					await this.runFullTests(message);

					const activeTestNumber = this.getActiveTestNumber(message);
					await this.updateView(activeTestNumber);
					break;
				}
			}
		}
		catch(error) {
			ExceptionHelper.show(error, "Ошибка запуска.");
		}
		finally {
			ExtensionState.get().stopRoolingExecution();
		}
	}

	private getActiveTestNumber(message : any) : number {
		const activeTestNumberString = message?.activeTestNumber;
		if(!activeTestNumberString) {
			ExtensionHelper.showUserError(`Не задан номер активного теста.`);
			return;
		}

		const activeTestNumber = parseInt(activeTestNumberString);
		return activeTestNumber;
	}

	private async cleanTestCode(message: any) {
		if(!message.test) {
			ExtensionHelper.showUserInfo("Сохраните тест перед запуском нормализации сырых событий и повторите действие.");
			return;
		}
		
		let test: IntegrationTest; 
		try {
			const testCode = message?.testCode;
			if(!testCode) {
				throw new Error("Не удалось получить условия выполнения теста из интерфейса редактирования интеграционных тестов.");
			}

			test = IntegrationTest.convertFromObject(message.test);

			// Обновляем и сохраняем тест.
			const cleanedTestCode = TestHelper.cleanTestCode(testCode);

			this._view.webview.postMessage({
				'command': 'updateTestCode',
				'cleanedTestCode': cleanedTestCode
			});
		}
		catch (error) {
			ExtensionHelper.showError(`Не удалось очистить код теста №${test.getNumber()}`, error);
		}
	}

	public async addEnvelope(rawEvents: string, mimeType: EventMimeType) {
		
		let envelopedRawEventsString : string;
		try {
            const envelopedEvents = await Enveloper.addEnvelope(rawEvents, mimeType);
			envelopedRawEventsString = envelopedEvents.join(IntegrationTestEditorViewProvider.TEXTAREA_END_OF_LINE);
		}
		catch(error) {
			ExceptionHelper.show(error, "Ошибка добавления конверта.");
			return;
		}

		this._view.webview.postMessage({
			'command': 'updateRawEvents',
			'rawEvents': envelopedRawEventsString
		});
	}

	private async normalizeRawEvents(enrich: boolean, test: IntegrationTest) {

		const rawEventsFilePath = test.getRawEventsFilePath();

		vscode.window.withProgress({
			location: vscode.ProgressLocation.Notification,
			cancellable: false
		}, async (progress) => {

			try {
				const siemjManager = new SiemjManager(this._config);
				let normEvents : string;
				if(enrich) {
					progress.report({message: `Нормализация и обогащение сырых событий для теста №${test.getNumber()}`});
					normEvents = await siemjManager.normalizeAndEnrich(this._rule, rawEventsFilePath);
				} else {
					progress.report({message: `Нормализация сырых событий для теста №${test.getNumber()}`});
					normEvents = await siemjManager.normalize(this._rule, rawEventsFilePath);
				}
				
				test.setNormalizedEvents(normEvents);
			}
			catch(error) {
				ExceptionHelper.show(error, "Не удалось нормализовать событие");
				this._config.getOutputChannel().show();
				return;
			}

			// Обновление теста.
			const tests = this._rule.getIntegrationTests();
			const ruleTestIndex = tests.findIndex(it => it.getNumber() == test.getNumber());
			if(ruleTestIndex == -1) {
				ExtensionHelper.showUserError("Не удалось обновить интеграционный тест");
				return;
			}

			// Выводим статус.
			if(enrich) {
				ExtensionHelper.showUserInfo("Нормализация и обогащение сырых событий завершено успешно");
			} else {
				ExtensionHelper.showUserInfo("Нормализация сырых событий завершена успешно");
			}

			// Обновляем правило.
			tests[ruleTestIndex] = test;
			this.updateView(test.getNumber());
		});
	}

	async generateTestCode(message: any) : Promise<string> {

		await VsCodeApiHelper.saveRuleCodeFile(this._rule);

		const currTest = IntegrationTest.convertFromObject(message.test);
		let integrationalTestSimplifiedContent = "";
		let normalizedEvents = "";
		try {
			normalizedEvents = currTest.getNormalizedEvents();
			if(!normalizedEvents) {
				ExtensionHelper.showUserError("Для запуска быстрого теста нужно хотя бы одно нормализованное событие. Нормализуйте сырые события, и повторите действие.");
				return;
			}

			// Временно создать модульный тест путём добавления к интеграционному нормализованного события в конец файла.
			// Убираем фильтр по полям в тесте, так как в модульном тесте нет обогащения, поэтому проверяем только сработку теста.
			const integrationalTestPath = currTest.getTestCodeFilePath();
			const integrationalTestContent = await FileSystemHelper.readContentFile(integrationalTestPath);
			integrationalTestSimplifiedContent = integrationalTestContent.replace(
				RegExpHelper.getExpectSection(), 
				"expect $1 {}");
		}
		catch (error) {
			ExtensionHelper.showError("Не удалось сформировать условия выполнения быстрого теста.", error);
			return;
		}

		return vscode.window.withProgress({
			location: vscode.ProgressLocation.Notification,
			cancellable: false,
			title: `Получение ожидаемого события для теста №${currTest.getNumber()}`
		}, async (progress) => {

			try {
				const modularTestContent = `${integrationalTestSimplifiedContent}\n\n${normalizedEvents}`;

				// Сохраняем модульный тест во временный файл.
				const rootPath = this._config.getRootByPath(currTest.getRuleDirectoryPath());
				const rootFolder = path.basename(rootPath);
				const randTmpPath = this._config.getRandTmpSubDirectoryPath(rootFolder);
				await fs.promises.mkdir(randTmpPath, {recursive: true});
	
				const fastTestFilePath = path.join(randTmpPath, "fast_test.sc");
				await FileSystemHelper.writeContentFile(fastTestFilePath, modularTestContent);
	
				// Создаем временный модульный тест для быстрого тестирования.
				const fastTest = new FastTest(currTest.getNumber());
				fastTest.setTestExpectationPath(fastTestFilePath);
				fastTest.setRule(this._rule);

				const testRunner = this._rule.getUnitTestRunner();
				const resultTest = await testRunner.run(fastTest);

				if (resultTest.getStatus() === TestStatus.Failed) {
					throw new XpException(`Получение ожидаемого события для теста №${resultTest.getNumber()} завершено неуспешно.`);
				}

				// Проверка, что не было ошибки и нам вернулся json.
				const testOutput = resultTest.getOutput();
				try {
					JSON.parse(testOutput);
				}
				catch(error) {
					throw new XpException("Полученный данные не являются событием формата json", error);
				}

				// Получаем имеющийся код теста и заменяем секцию expect {}
				const tests = this._rule.getIntegrationTests();
				const ruleTestIndex = tests.findIndex(it => it.getNumber() == resultTest.getNumber());
				if(ruleTestIndex == -1) {
					throw new XpException("Не удалось получить интеграционный тест.");
				}

				// Переносим данные из быстрого теста в модульный.
				const currentIngTest = tests[ruleTestIndex];

				// Меняем код теста на новый
				const generatedExpectSection = `expect 1 ${testOutput}`;
				const currectTestCode = currentIngTest.getTestCode();
				const newTestCode = currectTestCode.replace(
					RegExpHelper.getExpectSection(),
					generatedExpectSection);

				// Удаляем временные файлы.
				await fs.promises.rmdir(randTmpPath, {recursive : true});

				return newTestCode;
			} 
			catch(error) {
				ExceptionHelper.show(error, 'Не удалось получить ожидаемое событие');
			}
		});
	}

	private async runFullTests(message: any) : Promise<boolean> {

		return vscode.window.withProgress({
			location: vscode.ProgressLocation.Notification,
			cancellable: true,
		}, async (progress, token: vscode.CancellationToken) => {

			await VsCodeApiHelper.saveRuleCodeFile(this._rule);

			let tests : IntegrationTest [] = [];
			try {
				// Сохраняем активные тесты.
				const rule = await TestHelper.saveAllTest(message, this._rule);
				tests = rule.getIntegrationTests();
			}
			catch(error) {
				ExceptionHelper.show(error, `Не удалось сохранить тесты`);
				return false;
			}

			if(tests.length == 0) {
				vscode.window.showInformationMessage(`Тесты для правила '${this._rule.getName()}' не найдены. Добавьте хотя бы один тест и повторите.`);
				return false;
			}

			try {
				// Уточняем информацию для пользователей если в правиле обнаружено использование сабрулей.
				const ruleCode = await this._rule.getRuleCode();
				if(TestHelper.isRuleCodeContainsSubrules(ruleCode)) {
					progress.report({
						message : `Интеграционные тесты для правила с сабрулями '${this._rule.getName()}'`
					});
				} else {
					progress.report({
						message : `Интеграционные тесты для правила '${this._rule.getName()}'`
					});
				}

				const outputParser = new SiemJOutputParser();
				const testRunner = new IntegrationTestRunner(this._config, outputParser, token);
				const siemjResult = await testRunner.run(this._rule);

				this._config.getDiagnosticCollection().clear();
				for (const diagnostic of siemjResult.fileDiagnostics) {
					this._config.getDiagnosticCollection().set(diagnostic.uri, diagnostic.diagnostics);
				}

				const executedIntegrationTests = this._rule.getIntegrationTests();
				if(executedIntegrationTests.every(it => it.getStatus() === TestStatus.Success)) {
					ExtensionHelper.showUserInfo(`Интеграционные тесты прошли успешно.`);
				} else {
					ExtensionHelper.showUserInfo(`Не все тесты были пройдены.`);
				}
			}
			catch(error) {
				ExceptionHelper.show(error, `Ошибка запуска тестов`);
			}
		});
	}

	async saveTest(message: any) : Promise<IntegrationTest> {
		// Обновляем и сохраняем тест.
		const test = await TestHelper.saveIntegrationTest(this._rule, message);
		ExtensionHelper.showUserInfo(`Тест №${test.getNumber()} сохранен.`);
		return test;
	}

	async saveAllTests(message: any) : Promise<RuleBaseItem> {

		// Номер активного теста.
		const activeTestNumberString = message?.activeTestNumber;
		if(!activeTestNumberString) {
			throw new XpException(`Не задан номер активного теста.`);
		}

		return TestHelper.saveAllTest(message, this._rule);
	}

	private async updateTestCode(newTestCode : string, testNumber? : number) { 
		return this._view.webview.postMessage({
			'command': 'updateTestCode',
			'newTestCode': newTestCode,
			'testNumber': testNumber
		});
	}

	public static TEXTAREA_END_OF_LINE = "\n";
}
