import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';

import { Guid } from 'guid-typescript';
import { FileSystemException } from './fileSystemException';
import { XpException as XpException } from './xpException';
import { ContentType } from '../contentType/contentType';
import { Localization } from './content/localization';
import { EDRPathHelper } from './locator/EDRPathLocator';
import { OsType, PathLocator } from './locator/pathLocator';
import { SIEMPathHelper } from './locator/SIEMPathLocator';
import { FileDiagnostics } from './siemj/siemJOutputParser';
import { LocalizationService } from '../l10n/localizationService';
import { Origin } from './content/userSettingsManager';
import { DialogHelper } from '../helpers/dialogHelper';
import { LogLevel } from '../logger';

export type EncodingType = 'windows-1251' | 'utf-8' | 'utf-16';

export class Configuration {
  private constructor(context: vscode.ExtensionContext) {
    this.context = context;

    const contentType = this.getContentType();
    this.setContentType(contentType);

    const extensionName = Configuration.getExtensionDisplayName();
    this.outputChannel = vscode.window.createOutputChannel(extensionName);
    this.localizationService = new LocalizationService(vscode.env.language, context.extensionPath);

    this.diagnosticCollection = vscode.languages.createDiagnosticCollection(extensionName);
    context.subscriptions.push(this.diagnosticCollection);
  }

  public getRulesDirFilters(): string {
    return this.pathHelper.getRulesDirFilters();
  }
  public getContentRoots(): string[] {
    return this.pathHelper.getContentRoots();
  }
  public getPackages(): string[] {
    return this.pathHelper.getPackages();
  }
  public isKbOpened(): boolean {
    return this.pathHelper.isKbOpened();
  }
  public getRootByPath(directory: string): string {
    return this.pathHelper.getRootByPath(directory);
  }
  public getRequiredRootDirectories(): string[] {
    return this.pathHelper.getRequiredRootDirectories();
  }

  public setContentType(contentType: ContentType): void {
    if (contentType === ContentType.EDR) {
      this.pathHelper = EDRPathHelper.get();
    } else {
      this.pathHelper = SIEMPathHelper.get();
    }
    this.context.workspaceState.update('ContentType', contentType);
  }

  public getFirstWorkspaceFolder(): string {
    if (vscode.workspace.workspaceFolders.length === 0) {
      throw new XpException('Рабочая директория не найдена');
    }

    return vscode.workspace.workspaceFolders[0].uri.fsPath;
  }

  public getMessage(
    messageKey: string,
    ...args: (string | number | boolean | undefined | null)[]
  ): string {
    return this.localizationService.getMessage(messageKey, ...args);
  }

  public getKbFullPath(): string {
    return this.pathHelper.getKbPath();
  }

  public static getContentTypeBySubDirectories(subDirectories: string[]): ContentType | undefined {
    const EDRpathHelper = EDRPathHelper.get();
    const SIEMpathHelper = SIEMPathHelper.get();
    const EDRrequiredRootDirectories = EDRpathHelper.getRequiredRootDirectories()
      .map(function (d) {
        return d.split(path.sep)[0];
      })
      .filter((elem, index, self) => {
        return index === self.indexOf(elem);
      });
    const SIEMrequiredRootDirectories = SIEMpathHelper.getRequiredRootDirectories()
      .map(function (d) {
        return d.split(path.sep)[0];
      })
      .filter((elem, index, self) => {
        return index === self.indexOf(elem);
      });

    if (EDRrequiredRootDirectories.every((folder) => subDirectories.includes(folder))) {
      return ContentType.EDR;
    }

    if (SIEMrequiredRootDirectories.every((folder) => subDirectories.includes(folder))) {
      return ContentType.SIEM;
    }

    return undefined;
  }

  /**
   * Очищает все диагностики и добавляет новые
   * @param diagnostics
   */
  public resetDiagnostics(diagnostics: FileDiagnostics[]): void {
    this.diagnosticCollection.clear();
    for (const diagnostic of diagnostics) {
      this.diagnosticCollection.set(diagnostic.uri, diagnostic.diagnostics);
    }
  }

  /**
   * TODO: инкапсулировать доступ к диагностикам
   * @returns
   */
  public getDiagnosticCollection(): vscode.DiagnosticCollection {
    return this.diagnosticCollection;
  }

  public addDiagnosticCollection(uri: string, addedDiag: vscode.Diagnostic): void {
    const fileUri = vscode.Uri.file(uri);
    if (!this.diagnosticCollection.has(fileUri)) {
      this.diagnosticCollection.set(fileUri, [addedDiag]);
      return;
    }

    // Копируем имеющие и добавляем новые.
    const prevDiags = this.diagnosticCollection.get(fileUri);
    const newDiags: vscode.Diagnostic[] = [];
    prevDiags.forEach((d) => newDiags.push(d));
    newDiags.push(addedDiag);

    this.diagnosticCollection.set(fileUri, newDiags);
  }

  public getOutputChannel(): vscode.OutputChannel {
    return this.outputChannel;
  }

  public getExtensionMode(): vscode.ExtensionMode {
    return this.context.extensionMode;
  }

  public getContext(): vscode.ExtensionContext {
    return this.context;
  }

  public getExtensionUri(): vscode.Uri {
    return this.context.extensionUri;
  }

  public getExtensionPath(): string {
    return this.context.extensionPath;
  }

  public static getExtensionDisplayName(): string {
    return 'eXtraction and Processing';
  }

  public static getExtensionDirectoryName(): string {
    return 'eXtractionAndProcessing';
  }

  public getOsType(): OsType {
    const osType = os.platform();
    switch (osType) {
      case 'win32':
        return OsType.Windows;
      case 'linux':
        return OsType.Linux;
      case 'darwin':
        return OsType.Mac;
      default:
        throw new Error('Платформа не поддерживается');
    }
  }

  public getSiemjOutputEncoding(): EncodingType {
    switch (this.getOsType()) {
      case OsType.Windows:
        return 'windows-1251';
      case OsType.Linux:
        return 'utf-8';
      case OsType.Mac:
        return 'utf-8';
      default:
        throw new XpException('Платформа не поддерживается');
    }
  }

  /**
   * Возвращает путь к директории со всеми SDK утилитами.
   * @returns путь к директории со всеми SDK утилитами.
   */
  public getKbtBaseDirectory(): string {
    const configuration = this.getWorkspaceConfiguration();
    const basePath = configuration.get<string>('kbtBaseDirectory');
    this.checkKbtSetting(configuration);

    return basePath;
  }

  /**
   * Возвращает внутреннее имя расширения.
   * @returns внутреннее имя расширения.
   */
  public getExtensionSettingsPrefix(): string {
    return this.CONFIGURATION_PREFIX;
  }

  public getResourcesUri(): vscode.Uri {
    const templatesUri = vscode.Uri.joinPath(this.getExtensionUri(), 'templates');
    return templatesUri;
  }

  public getContentType(): ContentType {
    const contentTypeString = this.context.workspaceState.get<string>('ContentType');
    const contentType: ContentType = ContentType[contentTypeString];
    return contentType;
  }

  public getSiemjPath(): string {
    let appName = '';
    switch (this.getOsType()) {
      case OsType.Windows:
        appName = 'siemj.exe';
        break;
      case OsType.Linux:
        appName = 'siemj';
        break;
      case OsType.Mac:
        throw new XpException(this.getMessage('Error.MacOsIsNotNativelySupported'));

      default:
        throw new XpException('Платформа не поддерживается');
    }

    const fullPath = path.join(this.getKbtBaseDirectory(), 'extra-tools', 'siemj', appName);
    this.checkKbtSingleToolPath(fullPath);

    return fullPath;
  }

  public getSiemkbTestsPath(): string {
    let appName = '';
    switch (this.getOsType()) {
      case OsType.Windows:
        appName = 'siemkb_tests.exe';
        break;
      case OsType.Linux:
        appName = 'siemkb_tests';
        break;
      case OsType.Mac:
        throw new XpException(this.getMessage('Error.MacOsIsNotNativelySupported'));

      default:
        throw new XpException('Платформа не поддерживается');
    }

    const fullPath = path.join(this.getKbtBaseDirectory(), this.BUILD_TOOLS_DIR_NAME, appName);
    this.checkKbtSingleToolPath(fullPath);

    return fullPath;
  }

  public getRccCli(): string {
    let appName = '';
    switch (this.getOsType()) {
      case OsType.Windows:
        appName = 'rcc.exe';
        break;
      case OsType.Linux:
        appName = 'rcc';
        break;
      case OsType.Mac:
        throw new XpException(this.getMessage('Error.MacOsIsNotNativelySupported'));

      default:
        throw new XpException('Платформа не поддерживается');
    }

    const fullPath = path.join(this.getKbtBaseDirectory(), 'xp-sdk', 'cli', appName);
    this.checkKbtSingleToolPath(fullPath);

    return fullPath;
  }

  public getMkTablesPath(): string {
    let appName = '';
    switch (this.getOsType()) {
      case OsType.Windows:
        appName = 'mktables.exe';
        break;
      case OsType.Linux:
        appName = 'mktables';
        break;
      case OsType.Mac:
        throw new XpException(this.getMessage('Error.MacOsIsNotNativelySupported'));

      default:
        throw new XpException('Платформа не поддерживается');
    }

    const fullPath = path.join(this.getKbtBaseDirectory(), 'build-tools', appName);
    this.checkKbtSingleToolPath(fullPath);

    return fullPath;
  }

  public getFPTAFillerPath(): string {
    let appName = '';
    switch (this.getOsType()) {
      case OsType.Windows:
        appName = 'fpta_filler.exe';
        break;
      case OsType.Linux:
        appName = 'fpta_filler';
        break;
      case OsType.Mac:
        throw new XpException(this.getMessage('Error.MacOsIsNotNativelySupported'));

      default:
        throw new XpException('Платформа не поддерживается');
    }

    const fullPath = path.join(this.getKbtBaseDirectory(), 'xp-sdk', appName);
    this.checkKbtSingleToolPath(fullPath);

    return fullPath;
  }

  public getLocalizationBuilder(): string {
    let appName = '';
    switch (this.getOsType()) {
      case OsType.Windows:
        appName = 'build_l10n_rules.exe';
        break;
      case OsType.Linux:
        appName = 'build_l10n_rules';
        break;
      case OsType.Mac:
        throw new XpException(this.getMessage('Error.MacOsIsNotNativelySupported'));

      default:
        throw new XpException('Платформа не поддерживается');
    }

    const fullPath = path.join(this.getKbtBaseDirectory(), 'build-tools', appName);
    this.checkKbtSingleToolPath(fullPath);

    return fullPath;
  }

  public getSiemKBTests(): string {
    let appName = '';
    switch (this.getOsType()) {
      case OsType.Windows:
        appName = 'siemkb_tests.exe';
        break;
      case OsType.Linux:
        appName = 'siemkb_tests';
        break;
      case OsType.Mac:
        throw new XpException(this.getMessage('Error.MacOsIsNotNativelySupported'));

      default:
        throw new XpException('Платформа не поддерживается');
    }

    const fullPath = path.join(this.getKbtBaseDirectory(), 'build-tools', appName);
    this.checkKbtSingleToolPath(fullPath);

    return fullPath;
  }

  public getNormalizerCli(): string {
    let appName = '';
    switch (this.getOsType()) {
      case OsType.Windows:
        appName = 'normalizer-cli.exe';
        break;
      case OsType.Linux:
        appName = 'normalizer-cli';
        break;
      case OsType.Mac:
        throw new XpException(this.getMessage('Error.MacOsIsNotNativelySupported'));

      default:
        throw new XpException('Платформа не поддерживается');
    }

    const fullPath = path.join(this.getKbtBaseDirectory(), 'xp-sdk', 'cli', appName);
    this.checkKbtSingleToolPath(fullPath);

    return fullPath;
  }

  public getNormalizer(): string {
    let appName = '';
    switch (this.getOsType()) {
      case OsType.Windows:
        appName = 'normalize.exe';
        break;
      case OsType.Linux:
        appName = 'normalize';
        break;
      case OsType.Mac:
        throw new XpException(this.getMessage('Error.MacOsIsNotNativelySupported'));

      default:
        throw new XpException('Платформа не поддерживается');
    }

    const fullPath = path.join(this.getKbtBaseDirectory(), 'build-tools', appName);
    this.checkKbtSingleToolPath(fullPath);

    return fullPath;
  }

  public getKbPackFullPath(): string {
    const appName = 'kbpack.dll';
    const fullPath = path.join(this.getKbtBaseDirectory(), 'extra-tools', 'kbpack', appName);
    this.checkKbtSingleToolPath(fullPath);

    return fullPath;
  }

  public getEvtxToJsonToolFullPath(): string {
    let appPath = '';
    switch (this.getOsType()) {
      case OsType.Windows:
        appPath = path.join('win32', 'evtx_converter.exe');
        break;
      case OsType.Linux:
        appPath = path.join('linux_gnu', 'evtx_converter');
        break;
      case OsType.Mac:
        throw new XpException(this.getMessage('Error.MacOsIsNotNativelySupported'));

      default:
        throw new XpException('Платформа не поддерживается');
    }
    const fullPath = path.join(this.getExtensionPath(), 'tools', appPath);
    return fullPath;
  }

  public getEcatestFullPath(): string {
    let appName = '';
    switch (this.getOsType()) {
      case OsType.Windows:
        appName = 'ecatest.exe';
        break;
      case OsType.Linux:
        appName = 'ecatest';
        break;
      case OsType.Mac:
        throw new XpException(this.getMessage('Error.MacOsIsNotNativelySupported'));

      default:
        throw new XpException('Платформа не поддерживается');
    }

    const fullPath = path.join(this.getKbtBaseDirectory(), 'build-tools', appName);
    this.checkKbtSingleToolPath(fullPath);

    return fullPath;
  }

  public getOutputDirectoryPath(rootFolder?: string): string {
    if (rootFolder) {
      return path.join(this.getBaseOutputDirectoryPath(), rootFolder);
    } else {
      return this.getBaseOutputDirectoryPath();
    }
  }

  public getCorrelationDefaultsFileName(): string {
    return 'correlation_defaults.json';
  }

  public getCorrelationDefaultsFilePath(rootFolder: string): string {
    return path.join(
      this.getOutputDirectoryPath(rootFolder),
      this.getCorrelationDefaultsFileName()
    );
  }

  public getSchemaFileName(): string {
    return 'schema.json';
  }

  public getSchemaFullPath(rootFolder: string): string {
    return path.join(this.getOutputDirectoryPath(rootFolder), this.getSchemaFileName());
  }

  public getWhitelistingPath(rootFolder: string): string {
    return path.join(this.getOutputDirectoryPath(rootFolder), this.getWhitelistingFileName());
  }

  public getWhitelistingFileName(): string {
    return 'whitelisting_graph.json ';
  }

  public getNormalizedEventsFileName(): string {
    return 'norm_events.json';
  }

  public getNormalizedEventsFilePath(rootFolder: string): string {
    return path.join(this.getOutputDirectoryPath(rootFolder), this.getNormalizedEventsFileName());
  }

  public getNotNormalizedEventsFileName(): string {
    return 'not_normalized.json';
  }

  public getEnrichedEventsFileName(): string {
    return 'enrich_events.json';
  }

  public getEnrichedEventsFilePath(rootFolder: string): string {
    return path.join(this.getOutputDirectoryPath(rootFolder), this.getEnrichedEventsFileName());
  }

  public getCorrelatedEventsFileName(): string {
    return 'corr_events.json';
  }

  public getCorrelatedEventsFilePath(rootFolder: string): string {
    return path.join(this.getOutputDirectoryPath(rootFolder), this.getCorrelatedEventsFileName());
  }

  public getRuleLocaleLocalizationFilePath(rootFolder: string): string {
    switch (vscode.env.language) {
      case 'ru': {
        return this.getRuRuleLocalizationFilePath(rootFolder);
      }
      case 'en': {
        return this.getEnRuleLocalizationFilePath(rootFolder);
      }
      // English by default.
      default: {
        return this.getEnRuleLocalizationFilePath(rootFolder);
      }
    }
  }

  public getRuRuleLocalizationFilePath(rootFolder: string): string {
    return path.join(this.getOutputDirectoryPath(rootFolder), this.getRuRuleLocalizationFileName());
  }

  public getEnRuleLocalizationFilePath(rootFolder: string): string {
    return path.join(this.getOutputDirectoryPath(rootFolder), this.getEnRuleLocalizationFileName());
  }

  public getRuRuleLocalizationFileName(): string {
    return 'ru_events.json';
  }

  public getEnRuleLocalizationFileName(): string {
    return 'en_events.json';
  }

  public getLangsDirName(): string {
    return 'langs';
  }

  public getRuLangFilePath(rootFolder: string): string {
    return path.join(this.getOutputDirectoryPath(rootFolder), this.getLangsDirName(), 'ru.lang');
  }

  public getEnLangFilePath(rootFolder: string): string {
    return path.join(this.getOutputDirectoryPath(rootFolder), this.getLangsDirName(), 'en.lang');
  }

  // Пути к файлам зависят от текущего режима работы
  // При смене режима SIEM/EDR заменяется реализация _pathHelper

  public getNormalizationsGraphFileName(): string {
    return this.pathHelper.getNormalizationsGraphFileName();
  }

  public getAggregationGraphFileName(): string {
    return this.pathHelper.getAggregationsGraphFileName();
  }

  public getEnrichmentsGraphFileName(): string {
    return this.pathHelper.getEnrichmentsGraphFileName();
  }

  public getCorrelationsGraphFileName(): string {
    return this.pathHelper.getCorrelationsGraphFileName();
  }

  public getNormalizationsGraphFilePath(rootFolder: string): string {
    return path.join(
      this.getOutputDirectoryPath(rootFolder),
      this.pathHelper.getNormalizationsGraphFileName()
    );
  }

  public getEnrichmentsGraphFilePath(rootFolder: string): string {
    return path.join(this.getOutputDirectoryPath(rootFolder), this.getEnrichmentsGraphFileName());
  }

  public getCorrelationsGraphFilePath(rootFolder: string): string {
    return path.join(this.getOutputDirectoryPath(rootFolder), this.getCorrelationsGraphFileName());
  }

  public getAggregationsGraphFilePath(rootFolder: string): string {
    return path.join(this.getOutputDirectoryPath(rootFolder), this.getAggregationGraphFileName());
  }

  public getLocalizationsFolder(): string {
    return this.pathHelper.getLocalizationsFolder();
  }

  public getFptaDbFileName(): string {
    return 'fpta_db.db';
  }

  public getFptaDbFilePath(rootFolder: string): string {
    return path.join(this.getOutputDirectoryPath(rootFolder), this.getFptaDbFileName());
  }

  public getExtensionTmpDirectoryPath(rootFolder?: string): string {
    let systemTmpPath: string;
    if (rootFolder) {
      systemTmpPath = path.join(os.tmpdir(), Configuration.getExtensionDirectoryName(), rootFolder);
    } else {
      systemTmpPath = path.join(os.tmpdir(), Configuration.getExtensionDirectoryName());
    }

    return systemTmpPath;
  }

  public getTmpDirectoryPath(rootFolder?: string): string {
    const tmpDirName = 'tmp';
    if (rootFolder) {
      return path.join(
        os.tmpdir(),
        Configuration.getExtensionDirectoryName(),
        tmpDirName,
        rootFolder
      );
    } else {
      return path.join(os.tmpdir(), Configuration.getExtensionDirectoryName(), tmpDirName);
    }
  }

  public getTmpSiemjConfigPath(rootFolder: string): string {
    return path.join(
      this.getRandTmpSubDirectoryPath(rootFolder),
      Configuration.SIEMJ_CONFIG_FILENAME
    );
  }

  public getRandTmpSubDirectoryPath(rootFolder?: string): string {
    return path.join(this.getOutputDirectoryPath(rootFolder), Guid.create().toString());
  }

  public getSiemSdkDirectoryPath(): string {
    const dirName = 'xp-sdk';
    const fullPath = path.join(this.getKbtBaseDirectory(), dirName);
    this.checkKbtSingleToolPath(fullPath);

    return fullPath;
  }

  public getBuildToolsDirectoryFullPath(): string {
    const dirName = 'build-tools';
    const fullPath = path.join(this.getKbtBaseDirectory(), dirName);
    this.checkKbtSingleToolPath(fullPath);

    return fullPath;
  }

  /**
   * Возвращает путь к папке с директориями контрактов из KBT.
   * @returns путь к папке с директориями контрактов.
   */
  private getContractsDirectory(): string {
    return path.join(this.getKbtBaseDirectory(), 'knowledgebase', Configuration.CONTRACTS_DIR_NAME);
  }

  /**
   * Возвращает путь к файлу описания таксономии.
   * @returns путь к файлу описания таксономии.
   */
  public getTaxonomyFullPath(): string {
    const taxonomyFileName = 'taxonomy.json';
    const fullPath = path.join(
      this.getContractsDirectory(),
      Configuration.TAXONOMY_DIR_NAME,
      taxonomyFileName
    );
    this.checkKbtSingleToolPath(fullPath);

    return fullPath;
  }

  /**
   * Возвращает путь к директории с таксономией.
   * @returns путь к директории с таксономией.
   */
  public getTaxonomyDirPath(): string {
    const fullPath = path.join(this.getContractsDirectory(), Configuration.TAXONOMY_DIR_NAME);
    this.checkKbtSingleToolPath(fullPath);

    return fullPath;
  }

  public getOriginsFilePath(): string {
    const fullPath = path.join(this.getExtensionPath(), 'content_templates', 'origins', 'sec.json');
    return fullPath;
  }

  /**
   * Возвращает путь к файлу дополнения формул нормализации.
   * @returns путь к файлу дополнения формул нормализации.
   */
  public getAppendixFullPath(): string {
    const appendixFileName = 'appendix.xp';
    const fullPath = path.join(this.getContractsDirectory(), 'xp_appendix', appendixFileName);
    this.checkKbtSingleToolPath(fullPath);

    return fullPath;
  }

  /**
   * Возвращает путь к файлу описания контрактов табличных списков.
   * @returns путь к файлу описания контрактов табличных списков.
   */
  public getTablesContract(): string {
    const tabularContractsFileName = 'tables_contract.yaml';
    const fullPath = path.join(
      this.getContractsDirectory(),
      'tabular_lists',
      tabularContractsFileName
    );
    this.checkKbtSingleToolPath(fullPath);

    return fullPath;
  }

  /**
   * Префикс ObjectId, определяющий тип создаваемого контента.
   * @returns префикс создаваемого контента.
   */
  public getContentPrefix(): string {
    const configuration = this.getWorkspaceConfiguration();
    const contentPrefix = configuration.get<string>('origin.contentPrefix');
    return contentPrefix;
  }

  public async setContentPrefix(prefix: string): Promise<void> {
    const configuration = this.getWorkspaceConfiguration();
    const origin = configuration.get<Origin>('origin');
    origin.contentPrefix = prefix;
    await configuration.update('origin', origin, true, false);
  }

  public getWorkspaceConfiguration(): vscode.WorkspaceConfiguration {
    return vscode.workspace.getConfiguration(this.CONFIGURATION_PREFIX);
  }

  /**
   * Возвращает таймаут работы коррелятора.
   * @returns
   */
  public getСorrelatorTimeoutPerSecond(): number {
    const configuration = this.getWorkspaceConfiguration();
    const correlatorTimeout = configuration.get<number>('correlatorTimeout');
    return correlatorTimeout;
  }

  public getLogLevel(): LogLevel {
    const configuration = this.getWorkspaceConfiguration();
    const logLevel = configuration.get<string>('logLevel');
    switch (logLevel) {
      case LogLevel[LogLevel.Error]: {
        return LogLevel.Error;
      }
      case LogLevel[LogLevel.Warn]: {
        return LogLevel.Warn;
      }
      case LogLevel[LogLevel.Info]: {
        return LogLevel.Info;
      }
      case LogLevel[LogLevel.Debug]: {
        return LogLevel.Debug;
      }
      case LogLevel[LogLevel.Trace]: {
        return LogLevel.Trace;
      }
      default: {
        // По умолчанию
        return LogLevel.Info;
      }
    }
  }

  public getBaseOutputDirectoryPath(): string {
    const extensionSettings = this.getWorkspaceConfiguration();
    const outputDirectoryPath = extensionSettings.get<string>('outputDirectoryPath');

    if (!outputDirectoryPath || outputDirectoryPath === '') {
      throw new FileSystemException(
        this.getMessage('Error.OutputDirectoryPathIsNotSet'),
        outputDirectoryPath
      );
    }

    if (!fs.existsSync(outputDirectoryPath)) {
      throw new FileSystemException(
        this.getMessage('Error.IncorrectOutputDirectoryPath', outputDirectoryPath),
        outputDirectoryPath
      );
    }

    return outputDirectoryPath;
  }

  /**
   * Возвращает путь к файлу русской локализации таксономии.
   * @returns путь к файлу русской локализации таксономии.
   */
  public getTaxonomyRuLocalizationFullPath(): string {
    const taxonomyFullPath = this.getTaxonomyFullPath();

    const taxonomyDirectoryPath = path.dirname(taxonomyFullPath);
    const ruLocalizationFilePath = path.join(
      taxonomyDirectoryPath,
      Localization.LOCALIZATIONS_DIRNAME,
      Localization.RU_LOCALIZATION_FILENAME
    );

    return ruLocalizationFilePath;
  }

  private checkKbtSingleToolPath(fullPath: string): void {
    if (!fs.existsSync(fullPath)) {
      throw new XpException(this.getMessage('Error.UtilityPathIsIncorrect', fullPath));
    }
  }

  public async checkUserSetting(): Promise<void> {
    const extensionConfig = this.getWorkspaceConfiguration();

    // Порядок обратный по приоритету, так как вторая ошибка появится выше чем первая.
    await this.checkAndCreateOutputDirectory(extensionConfig);
    this.checkKbtSetting(extensionConfig);
  }

  private checkKbtSetting(extensionConfig: vscode.WorkspaceConfiguration) {
    const kbtBasePath = extensionConfig.get<string>('kbtBaseDirectory');

    if (!kbtBasePath) {
      throw new XpException(this.getMessage('Error.KbtDirectoryPathIsNotSet'));
    }

    if (!fs.existsSync(kbtBasePath)) {
      throw new XpException(this.getMessage('Error.KbtDirectoryPathIsNoExist', kbtBasePath));
    }
  }

  private async checkAndCreateOutputDirectory(
    extensionConfig: vscode.WorkspaceConfiguration
  ): Promise<void> {
    const outputDirectoryPath = extensionConfig.get<string>('outputDirectoryPath');

    if (!outputDirectoryPath) {
      DialogHelper.showError(this.getMessage('Error.OutputDirectoryPathIsNotSet'));
      return;
    }

    try {
      await fs.promises.mkdir(outputDirectoryPath, { recursive: true });
    } catch (error) {
      throw new XpException(
        this.getMessage(`Error.IncorrectOutputDirectoryPath`, outputDirectoryPath)
      );
    }
  }

  public static get(): Configuration {
    if (!this._instance) {
      throw new XpException(
        'The extension configuration has not been received. It may not have been initialized.'
      );
    }
    return this._instance;
  }

  public static async init(context: vscode.ExtensionContext): Promise<Configuration> {
    this._instance = new Configuration(context);
    return this._instance;
  }

  private static _instance: Configuration;

  private pathHelper: PathLocator;
  private outputChannel: vscode.OutputChannel;
  private context: vscode.ExtensionContext;
  private diagnosticCollection: vscode.DiagnosticCollection;
  private localizationService: LocalizationService;

  private readonly CONFIGURATION_PREFIX = 'xpConfig';
  private readonly BUILD_TOOLS_DIR_NAME = 'build-tools';

  private readonly MAC_OS_MESSAGE_ABOUT_MAC_OS_SUPPORT =
    'Платформа поддерживается только с использованием веб-версии VSCode Workspace. С документацией можно ознакомится [тут](https://vscode-xp.readthedocs.io/ru/latest/gstarted.html#vscode-xp-workspace)';

  public static readonly TAXONOMY_DIR_NAME = 'taxonomy';
  public static readonly CONTRACTS_DIR_NAME = 'contracts';
  public static readonly SIEMJ_CONFIG_FILENAME = 'siemj.conf';
}
