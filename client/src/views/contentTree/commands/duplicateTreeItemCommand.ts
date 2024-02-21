import * as path from 'path';
import * as vscode from 'vscode';

import { ContentTreeProvider } from '../contentTreeProvider';
import { RuleBaseItem } from '../../../models/content/ruleBaseItem';
import { DialogHelper } from '../../../helpers/dialogHelper';
import { ContentHelper } from '../../../helpers/contentHelper';
import { Configuration } from '../../../models/configuration';

export class DuplicateTreeItemCommand {

	static CommandName = "SiemContentEditor.duplicateTreeItemCommand";

	constructor(private _config: Configuration) {
	}

	public async execute(selectedItem: RuleBaseItem): Promise<void> {

		const ruleDirPath = selectedItem.getDirectoryPath();

		let stopExecution = false;
		vscode.workspace.textDocuments.forEach( td => {
			const openFilePath = td.fileName;

			// Есть несохраненные пути в переименовываемом правиле.
			if(td.isDirty && openFilePath.includes(ruleDirPath)) {
				const fileName = path.basename(openFilePath);
				stopExecution = true;
				DialogHelper.showInfo(`Файл '${fileName}' не сохранен. Сохраните его и повторите действие.`);
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
				placeHolder: this._config.getMessage("NameOfNewRule"),
				prompt: this._config.getMessage("NameOfNewRule"),
				validateInput: (v) => {
					return ContentHelper.validateContentItemName(v);
				}
			}
		);

		if(!userInput) {
			return;
		}
		
		try {
			const newRuleName = userInput.trim();
			const duplicate = await selectedItem.duplicate(newRuleName);
			await duplicate.save();

			// Обновить дерево и открыть корреляцию.
			vscode.commands.executeCommand(ContentTreeProvider.refreshTreeCommand);
			vscode.commands.executeCommand(ContentTreeProvider.onRuleClickCommand, duplicate);
		}
		catch(error) {
			DialogHelper.showInfo("Не удалось дублировать правило");
			return;
		}
	}
}
