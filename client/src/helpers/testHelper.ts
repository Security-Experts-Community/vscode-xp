import * as os from 'os';
import * as vscode from 'vscode';

import { RuleBaseItem } from '../models/content/ruleBaseItem';
import { IntegrationTest } from '../models/tests/integrationTest';
import { RegExpHelper } from './regExpHelper';
import { XpException } from '../models/xpException';
import { BaseUnitTest } from '../models/tests/baseUnitTest';
import { StringHelper } from './stringHelper';
import { Log } from '../extension';
import { FileSystemHelper } from './fileSystemHelper';
import { Correlation, CorrelationEvent } from '../models/content/correlation';
import { ArgumentException } from '../models/argumentException';
import { JsHelper } from './jsHelper';
import { Normalization } from '../models/content/normalization';
import { Configuration } from '../models/configuration';
import { GetSIEMJVersion, SIEMJVersion } from '../models/siemj/siemjManager';
import { parseSiemj2Events } from './siemj2EventsParser';

export type EventMimeType =
  | 'application/x-pt-eventlog'
  | 'application/json'
  | 'text/plain'
  | 'text/csv'
  | 'text/xml';

export const EVENT_PRIORITY_FIELDS = ['subject', 'action', 'object', 'status'];

export class TestHelper {
  /**
   * Проверяет, может быть проверена локализация у правила
   * @param rule правило
   * @returns может быть проверена локализация у правила
   */
  public static isTestedLocalizationsRule(rule: RuleBaseItem): boolean {
    return rule instanceof Correlation || rule instanceof Normalization;
  }

  /**
   * Проверяет, ожидает ли тест отсутствие события. Помимо `expect not {}` событие не ожидается
   * и в случае `expect 0 {}`.
   * @param testCode код теста
   * @returns ожидает ли тест отсутствие события
   */
  public static isNegativeTest(testCode: string): boolean {
    return /expect\s*(not|0)\s*{/gm.test(testCode);
  }

  public static removeKeys(object: any, removedKeys: string[]): any {
    const objectCopy = Object.assign({}, object);
    const objectKeys = Object.keys(object);
    for (const objectKey of objectKeys) {
      if (removedKeys.includes(objectKey)) {
        delete objectCopy[objectKey];
      }
    }

    return objectCopy;
  }

  public static removeAnotherObjectKeys(object: any, requiredKeys: string[]): any {
    const objectCopy = Object.assign({}, object);
    const objectKeys = Object.keys(object);
    for (const objectKey of objectKeys) {
      if (!requiredKeys.includes(objectKey)) {
        delete objectCopy[objectKey];
      }
    }

    return objectCopy;
  }

  public static filterCorrelationEvents(jsons: string[], ruleName: string): string[] {
    const filteredJsons: string[] = [];
    for (const eventJson of jsons) {
      try {
        const eventObject = JSON.parse(eventJson) as CorrelationEvent;
        if (eventObject.correlation_name === ruleName) {
          filteredJsons.push(eventJson.trim());
        }
      } catch (error) {
        Log.warn('Ошибка фильтрации событий', error);
      }
    }

    return filteredJsons;
  }

  /**
   * Отбирает события того этапа конвейера, который проверяет тест. В файл с результатами теста
   * попадают события всех этапов, при этом correlation_name в условии теста однозначно задает
   * проверяемое корреляционное событие. Если в условии его нет, то приоритет у событий после
   * коррелятора, среди которых в свою очередь приоритет у событий тестируемого правила,
   * а при отсутствии корреляционных событий проверяются нормализованные и обогащенные.
   * @param jsons фактические события теста
   * @param expectedEvent условие теста из секции expect
   * @param ruleName имя тестируемого правила
   * @returns события этапа, проверяемого тестом
   */
  public static filterEventsByExpectedStage(
    jsons: string[],
    expectedEvent: string,
    ruleName?: string
  ): string[] {
    const expectedObject = TestHelper.parseExpectedEvent(expectedEvent);
    if (!expectedObject) {
      return jsons;
    }

    const events = TestHelper.parseEvents(jsons);
    const afterCorrelator = events.filter((event) => event.object['correlation_name']);
    const beforeCorrelator = events.filter((event) => !event.object['correlation_name']);

    const expectedCorrelationName = expectedObject['correlation_name'];
    if (expectedCorrelationName) {
      const correlationEvents = afterCorrelator.filter(
        (event) => event.object['correlation_name'] === expectedCorrelationName
      );

      // Проверяемая корреляция не сработала, тест не проходит, поэтому ничего не отбрасываем.
      return correlationEvents.length !== 0 ? correlationEvents.map((event) => event.json) : jsons;
    }

    // Помимо тестируемого правила сработать могли и другие, например вспомогательные (subrule),
    // поэтому среди корреляционных событий отбираем события тестируемого правила.
    const ruleEvents = ruleName
      ? afterCorrelator.filter((event) => event.object['correlation_name'] === ruleName)
      : [];
    if (ruleEvents.length !== 0) {
      return ruleEvents.map((event) => event.json);
    }

    if (afterCorrelator.length !== 0) {
      return afterCorrelator.map((event) => event.json);
    }

    // Условие теста пустое: результатом работы конвейера является последнее обогащенное событие.
    if (Object.keys(expectedObject).length === 0 && beforeCorrelator.length !== 0) {
      return [beforeCorrelator[beforeCorrelator.length - 1].json];
    }

    return beforeCorrelator.length !== 0 ? beforeCorrelator.map((event) => event.json) : jsons;
  }

  /**
   * Проверяет, что все события получены после коррелятора. Такие события отличаются друг от друга
   * только числом сработок правила, поэтому любое из них может быть ожидаемым.
   * @param jsons фактические события теста
   * @returns все ли события являются корреляционными
   */
  public static isCorrelationEvents(jsons: string[]): boolean {
    const events = TestHelper.parseEvents(jsons);
    return events.length !== 0 && events.every((event) => event.object['correlation_name']);
  }

  /**
   * Отбирает из событий те, которые сильнее прочих соответствуют условию теста. Требуется,
   * когда тест проверяет одно событие, а фактических событий одного этапа получено несколько.
   * @param jsons фактические события теста
   * @param expectedEvent условие теста из секции expect
   * @returns наиболее подходящие условию теста события
   */
  public static selectEventsClosestToExpected(jsons: string[], expectedEvent: string): string[] {
    const expectedObject = TestHelper.parseExpectedEvent(expectedEvent);
    if (!expectedObject) {
      return jsons;
    }

    const expectedEntries = Object.entries(expectedObject);
    if (expectedEntries.length === 0) {
      return jsons;
    }

    const scoredEvents = TestHelper.parseEvents(jsons).map((event) => {
      const matchedFieldsCount = expectedEntries.filter(
        ([key, value]) => JSON.stringify(event.object[key]) === JSON.stringify(value)
      ).length;
      return { json: event.json, matchedFieldsCount };
    });

    // Ни одно поле условия не совпало: фактические события отличаются от ожидаемого и тест не проходит,
    // выбрать одно из событий по условию нельзя, поэтому ничего не отбрасываем.
    const maxMatchedFieldsCount = Math.max(...scoredEvents.map((e) => e.matchedFieldsCount));
    if (maxMatchedFieldsCount === 0) {
      return jsons;
    }

    return scoredEvents
      .filter((e) => e.matchedFieldsCount === maxMatchedFieldsCount)
      .map((e) => e.json);
  }

  private static parseExpectedEvent(expectedEvent: string): Record<string, unknown> | undefined {
    if (!expectedEvent) {
      return undefined;
    }

    try {
      return JSON.parse(expectedEvent);
    } catch (error) {
      Log.warn('Ошибка разбора ожидаемого события из кода теста', error);
      return undefined;
    }
  }

  private static parseEvents(jsons: string[]): { json: string; object: any }[] {
    const events: { json: string; object: any }[] = [];
    for (const eventJson of jsons) {
      try {
        events.push({ json: eventJson.trim(), object: JSON.parse(eventJson) });
      } catch (error) {
        Log.warn('Ошибка фильтрации событий', error);
      }
    }

    return events;
  }

  /**
   * Убирает из кода теста ключи 'generator.version', 'uuid', '_subjects', '_objects', 'subevents', 'subevents.time'
   * @param testCode код теста
   * @returns код теста, очищенный от тегов
   */
  public static cleanTestCode(testCode: string): string {
    if (!testCode) {
      throw new ArgumentException('Не задан обязательных параметр', 'testCode');
    }

    const regexPatterns = [
      /\s*"generator.version"(\s*):(\s*)"(.*?",)/g,

      /\s*"uuid"(\s*):(\s*)".*?",/g, // в середине json-а
      /,\s*"uuid"(\s*):(\s*)".*?"/g, // в конце json-а

      /\s*"time"(\s*):(\s*)".*?",/g, // в середине json-а
      /,\s*"time"(\s*):(\s*)".*?"/g, // в конце json-а

      /\s*"incident.name"(\s*):(\s*)".*?",/g, // в середине json-а
      /,\s*"incident.name"(\s*):(\s*)".*?"/g, // в конце json-а

      /\s*"siem_id"(\s*):(\s*)".*?",/g, // в середине json-а
      /,\s*"siem_id"(\s*):(\s*)".*?"/g, // в конце json-а

      /\s*"labels"(\s*):(\s*)".*?",/g, // в середине json-а
      /,\s*"labels"(\s*):(\s*)".*?"/g, // в конце json-а

      /\s*"_subjects"(\s*):(\s*)\[[\s\S]*?\],/g,
      /,\s*"_subjects"(\s*):(\s*)\[[\s\S]*?\]/g,

      /\s*"_objects"(\s*):(\s*)\[[\s\S]*?\],/g,
      /,\s*"_objects"(\s*):(\s*)\[[\s\S]*?\]/g,

      /\s*"subevents"(\s*):(\s*)\[[\s\S]*?\],/g,
      /,\s*"subevents"(\s*):(\s*)\[[\s\S]*?\]/g,

      /\s*"subevents.time"(\s*):(\s*)\[[\s\S]*?\],/g,
      /,\s*"subevents.time"(\s*):(\s*)\[[\s\S]*?\]/g
    ];

    for (const regexPattern of regexPatterns) {
      testCode = testCode.replace(regexPattern, '');
    }

    return testCode;
  }

  public static cleanJsonlEventFromTechnicalFields(jsonl: string[]): string[] {
    if (!jsonl) {
      throw new ArgumentException('Не задан обязательных параметр', 'testCode');
    }

    return jsonl.map((j) =>
      TestHelper.removeFieldsFromJsonl(
        j,
        'generator.version',
        'uuid',
        'time',
        'incident.name',
        'siem_id',
        'labels',
        '_subjects',
        '_objects',
        '_rule',
        'subevents',
        'subevents.time'
      )
    );
  }

  /**
   * Очищает, сортирует и форматирует json ожидаемого события
   * @param testCode строка с ожидаемым событием в json
   * @returns результирующее ожидаемое событие в json
   */
  public static cleanSortFormatExpectedEventTestCode(expectedEvent: string): string {
    try {
      let object = JSON.parse(expectedEvent);
      object = TestHelper.removeKeys(object, [
        'body', // Встречается в нормализованных (обогащенных) событиях

        '_subjects',
        '_objects',
        '_rule',

        'time',

        'taxonomy_version',
        'generator.version',
        'generator.type',

        'count', // Количество агрегированных инцидентов

        'uuid',
        'incident.name',

        'primary_siem_app_id',
        'siem_id',
        'origin_app_id',

        'normalized',
        'labels',

        'subevents',
        'subevents.time',

        TestHelper.APPLIED_ENRICHMENT_RULES_FIELD
      ]);
      object = JsHelper.sortObjectKeys(object);
      return JsHelper.formatJsonObject(object);
    } catch (error) {
      throw new XpException('Полученные данные не являются событием формата json', error);
    }
  }

  /**
   * Возвращает путь к результату интеграционных тестов. Данный путь существует только тогда, когда включено сохранение временных файлов. В противном случае директория очищается.
   * @param integrationTestsTmpDirPath
   * @param testNumber
   */
  public static getEnrichedNormEventFilePath(
    config: Configuration,
    integrationTestsTmpDirPath: string,
    ruleName: string,
    testNumber: number
  ): string {
    // c:\Users\username\AppData\Local\Temp\eXtraction and Processing\eca77764-57c3-519a-3ad1-db70584b924e\2023-10-02_18-43-35_unknown_sdk_gbto4rfk\RuleName\tests\
    const files = FileSystemHelper.getRecursiveFilesSync(integrationTestsTmpDirPath);
    const resultEvents = files.filter((fp) => {
      const siemjVersion = GetSIEMJVersion(config);
      switch (siemjVersion) {
        case SIEMJVersion.First:
          return RegExpHelper.getEnrichedNormTestEventsFileNameV1(ruleName, testNumber).test(fp);
        case SIEMJVersion.Second:
          return RegExpHelper.getEnrichedCorrTestEventsFileNameV2(ruleName, testNumber).test(fp);
        default:
          throw new XpException('Unknown SIEMJ version.');
      }
    });

    const actualEventsFilePath = TestHelper.preferActualEventsFile(resultEvents);
    if (actualEventsFilePath) {
      return actualEventsFilePath;
    }

    if (resultEvents.length > 1) {
      throw new XpException(
        'Найдено больше одного файла обогащенного нормализованного события, перезапустите VSCode и попробуйте еще раз'
      );
    }

    return undefined;
  }

  /**
   * Выбирает единственный файл с результатами теста. Новые утилиты KBT сохраняют рядом файл фактических
   * событий и подробный отчет, файл событий приоритетнее.
   * @param resultFilePaths файлы, подходящие под шаблон имени результатов теста
   * @returns путь к файлу с результатами или undefined, если однозначно выбрать файл не удалось
   */
  private static preferActualEventsFile(resultFilePaths: string[]): string | undefined {
    if (resultFilePaths.length === 1) {
      return resultFilePaths[0];
    }

    const actualEventsFilePaths = resultFilePaths.filter((fp) => /_events\.txt$/i.test(fp));
    if (actualEventsFilePaths.length === 1) {
      return actualEventsFilePaths[0];
    }

    return undefined;
  }

  /**
   * Возвращает путь к результату интеграционных тестов. Данный путь существует только тогда, когда включено сохранение временных файлов. В противном случае директория очищается.
   * @param integrationTestsTmpDirPath
   * @param testNumber
   */
  public static getEnrichedCorrEventFilePath(
    config: Configuration,
    integrationTestsTmpDirPath: string,
    ruleName: string,
    testNumber: number
  ): string {
    const files = FileSystemHelper.getRecursiveFilesSync(integrationTestsTmpDirPath);
    const resultEvents = files.filter((fp) => {
      const siemjVersion = GetSIEMJVersion(config);
      switch (siemjVersion) {
        case SIEMJVersion.First:
          return RegExpHelper.getEnrichedCorrTestEventsFileNameV1(ruleName, testNumber).test(fp);
        case SIEMJVersion.Second:
          return RegExpHelper.getEnrichedCorrTestEventsFileNameV2(ruleName, testNumber).test(fp);
        default:
          throw new XpException('Unknown SIEMJ version.');
      }
    });

    const actualEventsFilePath = TestHelper.preferActualEventsFile(resultEvents);
    if (actualEventsFilePath) {
      return actualEventsFilePath;
    }

    if (resultEvents.length > 1) {
      throw new XpException(
        'Найдено больше одного файла обогащенного корреляционного события, перезапустите VSCode и попробуйте еще раз'
      );
    }

    return undefined;
  }

  public static extractEventsFromResultString(
    config: Configuration,
    actualEventsString: string,
    ruleName: string,
    testNumber: number
  ): string[] {
    const siemjVersion = GetSIEMJVersion(config);
    if (siemjVersion == SIEMJVersion.Second) {
      const events = parseSiemj2Events(actualEventsString);
      if (events.length === 0) {
        throw new XpException(
          `Фактическое событие интеграционного теста №${testNumber} правила ${ruleName} пусто`
        );
      }

      return events;
    } else {
      return actualEventsString.split(/\r?\n/).filter((l) => l);
    }
  }

  // TODO: delete unused function
  public static getCorrEventEventFilePath(
    integrationTestsTmpDirPath: string,
    ruleName: string,
    testNumber: number
  ): string {
    // c:\Users\username\AppData\Local\Temp\eXtraction and Processing\eca77764-57c3-519a-3ad1-db70584b924e\2023-10-02_18-43-35_unknown_sdk_gbto4rfk\RuleName\tests\
    const files = FileSystemHelper.getRecursiveFilesSync(integrationTestsTmpDirPath);
    const resultEvents = files.filter((fp) => {
      return RegExpHelper.getCorrTestEventsFileName(ruleName, testNumber).test(fp);
    });

    if (resultEvents.length === 1) {
      return resultEvents[0];
    }

    if (resultEvents.length > 1) {
      throw new XpException(
        'Найдено больше одного файла корреляционного события, перезапустите VSCode и попробуйте еще раз'
      );
    }

    return undefined;
  }

  public static cleanModularTestResult(formattedTestCode: string): string {
    if (!formattedTestCode) {
      return '';
    }

    let object = JSON.parse(formattedTestCode);
    object = TestHelper.removeKeys(object, [
      'generator.version',
      'uuid',
      'siem_id',
      'labels',

      '_rule',
      '_subjects',
      '_objects',

      'subevents',
      'subevents.time'
    ]);
    object = JsHelper.sortObjectKeys(object);
    return JsHelper.formatJsonObject(object);
  }

  /**
   * Убираем пробельные символы из ошибки.
   * @param fileContent код правила.
   * @param diagnostics список ошибок, полученный из разбора лога.
   * @returns список ошибок, в котором задан начальный символ строки первым не пробельным символом.
   */
  public static correctWhitespaceCharacterFromErrorLines(
    fileContent: string,
    diagnostics: vscode.Diagnostic[]
  ): vscode.Diagnostic[] {
    if (!fileContent) {
      return [];
    }

    const fixedContent = fileContent.replace(/(\r\n)/gm, '\n');
    const lines = fixedContent.split('\n');

    return diagnostics.map((d) => {
      const lineNumber = d.range.start.line;

      // Ссылка на строку, которой нет файле
      if (lineNumber >= lines.length) {
        Log.warn(
          `В файле ${d.source} не удалось скорректировать ссылку на ошибку, так как указанная строка больше фактического количества строк в файле`
        );
        return d;
      }

      const errorLine = lines[lineNumber];
      const firstNonWhitespaceCharacterIndex = errorLine.search(/[^\s]/);

      // Если не удалось скорректировать, тогда возвращаем как ест.
      if (firstNonWhitespaceCharacterIndex === -1) {
        return d;
      }

      d.range = new vscode.Range(
        new vscode.Position(d.range.start.line, firstNonWhitespaceCharacterIndex),
        d.range.end
      );

      return d;
    });
  }

  /**
   * Сжатие json-событий.
   * @param rawEvents строка с сырыми событиями
   * @param isStrict обязательно ли должен встретиться JSON в строке
   * @returns строка с сырыми событиями, в которых json-события сжаты
   */
  public static compressJsonRawEvents(rawEvents: string, isStrict = false): string {
    return this.compressFormattedJsons(rawEvents, /^{$[\s\S]+?^}/gm, isStrict);
  }

  /**
   *
   * @param testCode
   * @param isStrict обязательно ли должен встретиться JSON в строке
   * @returns
   */
  public static compressTestCode(testCode: string, isStrict = false): string {
    return this.compressFormattedJsons(testCode, /{$[\s\S]+?^}/gm, isStrict);
  }

  /**
   *
   * @param input
   * @param regEx
   * @param isStrict обязательно ли должен встретиться JSON в строке
   * @returns
   */
  public static compressFormattedJsons(input: string, regEx: RegExp, isStrict = false): string {
    let comNormEventResult: RegExpExecArray | null;
    let compressedJson = input;

    let isJsonDetected = false;
    if (!isStrict) {
      isJsonDetected = true;
    }
    while ((comNormEventResult = regEx.exec(input))) {
      if (comNormEventResult.length != 1) {
        continue;
      }

      isJsonDetected = true;
      const jsonRawEvent = comNormEventResult[0];
      try {
        const jsonObject = JSON.parse(jsonRawEvent);
        const compressedEventString = JSON.stringify(jsonObject);

        compressedJson = compressedJson.replace(jsonRawEvent, function () {
          return compressedEventString;
        });
      } catch (error) {
        throw new XpException(
          'Не удалось распарсить JSON. Проверьте корректность сохраняемых данных',
          error
        );
      }
    }

    if (!isJsonDetected) {
      throw new XpException(
        'Не удалось обнаружить JSON. Проверьте корректность сохраняемых данных и выбираемый конверт'
      );
    }

    return compressedJson.trim();
  }

  public static removeFieldsFromJsonl(jsonlStr: string, ...fields: string[]): string {
    let jsonlCleaned = '';
    try {
      const jsonLines = StringHelper.splitTextOnLines(jsonlStr);

      jsonlCleaned = jsonLines
        .map((nes) => JSON.parse(nes))
        .map((neo) => {
          // Очищаем поля из списка.
          for (const field of fields) {
            if (neo[field]) {
              delete neo[field];
            }
          }

          return neo;
        })
        .map((neo) => JSON.stringify(neo))
        .join(os.EOL);
    } catch (error) {
      throw new XpException(`Ошибка очистки JSON от полей: ${fields.join(', ')}`, error);
    }

    return jsonlCleaned;
  }

  /**
   * Сортирует поля каждого события в JSONL: сначала subject/action/object/status,
   * затем остальные поля по алфавиту. Возвращает pretty-printed JSON.
   */
  public static sortNormalizedEventsJsonl(jsonlStr: string): string {
    if (!jsonlStr) {
      return jsonlStr;
    }
    return StringHelper.splitTextOnLines(jsonlStr)
      .filter(line => line.trim())
      .map(line => {
        try {
          const obj = JSON.parse(line);
          const sorted = JsHelper.sortEventKeys(obj, EVENT_PRIORITY_FIELDS);
          return JsHelper.formatJsonObject(sorted);
        } catch {
          return line;
        }
      })
      .join(os.EOL);
  }

  public static isDefaultLocalization(localization: string): boolean {
    // account start process success на узле wks01.testlab.esc
    const defaultLocRegExp = /^[a-z_0-9]+ [a-z_0-9]+ [a-z_0-9]+ [a-z_0-9]+ (на узле|on host) \S+$/g;
    return defaultLocRegExp.test(localization);
  }

  public static formatTestCodeAndEvents(testCode: string, priorityFields: string[] = []): string {
    const compressedNormalizedEventReg = /({\S.+})\s*$/gm;

    let formattedTestCode = testCode;
    let comNormEventResult: RegExpExecArray | null;
    while ((comNormEventResult = compressedNormalizedEventReg.exec(testCode))) {
      if (comNormEventResult.length != 2) {
        continue;
      }

      const compressedEvent = comNormEventResult[1];
      const escapedCompressedEvent = TestHelper.escapeRawEvent(compressedEvent);

      // Форматируем событие и сортируем поля объекта, чтобы поля групп типа subject.* были рядом.
      try {
        const compressEventJson = JSON.parse(escapedCompressedEvent);
        // С пустым priorityFields поля сортируются просто по алфавиту.
        const orderedCompressEventJson = JsHelper.sortEventKeys(compressEventJson, priorityFields);
        const formattedEvent = JsHelper.formatJsonObject(orderedCompressEventJson);
        formattedTestCode = formattedTestCode.replace(compressedEvent, function () {
          return formattedEvent;
        });
      } catch (error) {
        // Если не удалось отформатировать, пропускаем и пишем в лог.
        Log.error(error, `Не удалось отформатировать событие ${compressedEvent}`);
        continue;
      }
    }

    return formattedTestCode;
  }

  // Пока не используется, может пригодиться в дальнейшем.
  // Если при сжатии понадобится сортировка.
  public static minifyJSONInText(testCode: string): string {
    const compressedNormalizedEventReg = /\{.*?\}$/gms;

    let formattedTestCode = testCode;
    let comNormEventResult: RegExpExecArray | null;
    while ((comNormEventResult = compressedNormalizedEventReg.exec(testCode))) {
      if (comNormEventResult.length != 1) {
        continue;
      }

      const compressedEvent = comNormEventResult[0];
      const escapedCompressedEvent = TestHelper.escapeRawEvent(compressedEvent);

      // Форматируем событие и сортируем поля объекта, чтобы поля групп типа subject.* были рядом.
      try {
        const compressEventJson = JSON.parse(escapedCompressedEvent);
        const orderedCompressEventJson = JsHelper.sortObjectKeys(compressEventJson);
        const formattedEvent = JSON.stringify(orderedCompressEventJson);
        formattedTestCode = formattedTestCode.replace(compressedEvent, function () {
          return formattedEvent;
        });
      } catch (error) {
        // Если не удалось отформатировать, пропускаем и пишем в лог.
        console.warn(`Ошибка сжатия события ${compressedEvent}.`);
        continue;
      }
    }

    return formattedTestCode;
  }

  public static async saveIntegrationTest(rule: RuleBaseItem, message: any) {
    // Новый тест или уже существующий.
    let test: IntegrationTest;
    if (message?.test) {
      test = IntegrationTest.convertFromObject(message.test);
    } else {
      test = rule.createIntegrationTest();
    }

    // Сырые события.
    const rawEvents = message?.newValues?.rawEvents;
    if (!rawEvents) {
      throw new Error(
        `В тест №${test.getNumber()} не добавлены сырые события. Добавьте их и повторите действие.`
      );
    }

    // Если обновляем сырые событиях, то разумно убрать нормализованные события, если такие есть.
    test.setRawEvents(rawEvents);
    test.setNormalizedEvents('');

    // Сохраняем код теста.
    // Когда хотим получить нормализованное событие, код теста не задаем, поэтому позволяю сохранить без него.
    const testCode = message?.newValues?.testCode;
    if (testCode) {
      const compressedTestCode = TestHelper.compressTestCode(testCode);
      test.setTestCode(compressedTestCode);
    }

    // Номер активного теста.
    const activeTestNumberString = message?.activeTestNumber;
    if (!activeTestNumberString) {
      throw new Error(`Не задан номер активного теста.`);
    }

    // Обновление или добавление теста.
    const tests = rule.getIntegrationTests();
    const testIndex = tests.findIndex((it) => it.getNumber() == test.getNumber());
    if (testIndex == -1) {
      tests.push(test);
    } else {
      tests[testIndex] = test;
    }

    test.save();
    return test;
  }

  public static async saveUnitTest(rule: RuleBaseItem, message: any) {
    // Новый тест или уже существующий.
    let test: BaseUnitTest;
    if (message?.test) {
      test = rule.convertUnitTestFromObject(message.test);
    } else {
      test = rule.createNewUnitTest();
    }

    // Сырые события.
    const rawEvent = message?.newValues?.rawEvent;
    if (!rawEvent) {
      throw new Error(
        `Не заданы сырые события для теста №${test.getNumber()}. Добавьте их и повторите.`
      );
    }

    // Если обновляем сырые событиях, то разумно убрать нормализованные события, если такие есть.
    test.setTestInputData(rawEvent);

    // Сохраняем код теста.
    // Когда хотим получить нормализованное событие, код теста не задаем, поэтому позволяю сохранить без него.
    const expectation = message?.newValues?.expectation;
    if (expectation) {
      const compressedTestCode = TestHelper.compressTestCode(expectation);
      test.setTestExpectation(compressedTestCode);
    }

    // Номер активного теста.
    const activeTestNumberString = message?.activeTestNumber;
    if (!activeTestNumberString) {
      throw new Error(`Не задан номер активного теста.`);
    }

    // Обновление или добавление теста.
    const tests = rule.getUnitTests();
    const testIndex = tests.findIndex((it) => it.getNumber() == test.getNumber());
    if (testIndex == -1) {
      tests.push(test);
    } else {
      tests[testIndex] = test;
    }

    test.save();
    return test;
  }
  /**
   * Проверяет по специфичным конструкциям, использует ли правило subrules.
   * @param ruleCode код правила
   */
  public static isRuleCodeContainsSubrules(ruleCode: string): boolean {
    // Сбрасываем состояние после предыдущего выполнения.
    this.CORRELATION_NAME_COMPARE_REGEX.lastIndex = 0;
    this.LOWER_CORRELATION_NAME_COMPARE_REGEX.lastIndex = 0;
    this.INLIST_LOWER_CORRELATION_NAME_REGEX.lastIndex = 0;
    this.INLIST_CORRELATION_NAME_REGEX.lastIndex = 0;

    if (
      this.CORRELATION_NAME_COMPARE_REGEX.test(ruleCode) ||
      this.LOWER_CORRELATION_NAME_COMPARE_REGEX.test(ruleCode) ||
      this.INLIST_LOWER_CORRELATION_NAME_REGEX.test(ruleCode) ||
      // in_list([
      // 	"Subrule_Windows_Host_Abnormal_Access",
      // 	"Subrule_Unix_Server_Abnormal_Access"
      // ], correlation_name)
      this.INLIST_CORRELATION_NAME_REGEX.test(ruleCode)
    ) {
      return true;
    }
    return false;
  }

  public static parseSubRuleNamesFromKnownOperation(ruleCode: string): string[] {
    // Сбрасываем состояние после предыдущего выполнения.
    this.CORRELATION_NAME_COMPARE_REGEX.lastIndex = 0;
    this.LOWER_CORRELATION_NAME_COMPARE_REGEX.lastIndex = 0;
    this.INLIST_LOWER_CORRELATION_NAME_REGEX.lastIndex = 0;
    this.INLIST_CORRELATION_NAME_REGEX.lastIndex = 0;

    // const correlationNameCompareRegex = /correlation_name\s*==\s*"(\w+)"/gm;
    const correlationNameCompareRegexResult = RegExpHelper.parseValues(
      ruleCode,
      this.CORRELATION_NAME_COMPARE_REGEX,
      'gm'
    );

    // const correlationNameWithLowerCompareRegex = /lower\(\s*correlation_name\s*\)\s*==\s*"(\w+)"/gm;
    const correlationNameWithLowerCompareRegexResult = RegExpHelper.parseValues(
      ruleCode,
      this.LOWER_CORRELATION_NAME_COMPARE_REGEX,
      'gm'
    );

    // const correlationNameWithLowerInListRegex = /in_list\(\s*(\[[\w\W]+\])\s*,\s*lower\(correlation_name\)/gm;
    const correlationNameWithLowerInListRegexResult = RegExpHelper.parseJsArrays(
      ruleCode,
      this.INLIST_LOWER_CORRELATION_NAME_REGEX,
      'gm'
    );

    const correlationNameInListRegexResult = RegExpHelper.parseJsArrays(
      ruleCode,
      this.INLIST_CORRELATION_NAME_REGEX,
      'gm'
    );

    return correlationNameCompareRegexResult
      .concat(correlationNameWithLowerCompareRegexResult)
      .concat(correlationNameWithLowerInListRegexResult)
      .concat(correlationNameInListRegexResult);
  }

  public static isCorrelationNameUsedInFilter(ruleCode: string): boolean {
    return /filter\s+{[\s\S]+?correlation_name[\s\S]+?}/gm.test(ruleCode);
  }

  public static escapeRawEvent(normalizedEvent: string): string {
    return normalizedEvent
      .replace(/\\n/g, '\\n')
      .replace(/\\'/g, "\\'")
      .replace(/\\"/g, '\\"')
      .replace(/\\&/g, '\\&')
      .replace(/\\r/g, '\\r')
      .replace(/\\t/g, '\\t')
      .replace(/\\b/g, '\\b')
      .replace(/\\f/g, '\\f');
  }

  public static APPLIED_ENRICHMENT_RULES_FIELD = '_applied_enrichment_rules';

  private static CORRELATION_NAME_COMPARE_REGEX = /correlation_name\s*==\s*"(\w+)"/gm;
  private static LOWER_CORRELATION_NAME_COMPARE_REGEX =
    /lower\s*\(\s*correlation_name\s*\)\s*==\s*"(\w+)"/gm;

  private static INLIST_LOWER_CORRELATION_NAME_REGEX =
    /in_list\s*\(\s*(\[[\w\W]+\])\s*,\s*lower\s*\(\s*correlation_name\s*\)/gm;
  private static INLIST_CORRELATION_NAME_REGEX =
    /in_list\s*\(\s*(\[[^)]+\])\s*,\s*correlation_name\s*\)/gm;
}
