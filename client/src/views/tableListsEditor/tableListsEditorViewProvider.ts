import * as fs from 'fs';
import * as vscode from 'vscode';
import * as path from 'path';

import { DialogHelper } from '../../helpers/dialogHelper';
import { MustacheFormatter } from '../mustacheFormatter';
import { Configuration } from '../../models/configuration';
import { Table } from '../../models/content/table';
import { FileSystemHelper } from '../../helpers/fileSystemHelper';
import { YamlHelper } from '../../helpers/yamlHelper';

export class TableListMessage {
	command: string;
	data?: string;
}
export class TableListsEditorViewProvider {

	public static readonly viewId = 'TableListsEditorView';

	constructor(
		private readonly _templatePath: string,
		private readonly _config: Configuration
	) { }

	public static init(config: Configuration): void {

		const templateFilePath = path.join(
			config.getExtensionPath(), "client", "templates", "TableListEditor", "html", "TableListEditor.html");

		const provider = new TableListsEditorViewProvider(templateFilePath, config);

		config.getContext().subscriptions.push(
			vscode.commands.registerCommand(
				TableListsEditorViewProvider.showView,
				async (tableItem: Table) => provider.showView(tableItem)
			)
		);
	}

	public static showView = "TableListsEditorView.showView";
	public async showView(table: Table): Promise<void> {

		// Если открыта еще одна локализация, то закрываем её перед открытием новой.
		if (this._view) {
			this._view.dispose();
			this._view = undefined;
		}

		this._table = table;

		try {
			// Создать и показать панель.
			this._view = vscode.window.createWebviewPanel(
				TableListsEditorViewProvider.viewId,
				'Редактирование табличного списка',
				vscode.ViewColumn.One,
				{ retainContextWhenHidden: true });

			this._view.webview.options = {
				enableScripts: true
			};

			this._view.webview.onDidReceiveMessage(
				this.receiveMessageFromWebView,
				this
			);

			const resourcesUri = this._config.getExtensionUri();
			const extensionBaseUri = this._view.webview.asWebviewUri(resourcesUri);

			const webviewUri = this.getUri(this._view.webview, resourcesUri, ["client", "out", "ui.js"]);

			const templatePlainObject = {
				"ExtensionBaseUri": extensionBaseUri,
				"WebviewUri": webviewUri
			};

			// Подгружаем шаблон и шаблонизируем данные.
			const template = await FileSystemHelper.readContentFile(this._templatePath);
			const formatter = new MustacheFormatter(template);
			const htmlContent = formatter.format(templatePlainObject);

			this._view.webview.html = htmlContent;

			// setTimeout(() => this.receiveMessageFromWebView({ command: "documentIsReady" }), 1000,);
		}
		catch (error) {
			DialogHelper.showError(`Не удалось открыть правила локализации.`, error);
		}
	}

	private async receiveMessageFromWebView(message: TableListMessage): Promise<boolean> {
		switch (message.command) {
			case 'documentIsReady': {
				const result = await this.documentIsReady();
				return result;
			}
		}
	}

	private async documentIsReady(): Promise<boolean> {
		const tableFullPath = this._table.getFilePath();
		const tableContent = await FileSystemHelper.readContentFile(tableFullPath);
		const tableObject = YamlHelper.parse(tableContent);
		const tableJson = JSON.stringify(tableObject);

		return this.postMessage({
			command: "setViewContent",
			data: tableJson
		});
	}

	private postMessage(message: TableListMessage): Thenable<boolean> {
		return this._view.webview.postMessage(message);
	}

	private getUri(webview: vscode.Webview, extensionUri: vscode.Uri, pathList: string[]) {
		return webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, ...pathList));
	}

	private _table: Table;
	private _view?: vscode.WebviewPanel;
}