import * as vscode from 'vscode';

import { FileSystemException } from '../models/fileSystemException';
import { XpException } from '../models/xpException';
import { IncorrectFieldFillingException } from '../views/incorrectFieldFillingException';
import { Log } from '../extension';
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

				Log.error(typedError.message, typedError);
				vscode.window.showErrorMessage(typedError.message);
				ExceptionHelper.recursiveWriteXpExceptionToOutput(typedError, outputChannel);
				break;
			}
			default: {
				if(defaultMessage) {
					if(defaultMessage.endsWith(".")) {
						vscode.window.showErrorMessage(`${defaultMessage} ${ExceptionHelper.FEEDBACK_WAY_INFO}`);
					}
					else {
						vscode.window.showErrorMessage(`${defaultMessage}. ${ExceptionHelper.FEEDBACK_WAY_INFO}`);
					}
					
				} else {
					vscode.window.showErrorMessage(`Обнаружена неожиданная ошибка. ${ExceptionHelper.FEEDBACK_WAY_INFO}`);
				}

				// Пишем stack в output.
				Log.error(error.message, error);
				outputChannel.show();
			}
		}
	}

	private static recursiveWriteXpExceptionToOutput(error: XpException|Error, outputChannel: vscode.OutputChannel) {

		// Есть вложенные исключения.
		if(error instanceof XpException && error.getInnerException()) {
			// Пишем текущие исключение.
			Log.error(error.message, error);

			// Пишем вложенное.
			ExceptionHelper.recursiveWriteXpExceptionToOutput(error.getInnerException(), outputChannel);
		} else {
			Log.error(error.message, error);
		}
	}

	public static FEEDBACK_WAY_INFO = 
		"В случае её повторения проверьте наличие соответствующего [issue](https://github.com/Security-Experts-Community/vscode-xp/issues/). Если подобная ошибка раньше не встречалась, заведите [баг](https://github.com/Security-Experts-Community/vscode-xp/issues/new?assignees=&labels=bug&template=form_for_bugs.yml&title=%5BBUG%5D) и приложите логи из окна Output. Любые вопросы также можно обсудить [Telegram-канале](https://t.me/s3curity_experts_community/75)";
}
