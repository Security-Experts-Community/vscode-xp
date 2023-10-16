import * as fs from 'fs';
import * as vscode from 'vscode';
import * as path from 'path';

import { DialogHelper } from '../../helpers/dialogHelper';
import { MustacheFormatter } from '../mustacheFormatter';
import { RuleBaseItem } from '../../models/content/ruleBaseItem';
import { Configuration } from '../../models/configuration';

export class TableListsEditorViewProvider {

	public static readonly viewId = 'TableListsEditorView';

	private _view?: vscode.WebviewPanel;
	private _rule: RuleBaseItem;

	constructor(
		private readonly _templatePath: string
	) { }

	public static init(context: Configuration) {

		const templateFilePath = path.join(
			Configuration.get().getExtensionPath(), "client", "templates", "TableListEditor", "html", "TableListEditor.html");

		const provider = new TableListsEditorViewProvider(templateFilePath);

		context.getContext().subscriptions.push(
			vscode.commands.registerCommand(
				TableListsEditorViewProvider.showView,
				async (parentItem: RuleBaseItem) => provider.showView()
			)
		);
	}

	public static showView = "TableListsEditorView.showView";
	public showView() {

		// Если открыта еще одна локализация, то закрываем её перед открытием новой.
		if (this._view) {
			this._view.dispose();
			this._view = undefined;
		}

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

			const config = Configuration.get();
			const resoucesUri = config.getExtensionUri();
			const extensionBaseUri = this._view.webview.asWebviewUri(resoucesUri);

			const webviewUri = this.getUri(this._view.webview, resoucesUri, ["client", "out", "ui.js"]);

			const templatePlainObject = {
				"ExtensionBaseUri": extensionBaseUri,
				"WebviewUri": webviewUri
			};

			// Подгружаем шаблон и шаблонизируем данные.
			const template = fs.readFileSync(this._templatePath).toString();
			const formatter = new MustacheFormatter(template);
			const htmlContent = formatter.format(templatePlainObject);

			this._view.webview.html = htmlContent;
		}
		catch (error) {
			DialogHelper.showError(`Не удалось открыть правила локализации.`, error);
		}
	}

	async receiveMessageFromWebView(message: any) {
		switch (message.command) {
			case 'qwerty': {
				break;
			}
		}
	}

	private getUri(webview: vscode.Webview, extensionUri: vscode.Uri, pathList: string[]) {
		return webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, ...pathList));
	}
}