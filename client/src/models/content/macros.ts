import * as path from "path";

import { RuleBaseItem } from './ruleBaseItem';
import { ContentTreeProvider } from '../../views/contentTree/contentTreeProvider';

export class Macros extends RuleBaseItem {
	public rename(newName: string): Promise<void> {
		throw new Error('Method not implemented.');
	}
	
	public async save(fullPath: string) : Promise<void> {
		throw new Error('Method not implemented.');
	}

	constructor(macrosDirPath: string) {
		super(path.basename(macrosDirPath));
		this.setRuleFileName("filter.flt");

		const name = path.basename(macrosDirPath);
		this.setName(name);

		const parentPath = path.dirname(macrosDirPath);
		this.setParentPath(parentPath);
	}

	public static async parseFromFile(directoryPath: string, fileName?: string) : Promise<Macros> {
		const marcos = new Macros(directoryPath);
		
		// Если явно указано имя файла, то сохраняем его.
		// Иначе используем заданное в конструкторе
		if (fileName){
			marcos.setRuleFileName(fileName);			
		}

		// Добавляем команду, которая пробрасываем параметром саму рубрику.
		marcos.setCommand({ 
			command: ContentTreeProvider.onRuleClickCommand,  
			title: "Open File", 
			arguments: [marcos] 
		});

		return marcos;
	}

	public getRuleFilePath(): string {
		return path.join(this.getDirectoryPath(), this.getRuleFileName());
	}

	iconPath = {
		light: path.join(this.getResourcesPath(), 'light', 'rule.svg'),
		dark: path.join(this.getResourcesPath(), 'dark', 'rule.svg')
	};

	contextValue = 'Macros';
}