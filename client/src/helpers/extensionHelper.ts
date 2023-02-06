import * as vscode from 'vscode';
import { Configuration } from '../models/configuration';

export class ExtensionHelper {
	static getExtentionPath(): string {
		const config = Configuration.get();
		return config.getExtentionPath();
	}

	/**
	 * Получить путь к открытому файлу
	 * @returns путь к открытому файлу или undefined
	 */
	public static getOpenedFilePath() : string {
		const openedFilePath = vscode.window.activeTextEditor?.document?.fileName;
		return openedFilePath;
	}

	static showErrorAndThrowError(errorMessage:string) {
		vscode.window.showErrorMessage(errorMessage);
		throw new Error(errorMessage);
	}

	static showUserInfo(infoMessage:string) : Thenable<string> {
		return vscode.window.showInformationMessage(infoMessage);
	}

	static showWarning(message:string) {
		vscode.window.showWarningMessage(message);
	}

	static showUserError(infoMessage:string) : Thenable<string> {
		return vscode.window.showErrorMessage(infoMessage);
	}

	static showError(userMessage: string, error: Error) {
		vscode.window.showErrorMessage(userMessage);
		
		console.log(error.message);
		console.log(error.stack);
	}
}