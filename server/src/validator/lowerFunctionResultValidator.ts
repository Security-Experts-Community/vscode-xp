import { Diagnostic, DiagnosticSeverity } from 'vscode-languageserver/node';

import { TextDocument } from 'vscode-languageserver-textdocument';

import { IValidator } from './IValidator';
import { getDocumentSettings } from '../server';

export class LowerFunctionResultValidator extends IValidator {
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

    const lowerCall = /lower\s*\(\s*\S+\s*\)\s+(?:==|!=)\s+"(.+)"/gm;

    while ((lowerCallResult = lowerCall.exec(text)) && problems < settings.maxNumberOfProblems) {
      problems++;

      if (lowerCallResult.length != 2) continue;

      const stringLiteral = lowerCallResult[1];
      for (const literalChar of stringLiteral) {
        // В литерале есть большая буква, добавляем ошибку.
        if (this.isUpperCase(literalChar)) {
          const diagnostic = this.getDiagnosticByRegExpResult(
            lowerCallResult,
            textDocument,
            'Данное условие некорректно, так как регистр левого и правого операнда не совпадает.',
            DiagnosticSeverity.Error
          );
          diagnostics.push(diagnostic);
          break;
        }
      }
    }

    return diagnostics;
  }

  private isUpperCase(char: string): boolean {
    return char == char.toUpperCase() && char != char.toLocaleLowerCase();
  }
}
