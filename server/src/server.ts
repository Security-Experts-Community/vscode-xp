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

import { TextDocument } from 'vscode-languageserver-textdocument';
import { LowerFunctionResultValidator } from './validator/lowerFunctionResultValidator';
import { IValidator } from './validator/IValidator';
import { WhitelistingAndAlertKeyValidator } from './validator/whitelistingAndAlertkeyValidator';
import { WhitelistingAndRuleNameValidator } from './validator/whitelistingAndRuleNameValidator';
import { NestedLowerValidator } from './validator/nestedLowerValidator';
import { ImportanceAndSeverityValidator } from './validator/importanceAndSeverityValidator';
import { FilterEqualsValidator } from './validator/filterEqualsValidator';
import { CorrectnessAssignmentOnBlocks } from './validator/correctnessAssignmentOnBlocks';
import { TypeToStringConversionValidator } from './validator/typeToStringConvertionValidator';

const connection = createConnection(ProposedFeatures.all);
const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);
const validators: IValidator[] = [];

let hasConfigurationCapability = false;
let hasWorkspaceFolderCapability = false;
let hasDiagnosticRelatedInformationCapability = false;

connection.onInitialize((params: InitializeParams) => {
  // Инициализируем валидаторы кода.
  validators.push(
    new LowerFunctionResultValidator(),
    new WhitelistingAndAlertKeyValidator(),
    new WhitelistingAndRuleNameValidator(),
    new NestedLowerValidator(),
    new ImportanceAndSeverityValidator(),
    new FilterEqualsValidator(),
    new CorrectnessAssignmentOnBlocks(),
    new TypeToStringConversionValidator()
  );

  const capabilities = params.capabilities;

  hasConfigurationCapability = !!(capabilities.workspace && !!capabilities.workspace.configuration);
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
    connection.workspace.onDidChangeWorkspaceFolders((_event) => {
      connection.console.log('Workspace folder change event received.');
    });
  }
});

export interface DocumentSettings {
  maxNumberOfProblems: number;
}

const defaultSettings: DocumentSettings = { maxNumberOfProblems: 1000 };
let globalSettings: DocumentSettings = defaultSettings;

const documentSettings: Map<string, Thenable<DocumentSettings>> = new Map();

connection.onDidChangeConfiguration((change) => {
  if (hasConfigurationCapability) {
    documentSettings.clear();
  } else {
    globalSettings = <DocumentSettings>(change.settings.languageServerExample || defaultSettings);
  }

  // Revalidate all open text documents
  documents.all().forEach(validateTextDocument);
});

export function getDocumentSettings(resource: string): Thenable<DocumentSettings> {
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

documents.onDidClose((e) => {
  documentSettings.delete(e.document.uri);
});

documents.onDidChangeContent((change) => {
  validateTextDocument(change.document);
});

export async function validateTextDocument(textDocument: TextDocument): Promise<void> {
  const diagnostics: Diagnostic[] = [];
  for (const validator of validators) {
    const lowerFunctionResultValidatorResult = await validator.validate(textDocument);
    diagnostics.push(...lowerFunctionResultValidatorResult);
  }

  connection.sendDiagnostics({ uri: textDocument.uri, diagnostics });
}

connection.onDidChangeWatchedFiles((change) => {
  connection.console.log('Получили информацию об изменении файла.');
});

connection.onCompletion((textDocumentPosition: TextDocumentPositionParams): CompletionItem[] => {
  return [];
});

connection.onCompletionResolve((item: CompletionItem): CompletionItem => {
  return item;
});

documents.listen(connection);
connection.listen();
