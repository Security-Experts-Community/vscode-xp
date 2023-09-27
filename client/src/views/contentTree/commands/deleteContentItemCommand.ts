import * as vscode from 'vscode';
import * as fse from 'fs-extra';

import { DialogHelper } from '../../../helpers/dialogHelper';
import { RuleBaseItem } from '../../../models/content/ruleBaseItem';
import { ContentTreeProvider } from '../contentTreeProvider';

export class DeleteContentItemCommand {
	static CommandName = "SiemContentEditor.deleteContentItemCommand";

	public async execute(selectedItem: RuleBaseItem) {
		const folderToDeletePath = selectedItem.getDirectoryPath();

		try {
			await fse.remove(folderToDeletePath);
		}
		catch(error) {
			DialogHelper.showError("Ошибка удаления файла", error);
		}

		await vscode.commands.executeCommand(ContentTreeProvider.refreshTreeCommand);
	}
}
