import {
	Diagnostic
} from 'vscode-languageserver/node';

import {
	TextDocument
} from 'vscode-languageserver-textdocument';

export abstract class IValidator {
	constructor(protected _languageId: string ) {}
	abstract validate(textDocument: TextDocument) : Promise<Diagnostic[]>

	public getExtention() : string {
		return this._languageId;
	}
}