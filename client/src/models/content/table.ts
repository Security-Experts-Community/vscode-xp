import * as path from "path";
import * as fs from 'fs';
import * as vscode from 'vscode';

import { ContentTreeProvider } from '../../views/contentTree/contentTreeProvider';
import { KbTreeBaseItem } from './kbTreeBaseItem';
import { XpException } from '../xpException';

export class Table extends KbTreeBaseItem {

	public async rename(newName: string): Promise<void> {
		throw new XpException('Method not implemented.');
	}

	public async save(fullPath: string): Promise<void> {
		throw new XpException('Method not implemented.');
	}

	private constructor(name: string, parentDirectoryPath?: string) {
		super(name, parentDirectoryPath);
		this.setFileName("table.tl");
	}

	public static async parseFromDirectory(directoryPath: string, fileName?: string): Promise<Table> {

		if (!fs.existsSync(directoryPath)) {
			throw new Error(`Директория '${directoryPath}' не существует.`);
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

		// Добавляем команду, которая пробрасываем параметром саму рубрику.
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