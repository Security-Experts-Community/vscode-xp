import * as vscode from 'vscode';
import { FileSystemHelper } from './fileSystemHelper';

export interface IResultTestFiles {
  detailedReportFilePath: string;
  actualEventsFilePath: string;
}

export class RegExpHelper {
  public static getExpectSectionRegExp(): RegExp {
    return /expect\s*(\d+|not)\s*{(.*)}/gm;
  }

  public static getEnrichedNormTestEventsFileNameV1(ruleName: string, testNumber?: number): RegExp {
    let regExpTemplate: string;
    if (testNumber) {
      regExpTemplate = `.+?${ruleName}.+?raw_events_${testNumber}_norm_(agg_)?enr\.json`;
    } else {
      regExpTemplate = `.+?${ruleName}.+?raw_events_\\d+_norm_(agg_)?enr\.json`;
    }

    return RegExp(regExpTemplate, 'i');
  }

  public static getEnrichedCorrTestEventsFileNameV1(ruleName: string, testNumber?: number): RegExp {
    let regExpTemplate: string;
    if (testNumber) {
      regExpTemplate = `.+?${ruleName}.+?raw_events_${testNumber}_norm_(agg_)?enr_cor(r)?_(agg_)?enr\.json`;
    } else {
      regExpTemplate = `.+?${ruleName}.+?raw_events_\\d+_norm_(agg_)?enr_cor(r)?_(agg_)?enr\.json`;
    }

    return RegExp(regExpTemplate, 'i');
  }

  public static getEnrichedCorrTestEventsFileNameV2(ruleName: string, testNumber?: number): RegExp {
    let regExpTemplate: string;
    if (testNumber) {
      regExpTemplate = `.*test_conds_${testNumber}_result.txt`;
    } else {
      regExpTemplate = `.*test_conds_(\d+)_result.txt`;
    }

    return RegExp(regExpTemplate, 'i');
  }

  public static getEnrichedCorrTestEventsFileNameNew(
    consoleOutput: string
  ): Map<string, IResultTestFiles> {
    var resulults = new Map<string, IResultTestFiles>();

    const detaledReportRegex = /Detailed report: (.*test_conds_(\d+)_result.txt)/g;
    for (const fileInfo of [...consoleOutput.matchAll(detaledReportRegex)]) {
      const testNumber = fileInfo[2];
      const detailedReportFilePath = fileInfo[1];
      if (!resulults.has(testNumber)) {
        resulults.set(testNumber, { detailedReportFilePath: '', actualEventsFilePath: '' });
      }
      resulults.get(testNumber).detailedReportFilePath = detailedReportFilePath;
    }

    const actualEventsRegex = /Actual events: (.*test_conds_(\d+)_events.txt)/g;
    for (const fileInfo of [...consoleOutput.matchAll(actualEventsRegex)]) {
      const testNumber = fileInfo[2];
      const actualEventsFilePath = fileInfo[1];
      if (!resulults.has(testNumber)) {
        resulults.set(testNumber, { detailedReportFilePath: '', actualEventsFilePath: '' });
      }
      resulults.get(testNumber).actualEventsFilePath = actualEventsFilePath;
    }
    return resulults;
  }

  public static getEnrichedCorrTestEventsFileNameFromDirectory(
    directoryPath: string
  ): Map<string, IResultTestFiles> {
    const results = new Map<string, IResultTestFiles>();
    const files = FileSystemHelper.getRecursiveFilesSync(directoryPath);

    for (const filePath of files) {
      const detailedReportMatch = /test_conds_(\d+)_result\.txt$/i.exec(filePath);
      if (detailedReportMatch) {
        const testNumber = detailedReportMatch[1];
        if (!results.has(testNumber)) {
          results.set(testNumber, { detailedReportFilePath: '', actualEventsFilePath: '' });
        }
        results.get(testNumber).detailedReportFilePath = filePath;
      }

      const actualEventsMatch = /test_conds_(\d+)_events\.txt$/i.exec(filePath);
      if (actualEventsMatch) {
        const testNumber = actualEventsMatch[1];
        if (!results.has(testNumber)) {
          results.set(testNumber, { detailedReportFilePath: '', actualEventsFilePath: '' });
        }
        results.get(testNumber).actualEventsFilePath = filePath;
      }
    }

    return results;
  }

  public static getCorrTestEventsFileName(ruleName: string, testNumber?: number): RegExp {
    let regExpTemplate: string;
    if (testNumber) {
      regExpTemplate = `.+?${ruleName}.+?raw_events_${testNumber}_norm_(agg_)?enr_cor(r)\.json`;
    } else {
      regExpTemplate = `.+?${ruleName}.+?raw_events_\\d+_norm_(agg_)?enr_cor(r)?\.json`;
    }

    return RegExp(regExpTemplate, 'i');
  }

  public static getSingleExpectEvent(text: string): string {
    const result = /expect\s*(?:\d+|not)\s*({.*})/gm.exec(text);

    if (!result || result.length !== 2) {
      return null;
    }

    return result[1];
  }

  public static parseJsonsFromMultilineString(str: string): string[] {
    const jsons: string[] = [];
    let currResult: RegExpExecArray | null;
    const regExp = /^\{[\s\S]+\}/gm;
    while ((currResult = regExp.exec(str))) {
      const curValue = currResult[0];
      jsons.push(curValue);
    }

    return jsons;
  }

  public static parseJsonsFromMultilineStringSIEMJ2(str: string): string {
    const regExp = /^Event (\{[\s\S]+\}):/gm;
    const currResult = regExp.exec(str);
    if (currResult.length == 2) {
      return currResult[1];
    }
    return '';
  }

  /**
   * Выделяет из текста все вхождения первой группы
   * @param inputText входной текст
   * @param regExp регулярное выражение с захватом одной группы
   * @returns список выделенных подстрок
   */
  public static getAllStrings(inputText: string, regExp: RegExp): string[] {
    const strings: string[] = [];
    let curResult: RegExpExecArray | null;
    while ((curResult = regExp.exec(inputText))) {
      if (curResult.length !== 2) {
        continue;
      }
      const curValue = curResult[1];
      strings.push(curValue);
    }

    return strings;
  }

  /**
   * Заменяет выражение подходящее под регулярку на содержимое первой группы.
   * @param inputText
   * @param regExp
   * @returns результирующая строка.
   */
  public static replaceAllStrings(inputText: string, regExp: RegExp): string {
    if (!inputText) {
      return '';
    }
    let curResult: RegExpExecArray | null;
    while ((curResult = regExp.exec(inputText))) {
      const arrayElement = curResult[0];
      const firstGroup = curResult[1];

      inputText = inputText.replace(arrayElement, firstGroup);
    }
    return inputText;
  }

  /**
   * Парсит элементы по регулярному выражение и собирает их в единый список.
   * Регулярное выражение собирает значение первой группы и только они попадают в массив.
   * @param text строка
   * @param regExp регулярное выражение с заполненной второй группой
   * @returns
   */
  public static parseValues(text: string, reg: string | RegExp, flags: string): string[] {
    const values: string[] = [];
    let parseResult: RegExpExecArray | null;

    const regExp = new RegExp(reg, flags);
    while ((parseResult = regExp.exec(text))) {
      if (parseResult.length != 2) {
        continue;
      }

      const value: string = parseResult[1];
      values.push(value);
    }
    return values;
  }

  /**
   * Парсить js-массивы ([1, 2, 3]) из строки по регулярному выражению и объединяет их в единый список.
   * Регулярное выражение собирает значение первой группы и только они попадают в массив.
   * @param text строка
   * @param regExp регулярное выражение с заполненной второй группой
   * @returns совокупный список всех элементов
   */
  public static parseJsArrays(text: string, reg: string | RegExp, flags: string): string[] {
    let parseResult: RegExpExecArray | null;
    const regExp = new RegExp(reg, flags);
    const elements: string[] = [];
    while ((parseResult = regExp.exec(text))) {
      if (parseResult.length != 2) {
        continue;
      }

      const array: string = parseResult[1];
      // Чистим от возможных комментариев.
      // [
      // 	"Super_Duper_SubRule", # Тут есть комментарий
      // ];
      let elementsResult: RegExpExecArray | null;

      const elementRegExp = /(?<!#.*?)"(\w+?)"/gm;
      while ((elementsResult = elementRegExp.exec(array))) {
        if (elementsResult.length != 2) {
          continue;
        }
        const currElem = elementsResult[1];
        elements.push(currElem);
      }
    }

    return elements;
  }

  public static parseFunctionCalls(
    text: string,
    lineNumber: number,
    functionNames: string[]
  ): vscode.Range[] {
    const functionCallRegEx = /(?:.*?)([A-Za-z0-9_]+)\(/g;

    const functionCalls: vscode.Range[] = [];

    // Проходимся по каждой строке для того чтобы получить нужные Position в документе.
    let parseResult: RegExpExecArray | null;
    let prevFunctionNameIndex = 0;
    while ((parseResult = functionCallRegEx.exec(text))) {
      if (parseResult.length != 2) {
        continue;
      }

      // Находим вызов функции.
      const functionCall = parseResult[1];
      if (!functionNames.includes(functionCall)) {
        continue;
      }

      // Рассчитываем позицию вызова функции в коде.
      const beginIndex = text.indexOf(functionCall + '(', prevFunctionNameIndex);
      const endIndex = beginIndex + functionCall.length;

      // Проверка наличия комментария в строке.
      const fromStringBeginToFunctionCall = text.substring(0, endIndex);
      const isCommented = fromStringBeginToFunctionCall.indexOf('#');
      if (isCommented !== -1) {
        continue;
      }

      // TODO: добавить валидацию lineNumber, если будет меньше нуля, то будет исключение.
      functionCalls.push(
        new vscode.Range(
          new vscode.Position(lineNumber, beginIndex),
          new vscode.Position(lineNumber, endIndex)
        )
      );

      // Сдвигаемся на одну позицию.
      prevFunctionNameIndex = beginIndex + 1;
    }

    return functionCalls;
  }
}
