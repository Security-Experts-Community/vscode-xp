import { Diagnostic, DiagnosticSeverity } from 'vscode-languageserver/node';

import { TextDocument } from 'vscode-languageserver-textdocument';

import { IValidator } from './IValidator';

export class ImportanceAndSeverityValidator extends IValidator {
  constructor() {
    super(['co']);
  }

  async validateImpl(textDocument: TextDocument): Promise<Diagnostic[]> {
    if (!this._languageIds.includes(textDocument.languageId)) {
      return [];
    }

    const text = textDocument.getText();

    // Получаем значение $importance
    const importanceRegExp = /\$importance\s*=\s*"(\S+?)"/gm;
    const importanceResult = importanceRegExp.exec(text);
    if (!importanceResult) {
      return [];
    }

    if (importanceResult.length != 2) {
      return [];
    }

    const importanceValue = importanceResult[1];

    // Получаем значение $incident.severity
    const severityRegExp = /\$incident\.severity\s*=\s*"(\S+?)"/gm;
    const severityResult = severityRegExp.exec(text);
    if (!severityResult) {
      return [];
    }

    if (severityResult.length != 2) {
      return [];
    }

    const severityValue = severityResult[1];

    // Либо значений совпадают, либо incident.severity переприсваивается от $importance
    if (importanceValue === severityValue || severityValue === '$importance') {
      return [];
    }

    const diagnostic = this.getDiagnosticByRegExpResult(
      severityResult,
      textDocument,
      'Важность сработки $importance и важность инцидента $incident.severity отличается.',
      DiagnosticSeverity.Warning
    );

    return [diagnostic];
  }
}
