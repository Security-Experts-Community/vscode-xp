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

export type EncodingType = "windows-1251" | "utf-8"

export class Configuration {

	private constructor(context: vscode.ExtensionContext) {

		this._context = context;

		const contentType = this.getContentType();
		this.setContentType(contentType);

		const extensionName = this.getExtensionDisplayName();
		this._outputChannel = vscode.window.createOutputChannel(extensionName);
		this._diagnosticCollection = vscode.languages.createDiagnosticCollection(extensionName);

		context.subscriptions.push(this._diagnosticCollection);
	}

	public getRulesDirFilters() : string { return this._pathHelper.getRulesDirFilters(); }
	public getContentRoots() : string[] { return this._pathHelper.getContentRoots(); } 
	public getPackages(): string[] { return this._pathHelper.getPackages(); }
	public isKbOpened() : boolean { return this._pathHelper.isKbOpened(); }
	public getRootByPath(directory: string): string { return this._pathHelper.getRootByPath(directory); } 
	public getRequiredRootDirectories(): string[] { return this._pathHelper.getRequiredRootDirectories(); }

	public setContentType(contentType: ContentType) {
		if (contentType === ContentType.EDR) {
			this._pathHelper = EDRPathHelper.get();
		}
		else {
			this._pathHelper = SIEMPathHelper.get(); 
		}
		this._context.workspaceState.update("ContentType", contentType);
	}

	public getKbFullPath(){ return this._pathHelper.getKbPath(); }

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

	public getExtensionDisplayName() : string {
		return "eXtraction and Processing";
	}

	public getOsType() : OsType {
		const osType = os.platform();
		switch(osType) {
			case "win32" : return OsType.Windows;
			case "linux" : return OsType.Linux;
			case "darwin" : return OsType.Mac;
			default: throw new Error("Платформа не поддеживается.");
		}
	}

	public getSiemjOutputEncoding() : EncodingType {
		switch(this.getOsType()) {
			case OsType.Windows: return "windows-1251";
			case OsType.Linux: return "utf-8";
			case OsType.Mac: return "utf-8";
			default: throw new XpException("Платформа не поддерживается.");
		}
	}

	/**
	 * Возвращает путь к директории со всеми SDK утилитами.
	 * @returns путь к директории со всеми SDK утилитами.
	 */
	public getKbtBaseDirectory(): string {
		const configuration = vscode.workspace.getConfiguration("xpConfig");
		const basePath = configuration.get<string>("kbtBaseDirectory");
		this.checkKbtToolPath("KBT", basePath);

		return basePath;
	}

	/**
	 * Возвращает внутреннее имя расширения.
	 * @returns внутреннее имя расширения.
	 */
	public getExtensionSettingsPrefix() : string {
		// TODO: обновить после переименования
		return "xplang";
	}

	public getResoucesUri() : vscode.Uri {
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
			case OsType.Linux: appName = "siemj"; break;

			default: throw new XpException("Платформа не поддерживается.");
		}

		const fullPath = path.join(this.getKbtBaseDirectory(), "extra-tools", "siemj", appName);
		this.checkKbtToolPath(appName, fullPath);

		return fullPath;
	}

	public getSiemkbTestsPath() : string {
		let appName = "";
		switch(this.getOsType()) {
			case OsType.Windows: appName = "siemkb_tests.exe"; break;
			case OsType.Linux: appName = "siemkb_tests"; break;

			default: throw new XpException("Платформа не поддерживается.");
		}

		const fullPath = path.join(this.getKbtBaseDirectory(), this.BUILD_TOOLS_DIR_NAME, appName);
		this.checkKbtToolPath(appName, fullPath);

		return fullPath;
	}

	public getRccCli() : string {
		let appName = "";
		switch(this.getOsType()) {
			case OsType.Windows: appName = "rcc.exe"; break;
			case OsType.Linux: appName = "rcc"; break;

			default: throw new XpException("Платформа не поддерживается.");
		}

		const fullPath = path.join(this.getKbtBaseDirectory(), "xp-sdk", "cli", appName);
		this.checkKbtToolPath(appName, fullPath);

		return fullPath;
	}

	public getMkTablesPath() : string {
		let appName = "";
		switch(this.getOsType()) {
			case OsType.Windows: appName = "mktables.exe"; break;
			case OsType.Linux: appName = "mktables"; break;

			default: throw new XpException("Платформа не поддерживается.");
		}

		const fullPath = path.join(this.getKbtBaseDirectory(), "build-tools", appName);
		this.checkKbtToolPath(appName, fullPath);

		return fullPath;
	}

	public getFPTAFillerPath() : string {
		let appName = "";
		switch(this.getOsType()) {
			case OsType.Windows: appName = "fpta_filler.exe"; break;
			case OsType.Linux: appName = "fpta_filler"; break;

			default: throw new XpException("Платформа не поддерживается.");
		}

		const fullPath = path.join(this.getKbtBaseDirectory(), "xp-sdk", appName);
		this.checkKbtToolPath(appName, appName);

		return fullPath;
	}

	public getLocalizationBuilder() : string {
		let appName = "";
		switch(this.getOsType()) {
			case OsType.Windows: appName = "build_l10n_rules.exe"; break;
			case OsType.Linux: appName = "build_l10n_rules"; break;
			
			default: throw new XpException("Платформа не поддерживается.");
		}

		const fullPath = path.join(this.getKbtBaseDirectory(), "build-tools", appName);
		this.checkKbtToolPath(appName, fullPath);

		return fullPath;
	}

	public getSiemKBTests() : string {
		let appName = "";
		switch(this.getOsType()) {
			case OsType.Windows: appName = "siemkb_tests.exe"; break;
			case OsType.Linux: appName = "siemkb_tests"; break;

			default: throw new XpException("Платформа не поддерживается.");
		}

		const fullPath = path.join(this.getKbtBaseDirectory(), "build-tools", appName);
		this.checkKbtToolPath(appName, fullPath);

		return fullPath;
	}

	public getNormalizerCli() : string {
		let appName = "";
		switch(this.getOsType()) {
			case OsType.Windows: appName = "normalizer-cli.exe"; break;
			case OsType.Linux: appName = "normalizer-cli"; break;

			default: throw new XpException("Платформа не поддеживается.");
		}

		const fullPath = path.join(this.getKbtBaseDirectory(), "xp-sdk", "cli", appName);
		this.checkKbtToolPath(appName, fullPath);

		return fullPath;
	}

	public getNormalizer() : string {
		let appName = "";
		switch(this.getOsType()) {
			case OsType.Windows: appName = "normalize.exe"; break;
			case OsType.Linux: appName = "normalize"; break;

			default: throw new XpException("Платформа не поддеживается.");
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

	public getEcatestFullPath() : string {
		let appName = "";
		switch(this.getOsType()) {
			case OsType.Windows: appName = "ecatest.exe"; break;
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

	public getRuLocalizationFilePath(rootFolder: string) : string {
		return path.join(this.getOutputDirectoryPath(rootFolder), "ru_events.json");
	}

	public getEnLocalizationFilePath(rootFolder: string) : string {
		return path.join(this.getOutputDirectoryPath(rootFolder), "en_events.json");
	}

	public getLangsDirName() : string {
		return "langs";
	}

	// Пути к файлам зависят от текущего режима работы
	// При смене режима SIEM/EDR заменяется реализация _pathHelper

	public getNormalizationsGraphFileName() : string {
		return this._pathHelper.getNormalizationsGraphFileName();
	}
	
	public getEnrichmentsGraphFileName() : string {
		return this._pathHelper.getEnrichmentsGraphFileName();
	}

	public getCorrelationsGraphFileName() : string {
		return this._pathHelper.getCorrelationsGraphFileName();
	}

	public getAgregationsGraphFileName() : string {
		return this._pathHelper.getAgregationsGraphFileName();
	}

	public getNormalizationsGraphFilePath(rootFolder: string) : string {
		return path.join(this.getOutputDirectoryPath(rootFolder),this._pathHelper.getNormalizationsGraphFileName());
	}
	
	public getEnrichmentsGraphFilePath(rootFolder: string) : string {
		return path.join(this.getOutputDirectoryPath(rootFolder), this.getEnrichmentsGraphFileName());
	}

	public getCorrelationsGraphFilePath(rootFolder: string) : string {
		return path.join(this.getOutputDirectoryPath(rootFolder), this.getCorrelationsGraphFileName());
	}

	public getAgregationsGraphFilePath(rootFolder: string) : string {
		return path.join(this.getOutputDirectoryPath(rootFolder), this.getAgregationsGraphFileName());
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
		if(rootFolder) {
			return path.join(os.tmpdir(), this.getExtensionDisplayName(), rootFolder);
		}

		return path.join(os.tmpdir(), this.getExtensionDisplayName());
	}

	public getTmpSiemjConfigPath(rootFolder: string) : string {
		return path.join(this.getRandTmpSubDirectoryPath(rootFolder), "siemj.conf");
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
	 * Возращает путь к директории с таксономией. 
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
		const tabulatContractsFileName = "tables_contract.yaml";
		const fullPath = path.join(this.getContractsDirectory(), "tabular_lists", tabulatContractsFileName);
		this.checkKbtToolPath(tabulatContractsFileName, fullPath);
		
		return fullPath;
	}

	/**
	 * Префикс ObjectId, определяющий тип создаваемого контента.
	 * @returns префикс создаваемого контента.
	 */
	public getContentPrefix() : string {
		const configuration = vscode.workspace.getConfiguration("xpConfig");
		const taxonomyFullPath = configuration.get<string>("contentPrefix");
		return taxonomyFullPath;
	}

	/**
	 * Возвращает таймаут работы коррелятора.
	 * @returns 
	 */
	public getСorrelatorTimeoutPerSecond() : number {
		const configuration = vscode.workspace.getConfiguration("xpConfig");
		const correlatorTimeout = configuration.get<number>("correlatorTimeoutPerSecond");
		return correlatorTimeout;
	}

	public getBaseOutputDirectoryPath() : string {
		const extensionSettings = vscode.workspace.getConfiguration("xpConfig");
		const outputDirectoryPath = extensionSettings.get<string>("outputDirectoryPath");

		if (!outputDirectoryPath || outputDirectoryPath === ""){
			throw new FileSystemException(
				`Выходная директория не задана. Задайте путь к [ней](command:workbench.action.openSettings?["xpConfig.outputDirectoryPath"])`,
				outputDirectoryPath);
		}

		if (!fs.existsSync(outputDirectoryPath)){
			throw new FileSystemException(
				`Выходная директория не найдена по пути ${outputDirectoryPath}. Проверьте путь к [ней](command:workbench.action.openSettings?["xpConfig.outputDirectoryPath"])`,
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
				`Путь к '${name}' не найден. Проверьте [настройки](command:workbench.action.openSettings?["xpConfig.kbtBaseDirectory"])`,
				fullPath);
		}

		if (!fs.existsSync(fullPath)) {
			throw FileSystemException.kbtToolNotFoundException(fullPath);
		}
	}

	public static get() {
		if(!this._instance) {
			throw new XpException("Конфигурация расширения не получена. Возможно, она не была инициализирована.");
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

	private BUILD_TOOLS_DIR_NAME = "build-tools";
}
