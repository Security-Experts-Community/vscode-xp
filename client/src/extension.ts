import * as path from 'path';
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as os from 'os';
import { spawn } from 'child_process';

import { workspace, ExtensionContext } from 'vscode';

import {
  InitializeParams,
  LanguageClient,
  LanguageClientOptions,
  ServerOptions,
  StreamInfo,
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
let client: LanguageClient | undefined;
let siemCustomPackingTaskProvider: vscode.Disposable | undefined;

interface LspStartupResult {
  client?: LanguageClient;
  usesKbtFormatter: boolean;
}

class XpLanguageClient extends LanguageClient {
  public constructor(
    id: string,
    name: string,
    serverOptions: ServerOptions,
    clientOptions: LanguageClientOptions,
    private readonly disableWorkspaceConfigurationCapability = false
  ) {
    super(id, name, serverOptions, clientOptions);
  }

  protected fillInitializeParams(params: InitializeParams): void {
    super.fillInitializeParams(params);

    const capabilities = (params.capabilities ??= {} as InitializeParams['capabilities']);
    const workspaceCapabilities = ((capabilities as any).workspace ??= {});
    if (workspaceCapabilities.workspaceFolders === undefined) {
      workspaceCapabilities.workspaceFolders = true;
    }

    if (this.disableWorkspaceConfigurationCapability) {
      workspaceCapabilities.configuration = false;
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

    await clearRuntimeDirectories(config);

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

async function clearRuntimeDirectories(config: Configuration): Promise<void> {
  const tmpDirectory = config.getTmpDirectoryPath();
  if (fs.existsSync(tmpDirectory)) {
    try {
      await FileSystemHelper.deleteAllSubDirectoriesAndFiles(tmpDirectory);
      Log.info(`The temporary files directory '${tmpDirectory}' was successfully cleared`);
    } catch (error) {
      Log.warn(`Error clearing files from temporary directory '${tmpDirectory}'`, error);
    }
  }

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
    if (config.isLocalMacOS()) {
      const lspServerExecutablePath = config.getResolvedLSPServerExecutablePath();
      if (lspServerExecutablePath) {
        Log.info(config.getMessage('LSPServer.ServerExecutableFoundAt', lspServerExecutablePath));
        const serverOptions = createNativeMacLspServerOptions(config, lspServerExecutablePath);

        const clientOptions: LanguageClientOptions = {
          documentSelector,
          synchronize: {
            configurationSection: ['xplang_ls']
          },
          initializationOptions,
          outputChannel: config.getOutputChannel()
        };

        const externalClient = new XpLanguageClient(
          lspServerExecutablePath,
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

      Log.info(
        'Skipping XPLang LSP startup on macOS because xpConfig.lspServerExecutablePath is not configured. Legacy LSP is disabled on this platform.'
      );
      return {
        client: undefined,
        usesKbtFormatter: false
      };
    }

    if (config.getLSPMode() === 'legacy') {
      Log.info('Skipping external KBT LSP startup because xpConfig.lspMode=legacy.');
    } else if (config.shouldUseDockerToolRunner()) {
      Log.info(
        'Skipping external KBT LSP startup in Docker tool execution mode. Falling back to the legacy in-extension LSP because the containerized KBT LSP still requires additional configuration/taxonomy plumbing.'
      );
    } else {
      const lspServerExecutablePath = config.getResolvedLSPServerExecutablePath();

      if (lspServerExecutablePath) {
        Log.info(config.getMessage('LSPServer.ServerExecutableFoundAt', lspServerExecutablePath));
        const serverOptions = config.isLocalMacOS()
          ? createNativeMacLspServerOptions(config, lspServerExecutablePath)
          : {
              command: lspServerExecutablePath,
              args: [],
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
          initializationOptions,
          outputChannel: config.getOutputChannel()
        };

        const externalClient = new XpLanguageClient(
          lspServerExecutablePath,
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
    },
    outputChannel: config.getOutputChannel()
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

  const shouldUseHostPathsForLsp =
    config.isLocalMacOS() && !!config.getResolvedLSPServerExecutablePath();
  const mapLspPath = (value: string) =>
    shouldUseHostPathsForLsp ? value : config.mapPathForExecution(value);

  // Taxonomy и schema резолвятся независимо: отсутствие KBT-таксономии не должно мешать
  // построению schema (и наоборот), поэтому каждый шаг обёрнут в собственный try.
  try {
    // Гибридный режим macOS (нативный LSP + Docker-бэкенд): KBT живёт в контейнере, а
    // нативному серверу нужны хостовые пути — выгружаем taxonomy из контейнера на хост.
    const stagedTaxonomy = config.isMacOsNativeLspWithDockerBackend()
      ? await config.stageTaxonomyFromContainer()
      : undefined;

    if (stagedTaxonomy) {
      initializationOptions.taxonomy_path = stagedTaxonomy.taxonomyPath;
      initializationOptions.taxonomy_i18n_path = stagedTaxonomy.taxonomyI18nPath;
    } else {
      const taxonomyPath = config.craftLSPTaxonomyPath();
      const taxonomyI18nPath = config.craftLSPi18nTaxonomyPath();

      await config.updateLSPTaxonomyPath();
      await config.updateLSPi18nTaxonomyPath();

      initializationOptions.taxonomy_path = mapLspPath(taxonomyPath);
      initializationOptions.taxonomy_i18n_path = mapLspPath(taxonomyI18nPath);
    }
  } catch (error) {
    Log.warn(`Failed to prepare KBT LSP taxonomy paths: ${error.message}`);
  }

  try {
    const schemaPath = await config.ensureLspSchemaPath();
    if (schemaPath) {
      initializationOptions.schema_path = mapLspPath(schemaPath);
    } else {
      Log.info(
        'KBT LSP schema is not available yet. Starting without schema_path; build schema to enable schema-based diagnostics and completions.'
      );
    }
  } catch (error) {
    Log.warn(`Failed to prepare KBT LSP schema path: ${error.message}`);
  }

  Log.info(
    `KBT LSP initialization options: taxonomy_path='${initializationOptions.taxonomy_path ?? ''}', taxonomy_i18n_path='${initializationOptions.taxonomy_i18n_path ?? ''}', schema_path='${initializationOptions.schema_path ?? ''}'`
  );

  return initializationOptions;
}

function createNativeMacLspServerOptions(
  config: Configuration,
  lspServerExecutablePath: string
): ServerOptions {
  return async (): Promise<StreamInfo> => {
    const child = spawn(lspServerExecutablePath, [], {
      cwd: path.dirname(lspServerExecutablePath),
      stdio: ['pipe', 'pipe', 'pipe']
    });

    child.stderr.on('data', (chunk: Buffer | string) => {
      const text = chunk.toString().trim();
      if (text) {
        config.getOutputChannel().appendLine(text);
      }
    });

    // Без этих обработчиков ранний крах сервера (нет +x, карантин Gatekeeper, отсутствующие
    // зависимости) виден пользователю только как невнятное «Cannot call write after a stream
    // was destroyed» из LSP-клиента. Логируем реальную причину в output-канал.
    child.on('error', (error) => {
      Log.error(
        `Native XPLang language server failed to start ('${lspServerExecutablePath}').`,
        error
      );
    });

    child.on('exit', (code, signal) => {
      if (code === 0) {
        return;
      }

      const reason = signal
        ? `signal ${signal}${
            signal === 'SIGKILL'
              ? " (likely blocked by macOS Gatekeeper — clear the file's com.apple.quarantine attribute)"
              : ''
          }`
        : `exit code ${code}`;

      Log.error(
        `Native XPLang language server '${lspServerExecutablePath}' terminated with ${reason}.`
      );
    });

    const reader = child.stdout;
    const writer = child.stdin;

    if (!reader || !writer) {
      throw new Error('Failed to initialize stdio pipes for native XPLang language server.');
    }

    return {
      reader,
      writer
    };
  };
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
