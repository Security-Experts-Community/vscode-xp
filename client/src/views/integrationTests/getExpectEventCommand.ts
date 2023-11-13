import * as vscode from 'vscode';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';

import { Command, CommandParams } from '../command';
import { DialogHelper } from '../../helpers/dialogHelper';
import { FileSystemHelper } from '../../helpers/fileSystemHelper';
import { RegExpHelper } from '../../helpers/regExpHelper';
import { TestHelper } from '../../helpers/testHelper';
import { XpException } from '../../models/xpException';
import { FileSystemException } from '../../models/fileSystemException';
import { ExceptionHelper } from '../../helpers/exceptionHelper';
import { FastTest } from '../../models/tests/fastTest';
import { VsCodeApiHelper } from '../../helpers/vsCodeApiHelper';
import { IntegrationTest } from '../../models/tests/integrationTest';
import { TestStatus } from '../../models/tests/testStatus';
import { IntegrationTestEditorViewProvider } from './integrationTestEditorViewProvider';
import { JsHelper } from '../../helpers/jsHelper';

export interface GetExpectedEventParams extends CommandParams {
	test: IntegrationTest;
}

// TODO: вынести под общий интерфейс провайдеров
export class GetExpectedEventCommand  {
	constructor(private params: GetExpectedEventParams) {}
	
	public async execute(viewProvider: IntegrationTestEditorViewProvider) : Promise<boolean> {
		const testWithNewTestCode = await this.generateTestCode();

		if(testWithNewTestCode) {
			await viewProvider.updateTestCode(
				this.params.test.getTestCode(),
				// TODO: добавить конкретный тест для обновления, иначе может быть обновлён не тот тест.
				// testWithNewTestCode.getNumber()
			);
		}

		DialogHelper.showInfo("Ожидаемое событие в коде теста успешно обновлено. Скорректируйте если необходимо и сохраните тест");
		return true;
	}

	private async generateTestCode(): Promise<string> {

		// Если правило содержит сабрули, то мы сейчас не сможем просто получить ожидаемое событие.
		const ruleCode = await this.params.rule.getRuleCode();

		let newExpectedEvent: string;
		if (TestHelper.isRuleCodeContainsSubrules(ruleCode)) {
			newExpectedEvent = await this.getExpectedEventForRuleWithSubrules();
		} else {
			newExpectedEvent = await this.getExpectedEventForRuleWithoutSubrules();
		}

		// Очищаем код от технических полей, форматируем и заменяем код теста на новый.
		newExpectedEvent = TestHelper.cleanSortFormatExpectedEventTestCode(newExpectedEvent);
		const newTestCode = `expect 1 ${newExpectedEvent}`;
		const currentTestCode = this.params.test.getTestCode();
		const resultTestCode = currentTestCode.replace(
			RegExpHelper.getExpectSectionRegExp(),
			newTestCode);

		this.params.test.setTestCode(resultTestCode);
		return newExpectedEvent;
	}

	private async getExpectedEventForRuleWithoutSubrules() {
		let integrationTestSimplifiedContent = "";
		let normalizedEvents = "";
		try {
			normalizedEvents = this.params.test.getNormalizedEvents();
			if(!normalizedEvents) {
				DialogHelper.showError("Для запуска быстрого теста нужно хотя бы одно нормализованное событие. Нормализуйте сырые события и повторите действие.");
				return;
			}

			// Временно создать модульный тест путём добавления к интеграционному нормализованного события в конец файла.
			// Убираем фильтр по полям в тесте, так как в модульном тесте нет обогащения, поэтому проверяем только сработку теста.
			const integrationTestPath = this.params.test.getTestCodeFilePath();
			const integrationTestContent = await FileSystemHelper.readContentFile(integrationTestPath);

			// Проверку на наличие expect not {} в тесте, в этом случае невозможно получить ожидаемое событие.
			if(TestHelper.isNegativeTest(integrationTestContent)) {
				DialogHelper.showWarning("Невозможно получить ожидаемого события для теста с кодом expect not {}. Скорректируйте код теста если это необходимо, сохраните его и повторите.");
				return;
			}
			integrationTestSimplifiedContent = integrationTestContent.replace(
				RegExpHelper.getExpectSectionRegExp(),
				"expect $1 {}");
		}
		catch (error) {
			DialogHelper.showError("Не удалось сформировать условия получения ожидаемого события", error);
			return;
		}

		return vscode.window.withProgress({
			location: vscode.ProgressLocation.Notification,
			cancellable: false,
			title: `Получение ожидаемого события для теста №${this.params.test.getNumber()}`
		}, async (progress) => {

			try {
				const modularTestContent = `${integrationTestSimplifiedContent}\n\n${normalizedEvents}`;

				// Сохраняем модульный тест во временный файл.
				const rootPath = this.params.config.getRootByPath(this.params.test.getRuleDirectoryPath());
				const rootFolder = path.basename(rootPath);
				const randTmpPath = this.params.config.getRandTmpSubDirectoryPath(rootFolder);
				await fs.promises.mkdir(randTmpPath, { recursive: true });

				const fastTestFilePath = path.join(randTmpPath, GetExpectedEventCommand.EXPECT_EVENT_FILENAME);
				await FileSystemHelper.writeContentFile(fastTestFilePath, modularTestContent);

				// Создаем временный модульный тест для быстрого тестирования.
				const fastTest = new FastTest(this.params.test.getNumber());
				fastTest.setTestExpectationPath(fastTestFilePath);
				fastTest.setRule(this.params.rule);

				// Специальный тест быстрого теста.
				const testRunner = this.params.rule.getUnitTestRunner();
				const resultTest = await testRunner.run(fastTest);

				if (resultTest.getStatus() === TestStatus.Failed) {
					throw new XpException(
						`Получение ожидаемого события для теста №${resultTest.getNumber()} завершено неуспешно. Возможно интеграционный тест не проходит с условием expect 1 {"correlation_name": "${this.params.rule.getName()}"}. Добейтесь того чтобы данный тест проходил и повторите.`);
				}

				// Проверка, что не было ошибки и нам вернулся json, исключение поля time и форматируем.
				let testOutput = resultTest.getOutput();
				try {
					let testObject = JSON.parse(testOutput);
					testObject = TestHelper.removeKeys(testObject, ["time"]);
					testOutput = JSON.stringify(testObject, null, 4);
				}
				catch(error) {
					throw new XpException("Полученные данные не являются событием формата json", error);
				}

				// Получаем имеющийся код теста и заменяем секцию expect {}
				const tests = this.params.rule.getIntegrationTests();
				const ruleTestIndex = tests.findIndex(it => it.getNumber() == resultTest.getNumber());
				if (ruleTestIndex == -1) {
					throw new XpException("Не удалось получить интеграционный тест");
				}

				// Удаляем временные файлы.
				await fs.promises.rmdir(randTmpPath, { recursive: true });
				return testOutput;
			}
			catch (error) {
				ExceptionHelper.show(error, 'Не удалось получить ожидаемое событие');
			}
		});
	}

	private async getExpectedEventForRuleWithSubrules(): Promise<string> {
		const ruleName = this.params.rule.getName();
		
		// Получаем ожидаемое событие до обогащения
		const actualEventsFilePath = TestHelper.getExpectedEventEventFilePath(
			this.params.tmpDirPath,
			ruleName,
			this.params.test.getNumber());
			
		if(!actualEventsFilePath) {
			throw new XpException(`Результаты интеграционного теста №${this.params.test.getNumber()} правила ${ruleName} не найдены`);
		}

		if(!fs.existsSync(actualEventsFilePath)) {
			throw new FileSystemException(`Файл результатов тестов ${actualEventsFilePath} не найден`, actualEventsFilePath);
		}

		// Событие может прилетать не одно
		const actualEventsString = await FileSystemHelper.readContentFile(actualEventsFilePath);
		if(!actualEventsString) {
			throw new XpException(`Фактическое событий интеграционного теста №${this.params.test.getNumber()} правила ${ruleName} пусто`);
		}

		const actualEvents = actualEventsString.split(os.EOL).filter(l => l);

		// Отбираем ожидаемое событие по имени правила, так как сюда могут попасть сабрули.
		const expectedFilteredEvents = TestHelper.filterCorrelationEvents(actualEvents, ruleName);
		if(expectedFilteredEvents.length === 0) {
			DialogHelper.showError("Не найдено результирующих событий после интеграционного теста. Возможно тест не прошёл или он не подразумевание получение результирующего события")
			return;
		}

		if(expectedFilteredEvents.length != 1) {
			DialogHelper.showError(`Предполагается одно ожидаемое событие, но было получено ${expectedFilteredEvents.length}`)
			return;
		}

		return expectedFilteredEvents[0];
	}

	public static EXPECT_EVENT_FILENAME = "expected_event_test.sc";
}