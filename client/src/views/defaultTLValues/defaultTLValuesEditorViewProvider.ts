import * as vscode from 'vscode';
import * as os from 'os';

import { Configuration } from '../../models/configuration';
import { YamlHelper } from '../../helpers/yamlHelper';
import { DialogHelper } from '../../helpers/dialogHelper';

export class DefaultTLValuesEditorViewProvider implements vscode.CustomTextEditorProvider {

	public static register(context: vscode.ExtensionContext, templatePath: string, config: Configuration): vscode.Disposable {
		const provider = new DefaultTLValuesEditorViewProvider(context, templatePath, config);
		const providerRegistration = vscode.window.registerCustomEditorProvider(
			DefaultTLValuesEditorViewProvider.viewType, provider, {
				webviewOptions : {
					enableFindWidget: true
				}
			}
		);
		
		return providerRegistration;
	}

	public static readonly viewType = "xp.default-tl-value-editor";
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
			localResourceRoots: [
				vscode.Uri.joinPath(this.context.extensionUri, 'out'),
				vscode.Uri.joinPath(this.context.extensionUri, "client", "templates", "TableListEditor", "css")
			]
		};
		webviewPanel.webview.html = this._getWebviewContent(webviewPanel.webview);
		webviewPanel.onDidChangeViewState(e => {
			this.currentPanel = e.webviewPanel;
		});
	
		try {
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
				type: 'update_view',
				text: JSON.stringify(data)
			});
		}
	
		// const changeDocumentSubscription = vscode.workspace.onDidChangeTextDocument(e => {
		// 	if (e.document.uri.toString() === document.uri.toString()) {
		// 		updateWebview();
		// 	}
		// });
	
		// webviewPanel.onDidDispose(() => {
		// 	changeDocumentSubscription.dispose();
		// });
	
		webviewPanel.webview.onDidReceiveMessage(e => {
			switch (e.type) {
			case 'update_file':
				{
					const data = YamlHelper.parse(document.getText());
					const yaml = YamlHelper.parse(YamlHelper.jsonToYaml(e.json));

					if(yaml.loc.length != 0){
						data.defaults['LOC'] = yaml['loc'];
					} else {
						delete data.defaults.LOC;
					}
					if (yaml.pt.length != 0) {
						data['defaults']['PT'] = yaml['pt'];
					} else {
						// проверить, что PT не пусто
						delete data.defaults.PT;
					}
					let updatedTableFileContent = YamlHelper.stringify(data);
					// Пустые значения типа value: при сериализации превращаются в value: null из-за чего изменяется всё заполнение ТС.
					// Хорошо это видно по ТС Windows_Hacktools.
					// Чтобы этого избежать подпираем костыликом и меняем нулы на пустоту.
					// TODO: сделать красиво
					updatedTableFileContent = updatedTableFileContent.replace(/: null$/gm, ": ");
					this.updateTextDocument(document, updatedTableFileContent);
					return;
				}
			case 'info':
				DialogHelper.showInfo(e.message);
				return;
			case 'error':
				DialogHelper.showError(e.message);
				return;
			case 'refresh':
				updateWebview();
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
					  <vscode-button id="add-loc-value-button">
						Add new LOC row
					  </vscode-button>
					  <vscode-data-grid id="loc-defs" aria-label="Basic" generate-header="sticky" aria-label="Sticky Header"></vscode-data-grid>
					  <hr>
					<h2>PT:</h2>
					<vscode-button id="add-pt-value-button">
						Add new PT row
					</vscode-button>
					<vscode-data-grid id="pt-defs" aria-label="Basic" generate-header="sticky" aria-label="Sticky Header"></vscode-data-grid>
					<script type="module" nonce="${nonce}" src="${webviewUri}"></script>
					</body>
				  </html>
				`;
	}
}