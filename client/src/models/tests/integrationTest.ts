import * as fs from 'fs';
import * as path from 'path';

import { TestStatus } from './testStatus';
import { FileSystemHelper } from '../../helpers/fileSystemHelper';
import { XpException } from '../xpException';
import { RuleBaseItem } from '../content/ruleBaseItem';
import { Configuration } from '../configuration';

// TODO: вынести общие методы из класс BaseUnitTest.
export class IntegrationTest {
  private constructor() {
    //
  }

  public static updateTestStatus(oldTest: IntegrationTest, newTest: IntegrationTest): void {
    if (
      oldTest.getRawEvents() === newTest.getRawEvents() &&
      oldTest.getTestCode() === newTest.getTestCode()
    ) {
      newTest.setStatus(oldTest.getStatus());
    }
  }

  public static parseFromRuleDirectory(ruleDirFullPath: string): IntegrationTest[] {
    const testsDirectoryFullPath = path.join(ruleDirFullPath, RuleBaseItem.TESTS_DIRNAME);

    // Тестов нет.
    if (!fs.existsSync(testsDirectoryFullPath)) {
      return [];
    }

    const tests = fs
      .readdirSync(testsDirectoryFullPath)
      .filter((f) => f.endsWith('.tc'))
      .map((testFileName, index) => {
        // Парсим номер теста, для того чтобы открыть нужный файл с сырыми событиями.
        const parseNumberResult = /test_conds_(\d+).tc/.exec(testFileName);
        if (!parseNumberResult || parseNumberResult.length != 2) {
          return;
        }
        const testNumber = parseInt(parseNumberResult[1]);
        const test = IntegrationTest.create(testNumber, ruleDirFullPath);

        // Получаем файл с содержимым теста
        const testCodeFileName = `test_conds_${testNumber}.tc`;
        const testCodeFilePath = path.join(testsDirectoryFullPath, testCodeFileName);
        if (!fs.existsSync(testCodeFilePath)) {
          throw new XpException(
            Configuration.get().getMessage(
              'View.IntegrationTests.Message.RequiredFileWasNotFound',
              testNumber,
              testCodeFilePath
            )
          );
        }
        const testCodeContent = fs.readFileSync(testCodeFilePath, 'utf8');
        test.setTestCode(testCodeContent);

        // Получаем файл с сырыми событиями.
        const rawEventsFileName = `raw_events_${testNumber}.json`;
        const rawEventsFullPath = path.join(testsDirectoryFullPath, rawEventsFileName);
        if (!fs.existsSync(rawEventsFullPath)) {
          throw new XpException(
            Configuration.get().getMessage(
              'View.IntegrationTests.Message.RequiredFileWasNotFound',
              testNumber,
              rawEventsFullPath
            )
          );
        }
        const rawEvents = fs.readFileSync(rawEventsFullPath, 'utf8');
        test.setRawEvents(rawEvents);

        return test;
        // Проверяем, что все элементы массива имеют нужный тип.
        // Если одного из файлов нет, то элемент массива может быть неопределен
      })
      .filter((item) => {
        return item instanceof IntegrationTest;
      })
      // Сортируем тесты, ибо в противном случае сначала будет 1, потом 10 и т.д.
      .sort((a, b) => a.getNumber() - b.getNumber());

    return tests;
  }

  public static create(testNumber: number, ruleDirPath?: string): IntegrationTest {
    const test = new IntegrationTest();
    test.setNumber(testNumber);
    test.setRuleDirectoryPath(ruleDirPath);

    // Заполнение тестов пустая строка для возможности сохранения тестов без сырых событий и кода.
    test.setTestCode('');
    test.setRawEvents('');

    return test;
  }

  public static convertFromObject(object: any): IntegrationTest {
    return Object.assign(new IntegrationTest(), object) as IntegrationTest;
  }

  public setStatus(status: TestStatus): void {
    this._testStatus = status;
  }

  public getStatus(): TestStatus {
    return this._testStatus;
  }

  public setRuleDirectoryPath(ruleDirectoryPath: string) {
    this._ruleDirectoryPath = ruleDirectoryPath;
  }

  public getRuleDirectoryPath() {
    return this._ruleDirectoryPath;
  }

  public getRuleFullPath() {
    // TODO: подходит только для корреляции.
    return path.join(this.getRuleDirectoryPath(), `rule.co`);
  }

  public getTestCodeFilePath(): string {
    return path.join(
      this._ruleDirectoryPath,
      RuleBaseItem.TESTS_DIRNAME,
      `test_conds_${this.getNumber()}.tc`
    );
  }

  public getRawEventsFilePath(): string {
    return path.join(
      this._ruleDirectoryPath,
      RuleBaseItem.TESTS_DIRNAME,
      `raw_events_${this.getNumber()}.json`
    );
  }

  public setOutput(output: string) {
    this._output = output;
  }

  public getOutput() {
    return this._output;
  }

  public async save(): Promise<void> {
    if (!this._number) {
      throw new XpException('Для интеграционного теста не задан порядковый номер');
    }

    if (this._rawEvents == undefined) {
      throw new XpException('Сырые события не заданы');
    }

    if (!this.getRuleDirectoryPath()) {
      throw new XpException('Не задана директория правила');
    }

    if (!fs.existsSync(this._ruleDirectoryPath)) {
      await fs.promises.mkdir(this._ruleDirectoryPath, { recursive: true });
    }

    const testDirectoryPath = path.join(this._ruleDirectoryPath, RuleBaseItem.TESTS_DIRNAME);
    if (!fs.existsSync(testDirectoryPath)) {
      await fs.promises.mkdir(testDirectoryPath, { recursive: true });
    }

    // Если код теста не задан,
    // test_conds_N.tc
    if (this._testCode != undefined) {
      const testFullPath = this.getTestCodeFilePath();
      await FileSystemHelper.writeContentFileIfChanged(testFullPath, this._testCode);
    }

    // raw_events_N.json
    const rawEventFullPath = this.getRawEventsFilePath();
    if (this._rawEvents != undefined) {
      await FileSystemHelper.writeContentFileIfChanged(rawEventFullPath, this._rawEvents);
    }
  }

  public async remove(): Promise<[void, void]> {
    const unlinkRawEventsPromise = fs.promises.unlink(this.getRawEventsFilePath());
    const unlinkTestCodePromise = fs.promises.unlink(this.getTestCodeFilePath());
    return Promise.all([unlinkRawEventsPromise, unlinkTestCodePromise]);
  }

  public setNumber(number: number): void {
    this._number = number;
  }

  public getNumber(): number {
    return this._number;
  }

  public setNormalizedEvents(normalizeEvents: string): void {
    this._normalizeEvents = normalizeEvents;
  }

  public getNormalizedEvents(): string {
    return this._normalizeEvents;
  }

  public setRawEvents(rawEvent: string): void {
    this._rawEvents = rawEvent;
  }

  public getRawEvents(): string {
    return this._rawEvents;
  }

  public setTestCode(testCode: string): void {
    this._testCode = testCode;
  }

  public getTestCode(): string {
    return this._testCode;
  }

  private _ruleDirectoryPath: string;

  protected _number: number;
  protected _rawEvents = '';
  protected _testCode = '';

  protected _normalizeEvents: string;
  protected _testStatus: TestStatus = TestStatus.Unknown;

  protected _output: string;
}
