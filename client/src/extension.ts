import * as path from 'path';
import * as vscode from 'vscode';
import * as fs from 'fs';

import { workspace, ExtensionContext } from 'vscode';


import {
	LanguageClient,
	LanguageClientOptions,
	ServerOptions,
	TransportKind
} from 'vscode-languageclient/node';

import { LocalizationEditorViewProvider } from './views/localizationEditor/localizationEditorViewProvider';
import { XpSignatureHelpProvider } from './providers/signature/xpSignatureHelpProvider';
import { XpRenameProvide } from './providers/xpRenameProvider';
import { UnitTestContentEditorViewProvider } from './views/unitTestEditor/unitTestEditorViewProvider';
import { UnitTestsListViewProvider } from './views/unitTestEditor/unitTestsListViewProvider';
import { IntegrationTestEditorViewProvider } from './views/integrationTests/integrationTestEditorViewProvider';
import { MetainfoViewProvider } from './views/metaInfo/metainfoViewProvider';
import { Configuration } from './models/configuration';
import { XpCompletionItemProvider } from './providers/xpCompletionItemProvider';
import { ContentTreeProvider } from './views/contentTree/contentTreeProvider';
import { RunningCorrelationGraphProvider } from './views/correlationGraph/runningCorrelationGraphProvider';
import { TableListsEditorViewProvider } from './views/tableListsEditor/tableListsEditorViewProvider';
import { XpDocumentHighlightProvider } from './providers/highlight/xpDocumentHighlightProvier';
import { TestsFormatContentMenuExtension } from './ext/contextMenuExtension';
import { SetContentTypeCommand } from './contentType/setContentTypeCommand';
import { YamlHelper } from './helpers/yamlHelper';
import { InitKBRootCommand } from './views/contentTree/commands/initKnowledgebaseRootCommand';
import { XPPackingTaskProvider } from './providers/xpCustomTaskProvider';
import { ExceptionHelper } from './helpers/exceptionHelper';
import { FileSystemHelper } from './helpers/fileSystemHelper';
import { XpEnumValuesCompletionItemProvider } from './providers/xpEnumValuesCompletionItemProvider';

let client: LanguageClient;
let siemCustomPackingTaskProvider: vscode.Disposable | undefined;

export async function activate(context: ExtensionContext) {

	try{
		// Инициализация реестр глобальных параметров.
		const config = await Configuration.init(context);

		// Конфигурирование LSP.
		const serverModule = context.asAbsolutePath(
			path.join('server', 'out', 'server.js')
		);

		const debugOptions = { execArgv: ['--nolazy', '--inspect=6009'] };
		const serverOptions: ServerOptions = {
			run: { module: serverModule, transport: TransportKind.ipc },
			debug: {
				module: serverModule,
				transport: TransportKind.ipc,
				options: debugOptions
			}
		};

		// Конфигурирование клиента для доступа к LSP.
		const clientOptions: LanguageClientOptions = {
			// Заменяем поддерживаемый формат на наш.
			documentSelector: [
				{
					scheme: 'file',
					language: 'xp'
				},
				{
					scheme: 'file',
					language: 'co'
				},
				{
					scheme: 'file',
					language: 'en'
				}
			],
			synchronize: {
				// Notify the server about file changes to '.clientrc files contained in the workspace
				fileEvents: workspace.createFileSystemWatcher('**/.clientrc')
			}
		};

		// Создаем клиент, запускаем его и сервер.
		client = new LanguageClient(
			'languageServer',
			'Language Server',
			serverOptions,
			clientOptions
		);
		client.start();

		const rootPath =
			(vscode.workspace.workspaceFolders && (vscode.workspace.workspaceFolders.length > 0))
				? vscode.workspace.workspaceFolders[0].uri.fsPath
				: undefined;

		YamlHelper.configure(
			{
				lineWidth: -1,
				indent: 4,
				noArrayIndent: true
			}
		);

		ContentTreeProvider.init(config, rootPath);
		LocalizationEditorViewProvider.init(config);
		UnitTestContentEditorViewProvider.init(config);
		UnitTestsListViewProvider.init(config);
		IntegrationTestEditorViewProvider.init(config);
		MetainfoViewProvider.init(config);
		RunningCorrelationGraphProvider.init(config);
		TableListsEditorViewProvider.init(config);
		SetContentTypeCommand.init(config);
		InitKBRootCommand.init(config);

		siemCustomPackingTaskProvider = vscode.tasks.registerTaskProvider(XPPackingTaskProvider.Type, new XPPackingTaskProvider(config));

		
		// Расширение нативного контекстого меню.
		TestsFormatContentMenuExtension.init(context);

		// Подпись функций.
		const signatureProvider = await XpSignatureHelpProvider.init(context);
		context.subscriptions.push(
			vscode.languages.registerSignatureHelpProvider(
				[
					{
						scheme: 'file',
						language: 'xp'
					},
					{
						scheme: 'file',
						language: 'co'
					},
					{
						scheme: 'file',
						language: 'en'
					},
					{
						scheme: 'file',
						language: 'flt'
					},
				],
				signatureProvider,
				'(', ','
			)
		);

		// Автодополнение функций.
		const completionItemProvider = await XpCompletionItemProvider.init(config);
		context.subscriptions.push(
			vscode.languages.registerCompletionItemProvider(
				[
					{
						scheme: 'file',
						language: 'xp'
					},
					{
						scheme: 'file',
						language: 'co'
					},
					{
						scheme: 'file',
						language: 'en'
					},
					{
						scheme: 'file',
						language: 'flt'
					},
				],
				completionItemProvider,
				"$"
			)
		);

		const literalItemProvider = await XpEnumValuesCompletionItemProvider.init(config);
		context.subscriptions.push(
			vscode.languages.registerCompletionItemProvider(
				[
					{
						scheme: 'file',
						language: 'co'
					},
					{
						scheme: 'file',
						language: 'xp'					
					}
				],
				literalItemProvider,
				"\""
			)
		);

		// TODO: реализовать
		context.subscriptions.push(
			vscode.languages.registerRenameProvider(
				{
					scheme: 'file',
					language: 'co'
				},
				new XpRenameProvide()
			)
		);

		// Не очень понятно как тут сделать разумно.
		const tokenModifiers = ['declaration', 'documentation'];
		const tokenTypes = ['function', 'variable'];
		const legend = new vscode.SemanticTokensLegend(tokenTypes, tokenModifiers);

		const xpDocumentHighlightProvider = await XpDocumentHighlightProvider.init(config, legend);
		vscode.languages.registerDocumentSemanticTokensProvider(
			[
				{
					scheme: 'file',
					language: 'xp'
				},
				{
					scheme: 'file',
					language: 'co'
				},
				{
					scheme: 'file',
					language: 'en'
				},
				{
					scheme: 'file',
					language: 'flt'
				},
			],
			xpDocumentHighlightProvider,
			legend
		);

		// Очистка директории временных файлов.
		const tmpDirectory = config.getTmpDirectoryPath();
		if(fs.existsSync(tmpDirectory)) {
			await FileSystemHelper.deleteAllSubDirectoriesAndFiles(tmpDirectory);
		}
	}
	catch(error) {
		ExceptionHelper.show(error, "Не удалось активировать расширение 'eXtraction and Processing'");
	}
}

export async function deactivate(): Promise<void> | undefined {
	if (!client) {
		return undefined;
	}

	if(siemCustomPackingTaskProvider){
		siemCustomPackingTaskProvider.dispose();
	}

	return client.stop();
}
