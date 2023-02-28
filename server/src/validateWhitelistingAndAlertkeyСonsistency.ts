import {
	createConnection,
	TextDocuments,
	Diagnostic,
	DiagnosticSeverity,
	ProposedFeatures,
	InitializeParams,
	DidChangeConfigurationNotification,
	CompletionItem,
	CompletionItemKind,
	TextDocumentPositionParams,
	TextDocumentSyncKind,
	InitializeResult
} from 'vscode-languageserver/node';

import {
	TextDocument
} from 'vscode-languageserver-textdocument';

import {
	getDocumentSettings
} from './server';

export async function validateWhitelistingAndAlertkeyСonsistency(textDocument: TextDocument):  Promise<Diagnostic[]> {
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
	const whitelistingPattern = /filter::(?:CheckWL_Specific_Only|CheckWL_File_Creation|CheckWL_Networking|CheckWL_Powershell|CheckWL_Process_Access|CheckWL_Process_Creation|CheckWL_Registry_Actions|CheckWL_Tasks|CheckWL_Windows_Shares|CheckWL_Windows_Login|CheckWL_Web_Access)\(\s*"\S+"\s*,\s*(.*)\s*\)/gm;
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