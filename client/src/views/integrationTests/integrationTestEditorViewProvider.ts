import * as fs from 'fs';
import * as vscode from 'vscode';
import * as path from 'path';

import { DialogHelper } from '../../helpers/dialogHelper';
import { MustacheFormatter } from '../mustacheFormatter';
import { EventMimeType as EventMimeType, TestHelper } from '../../helpers/testHelper';
import { IntegrationTest } from '../../models/tests/integrationTest';
import { Correlation } from '../../models/content/correlation';
import { Enrichment } from '../../models/content/enrichment';
import { RuleBaseItem } from '../../models/content/ruleBaseItem';
import { Configuration } from '../../models/configuration';
import { SiemjManager } from '../../models/siemj/siemjManager';
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
import { RunIntegrationTestDialog } from '../runIntegrationDialog';
import { Log } from '../../extension';

export class IntegrationTestEditorViewProvider {

	public static readonly viewId = 'IntegrationTestEditorView';
	public static readonly onTestSelectionChangeCommand = "IntegrationTestEditorView.onTestSelectionChange";

	private _view?: vscode.WebviewPanel;
	private _rule: RuleBaseItem;

	public constructor(
		private readonly _config: Configuration,
		private readonly _templatePath: string) {
	}

	public static init(config: Configuration) {

		// Форма создания визуализации интеграционных тестов.
		const templatePath = path.join(
			config.getExtensionPath(),
			path.join("client", "templates", "IntegrationTestEditor.html")
		);

		const provider = new IntegrationTestEditorViewProvider(config, templatePath);

		// Открытие формы тестов.
		config.getContext().subscriptions.push(
			vscode.commands.registerCommand(
				IntegrationTestEditorViewProvider.showEditorCommand,
				async (rule: Correlation | Enrichment) => {
					// Обновляем интеграционные тесты для того, чтобы можно было увидеть актуальные тесты при их модификации на ЖД.
					if (!rule) {
						DialogHelper.showError("Правило еще не успело загрузится. Повторите еще раз");
						return;
					}
					rule.reloadIntegrationTests();
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
	public async showEditor(rule: Correlation | Enrichment) {

		Log.info(`Редактор интеграционных тестов открыт для правила ${rule.getName()} с помощью команды ${IntegrationTestEditorViewProvider.showEditorCommand}`);

		if (this._view) {
			Log.info(`Открытый ранее редактор интеграционных тестов для правила ${this._rule.getName()} был автоматически закрыт`);

			this._rule = null;
			this._view.dispose();
		}

		if (!(rule instanceof Correlation || rule instanceof Enrichment)) {
			return DialogHelper.showWarning(`Редактор интеграционных тестов не поддерживает правил кроме корреляций и обогащений`);
		}

		this._rule = rule;

		// Создать и показать панель.
		const viewTitle = `Тесты '${this._rule.getName()}'`;
		this._view = vscode.window.createWebviewPanel(
			IntegrationTestEditorViewProvider.viewId,
			viewTitle,
			vscode.ViewColumn.One,
			{
				retainContextWhenHidden: true,
				enableFindWidget: true
			});

		// Создаем временную директорию для результатов тестов, которая посмотреть почему не прошли тесты.
		this._integrationTestTmpFilesPath = this._config.getRandTmpSubDirectoryPath();

		this._view.onDidDispose(async (e: void) => {
				this._view = undefined;
				await this.clearTestTmpDir();
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

	/**
	 * Удаляет директорию в с временными файлами интеграционных тестов, который нужны для выявления ошибок в тестах.
	 */
	private async clearTestTmpDir() {
		try {
			if(fs.existsSync(this._integrationTestTmpFilesPath)) {
				await fs.promises.rmdir(this._integrationTestTmpFilesPath, {recursive: true});
			}
		}
		catch(error) {
			Log.warn(`Не удалось удалить директорию временных файлов интеграционных тестов ${this._integrationTestTmpFilesPath}`);
		}
	}

	private async updateView(focusTestNumber?: number): Promise<void> {

		// Пользователь уже закрыл вьюшку.
		if (!this._view) {
			return;
		}

		const resultFocusTestNumber = focusTestNumber ?? 1;
		Log.info(`WebView ${IntegrationTestEditorViewProvider.name} была обновлена. Выбранный тест ${resultFocusTestNumber ?? "1"}`);

		const resourcesUri = this._config.getExtensionUri();
		const extensionBaseUri = this._view.webview.asWebviewUri(resourcesUri);

		const plain = {
			"IntegrationTests": [],
			"ExtensionBaseUri": extensionBaseUri,
			"RuleName": this._rule.getName(),
			"ActiveTestNumber": resultFocusTestNumber,
		};

		try {
			const integrationTest = this._rule.getIntegrationTests();

			// Если тестов нет, то создаём пустую форму для первого теста
			if (integrationTest.length === 0) {
				plain["IntegrationTests"].push({
					"TestNumber": 1,
					"RawEvents": '',
					"NormEvents": '',
					"TestCode": `expect 1 {"correlation_name" : "${this._rule.getName()}"}`,
					"TestOutput": '',
					"JsonedTestObject": '',
					"TestStatus": '',
				});
			}
			else {
				integrationTest.forEach(it => {
					const jsonedTestObject = JSON.stringify(it);

					const rawEvents = it.getRawEvents();
					const formattedTestCode = TestHelper.formatTestCodeAndEvents(it.getTestCode());
					const formattedNormalizedEvents = TestHelper.formatTestCodeAndEvents(it.getNormalizedEvents());

					let isFailed = false;
					let testStatusStyle: string;
					const testStatus = it.getStatus();
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
							isFailed = true;
							break;
						}
					}
				
					plain["IntegrationTests"].push({
						"TestNumber": it.getNumber(),
						"RawEvents": rawEvents,
						"NormEvents": formattedNormalizedEvents,
						"TestCode": formattedTestCode,
						"TestOutput": it.getOutput(),
						"JsonedTestObject": jsonedTestObject,
						"TestStatus": testStatusStyle,
						"IsFailed" : isFailed
					});
				});
			}

			const template = await FileSystemHelper.readContentFile(this._templatePath);
			const formatter = new MustacheFormatter(template);
			const htmlContent = formatter.format(plain);

			this._view.webview.html = htmlContent;
		}
		catch (error) {
			DialogHelper.showError("Не удалось открыть интеграционные тесты", error);
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
				catch (error) {
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
					DialogHelper.showInfo(`Все тесты сохранены`);

					// Добавляем в DOM новый тест.
					const activeTestNumber = this.getActiveTestNumber(message);
					this.updateView(activeTestNumber);
				}
				catch (error) {
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
					catch (error) {
						ExceptionHelper.show(error, "Ошибка добавления конверта на сырые события");
					}
				});
			}

			case 'lastTest': {
				this.lastTest();
				return;
			}

			case 'cleanTestCode': {
				return this.cleanTestCode(message);
			}

			case 'openResultDiff': {
				if(!message.activeTestNumber) {
					DialogHelper.showError('Номер теста не передан в запросе на back-end');
					return;
				}
				const activeTestNumber = parseInt(message.activeTestNumber);
				return this.showTestResultDiff(activeTestNumber);
			}
		}
	}

	private lastTest() {
		DialogHelper.showWarning('Последний тест нельзя удалить, он будет использован как шаблон для создания новых тестов');
	}

	private async runToolingAction(message: any) {
		// Проверяем, что команда использует утилиты.
		const commandName = message.command as string;
		if (!['normalize', 'normalizeAndEnrich', 'fastTest', 'fullTest'].includes(commandName)) {
			return;
		}

		if (ExtensionState.get().isToolingExecution()) {
			return DialogHelper.showError("Дождитесь окончания выполняющихся процессов и повторите.");
		}

		ExtensionState.get().runToolingExecution();

		try {
			switch (message.command) {
				case 'normalize': {
					if (!message.test) {
						DialogHelper.showInfo("Сохраните тест перед запуском нормализации сырых событий и повторите действие");
						return;
					}

					// Актуализируем сырые события в тесте из вьюшки.
					let rawEvents = message.rawEvents;
					if (!rawEvents) {
						DialogHelper.showInfo("Не заданы сырые события для нормализации. Задайте события и повторите");
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
					if (!message.test) {
						DialogHelper.showInfo("Сохраните тест перед запуском нормализации сырых событий и повторите действие");
						return;
					}

					// Актуализируем сырые события в тесте из вьюшки.
					const rawEvents = message.rawEvents;
					if (!rawEvents) {
						DialogHelper.showInfo("Не заданы сырые события для нормализации. Задайте события и повторите");
						return;
					}

					const currTest = IntegrationTest.convertFromObject(message.test);
					currTest.setRawEvents(rawEvents);
					await currTest.save();

					await this.normalizeRawEvents(true, currTest);
					break;
				}

				case 'fastTest': {
					const testWithNewTestCode = await this.generateTestCode(message);
					if(testWithNewTestCode) {
						return this.updateTestCode(
							testWithNewTestCode.getTestCode(),
							// TODO: добавить конкретный тест для обновления, иначе может быть обновлён не тот тест.
							// testWithNewTestCode.getNumber()
						);
					}
					return;
				}

				case 'fullTest': {
					// webView надо обновлять только если промис runFullTests вернет true
					// В противной ситуации - вьюшка ведет себя непредсказуемо из-за eventLoop
					const shouldUpdateViewAfterTestsRunned = await this.runFullTests(message);
					if (shouldUpdateViewAfterTestsRunned) {
						await this.updateView(this.getActiveTestNumber(message));
					}
					break;
				}
			}
		}
		catch (error) {
			ExceptionHelper.show(error, "Ошибка запуска.");
		}
		finally {
			ExtensionState.get().stopRoolingExecution();
		}
	}

	private getActiveTestNumber(message: any): number {
		const activeTestNumberString = message?.activeTestNumber;
		if (!activeTestNumberString) {
			DialogHelper.showError(`Не задан номер активного теста.`);
			return;
		}

		const activeTestNumber = parseInt(activeTestNumberString);
		return activeTestNumber;
	}

	private async cleanTestCode(message: any) {
		if (!message.test) {
			DialogHelper.showInfo("Сохраните тест перед запуском нормализации сырых событий и повторите действие.");
			return;
		}

		let test: IntegrationTest;
		try {
			const testCode = message?.testCode;
			if (!testCode) {
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
			DialogHelper.showError(`Не удалось очистить код теста №${test.getNumber()}`, error);
		}
	}

	public async addEnvelope(rawEvents: string, mimeType: EventMimeType) {

		let envelopedRawEventsString: string;
		try {
			const envelopedEvents = await Enveloper.addEnvelope(rawEvents, mimeType);
			envelopedRawEventsString = envelopedEvents.join(IntegrationTestEditorViewProvider.TEXTAREA_END_OF_LINE);
		}
		catch (error) {
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
				let normEvents: string;
				if (enrich) {
					progress.report({ message: `Нормализация и обогащение сырых событий для теста №${test.getNumber()}` });
					normEvents = await siemjManager.normalizeAndEnrich(this._rule, rawEventsFilePath);
				} else {
					progress.report({ message: `Нормализация сырых событий для теста №${test.getNumber()}` });
					normEvents = await siemjManager.normalize(this._rule, rawEventsFilePath);
				}

				test.setNormalizedEvents(normEvents);
			}
			catch (error) {
				ExceptionHelper.show(error, "Не удалось нормализовать событие");
				this._config.getOutputChannel().show();
				return;
			}

			// Обновление теста.
			const tests = this._rule.getIntegrationTests();
			const ruleTestIndex = tests.findIndex(it => it.getNumber() == test.getNumber());
			if (ruleTestIndex == -1) {
				DialogHelper.showError("Не удалось обновить интеграционный тест");
				return;
			}

			// Выводим статус.
			if (enrich) {
				DialogHelper.showInfo("Нормализация и обогащение сырых событий завершено успешно");
			} else {
				DialogHelper.showInfo("Нормализация сырых событий завершена успешно");
			}

			// Обновляем правило.
			tests[ruleTestIndex] = test;
			this.updateView(test.getNumber());
		});
	}

	async generateTestCode(message: any): Promise<IntegrationTest> {

		await VsCodeApiHelper.saveRuleCodeFile(this._rule);

		// Если правило содержит сабрули, то мы сейчас не сможем просто получить ожидаемое событие.
		const ruleCode = await this._rule.getRuleCode();
		if (TestHelper.isRuleCodeContainsSubrules(ruleCode)) {
			throw new XpException("Получение ожидаемого события для правил с использованием сабрулей (например, correlation_name = \"subrule_...\") еще не реализовано. Детали можно посмотреть [тут](https://github.com/Security-Experts-Community/vscode-xp/issues/133)");
		}

		const currTest = IntegrationTest.convertFromObject(message.test);
		let integrationTestSimplifiedContent = "";
		let normalizedEvents = "";
		try {
			normalizedEvents = currTest.getNormalizedEvents();
			if(!normalizedEvents) {
				DialogHelper.showError("Для запуска быстрого теста нужно хотя бы одно нормализованное событие. Нормализуйте сырые события и повторите действие.");
				return;
			}

			// Временно создать модульный тест путём добавления к интеграционному нормализованного события в конец файла.
			// Убираем фильтр по полям в тесте, так как в модульном тесте нет обогащения, поэтому проверяем только сработку теста.
			const integrationTestPath = currTest.getTestCodeFilePath();
			const integrationTestContent = await FileSystemHelper.readContentFile(integrationTestPath);

			// Проверку на наличие expect not {} в тесте, в этом случае невозможно получить ожидаемое событие.
			if(/expect\s+not\s+/gm.test(integrationTestContent)) {
				DialogHelper.showWarning("Невозможно получить ожидаемого события для теста с кодом expect not {}. Скорректируйте код теста если это необходимо, сохраните его и повторите.");
				return;
			}
			integrationTestSimplifiedContent = integrationTestContent.replace(
				RegExpHelper.getExpectSectionRegExp(),
				"expect $1 {}");
		}
		catch (error) {
			DialogHelper.showError("Не удалось сформировать условия выполнения быстрого теста.", error);
			return;
		}

		return vscode.window.withProgress({
			location: vscode.ProgressLocation.Notification,
			cancellable: false,
			title: `Получение ожидаемого события для теста №${currTest.getNumber()}`
		}, async (progress) => {

			try {
				const modularTestContent = `${integrationTestSimplifiedContent}\n\n${normalizedEvents}`;

				// Сохраняем модульный тест во временный файл.
				const rootPath = this._config.getRootByPath(currTest.getRuleDirectoryPath());
				const rootFolder = path.basename(rootPath);
				const randTmpPath = this._config.getRandTmpSubDirectoryPath(rootFolder);
				await fs.promises.mkdir(randTmpPath, { recursive: true });

				const fastTestFilePath = path.join(randTmpPath, "fast_test.sc");
				await FileSystemHelper.writeContentFile(fastTestFilePath, modularTestContent);

				// Создаем временный модульный тест для быстрого тестирования.
				const fastTest = new FastTest(currTest.getNumber());
				fastTest.setTestExpectationPath(fastTestFilePath);
				fastTest.setRule(this._rule);

				// Специальный тест быстрого теста.
				const testRunner = this._rule.getUnitTestRunner();
				const resultTest = await testRunner.run(fastTest);

				if (resultTest.getStatus() === TestStatus.Failed) {
					throw new XpException(`Получение ожидаемого события для теста №${resultTest.getNumber()} завершено неуспешно. Возможно интеграционный тест не проходит с условием expect 1 {"correlation_name": "${this._rule.getName()}"}. Добейтесь того чтобы данный тест проходил и повторите.`);
				}

				// Проверка, что не было ошибки и нам вернулся json.
				const testOutput = resultTest.getOutput();
				try {
					JSON.parse(testOutput);
				}
				catch(error) {
					throw new XpException("Полученные данные не являются событием формата json", error);
				}

				// Получаем имеющийся код теста и заменяем секцию expect {}
				const tests = this._rule.getIntegrationTests();
				const ruleTestIndex = tests.findIndex(it => it.getNumber() == resultTest.getNumber());
				if (ruleTestIndex == -1) {
					throw new XpException("Не удалось получить интеграционный тест.");
				}

				// Переносим данные из быстрого теста в модульный.
				const currentIngTest = tests[ruleTestIndex];

				// Меняем код теста на новый
				const generatedExpectSection = `expect 1 ${testOutput}`;
				const currentTestCode = currentIngTest.getTestCode();
				const newTestCode = currentTestCode.replace(
					RegExpHelper.getExpectSectionRegExp(),
					generatedExpectSection);

				// Удаляем временные файлы.
				await fs.promises.rmdir(randTmpPath, { recursive: true });

				// Обновляем код теста.
				currTest.setTestCode(newTestCode);
				
				DialogHelper.showInfo("Ожидаемое событие в коде теста успешно обновлено. Сохраните тест если результат вас устраивает.");
				return currTest;
			}
			catch (error) {
				ExceptionHelper.show(error, 'Не удалось получить ожидаемое событие');
			}
		});
	}

	private async runFullTests(message: any): Promise<boolean> {

		return vscode.window.withProgress({
			location: vscode.ProgressLocation.Notification,
			cancellable: true,
		}, async (progress, cancellationToken: vscode.CancellationToken) => {

			await VsCodeApiHelper.saveRuleCodeFile(this._rule);

			let tests: IntegrationTest[] = [];
			try {
				// Сохраняем активные тесты.
				const rule = await TestHelper.saveAllTest(message, this._rule);
				tests = rule.getIntegrationTests();
			}
			catch (error) {
				ExceptionHelper.show(error, `Не удалось сохранить тесты`);
				return false;
			}

			if (tests.length == 0) {
				DialogHelper.showInfo(`Тесты для правила '${this._rule.getName()}' не найдены. Добавьте хотя бы один тест и повторите.`);
				return false;
			}

			try {
				// Уточняем информацию для пользователей если в правиле обнаружено использование сабрулей.
				const ruleCode = await this._rule.getRuleCode();
				if (TestHelper.isRuleCodeContainsSubrules(ruleCode)) {
					progress.report({
						message: `Интеграционные тесты для правила с сабрулями '${this._rule.getName()}'`
					});
				} else {
					progress.report({
						message: `Интеграционные тесты для правила '${this._rule.getName()}'`
					});
				}

				const ritd = new RunIntegrationTestDialog(this._config, this._integrationTestTmpFilesPath);
				const testRunnerOptions = await ritd.getIntegrationTestRunOptions(this._rule);
				testRunnerOptions.cancellationToken = cancellationToken;

				const outputParser = new SiemJOutputParser();
				const testRunner = new IntegrationTestRunner(this._config, outputParser);
				const siemjResult = await testRunner.run(this._rule, testRunnerOptions);

				this._config.resetDiagnostics(siemjResult.fileDiagnostics);

				const executedIntegrationTests = this._rule.getIntegrationTests();
				if(executedIntegrationTests.every(it => it.getStatus() === TestStatus.Success)) {
					DialogHelper.showInfo(`Интеграционные тесты правила '${this._rule.getName()}' прошли успешно`);
					// Если тесты прошли, значит временные файлы не нужны.
					await this.clearTestTmpDir();
					return true;
				} 

				if(executedIntegrationTests.some(it => it.getStatus() === TestStatus.Success)) {
					DialogHelper.showInfo(`Не все тесты правила '${this._rule.getName()}' прошли успешно`);
					return true;
				} 

				vscode.window.showErrorMessage(`Все тесты не были пройдены. Проверьте наличие синтаксических ошибок в коде правила или его зависимостях`);
			}
			catch (error) {
				ExceptionHelper.show(error, `Ошибка запуска тестов`);
			}

			return true;
		});
	}

	private async showTestResultDiff(testNumber: number) {
		// Получаем фактическое событие.
		const actualEventsFilePath = TestHelper.getTestActualEventsFilePath(this._integrationTestTmpFilesPath, testNumber);
		if(!actualEventsFilePath) {
			DialogHelper.showError(`Результаты интеграционного теста №${testNumber} правила ${this._rule.getName()} не найдены`);
			return;
		}

		const actualEvent = await FileSystemHelper.readContentFile(actualEventsFilePath);
		if(!actualEvent) {
			DialogHelper.showError(`Фактическое событий интеграционного теста №${testNumber} правила ${this._rule.getName()} пусто`);
			return;
		}

		const clearedActualEvent = TestHelper.cleanTestCode(actualEvent.trim());
		const formattedActualEvent = TestHelper.formatTestCodeAndEvents(clearedActualEvent);

		// Записываем очищенное фактическое значение файл для последующего сравнения
		const actualEventTestFilePath = path.join(this._integrationTestTmpFilesPath, `actualEvents${testNumber}.json`);
		await FileSystemHelper.writeContentFile(actualEventTestFilePath, formattedActualEvent);

		// Получаем ожидаемое событие.
		const tests = this._rule.getIntegrationTests();
		if(tests.length < testNumber) {
			DialogHelper.showError(`Запрашиваемый интеграционный тест №${testNumber} правила ${this._rule.getName()} не найден`);
			return;
		}

		const testIndex = testNumber - 1;
		const test = tests[testIndex];

		const testCode = test.getTestCode();
		const expectedEvent = RegExpHelper.getSingleExpectEvent(testCode);
		if(!expectedEvent) {
			DialogHelper.showError(`Ожидаемое событий интеграционного теста №${testNumber} правила ${this._rule.getName()} пусто`);
			return;
		}
		const formattedExpectedEvent = TestHelper.formatTestCodeAndEvents(expectedEvent.trim());

		// Записываем ожидаемое фактическое значение файл для последующего сравнения
		const expectedEventTestFilePath = path.join(this._integrationTestTmpFilesPath, `expectedEvents${testNumber}.json`);
		await FileSystemHelper.writeContentFile(expectedEventTestFilePath, formattedExpectedEvent);

		vscode.commands.executeCommand("vscode.diff", 
			vscode.Uri.file(actualEventTestFilePath),
			vscode.Uri.file(expectedEventTestFilePath),
			`Фактическое и ожидаемое события теста №${testNumber}`
		);
	}


	async saveTest(message: any): Promise<IntegrationTest> {
		// Обновляем и сохраняем тест.
		const test = await TestHelper.saveIntegrationTest(this._rule, message);
		DialogHelper.showInfo(`Тест №${test.getNumber()} сохранен.`);
		return test;
	}

	async saveAllTests(message: any): Promise<RuleBaseItem> {

		// Номер активного теста.
		const activeTestNumberString = message?.activeTestNumber;
		if (!activeTestNumberString) {
			throw new XpException(`Не задан номер активного теста.`);
		}

		return TestHelper.saveAllTest(message, this._rule);
	}

	private async updateTestCode(newTestCode: string, testNumber?: number) {
		return this._view.webview.postMessage({
			'command': 'updateTestCode',
			'newTestCode': newTestCode,
			'testNumber': testNumber
		});
	}

	private _integrationTestTmpFilesPath: string;

	public static TEXTAREA_END_OF_LINE = "\n";

	public ALL_PACKAGES = "Все пакеты";
	public CURRENT_PACKAGE = "Текущий пакет"
}
