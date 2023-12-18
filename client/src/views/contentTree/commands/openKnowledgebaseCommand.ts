import * as fs from 'fs';
import * as vscode from 'vscode';

import { VsCodeApiHelper } from '../../../helpers/vsCodeApiHelper';

export class OpenKnowledgebaseCommand {

	static openKnowledgebaseCommand = "SiemContentEditor.openKnowledgebaseCommand";

	public async execute() {

		const showOpenDialogUris = await vscode.window.showOpenDialog({
			canSelectMany: false, 
			canSelectFolders: true
		});

		if(!showOpenDialogUris && showOpenDialogUris.length != 1) {
			return;
		}

		const openKnowledgebaseDirectoryPath = showOpenDialogUris[0].fsPath;

		// Проверка доступности директории.
		if(!fs.existsSync(openKnowledgebaseDirectoryPath)) {
			vscode.window.showErrorMessage(`Папка '${openKnowledgebaseDirectoryPath}' недоступна. Выберите другую папку.`);
			return;
		}

		// Открываем базу знаний.
		VsCodeApiHelper.openFolder(openKnowledgebaseDirectoryPath);
	}
}
