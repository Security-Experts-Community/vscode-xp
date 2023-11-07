import * as path from "path";
import * as fs from 'fs';
import * as vscode from 'vscode';

import { ContentTreeProvider } from '../../views/contentTree/contentTreeProvider';
import { KbTreeBaseItem } from './kbTreeBaseItem';
import { XpException } from '../xpException';
import { XPObjectType } from './xpObjectType';
import { MetaInfo } from '../metaInfo/metaInfo';
import { Localization } from './localization';
import { RuleBaseItem } from './ruleBaseItem';
import { BaseUnitTest } from '../tests/baseUnitTest';
import { UnitTestOutputParser } from '../tests/unitTestOutputParser';
import { UnitTestRunner } from '../tests/unitTestsRunner';
import { FileSystemHelper } from '../../helpers/fileSystemHelper';

export enum TableListType {
	Registry =  		'Registry',
	CorrelationRule =	'CorrelationRule',
	EnrichmentRule = 	'EnrichmentRule',
	AssetGrid =  		'AssetGrid',
}

export class Table extends RuleBaseItem {
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

	public async rename(newName: string): Promise<void> {
		throw new XpException('Method not implemented.');
	}

	/**
	 * Возвращает код правила из файла с диска или из памяти.
	 * @returns код правила.
	 */
	public async getRuleCode(): Promise<string> {
		const rulePath = this.getRuleFilePath();

		// Порядок не такой как в других правилах, сохраненное состояние в памяти имеет приоритет при пересохранении ТС
		if(this._ruleCode) {
			return this._ruleCode;
		}

		if(fs.existsSync(rulePath)) {
			this._ruleCode = await fs.promises.readFile(rulePath, this.getRuleEncoding());
			return this._ruleCode;
		}

		return "";
	}

	public async save(parentFullPath?: string): Promise<void> {

		// Путь либо передан как параметр, либо он уже задан в правиле.
		let tableDirPath = "";
		if (parentFullPath) {
			tableDirPath = path.join(parentFullPath, this._name);
			this.setParentPath(parentFullPath);
		} else {
			const parentPath = this.getParentPath();
			if (!parentPath) {
				throw new XpException("Не задан путь для сохранения корреляции.");
			}

			tableDirPath = this.getDirectoryPath();
		}

		if (!fs.existsSync(tableDirPath)) {
			await fs.promises.mkdir(tableDirPath, {recursive: true});
		}

		const ruleFullPath = this.getRuleFilePath();
		const ruleCode = await this.getRuleCode();
		await FileSystemHelper.writeContentFileIfChanged(ruleFullPath, ruleCode);

		// Параллельно сохраняем все данные правила.
		const metainfoPromise = this.getMetaInfo().save(tableDirPath);
		const localizationPromise = this.saveLocalizationsImpl(tableDirPath);
		await Promise.all([metainfoPromise, localizationPromise]);
	}

	constructor(name: string, parentDirectoryPath?: string) {
		super(name, parentDirectoryPath);
		this.setFileName("table.tl");
	}

	public getObjectType(): string {
		return XPObjectType.Table;
	}

	public static create(name: string, parentPath?: string): Table {
		const table = new Table(name, parentPath);

		const metainfo = table.getMetaInfo();
		metainfo.setName(name);

		const objectId = table.generateObjectId();
		if(objectId) {
			metainfo.setObjectId(objectId);
		}

		// Добавляем команду на открытие.
		table.setCommand({
			command: ContentTreeProvider.onRuleClickCommand,
			title: "Open File",
			arguments: [table]
		});

		return table;
	}

	public static async parseFromDirectory(directoryPath: string, fileName?: string): Promise<Table> {

		if (!fs.existsSync(directoryPath)) {
			throw new XpException(`Директория '${directoryPath}' не существует.`);
		}

		// Получаем название табличного списка и родительский путь.
		const name = path.basename(directoryPath);
		const parentDirectoryPath = path.dirname(directoryPath);

		const table = new Table(name, parentDirectoryPath);

		// Если явно указано имя файла, то сохраняем его.
		// Иначе используем заданное в конструкторе
		if (fileName) {
			table.setFileName(fileName);
		}

		// Парсим основные метаданные.
		const metaInfo = MetaInfo.fromFile(directoryPath);
		table.setMetaInfo(metaInfo);

		// // Парсим описания на разных языках.
		const ruDescription = await Localization.parseRuDescription(directoryPath);
		table.setRuDescription(ruDescription);

		const enDescription = await Localization.parseEnDescription(directoryPath);
		table.setEnDescription(enDescription);

		// Добавляем команду на открытие.
		table.setCommand({
			command: ContentTreeProvider.onRuleClickCommand,
			title: "Open File",
			arguments: [table]
		});

		return table;
	}

	iconPath = new vscode.ThemeIcon('symbol-number');
	contextValue = 'Table';
}