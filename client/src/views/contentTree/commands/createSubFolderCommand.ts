import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

import { KbHelper } from '../../../helpers/kbHelper';
import { RuleBaseItem } from '../../../models/content/ruleBaseItem';
import { ContentTreeProvider } from '../contentTreeProvider';
import { ViewCommand } from './viewCommand';
import { Configuration } from '../../../models/configuration';

export class CreateSubFolderCommand extends ViewCommand {

	public constructor(private config: Configuration, private selectedItem: RuleBaseItem) {
		super();
	}

	public async execute() : Promise<void> {

		const userInput = await vscode.window.showInputBox(
			{
				ignoreFocusOut: true,
				placeHolder: 'Имя папки',
				prompt: 'Имя папки',
				// TODO: убрать дублирование кода валидации
				// Учесть отличие локализации
				validateInput: (v) => {
					const trimmed = v.trim();
					// Корректность имени директории с точки зрения ОС.
					if(trimmed.includes(">") || trimmed.includes("<") || trimmed.includes(":") || trimmed.includes("\"") || trimmed.includes("/") || trimmed.includes("|") || trimmed.includes("?") || trimmed.includes("*"))
						return "Имя папки содержит недопустимые символы";

					if(trimmed === '')
						return "Имя папки должно содержать хотя бы один символ";

					// Не используем штатные директории контента.
					const contentSubDirectories = KbHelper.getContentSubDirectories();
					if(contentSubDirectories.includes(trimmed))
						return "Это имя папки зарезервировано и не может быть использовано";

					// Английский язык
					const englishAlphabet = /^[A-Za-z0-9_]*$/;
					if(!englishAlphabet.test(trimmed)) {
						return "Используйте только английские буквы, цифры и символ подчеркивания";
					}

					// Невозможность создать уже созданную директорию.
					const newFolderPath = path.join(this.selectedItem.getParentPath(), trimmed);
					if(fs.existsSync(newFolderPath))
						return "Такая папка уже существует";
				}
			}
		);

		if(!userInput) {
			return;
		}

		const newFolderName = userInput.trim();

		// Создаем директорию.
		const selectedItemDirPath = this.selectedItem.getDirectoryPath();
		const newFolderPath = path.join(selectedItemDirPath, newFolderName);
		fs.mkdirSync(newFolderPath, {recursive: true});

		await vscode.commands.executeCommand(ContentTreeProvider.refreshTreeCommand);
	}
}
