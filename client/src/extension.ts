import * as path from 'path';
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as os from 'os';
import { format } from 'prettier';

import { workspace, ExtensionContext } from 'vscode';

import {
  LanguageClient,
  LanguageClientOptions,
  ServerOptions,
  TransportKind
} from 'vscode-languageclient/node';

import { XpSignatureHelpProvider } from './providers/function/xpSignatureHelpProvider';
import { XpRenameProvide } from './providers/xpRenameProvider';
import { UnitTestContentEditorViewProvider } from './views/unitTestEditor/unitTestEditorViewProvider';
import { IntegrationTestEditorViewProvider } from './views/integrationTests/integrationTestEditorViewProvider';
import { MetainfoViewProvider } from './views/metaInfo/metainfoViewProvider';
import { Configuration } from './models/configuration';
import { XpCompletionItemProvider } from './providers/xpCompletionItemProvider';
import { ContentTreeProvider } from './views/contentTree/contentTreeProvider';
import { RunningCorrelationGraphProvider } from './views/correlationGraph/runningCorrelationGraphProvider';
import { TableListsEditorViewProvider } from './views/tableListsEditor/tableListsEditorViewProvider';
import { XpDocumentHighlightProvider } from './providers/function/xpDocumentHighlightProvider';
import { SetContentTypeCommand } from './contentType/setContentTypeCommand';
import { YamlHelper } from './helpers/yamlHelper';
import { InitKBRootCommand } from './views/contentTree/commands/initKnowledgebaseRootCommand';
import { XPPackingTaskProvider } from './providers/xpCustomTaskProvider';
import { ExceptionHelper } from './helpers/exceptionHelper';
import { FileSystemHelper } from './helpers/fileSystemHelper';
import { XpEnumValuesCompletionItemProvider } from './providers/xpEnumValuesCompletionItemProvider';
import { Logger } from './logger';
import { RetroCorrelationViewController } from './views/retroCorrelation/retroCorrelationViewProvider';
import { XpHoverProvider } from './providers/xpHoverProvider';
import { UserSettingsManager as UserSettingsManager } from './models/content/userSettingsManager';
import { LocalizationEditorViewProvider } from './views/localization/localizationEditorViewProvider';
import { CommonCommands } from './models/command/commonCommands';
import { ToolsManager } from './models/content/toolsManager';

export let Log: Logger;
let client: LanguageClient;
let siemCustomPackingTaskProvider: vscode.Disposable | undefined;

export async function activate(context: ExtensionContext): Promise<void> {
  try {
    // Инициализация реестр глобальных параметров.
    const config = await Configuration.init(context);

    let extensionVersion;
    try {
      const packageFilePath = path.resolve(__dirname, '../../package.json');
      const packageFileContent = await FileSystemHelper.readContentFile(packageFilePath);
      extensionVersion = JSON.parse(packageFileContent).version;
    } catch (error) {
      Log.warn(`Failed to get the extension version`, error);
    }

    Log = Logger.init(config);
    Log.info(
      `Extension activation ${extensionVersion ?? ''} has started '${Configuration.getExtensionDisplayName()}'`
    );

    // Информация по ОС
    Log.info(`OS Platform: ${os.platform()}`);
    Log.info(`OS Type: ${os.type()}`);
    Log.info(`OS Release: ${os.release()}`);

    await UserSettingsManager.init(config);
    await ToolsManager.init(config);

    try {
      await config.checkUserSetting();
    } catch (error) {
      ExceptionHelper.show(error);
    }

    // Конфигурирование LSP.
    await configureLSPClient(client, context, config);

    const rootPath =
      vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0
        ? vscode.workspace.workspaceFolders[0].uri.fsPath
        : undefined;

    YamlHelper.configure(
      {
        lineWidth: -1,
        indent: 4,
        noArrayIndent: true,
        quotingType: "'"
      },
      undefined,
      (text: string) =>
        format(text, {
          parser: 'yaml',
          singleQuote: true,
          tabWidth: 4
        })
    );

    ContentTreeProvider.init(config, rootPath);
    LocalizationEditorViewProvider.init(config);
    UnitTestContentEditorViewProvider.init(config);
    IntegrationTestEditorViewProvider.init(config);
    MetainfoViewProvider.init(config);
    RunningCorrelationGraphProvider.init(config);
    TableListsEditorViewProvider.init(config);
    SetContentTypeCommand.init(config);
    InitKBRootCommand.init(config);
    RetroCorrelationViewController.init(config);
    CommonCommands.init(config);

    siemCustomPackingTaskProvider = vscode.tasks.registerTaskProvider(
      XPPackingTaskProvider.Type,
      new XPPackingTaskProvider(config)
    );

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
        Log.info(`The temporary files directory '${tmpDirectory}' was successfully cleared`);
      } catch (error) {
        Log.warn(`Error clearing files from temporary directory '${tmpDirectory}'`, error);
      }
    }

    // Очистка директории выходных файлов. Нужна для сохранения консистентности нормализаций.
    const extensionSettings = config.getWorkspaceConfiguration();
    const outputDirectoryPath = extensionSettings.get<string>('outputDirectoryPath');
    if (fs.existsSync(outputDirectoryPath)) {
      try {
        await FileSystemHelper.deleteAllSubDirectoriesAndFiles(outputDirectoryPath);
        Log.info(`The output directory '${outputDirectoryPath}' was successfully cleared`);
      } catch (error) {
        Log.warn(`Error clearing files from output directory '${outputDirectoryPath}'`, error);
      }
    }

    Log.info(`Extension '${Configuration.getExtensionDisplayName()}' is activated`);
  } catch (error) {
    ExceptionHelper.show(
      error,
      `Extension '${Configuration.getExtensionDisplayName()}' failed to activate`
    );
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

async function configureLSPClient(
  client: LanguageClient,
  context: vscode.ExtensionContext,
  config: Configuration
) {
  const { lspServerExecutablePath } = config.getWorkspaceConfiguration();

  if (lspServerExecutablePath) {
    const command = lspServerExecutablePath;
    const args: string[] = [];

    const documentSelector = [
      { scheme: 'file', language: 'xp' },
      { scheme: 'file', language: 'en' },
      { scheme: 'file', language: 'agr' },
      { scheme: 'file', language: 'co' },
      { scheme: 'file', language: 'flt' }
    ];

    const serverOptions: ServerOptions = {
      command,
      args,
      options: {
        cwd: __dirname
      }
    };

    const clientOptions: LanguageClientOptions = {
      documentSelector,
      synchronize: {
        configurationSection: config.getExtensionSettingsPrefix()
      },
      initializationOptions: {
        locale: vscode.env.language
      }
    };

    client = new LanguageClient(command, serverOptions, clientOptions);

    return client
      .start()
      .then(() => {
        const serverProcess = client['_serverProcess'];
        if (serverProcess) {
          const pid = serverProcess.pid;
          vscode.window.showInformationMessage(
            config.getMessage('LSPServer.ServerHasStarted', pid)
          );
        }
      })
      .catch((error) => {
        vscode.window.showErrorMessage('Failed to start XPLang Language Server: ' + error.message);
      });
  }

  /**
   * Legacy LSP server
   */
  const serverModule = context.asAbsolutePath(path.join('server', 'out', 'server.js'));

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
  client = new LanguageClient('languageServer', 'Language Server', serverOptions, clientOptions);
  client.start();
}
