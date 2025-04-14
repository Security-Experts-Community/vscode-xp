import { Diagnostic, DiagnosticSeverity } from 'vscode-languageserver/node';

import { TextDocument } from 'vscode-languageserver-textdocument';

import { IValidator } from './IValidator';
import { getDocumentSettings } from '../server';

export class TypeToStringConversionValidator extends IValidator {
  constructor() {
    super(['co', 'en']);
  }

  async validateImpl(textDocument: TextDocument): Promise<Diagnostic[]> {
    if (!this._languageIds.includes(textDocument.languageId)) {
      return [];
    }

    const settings = await getDocumentSettings(textDocument.uri);
    let problems = 0;
    let typeConversionResult: RegExpExecArray | null;
    const diagnostics: Diagnostic[] = [];
    const text = textDocument.getText();

    // TODO: проверять все поля с типом Number согласно таксономии.
    const typeConcatination =
      /((?:(?:dst.port|src.port|assigned_dst_port|assigned_src_port|count|dst.geo.asn|src.geo.asn|duration|external_dst.geo.asn|external_src.geo.asn|logon_type|numfield\d+|count|count.bytes|count.bytes_in|count.bytes_out|count.packets|count.packets_in|count.packets_out|count.subevents|incident.aggregation.timeout|object.num_value)\s*\+\s*".*")|(?:".*"\s*\+\s*(?:(?:dst.port|src.port|assigned_dst_port|assigned_src_port|count|dst.geo.asn|src.geo.asn|duration|external_dst.geo.asn|external_src.geo.asn|logon_type|numfield\d+|count|count.bytes|count.bytes_in|count.bytes_out|count.packets|count.packets_in|count.packets_out|count.subevents|incident.aggregation.timeout|object.num_value))))/gm;

    while (
      (typeConversionResult = typeConcatination.exec(text)) &&
      problems < settings.maxNumberOfProblems
    ) {
      problems++;

      if (typeConversionResult.length != 2) continue;

      const typeConversion = typeConversionResult[1];
      const diagnostic = this.getDiagnosticByRegExpResult(
        typeConversionResult,
        textDocument,
        'Возможно неявное преобразование типа Number к строке, из-за чего может быть получена пустая строка. Необходимо использовать функцию string для явного приведения типа к строке',
        DiagnosticSeverity.Warning
      );
      diagnostics.push(diagnostic);
    }

    return diagnostics;
  }
}
