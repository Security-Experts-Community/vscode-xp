import {
	Diagnostic
} from 'vscode-languageserver/node';

import {
	TextDocument
} from 'vscode-languageserver-textdocument';

export abstract class IValidator {
	constructor(protected _languageIds: string[] ) {}
	abstract validate(textDocument: TextDocument) : Promise<Diagnostic[]>
}