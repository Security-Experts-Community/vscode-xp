import * as vscode from "vscode";

/**
 * Базовый класс для всех item-ом из дерева контента.
 */
export abstract class KbTreeBaseItem extends vscode.TreeItem {
	constructor(protected _name : string) {
		super(_name, vscode.TreeItemCollapsibleState.None);
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

	public setLabel(label:string) : void {
		this.label = label;
	}

	public setHighlightsLabel(label:string) : void {
		this.label = {
			label:label, highlights:[[0,label.length]]
		};
	}

	protected getRuleEncoding() : BufferEncoding {
		return "utf-8";
	}
}