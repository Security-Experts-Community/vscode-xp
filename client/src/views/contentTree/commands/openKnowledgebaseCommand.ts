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

		const openClassifierDirectoryPath = showOpenDialogUris[0].fsPath;

		// Проверка доступности директории.
		if(!fs.existsSync(openClassifierDirectoryPath)) {
			vscode.window.showErrorMessage(`Папка '${openClassifierDirectoryPath}' недоступна. Выберите другую папку.`);
			return;
		}

		// Проверка минимального количества нужных файлов. 
		// const packagesDirPath = path.join(openClassifierDirectoryPath, "packages");
		// if(!fs.existsSync(packagesDirPath)) {
		// 	vscode.window.showErrorMessage(`В выбранной директории отсутствует поддериктория packages. Директория контента выбрана неправильно или повреждена.`);
		// 	return;
		// }

		// Открываем базу знаний.
		VsCodeApiHelper.openFolder(openClassifierDirectoryPath);
	}
}
