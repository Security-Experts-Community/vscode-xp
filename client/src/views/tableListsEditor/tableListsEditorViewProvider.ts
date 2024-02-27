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

	public static DEFAULT_TYPICAL_SIZE = 80000;
	public static DEFAULT_MAX_SIZE = 100000;
	public static DEFAULT_TTL_PER_SEC = 86400;	// Сутки в секундах
}


export class DefaultTLValuesEditorViewProvider implements vscode.CustomTextEditorProvider {

	public static register(context: vscode.ExtensionContext, templatePath: string, config: Configuration): vscode.Disposable {
		const provider = new DefaultTLValuesEditorViewProvider(context, templatePath, config);
		const providerRegistration = vscode.window.registerCustomEditorProvider(DefaultTLValuesEditorViewProvider.viewType, provider);
		// printChannelOutput("ResX Editor custom editor provider registered.", true);
		return providerRegistration;
	}

	private static readonly viewType = "xp.default-tl-value-editor";
	private registered = false;
	private currentPanel: vscode.WebviewPanel | undefined = undefined;

	constructor(
		private readonly context: vscode.ExtensionContext,
		private readonly _templatePath: string,
		private readonly _config: Configuration
	) { }

	resolveCustomTextEditor(
		document: vscode.TextDocument, 
		webviewPanel: vscode.WebviewPanel, 
		token: vscode.CancellationToken): void | Thenable<void> {
		this.currentPanel = webviewPanel;
		webviewPanel.webview.options = {
			enableScripts: true,
			localResourceRoots: [vscode.Uri.joinPath(this.context.extensionUri, 'out'), vscode.Uri.joinPath(this.context.extensionUri, "client", "templates", "TableListEditor", "css")]
		};
		webviewPanel.webview.html = this._getWebviewContent(webviewPanel.webview);
		webviewPanel.onDidChangeViewState(e => {
			this.currentPanel = e.webviewPanel;
		});
	
		try {
			// printChannelOutput(document.uri.toString(), true);
			if (!this.registered) {
			this.registered = true;
			const deleteCommand = vscode.commands.registerCommand("xp.DeleteTLRowCommand", () => {
	
				this.currentPanel?.webview.postMessage({
				type: 'delete'
				});
			});
	
			const addLOCCommand = vscode.commands.registerCommand("xp.AddLOCTLRowCommand", () => {	
				this.currentPanel?.webview.postMessage({
					type: 'add_loc'
				});
			});

			const addPTCommand = vscode.commands.registerCommand("xp.AddPTTLRowCommand", () => {	
				this.currentPanel?.webview.postMessage({
					type: 'add_pt'
				});
			});
	
			this.context.subscriptions.push(deleteCommand);
			this.context.subscriptions.push(addLOCCommand);
			this.context.subscriptions.push(addPTCommand);
			}
		}
		catch (e) {
			console.log(e);
		}

		function getFields(object) {
			return object['fields'].map((f) => (Object.keys(f)[0])).filter((f) => (f != 'complex_key'));
		}
	
		async function updateWebview() {
			const json = JSON.parse(YamlHelper.yamlToJson(document.getText()));

			const data = {'fields': getFields(json), 'loc':[], 'pt': [],};

			data['loc'] = json['defaults']['LOC'];
			data['pt']  = json['defaults']['PT'];

			webviewPanel.webview.postMessage({
				type: 'update',
				text: JSON.stringify(data)
			});
		}
	
		const changeDocumentSubscription = vscode.workspace.onDidChangeTextDocument(e => {
			if (e.document.uri.toString() === document.uri.toString()) {
			updateWebview();
			}
		});
	
		webviewPanel.onDidDispose(() => {
			changeDocumentSubscription.dispose();
		});
	
		webviewPanel.webview.onDidReceiveMessage(e => {
			switch (e.type) {
			case 'update':
				{
					const data = YamlHelper.parse(document.getText());
					const yaml = YamlHelper.parse(YamlHelper.jsonToYaml(e.json));

					if(yaml.loc.length != 0){
						data.defaults['LOC'] = yaml['loc'];
					}
					else{
						delete data.defaults.LOC;
					}
					if (yaml.pt.length != 0){
						data['defaults']['PT'] = yaml['pt'];
					}
					else
					{
						// проверить, что PT не пусто
						delete data.defaults.PT;
					}
					this.updateTextDocument(document, YamlHelper.stringify(data));
					return;
				}
			case 'log':
				// printChannelOutput(e.message, true);
				return;
			case 'error':
				// printChannelOutput(e.message, true);
				vscode.window.showErrorMessage(e.message);
				return;
			case 'info':
				// printChannelOutput(e.message, true);
				vscode.window.showInformationMessage(e.message);
				return;
			case 'add_loc':
				vscode.commands.executeCommand("xp.AddLOCTLRowCommand");
				return;
			case 'add_pt':
				vscode.commands.executeCommand("xp.AddPTTLRowCommand");
				return;
			}
		});
	
		updateWebview();
	}

	protected getUri(webview: vscode.Webview, extensionUri: vscode.Uri, pathList: string[]): vscode.Uri {
		return webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, ...pathList));
	}

	private async updateTextDocument(document: vscode.TextDocument, json: any) {

		const edit = new vscode.WorkspaceEdit();

		edit.replace(
			document.uri,
			new vscode.Range(0, 0, document.lineCount, 0),
			json);
		return vscode.workspace.applyEdit(edit);
	}
	

	private getNonce() {
		let text = "";
		const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
		for (let i = 0; i < 32; i++) {
			text += possible.charAt(Math.floor(Math.random() * possible.length));
		}
		return text;
	}

	private _getWebviewContent(webview: vscode.Webview) {
		const resourcesUri = this._config.getExtensionUri();
		const webviewUri = this.getUri(webview, resourcesUri, ["out", "tableListDefaultsEditor.js"]);
		const nonce = this.getNonce();
	
		return /*html*/ `
				  <!DOCTYPE html>
				  <html lang="en">
					<head>
					  <meta charset="UTF-8">
					  <meta name="viewport" content="width=device-width, initial-scale=1.0">
					  <meta
						http-equiv="Content-Security-Policy"
						content="default-src 'none'; img-src ${webview.cspSource} https:; script-src 'nonce-${nonce}'; style-src ${webview.cspSource} 'nonce-${nonce}'; style-src-elem ${webview.cspSource} 'unsafe-inline'; font-src ${webview.cspSource};"
					  />
					</head>
					<body>
					  <h2>LOC:</h2>
					  <vscode-data-grid id="loc-defs" aria-label="Basic" generate-header="sticky" aria-label="Sticky Header"></vscode-data-grid>
					  <vscode-button id="add-loc-value-button">
						Add new LOC row
					  </vscode-button>
					  <hr>
					<h2>PT:</h2>
					<vscode-data-grid id="pt-defs" aria-label="Basic" generate-header="sticky" aria-label="Sticky Header"></vscode-data-grid>
					<vscode-button id="add-pt-value-button">
						Add new PT row
					  </vscode-button>
					  <script type="module" nonce="${nonce}" src="${webviewUri}"></script>
					</body>
				  </html>
				`;
	}
}