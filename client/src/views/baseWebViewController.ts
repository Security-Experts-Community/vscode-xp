import * as vscode from 'vscode';

import { Configuration } from '../models/configuration';
import { XpException } from '../models/xpException';
import { ExceptionHelper } from '../helpers/exceptionHelper';
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

	protected async showDefault() : Promise<void> {

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

			this._view.onDidDispose( () => {
				this._view = undefined;
			});

			this._view.webview.html = this.getHtml();
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

	protected async receiveMessageFromWebViewDefault(message: WebViewMessage) : Promise<void> {

		if (message == null) return;

		switch (message.cmdName) {
			case "LogErrorCommand": {
				const cmd = new LogErrorCommand(message);
				cmd.execute(this);
				break;
			}
			default: {
				this.receiveMessageFromWebView(message);
			}
		}
	}

	public postMessage(message: any): Thenable<boolean> {
		if(!this._view) {
			throw new XpException("Невозможно отобразить данные в окне, так как оно закрыто. Откройте его заново и повторите операцию");
		}

		return this._view.webview.postMessage(message);
	}

	public get view() : vscode.WebviewPanel {
		return this._view;
	}

	private _view?: vscode.WebviewPanel;
	public static END_OF_LINE = "\n";
}



