import { XpExtentionException } from '../models/xpException';
import { ExtensionHelper } from './extensionHelper';

export class ExceptionHelper {
	public static async show(error: Error, userInfo?: string) {
		const errorType = error.constructor.name;

		switch(errorType)  {
			case "XpExtentionException" : 
			case "FileNotFoundException" : 
			case "IncorrectFieldFillingException" :  {
				const typedError = error as XpExtentionException;
				return ExtensionHelper.showError(typedError.message, error);
			}
			default: {
				if(userInfo) {
					return ExtensionHelper.showError(userInfo, error);
				}
				return ExtensionHelper.showError("Неожиданная ошибка, обратитесь к разработчикам.", error);
			}
		}
	}
}