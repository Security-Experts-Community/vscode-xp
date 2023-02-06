import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

import { ExtensionHelper } from '../helpers/extensionHelper';
import { Guid } from 'guid-typescript';
import { FileSystemHelper } from '../helpers/fileSystemHelper';
import { VsCodeApiHelper } from '../helpers/vsCodeApiHelper';
import { FileNotFoundException } from './fileNotFounException';
import { XpExtentionException } from './xpException';
import { ContentType } from '../contentType/contentType';
import { RuleBaseItem } from './content/ruleBaseItem';


export enum OsType {
	Windows,
	Linux,
	Mac
}

export interface IPathHelper{
	// Config
	// Пока не убрали отличие в именах файлов графов корреляций
	// оставляем эти функции
	getCorrulesGraphFileName() : string;
	// KB
	getAppendixPath() : string ;
	getTablesContract() : string ;
	getRulesDirFilters() : string ;
	getContentRoots() : string[];
	getPackages(): string[];
	isKbOpened() : boolean;
	getRootByPath(directory: string): string;
}

export class EDRPathHelper implements IPathHelper {
	private constructor(private _kbFullPath: string) {}
	
	private _prefix = path.join("resources", "build-resources");
	private static _instance: EDRPathHelper;

	public static get() : EDRPathHelper {
		const kbFullPath =
		(vscode.workspace.workspaceFolders && (vscode.workspace.workspaceFolders.length > 0))
			? vscode.workspace.workspaceFolders[0].uri.fsPath
			: undefined;

		if(!kbFullPath || !fs.existsSync(kbFullPath)) {
			throw new FileNotFoundException(`Некорректный путь '${kbFullPath}'`, kbFullPath);
		}

		if (!EDRPathHelper._instance){
			EDRPathHelper._instance = new EDRPathHelper(kbFullPath);
		}
		return EDRPathHelper._instance;
	}

	public getRootByPath(directory: string): string{
		if (!directory){
			return "";
		}
		const pathEntities = directory.split(path.sep);
		const roots = this.getContentRoots().map(folder => {return path.basename(folder);});
		for (const root of roots){
			const  packagesDirectoryIndex = pathEntities.findIndex( pe => pe.toLocaleLowerCase() === root);
			if(packagesDirectoryIndex === -1){
				continue;
			}

			// Удаляем лишние элементы пути и собираем результирующий путь.
			pathEntities.splice(packagesDirectoryIndex + 1);
			const packageDirectoryPath = pathEntities.join(path.sep);
			return packageDirectoryPath;
		}

		throw new Error(`Путь '${directory}' не содержит ни одну из корневых директорий: [${roots.join(", ")}].`);
	}
	
	public getCorrulesGraphFileName() : string {
		return "rules_graph.json";
	}

	// В корневой директории лежат пакеты экспертизы
	public getContentRoots() : string[]{
		const basePath = path.join(this._kbFullPath, "rules");
		let rootDirectories = [];
		if (fs.existsSync(basePath)){		
			rootDirectories = rootDirectories.concat(fs.readdirSync(basePath, { withFileTypes: true })
				.filter(dir => dir.isDirectory())
				.map(dir => path.join(basePath, dir.name)));
		}
		return rootDirectories;
	}

	public getPackages() : string[]{
		const contentRoots = this.getContentRoots();
		const packagesDirectories = [];
		for(const root in contentRoots){
			packagesDirectories.concat(fs.readdirSync(root, { withFileTypes: true })
			.filter(dir => dir.isDirectory())
			.map(dir => dir.name));
		}		
		return packagesDirectories;
	}

	public getAppendixPath() : string {
		const relative_path = path.join(this._prefix, "contracts", "xp_appendix", "appendix.xp");
		return path.join(this._kbFullPath, relative_path);
	}

	public getTablesContract() : string {
		const relative_path = path.join(this._prefix, "_extra", "tabular_lists", "tables_contract.yaml");
		return path.join(this._kbFullPath, relative_path);
	}

	public getRulesDirFilters() : string {
		const relative_path = path.join(this._prefix, "common", "rules_filters");
		return path.join(this._kbFullPath, relative_path);
	}

	public isKbOpened() : boolean {
		const kbPath = EDRPathHelper.get();
		const requredFolders = kbPath.getContentRoots();
		requredFolders.concat(kbPath.getRulesDirFilters());
		for (const folder of requredFolders){
			if (!fs.existsSync(folder)){
				return false;
			}
		}
		return true;
	}
}

export class SIEMPathHelper implements IPathHelper {
	private constructor(private _kbFullPath: string) {}
	
	private static _instance: SIEMPathHelper;

	public static get() : SIEMPathHelper {
		const kbFullPath =
		(vscode.workspace.workspaceFolders && (vscode.workspace.workspaceFolders.length > 0))
			? vscode.workspace.workspaceFolders[0].uri.fsPath
			: undefined;

		if(!kbFullPath || !fs.existsSync(kbFullPath)) {
			throw new FileNotFoundException(`Некорректный путь '${kbFullPath}'`, kbFullPath);
		}

		if (!SIEMPathHelper._instance){
			SIEMPathHelper._instance = new SIEMPathHelper(kbFullPath);
		}
		return SIEMPathHelper._instance;
	}

	public getRootByPath(directory: string): string{
		if (!directory){
			return "";
		}
		const pathEntities = directory.split(path.sep);
		const roots = this.getContentRoots().map(folder => {return path.basename(folder);});
		for (const root of roots){
			const  packagesDirectoryIndex = pathEntities.findIndex( pe => pe.toLocaleLowerCase() === root);
			if(packagesDirectoryIndex === -1){
				continue;
			}

			// Удаляем лишние элементы пути и собираем результирующий путь.
			pathEntities.splice(packagesDirectoryIndex + 1);
			const packageDirectoryPath = pathEntities.join(path.sep);
			return packageDirectoryPath;
		}

		throw new Error(`Путь '${directory}' не содержит ни одну из корневых директорий: [${roots.join(", ")}].`);
	}

	public getCorrulesGraphFileName() : string {
		return "corrules_graph.json";
	}	

	// В корневой директории лежат пакеты экспертизы
	public getContentRoots() : string[]{
		return [path.join(this._kbFullPath, "packages")];
	}

	public getPackages() : string[]{
		const contentRoots = this.getContentRoots();
		const packagesDirectories = [];
		for(const root in contentRoots){
			packagesDirectories.concat(fs.readdirSync(root, { withFileTypes: true })
			.filter(dir => dir.isDirectory())
			.map(dir => dir.name));
		}		
		return packagesDirectories;
	}

	public getAppendixPath() : string {
		const relative_path = path.join("contracts", "xp_appendix", "appendix.xp");
		return path.join(this._kbFullPath, relative_path);
	}

	public getTablesContract() : string {
		const relative_path = path.join("_extra", "tabular_lists", "tables_contract.yaml");
		return path.join(this._kbFullPath, relative_path);
	}

	public getRulesDirFilters() : string {
		const relative_path = path.join("common", "rules_filters");
		return path.join(this._kbFullPath, relative_path);
	}

	public isKbOpened() : boolean {
		const kbPath = SIEMPathHelper.get();
		const requredFolders = kbPath.getContentRoots();
		requredFolders.concat(kbPath.getRulesDirFilters());
		for (const folder of requredFolders){
			if (!fs.existsSync(folder)){
				return false;
			}
		}
		return true;
	}
}

export class Configuration {

	private constructor(context: vscode.ExtensionContext) {

		this._context = context;

		const contentType = this.getContentType();
		this.setContentType(contentType);

		const extentionName = this.getExtentionDisplayName();
		this._outputChannel = vscode.window.createOutputChannel(extentionName);
		this._diagnosticCollection = vscode.languages.createDiagnosticCollection(extentionName);

		context.subscriptions.push(this._diagnosticCollection);
	}

	public getPathHelper(): IPathHelper{
		return this._pathHelper;
	}

	public setContentType(contentType: ContentType){
		if (contentType === ContentType.EDR) {
			this._pathHelper = EDRPathHelper.get();
		}
		else{
			this._pathHelper = SIEMPathHelper.get(); 
		}
		this._context.workspaceState.update("ContentType", contentType);
	}

	public getDiagnosticCollection() : vscode.DiagnosticCollection {
		return this._diagnosticCollection;
	}

	public getOutputChannel() : vscode.OutputChannel {
		return this._outputChannel;
	}

	public getExtentionMode() : vscode.ExtensionMode {
		return this._context.extensionMode;
	}

	public getContext() : vscode.ExtensionContext {
		return this._context;
	}

	public getExtentionUri() : vscode.Uri {
		return this._context.extensionUri;
	}

	public getExtentionPath() : string {
		return this._context.extensionPath;
	}

	public getExtentionDisplayName() : string {
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

	/**
	 * Возвращает внутреннее имя расширения.
	 * @returns внутреннее имя расширения.
	 */
	public getExtentionSettingsPrefix() : string {
		// TODO: обновить после переименования
		return "siem";
	}

	public getResoucesUri() : vscode.Uri {
		const templatesUri = vscode.Uri.joinPath(this.getExtentionUri(), "templates");
		return templatesUri;
	}

	public getContentType(): ContentType {
		const contentTypeString = this._context.workspaceState.get<string>("ContentType");
		const contentType : ContentType = ContentType[contentTypeString];
		return contentType;
	}

	// TODO: исключить при полном переводе на нативные утилиты sdk.
	public getSiemjPath() : string {
		const osType = this.getOsType();
		let fullPath = "";
		switch(osType) {
			case OsType.Windows: fullPath = path.join(this.getSdkBaseDirectory(), "siemj", "siemj.exe"); break;
			default: throw new Error("Платформа не поддеживается.");
		}

		if (!fs.existsSync(fullPath)){
			throw new FileNotFoundException(
				`Утилита 'siemj.exe' не найдена по пути ${fullPath}. Проверьте путь к [XP SDK](command:workbench.action.openSettings?["xpSdkTools"])`,
				 fullPath);
		}

		return fullPath;
	}

	public getRccCli() : string {
		let appName = "";
		switch(this.getOsType()) {
			case OsType.Windows: appName = "rcc.exe"; break;
			case OsType.Linux: appName = "rcc"; break;
			default: throw new Error("Платформа не поддеживается.");
		}

		const fullPath = path.join(this.getSiemSdkDirectoryPath(), "cli", appName);
		if (!fs.existsSync(fullPath)){
			throw new FileNotFoundException(`Утилита создания графов не найдена по пути ${fullPath}. Проверьте путь к XP SDK`);
		}

		return fullPath;
	}

	public getMkTablesPath() : string {
		let appName = "";
		switch(this.getOsType()) {
			case OsType.Windows: appName = "mktables.exe"; break;
			default: throw new Error("Платформа не поддеживается.");
		}

		const fullPath = path.join(this.getFPTAFillerPath(), appName);
		if (!fs.existsSync(fullPath)){
			throw new FileNotFoundException(
				`XP::[Error]: Утилита создания схемы табличных списков не найдена по пути ${fullPath}! Проверьте путь к XP SDK`,
				fullPath);
		}

		return fullPath;
	}

	public getFPTAFillerPath() : string {
		let appName = "";
		switch(this.getOsType()) {
			case OsType.Windows: appName = "fpta_filler.exe"; break;
			default: throw new Error("Платформа не поддеживается.");
		}

		const fullPath = path.join(this.getSiemSdkDirectoryPath(), appName);
		if (!fs.existsSync(fullPath)){
			throw new FileNotFoundException(
				`XP::[Error]: Утилита создания БД табличных списков не найдена по пути ${fullPath}! Проверьте путь к XP SDK`,
				fullPath);
		}

		return fullPath;
	}

	/**
	 * Возвращает путь к директории со всеми SDK утилитами.
	 * @returns путь к директории со всеми SDK утилитами.
	 */
	public getSdkBaseDirectory(): string {
		const configuration = vscode.workspace.getConfiguration("xpSdkTools");
		const basePath = configuration.get<string>("sdkBaseDirectory");
		if (!fs.existsSync(basePath)){
			VsCodeApiHelper.openSettings(this.getExtentionSettingsPrefix());
			throw new FileNotFoundException(
				`Заданный в настройках путь к директории XP SDK не существует: '${basePath}'. Укажите корректный путь в настройках расширения.`,
				basePath);
		}

		return basePath;
	}

	public getOutputDirectoryPath(rootFolder: string) : string {
		const extensionSettings = vscode.workspace.getConfiguration("siemTools");
		const outputDirectoryPath = extensionSettings.get<string>("outputDirectoryPath");
		return path.join(outputDirectoryPath, rootFolder);
	}

	public getCorrelationDefaultsFilePath(rootFolder: string) : string {
		return path.join(this.getOutputDirectoryPath(rootFolder), "correlation_defaults.json");
	}

	public getSchemaFullPath(rootFolder: string) : string {
		return path.join(this.getOutputDirectoryPath(rootFolder), "schema.json");
	}

	public getNormEventsFilePath(rootFolder: string) : string {
		return path.join(this.getOutputDirectoryPath(rootFolder), "norm_events.json");
	}

	public getCorrEventsFilePath(rootFolder: string) : string {
		return path.join(this.getOutputDirectoryPath(rootFolder), "corr_events.json");
	}

	public getFormulasGraphFilePath(rootFolder: string) : string {
		return path.join(this.getOutputDirectoryPath(rootFolder), "formulas_graph.json");
	}

	public getEnrulesGraphFilePath(rootFolder: string) : string {
		return path.join(this.getOutputDirectoryPath(rootFolder), "enrules_graph.json");
	}

	public getCorrulesGraphFilePath(rootFolder: string) : string {
		return path.join(this.getOutputDirectoryPath(rootFolder), this._pathHelper.getCorrulesGraphFileName());
	}

	public getFptaDbFilePath(rootFolder: string) : string {
		return path.join(this.getOutputDirectoryPath(rootFolder), "fpta_db.db");
	}

	public getTmpDirectoryPath() : string {
		return path.join(this.getOutputDirectoryPath(""), "temp");
	}

	public getTmpSiemjConfigPath() : string {
		return path.join(this.getTmpDirectoryPath(), "siemj.conf");
	}

	public getRandTmpSubDirectoryPath() : string {
		return path.join(this.getTmpDirectoryPath(), Guid.create().toString());
	}

	public getLocalizationBuilder() : string {
		let appName = "";
		switch(this.getOsType()) {
			case OsType.Windows: appName = "build_l10n_rules.exe"; break;
			case OsType.Linux: appName = "build_l10n_rules"; break;
			default: throw new Error("Платформа не поддеживается.");
		}

		const fullPath = path.join(this.getBuildToolsDirectoryPath(), appName);
		if (!fs.existsSync(fullPath)) {
			throw new FileNotFoundException(
				`XP::[Error]: Утилита создания графа локализаций не найдена по пути ${fullPath}! Проверьте путь к XP SDK`,
				fullPath);
		}
		return fullPath;
	}

	public getSiemKBTests() : string {
		let appName = "";
		switch(this.getOsType()) {
			case OsType.Windows: appName = "siemkb_tests.exe"; break;
			default: throw new XpExtentionException("Платформа не поддеживается.");
		}

		const fullPath = path.join(this.getBuildToolsDirectoryPath(), appName);
		if (!fs.existsSync(fullPath)){
			throw new FileNotFoundException(
				`XP::[Error]: Утилита запуска интеграционных тестов не найдена по пути ${fullPath}! Проверьте путь к XP SDK`,
				fullPath);
		}
		return fullPath;
	}

	public getNormalizerCli() : string {
		let appName = "";
		switch(this.getOsType()) {
			case OsType.Windows: appName = "normalizer-cli.exe"; break;
			default: throw new XpExtentionException("Платформа не поддеживается.");
		}

		const fullPath = path.join(this.getSiemSdkDirectoryPath(), "cli", appName);
		if (!fs.existsSync(fullPath)){
			throw new FileNotFoundException(
				`XP::[Error]: Утилита нормализации событий не найдена по пути ${fullPath}! Проверьте путь к XP SDK`,
				fullPath);
		}
		return fullPath;
	}

	public getSiemSdkDirectoryPath() : string {
		const configuration = vscode.workspace.getConfiguration("siemTools");
		const siemSdkDirectory = configuration.get<string>("sdkDirectoryFullPath");
		return siemSdkDirectory;
	}

	/**
	 * Возвращает путь к файлу описания таксономии. 
	 * @returns путь к файлу описания таксономии.
	 */
	public getTaxonomyFullPath() : string {
		const configuration = vscode.workspace.getConfiguration("siemTools");
		const taxonomyFullPath = configuration.get<string>("taxonomyFullPath");
		return taxonomyFullPath;
	}

	/**
	 * Префикс ObjectId, определяющий тип создаваемого контента.
	 * @returns префикс создаваемого контента.
	 */
	public getContentPrefix() : string {
		const configuration = vscode.workspace.getConfiguration("siemTools");
		const taxonomyFullPath = configuration.get<string>("contentPrefix");
		return taxonomyFullPath;
	}

	public getBuildToolsDirectoryFullPath() : string {
		const configuration = vscode.workspace.getConfiguration("siemTools");
		const buildToolsDirectoryFullPath = configuration.get<string>("buildToolsDirectoryFullPath");
		return buildToolsDirectoryFullPath;
	}

	/**
	 * Возвращает путь к файлу русской локализации таксономии. 
	 * @returns путь к файлу русской локализации таксономии.
	 */
	public getTaxonomyRuLocalizationFullPath() : string {
		const taxonomyFullPath = this.getTaxonomyFullPath();

		const taxonomyDirectoryPath = path.dirname(taxonomyFullPath);
		const ruLocalizationFilePath = path.join(taxonomyDirectoryPath, "i18n", "i18n_ru.yaml");
		return ruLocalizationFilePath;
	}

	public getBuildToolsDirectoryPath() : string {
		const configuration = vscode.workspace.getConfiguration("siemTools");
		const buildToolsDirectoryFullPath = configuration.get<string>("buildToolsDirectoryFullPath");
		return buildToolsDirectoryFullPath;
	}

	public getKnowledgeBasePackagerCli() : string {
		const configuration = vscode.workspace.getConfiguration("siemTools");
		const knowledgeBasePackagerCli = configuration.get<string>("knowledgePackagerDirectoryPath");

		const osType = this.getOsType();
		switch(osType) {
			case OsType.Windows: {
				return path.join(knowledgeBasePackagerCli, "kbtools.exe"); 
			} 
			case OsType.Linux:  {
				return path.join(knowledgeBasePackagerCli, "kbtools");
			}

			default: throw new Error("Платформа не поддеживается.");
		}
	}

	public getKnowledgePackagerContractsDirectoryPath() : string {
		const configuration = vscode.workspace.getConfiguration("siemTools");
		const knowledgePackagerContractsDirectoryPath = configuration.get<string>("knowledgePackagerContractsDirectoryPath");
		return knowledgePackagerContractsDirectoryPath;
	}
	
	public getEcatestFullPath() : string {
		const osType = this.getOsType();
		switch(osType) {
			case OsType.Windows: return path.join(this.getBuildToolsDirectoryPath(), "ecatest.exe");
			default: throw new Error("Платформа не поддеживается.");
		}
	}

	public static get() {
		if(!this._instance) {
			throw new Error("Конфигурация расширения не получена. Возможно, она не была инициализирована.");
		}
        return this._instance;
    }

	public static async init(context : vscode.ExtensionContext) : Promise<Configuration> {
		this._instance = new Configuration(context);

		// Создание временной директории.
		const tmpPath = this._instance.getTmpDirectoryPath();
		if(!fs.existsSync(tmpPath)) {
			try {
				await fs.promises.mkdir(tmpPath);
			}
			catch(error) {
				ExtensionHelper.showUserError(`Заданный в настройках путь '${tmpPath}' к временной директории некорректен. Укажите корректный путь в настройках расширения.`);
				VsCodeApiHelper.openSettings(this._instance.getExtentionDisplayName());
			}
		}

		// Очистка временной директории.
		if(!fs.existsSync(tmpPath)) {
			return this._instance;
		}

		const subDirPaths = FileSystemHelper
			.readSubDirectories(tmpPath)
			.map(dn => path.join(tmpPath, dn));

		for(const subDirectoryPath of subDirPaths) {
			try {
				await fs.promises.rmdir(subDirectoryPath, {recursive: true});
			}
			catch(error) {
				console.warn("Не удалось удалить временную директорию. " + error.message);
			}
		}

		return this._instance;
	}

	private static _instance : Configuration;

	private _pathHelper: IPathHelper;

	private _outputChannel : vscode.OutputChannel;

	private _context: vscode.ExtensionContext;

	private _diagnosticCollection: vscode.DiagnosticCollection;
}