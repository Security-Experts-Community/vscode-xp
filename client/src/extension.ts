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
import { XpDocumentHighlightProvider } from './providers/highlight/xpDocumentHighlightProvider';
import { SetContentTypeCommand } from './contentType/setContentTypeCommand';
import { YamlHelper } from './helpers/yamlHelper';
import { InitKBRootCommand } from './views/contentTree/commands/initKnowledgebaseRootCommand';
import { XPPackingTaskProvider } from './providers/xpCustomTaskProvider';
import { ExceptionHelper } from './helpers/exceptionHelper';
import { FileSystemHelper } from './helpers/fileSystemHelper';
import { XpEnumValuesCompletionItemProvider } from './providers/xpEnumValuesCompletionItemProvider';
import { LogLevel, Logger } from './logger';
import { RetroCorrelationViewController } from './views/retroCorrelation/retroCorrelationViewProvider';
import { XpHoverProvider } from './providers/xpHoverProvider';
import { OriginsManager } from './models/content/originsManager';
import { DefaultTLValuesEditorViewProvider } from './views/defaultTLValues/defaultTLValuesEditorViewProvider';
import { LocalizationEditorViewProvider } from './views/localization/localizationEditorViewProvider';
import { CommonCommands } from './models/command/commonCommands';

export let Log: Logger;
let client: LanguageClient;
let siemCustomPackingTaskProvider: vscode.Disposable | undefined;

export async function activate(context: ExtensionContext): Promise<void> {
	try {
		// Инициализация реестр глобальных параметров.
		const config = await Configuration.init(context);
		Log = new Logger(config);
		if(config.getExtensionMode() === vscode.ExtensionMode.Development) {
			Log.setLogLevel(LogLevel.Debug);
		} else {
			Log.setLogLevel(LogLevel.Info);
		}
		
		Log.info(`Начата активация расширения '${Configuration.getExtensionDisplayName()}'`);
		config.checkUserSetting();

		await OriginsManager.init(config);

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
				noArrayIndent: true,
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
		RetroCorrelationViewController.init(config);
		CommonCommands.init(config);

		const templateFilePath = path.join(
			config.getExtensionPath(),
			"client", "templates", "TableListEditor", "html", "TableListEditor.html"
		);
		context.subscriptions.push(
			DefaultTLValuesEditorViewProvider.register(context, templateFilePath, config)
		);

		siemCustomPackingTaskProvider = vscode.tasks.registerTaskProvider(XPPackingTaskProvider.Type, new XPPackingTaskProvider(config));

		// Расширение нативного контекстного меню.
		// TestsFormatContentMenuExtension.init(context);

		// Подпись функций.
		await XpSignatureHelpProvider.init(context);

		// Автодополнение функций.
		await XpCompletionItemProvider.init(config);
		await XpEnumValuesCompletionItemProvider.init(config);

		context.subscriptions.push(
			vscode.languages.registerRenameProvider(
				{
					scheme: 'file',
					language: 'co'
				},
				new XpRenameProvide()
			)
		);

		// Показывает общую информацию по наведению на конструкцию.
		await XpHoverProvider.init(config);

		// Не очень понятно как тут сделать разумно.
		const tokenModifiers = ['declaration', 'documentation'];
		const tokenTypes = ['function', 'variable'];
		const legend = new vscode.SemanticTokensLegend(tokenTypes, tokenModifiers);
		await XpDocumentHighlightProvider.init(config, legend);

		// Очистка директории временных файлов.
		const tmpDirectory = config.getTmpDirectoryPath();
		if (fs.existsSync(tmpDirectory)) {
			try {
				await FileSystemHelper.deleteAllSubDirectoriesAndFiles(tmpDirectory);
				Log.info(`Директория временных файлов '${tmpDirectory}' была успешно очищена`);
			}
			catch (error) {
				Log.warn('Ошибка очистки файлов из временной директории', error);
			}
		}

		// Очистка директории выходных файлов. Нужна для сохранения консистентности нормализаций.
		const extensionSettings = config.getConfiguration();
		const outputDirectoryPath = extensionSettings.get<string>("outputDirectoryPath");
		if(fs.existsSync(outputDirectoryPath)) {
			try {
				await FileSystemHelper.deleteAllSubDirectoriesAndFiles(outputDirectoryPath);
				Log.info(`Директория выходных файлов '${outputDirectoryPath}' была успешно очищена`);
			}
			catch (error) {
				Log.warn('Ошибка очистки файлов из выходной директории', error);
			}
		}

		Log.info(`Расширение '${Configuration.getExtensionDisplayName()}' активировано`);
	}
	catch (error) {
		ExceptionHelper.show(error, `Расширение '${Configuration.getExtensionDisplayName()}' не удалось активировать`);
	}
}

export async function deactivate(): Promise<void> | undefined {
	if (!client) {
		return undefined;
	}

	if (siemCustomPackingTaskProvider) {
		siemCustomPackingTaskProvider.dispose();
	}

	return client.stop();
}
