import { Diagnostic, DiagnosticSeverity } from 'vscode-languageserver/node';

import { TextDocument } from 'vscode-languageserver-textdocument';

import { IValidator } from './IValidator';
import { getDocumentSettings } from '../server';

export class NestedLowerValidator extends IValidator {
  constructor() {
    super(['co']);
  }

  async validateImpl(textDocument: TextDocument): Promise<Diagnostic[]> {
    if (!this._languageIds.includes(textDocument.languageId)) {
      return [];
    }

    const settings = await getDocumentSettings(textDocument.uri);
    let problems = 0;
    let lowerCallResult: RegExpExecArray | null;
    const diagnostics: Diagnostic[] = [];
    const text = textDocument.getText();

    const nestedCalls = [
      /find_substr\s*\(\s*lower\s*\(\s*\S+\s*\)\s*,\s*"(.+?)"/gm,
      /match\s*\(\s*lower\s*\(\s*\S+\s*\)\s*,\s*"(.+?)"/gm,
      /regex\s*\(\s*lower\s*\(\s*\S+\s*\)\s*,\s*"(.+?)"/gm
    ];

    for (const nestedCall of nestedCalls) {
      while ((lowerCallResult = nestedCall.exec(text)) && problems < settings.maxNumberOfProblems) {
        problems++;

        if (lowerCallResult.length != 2) continue;

        // Удаляем элементы синтаксиса регулярок, содержащие большие буквы.
        let stringLiteral = lowerCallResult[1];

        // Обработаем ситуацию появления ошибки с \System и исключаем \\\\\S в пути.
        stringLiteral = stringLiteral.replace(/(\\A|\\W|\\B|\\S)(\+|\*|\?|\.|$|{)+/gm, '');

        for (const char of stringLiteral) {
          // В литерале есть большая буква, добавляем ошибку.
          if (this.isUpperCase(char)) {
            const diagnostic = this.getDiagnosticByRegExpResult(
              lowerCallResult,
              textDocument,
              'Вероятно, данное условие некорректно, так как регистр первого параметра отличается от второго параметра.',
              DiagnosticSeverity.Warning
            );

            diagnostics.push(diagnostic);
            break;
          }
        }
      }
    }

    return diagnostics;
  }

  private isUpperCase(char: string): boolean {
    return char == char.toUpperCase() && char != char.toLocaleLowerCase();
  }
}
