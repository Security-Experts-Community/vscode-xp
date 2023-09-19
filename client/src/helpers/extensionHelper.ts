import * as vscode from 'vscode';
import { Log } from '../extension';

export class ExtensionHelper {
	static showInfo(message: string) : Thenable<string> {
		const showInfoMessage = `vscode.window.showInformationMessage("${message}")`;

		Log.info(showInfoMessage);
		return vscode.window.showInformationMessage(message);
	}

	static showWarning(message: string): Thenable<string> {
		const showWarningMessage = `vscode.window.showWarningMessage("${message}")`;

		Log.warn(showWarningMessage);
		return vscode.window.showWarningMessage(message);
	}

	static showError(message: string, error?: Error) : Thenable<string> {
		const showErrorMessage = `vscode.window.showErrorMessage("${message}")`;

		if(error) {
			Log.error(error, showErrorMessage);
		} else {
			Log.error(null, showErrorMessage);
		}

		
		return vscode.window.showErrorMessage(message);
	}
}