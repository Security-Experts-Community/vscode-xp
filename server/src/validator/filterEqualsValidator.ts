import { Diagnostic, DiagnosticSeverity } from 'vscode-languageserver/node';

import { TextDocument } from 'vscode-languageserver-textdocument';

import { IValidator } from './IValidator';
import { DocumentSettings, getDocumentSettings } from '../server';

export class FilterEqualsValidator extends IValidator {
  constructor() {
    super(['co', 'en']);
  }

  async validateImpl(textDocument: TextDocument): Promise<Diagnostic[]> {
    if (!this._languageIds.includes(textDocument.languageId)) {
      return [];
    }

    const documentSettings = await getDocumentSettings(textDocument.uri);

    let filterBlockResult: RegExpExecArray | null;
    const diagnostics: Diagnostic[] = [];
    const text = textDocument.getText();
    const filterBlocksRegEx = /filter\s*{([\s\S]*?)}/gm;

    while ((filterBlockResult = filterBlocksRegEx.exec(text))) {
      if (filterBlockResult.length != 2) continue;

      const filterBlock = filterBlockResult[1];

      const blockDiagnostics = await this.validateFilterBlock(
        filterBlock,
        filterBlockResult.index,
        textDocument,
        documentSettings
      );
      diagnostics.push(...blockDiagnostics);
    }

    return diagnostics;
  }

  private async validateFilterBlock(
    filterBlock: string,
    filterOffset: number,
    textDocument: TextDocument,
    settings: DocumentSettings
  ): Promise<Diagnostic[]> {
    let problems = 0;
    const diagnostics: Diagnostic[] = [];
    const incorrectEqualsRegEx = /(\s+\S+\s+=\s+"\S*")/gm;

    let incorrectEqualsResult: RegExpExecArray | null;
    while (
      (incorrectEqualsResult = incorrectEqualsRegEx.exec(filterBlock)) &&
      problems < settings.maxNumberOfProblems
    ) {
      problems++;

      if (incorrectEqualsResult.length != 2) continue;

      const incorrectEquals = incorrectEqualsResult[1];

      const incorrectEqualsDiagnostic = this.getDiagnosticsByOffset(
        incorrectEquals,
        filterOffset + incorrectEqualsResult.index,
        textDocument,
        'В блоке filter сравнение осуществляется с помощью ==',
        DiagnosticSeverity.Error
      );

      diagnostics.push(incorrectEqualsDiagnostic);
    }

    return diagnostics;
  }
}
