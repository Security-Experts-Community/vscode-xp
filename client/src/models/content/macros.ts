import * as fs from 'fs';
import * as path from "path";
import * as vscode from 'vscode';

import { ContentTreeProvider } from '../../views/contentTree/contentTreeProvider';
import { XpException } from '../xpException';
import { XPObjectType } from './xpObjectType';
import { FileSystemException } from '../fileSystemException';
import { RuleBaseItem } from './ruleBaseItem';
import { FileSystemHelper } from '../../helpers/fileSystemHelper';
import { BaseUnitTest } from '../tests/baseUnitTest';
import { UnitTestOutputParser } from '../tests/unitTestOutputParser';
import { UnitTestRunner } from '../tests/unitTestsRunner';
import { MetaInfo } from '../metaInfo/metaInfo';

export class Macros extends RuleBaseItem {
	
	public async save(parentFullPath?: string): Promise<void> {

		// Путь либо передан как параметр, либо он уже задан в правиле.
		let marcoDirPath = "";
		if (parentFullPath) {
			marcoDirPath = path.join(parentFullPath, this._name);
			this.setParentPath(parentFullPath);
		} else {
			const parentPath = this.getParentPath();
			if (!parentPath) {
				throw new XpException("Не задан путь для сохранения макроса");
			}

			marcoDirPath = this.getDirectoryPath();
		}

		if (!fs.existsSync(marcoDirPath)) {
			await fs.promises.mkdir(marcoDirPath, {recursive: true});
		}

		const ruleFullPath = this.getRuleFilePath();
		const ruleCode = await this.getRuleCode();
		await FileSystemHelper.writeContentFile(ruleFullPath, ruleCode);

		// // Параллельно сохраняем все данные правила.
		await this.getMetaInfo().save(marcoDirPath);
		// const integrationTestsPromise = this.saveIntegrationTests(marcoDirPath);
		// const unitTestsPromise = this.saveUnitTests();
		// await Promise.all([metainfoPromise, localizationPromise, integrationTestsPromise, unitTestsPromise]);
	}

	public async saveMetaInfoAndLocalizations() : Promise<void> {
		const fullPath = this.getDirectoryPath();
		await this.getMetaInfo().save(fullPath);
	}

	public setRuDescription(description: string) : void {
		this.getMetaInfo().setRuDescription(description);
	}

	public setEnDescription(description: string) : void {
		this.getMetaInfo().setEnDescription(description);
	}

	public getRuDescription() : string {
		return this.getMetaInfo().getRuDescription();
	}

	public getEnDescription() : string {
		return this.getMetaInfo().getEnDescription();
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
			throw new FileSystemException(`Директория '${directoryPath}' не существует`, directoryPath);
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

		// Парсим основные метаданные.
		const metaInfo = await MetaInfo.fromFile(directoryPath);
		marcos.setMetaInfo(metaInfo);

		marcos.setRuDescription(metaInfo.getRuDescription());
		marcos.setEnDescription(metaInfo.getEnDescription());

		return marcos;
	}

	public getRuleFilePath(): string {
		return path.join(this.getDirectoryPath(), this.getFileName());
	}

	public convertUnitTestFromObject(object: any): BaseUnitTest {
		throw new Error('Method not implemented.');
	}
	public createNewUnitTest(): BaseUnitTest {
		throw new Error('Method not implemented.');
	}
	public clearUnitTests(): void {
		throw new Error('Method not implemented.');
	}
	public getUnitTestRunner(): UnitTestRunner {
		throw new Error('Method not implemented.');
	}
	public getUnitTestOutputParser(): UnitTestOutputParser {
		throw new Error('Method not implemented.');
	}
	protected getLocalizationPrefix(): string {
		throw new Error('Method not implemented.');
	}
	public reloadUnitTests(): void {
		throw new Error('Method not implemented.');
	}
	public rename(newName: string): Promise<void> {
		throw new XpException('Method not implemented.');
	}

	iconPath = new vscode.ThemeIcon('filter');
	contextValue = 'Macros';
}