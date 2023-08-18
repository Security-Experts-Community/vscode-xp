import * as path from "path";
import * as fs from 'fs';

import { RuleBaseItem } from './ruleBaseItem';
import { ContentTreeProvider } from '../../views/contentTree/contentTreeProvider';
import { BaseUnitTest } from '../tests/baseUnitTest';
import { UnitTestOutputParser } from '../tests/unitTestOutputParser';
import { UnitTestRunner } from '../tests/unitTestsRunner';
import { XpException } from '../xpException';
import { XPObjectType } from './xpObjectType';

export class Aggregation extends RuleBaseItem {
	protected getLocalizationPrefix(): string {
		return "aggregation";
	}
	public clearUnitTests(): void {
		throw new XpException('Method not implemented.');
	}
	public getUnitTestRunner(): UnitTestRunner {
		throw new XpException('Method not implemented.');
	}
	public getUnitTestOutputParser(): UnitTestOutputParser {
		throw new XpException('Method not implemented.');
	}
	public reloadUnitTests(): void {
		throw new XpException('Method not implemented.');
	}
	public convertUnitTestFromObject(object: any): BaseUnitTest {
		throw new XpException('Method not implemented.');
	}
	public createNewUnitTest(): BaseUnitTest {
		throw new XpException('Method not implemented.');
	}
	public async rename(newName: string): Promise<void> {
		throw new XpException('Method not implemented.');
	}

	private constructor(name: string, parentDirectoryPath? : string) {
		super(name, parentDirectoryPath);
		this.setFileName('rule.agr');
	}

	public getObjectType(): string {
		return XPObjectType.Aggregation;
	}
	
	public static async parseFromDirectory(directoryPath: string, fileName?: string) : Promise<Aggregation> {

		if(!fs.existsSync(directoryPath)) {
			throw new XpException(`Директория '${directoryPath}' не существует.`);
		}

		// Получаем имя корреляции и родительский путь.
		const name = path.basename(directoryPath);
		const parentDirectoryPath = path.dirname(directoryPath);

		const aggregation = new Aggregation(name, parentDirectoryPath);
		
		// Если явно указано имя файла, то сохраняем его.
		// Иначе используем заданное в конструкторе
		if (fileName){
			aggregation.setFileName(fileName);
		}

		// Добавляем команду на открытие.
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
			aggregation.setFileName(fileName);
		}

		// Добавляем команду на открытие.
		aggregation.setCommand({ 
			command: ContentTreeProvider.onRuleClickCommand,  
			title: "Open File", 
			arguments: [aggregation] 
		});

		return aggregation;
	}

	contextValue = 'Aggregation';
}