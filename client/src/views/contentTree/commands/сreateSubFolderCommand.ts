import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

import { KbHelper } from '../../../helpers/kbHelper';
import { RuleBaseItem } from '../../../models/content/ruleBaseItem';
import { ContentTreeProvider } from '../contentTreeProvider';

export class CreateSubFolderCommand {

	static CommandName = "SiemContentEditor.createSubFolderCommand";

	public async execute(selectedItem: RuleBaseItem) {

		const userInput = await vscode.window.showInputBox(
			{
				ignoreFocusOut: true,
				placeHolder: 'Имя директории',
				prompt: 'Имя директории',
				validateInput: (v) => {
					const trimed = v.trim();
					// Корректность имени директории с точки зрения ОС.
					if(trimed.includes(">") || trimed.includes("<") || trimed.includes(":") || trimed.includes("\"") || trimed.includes("/") || trimed.includes("|") || trimed.includes("?") || trimed.includes("*"))
						return "Имя директории содержит недопустимые символы";

					if(trimed === '')
						return "Имя директории не должно быть пусто";

					// Не используем штатные директории контента.
					const contentSubDirectories = KbHelper.getContentSubDirectories();
					if(contentSubDirectories.includes(trimed))
						return "Данное имя директории зарезервировано и не может быть использовано";

					// Английский язык
					const englishAlphabet = /^[A-Za-z0-9_]*$/;
					if(!englishAlphabet.test(trimed)) {
						return "Допустимы только английские буквы, цифры и символ подчёркивания";
					}

					// Невозможность создать уже созданную директорию.
					const newFolderPath = path.join(selectedItem.getParentPath(), trimed);
					if(fs.existsSync(newFolderPath))
						return "Данная директория уже существует";
				}
			}
		);

		if(!userInput) {
			return;
		}

		const newFolderName = userInput.trim();

		// Создаем директорию.
		const selectedItemDirPath = selectedItem.getDirectoryPath();
		const newFolderPath = path.join(selectedItemDirPath, newFolderName);
		fs.mkdirSync(newFolderPath, {recursive: true});

		await vscode.commands.executeCommand(ContentTreeProvider.refreshTreeCommmand);
	}
}
