import * as fs from 'fs';
import * as vscode from 'vscode';
import * as path from 'path';

import { ExtensionHelper } from '../../helpers/extensionHelper';
import { MustacheFormatter } from '../mustacheFormatter';
import { RuleBaseItem } from '../../models/content/ruleBaseItem';
import { Configuration } from '../../models/configuration';

export class TableListsEditorViewProvider  {

	public static readonly viewId = 'TableListsEditorView';
	
	private _view?: vscode.WebviewPanel;
	private _rule: RuleBaseItem;

	constructor(
		private readonly _templatePath: string
	) { }

	public static init(context: Configuration) {

		const templateFilePath = path.join(
			Configuration.get().getExtensionPath(), "client", "templates", "TableListEditor.html");

		const provider = new TableListsEditorViewProvider(templateFilePath);
	
		context.getContext().subscriptions.push(
			vscode.commands.registerCommand(
				TableListsEditorViewProvider.showView, 
				async (parentItem: RuleBaseItem) => provider.showView()
			)
		);	
	}

	public static showView = "TableListsEditorView.showView";
	public showView()  {

		// Если открыта еще одна локализация, то закрываем её перед открытием новой.
		if(this._view) {
			this._view.dispose();
			this._view = undefined;
		}

		try {
			// Создать и показать панель.
			this._view = vscode.window.createWebviewPanel(
				TableListsEditorViewProvider.viewId,
				'Редактирование табличного списка',
				vscode.ViewColumn.One,
				{retainContextWhenHidden : true});

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
			
			const templatePlainObject = {
				"ExtensionBaseUri" : extensionBaseUri
			};

			// Подгружаем шаблон и шаблонизируем данные.
			const template = fs.readFileSync(this._templatePath).toString();
			const formatter = new MustacheFormatter(template);
			const htmlContent = formatter.format(templatePlainObject);

			this._view.webview.html = htmlContent;
		}
		catch(error) {
			ExtensionHelper.showUserError(`Не удалось открыть правила локализации. ${error.message}`);
		}
	}

	async receiveMessageFromWebView(message: any) {
		switch (message.command) {
			case 'qwerty': {
				break;
			}
		}
	}
}