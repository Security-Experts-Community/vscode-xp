import * as path from "path";

import { RuleBaseItem } from './ruleBaseItem';
import { MetaInfo } from '../metaInfo/metaInfo';
import { Localization } from './localization';
import { ExtensionHelper } from '../../helpers/extensionHelper';
import { ContentTreeProvider } from '../../views/contentTree/contentTreeProvider';


export class Normalization extends RuleBaseItem {
	public rename(newName: string): Promise<void> {
		throw new Error('Method not implemented.');
	}

	public async save(fullPath: string): Promise<void> {
		throw new Error('Method not implemented.');
	}

	protected _name: string;

	// Поля, которые не являются полями объектов (не попадают в xml-файл)
	protected _directoryPath: string;
	protected _normalizationPath: string;

	private constructor(name: string, parentDirectoryPath?: string) {
		super(name, parentDirectoryPath);
		this.setRuleFileName("formula.xp");
	}

	public static async parseFromDirectory(directoryPath: string, fileName?: string): Promise<Normalization> {

		// Получаем имя корреляции и родительский путь.
		const name = path.basename(directoryPath);
		const parentDirectoryPath = path.dirname(directoryPath);

		const normalization = new Normalization(name, parentDirectoryPath);

		// Если явно указано имя файла, то сохраняем его.
		// Иначе используем заданное в конструкторе
		if (fileName) {
			normalization.setRuleFileName(fileName);
		}

		// Парсим основные метаданные.
		const metaInfo = MetaInfo.fromFile(directoryPath);
		normalization.setMetaInfo(metaInfo);

		// Парсим описания на разных языках.
		const ruDescription = await Localization.parseRuDescription(directoryPath);
		normalization.setRuDescription(ruDescription);

		const enDescription = await Localization.parseEnDescription(directoryPath);
		normalization.setEnDescription(enDescription);

		const localization = Localization.parseFromDirectory(directoryPath);
		normalization.updateLocalizations(localization);

		// Добавляем команду, которая пробрасываем параметром саму рубрику.
		normalization.setCommand({
			command: ContentTreeProvider.onRuleClickCommand,
			title: "Open File",
			arguments: [normalization]
		});

		return normalization;
	}

	iconPath = {
		light: path.join(ExtensionHelper.getExtentionPath(), 'resources', 'light', 'rule.svg'),
		dark: path.join(ExtensionHelper.getExtentionPath(), 'resources', 'dark', 'rule.svg')
	};

	contextValue = 'Normalization';
}