import * as fs from 'fs';
import * as path from 'path';

import { KbHelper } from '../helpers/kbHelper';
import { ContentTreeBaseItem } from './content/contentTreeBaseItem';
import { Configuration } from './configuration';


export class NameValidator {
	public static validate(name: string, parentItem: ContentTreeBaseItem, config: Configuration) : string {
		const trimmed = name.trim();

		if(trimmed === '') {
			return config.getMessage("EmptyName");
		}
		
		// Корректность имени директории с точки зрения ОС.
		// Английский язык
		const englishAlphabet = /^[a-zA-Z0-9_]*$/;
		if(trimmed.includes(">") 	||
			trimmed.includes("<") 	||
			trimmed.includes(":") 	||
			trimmed.includes("\"") 	||
			trimmed.includes("/") 	||
			trimmed.includes("|") 	||
			trimmed.includes("?") 	||
			trimmed.includes("*")   || 
			!englishAlphabet.test(trimmed)
		)
			return config.getMessage("NameContainsInvalidCharacters");

		// Не используем штатные директории контента.
		const contentSubDirectories = KbHelper.getContentSubDirectories();
		if(contentSubDirectories.includes(trimmed))
			return config.getMessage("NameReserved");

		// Невозможность создать уже созданную директорию.
		const newFolderPath = path.join(parentItem.getParentPath(), trimmed);
		if(fs.existsSync(newFolderPath))
			return config.getMessage("AlreadyExists");
	}
}