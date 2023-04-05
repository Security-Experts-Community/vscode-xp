import * as vscode from "vscode";
import * as path from "path";
import * as fs from 'fs';

import { RuleBaseItem } from './ruleBaseItem';
import { ExtensionHelper } from '../../helpers/extensionHelper';
import { MetaInfo } from '../metaInfo/metaInfo';
import { ContentTreeProvider } from '../../views/contentTree/contentTreeProvider';

export class Table extends RuleBaseItem {

	public async rename(newName: string): Promise<void> {
		throw new Error('Method not implemented.');
	}
	
	public async save(fullPath: string) : Promise<void> {
		throw new Error('Method not implemented.');
	}

	private constructor(name: string, parentDirectoryPath? : string) {
		super(name, parentDirectoryPath);
		this.setRuleFileName("table.tl");
	}

	public static async parseFromDirectory(directoryPath: string, fileName?: string) : Promise<Table> {

		if(!fs.existsSync(directoryPath)) {
			throw new Error(`Директория '${directoryPath}' не существует.`);
		}

		// Получаем имя корреляции и родительский путь.
		const name = path.basename(directoryPath);
		const parentDirectoryPath = path.dirname(directoryPath);

		const table = new Table(name, parentDirectoryPath);
				
		// Если явно указано имя файла, то сохраняем его.
		// Иначе используем заданное в конструкторе
		if (fileName){
			table.setRuleFileName(fileName);			
		}

		// Добавляем команду, которая пробрасываем параметром саму рубрику.
		table.setCommand({ 
			command: ContentTreeProvider.onRuleClickCommand,  
			title: "Open File", 
			arguments: [table] 
		});

		return table;
	}

	public static create(directoryPath: string, fileName?: string) : Table {
		const table = new Table(directoryPath);

		// Если явно указано имя файла, то сохраняем его.
		// Иначе используем заданное в конструкторе
		if (fileName){
			table.setRuleFileName(fileName);			
		}

		// Парсим основные метаданные.
		const metaInfo = MetaInfo.parseFromFile(directoryPath);
		table.setMetaInfo(metaInfo);

		// Добавляем команду, которая пробрасываем параметром саму рубрику.
		table.setCommand({ 
			command: ContentTreeProvider.onRuleClickCommand,
			title: "Open File", 
			arguments: [table]
		});

		return table;
	}

	iconPath = {
		light: path.join(ExtensionHelper.getExtentionPath(), 'resources', 'light', 'rule.svg'),
		dark: path.join(ExtensionHelper.getExtentionPath(), 'resources', 'dark', 'rule.svg')
	};

	contextValue = 'Table';
}