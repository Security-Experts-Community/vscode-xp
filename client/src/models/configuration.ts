import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';

import { Guid } from 'guid-typescript';
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
import { FileSystemHelper } from '../helpers/fileSystemHelper';
import { LogLevel } from '../logger';
import { Log } from '../extension';
import {
  DockerToolRunner,
  ToolExecutionMode,
  ToolRunner,
  ToolRunnerFactory
} from '../tools/toolRunner';

export type EncodingType = 'windows-1251' | 'utf-8' | 'utf-16';

export class Configuration {
  private static autoSelectKBTExecuted = false;
  private SIEMJVersion: string;
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

  public setKBTVersion(kbtVersion: string): void {
    this.context.workspaceState.update('KBTVersion', kbtVersion);
  }

  public getCurrentSIEMJVersion(): string {
    if (this.SIEMJVersion) {
      return this.SIEMJVersion;
    }

    this.SIEMJVersion = this.detectSIEMJVersionSync();
    return this.SIEMJVersion;
  }

  public async setSIEMJVersion(): Promise<void> {
    const result = (await this.getToolRunner().runSiemj(['-v'], { encoding: 'utf-8' })).output.trim();
    if (result.match(/siemj(?:\.real|\.exe)?\s+1\./)) {
      this.SIEMJVersion = '1';
    } else {
      if (result.match(/siemj(?:\.real|\.exe)?\s+2\./)) {
        this.SIEMJVersion = '2';
      } else {
        throw new XpException(`Unexpected SIEMJ version: ${result}`);
      }
    }
  }

  public getLSPMode(): 'auto' | 'legacy' | 'kbt' {
    const mode = this.getWorkspaceConfiguration().get<'auto' | 'legacy' | 'kbt'>('lspMode');
    return mode ?? 'auto';
  }

  public getLSPTaxonomyPath(): string {
    const configuration = this.getKBTLSPConfiguration();
    return configuration.get<string>('taxonomy_path');
  }

  public craftLSPTaxonomyPath(): string {
    return this.getTaxonomyFullPath();
  }

  public getLSPi18nTaxonomyPath(): string {
    const configuration = this.getKBTLSPConfiguration();
    return configuration.get<string>('taxonomy_i18n_path');
  }

  public craftLSPi18nTaxonomyPath(): string {
    return path.join(this.getTaxonomyDirPath(), 'i18n');
  }

  public async updateLSPTaxonomyPath(): Promise<void> {
    const configuration = this.getKBTLSPConfiguration();
    const taxonomyPath = this.craftLSPTaxonomyPath();
    await configuration.update('taxonomy_path', taxonomyPath, true, false);
  }

  public async updateLSPi18nTaxonomyPath(): Promise<void> {
    const configuration = this.getKBTLSPConfiguration();
    const taxonomyPath = this.craftLSPi18nTaxonomyPath();
    await configuration.update('taxonomy_i18n_path', taxonomyPath, true, false);
  }

  public updateLSPSchemaTaxonomyPath(schemaPath: string): void {
    const configuration = this.getKBTLSPConfiguration();
    configuration.update('schema_path', schemaPath);
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

  public getToolExecutionMode(): ToolExecutionMode {
    const mode = this.getWorkspaceConfiguration().get<ToolExecutionMode>('toolExecutionMode');
    return mode ?? 'auto';
  }

  public isLocalMacOS(): boolean {
    return process.platform === 'darwin' && !vscode.env.remoteName;
  }

  public shouldUseDockerToolRunner(): boolean {
    return ToolRunnerFactory.resolveMode(this.getToolExecutionMode()) === 'docker';
  }

  public getToolRunner(): ToolRunner {
    return ToolRunnerFactory.create({
      mode: this.getToolExecutionMode(),
      kbtBaseDirectory: this.tryGetKbtBaseDirectoryForLocalRunner(),
      outputDirectoryPath: this.getBaseOutputDirectoryPath(),
      docker: {
        containerName: this.getWorkspaceConfiguration().get<string>('docker.containerName'),
        composeFile: this.getWorkspaceConfiguration().get<string>('docker.composeFile'),
        serviceName: this.getWorkspaceConfiguration().get<string>('docker.serviceName'),
        workspaceHostPath: this.getWorkspaceConfiguration().get<string>('docker.workspaceHostPath'),
        workspaceContainerPath: this.getWorkspaceConfiguration().get<string>(
          'docker.workspaceContainerPath'
        ),
        kbtBaseDirectory: this.getWorkspaceConfiguration().get<string>('docker.kbtBaseDirectory'),
        outputDirectoryPath: this.getDockerOutputDirectoryPath()
      }
    });
  }

  public getMacOSShowContainerSetupPrompt(): boolean {
    return this.getWorkspaceConfiguration().get<boolean>('macos.showContainerSetupPrompt') ?? true;
  }

  public async setMacOSShowContainerSetupPrompt(value: boolean): Promise<void> {
    await this.getWorkspaceConfiguration().update('macos.showContainerSetupPrompt', value, true);
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
        throw new Error(`Платформа ${osType} не поддерживается`);
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
    if (this.shouldUseDockerToolRunner()) {
      return (
        this.getWorkspaceConfiguration().get<string>('docker.kbtBaseDirectory') ||
        '/home/coder/xp-kbt'
      );
    }

    const kbtVersionsDirectory = this.getKbtVersionsDirectory();
    if (!kbtVersionsDirectory) {
      return this.getKbtBaseDirectoryOld();
    }
    const currentKBTVersion = this.getKbtVersion();
    const kbtBasePath = path.join(kbtVersionsDirectory, currentKBTVersion);
    if (!kbtBasePath) {
      throw new XpException(this.getMessage('Error.KbtDirectoryPathIsNotSet'));
    }

    if (!fs.existsSync(kbtBasePath)) {
      throw new XpException(this.getMessage('Error.KbtDirectoryPathIsNoExist', kbtBasePath));
    }

    return kbtBasePath;
  }

  public getKbtBaseDirectoryOld(): string {
    const configuration = this.getWorkspaceConfiguration();
    const basePath = configuration.get<string>('kbtBaseDirectory');

    // If kbtBaseDirectory is not set, try to auto-select first available KBT
    if (!basePath) {
      this.autoSelectKBT();
      // Get the base path after auto-selection without recursive call
      const newBasePath = configuration.get<string>('kbtBaseDirectory');
      if (newBasePath) {
        return newBasePath;
      }
      // Fallback if auto-selection didn't work
      throw new XpException(this.getMessage('Error.KbtDirectoryPathIsNotSet'));
    }

    this.checkKbtSetting(configuration);

    return basePath;
  }

  /**
   * Helper method to select the first available KBT version and set the kbtBaseDirectory
   * if it hasn't been set previously
   */
  private selectAndSetKBT(): boolean {
    try {
      const kbtVersionsDirectory = this.getKbtVersionsDirectory();

      // Check if kbtVersionsDirectory exists
      if (!kbtVersionsDirectory || !fs.existsSync(kbtVersionsDirectory)) {
        Log.warn('KBT versions directory not found');
        return false;
      }

      // Read the directory contents to find available KBT versions
      const kbtVersions = fs.readdirSync(kbtVersionsDirectory);

      // Filter for valid KBT version folders (matching the pattern kbt.x.x)
      const kbtVersionFolders = kbtVersions.filter((folder) => folder.match(/^kbt(\.\d+)+$/));

      if (kbtVersionFolders.length === 0) {
        Log.warn('No KBT version folders found in the KBT versions directory');
        return false;
      }

      // Sort versions to ensure consistent selection (optional)
      kbtVersionFolders.sort();

      // Select the first available version
      const firstKBTVersion = kbtVersionFolders[0];

      // Set the KBT version in workspace state
      this.setKBTVersion(firstKBTVersion);

      // Set the kbtBaseDirectory configuration if not already set
      const configuration = this.getWorkspaceConfiguration();
      const kbtBaseDirectory = configuration.get<string>('kbtBaseDirectory');

      if (!kbtBaseDirectory) {
        const kbtBasePath = path.join(kbtVersionsDirectory, firstKBTVersion);
        // Validate that the path actually exists before setting it
        if (fs.existsSync(kbtBasePath)) {
          configuration.update('kbtBaseDirectory', kbtBasePath, true, false);
          Log.info(`Automatically set KBT base directory to: ${kbtBasePath}`);
          return true;
        } else {
          Log.warn(`KBT base path does not exist: ${kbtBasePath}`);
          return false;
        }
      }

      Log.info(`Automatically selected KBT version: ${firstKBTVersion}`);
      return true;
    } catch (error) {
      Log.warn(`Failed to auto-select KBT: ${error.message}`);
      return false;
    }
  }

  /**
   * Automatically selects the first available KBT version and sets the kbtBaseDirectory
   * if it hasn't been set previously
   */
  private autoSelectKBT(): void {
    try {
      // Prevent multiple executions
      if (Configuration.autoSelectKBTExecuted) {
        return;
      }

      const success = this.selectAndSetKBT();
      if (success) {
        Configuration.autoSelectKBTExecuted = true;
      }
    } catch (error) {
      Log.warn(`Failed to auto-select KBT: ${error.message}`);
      Configuration.autoSelectKBTExecuted = true;
    }
  }

  public getKbtVersionsDirectory(): string {
    const configuration = this.getWorkspaceConfiguration();
    const kbtVersionsDirectory = configuration.get<string>('kbtVersionsDirectory');

    // If no explicit kbtVersionsDirectory is set, use global storage as default
    if (!kbtVersionsDirectory) {
      const globalStorageUri = this.context.globalStorageUri;
      return vscode.Uri.joinPath(globalStorageUri, 'kbt').fsPath;
    }

    return kbtVersionsDirectory;
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

  public getKbtVersion(): string {
    return this.context.workspaceState.get<string>('KBTVersion');
  }

  public getSiemjPath(): string {
    if (this.shouldUseDockerToolRunner()) {
      return this.getDockerKbtToolPath('extra-tools/siemj/siemj');
    }

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
    if (this.shouldUseDockerToolRunner()) {
      return this.getDockerKbtToolPath('build-tools/siemkb_tests');
    }

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
    if (this.shouldUseDockerToolRunner()) {
      return this.getDockerKbtToolPath('xp-sdk/cli/rcc');
    }

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
    if (this.shouldUseDockerToolRunner()) {
      return this.getDockerKbtToolPath('build-tools/mktables');
    }

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
    if (this.shouldUseDockerToolRunner()) {
      return this.getDockerKbtToolPath('xp-sdk/fpta_filler');
    }

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
    if (this.shouldUseDockerToolRunner()) {
      return this.getDockerKbtToolPath('build-tools/build_l10n_rules');
    }

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
    if (this.shouldUseDockerToolRunner()) {
      return this.getDockerKbtToolPath('build-tools/siemkb_tests');
    }

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
    if (this.shouldUseDockerToolRunner()) {
      return this.getDockerKbtToolPath('xp-sdk/cli/normalizer-cli');
    }

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
    if (this.shouldUseDockerToolRunner()) {
      return this.getDockerKbtToolPath('build-tools/normalize');
    }

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
    if (this.shouldUseDockerToolRunner()) {
      return this.getDockerKbtToolPath(path.posix.join('extra-tools', 'kbpack', appName));
    }

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
    if (this.shouldUseDockerToolRunner()) {
      return this.getDockerKbtToolPath('build-tools/ecatest');
    }

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

  public getEvtTestsFullPath(): string {
    if (this.shouldUseDockerToolRunner()) {
      return this.getDockerKbtToolPath('xp-sdk/cli/evt-tests');
    }

    let appName = '';
    switch (this.getOsType()) {
      case OsType.Windows:
        appName = 'evt-tests.exe';
        break;
      case OsType.Linux:
        appName = 'evt-tests';
        break;
      case OsType.Mac:
        throw new XpException(this.getMessage('Error.MacOsIsNotNativelySupported'));

      default:
        throw new XpException('Платформа не поддерживается');
    }

    const fullPath = path.join(this.getSiemSdkDirectoryPath(), 'cli', appName);
    this.checkKbtSingleToolPath(fullPath);

    return fullPath;
  }

  public getKBTLSPFullPath(): string {
    if (this.shouldUseDockerToolRunner()) {
      return null;
    }

    let appName = '';
    switch (this.getOsType()) {
      case OsType.Windows:
        appName = 'evt-xp-language-server.exe';
        break;
      case OsType.Linux:
        appName = 'evt-xp-language-server';
        break;
      case OsType.Mac:
        throw new XpException(this.getMessage('Error.MacOsIsNotNativelySupported'));

      default:
        throw new XpException('Платформа не поддерживается');
    }

    let fullPath = path.join(this.getSiemSdkDirectoryPath(), 'cli', appName);
    if (!fs.existsSync(fullPath)) {
      Log.warn(`Can't find LSP server executable in KBT directory: '${fullPath}'.`);
      return null;
    }

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

  public getTestPipelineConfigName(): string {
    return 'test_pipeline_config_file.json';
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
    if (this.shouldUseDockerToolRunner()) {
      return this.getDockerKbtToolPath(
        path.posix.join('knowledgebase', Configuration.CONTRACTS_DIR_NAME)
      );
    }

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
    this.checkReadablePath(fullPath);

    return fullPath;
  }

  /**
   * Возвращает путь к директории с таксономией.
   * @returns путь к директории с таксономией.
   */
  public getTaxonomyDirPath(): string {
    const fullPath = path.join(this.getContractsDirectory(), Configuration.TAXONOMY_DIR_NAME);
    this.checkReadablePath(fullPath);

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
    this.checkReadablePath(fullPath);

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
    this.checkReadablePath(fullPath);

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

  public getKBTLSPConfiguration(): vscode.WorkspaceConfiguration {
    return vscode.workspace.getConfiguration(this.LSP_CONFIGURATION_PREFIX);
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

  public getDirectLSPServerExecutablePath(): string {
    const configuration = this.getWorkspaceConfiguration();
    const lspServerExecutablePath = configuration.get<string>('lspServerExecutablePath');
    return lspServerExecutablePath;
  }

  public getResolvedLSPServerExecutablePath(): string | undefined {
    if (this.getLSPMode() === 'legacy') {
      return undefined;
    }

    if (this.shouldUseDockerToolRunner()) {
      return undefined;
    }

    const configuredPath = this.getDirectLSPServerExecutablePath();
    if (configuredPath) {
      if (!fs.existsSync(configuredPath)) {
        Log.warn(`Configured LSP server executable was not found: '${configuredPath}'.`);
        return undefined;
      }

      return configuredPath;
    }

    return this.getKBTLSPFullPath() ?? undefined;
  }

  /**
   * Automatically sets kbtVersionsDirectory if not already set
   */
  public autoSetKbtVersionsDirectory(): void {
    if (this.shouldUseDockerToolRunner()) {
      return;
    }

    const configuration = this.getWorkspaceConfiguration();
    const kbtVersionsDirectory = configuration.get<string>('kbtVersionsDirectory');

    if (!kbtVersionsDirectory) {
      // Use global storage as default if not explicitly set
      const globalStorageUri = this.context.globalStorageUri;
      const defaultKbtVersionsDirectory = vscode.Uri.joinPath(globalStorageUri, 'kbt').fsPath;

      try {
        configuration.update('kbtVersionsDirectory', defaultKbtVersionsDirectory, true, false);
        Log.info(`Automatically set kbtVersionsDirectory to: ${defaultKbtVersionsDirectory}`);
      } catch (error) {
        Log.warn(`Failed to automatically set kbtVersionsDirectory: ${error.message}`);
      }
    }
  }

  /**
   * Automatically sets kbtBaseDirectory if not already set
   */
  public autoSetKbtBaseDirectory(): void {
    if (this.shouldUseDockerToolRunner()) {
      return;
    }

    const configuration = this.getWorkspaceConfiguration();
    const kbtBaseDirectory = configuration.get<string>('kbtBaseDirectory');

    if (!kbtBaseDirectory) {
      // Try to auto-select KBT if we can find it
      try {
        this.selectAndSetKBT();
      } catch (error) {
        Log.warn(`Failed to auto-select KBT for kbtBaseDirectory: ${error.message}`);
      }
    }
  }

  /**
   * Automatically sets lspServerExecutablePath if not already set
   */
  public autoSetLspServerExecutablePath(): void {
    if (this.getLSPMode() === 'legacy') {
      Log.info('Skipping KBT LSP auto-detection because xpConfig.lspMode=legacy.');
      return;
    }

    if (this.shouldUseDockerToolRunner()) {
      Log.info(
        'Skipping local KBT LSP auto-detection in Docker tool execution mode. External KBT LSP is not launched via Docker because host file URIs are not mapped into the LSP protocol yet.'
      );
      return;
    }

    const configuration = this.getWorkspaceConfiguration();
    const lspServerExecutablePath = configuration.get<string>('lspServerExecutablePath');

    if (!lspServerExecutablePath) {
      try {
        // Try to find the LSP server executable in the KBT directory
        const fullPath = this.getResolvedLSPServerExecutablePath();

        if (fullPath) {
          configuration.update('lspServerExecutablePath', fullPath, true, false);
          Log.info(`Automatically set lspServerExecutablePath to: ${fullPath}`);
        } else {
          Log.warn('LSP server executable not found');
        }
      } catch (error) {
        Log.warn(`Failed to automatically set lspServerExecutablePath: ${error.message}`);
      }
    }
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
    const configuredPath = extensionSettings.get<string>('outputDirectoryPath');
    return this.normalizeLegacyHostOutputDirectoryPath(
      configuredPath || this.getDefaultBaseOutputDirectoryPath()
    );
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

  public async readTextFile(fullPath: string): Promise<string> {
    if (this.shouldUseDockerToolRunner() && this.isDockerContainerPath(fullPath)) {
      return (
        await this.getToolRunner().runTool('cat', [fullPath], {
          encoding: 'utf-8'
        })
      ).output;
    }

    return FileSystemHelper.readContentFile(fullPath);
  }

  public mapPathForExecution(fullPath: string): string {
    if (!this.shouldUseDockerToolRunner()) {
      return fullPath;
    }

    const toolRunner = this.getToolRunner();
    if (toolRunner instanceof DockerToolRunner) {
      return toolRunner.getPathMapper().mapCommandArgument(fullPath);
    }

    return fullPath;
  }

  public getDockerOutputDirectoryPath(): string {
    const configuredPath = this.getWorkspaceConfiguration().get<string>('docker.outputDirectoryPath');
    return this.normalizeLegacyDockerOutputDirectoryPath(
      configuredPath || this.getDefaultDockerOutputDirectoryPath()
    );
  }

  private checkKbtSingleToolPath(fullPath: string): void {
    if (this.shouldUseDockerToolRunner() && this.isDockerContainerPath(fullPath)) {
      return;
    }

    if (!fs.existsSync(fullPath)) {
      throw new XpException(this.getMessage('Error.UtilityPathIsIncorrect', fullPath));
    }
  }

  private checkReadablePath(fullPath: string): void {
    if (this.shouldUseDockerToolRunner() && this.isDockerContainerPath(fullPath)) {
      return;
    }

    if (!fs.existsSync(fullPath)) {
      throw new XpException(`Required XP file was not found: ${fullPath}`);
    }
  }

  private getDockerKbtToolPath(relativePath: string): string {
    const dockerKbtBaseDirectory =
      this.getWorkspaceConfiguration().get<string>('docker.kbtBaseDirectory') ||
      '/home/coder/xp-kbt';
    return path.posix.join(dockerKbtBaseDirectory, relativePath.replace(/\\/g, '/'));
  }

  private getDockerWorkspaceHostPath(): string | undefined {
    const configuredPath = this.getWorkspaceConfiguration().get<string>('docker.workspaceHostPath');
    if (configuredPath) {
      return configuredPath;
    }

    return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  }

  private getWorkspaceRootPath(): string | undefined {
    return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  }

  private getDefaultBaseOutputDirectoryPath(): string {
    const workspaceRootPath = this.getWorkspaceRootPath();
    if (workspaceRootPath) {
      return path.join(workspaceRootPath, 'tmp', 'xp-output');
    }

    return path.join(os.tmpdir(), Configuration.getExtensionDirectoryName(), 'tmp', 'xp-output');
  }

  private getDefaultDockerOutputDirectoryPath(): string {
    const workspaceContainerPath =
      this.getWorkspaceConfiguration().get<string>('docker.workspaceContainerPath') ||
      '/workspaces/knowledgebase';
    return path.posix.join(workspaceContainerPath, 'tmp', 'xp-output');
  }

  private normalizeLegacyHostOutputDirectoryPath(outputDirectoryPath: string): string {
    const workspaceRootPath = this.getWorkspaceRootPath();
    if (!workspaceRootPath) {
      return outputDirectoryPath;
    }

    const legacyPath = path.join(workspaceRootPath, '.xp-output');
    if (path.resolve(outputDirectoryPath) === path.resolve(legacyPath)) {
      return this.getDefaultBaseOutputDirectoryPath();
    }

    return outputDirectoryPath;
  }

  private normalizeLegacyDockerOutputDirectoryPath(outputDirectoryPath: string): string {
    const workspaceContainerPath =
      this.getWorkspaceConfiguration().get<string>('docker.workspaceContainerPath') ||
      '/workspaces/knowledgebase';
    const legacyPath = path.posix.join(workspaceContainerPath, '.xp-output');
    if (outputDirectoryPath.replace(/\\/g, '/') === legacyPath) {
      return this.getDefaultDockerOutputDirectoryPath();
    }

    return outputDirectoryPath;
  }

  public isDockerContainerPath(fullPath: string): boolean {
    const workspaceHostPath = this.getDockerWorkspaceHostPath();
    if (workspaceHostPath && fullPath.startsWith(workspaceHostPath)) {
      return false;
    }

    return fullPath.startsWith('/');
  }

  private tryGetKbtBaseDirectoryForLocalRunner(): string | undefined {
    if (this.shouldUseDockerToolRunner()) {
      return undefined;
    }

    try {
      return this.getKbtBaseDirectory();
    } catch (error) {
      Log.warn(`Failed to resolve local KBT directory: ${error.message}`);
      return undefined;
    }
  }

  private detectSIEMJVersionSync(): string {
    if (this.shouldUseDockerToolRunner()) {
      return '2';
    }

    try {
      const evtTestsPath = this.getEvtTestsFullPath();
      if (evtTestsPath && fs.existsSync(evtTestsPath)) {
        return '2';
      }
    } catch (error) {
      Log.warn(`Failed to infer SIEMJ version from evt-tests: ${error.message}`);
    }

    try {
      const lspPath = this.getKBTLSPFullPath();
      if (lspPath && fs.existsSync(lspPath)) {
        return '2';
      }
    } catch (error) {
      Log.warn(`Failed to infer SIEMJ version from KBT LSP path: ${error.message}`);
    }

    return '1';
  }

  public async checkUserSetting(): Promise<void> {
    const extensionConfig = this.getWorkspaceConfiguration();

    // Порядок обратный по приоритету, так как вторая ошибка появится выше чем первая.
    await this.checkAndCreateOutputDirectory(extensionConfig);
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
    const outputDirectoryPath = this.getBaseOutputDirectoryPath();

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
  private readonly LSP_CONFIGURATION_PREFIX = 'xplang_ls';
  private readonly BUILD_TOOLS_DIR_NAME = 'build-tools';

  private readonly MAC_OS_MESSAGE_ABOUT_MAC_OS_SUPPORT =
    'Платформа поддерживается только с использованием веб-версии VSCode Workspace. С документацией можно ознакомится [тут](https://vscode-xp.readthedocs.io/ru/latest/gstarted.html#vscode-xp-workspace)';

  public static readonly TAXONOMY_DIR_NAME = 'taxonomy';
  public static readonly CONTRACTS_DIR_NAME = 'contracts';
  public static readonly SIEMJ_CONFIG_FILENAME = 'siemj.conf';
}
