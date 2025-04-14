import * as vscode from 'vscode';

export class ParserHelper {
  public static parseRuleName(ruleCode: string): string {
    const ruleNameRegExpResult = /\brule\b\s+\b([a-z_0-9]+)\b\s*:/gi.exec(ruleCode);
    const enrichmentNameRegExpResult = /\benrichment\b\s+([a-z_0-9]+)/gi.exec(ruleCode);

    if (!ruleNameRegExpResult && !enrichmentNameRegExpResult) {
      return null;
    }

    if (ruleNameRegExpResult && ruleNameRegExpResult.length == 2) {
      return ruleNameRegExpResult[1];
    }

    if (enrichmentNameRegExpResult && enrichmentNameRegExpResult.length == 2) {
      return enrichmentNameRegExpResult[1];
    }

    return null;
  }

  public static parseTokenWithInsidePosition(
    line: vscode.TextLine,
    position: vscode.Position
  ): string {
    const firstNonWhitespaceCharacterIndex = line.firstNonWhitespaceCharacterIndex;
    const mouseOffset = position.character - firstNonWhitespaceCharacterIndex;
    const textLine = line.text.substring(firstNonWhitespaceCharacterIndex);

    // Ищем кусок токена до позиции мышки.
    const beforePart = textLine.substring(0, mouseOffset);
    let startTokenIndex = beforePart.length - 1;
    // TODO: тут проще и лучше сделать регулярками
    // eslint-disable-next-line for-direction
    for (; startTokenIndex > 0; startTokenIndex--) {
      if (beforePart[startTokenIndex] === ' ') {
        startTokenIndex++;
        break;
      }

      // Проверяем предыдущий символ, который надо тоже исключить.
      const prevTokenIndex = startTokenIndex - 1;
      const prevChar = beforePart[prevTokenIndex];
      if (prevTokenIndex > 0 && [')', ']', '(', '[', ','].includes(prevChar)) {
        break;
      }
    }

    const firstPart = beforePart.substring(startTokenIndex);

    // Ищем кусок токена после позиции мышки.
    const afterPart = textLine.substring(mouseOffset);
    let endTokenIndex = 0;
    // TODO: тут проще и лучше сделать регулярками
    for (; endTokenIndex < afterPart.length; endTokenIndex++) {
      if (afterPart[endTokenIndex] === ' ') {
        break;
      }

      // Проверяем следующий символ, который надо тоже исключить.
      const nextTokenIndex = endTokenIndex;
      const nextChar = afterPart[nextTokenIndex];
      if (nextTokenIndex <= afterPart.length - 1 && [')', ']', '(', '[', ','].includes(nextChar)) {
        break;
      }
    }

    const secondPart = afterPart.substring(0, endTokenIndex);
    const selectedToken = firstPart + secondPart;
    return selectedToken;
  }
}
