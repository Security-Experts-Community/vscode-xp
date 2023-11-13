import * as fs from 'fs';
import * as vscode from 'vscode';
import * as path from 'path';

import { Configuration } from '../models/configuration';
import { RuleBaseItem } from '../models/content/ruleBaseItem';
import { XpException } from '../models/xpException';
import { MustacheFormatter } from './mustacheFormatter';
import { ExceptionHelper } from '../helpers/exceptionHelper';
import { Log } from '../extension';
import { LogErrorCommand } from './webViewCommands';

export interface WebViewDescriptor {
	viewId: string;
	viewTitle: string;
	config: Configuration;
	templatePath: string;
	webViewOptions: vscode.WebviewPanelOptions | vscode.WebviewOptions;
}

export class WebViewMessage {
	cmdName: string;
	message: string;
	params?: unknown;
}

export abstract class BaseWebViewController {

	constructor(protected _descriptor : WebViewDescriptor) { }

	protected async showDefault() {

		// Если открыта еще одна локализация, то закрываем её перед открытием новой.
		if (this._view) {
			this._view.dispose();
			this._view = undefined;
		}

		try {
			// Создать и показать панель.
			this._view = vscode.window.createWebviewPanel(
				this._descriptor.viewId,
				this._descriptor.viewTitle,
				vscode.ViewColumn.One,
				this._descriptor.webViewOptions
			);

			this._view.webview.onDidReceiveMessage(
				this.receiveMessageFromWebViewDefault,
				this
			);

			this._view.webview.html = await this.getHtml();
		}
		catch (error) {
			ExceptionHelper.show(error, `Не удалось открыть ${this._descriptor.viewTitle}`);
		}
	}

	/**
	 * Обработчик команд от webView
	 * @param message 
	 */
	protected abstract receiveMessageFromWebView(message: WebViewMessage) : Promise<void>

	/**
	 * Получает вёрстку для отображения webView
	 */
	protected abstract getHtml() : string;

	/**
	 * Выполняется перед отображением вьюшки.
	 */
	protected abstract preShow() : Promise<void>;

	public async show() : Promise<void> {
		await this.preShow();
		await this.showDefault();
		return;
	}

	protected async receiveMessageFromWebViewDefault(message: WebViewMessage) {

		if (message == null) return;

		switch (message.cmdName) {
			case LogErrorCommand.name: {
				const cmd = new LogErrorCommand(message);
				cmd.execute(this);
				break;
			}
			// case 'log.warn': {
			// 	Log.warn(message.message);
			// 	break;
			// }
			// case 'log.info': {
			// 	Log.info(message.message);
			// 	break;
			// }
			default: {
				this.receiveMessageFromWebView(message);
			}
		}
	}

	public get view() {
		return this._view;
	}

	private _view?: vscode.WebviewPanel;
	public static END_OF_LINE = "\n";
}



