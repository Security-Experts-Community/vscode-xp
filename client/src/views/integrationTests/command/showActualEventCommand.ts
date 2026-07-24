import * as vscode from 'vscode';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';

import { Command, IntegrationTestParams } from '../../../models/command/command';
import { DialogHelper } from '../../../helpers/dialogHelper';
import { FileSystemHelper } from '../../../helpers/fileSystemHelper';
import { TestHelper } from '../../../helpers/testHelper';
import { XpException } from '../../../models/xpException';
import { Log } from '../../../extension';
import { VsCodeApiHelper } from '../../../helpers/vsCodeApiHelper';
import { IntegrationTest } from '../../../models/tests/integrationTest';

export class ShowActualEventCommand extends Command {
  constructor(private params: IntegrationTestParams) {
    super();
  }

  public async execute(): Promise<boolean> {
    const ruleName = this.params.rule.getName();
    Log.info(
      `Запрошено фактическое событие для теста №${this.params.testNumber} правила ${ruleName}`
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

    // Получаем путь к файлу с фактическим (корреляционным) событием.
    const actualEventsFilePath = this.getActualEventsFilePath(this.params.test, ruleName);
    if (!actualEventsFilePath) {
      throw new XpException(
        `Результаты интеграционного теста №${this.params.testNumber} правила ${ruleName} не найдены`
      );
    }

    // Событие может прилетать не одно
    const actualEventsString = await this.params.config.readTextFile(actualEventsFilePath);
    if (!actualEventsString) {
      throw new XpException(
        `Фактическое событий интеграционного теста №${this.params.testNumber} правила ${ruleName} пусто`
      );
    }
    const actualEvents = TestHelper.extractEventsFromResultString(
      this.params.config,
      actualEventsString,
      ruleName,
      this.params.test.getNumber()
    );

    // Очищаем события от технических полей и форматируем для вывода.
    const actualFilteredEvents = TestHelper.cleanJsonlEventFromTechnicalFields(actualEvents).join(
      os.EOL
    );
    const formattedActualEvent = TestHelper.formatTestCodeAndEvents(actualFilteredEvents);

    // Записываем очищенное фактическое значение файл для последующего сравнения
    const actualEventTestFilePath = path.join(
      this.params.tmpDirPath,
      `actualEvents${this.params.testNumber}.json`
    );
    await FileSystemHelper.writeContentFile(actualEventTestFilePath, formattedActualEvent);

    Log.info(`Фактическое событие сохранено в файле по пути ${actualEventTestFilePath}`);

    VsCodeApiHelper.open(vscode.Uri.file(actualEventTestFilePath));
    return true;
  }

  private getActualEventsFilePath(test: IntegrationTest, ruleName: string): string | undefined {
    const resultFiles = test.getResultFiles();
    if (resultFiles?.actualEventsFilePath) {
      return resultFiles.actualEventsFilePath;
    }

    if (resultFiles?.detailedReportFilePath) {
      return resultFiles.detailedReportFilePath;
    }

    return TestHelper.getEnrichedCorrEventFilePath(
      this.params.config,
      this.params.tmpDirPath,
      ruleName,
      this.params.testNumber
    );
  }
}
