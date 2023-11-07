import * as vscode from 'vscode';
import * as path from 'path';

import { DialogHelper } from '../../helpers/dialogHelper';
import { MustacheFormatter } from '../mustacheFormatter';
import { Configuration } from '../../models/configuration';
import { Table, TableListType } from '../../models/content/table';
import { FileSystemHelper } from '../../helpers/fileSystemHelper';
import { DocumentIsReadyCommand } from './commands/documentIsReadyCommand';
import { WebViewProviderBase } from './webViewProviderBase';
import { SaveTableListCommand } from './commands/saveTableListCommand';
import { TableListMessage, TableView } from './commands/tableListCommandBase';
import { YamlHelper } from '../../helpers/yamlHelper';
import { ContentFolder } from '../../models/content/contentFolder';
import { ExceptionHelper } from '../../helpers/exceptionHelper';


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
		config.getContext().subscriptions.push(
			vscode.commands.registerCommand(
				TableListsEditorViewProvider.createTableList,
				async (parentItem: ContentFolder) => provider.createTableList(parentItem)
			)
		);
	}

	public static showView = "TableListsEditorView.showView";
	public static createTableList = "TableListsEditorView.createTableList";

	public async createTableList(parentFolder: ContentFolder): Promise<void> {
		// Сбрасываем состояние вьюшки.
		this._parentItem = parentFolder;
		this._table = undefined;

		try {
			await this.createView();
		}
		catch (error) {
			DialogHelper.showError(`Не удалось открыть табличный список`, error);
		}
	}

	public async showView(table: Table): Promise<void> {
		// Сбрасываем состояние вьюшки.
		this._parentItem = undefined;
		this._table = table;

		try {
			await this.createView();

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

	private async createView() {
		if (this._view) {
			this._view.dispose();
			this._view = undefined;
		}

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
	}

	private async receiveMessageFromWebView(message: TableListMessage): Promise<boolean> {
		try {
			await this.executeCommand(message);
			return true;
		}
		catch (error) {
			ExceptionHelper.show(error);
			return false;
		}
	}

	private async executeCommand(message: TableListMessage) {
		switch (message.command) {
			case DocumentIsReadyCommand.commandName: {
				const command = new DocumentIsReadyCommand();
				command.processMessage(message);
				return command.execute(this);
			}
			case SaveTableListCommand.commandName: {
				const command = new SaveTableListCommand();
				command.processMessage(message);
				return command.execute(this);
			}
			default: {
				DialogHelper.showInfo("Поддерживается только тип справочник. Отлеживать задачи по расширению поддержки можно [тут](https://github.com/Security-Experts-Community/vscode-xp/issues/)");
			}
		}
	}

	public postMessage(message: TableListMessage): Thenable<boolean> {
		return this._view.webview.postMessage(message);
	}

	public getTable(): Table {
		return this._table;
	}

	public getParentItem(): ContentFolder {
		return this._parentItem;
	}

	private _table: Table;
	private _parentItem: ContentFolder;
	private _view?: vscode.WebviewPanel;
}