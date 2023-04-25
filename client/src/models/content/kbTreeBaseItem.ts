import * as path from "path";
import * as vscode from "vscode";
import { XpException } from '../xpException';
import { ArgumentException } from '../argumentException';
import { MetaInfo } from '../metaInfo/metaInfo';
import { Configuration } from '../configuration';

/**
 * Базовый класс для всех item-ом из дерева контента.
 */
export abstract class KbTreeBaseItem extends vscode.TreeItem {
	constructor(protected _name : string, 
		protected _parentPath : string) {
		super(_name, vscode.TreeItemCollapsibleState.None);
		this.label = _name;
	}

	public setCommand(command: vscode.Command) : void {
		this.command = command;
	}

	public getCommand() : vscode.Command {
		return this.command;
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
	 * TODO:
	 */
	public setFileName(fielName:string) : void {
		this._fileName = fielName;
	}

	/**
	 * TODO: 
	 */
	public getFileName() :string {
		return this._fileName;
	}

	public getFilePath(): string {
		return path.join(this._parentPath, this._name, this._fileName);
	}

	public setLabel(label:string) : void {
		this.label = label;
	}

	public setHighlightsLabel(label:string) : void {
		this.label = {
			label:label, highlights:[[0,label.length]]
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

	public getDirectoryPath() : string {
		if(!this._parentPath) {
			throw new XpException(`Не задан путь к директории для элемента '${this.getName()}'.`);
		}

		return path.join(this._parentPath, this.getName());
	}

	protected getRuleEncoding() : BufferEncoding {
		return "utf-8";
	}

	protected getResourcesPath(){
		return path.join(Configuration.get().getExtensionPath(), 'resources');
	}

	private _fileName : string;

	protected _metaInfo: MetaInfo = new MetaInfo();
}