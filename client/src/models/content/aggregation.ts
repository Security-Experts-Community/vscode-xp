import * as path from "path";
import * as fs from 'fs';

import { RuleBaseItem } from './ruleBaseItem';
import { ContentTreeProvider } from '../../views/contentTree/contentTreeProvider';

export class Aggregation extends RuleBaseItem {
	public async rename(newName: string): Promise<void> {
		throw new Error('Method not implemented.');
	}

	private constructor(name: string, parentDirectoryPath? : string) {
		super(name, parentDirectoryPath);
		this.setRuleFileName('rule.agr');
	}
	
	public static async parseFromDirectory(directoryPath: string, fileName?: string) : Promise<Aggregation> {

		if(!fs.existsSync(directoryPath)) {
			throw new Error(`Директория '${directoryPath}' не существует.`);
		}

		// Получаем имя корреляции и родительский путь.
		const name = path.basename(directoryPath);
		const parentDirectoryPath = path.dirname(directoryPath);

		const aggregation = new Aggregation(name, parentDirectoryPath);
		
		// Если явно указано имя файла, то сохраняем его.
		// Иначе используем заданное в конструкторе
		if (fileName){
			aggregation.setRuleFileName(fileName);
		}

		// Добавляем команду, которая пробрасываем параметром саму рубрику.
		aggregation.setCommand({ 
			command: ContentTreeProvider.onRuleClickCommand,  
			title: "Open File", 
			arguments: [aggregation] 
		});

		return aggregation;
	}

	public async save(fullPath?: string): Promise<void> {
		throw new Error('Method not implemented.');
	}

	public static create(name: string, parentPath?: string, fileName?: string) : Aggregation {
		const aggregation = new Aggregation(name, parentPath);
		
		// Если явно указано имя файла, то сохраняем его.
		// Иначе используем заданное в конструкторе
		if (fileName){
			aggregation.setRuleFileName(fileName);
		}

		// Добавляем команду, которая пробрасываем параметром саму рубрику.
		aggregation.setCommand({ 
			command: ContentTreeProvider.onRuleClickCommand,  
			title: "Open File", 
			arguments: [aggregation] 
		});

		return aggregation;
	}

	iconPath = {
		light: path.join(this.getResourcesPath(), 'light', 'rule.svg'),
		dark: path.join(this.getResourcesPath(), 'dark', 'rule.svg')
	};

	contextValue = 'Aggregation';
}