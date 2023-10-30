import * as vscode from 'vscode';
import * as path from 'path';

import { DialogHelper } from '../../helpers/dialogHelper';
import { MustacheFormatter } from '../mustacheFormatter';
import { Configuration } from '../../models/configuration';
import { Table } from '../../models/content/table';
import { FileSystemHelper } from '../../helpers/fileSystemHelper';
import { DocumentIsReadyCommand } from './commands/documentIsReadyCommand';
import { WebViewProviderBase } from './webViewProviderBase';
import { SaveTableListCommand } from './commands/saveTableListCommand';
import { TableListMessage } from './commands/tableListCommandBase';


export class TableListsEditorViewProvider extends WebViewProviderBase {

	public static readonly viewId = 'TableListsEditorView';

	constructor(
		private readonly _templatePath: string,
		private readonly _config: Configuration
	) {
		super();
	}

	public static init(config: Configuration): void {

		const templateFilePath = path.join(
			config.getExtensionPath(),
			"client", "templates", "TableListEditor", "html", "TableListEditor.html"
		);

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

			// TODO: отладочный код
			// setTimeout(() => this.receiveMessageFromWebView({ command: "documentIsReady" }), 1000);
			// setTimeout(() => this.receiveMessageFromWebView({ command: "saveTableList", data:
			// `{
			// 	"name": "RolesAndCorrelation",
			// 	"fillType": "Registry",
			// 	"type": 1,
			// 	"userCanEditContent": true,
			// 	"fields": [
			// 		{
			// 			"role": {
			// 				"index": false,
			// 				"nullable": false,
			// 				"primaryKey": true,
			// 				"type": "String",
			// 				"unique": false
			// 			}
			// 		},
			// 		{
			// 			"correlation": {
			// 				"index": true,
			// 				"nullable": false,
			// 				"primaryKey": true,
			// 				"type": "String",
			// 				"unique": false
			// 			}
			// 		}
			// 	],
			// 	"metainfo": {
			// 		"ruDescription": "Описание на русском языке",
			// 		"enDescription": "English description",
			// 		"objectId": "LOC-TL-1234"
			// 	}
			// }`
			// }), 1000);

		}
		catch (error) {
			DialogHelper.showError(`Не удалось открыть табличный список`, error);
		}
	}

	private async receiveMessageFromWebView(message: TableListMessage): Promise<boolean> {
		switch (message.command) {
			case DocumentIsReadyCommand.commandName: {
				const command = new DocumentIsReadyCommand(this._table);
				command.processMessage(message);
				return command.execute(this);
			}
			case SaveTableListCommand.commandName: {
				const command = new SaveTableListCommand(this._table);
				command.processMessage(message);
				return command.execute(this);
			}
		}
	}

	public postMessage(message: TableListMessage): Thenable<boolean> {
		return this._view.webview.postMessage(message);
	}

	private getUri(webview: vscode.Webview, extensionUri: vscode.Uri, pathList: string[]) {
		return webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, ...pathList));
	}

	private async tableToViewJson(): Promise<string> {
		// TODO: переделать иерархию контента для внесения данный функциональности внутрь Table
		const tableFullPath = this._table.getFilePath();
		const tableContent = await FileSystemHelper.readContentFile(tableFullPath);
		const tableObject = YamlHelper.parse(tableContent);

		tableObject["metainfo"] = {
			"ruDescription": this._table.getRuDescription(),
			"enDescription": this._table.getEnDescription(),
			"objectId": this._table.getMetaInfo().getObjectId()
		};

		// Добавляем описание
		const tableJson = JSON.stringify(tableObject);
		return tableJson;
	}

	private _table: Table;
	private _view?: vscode.WebviewPanel;
}