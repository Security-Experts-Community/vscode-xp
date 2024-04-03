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
import { Origin } from './content/originsManager';
import { DialogHelper } from '../helpers/dialogHelper';

export type EncodingType = "windows-1251" | "utf-8" | "utf-16"

export class Configuration {

	private constructor(context: vscode.ExtensionContext) {
		this._context = context;

		const contentType = this.getContentType();
		this.setContentType(contentType);

		const extensionName = Configuration.getExtensionDisplayName();
		this._outputChannel = vscode.window.createOutputChannel(extensionName);
		this._localizationService = new LocalizationService(vscode.env.language, context.extensionPath);
		
		this._diagnosticCollection = vscode.languages.createDiagnosticCollection(extensionName);
		context.subscriptions.push(this._diagnosticCollection);
	}

	public getRulesDirFilters() : string { return this._pathHelper.getRulesDirFilters(); }
	public getContentRoots() : string[] { return this._pathHelper.getContentRoots(); } 
	public getPackages(): string[] { return this._pathHelper.getPackages(); }
	public isKbOpened() : boolean { return this._pathHelper.isKbOpened(); }
	public getRootByPath(directory: string): string { return this._pathHelper.getRootByPath(directory); } 
	public getRequiredRootDirectories(): string[] { return this._pathHelper.getRequiredRootDirectories(); }

	public setContentType(contentType: ContentType): void {
		if (contentType === ContentType.EDR) {
			this._pathHelper = EDRPathHelper.get();
		}
		else {
			this._pathHelper = SIEMPathHelper.get(); 
		}
		this._context.workspaceState.update("ContentType", contentType);
	}

    public getMessage(messageKey: string, ...args: (string | number | boolean | undefined | null)[]): string {
        return this._localizationService.getMessage(messageKey, ...args);
    }

	public getKbFullPath() : string {
		return this._pathHelper.getKbPath(); 
	}

	public static getContentTypeBySubDirectories(subDirectories: string[]): ContentType | undefined {
		const EDRpathHelper = EDRPathHelper.get();
		const SIEMpathHelper = SIEMPathHelper.get(); 
		const EDRrequiredRootDirectories = EDRpathHelper.getRequiredRootDirectories().map(function(d) { 
			return d.split(path.sep)[0];
		}).filter((elem, index, self) => {
			return index === self.indexOf(elem);
		});
		const SIEMrequiredRootDirectories = SIEMpathHelper.getRequiredRootDirectories().map(function(d) { 
			return d.split(path.sep)[0];
		}).filter((elem, index, self) => {
			return index === self.indexOf(elem);
		});
		
		if (EDRrequiredRootDirectories.every(folder => subDirectories.includes(folder))) {
			return ContentType.EDR;
		}

		if (SIEMrequiredRootDirectories.every(folder => subDirectories.includes(folder))) {
			return ContentType.SIEM;
		}

		return undefined;
	}

	/**
	 * Очищает все диагностики и добавляет новые
	 * @param diagnostics 
	 */
	public resetDiagnostics(diagnostics: FileDiagnostics[]) : void {
		this._diagnosticCollection.clear();
		for (const diagnostic of diagnostics) {
			this._diagnosticCollection.set(diagnostic.uri, diagnostic.diagnostics);
		}
	}

	/**
	 * TODO: инкапсулировать доступ к диагностикам
	 * @returns 
	 */
	public getDiagnosticCollection() : vscode.DiagnosticCollection {
		return this._diagnosticCollection;
	}

	public getOutputChannel() : vscode.OutputChannel {
		return this._outputChannel;
	}

	public getExtensionMode() : vscode.ExtensionMode {
		return this._context.extensionMode;
	}

	public getContext() : vscode.ExtensionContext {
		return this._context;
	}

	public getExtensionUri() : vscode.Uri {
		return this._context.extensionUri;
	}

	public getExtensionPath() : string {
		return this._context.extensionPath;
	}

	public static getExtensionDisplayName() : string {
		return "eXtraction and Processing";
	}

	public getOsType() : OsType {
		const osType = os.platform();
		switch(osType) {
			case "win32" : return OsType.Windows;
			case "linux" : return OsType.Linux;
			case "darwin" : return OsType.Mac;
			default: throw new Error("Платформа не поддерживается");
		}
	}

	public getSiemjOutputEncoding() : EncodingType {
		switch(this.getOsType()) {
			case OsType.Windows: return "windows-1251";
			case OsType.Linux: return "utf-8";
			case OsType.Mac: return "utf-8";
			default: throw new XpException("Платформа не поддерживается");
		}
	}

	/**
	 * Возвращает путь к директории со всеми SDK утилитами.
	 * @returns путь к директории со всеми SDK утилитами.
	 */
	public getKbtBaseDirectory(): string {
		const configuration = vscode.workspace.getConfiguration(this.CONFIGURATION_PREFIX);
		const basePath = configuration.get<string>("kbtBaseDirectory");
		this.checkKbtToolPath("KBT", basePath);

		return basePath;
	}

	/**
	 * Возвращает внутреннее имя расширения.
	 * @returns внутреннее имя расширения.
	 */
	public getExtensionSettingsPrefix() : string {
		return this.CONFIGURATION_PREFIX;
	}

	public getResourcesUri() : vscode.Uri {
		const templatesUri = vscode.Uri.joinPath(this.getExtensionUri(), "templates");
		return templatesUri;
	}

	public getContentType(): ContentType {
		const contentTypeString = this._context.workspaceState.get<string>("ContentType");
		const contentType : ContentType = ContentType[contentTypeString];
		return contentType;
	}

	public getSiemjPath() : string {
		let appName = "";
		switch(this.getOsType()) {
			case OsType.Windows: appName = "siemj.exe"; break;
			case OsType.Mac: throw new XpException("Платформа поддерживается только с использованием веб-версии VSCode Workspace. С документацией можно ознакомится [тут](https://vscode-xp.readthedocs.io/ru/latest/gstarted.html#vscode-xp-workspace)");
			case OsType.Linux: appName = "siemj"; break;

			default: throw new XpException("Платформа не поддерживается");
		}

		const fullPath = path.join(this.getKbtBaseDirectory(), "extra-tools", "siemj", appName);
		this.checkKbtToolPath(appName, fullPath);

		return fullPath;
	}

	public getSiemkbTestsPath() : string {
		let appName = "";
		switch(this.getOsType()) {
			case OsType.Windows: appName = "siemkb_tests.exe"; break;
			case OsType.Mac: throw new XpException("Платформа поддерживается только с использованием веб-версии VSCode Workspace. С документацией можно ознакомится [тут](https://vscode-xp.readthedocs.io/ru/latest/gstarted.html#vscode-xp-workspace)");
			case OsType.Linux: appName = "siemkb_tests"; break;

			default: throw new XpException("Платформа не поддерживается");
		}

		const fullPath = path.join(this.getKbtBaseDirectory(), this.BUILD_TOOLS_DIR_NAME, appName);
		this.checkKbtToolPath(appName, fullPath);

		return fullPath;
	}

	public getRccCli() : string {
		let appName = "";
		switch(this.getOsType()) {
			case OsType.Windows: appName = "rcc.exe"; break;
			case OsType.Mac: throw new XpException("Платформа поддерживается только с использованием веб-версии VSCode Workspace. С документацией можно ознакомится [тут](https://vscode-xp.readthedocs.io/ru/latest/gstarted.html#vscode-xp-workspace)");
			case OsType.Linux: appName = "rcc"; break;

			default: throw new XpException("Платформа не поддерживается");
		}

		const fullPath = path.join(this.getKbtBaseDirectory(), "xp-sdk", "cli", appName);
		this.checkKbtToolPath(appName, fullPath);

		return fullPath;
	}

	public getMkTablesPath() : string {
		let appName = "";
		switch(this.getOsType()) {
			case OsType.Windows: appName = "mktables.exe"; break;
			case OsType.Mac: throw new XpException("Платформа поддерживается только с использованием веб-версии VSCode Workspace. С документацией можно ознакомится [тут](https://vscode-xp.readthedocs.io/ru/latest/gstarted.html#vscode-xp-workspace)");
			case OsType.Linux: appName = "mktables"; break;

			default: throw new XpException("Платформа не поддерживается");
		}

		const fullPath = path.join(this.getKbtBaseDirectory(), "build-tools", appName);
		this.checkKbtToolPath(appName, fullPath);

		return fullPath;
	}

	public getFPTAFillerPath() : string {
		let appName = "";
		switch(this.getOsType()) {
			case OsType.Windows: appName = "fpta_filler.exe"; break;
			case OsType.Mac: throw new XpException("Платформа поддерживается только с использованием веб-версии VSCode Workspace. С документацией можно ознакомится [тут](https://vscode-xp.readthedocs.io/ru/latest/gstarted.html#vscode-xp-workspace)");
			case OsType.Linux: appName = "fpta_filler"; break;

			default: throw new XpException("Платформа не поддерживается");
		}

		const fullPath = path.join(this.getKbtBaseDirectory(), "xp-sdk", appName);
		this.checkKbtToolPath(appName, appName);

		return fullPath;
	}

	public getLocalizationBuilder() : string {
		let appName = "";
		switch(this.getOsType()) {
			case OsType.Windows: appName = "build_l10n_rules.exe"; break;
			case OsType.Mac: throw new XpException("Платформа поддерживается только с использованием веб-версии VSCode Workspace. С документацией можно ознакомится [тут](https://vscode-xp.readthedocs.io/ru/latest/gstarted.html#vscode-xp-workspace)");
			case OsType.Linux: appName = "build_l10n_rules"; break;
			
			default: throw new XpException("Платформа не поддерживается");
		}

		const fullPath = path.join(this.getKbtBaseDirectory(), "build-tools", appName);
		this.checkKbtToolPath(appName, fullPath);

		return fullPath;
	}

	public getSiemKBTests() : string {
		let appName = "";
		switch(this.getOsType()) {
			case OsType.Windows: appName = "siemkb_tests.exe"; break;
			case OsType.Mac: throw new XpException("Платформа поддерживается только с использованием веб-версии VSCode Workspace. С документацией можно ознакомится [тут](https://vscode-xp.readthedocs.io/ru/latest/gstarted.html#vscode-xp-workspace)");
			case OsType.Linux: appName = "siemkb_tests"; break;

			default: throw new XpException("Платформа не поддерживается");
		}

		const fullPath = path.join(this.getKbtBaseDirectory(), "build-tools", appName);
		this.checkKbtToolPath(appName, fullPath);

		return fullPath;
	}

	public getNormalizerCli() : string {
		let appName = "";
		switch(this.getOsType()) {
			case OsType.Windows: appName = "normalizer-cli.exe"; break;
			case OsType.Mac: throw new XpException("Платформа поддерживается только с использованием веб-версии VSCode Workspace. С документацией можно ознакомится [тут](https://vscode-xp.readthedocs.io/ru/latest/gstarted.html#vscode-xp-workspace)");
			case OsType.Linux: appName = "normalizer-cli"; break;

			default: throw new XpException("Платформа не поддерживается");
		}

		const fullPath = path.join(this.getKbtBaseDirectory(), "xp-sdk", "cli", appName);
		this.checkKbtToolPath(appName, fullPath);

		return fullPath;
	}

	public getNormalizer() : string {
		let appName = "";
		switch(this.getOsType()) {
			case OsType.Windows: appName = "normalize.exe"; break;
			case OsType.Mac: throw new XpException("Платформа поддерживается только с использованием веб-версии VSCode Workspace. С документацией можно ознакомится [тут](https://vscode-xp.readthedocs.io/ru/latest/gstarted.html#vscode-xp-workspace)");
			case OsType.Linux: appName = "normalize"; break;

			default: throw new XpException("Платформа не поддерживается");
		}

		const fullPath = path.join(this.getKbtBaseDirectory(), "build-tools", appName);
		this.checkKbtToolPath(appName, fullPath);

		return fullPath;
	}

	public getKbPackFullPath() : string {
		const appName = "kbpack.dll";
		const fullPath = path.join(this.getKbtBaseDirectory(), "extra-tools", "kbpack", appName);
		this.checkKbtToolPath(appName, fullPath);

		return fullPath;
	}

	public getEvtxToJsonToolFullPath() : string {
		const fullPath = path.join(this.getExtensionPath(), "tools", "evtx_converter.exe");
		return fullPath;
	}

	public getEcatestFullPath() : string {
		let appName = "";
		switch(this.getOsType()) {
			case OsType.Windows: appName = "ecatest.exe"; break;
			case OsType.Mac: throw new XpException("Платформа поддерживается только с использованием веб-версии VSCode Workspace. С документацией можно ознакомится [тут](https://vscode-xp.readthedocs.io/ru/latest/gstarted.html#vscode-xp-workspace)");
			case OsType.Linux: appName = "ecatest"; break;

			default: throw new XpException("Платформа не поддерживается");
		}

		const fullPath = path.join(this.getKbtBaseDirectory(), "build-tools", appName);
		this.checkKbtToolPath(appName, fullPath);

		return fullPath;
	}


	public getOutputDirectoryPath(rootFolder?: string) : string {
		if(rootFolder) {
			return path.join(this.getBaseOutputDirectoryPath(), rootFolder);
		}
		else {
			return this.getBaseOutputDirectoryPath();
		}
	}

	public getCorrelationDefaultsFileName() : string {
		return "correlation_defaults.json";
	}

	public getCorrelationDefaultsFilePath(rootFolder: string) : string {
		return path.join(this.getOutputDirectoryPath(rootFolder), this.getCorrelationDefaultsFileName());
	}

	public getSchemaFileName() : string {
		return "schema.json";
	}

	public getSchemaFullPath(rootFolder: string) : string {
		return path.join(this.getOutputDirectoryPath(rootFolder), this.getSchemaFileName());
	}

	public getWhitelistingPath(rootFolder: string) : string {
		return path.join(this.getOutputDirectoryPath(rootFolder), this.getWhitelistingFileName());
	}

	public getWhitelistingFileName() : string {
		return "whitelisting_graph.json ";
	}

	public getNormalizedEventsFileName() : string {
		return "norm_events.json";
	}

	public getNormalizedEventsFilePath(rootFolder: string) : string {
		return path.join(this.getOutputDirectoryPath(rootFolder), this.getNormalizedEventsFileName());
	}

	public getNotNormalizedEventsFileName() : string {
		return "not_normalized.json";
	}

	public getEnrichedEventsFileName() : string {
		return "enrich_events.json";
	}

	public getEnrichedEventsFilePath(rootFolder: string) : string {
		return path.join(this.getOutputDirectoryPath(rootFolder), this.getEnrichedEventsFileName());
	}
	
	public getCorrelatedEventsFileName() : string {
		return "corr_events.json";
	}

	public getCorrelatedEventsFilePath(rootFolder: string) : string {
		return path.join(this.getOutputDirectoryPath(rootFolder), this.getCorrelatedEventsFileName());
	}

	public getRuRuleLocalizationFilePath(rootFolder: string) : string {
		return path.join(this.getOutputDirectoryPath(rootFolder), "ru_events.json");
	}

	public getEnRuleLocalizationFilePath(rootFolder: string) : string {
		return path.join(this.getOutputDirectoryPath(rootFolder), "en_events.json");
	}

	public getLangsDirName() : string {
		return "langs";
	}

	public getRuLangFilePath(rootFolder: string) : string {
		return path.join(this.getOutputDirectoryPath(rootFolder), this.getLangsDirName(), "ru.lang");
	}

	public getEnLangFilePath(rootFolder: string) : string {
		return path.join(this.getOutputDirectoryPath(rootFolder), this.getLangsDirName(), "en.lang");
	}

	// Пути к файлам зависят от текущего режима работы
	// При смене режима SIEM/EDR заменяется реализация _pathHelper

	public getNormalizationsGraphFileName() : string {
		return this._pathHelper.getNormalizationsGraphFileName();
	}

	public getAggregationGraphFileName() : string {
		return this._pathHelper.getAggregationsGraphFileName();
	}
	
	public getEnrichmentsGraphFileName() : string {
		return this._pathHelper.getEnrichmentsGraphFileName();
	}

	public getCorrelationsGraphFileName() : string {
		return this._pathHelper.getCorrelationsGraphFileName();
	}

	public getNormalizationsGraphFilePath(rootFolder: string) : string {
		return path.join(this.getOutputDirectoryPath(rootFolder), this._pathHelper.getNormalizationsGraphFileName());
	}
	
	public getEnrichmentsGraphFilePath(rootFolder: string) : string {
		return path.join(this.getOutputDirectoryPath(rootFolder), this.getEnrichmentsGraphFileName());
	}

	public getCorrelationsGraphFilePath(rootFolder: string) : string {
		return path.join(this.getOutputDirectoryPath(rootFolder), this.getCorrelationsGraphFileName());
	}

	public getAggregationsGraphFilePath(rootFolder: string) : string {
		return path.join(this.getOutputDirectoryPath(rootFolder), this.getAggregationGraphFileName());
	}

	public getLocalizationsFolder() : string {
		return this._pathHelper.getLocalizationsFolder();	
	}
	
	public getFptaDbFileName() : string {
		return "fpta_db.db";
	}

	public getFptaDbFilePath(rootFolder: string) : string {
		return path.join(this.getOutputDirectoryPath(rootFolder), this.getFptaDbFileName());
	}

	public getTmpDirectoryPath(rootFolder?: string) : string {
		let systemTmpPath: string;
		if(rootFolder) {
			systemTmpPath = path.join(os.tmpdir(), Configuration.getExtensionDisplayName(), rootFolder);
		} else {
			systemTmpPath = path.join(os.tmpdir(), Configuration.getExtensionDisplayName());
		}
	
		return systemTmpPath;
	}


	public getTmpSiemjConfigPath(rootFolder: string) : string {
		return path.join(this.getRandTmpSubDirectoryPath(rootFolder), Configuration.SIEMJ_CONFIG_FILENAME);
	}

	public getRandTmpSubDirectoryPath(rootFolder?: string) : string {
		return path.join(this.getTmpDirectoryPath(rootFolder), Guid.create().toString());
	}


	public getSiemSdkDirectoryPath() : string {
		const dirName = "xp-sdk";
		const fullPath = path.join(this.getKbtBaseDirectory(), dirName);
		this.checkKbtToolPath(dirName, fullPath);

		return fullPath;
	}

	public getBuildToolsDirectoryFullPath() : string {
		const dirName = "build-tools";
		const fullPath = path.join(this.getKbtBaseDirectory(), dirName);
		this.checkKbtToolPath(dirName, fullPath);

		return fullPath;
	}

	/**
	 * Возвращает путь к папке с директориями контрактов из KBT. 
	 * @returns путь к папке с директориями контрактов.
	 */
	private getContractsDirectory(): string {
		return path.join(this.getKbtBaseDirectory(), "knowledgebase", "contracts");
	}

	/**
	 * Возвращает путь к файлу описания таксономии. 
	 * @returns путь к файлу описания таксономии.
	 */
	public getTaxonomyFullPath() : string {
		const taxonomyFileName = "taxonomy.json";
		const fullPath = path.join(this.getContractsDirectory(), "taxonomy", taxonomyFileName);
		this.checkKbtToolPath(taxonomyFileName, fullPath);
		
		return fullPath;
	}

	/**
	 * Возвращает путь к директории с таксономией. 
	 * @returns путь к директории с таксономией.
	 */
	public getTaxonomyDirPath() : string {
		const taxonomyDirName = "taxonomy";
		const fullPath = path.join(this.getContractsDirectory(), taxonomyDirName);
		this.checkKbtToolPath(taxonomyDirName, fullPath);
		
		return fullPath;
	}

	public getOriginsFilePath() : string {
		const fullPath = path.join(this.getExtensionPath(), "content_templates", "origins", "sec.json");
		return fullPath;
	}
	
	/**
	 * Возвращает путь к файлу дополнения формул нормализации. 
	 * @returns путь к файлу дополнения формул нормализации.
	 */
	public getAppendixFullPath() : string {
		const appendixFileName = "appendix.xp";
		const fullPath = path.join(this.getContractsDirectory(), "xp_appendix", appendixFileName);
		this.checkKbtToolPath(appendixFileName, fullPath);
		
		return fullPath;
	}

	/**
	 * Возвращает путь к файлу описания контрактов табличных списков. 
	 * @returns путь к файлу описания контрактов табличных списков.
	 */
	public getTablesContract() : string {
		const tabularContractsFileName = "tables_contract.yaml";
		const fullPath = path.join(this.getContractsDirectory(), "tabular_lists", tabularContractsFileName);
		this.checkKbtToolPath(tabularContractsFileName, fullPath);
		
		return fullPath;
	}

	/**
	 * Префикс ObjectId, определяющий тип создаваемого контента.
	 * @returns префикс создаваемого контента.
	 */
	public getContentPrefix() : string {
		const configuration = this.getConfiguration();
		const contentPrefix = configuration.get<string>("origin.contentPrefix");
		return contentPrefix;
	}

	public async setContentPrefix(prefix: string) : Promise<void> {
		const configuration = this.getConfiguration();
		const origin = configuration.get<Origin>("origin");
		origin.contentPrefix = prefix;
		await configuration.update("origin", origin, true, false);
	}

	public getConfiguration() : vscode.WorkspaceConfiguration {
		return vscode.workspace.getConfiguration(this.CONFIGURATION_PREFIX);
	}

	/**
	 * Возвращает таймаут работы коррелятора.
	 * @returns 
	 */
	public getСorrelatorTimeoutPerSecond() : number {
		const configuration = this.getConfiguration();
		const correlatorTimeout = configuration.get<number>("correlatorTimeout");
		return correlatorTimeout;
	}

	public getBaseOutputDirectoryPath() : string {
		const extensionSettings = this.getConfiguration();
		const outputDirectoryPath = extensionSettings.get<string>("outputDirectoryPath");

		if (!outputDirectoryPath || outputDirectoryPath === ""){
			throw new FileSystemException(
				`Выходная директория не задана. Задайте путь к [ней]${this.OUTPUT_DIR_SHOW_SETTING_COMMAND}`,
				outputDirectoryPath);
		}

		if (!fs.existsSync(outputDirectoryPath)){
			throw new FileSystemException(
				`Выходная директория не найдена по пути ${outputDirectoryPath}. Проверьте путь к [ней]${this.OUTPUT_DIR_SHOW_SETTING_COMMAND}`,
				outputDirectoryPath);
		}

		return outputDirectoryPath;
	}

	/**
	 * Возвращает путь к файлу русской локализации таксономии. 
	 * @returns путь к файлу русской локализации таксономии.
	 */
	public getTaxonomyRuLocalizationFullPath() : string {
		const taxonomyFullPath = this.getTaxonomyFullPath();

		const taxonomyDirectoryPath = path.dirname(taxonomyFullPath);
		const ruLocalizationFilePath = path.join(
			taxonomyDirectoryPath, 
			Localization.LOCALIZATIONS_DIRNAME, 
			Localization.RU_LOCALIZATION_FILENAME);
			
		return ruLocalizationFilePath;
	}

	private checkKbtToolPath(name : string, fullPath : string) : void {
		if (!fullPath || fullPath === "") {
			throw new FileSystemException(
				`Путь к '${name}' не найден. Проверьте [настройки]${this.KBT_BASE_DIR_SHOW_SETTING_COMMAND}`,
				fullPath);
		}

		if (!fs.existsSync(fullPath)) {
			throw FileSystemException.kbtToolNotFoundException(fullPath);
		}
	}

	public checkUserSetting() : void {
		const extensionConfig = this.getConfiguration();

		// Порядок обратный по приоритету, так как вторая ошибка появится выше чем первая.
		this.checkOutputSetting(extensionConfig);
		this.checkKbtSetting(extensionConfig);
	}

	private checkKbtSetting(extensionConfig: vscode.WorkspaceConfiguration) {
		const kbtBasePath = extensionConfig.get<string>("kbtBaseDirectory");
		
		if (!kbtBasePath){
			DialogHelper.showError(`Путь к XP Knowledge Base Toolkit (KBT) не задан. ${this.KBT_CONFIG_INFO}`);
			return;
		}

		if (!fs.existsSync(kbtBasePath)){
			DialogHelper.showError(`Директория к XP Knowledge Base Toolkit (KBT) не найдена по пути ${kbtBasePath}. ${this.KBT_CONFIG_INFO}`);
			return;
		}
	}

	private checkOutputSetting(extensionConfig: vscode.WorkspaceConfiguration) {
		const outputDirectoryPath = extensionConfig.get<string>("outputDirectoryPath");

		if (!outputDirectoryPath){
			DialogHelper.showError(`Выходная директория не задана. Задайте её [в настройках]${this.OUTPUT_DIR_SHOW_SETTING_COMMAND}`);
			return;
		}

		if (!fs.existsSync(outputDirectoryPath)){
			DialogHelper.showError(`Выходная директория не найдена по пути ${outputDirectoryPath}. Актуализируйте путь к выходной директории [в настройках]${this.OUTPUT_DIR_SHOW_SETTING_COMMAND}`);
			return;
		}
	}

	public static get() : Configuration {
		if(!this._instance) {
			throw new XpException("Конфигурация расширения не получена. Возможно, она не была инициализирована");
		}
        return this._instance;
    }

	public static async init(context : vscode.ExtensionContext) : Promise<Configuration> {
		this._instance = new Configuration(context);
		return this._instance;
	}

	private static _instance : Configuration;

	private _pathHelper: PathLocator;
	private _outputChannel : vscode.OutputChannel;
	private _context: vscode.ExtensionContext;
	private _diagnosticCollection: vscode.DiagnosticCollection;
	private _localizationService: LocalizationService;
	
	private CONFIGURATION_PREFIX = "xpConfig";
	private BUILD_TOOLS_DIR_NAME = "build-tools";

	private KBT_BASE_DIR_SHOW_SETTING_COMMAND = `(command:workbench.action.openSettings?["${this.CONFIGURATION_PREFIX}.kbtBaseDirectory"])`;
	private KBT_CONFIG_INFO = `Загрузите актуальную версию [отсюда](https://github.com/vxcontrol/xp-kbt/releases), распакуйте архив и укажите [путь в настройках]${this.KBT_BASE_DIR_SHOW_SETTING_COMMAND}`;

	private OUTPUT_DIR_SHOW_SETTING_COMMAND = `(command:workbench.action.openSettings?["${this.CONFIGURATION_PREFIX}.outputDirectoryPath"])`

	public static readonly SIEMJ_CONFIG_FILENAME = "siemj.conf";	
}
