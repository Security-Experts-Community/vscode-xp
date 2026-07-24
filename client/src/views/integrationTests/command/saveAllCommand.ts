import * as os from 'os';

import { DialogHelper } from '../../../helpers/dialogHelper';
import { TestHelper } from '../../../helpers/testHelper';
import { Command, RuleCommandParams } from '../../../models/command/command';
import { XpException } from '../../../models/xpException';
import { IntegrationTest } from '../../../models/tests/integrationTest';

export interface SaveAllCommandParams extends RuleCommandParams {
  testNumber: number;
  tests: any[];
}

export class SaveAllCommand extends Command {
  constructor(private params: SaveAllCommandParams) {
    super();
  }

  public async execute(): Promise<boolean> {
    const config = this.params.config;

    // Номер активного теста.
    const activeTestNumberString = this.params.testNumber;
    if (!activeTestNumberString) {
      // TODO: внутренняя ошибка
      throw new XpException(`Не задан номер активного теста`);
    }

    // В данном руле сохраняются в памяти нормализованные события.
    const rule = this.params.rule;
    const newTests = await this.getNewTests();

    rule.setIntegrationTests(newTests);
    await rule.saveIntegrationTests();

    DialogHelper.showInfo(
      config.getMessage('View.IntegrationTests.Message.TestsSavedSuccessfully')
    );
    return true;
  }

  private async getNewTests(): Promise<IntegrationTest[]> {
    const plainTests = this.params.tests as any[];

    // Проверяем, что все тесты - нормальные
    plainTests.forEach((plainTest, index) => {
      // Сырые события.
      let rawEvents = plainTest?.rawEvents;
      rawEvents = rawEvents ? rawEvents.trim() : '';
      if (!rawEvents || rawEvents == '') {
        throw new XpException(
          this.params.config.getMessage(
            'View.IntegrationTests.Message.SaveWithoutRawEvents',
            plainTest.number ?? 0
          )
        );
      }

      // Код теста.
      const testCode = plainTest?.testCode;
      if (!testCode || testCode == '') {
        throw new XpException(
          this.params.config.getMessage(
            'View.IntegrationTests.Message.SaveWithoutTestCode',
            plainTest.number ?? 0
          )
        );
      }
    });

    if (!plainTests.length) {
      return [];
    }

    const oldTests = this.params.rule.getIntegrationTests();
    const newTests = plainTests.map((plainTest, index) => {
      const number = index + 1;
      const newTest = IntegrationTest.create(number);
      const oldTest = oldTests?.[index];

      // Сырые события.
      let rawEvents = plainTest?.rawEvents;

      // Из textarea новые строки только \n, поэтому надо их поправить под систему.
      rawEvents = rawEvents.replace(/(?<!\\)\n/gm, os.EOL);
      if (oldTest && this.areTextContentsEqual(rawEvents, oldTest.getRawEvents())) {
        rawEvents = oldTest.getRawEvents();
      }
      newTest.setRawEvents(rawEvents);

      // Код теста.
      let testCode = plainTest?.testCode;

      // Проверяем наличие проверки ожидаемых событий
      if (
        !/(\bexpect\b\s+(\d+|not|any))|(\bexpect\b\s+\btable_list\b)\s+{[\s\S]*?}$/gm.test(testCode)
      ) {
        throw new XpException(
          this.params.config.getMessage('View.IntegrationTests.Message.InvalidTestCode', number)
        );
      }

      // Из textarea новые строки только \n, поэтому надо их поправить под систему.
      testCode = testCode.replace(/(?<!\\)\n/gm, os.EOL);
      let compressedCode: string;
      try {
        compressedCode = TestHelper.compressTestCode(testCode);
      } catch (error) {
        throw new XpException(
          this.params.config.getMessage('View.IntegrationTests.Message.InvalidJsonInTestCode'),
          error
        );
      }

      if (oldTest && this.areTestCodesSemanticallyEqual(compressedCode, oldTest.getTestCode())) {
        compressedCode = oldTest.getTestCode();
      }
      newTest.setTestCode(compressedCode);

      // Нормализованные события.
      const normEvents = plainTest?.normEvents;
      if (normEvents) {
        let compressedNormEvents = TestHelper.compressTestCode(normEvents);
        if (
          oldTest &&
          this.areTestCodesSemanticallyEqual(compressedNormEvents, oldTest.getNormalizedEvents())
        ) {
          compressedNormEvents = oldTest.getNormalizedEvents();
        }
        newTest.setNormalizedEvents(compressedNormEvents);
      }

      // Переносим статус из тестов до сохранения если такие же сырые события и код теста.
      if (oldTest) {
        IntegrationTest.updateTestStatus(oldTest, newTest);
      }

      return newTest;
    });

    return newTests;
  }

  private areTextContentsEqual(left?: string, right?: string): boolean {
    return this.normalizeLineEndings(left) === this.normalizeLineEndings(right);
  }

  private areTestCodesSemanticallyEqual(left?: string, right?: string): boolean {
    if (!left || !right) {
      return left === right;
    }

    return (
      this.normalizeLineEndings(TestHelper.compressTestCode(left)) ===
      this.normalizeLineEndings(TestHelper.compressTestCode(right))
    );
  }

  private normalizeLineEndings(value?: string): string {
    return (value ?? '').replace(/\r\n/g, '\n');
  }
}
