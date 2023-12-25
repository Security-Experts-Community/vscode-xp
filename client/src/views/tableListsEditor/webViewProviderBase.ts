import * as vscode from 'vscode';
import { XpException } from '../../models/xpException';

export abstract class WebViewProviderBase {
	protected setView(panel: vscode.WebviewPanel) : void {
		this.panel = panel;
	}

	protected setHtmlContent(content: string): void {
		this.panel.webview.html = content;
	}

	protected getView(): vscode.WebviewPanel {
		return this.panel;
	}

	public postMessage(message: any): Thenable<boolean> {
		if(!this.panel) {
			throw new XpException("Отправка сообщения невозможна, так как не задано обязательно свойство panel");
		}

		return this.panel.webview.postMessage(message);
	}

	protected getUri(webview: vscode.Webview, extensionUri: vscode.Uri, pathList: string[]): vscode.Uri {
		return webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, ...pathList));
	}

	private panel: vscode.WebviewPanel;
}