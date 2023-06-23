import * as vscode from 'vscode';

import { FileSystemException } from '../models/fileSystemException';
import { XpException } from '../models/xpException';
import { IncorrectFieldFillingException } from '../views/incorrectFieldFillingException';
import { ExtensionHelper } from './extensionHelper';
import { Configuration } from '../models/configuration';

export class ExceptionHelper {
	public static async show(error: Error, defaultMessage?: string) {
		const errorType = error.constructor.name;

		switch(errorType)  {
			case XpException.name: 
			case FileSystemException.name: {
				const typedError = error as FileSystemException;

				// Информирование пользователя.
				// const errorString = `Ошибка обращения по пути ${typedError.getPath()}. ${ExceptionHelper.FEEDBACK_WAY_INFO}`;
				vscode.window.showErrorMessage(typedError.message);

				// Детальный вывод
				const outputChannel = Configuration.get().getOutputChannel();
				outputChannel.appendLine(typedError.stack);
				return;
			}
			case IncorrectFieldFillingException.name:  {
				const typedError = error as XpException;
				return ExtensionHelper.showError(typedError.message, error);
			}
			default: {
				if(defaultMessage) {
					vscode.window.showErrorMessage(defaultMessage);
				} else {
					vscode.window.showErrorMessage(`Обнаружена неожиданная ошибка. ${ExceptionHelper.FEEDBACK_WAY_INFO}`);
				}

				ExceptionHelper.showLogStack(error);
			}
		}
	}

	private static showLogStack(error: Error) {
		const outputChannel = Configuration.get().getOutputChannel();
		outputChannel.appendLine(error.stack);
		outputChannel.show();
	}

	public static FEEDBACK_WAY_INFO = 
		"В случае её повторения уточните в [Telegram-канале](https://t.me/s3curity_experts_community/75) или посмотрите в [issues](https://github.com/Security-Experts-Community/vscode-xp/issues/). Если подобная ошибка раньше не встречалась, заведите [баг](https://github.com/Security-Experts-Community/vscode-xp/issues/new?assignees=&labels=bug&template=form_for_bugs.yml&title=%5BBUG%5D)";
}
