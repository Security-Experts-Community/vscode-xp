import * as fs from 'fs';
import * as vscode from 'vscode';

import { DialogHelper } from '../../../helpers/dialogHelper';
import { VsCodeApiHelper } from '../../../helpers/vsCodeApiHelper';
import { YamlHelper } from '../../../helpers/yamlHelper';
import { Configuration } from '../../../models/configuration';
import { FileSystemHelper } from '../../../helpers/fileSystemHelper';
import { ViewCommand } from './viewCommand';
import { Table } from '../../../models/content/table';
import { Log } from '../../../extension';

export class OpenTableDefaultsCommand extends ViewCommand {

	constructor(private config: Configuration, private table: Table) {
		super();
	}

	public async execute() : Promise<void> {

		let tableFileContent = "";
		let tableUri: vscode.Uri;
		if(this.table) {
			const tableFilePath = this.table.getFilePath();
			if(fs.existsSync(tableFilePath)) {
				tableFileContent = await FileSystemHelper.readContentFile(tableFilePath);
				tableUri = vscode.Uri.file(tableFilePath);
			}
		} else {
			const editor = vscode?.window?.activeTextEditor;
			if (!editor) {
				Log.warn(`Команда открытия табличного списка была вызвана некорректно`);
				return;
			}

			const fileName = editor?.document?.fileName;
			if (!fileName || fileName.endsWith(".tl")) {
				DialogHelper.showError(`Нельзя открыть файл ${fileName} с как табличный список, из-за отличия его расширения файла`);
				return;
			}
			
			tableFileContent = editor.document.getText();
			tableUri = editor.document.uri;
		}

		const yamlObject = YamlHelper.parse(tableFileContent);
		if(yamlObject?.fillType !== 'Registry') {
			DialogHelper.showError(`Для данного типа табличных списков не поддерживается значения по умолчанию`);
		}

		VsCodeApiHelper.openWith(
			tableUri, 
			// TODO: Вынести в переменную.
			"xp.default-tl-value-editor", {
				preview: true
			}
		);
	}
}