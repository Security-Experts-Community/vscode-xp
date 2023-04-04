import {
	Diagnostic, DiagnosticSeverity
} from 'vscode-languageserver/node';

import {
	TextDocument
} from 'vscode-languageserver-textdocument';

export abstract class IValidator {
	constructor(protected _languageIds: string[] ) {}
	abstract validate(textDocument: TextDocument) : Promise<Diagnostic[]>

	protected getDiagnostic(
		lowerCallResult : RegExpExecArray,
		textDocument : TextDocument,
		message : string,
		diagnosticSeverity : DiagnosticSeverity) : Diagnostic {
		const commonMatch = lowerCallResult[0];
	
		// Выделяем всё сравнение как ошибку. 
		// lower(event_src.subsys) == "Directory Service"
		const startPosition = lowerCallResult.index;
		const endPosition = lowerCallResult.index + commonMatch.length;

		const diagnostic: Diagnostic = {
			severity: diagnosticSeverity,
			range: {
				start: textDocument.positionAt(startPosition),
				end: textDocument.positionAt(endPosition)
			},
			message: message,
			source: 'xp'
		};

		return diagnostic;
	}
}