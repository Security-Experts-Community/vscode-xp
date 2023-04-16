import * as path from "path";
import * as fs from 'fs';

import { MetaInfoEventDescription } from '../metaInfo/metaInfoEventDescription';
import { FileSystemHelper } from '../../helpers/fileSystemHelper';
import { YamlHelper } from '../../helpers/yamlHelper';
import { MetaInfo } from '../metaInfo/metaInfo';

export enum LocalizationLanguage{
	Ru = 1,
	En
}

export class Localization {

	private constructor() {
		//
	}

	public setRuDescription(description: string ) {
		this._ruDescription = description;
	}

	public getRuDescription() {
		return this._ruDescription;
	}

	public setEnDescription(description: string ) {
		this._enDescription = description;
	}

	public getEnDescription() {
		return this._enDescription;
	}

	public setCriteria(criteria : string) : void {
		this._criteria = criteria;
	}

	public getCriteria() : string{
		return this._criteria;
	}

	public setLocalizationId(localizationId : string) : void {
		this._localizationId = localizationId;
	}

	public getLocalizationId() : string {
		return this._localizationId;
	}

	public setRuLocalizationText(localization: string ) : void {
		this._ruLocalizationText = localization;
	}

	public setEnLocalizationText(localization: string ) : void {
		this._enLocalizationText = localization;
	}

	public getEnLocalizationText() : string {
		return this._enLocalizationText;
	}

	public getRuLocalizationText() : string {
		return this._ruLocalizationText;
	}

	public static parseFromDirectory(ruleDirectoryPath: string) : Localization[] {

		// Читаем русские локализации.
		const ruLocFilePath = path.join(ruleDirectoryPath, Localization.LOCALIZATIONS_DIRNAME, Localization.RU_LOCALIZATION_FILENAME);
		if(!fs.existsSync(ruLocFilePath)) {
			return [];
		}

		const ruLocContant = fs.readFileSync(ruLocFilePath, 'utf8');
		const ruLocObject = YamlHelper.parse(ruLocContant);
		const ruEventDescriptionsObject = ruLocObject.EventDescriptions as any[];
		const ruDescription = ruLocObject.Description as string;

		// Читаем английские локализации.
		const enLocFilePath = path.join(ruleDirectoryPath, Localization.LOCALIZATIONS_DIRNAME, Localization.EN_LOCALIZATION_FILENAME);
		if(!fs.existsSync(enLocFilePath)) {
			throw new Error(`Не найден файл английской локализации по пути '${ruLocFilePath}'`);
		}

		const enLocContant = fs.readFileSync(enLocFilePath, 'utf8');
		const enLocObject = YamlHelper.parse(enLocContant);
		const enEventDescriptionsObject = enLocObject.EventDescriptions as any[];
		const enDescription = enLocObject.Description as string;

		// Читаем метаданные для извелечения критериев локализаций.
		const eventDescriptions = this.parseEventDescriptions(ruleDirectoryPath);

		const localizations : Localization[] = []; 
		if(ruEventDescriptionsObject) {
			ruEventDescriptionsObject.forEach( ruEdp => {
				const localization = new Localization();

				if(!ruEdp.LocalizationId) {
					console.warn("Не задан LocalizationId в метаинформации.");
				}

				localization.setLocalizationId(ruEdp.LocalizationId);

				if(!ruEdp.EventDescription) {
					console.warn("Не задан EventDescription в метаинформации.");
				}
				localization.setRuLocalizationText(ruEdp.EventDescription);
				
				localization.setRuDescription(ruDescription);

				const enEventDescription = enEventDescriptionsObject.find(enEdp => enEdp.LocalizationId == ruEdp.LocalizationId);
				if(!enEventDescription) {
					throw new Error("Для русской локализации не найден соответсвую английская по localizationId.");
				}

				localization.setEnLocalizationText(enEventDescription.EventDescription);
				localization.setEnDescription(enDescription);

				// Добавляем критерий из метаданных.
				const localizationEventDescription = eventDescriptions.find(ed => ed.getLocalizationId() == ruEdp.LocalizationId);
				if(localizationEventDescription) {
					const localizationCriteria = localizationEventDescription.getCriteria();
					localization.setCriteria(localizationCriteria);
				}

				localizations.push(localization);
			});
		}
		
		return localizations;
	}

	public static parseEventDescriptions(ruleDirFullPath: string) : MetaInfoEventDescription [] {
		
		// Читаем метаинформацию.
		const metaInfoFullPath = path.join(ruleDirFullPath, MetaInfo.METAINFO_FILENAME);
		const yamlContent = fs.readFileSync(metaInfoFullPath, 'utf8');
		const metaInfoPlain = YamlHelper.parse(yamlContent);

		const eventDescriptionsPlain = metaInfoPlain.EventDescriptions as any[];
		if(!eventDescriptionsPlain) {
			throw new Error(`Не удалось получить EventDescriptions из файла метаданных '${metaInfoFullPath}'`);
		}

		const eventDescriptions = eventDescriptionsPlain.map( edp => {
			const eventDesc = new MetaInfoEventDescription();
			eventDesc.setCriteria(edp.Criteria);
			eventDesc.setLocalizationId(edp.LocalizationId);
			return eventDesc;
		});

		return eventDescriptions;
	}

	public static create(criteria : string, ruLocalizationText : string, enLocalizationText : string ) : Localization {
		const newLocalization = new Localization();
		newLocalization.setCriteria(criteria);
		newLocalization.setRuLocalizationText(ruLocalizationText);
		newLocalization.setEnLocalizationText(enLocalizationText);
		return newLocalization;
	}

	public static async parseRuDescription(fullPath: string) : Promise<string> {

		const ruLocFilePath = path.join(fullPath, this.LOCALIZATIONS_DIRNAME, this.RU_LOCALIZATION_FILENAME);
		if(!fs.existsSync(ruLocFilePath)) {
			return null;
		}
		
		const ruLocContant = await FileSystemHelper.readContentFile(ruLocFilePath);
		const ruLocObject = YamlHelper.parse(ruLocContant);

		return ruLocObject.Description;
	}

	public static async parseEnDescription(fullPath: string) : Promise<string> {
		const enLocFilePath = path.join(fullPath, this.LOCALIZATIONS_DIRNAME, this.EN_LOCALIZATION_FILENAME);
		if(!fs.existsSync(enLocFilePath)) {
			return null;
		}
		
		const enLocContant = await FileSystemHelper.readContentFile(enLocFilePath);
		const enLocObject = YamlHelper.parse(enLocContant);

		return enLocObject.Description;
	}

	private _ruDescription : string;
	private _enDescription : string;

	private _criteria : string;

	private _ruLocalizationText : string;
	private _enLocalizationText : string;

	private _localizationId : string;

	public static RU_LOCALIZATION_FILENAME = "i18n_ru.yaml";
	public static EN_LOCALIZATION_FILENAME = "i18n_en.yaml";

	public static LOCALIZATIONS_DIRNAME = "i18n";
}
