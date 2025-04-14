import { Configuration } from '../models/configuration';
import { OsType } from '../models/locator/pathLocator';

export class StringHelper {
  /**
   * Позволяет избежать поведения, когда из replaceValue пропадают символы доллара
   * https://stackoverflow.com/questions/9423722/string-replace-weird-behavior-when-using-dollar-sign-as-replacement
   * @param str
   * @param searchValue
   * @param replaceValue
   * @returns
   */
  public static safeReplace(str: string, searchValue: string, replaceValue: string): string {
    return str.replace(searchValue, function () {
      return replaceValue;
    });
  }

  /**
   * Объединяет сообщения на уровне предложений, то есть добавляет если необходимо точку.
   * @param first
   * @param second
   * @returns
   */
  public static combiningMessages(first: string, second: string): string {
    if (first.endsWith('.')) {
      return `${first} ${second}`;
    } else {
      return `${first}. ${second}`;
    }
  }

  public static crossPlatformPathCompare(left: string, right: string, osType: OsType): boolean {
    switch (osType) {
      case OsType.Windows: {
        return left.toLowerCase() === right.toLocaleLowerCase();
      }
      case OsType.Mac:
      case OsType.Linux: {
        return left === right;
      }
    }
  }

  public static textToOneLine(str: string): string {
    if (!str) {
      return '';
    }
    return str.replace(/(?:\r\n|\r|\n)/g, '');
  }

  public static escapeSpecialChars(str: string): string {
    return str
      .replace(/(?<!\\)\n/gm, '\\n')
      .replace(/(?<!\\)\r\n/gm, '\\r\\n')
      .replace(/(?<!\\)\r/gm, '\\r\\n');
  }

  public static textToOneLineAndTrim(str: string): string {
    if (!str) {
      return '';
    }
    return str.replace(/(?:\r\n|\r|\n)/g, '').trim();
  }

  public static splitTextOnLines(str: string): string[] {
    return str
      .replace(/\r?\n/gm, '\n')
      .split('\n')
      .filter((l) => l);
  }

  /**
   * Заменяем нерегулярные юникод-символы, например, неразрывный пробел u00a0 на их регулярный эквивалент.
   * Позволяет спасти зависимые библиотеки от неожиданного строчного входа.
   * @param str
   * @returns
   */
  public static replaceIrregularSymbols(str: string): string {
    return str.replace(/\u00a0/gm, ' ');
  }
}
