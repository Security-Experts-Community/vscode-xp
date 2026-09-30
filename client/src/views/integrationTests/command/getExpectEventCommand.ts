import * as vscode from 'vscode';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';

import { IntegrationTestParams } from '../../../models/command/command';
import { DialogHelper } from '../../../helpers/dialogHelper';
import { FileSystemHelper } from '../../../helpers/fileSystemHelper';
import { RegExpHelper } from '../../../helpers/regExpHelper';
import { TestHelper } from '../../../helpers/testHelper';
import { XpException } from '../../../models/xpException';
import { FileSystemException } from '../../../models/fileSystemException';
import { FastTest } from '../../../models/tests/fastTest';
import { TestStatus } from '../../../models/tests/testStatus';
import { IntegrationTestEditorViewProvider } from '../integrationTestEditorViewProvider';
import { JsHelper } from '../../../helpers/jsHelper';
import { Correlation } from '../../../models/content/correlation';
import { Enrichment } from '../../../models/content/enrichment';

/**
 * Ожидаемое событие и число его сработок для секции expect.
 */
interface ExpectedEvent {
  event: string;
  eventsCount: number;
}

// TODO: вынести под общий интерфейс провайдеров
export class GetExpectedEventCommand {
  constructor(private params: IntegrationTestParams) {}

  public async execute(
    viewProvider: IntegrationTestEditorViewProvider,
    testNumber: number
  ): Promise<boolean> {
    const testWithNewTestCode = await this.generateTestCode();
    if (!testWithNewTestCode) {
      return false;
    }

    await viewProvider.updateTestCode(this.params.test.getTestCode(), testNumber);

    DialogHelper.showInfo(
      this.params.config.getMessage(
        'View.IntegrationTests.Message.ExpectedEventWasSuccessfullyUpdated'
      )
    );
    return true;
  }

  private async generateTestCode(): Promise<string> {
    // Если правило содержит сабрули, то мы сейчас не сможем просто получить ожидаемое событие.
    const ruleCode = await this.params.rule.getRuleCode();

    let expectedEvent: ExpectedEvent;
    if (
      TestHelper.isRuleCodeContainsSubrules(ruleCode) ||
      !this.params.test.getNormalizedEvents()
    ) {
      expectedEvent = await this.getExpectedEventForIntegrationTestResult();
    } else {
      expectedEvent = { event: await this.getExpectedEventFromEcatest(), eventsCount: 1 };
    }

    if (!expectedEvent?.event) {
      return;
    }

    // Очищаем код от технических полей, форматируем и заменяем код теста на новый с сохранением комментариев.
    const newExpectedEvent = TestHelper.cleanSortFormatExpectedEventTestCode(expectedEvent.event);
    const newTestCode = `expect ${expectedEvent.eventsCount} ${newExpectedEvent}`;
    const currentTestCode = this.params.test.getTestCode();
    const resultTestCode = currentTestCode.replace(
      RegExpHelper.getExpectSectionRegExp(),
      // Фикс того, что из newTestCode пропадают доллары
      // https://stackoverflow.com/questions/9423722/string-replace-weird-behavior-when-using-dollar-sign-as-replacement
      function () {
        return newTestCode;
      }
    );

    this.params.test.setTestCode(resultTestCode);
    return resultTestCode;
  }

  /**
   * Получает ожидаемое событие из результатов ecatest. Работает с простыми правилами без subrules. Требует наличия нормализованных событий.
   * @returns ожидаемое событие
   */
  private async getExpectedEventFromEcatest() {
    let integrationTestSimplifiedContent = '';
    let normalizedEvents = '';
    try {
      normalizedEvents = this.params.test.getNormalizedEvents();
      if (!normalizedEvents) {
        throw new XpException(
          'Для запуска быстрого теста нужно хотя бы одно нормализованное событие. Нормализуйте сырые события и повторите действие'
        );
      }

      // Временно создать модульный тест путем добавления к интеграционному нормализованного события в конец файла.
      // Убираем фильтр по полям в тесте, так как в модульном тесте нет обогащения, поэтому проверяем только сработку теста.
      const integrationTestPath = this.params.test.getTestCodeFilePath();
      const integrationTestContent = await FileSystemHelper.readContentFile(integrationTestPath);

      // Проверку на наличие expect not {} в тесте, в этом случае невозможно получить ожидаемое событие.
      if (TestHelper.isNegativeTest(integrationTestContent)) {
        throw new XpException(
          'Невозможно получить ожидаемого события для теста с кодом expect not {}. Скорректируйте код теста если это необходимо, сохраните его и повторите'
        );
      }
      integrationTestSimplifiedContent = integrationTestContent.replace(
        RegExpHelper.getExpectSectionRegExp(),
        'expect $1 {}'
      );
    } catch (error) {
      DialogHelper.showError('Не удалось сформировать условия получения ожидаемого события', error);
      return;
    }

    return vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        cancellable: false,
        title: `Получение ожидаемого события для теста №${this.params.test.getNumber()}`
      },
      async (progress) => {
        const expectSectionMatch =
          RegExpHelper.getExpectSectionRegExp().exec(integrationTestSimplifiedContent);
        if (!expectSectionMatch) {
          throw new XpException('Не удалось выделить секцию expect из интеграционного теста');
        }

        const expectSection = expectSectionMatch[0];
        const inputSection = integrationTestSimplifiedContent
          .slice(0, expectSectionMatch.index)
          .trimEnd();
        const modularTestContent = `${inputSection}\n${normalizedEvents}\n\n${expectSection}`;
        const modularTestContentForRunner = TestHelper.compressTestCode(modularTestContent);

        // Сохраняем модульный тест во временный файл.
        const rootPath = this.params.config.getRootByPath(this.params.test.getRuleDirectoryPath());
        const rootFolder = path.basename(rootPath);
        const randTmpPath = this.params.config.getRandTmpSubDirectoryPath(rootFolder);
        await fs.promises.mkdir(randTmpPath, { recursive: true });

        const fastTestFilePath = path.join(
          randTmpPath,
          GetExpectedEventCommand.EXPECT_EVENT_FILENAME
        );
        await FileSystemHelper.writeContentFile(fastTestFilePath, modularTestContentForRunner);

        // Создаем временный модульный тест для быстрого тестирования.
        const fastTest = new FastTest(this.params.test.getNumber());
        fastTest.setTestExpectationPath(fastTestFilePath);
        fastTest.setRule(this.params.rule);

        // Специальный тест быстрого теста.
        const testRunner = this.params.rule.getUnitTestRunner(this.params.config);
        const resultTest = await testRunner.run(fastTest);

        if (resultTest.getStatus() === TestStatus.Failed) {
          throw new XpException(
            `Получение ожидаемого события для теста №${resultTest.getNumber()} завершено неуспешно. Возможно интеграционный тест не проходит. Сначала добейтесь того чтобы данный тест проходил и повторите.`
          );
        }

        // Проверка, что не было ошибки и нам вернулся json, исключение поля time и форматируем.
        let testOutput = resultTest.getOutput();
        try {
          let testObject = JSON.parse(testOutput);
          testObject = TestHelper.removeKeys(testObject, ['time']);
          testOutput = JsHelper.formatJsonObject(testObject);
        } catch (error) {
          throw new XpException(
            'Полученные от теста данные не являются событием формата json. Возможно, интеграционный тест не проходит',
            error
          );
        }

        // Получаем имеющийся код теста и заменяем секцию expect {}
        const tests = this.params.rule.getIntegrationTests();
        const ruleTestIndex = tests.findIndex((it) => it.getNumber() == resultTest.getNumber());
        if (ruleTestIndex == -1) {
          throw new XpException('Не удалось получить интеграционный тест');
        }

        // Удаляем временные файлы.
        await fs.promises.rmdir(randTmpPath, { recursive: true });
        return testOutput;
      }
    );
  }

  /**
   * Получает ожидаемое событие из результатов успешного интеграционного теста. Работает с любыми правилами в том числе с использованием subrules. Необходимо успешное завершение теста.
   * @returns ожидаемое событие и число его сработок
   */
  private async getExpectedEventForIntegrationTestResult(): Promise<ExpectedEvent> {
    const rule = this.params.rule;
    const ruleName = rule.getName();

    const ruleCode = await rule.getRuleCode();
    const isSubrule = TestHelper.isRuleCodeContainsSubrules(ruleCode);

    if (!fs.existsSync(this.params.tmpDirPath)) {
      if (isSubrule) {
        throw new XpException(
          `Для правил, использующих вспомогательные правила (subrule), необходимо успешное прохождение интеграционных тестов. Повторите после того, как нужные тесты успешно пройдут`
        );
      }

      throw new XpException(
        `Результаты интеграционного теста №${this.params.test.getNumber()} правила ${ruleName} не найдены. Получение ожидаемого события возможно только для успешно прошедших интеграционных тестов`
      );
    }

    const actualEventsFilePath = this.getActualEventsFilePath();
    if (!actualEventsFilePath) {
      if (isSubrule) {
        throw new XpException(
          `Для правил, использующих вспомогательные правила (subrule), необходимо успешное прохождение интеграционных тестов. Повторите после того, как нужные тесты успешно пройдут`
        );
      }
      throw new XpException(
        `Результаты интеграционного теста №${this.params.test.getNumber()} правила ${ruleName} не найдены. Получение ожидаемого события возможно только для успешно прошедших интеграционных тестов`
      );
    }

    if (!fs.existsSync(actualEventsFilePath)) {
      throw new FileSystemException(
        `Файл результатов тестов ${actualEventsFilePath} не найден`,
        actualEventsFilePath
      );
    }

    // Событие может прилетать не одно
    const actualEventsString = await FileSystemHelper.readContentFile(actualEventsFilePath);
    if (!actualEventsString) {
      throw new XpException(
        `Фактическое событий интеграционного теста №${this.params.test.getNumber()} правила ${ruleName} пусто`
      );
    }

    const actualEvents = TestHelper.extractEventsFromResultString(
      this.params.config,
      actualEventsString,
      ruleName,
      this.params.test.getNumber()
    );

    // Условие теста задает, какое именно событие проверяется, поэтому по нему же отбираем фактическое.
    const testCondition = RegExpHelper.getSingleExpectEvent(this.params.test.getTestCode());

    let expectedFilteredEvents: string[];
    if (rule instanceof Correlation) {
      // Отбираем ожидаемое событие по имени правила, так как сюда могут попасть сабрули.
      expectedFilteredEvents = TestHelper.filterCorrelationEvents(actualEvents, ruleName);
    }

    if (rule instanceof Enrichment) {
      // Правило обогащения работает либо с корреляционными, либо с нормализованными событиями,
      // а в результатах теста есть события всех этапов конвейера.
      expectedFilteredEvents = TestHelper.filterEventsByExpectedStage(
        actualEvents,
        testCondition,
        ruleName
      );
    }

    if (!expectedFilteredEvents) {
      throw new XpException(`Ожидаемые события для правила ${ruleName} не были получены`);
    }

    if (expectedFilteredEvents.length === 0) {
      throw new XpException(
        `Не найдено результирующих событий после интеграционного теста правила ${ruleName}. Возможно тест не прошел или он не подразумевание получение результирующего события`
      );
    }

    // Событий одного этапа может быть несколько, тогда берем наиболее близкое к условию теста.
    if (expectedFilteredEvents.length > 1) {
      expectedFilteredEvents = TestHelper.selectEventsClosestToExpected(
        expectedFilteredEvents,
        testCondition
      );
    }

    if (expectedFilteredEvents.length === 1) {
      return { event: expectedFilteredEvents[0], eventsCount: 1 };
    }

    // Правило сработало несколько раз: события равнозначны для условия теста, поэтому берем любое,
    // а число сработок переносим в expect.
    if (TestHelper.isCorrelationEvents(expectedFilteredEvents)) {
      return { event: expectedFilteredEvents[0], eventsCount: expectedFilteredEvents.length };
    }

    throw new XpException(
      `Предполагается одно ожидаемое событие, но было получено ${expectedFilteredEvents.length}. Уточните условие теста в секции expect, чтобы однозначно определить проверяемое событие, и повторите`
    );
  }

  private getActualEventsFilePath(): string | undefined {
    const rule = this.params.rule;
    const ruleName = rule.getName();

    if (!(rule instanceof Correlation) && !(rule instanceof Enrichment)) {
      throw new XpException(`Правило ${ruleName} не поддерживает получение ожидаемого события`);
    }

    // Пути, полученные из вывода siemj при прогоне тестов, приоритетнее поиска по файловой системе.
    // При запуске утилит в Docker siemj печатает пути внутри контейнера, которых на хосте нет,
    // поэтому такие пути пропускаем и ищем файл в директории с результатами на хосте.
    const resultFiles = this.params.test.getResultFiles();
    const reportedFilePath = [
      resultFiles?.actualEventsFilePath,
      resultFiles?.detailedReportFilePath
    ].find((filePath) => filePath && fs.existsSync(filePath));
    if (reportedFilePath) {
      return reportedFilePath;
    }

    // Может быть обогащено нормализованное событие, либо корреляция
    const enrichedCorrFilePath = TestHelper.getEnrichedCorrEventFilePath(
      this.params.config,
      this.params.tmpDirPath,
      ruleName,
      this.params.test.getNumber()
    );

    if (enrichedCorrFilePath) {
      return enrichedCorrFilePath;
    }

    // Если обогащенной корреляции нет, тогда будет обогащенное нормализованное событие.
    if (rule instanceof Enrichment) {
      return TestHelper.getEnrichedNormEventFilePath(
        this.params.config,
        this.params.tmpDirPath,
        ruleName,
        this.params.test.getNumber()
      );
    }

    return undefined;
  }

  public static EXPECT_EVENT_FILENAME = 'expected_event_test.sc';
}
