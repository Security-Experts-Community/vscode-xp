import { Diagnostic, DiagnosticSeverity } from 'vscode-languageserver/node';

import { TextDocument } from 'vscode-languageserver-textdocument';

import { IValidator } from './IValidator';
import { getDocumentSettings } from '../server';

export class WhitelistingAndAlertKeyValidator extends IValidator {
  constructor() {
    super(['co']);
  }

  async validateImpl(textDocument: TextDocument): Promise<Diagnostic[]> {
    if (!this._languageIds.includes(textDocument.languageId)) {
      return [];
    }

    const text = textDocument.getText();
    const diagnostics: Diagnostic[] = [];

    // Для каждого вызова максора вайтлистинга ищем хотя бы один alert.key с таким же значением.
    const whitelistingPattern = /filter::CheckWL_\S+?\(\s*"\S+"\s*,\s*(.*)\s*\)/gm;
    const settings = await getDocumentSettings(textDocument.uri);
    let problems = 0;
    let whitelistingResult: RegExpExecArray | null;
    while (
      (whitelistingResult = whitelistingPattern.exec(text)) &&
      problems < settings.maxNumberOfProblems
    ) {
      problems++;

      if (whitelistingResult.length != 2) continue;

      // В вайтлистинге все поля без долларов, а в alert.key они есть.
      let whitelistingKeyName = whitelistingResult[1];
      const spacesRegEx = /(\s+)/g;
      whitelistingKeyName = whitelistingKeyName.replace(spacesRegEx, '');

      if (this.findAlertKey(text, whitelistingKeyName)) {
        continue;
      }

      // Получение позиции ошибки.
      const whitelistingMacrosCall = whitelistingResult[0];
      const firstParam = whitelistingResult[1];

      const startPosition = whitelistingResult.index + whitelistingMacrosCall.indexOf(firstParam);
      const endPosition = startPosition + firstParam.length;

      const diagnostic: Diagnostic = {
        severity: DiagnosticSeverity.Warning,
        range: {
          start: textDocument.positionAt(startPosition),
          end: textDocument.positionAt(endPosition)
        },
        message:
          'Отличается ключ вайтлистинга в макросе и значение alert.key или alert.key не задан',
        source: 'xp'
      };

      diagnostics.push(diagnostic);
    }

    return diagnostics;
  }

  private findAlertKey(text: string, whitelistingKeyName: string): boolean {
    // Ищем хотя бы один такой же $alert.key
    const alertKeyPattern = /\$alert.key\s*=\s(.+)$/gm;
    let alertKeyResult: RegExpExecArray | null;
    while ((alertKeyResult = alertKeyPattern.exec(text))) {
      if (alertKeyResult.length != 2) {
        continue;
      }

      let alertKeyValue = alertKeyResult[1];

      // Очищаем от пробелов и $
      const dollarRegEx = /(\$|\s+)/g;
      alertKeyValue = alertKeyValue.replace(dollarRegEx, '');

      // Проброс alert.key из сабруля, все ок.
      if (whitelistingKeyName === 'lower(alert.key)') {
        return true;
      }

      if (alertKeyValue === 'alert.key') {
        return true;
      }

      // Если совпадение, тогда все ок идет дальше.
      if (alertKeyValue === whitelistingKeyName) {
        return true;
      }
    }
    return false;
  }
}
