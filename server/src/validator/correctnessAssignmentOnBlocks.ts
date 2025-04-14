import { Diagnostic, DiagnosticSeverity } from 'vscode-languageserver/node';

import { TextDocument } from 'vscode-languageserver-textdocument';

import { IValidator } from './IValidator';
import { DocumentSettings, getDocumentSettings } from '../server';

export class CorrectnessAssignmentOnBlocks extends IValidator {
  constructor() {
    super(['co']);
  }

  async validateImpl(textDocument: TextDocument): Promise<Diagnostic[]> {
    if (!this._languageIds.includes(textDocument.languageId)) {
      return [];
    }

    const documentSettings = await getDocumentSettings(textDocument.uri);

    let filterBlockResult: RegExpExecArray | null;
    const diagnostics: Diagnostic[] = [];
    const text = textDocument.getText();
    const filterBlocksRegEx = /(on\s+\S+|emit)\s*{([\s\S]*?)}/gm;

    while ((filterBlockResult = filterBlocksRegEx.exec(text))) {
      if (filterBlockResult.length != 3) continue;

      const blockName = filterBlockResult[1];
      const blockCode = filterBlockResult[2];

      const blockDiagnostics = await this.validateFilterBlock(
        blockName,
        blockCode,
        filterBlockResult.index,
        textDocument,
        documentSettings
      );
      diagnostics.push(...blockDiagnostics);
    }

    return diagnostics;
  }

  private async validateFilterBlock(
    blockName: string,
    blockCode: string,
    blockOffset: number,
    textDocument: TextDocument,
    settings: DocumentSettings
  ): Promise<Diagnostic[]> {
    let problems = 0;
    const diagnostics: Diagnostic[] = [];
    const incorrectEqualsRegEx = /^\s+([a-z.0-9_]+)\s*=(?!=)\s*\S+/gm;

    let incorrectEqualsResult: RegExpExecArray | null;
    while (
      (incorrectEqualsResult = incorrectEqualsRegEx.exec(blockCode)) &&
      problems < settings.maxNumberOfProblems
    ) {
      problems++;

      if (incorrectEqualsResult.length != 2) continue;

      const incorrectCode = incorrectEqualsResult[0];
      const eventField = incorrectEqualsResult[1];

      const incorrectEqualsDiagnostic = this.getDiagnosticsByOffset(
        incorrectCode,
        blockOffset + incorrectEqualsResult.index,
        textDocument,
        `В блоке '${blockName}' запрещено присвоение значения полю ${eventField} события. Используйте $${eventField}`,
        DiagnosticSeverity.Error
      );

      diagnostics.push(incorrectEqualsDiagnostic);
    }

    return diagnostics;
  }
}
