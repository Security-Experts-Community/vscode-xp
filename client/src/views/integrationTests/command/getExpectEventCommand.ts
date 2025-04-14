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

// TODO: вынести под общий интерфейс провайдеров
export class GetExpectedEventCommand {
  constructor(private params: IntegrationTestParams) {}

  public async execute(
    viewProvider: IntegrationTestEditorViewProvider,
    testNumber: number
  ): Promise<boolean> {
    const testWithNewTestCode = await this.generateTestCode();

    if (testWithNewTestCode) {
      await viewProvider.updateTestCode(this.params.test.getTestCode(), testNumber);
    }

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

    let newExpectedEvent: string;
    if (
      TestHelper.isRuleCodeContainsSubrules(ruleCode) ||
      !this.params.test.getNormalizedEvents()
    ) {
      newExpectedEvent = await this.getExpectedEventForIntegrationTestResult();
    } else {
      newExpectedEvent = await this.getExpectedEventFromEcatest();
    }

    // Очищаем код от технических полей, форматируем и заменяем код теста на новый с сохранением комментариев.
    newExpectedEvent = TestHelper.cleanSortFormatExpectedEventTestCode(newExpectedEvent);
    const newTestCode = `expect 1 ${newExpectedEvent}`;
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
        const modularTestContent = `${integrationTestSimplifiedContent}\n\n${normalizedEvents}`;

        // Сохраняем модульный тест во временный файл.
        const rootPath = this.params.config.getRootByPath(this.params.test.getRuleDirectoryPath());
        const rootFolder = path.basename(rootPath);
        const randTmpPath = this.params.config.getRandTmpSubDirectoryPath(rootFolder);
        await fs.promises.mkdir(randTmpPath, { recursive: true });

        const fastTestFilePath = path.join(
          randTmpPath,
          GetExpectedEventCommand.EXPECT_EVENT_FILENAME
        );
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
   * @returns ожидаемое событие
   */
  private async getExpectedEventForIntegrationTestResult(): Promise<string> {
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

    const actualEventsFilePath = await this.getActualEventsFilePath();
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

    const actualEvents = actualEventsString.split(os.EOL).filter((l) => l);

    let expectedFilteredEvents: string[];
    if (rule instanceof Correlation) {
      // Отбираем ожидаемое событие по имени правила, так как сюда могут попасть сабрули.
      expectedFilteredEvents = TestHelper.filterCorrelationEvents(actualEvents, ruleName);
    }

    if (rule instanceof Enrichment) {
      // Отбираем ожидаемое событие по имени правила, так как сюда могут попасть сабрули.
      expectedFilteredEvents = actualEvents;
    }

    if (!expectedFilteredEvents) {
      throw new XpException(`Ожидаемые события для правила ${ruleName} не были получены`);
    }

    if (expectedFilteredEvents.length === 0) {
      throw new XpException(
        `Не найдено результирующих событий после интеграционного теста правила ${ruleName}. Возможно тест не прошел или он не подразумевание получение результирующего события`
      );
    }

    if (expectedFilteredEvents.length != 1) {
      throw new XpException(
        `Предполагается одно ожидаемое событие, но было получено ${expectedFilteredEvents.length}`
      );
    }

    return expectedFilteredEvents[0];
  }

  private async getActualEventsFilePath(): Promise<string> {
    const rule = this.params.rule;
    const ruleName = this.params.rule.getName();

    if (rule instanceof Correlation) {
      return TestHelper.getEnrichedCorrEventFilePath(
        this.params.tmpDirPath,
        ruleName,
        this.params.test.getNumber()
      );
    }

    if (rule instanceof Enrichment) {
      // Проверяем сначала нормализованное обогащенное событие
      const enrichedNormFilePath = TestHelper.getEnrichedNormEventFilePath(
        this.params.tmpDirPath,
        ruleName,
        this.params.test.getNumber()
      );

      // В любом случае должно быть нормализованное обогащенное событие.
      if (!fs.existsSync(enrichedNormFilePath)) {
        throw new XpException(`Результирующее обогащенное нормализованное событие не найдено`);
      }

      // Может быть обогащено нормализованное событие, либо корреляция
      const enrichedCorrFilePath = TestHelper.getEnrichedCorrEventFilePath(
        this.params.tmpDirPath,
        ruleName,
        this.params.test.getNumber()
      );

      if (!enrichedCorrFilePath) {
        return enrichedNormFilePath;
      }

      // Если обогащенное корреляции нет, тогда будет обогащенное нормализованное событие.
      if (!fs.existsSync(enrichedCorrFilePath)) {
        return enrichedNormFilePath;
      }

      return enrichedCorrFilePath;
    }

    throw new XpException(`Правило ${ruleName} не поддерживает получение ожидаемого события`);
  }

  public static EXPECT_EVENT_FILENAME = 'expected_event_test.sc';
}
