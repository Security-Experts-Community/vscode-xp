import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";

import { FileSystemHelper } from '../../helpers/fileSystemHelper';
import { RuleBaseItem } from './ruleBaseItem';
import { KbTreeBaseItem } from './kbTreeBaseItem';
import { XpException } from '../xpException';

export enum ContentFolderType {
	ContentRoot = 1,
	PackageFolder, 		// Директория пакета
	CorrelationsFolder, 	// Директория, с базовой директорией correlation_rules
	EnrichmentsFolder, 		// Директория, с базовой директорией enrichment_rules
	AggregationsFolder, 	// Директория, с базовой директорией aggregation_rules
	NormalizationsFolder, 	// Директория, с базовой директорией normalization_formulas
	TabularListsFolder,		// Директория, с базовой директорией tabular_lists
	AnotherFolder,
}

export class ContentFolder extends KbTreeBaseItem {
	public getObjectType(): string {
		throw new Error('Method not implemented.');
	}

	public async rename(newName: string): Promise<void> {
		throw new XpException('Method not implemented.');
	}

	public getRuleFileName(): string {
		throw new XpException('Method not implemented.');
	}

	public getRuleFilePath(): string {
		return this.getDirectoryPath();
	}

	public getDirectoryPath() : string {
		if(!this.getParentPath()) {
			throw new XpException(`Не задан путь к директории правила '${this.getName()}'.`);
		}

		return path.join(this.getParentPath(), this.getName());
	}

	public async save(fullPath?: string): Promise<void> {
		throw new Error('Method not implemented.');
	}

	constructor(directoryName: string, type: ContentFolderType, hasNestedElements: boolean) {
		
		super(directoryName, path.basename(directoryName));

		switch(type){
			case ContentFolderType.PackageFolder:
				this.iconPath = new vscode.ThemeIcon('package');
				break;
			case ContentFolderType.ContentRoot:
				this.iconPath = new vscode.ThemeIcon('root-folder');
				break;
			default:
				this.iconPath = {
					light: path.join(this.getResourcesPath(), 'light', 'folder.svg'),
					dark: path.join(this.getResourcesPath(), 'dark', 'folder.svg')
			};
		}
		
		this.collapsibleState = 
			hasNestedElements 
				? vscode.TreeItemCollapsibleState.Collapsed 
				: vscode.TreeItemCollapsibleState.None;
	}

	public static async create(directoryPath: string, newFolderType : ContentFolderType) : Promise<ContentFolder> {

		if(!fs.existsSync(directoryPath)) {
			throw new XpException(`Директория '${directoryPath}' не существует.`);
		}

		const subDirectories = FileSystemHelper.readSubDirectoryNames(directoryPath);
		const name = path.basename(directoryPath);

		let contentFolder: ContentFolder;
		if(subDirectories.length > 0) {
			contentFolder = new ContentFolder(name, newFolderType, true);
		} else {
			contentFolder = new ContentFolder(name, newFolderType, false);
		}

		const parentPath = path.dirname(directoryPath);
		contentFolder.setParentPath(parentPath);

		// Задаем тип директории.
		contentFolder.contextValue = ContentFolderType[newFolderType];
		return contentFolder;
	}
}
