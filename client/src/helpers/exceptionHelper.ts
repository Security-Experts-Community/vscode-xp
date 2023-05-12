import { FileNotFoundException } from '../models/fileNotFoundException';
import { XpException } from '../models/xpException';
import { IncorrectFieldFillingException } from '../views/incorrectFieldFillingException';
import { ExtensionHelper } from './extensionHelper';

export class ExceptionHelper {
	public static async show(error: Error, userInfo?: string) {
		const errorType = error.constructor.name;

		switch(errorType)  {
			case XpException.name : 
			case FileNotFoundException.name : 
			case IncorrectFieldFillingException.name :  {
				const typedError = error as XpException;
				return ExtensionHelper.showError(typedError.message, error);
			}
			default: {
				if(userInfo) {
					return ExtensionHelper.showError(userInfo, error);
				}
				return ExtensionHelper.showError(
					"Внутренняя ошибка расширения. Повторите действие или [обратитесь к разработчикам](https://github.com/Security-Experts-Community/vscode-xp/issues/new?assignees=&labels=bug&template=form_for_bugs.yml&title=%5BBUG%5D)",
					error);
			}
		}
	}
}
