import {
	Diagnostic,
	DiagnosticSeverity,
} from 'vscode-languageserver/node';

import {
	TextDocument
} from 'vscode-languageserver-textdocument';

import { IValidator } from './IValidator';
import { getDocumentSettings } from './server';

export class WhitelistingAndAlertKeyValidator extends IValidator {
	constructor() {
		super(["co"]);
	}

	async validateImpl(textDocument: TextDocument) : Promise<Diagnostic[]> {

		if(!this._languageIds.includes(textDocument.languageId)) {
			return [];
		}
		
		const text = textDocument.getText();
		const diagnostics: Diagnostic[] = [];
	
		// Ищем имя правила.
		const alertKeyPattern = /\$alert.key\s*=\s(.+)$/gm;
		const alertKeyResult = alertKeyPattern.exec(text);
		if(!alertKeyResult) {
			return diagnostics;
		}
		let alertKey = alertKeyResult[1];
	
		// Ищем вайтлистинг правила.
		const whitelistingPattern = /filter::CheckWL_\S+?\(\s*"\S+"\s*,\s*(.*)\s*\)/gm;
		const settings = await getDocumentSettings(textDocument.uri);
		let problems = 0;
		let whitelistingResult: RegExpExecArray | null;
		while ((whitelistingResult = whitelistingPattern.exec(text)) && problems < settings.maxNumberOfProblems) {
			problems++;
	
			if(whitelistingResult.length != 2)
				continue;
	
			// В вайтлистинге все поля без долларов, а в alert.key они есть.
			let whitelistingKeyName = whitelistingResult[1];
			const spacesRegEx = /(\s+)/g;
			whitelistingKeyName = whitelistingKeyName.replace(spacesRegEx, "");
	
			const dollarRegEx = /(\s+)|(?:(\$)[a-zA-Z0-9_.]+)/g;
			alertKey = alertKey.replace(dollarRegEx, "");
	
			// Проброс alert.key из сабруля, всё ок.
			if(whitelistingKeyName === "lower(alert.key)") {
				continue;
			}
	
			if(alertKey === "alert.key") {
				continue;
			}
		
			// Если совпадение, тогда всё ок идёт дальше.
			if(alertKey === whitelistingKeyName) {
				continue;
			}
		
			// Получение позиции ошибки.
			const commonMatch = whitelistingResult[0];
			const groupMatch = whitelistingResult[1];
		
			const startPosition = whitelistingResult.index + commonMatch.indexOf(groupMatch);
			const endPosition = startPosition + groupMatch.length;
		
			const diagnostic: Diagnostic = {
				severity: DiagnosticSeverity.Warning,
				range: {
					start: textDocument.positionAt(startPosition),
					end: textDocument.positionAt(endPosition)
				},
				message: "Отличается ключ вайтлистинга в макросе и значение alert.key",
				source: 'xp'
			};
	
			diagnostics.push(diagnostic);
		}
	
		return diagnostics;
	}
}