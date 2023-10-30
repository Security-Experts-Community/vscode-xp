import * as vscode from 'vscode';

export abstract class WebViewProviderBase {
	public abstract postMessage(message: any): Thenable<boolean>;
	protected getUri(webview: vscode.Webview, extensionUri: vscode.Uri, pathList: string[]): vscode.Uri {
		return webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, ...pathList));
	}
}