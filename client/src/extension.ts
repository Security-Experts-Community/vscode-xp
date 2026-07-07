import * as path from 'path';
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as os from 'os';

import { workspace, ExtensionContext } from 'vscode';

import {
  InitializeParams,
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
import { SetKBTVersionCommand } from './models/siemj/setKBTVersionCommand';
import { MacOSContainerSetup } from './tools/macosContainerSetup';
import { XpDocumentFormattingProvider } from './providers/xpDocumentFormattingProvider';

export let Log: Logger;
let client: LanguageClient;
let siemCustomPackingTaskProvider: vscode.Disposable | undefined;

interface LspStartupResult {
  client: LanguageClient;
  usesKbtFormatter: boolean;
}

class XpLanguageClient extends LanguageClient {
  protected fillInitializeParams(params: InitializeParams): void {
    super.fillInitializeParams(params);

    const capabilities = (params.capabilities ??= {} as InitializeParams['capabilities']);
    const workspaceCapabilities = ((capabilities as any).workspace ??= {});
    if (workspaceCapabilities.workspaceFolders === undefined) {
      workspaceCapabilities.workspaceFolders = true;
    }

    const textDocumentCapabilities = ((capabilities as any).textDocument ??= {});
    const semanticTokens = (textDocumentCapabilities.semanticTokens ??= {});
    semanticTokens.dynamicRegistration ??= false;
    semanticTokens.requests ??= { range: false, full: { delta: false } };
    semanticTokens.tokenTypes ??= [];
    semanticTokens.tokenModifiers ??= [];
    semanticTokens.formats ??= ['relative'];
    semanticTokens.multilineTokenSupport ??= true;
    semanticTokens.overlappingTokenSupport ??= true;
  }
}

export async function activate(context: ExtensionContext): Promise<void> {
  try {
    // Инициализация реестр глобальных параметров.
    const config = await Configuration.init(context);
    Log = Logger.init(config);

    let extensionVersion;
    try {
      const packageFilePath = path.resolve(__dirname, '../../package.json');
      const packageFileContent = await FileSystemHelper.readContentFile(packageFilePath);
      extensionVersion = JSON.parse(packageFileContent).version;
    } catch (error) {
      Log.warn(`Failed to get the extension version`, error);
    }

    Log.info(
      `Extension activation ${extensionVersion ?? ''} has started '${Configuration.getExtensionDisplayName()}'`
    );

    // Информация по ОС
    Log.info(`OS Platform: ${os.platform()}`);
    Log.info(`OS Type: ${os.type()}`);
    Log.info(`OS Release: ${os.release()}`);

    await UserSettingsManager.init(config);
    // await ToolsManager.init(config);

    if (!config.shouldUseDockerToolRunner()) {
      // Ensure automatic KBT selection happens early for local tool execution.
      try {
        // This will trigger auto-selection if needed
        const kbtBaseDirectory = config.getKbtBaseDirectoryOld();
      } catch (error) {
        Log.warn(`Error during KBT auto-selection: ${error.message}`);
      }
    }

    // Automatically set configuration options if not already set
    try {
      config.autoSetKbtVersionsDirectory();
      config.autoSetKbtBaseDirectory();
      config.autoSetLspServerExecutablePath();
    } catch (error) {
      Log.warn(`Error during automatic configuration setting: ${error.message}`);
    }

    try {
      await config.checkUserSetting();
    } catch (error) {
      ExceptionHelper.show(error);
    }

    await MacOSContainerSetup.maybePrompt(config);

    // Конфигурирование LSP.
    const lspStartupResult = await configureLSPClient(context, config);
    client = lspStartupResult.client;

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
      async (text: string) => text
    );

    ContentTreeProvider.init(config, rootPath);
    LocalizationEditorViewProvider.init(config);
    UnitTestContentEditorViewProvider.init(config);
    IntegrationTestEditorViewProvider.init(config);
    MetainfoViewProvider.init(config);
    RunningCorrelationGraphProvider.init(config);
    TableListsEditorViewProvider.init(config);
    const kbtVersionsDirectory = config.shouldUseDockerToolRunner()
      ? undefined
      : config.getKbtVersionsDirectory();
    if (kbtVersionsDirectory && !config.shouldUseDockerToolRunner()) {
      await SetKBTVersionCommand.init(config);
    } else {
      try {
        await config.setSIEMJVersion();
      } catch (error) {
        Log.warn(`Failed to determine SIEMJ version: ${error.message}`);
        if (!config.isLocalMacOS()) {
          throw error;
        }
      }
    }
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
    if (lspStartupResult.usesKbtFormatter) {
      Log.info('Skipping fallback XP formatter registration because KBT LSP formatting is active.');
    } else {
      XpDocumentFormattingProvider.init(config);
      Log.info('Registered fallback XP formatter because KBT LSP formatting is not active.');
    }

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
  context: vscode.ExtensionContext,
  config: Configuration
): Promise<LspStartupResult> {
  const documentSelector = [
    { scheme: 'file', language: 'xp' },
    { scheme: 'file', language: 'en' },
    { scheme: 'file', language: 'agr' },
    { scheme: 'file', language: 'co' },
    { scheme: 'file', language: 'flt' }
  ];

  const initializationOptions = await buildKbtLspInitializationOptions(config);

  try {
    if (config.getLSPMode() === 'legacy') {
      Log.info('Skipping external KBT LSP startup because xpConfig.lspMode=legacy.');
    } else if (config.shouldUseDockerToolRunner()) {
      const proxyModule = context.asAbsolutePath(path.join('client', 'out', 'lspDockerProxy.js'));
      const extensionConfig = config.getWorkspaceConfiguration();
      const proxyConfig = {
        containerName: extensionConfig.get<string>('docker.containerName'),
        workspaceHostPath: extensionConfig.get<string>('docker.workspaceHostPath'),
        workspaceContainerPath: extensionConfig.get<string>('docker.workspaceContainerPath'),
        kbtBaseDirectory:
          extensionConfig.get<string>('docker.kbtBaseDirectory') || '/home/coder/xp-kbt',
        outputHostPath: extensionConfig.get<string>('outputDirectoryPath'),
        outputContainerPath: config.getDockerOutputDirectoryPath()
      };

      const encodedConfig = Buffer.from(JSON.stringify(proxyConfig), 'utf-8').toString('base64');
      const serverOptions: ServerOptions = {
        command: process.execPath,
        args: [proxyModule, encodedConfig],
        transport: TransportKind.stdio,
        options: {
          cwd: __dirname
        }
      };

      const clientOptions: LanguageClientOptions = {
        documentSelector,
        synchronize: {
          configurationSection: [config.getExtensionSettingsPrefix(), 'xplang_ls']
        },
        initializationOptions
      };

      const dockerClient = new XpLanguageClient(
        'xpDockerLanguageServer',
        'XP Docker Language Server',
        serverOptions,
        clientOptions
      );

      await dockerClient.start();
      notifyAboutStartedLspServer(config, dockerClient, 'Docker-backed XPLang LSP proxy');
      Log.info(
        `Docker-backed XPLang LSP proxy has started using '${proxyModule}' for container '${proxyConfig.containerName}'.`
      );
      return {
        client: dockerClient,
        usesKbtFormatter: true
      };
    } else {
      const lspServerExecutablePath = config.getResolvedLSPServerExecutablePath();

      if (lspServerExecutablePath) {
        Log.info(config.getMessage('LSPServer.ServerExecutableFoundAt', lspServerExecutablePath));
        const command = lspServerExecutablePath;
        const args: string[] = [];

        const serverOptions: ServerOptions = {
          command,
          args,
          transport: TransportKind.stdio,
          options: {
            cwd: __dirname
          }
        };

        const clientOptions: LanguageClientOptions = {
          documentSelector,
          synchronize: {
            configurationSection: [config.getExtensionSettingsPrefix(), 'xplang_ls']
          },
          initializationOptions
        };

        const externalClient = new XpLanguageClient(
          command,
          'XP Language Server',
          serverOptions,
          clientOptions
        );

        return externalClient
          .start()
          .then(() => {
            notifyAboutStartedLspServer(config, externalClient, 'KBT XPLang LSP server');

            return {
              client: externalClient,
              usesKbtFormatter: true
            };
          })
          .catch((error) => {
            vscode.window.showErrorMessage(
              'Failed to start XPLang Language Server: ' + error.message
            );
            throw error;
          });
      }
    }
  } catch (e) {
    // if error just use legacy server
    Log.warn(`Exception while searching XPLang LSP server: ${e.message}`);
  }

  Log.info(config.getMessage('LSPServer.UsingLegacyLSPServer'));

  /**
   * Legacy LSP server
   */

  // Показывает общую информацию по наведению на конструкцию.
  await XpHoverProvider.init(config);

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
      },
      {
        scheme: 'file',
        language: 'agr'
      },
      {
        scheme: 'file',
        language: 'flt'
      }
    ],
    synchronize: {
      // Notify the server about file changes to '.clientrc files contained in the workspace
      fileEvents: workspace.createFileSystemWatcher('**/.clientrc')
    }
  };

  // Создаем клиент, запускаем его и сервер.
  const legacyClient = new LanguageClient('languageServer', 'Language Server', serverOptions, clientOptions);
  try {
    await legacyClient.start();
    notifyAboutStartedLspServer(config, legacyClient, 'Legacy XPLang LSP server');
    Log.info(`Legacy XPLang LSP server has started from '${serverModule}'.`);
  } catch (error) {
    Log.error(`Failed to start legacy XPLang LSP server from '${serverModule}'.`, error);
    throw error;
  }

  return {
    client: legacyClient,
    usesKbtFormatter: false
  };
}

async function buildKbtLspInitializationOptions(config: Configuration): Promise<Record<string, string>> {
  const initializationOptions: Record<string, string> = {
    locale: vscode.env.language
  };

  try {
    const taxonomyPath = config.craftLSPTaxonomyPath();
    const taxonomyI18nPath = config.craftLSPi18nTaxonomyPath();
    initializationOptions.taxonomy_path = taxonomyPath;
    initializationOptions.taxonomy_i18n_path = taxonomyI18nPath;

    await config.updateLSPTaxonomyPath();
    await config.updateLSPi18nTaxonomyPath();

    const schemaPath = config.getKBTLSPConfiguration().get<string>('schema_path');
    if (schemaPath) {
      initializationOptions.schema_path = config.mapPathForExecution(schemaPath);
    }
  } catch (error) {
    Log.warn(`Failed to prepare KBT LSP initialization options: ${error.message}`);
  }

  return initializationOptions;
}

function notifyAboutStartedLspServer(
  config: Configuration,
  startedClient: LanguageClient,
  serverKind: string
): void {
  const serverProcess = startedClient['_serverProcess'];
  const pid = serverProcess?.pid;

  if (pid) {
    const message = config.getMessage('LSPServer.ServerHasStarted', pid);
    Log.info(message);
    void vscode.window.showInformationMessage(message);
    return;
  }

  const message = `${serverKind} has started.`;
  Log.info(message);
  void vscode.window.showInformationMessage(message);
}
