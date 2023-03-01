import {
	Diagnostic,
	DiagnosticSeverity,
} from 'vscode-languageserver/node';

import {
	TextDocument
} from 'vscode-languageserver-textdocument';

import { IValidator } from './IValidator';
import { getDocumentSettings } from './server';

export class WhitelistingAndRuleNameValidator extends IValidator {
	constructor() {
		super(["co"]);
	}

	async validate(textDocument: TextDocument) : Promise<Diagnostic[]> {

		if(!this._languageIds.includes(textDocument.languageId)) {
			return [];
		}
		
		const text = textDocument.getText();
		const diagnostics: Diagnostic[] = [];
	
		// Ищем имя правила.
		const rulePattern = /rule (\S+)\s*:/gm;
		const ruleResult = rulePattern.exec(text);
		if(!ruleResult) {
			return diagnostics;
		}
	
		// Ищем вайтлистинг правила.
		const whitelistingPattern = /filter::(?:CheckWL_Specific_Only|CheckWL_File_Creation|CheckWL_Networking|CheckWL_Powershell|CheckWL_Process_Access|CheckWL_Process_Creation|CheckWL_Registry_Actions|CheckWL_Tasks|CheckWL_Windows_Shares|CheckWL_Windows_Login|CheckWL_Web_Access)\("(.+?)"/gm;
	
		const settings = await getDocumentSettings(textDocument.uri);
		let problems = 0;
		let whitelistingResult: RegExpExecArray | null;
		const ruleName = ruleResult[1];
		while ((whitelistingResult = whitelistingPattern.exec(text)) && problems < settings.maxNumberOfProblems) {
			problems++;
	
			if(whitelistingResult.length != 2)
				continue;
	
			const whitelistingRuleName = whitelistingResult[1];
		
			if(ruleName === whitelistingRuleName) {
				continue;
			}
		
			// Получение позиции ошибки.
			const commonMatch = whitelistingResult[0];
			const groupMatch = whitelistingResult[1];
		
			const startPosition = whitelistingResult.index + commonMatch.indexOf(groupMatch);
			const endPosition = startPosition + groupMatch.length;
		
			const diagnostic: Diagnostic = {
				severity: DiagnosticSeverity.Error,
				range: {
					start: textDocument.positionAt(startPosition),
					end: textDocument.positionAt(endPosition)
				},
				message: "Отличается имя корреляции и первый параметр макроса вайтлистинга",
				source: 'xp'
			};
	
			diagnostics.push(diagnostic);
		}
	
		return diagnostics;
	}
}