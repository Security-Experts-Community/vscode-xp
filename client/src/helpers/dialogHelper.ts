import * as vscode from 'vscode';
import { Log } from '../extension';

export class DialogHelper {
	static async showInfo(message: string, ...params: string[]) : Promise<string> {
		let returnValue: string;
		if(params) {
			returnValue = await vscode.window.showInformationMessage(message, ...params);	
		} else {
			returnValue = await  vscode.window.showInformationMessage(message);
		}
		
		// Пишем в лог
		let showInfoMessage: string;
		if(params) {
			const paramsString = params.filter(p => p).map(p => `"${p}"`).join(", ");
			showInfoMessage = `"${returnValue}" = vscode.window.showInformationMessage("${message}", ${paramsString})`;
		} else {
			showInfoMessage = `vscode.window.showInformationMessage("${message}")`;
		}
		Log.info(showInfoMessage);

		return returnValue;
	}

	static showWarning(message: string): Thenable<string> {
		const showWarningMessage = `vscode.window.showWarningMessage("${message}")`;
		Log.warn(showWarningMessage);
		return vscode.window.showWarningMessage(message);
	}

	static showError(message: string, error?: Error) : Thenable<string> {
		const showErrorMessage = `vscode.window.showErrorMessage("${message}")`;

		if(error) {
			Log.error(showErrorMessage, error);
		} else {
			Log.error(showErrorMessage);
		}

		return vscode.window.showErrorMessage(message);
	}
}