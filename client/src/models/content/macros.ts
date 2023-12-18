import * as fs from 'fs';
import * as path from "path";
import * as vscode from 'vscode';

import { ContentTreeProvider } from '../../views/contentTree/contentTreeProvider';
import { ContentTreeBaseItem } from './contentTreeBaseItem';
import { XpException } from '../xpException';
import { XPObjectType } from './xpObjectType';

export class Macros extends ContentTreeBaseItem {
	public rename(newName: string): Promise<void> {
		throw new XpException('Method not implemented.');
	}
	
	public async save(fullPath: string) : Promise<void> {
		throw new XpException('Method not implemented.');
	}

	public getObjectType(): string {
		return XPObjectType.Macro;
	}

	private constructor(name: string, parentDirectoryPath?: string) {
		super(name, parentDirectoryPath);
		this.setFileName("filter.flt");
	}

	public static async parseFromDirectory(directoryPath: string, fileName?: string) : Promise<Macros> {
		if (!fs.existsSync(directoryPath)) {
			throw new Error(`Директория '${directoryPath}' не существует.`);
		}

		const name = path.basename(directoryPath);
		const parentDirectoryPath = path.dirname(directoryPath);
		const marcos = new Macros(name, parentDirectoryPath);
		
		// Если явно указано имя файла, то сохраняем его.
		// Иначе используем заданное в конструкторе
		if (fileName){
			marcos.setFileName(fileName);			
		}

		// Добавляем команду на открытие.
		marcos.setCommand({ 
			command: ContentTreeProvider.onRuleClickCommand,  
			title: "Open File", 
			arguments: [marcos] 
		});

		return marcos;
	}

	public getRuleFilePath(): string {
		return path.join(this.getDirectoryPath(), this.getFileName());
	}

	iconPath = new vscode.ThemeIcon('filter');
	contextValue = 'Macros';
}