import * as vscode from 'vscode';

import { FileSystemException } from '../models/fileSystemException';
import { XpException } from '../models/xpException';
import { IncorrectFieldFillingException } from '../views/incorrectFieldFillingException';
import { ExtensionHelper } from './extensionHelper';
import { Configuration } from '../models/configuration';

export class ExceptionHelper {
	public static async show(error: Error, userInfo?: string) {
		const errorType = error.constructor.name;

		switch(errorType)  {
			case XpException.name : 
			case FileSystemException.name : {
				const typedError = error as FileSystemException;

				// Информирование пользователя.
				// const errorString = `Ошибка обращения по пути ${typedError.getPath()}. ${ExceptionHelper.FEEDBACK_WAY_INFO}`;
				vscode.window.showErrorMessage(typedError.message);

				// Детальный вывод
				const outputChannel = Configuration.get().getOutputChannel();
				outputChannel.appendLine(typedError.stack);
				return;
			}
			case IncorrectFieldFillingException.name :  {
				const typedError = error as XpException;
				return ExtensionHelper.showError(typedError.message, error);
			}
			default: {
				if(userInfo) {
					return ExtensionHelper.showError(userInfo, error);
				}
				return ExtensionHelper.showError(
					`Внутренняя ошибка расширения. ${ExceptionHelper.FEEDBACK_WAY_INFO}`,
					error);
			}
		}
	}

	public static FEEDBACK_WAY_INFO = 
		"Повторите действие или [обратитесь к разработчикам](https://github.com/Security-Experts-Community/vscode-xp/issues/new?assignees=&labels=bug&template=form_for_bugs.yml&title=%5BBUG%5D)";
}
