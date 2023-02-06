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

const connection = createConnection(ProposedFeatures.all);
const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);

let hasConfigurationCapability = false;
let hasWorkspaceFolderCapability = false;
let hasDiagnosticRelatedInformationCapability = false;

connection.onInitialize((params: InitializeParams) => {
	const capabilities = params.capabilities;

	hasConfigurationCapability = !!(
		capabilities.workspace && !!capabilities.workspace.configuration
	);
	hasWorkspaceFolderCapability = !!(
		capabilities.workspace && !!capabilities.workspace.workspaceFolders
	);
	hasDiagnosticRelatedInformationCapability = !!(
		capabilities.textDocument &&
		capabilities.textDocument.publishDiagnostics &&
		capabilities.textDocument.publishDiagnostics.relatedInformation
	);

	const result: InitializeResult = {
		capabilities: {
			textDocumentSync: TextDocumentSyncKind.Incremental,
			completionProvider: {
				resolveProvider: true
			}
		}
	};
	if (hasWorkspaceFolderCapability) {
		result.capabilities.workspace = {
			workspaceFolders: {
				supported: true
			}
		};
	}
	return result;
});

connection.onInitialized(() => {
	if (hasConfigurationCapability) {
		connection.client.register(DidChangeConfigurationNotification.type, undefined);
	}
	if (hasWorkspaceFolderCapability) {
		connection.workspace.onDidChangeWorkspaceFolders(_event => {
			connection.console.log('Workspace folder change event received.');
		});
	}
});

interface ExampleSettings {
	maxNumberOfProblems: number;
}

const defaultSettings: ExampleSettings = { maxNumberOfProblems: 1000 };
let globalSettings: ExampleSettings = defaultSettings;

const documentSettings: Map<string, Thenable<ExampleSettings>> = new Map();

connection.onDidChangeConfiguration(change => {
	if (hasConfigurationCapability) {
		documentSettings.clear();
	} else {
		globalSettings = <ExampleSettings>(
			(change.settings.languageServerExample || defaultSettings)
		);
	}

	// Revalidate all open text documents
	documents.all().forEach(validateTextDocument);
});

function getDocumentSettings(resource: string): Thenable<ExampleSettings> {
	if (!hasConfigurationCapability) {
		return Promise.resolve(globalSettings);
	}
	let result = documentSettings.get(resource);
	if (!result) {
		result = connection.workspace.getConfiguration({
			scopeUri: resource,
			section: 'languageServer'
		});
		documentSettings.set(resource, result);
	}
	return result;
}

documents.onDidClose(e => {
	documentSettings.delete(e.document.uri);
});

documents.onDidChangeContent(change => {
	validateTextDocument(change.document);
});

export async function validateTextDocument(textDocument: TextDocument): Promise<void> {
		
	if(textDocument.languageId != "co")
		return;

	const diagnostics: Diagnostic[] = [];

	// Валидация равенства первого параметра вайтлистинга и имени правила.
	const whitelistingAndRuleNameDiagnostics = await validateWhitelistingAndRuleNameСonsistency(textDocument);
	diagnostics.push(...whitelistingAndRuleNameDiagnostics);
	connection.sendDiagnostics({ uri: textDocument.uri, diagnostics });
}

// Проверяем во всех локациях (правило, метаданные, тесты) одинаковость имени корреляции.
async function validateWhitelistingAndRuleNameСonsistency(textDocument: TextDocument):  Promise<Diagnostic[]> {
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

connection.onDidChangeWatchedFiles(change => {
	connection.console.log('Получили информацию об изменении файла.');
});

connection.onCompletion(
	(textDocumentPosition: TextDocumentPositionParams): CompletionItem[] => {
		return [];
	}
);

connection.onCompletionResolve(
	(item: CompletionItem): CompletionItem => {
		return item;
	}
);

documents.listen(connection);
connection.listen();
