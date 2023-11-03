import * as path from "path";
import * as vscode from "vscode";

import { MetaInfo } from '../metaInfo/metaInfo';
import { Configuration } from '../configuration';
import { KbHelper } from '../../helpers/kbHelper';
import { ArgumentException } from '../argumentException';
import { XpException } from '../xpException';

/**
 * Базовый класс для всех item-ом дерева контента.
 */
export abstract class ContentTreeBaseItem extends vscode.TreeItem {
	constructor(protected _name : string, 
		protected _parentPath : string) {
		super(_name, vscode.TreeItemCollapsibleState.None);
		this.label = _name;
	}

	public abstract getObjectType() : string;
	public isFolder(): boolean {
		return false;
	}

	public generateObjectId() : string {
		const ruleName = this.getName();
		const contentPrefix = Configuration.get().getContentPrefix();
		if(contentPrefix === "") {
			return undefined;
		}

		const objectType = this.getObjectType();
		return KbHelper.generateObjectId(ruleName, contentPrefix, objectType);
	}

	public setCommand(command: vscode.Command) : void {
		this.command = command;
	}

	public getCommand() : vscode.Command {
		return this.command;
	}

	public getContentRootPath(config: Configuration): string{
		if(!this._parentPath) {
			throw new ArgumentException(`Не задан путь к директории правила '${this.getName()}'.`);
		}

		const pathEntities = this.getDirectoryPath().split(path.sep);
		const rootPaths = config.getContentRoots().map(folder => {return path.basename(folder);});
		for (const rootPath of rootPaths){
			const  packagesDirectoryIndex = pathEntities.findIndex( pe => pe.toLocaleLowerCase() === rootPath);
			if(packagesDirectoryIndex === -1){
				continue;
			}

			// Удаляем лишние элементы пути и собираем результирующий путь.
			pathEntities.splice(packagesDirectoryIndex + 1);
			const packageDirectoryPath = pathEntities.join(path.sep);
			return packageDirectoryPath;
		}

		throw new XpException(`Путь к правилу '${this.getName()}' не содержит ни одну из корневых директорий: [${rootPaths.join(", ")}].`);
	}

	/**
	 * Переименовывает item.
	 */
	public async rename(newRuleName: string) : Promise<void>{return undefined;}

	/**
	 * Задает имя метки, которая отображается в дереве.
	 * @param newName новое имя метки.
	 */
	public setName(newName:string) : void {
		this.label = newName;
		this._name = newName;
	}

	/**
	 * Получает имя метки, которая отображается в дереве.
	 * @returns  имя метки, которая отображается в дереве.
	 */
	public getName() :string {
		return this._name;
	}

	/**
	 * Задает имя файла правила (корреляции, нормализации, обогащения, макроса и т.д.)
	 * @param fileName 
	 */
	public setFileName(fileName : string) : void {
		this._fileName = fileName;
	}

	/**
	 * Возвращает имя файла правила
	 * @returns возвращает имя файла правила или undefined для директорий.
	 */
	public getFileName() : string {
		return this._fileName;
	}

	/**
	 * Возвращает путь к файлу правила
	 * @returns возвращает путь к файлу правила (корреляции, нормализации, обогащения, макроса и т.д.) или undefined для директорий.
	 */
	public getFilePath() : string {
		if(!this._fileName) {
			return undefined;
		}
		return path.join(this._parentPath, this._name, this._fileName);
	}

	public setLabel(newLabel:string) : void {
		this.label = newLabel;
	}

	public setHighlightsLabel(newLabel:string) : void {
		this.label = {
			label:newLabel, highlights:[[0,newLabel.length]]
		};
	}

	public setParentPath(parentPath: string) : void{
		this._parentPath = parentPath;
	}

	public getParentPath() : string{
		return this._parentPath;
	}

	public getMetaInfoFilePath(): string {
		return path.join(this.getDirectoryPath(), MetaInfo.METAINFO_FILENAME);
	}

	public setMetaInfo(metaInfo : MetaInfo) {
		this._metaInfo = metaInfo;
	}

	public getMetaInfo() : MetaInfo {
		return this._metaInfo;
	}

	public getDirectoryPath() : string {
		if(!this._parentPath) {
			return undefined;
		}

		return path.join(this._parentPath, this.getName());
	}

	protected getRuleEncoding() : BufferEncoding {
		return "utf-8";
	}

	protected getResourcesPath(){
		return path.join(Configuration.get().getExtensionPath(), 'resources');
	}

	public getChildren() : ContentTreeBaseItem [] {
		return this._children;
	}

	public setChildren(children: ContentTreeBaseItem []) : void {
		this._children = children;
	}

	private _fileName : string;
	private _metaInfo: MetaInfo = new MetaInfo();
	private _children: ContentTreeBaseItem [] = [];
}