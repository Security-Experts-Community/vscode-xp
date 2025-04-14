import * as vscode from 'vscode';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';

import { Command, IntegrationTestParams } from '../../../models/command/command';
import { DialogHelper } from '../../../helpers/dialogHelper';
import { FileSystemHelper } from '../../../helpers/fileSystemHelper';
import { RegExpHelper } from '../../../helpers/regExpHelper';
import { TestHelper } from '../../../helpers/testHelper';
import { XpException } from '../../../models/xpException';
import { Log } from '../../../extension';
import { FileSystemException } from '../../../models/fileSystemException';
import { VsCodeApiHelper } from '../../../helpers/vsCodeApiHelper';

export class ShowTestResultsDiffCommand extends Command {
  constructor(private params: IntegrationTestParams) {
    super();
  }

  public async execute(): Promise<boolean> {
    const ruleName = this.params.rule.getName();
    Log.info(
      `Запрошено сравнение фактического и ожидаемого события правила ${ruleName} теста №${this.params.testNumber}`
    );

    // Получаем ожидаемое событие.
    const tests = this.params.rule.getIntegrationTests();
    if (tests.length < this.params.testNumber) {
      // TODO: внутренняя ошибка
      DialogHelper.showError(
        `Запрашиваемый интеграционный тест №${this.params.testNumber} правила ${ruleName} не найден`
      );
      return;
    }

    if (!fs.existsSync(this.params.tmpDirPath)) {
      DialogHelper.showError(
        this.params.config.getMessage('View.IntegrationTests.Message.NoTestResultFound')
      );
      return;
    }

    const testIndex = this.params.testNumber - 1;
    const currTest = tests[testIndex];

    let expectedEvent = '';
    if (!TestHelper.isNegativeTest(currTest.getTestCode())) {
      const testCode = currTest.getTestCode();
      expectedEvent = RegExpHelper.getSingleExpectEvent(testCode);
      if (!expectedEvent) {
        // TODO: внутренняя ошибка?
        DialogHelper.showError(
          `Ожидаемое событий интеграционного теста №${this.params.testNumber} правила ${ruleName} пусто`
        );
        return;
      }
    } else {
      // Если не ожидаем событие, а получили его. Тогда хочется увидеть что мы получили, поэтому задаем заглушку для отсутствующего ожидаемого.
      expectedEvent = '{}';
    }

    let expectedKeys: string[] = [];
    try {
      const expectedEventObject = JSON.parse(expectedEvent);
      expectedKeys = Object.keys(expectedEventObject);
    } catch (error) {
      throw new XpException(
        `Из ожидаемого события тест №${currTest.getNumber} не удалось получить JSON. Проверьте его корректность и повторите`,
        error
      );
    }

    const formattedExpectedEvent = TestHelper.formatTestCodeAndEvents(expectedEvent.trim());

    // Записываем ожидаемое фактическое значение файл для последующего сравнения
    const expectedEventTestFilePath = path.join(
      this.params.tmpDirPath,
      `expectedEvents_${this.params.testNumber}.json`
    );
    await FileSystemHelper.writeContentFile(expectedEventTestFilePath, formattedExpectedEvent);

    // Получаем фактическое событие.
    const actualEventsFilePath = TestHelper.getEnrichedCorrEventFilePath(
      this.params.tmpDirPath,
      ruleName,
      this.params.testNumber
    );
    if (!actualEventsFilePath) {
      throw new XpException(
        `Результаты интеграционного теста №${this.params.testNumber} правила ${ruleName} не найдены`
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
        `Фактическое событий интеграционного теста №${this.params.testNumber} правила ${ruleName} пусто`
      );
    }

    const actualEvents = actualEventsString.split(os.EOL).filter((l) => l);

    // Отбираем ожидаемое событие по имени правила
    // const actualFilteredEvents = TestHelper.filterCorrelationEvents(actualEvents, ruleName);
    let actualFilteredEvents = actualEvents;

    // Если мы не получили сработки нашей корреляции, тогда покажем те события, который отработали.
    let formattedActualEvent = '';
    if (actualFilteredEvents.length !== 0) {
      // Исключаем поля, которых нет в ожидаемом, чтобы сравнение было репрезентативным.
      if (expectedKeys.length !== 0) {
        actualFilteredEvents = actualFilteredEvents
          .map((arl) => JSON.parse(arl))
          .sort((a, b) => {
            if (a?.correlation_type === 'subrule' && b?.correlation_type !== 'subrule') {
              return 1;
            }
            return -1;
          })
          .map((aro) => TestHelper.removeAnotherObjectKeys(aro, expectedKeys))
          .map((aro) => JSON.stringify(aro));
      }
    }

    // Помимо форматирование их требуется почистить от технических полей.
    const testEvents = TestHelper.cleanJsonlEventFromTechnicalFields(actualFilteredEvents).join(
      os.EOL
    );
    formattedActualEvent = TestHelper.formatTestCodeAndEvents(testEvents);

    // Записываем очищенное фактическое значение файл для последующего сравнения
    const actualEventTestFilePath = path.join(
      this.params.tmpDirPath,
      `actualEvents${this.params.testNumber}.json`
    );
    await FileSystemHelper.writeContentFile(actualEventTestFilePath, formattedActualEvent);

    Log.info(
      `Фактическое событие сохранено в файле по пути ${actualEventTestFilePath}, ожидаемое - ${expectedEventTestFilePath}`
    );

    VsCodeApiHelper.showDifferencesBetweenTwoFiles(
      vscode.Uri.file(actualEventTestFilePath),
      vscode.Uri.file(expectedEventTestFilePath),
      `Фактическое и ожидаемое события теста №${this.params.testNumber}`
    );
    return true;
  }
}
