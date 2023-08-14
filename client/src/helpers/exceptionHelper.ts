import * as vscode from 'vscode';

import { FileSystemException } from '../models/fileSystemException';
import { XpException } from '../models/xpException';
import { IncorrectFieldFillingException } from '../views/incorrectFieldFillingException';
import { ExtensionHelper } from './extensionHelper';
import { Configuration } from '../models/configuration';
import { OperationCanceledException } from 'typescript';

export class ExceptionHelper {
	public static async show(error: Error, defaultMessage?: string) {
		const errorType = error.constructor.name;
		const outputChannel = Configuration.get().getOutputChannel();

		switch(errorType)  {
			case XpException.name: 
			case FileSystemException.name: 
			case IncorrectFieldFillingException.name: 
			case OperationCanceledException.name: {
				const typedError = error as XpException;

				vscode.window.showErrorMessage(typedError.message);
				ExceptionHelper.recursiveWriteXpExceptionToOutput(typedError, outputChannel);
				break;
			}
			default: {
				if(defaultMessage) {
					vscode.window.showErrorMessage(defaultMessage);
				} else {
					vscode.window.showErrorMessage(`Обнаружена неожиданная ошибка. ${ExceptionHelper.FEEDBACK_WAY_INFO}`);
				}

				// Пишем stack в output.
				outputChannel.appendLine(error.stack);
				outputChannel.show();
			}
		}
	}

	private static recursiveWriteXpExceptionToOutput(error: XpException|Error, outputChannel: vscode.OutputChannel) {
		outputChannel.appendLine(error.stack);
		if(error instanceof XpException && error.getInnerException()) {
			// Пишем в Output.
			ExceptionHelper.recursiveWriteXpExceptionToOutput(error.getInnerException(), outputChannel);
		} else {
			outputChannel.appendLine(error.stack);
		}

		// Пишем в браузерный лог.
		console.log(error.message);
		console.log(error.stack);
	}

	public static FEEDBACK_WAY_INFO = 
		"В случае её повторения уточните в [Telegram-канале](https://t.me/s3curity_experts_community/75) или посмотрите в [issues](https://github.com/Security-Experts-Community/vscode-xp/issues/). Если подобная ошибка раньше не встречалась, заведите [баг](https://github.com/Security-Experts-Community/vscode-xp/issues/new?assignees=&labels=bug&template=form_for_bugs.yml&title=%5BBUG%5D)";
}
