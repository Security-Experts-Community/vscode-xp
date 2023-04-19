import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

import { ContentTreeProvider } from '../contentTreeProvider';
import { RuleBaseItem } from '../../../models/content/ruleBaseItem';
import { KbHelper } from '../../../helpers/kbHelper';
import { ExtensionHelper } from '../../../helpers/extensionHelper';

export class RenameTreeItemCommand {

	static CommandName = "SiemContentEditor.renameTreeItemCommand";

	public async execute(selectedItem: RuleBaseItem) {

		const ruleDirPath = selectedItem.getDirectoryPath();

		let stopExecution = false;
		vscode.workspace.textDocuments.forEach( td => {
			const openFilePath = td.fileName;

			// Есть несохраненные пути в переименовываемом правиле.
			if(td.isDirty && openFilePath.includes(ruleDirPath)) {
				const fileName = path.basename(openFilePath);
				stopExecution = true;
				ExtensionHelper.showUserInfo(`Файл '${fileName}' не сохранен. Сохраните и повторите команду.`);
			}
		});

		if(stopExecution) {
			return;
		}

		const oldRuleName = selectedItem.getName();
		const userInput = await vscode.window.showInputBox( 
			{
				ignoreFocusOut: true,
				value : oldRuleName,
				placeHolder: 'Новое имя правила',
				prompt: 'Новое имя правила',
				validateInput: (v) => {
					const trimed = v.trim();
					// Корректность имени директории с точки зрения ОС.
					if(trimed.includes(">") || trimed.includes("<") || trimed.includes(":") || trimed.includes("\"") || trimed.includes("/") || trimed.includes("|") || trimed.includes("?") || trimed.includes("*"))
						return "Имя правила содержит недопустимые символы";

					if(trimed === '')
						return "Имя правилане должно быть пусто";

					// Не используем штатные директории контента.
					const contentSubDirectories = KbHelper.getContentSubDirectories();
					if(contentSubDirectories.includes(trimed))
						return "Данное имя директории зарезервировано и не может быть использовано";

					// Английский язык
					const englishAlphabet = /^[A-Za-z0-9_]*$/;
					if(!englishAlphabet.test(trimed)) {
						return "Допустимы только английские буквы, цифры и символ подчёркивания";
					}
				}
			}
		);

		if(!userInput) {
			return;
		}
		
		try {
			// Получаем директорию для исходного правила, дабы удалить её после переименованиия.
			const oldRuleDirectoryPath = selectedItem.getDirectoryPath();

			const newRuleName = userInput.trim();
			await selectedItem.rename(newRuleName);
			await selectedItem.save();

			// Если мы меняем не имя правила, а его регистр, то удалять правило не надо. 
			// Иначе в Windows мы удалим новое правило.
			const oldRuleNameLowerCase = oldRuleName.toLocaleLowerCase();
			if(newRuleName.toLocaleLowerCase() !== oldRuleNameLowerCase) {
				// Удаляем старое правило и сохраняем новое.
				await fs.promises.rmdir(oldRuleDirectoryPath, { recursive: true });
			}
	
			// Обновить дерево и открыть корреляцию.
			await vscode.commands.executeCommand(ContentTreeProvider.refreshTreeCommmand);
			await vscode.commands.executeCommand(ContentTreeProvider.onRuleClickCommand, selectedItem);
		}
		catch(error) {
			ExtensionHelper.showUserInfo("Ошибка переименования.");
			return;
		}
	}
}
