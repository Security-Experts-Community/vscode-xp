import * as path from "path";
import * as fs from 'fs';

import { MetaInfoEventDescription } from './metaInfoEventDescription';
import { Attack } from './attack';
import { DateHelper } from '../../helpers/dateHelper';
import { DataSource } from './dataSource';
import { FileSystemHelper } from '../../helpers/fileSystemHelper';
import { JsHelper } from '../../helpers/jsHelper';
import { ParseException } from '../parseException';
import { YamlHelper } from '../../helpers/yamlHelper';

export class MetaInfo {

	public static async fromFile(ruleDirFullPath: string): Promise<MetaInfo> {

		const metaInfoFullPath = path.join(ruleDirFullPath, this.METAINFO_FILENAME);

		if (!fs.existsSync(metaInfoFullPath)) {
			// Заполнение по умолчанию.
			const emptyMetainfo = new MetaInfo();
			emptyMetainfo.setDirectoryPath(ruleDirFullPath);

			const defaultRuleName = path.basename(ruleDirFullPath);
			emptyMetainfo.setName(defaultRuleName);

			return emptyMetainfo;
		}

		const yamlContent = await FileSystemHelper.readContentFile(metaInfoFullPath);
		const metaInfoAsInFile = YamlHelper.parse(yamlContent);

		const metaInfo = MetaInfo.create(metaInfoAsInFile);
		metaInfo.setDirectoryPath(ruleDirFullPath);

		return metaInfo;
	}

	public static create(metaInfoAsInFile: any): MetaInfo {
		const metaInfo = new MetaInfo();

		if(!metaInfoAsInFile) {
			return metaInfo;
		}
		
		// Сохраним текущее состояние файла для дальнейшего использования в процедуре сохранения.
		// Необходимо, чтобы произвольные и не относящиеся к форме поля остались в metainfo.yaml
		metaInfo.AsInFile = JsHelper.removeEmptyKeys(metaInfoAsInFile);

		if (metaInfoAsInFile?.Name) {
			metaInfo.setName(metaInfoAsInFile.Name);
		}
		else if (metaInfoAsInFile?.ContentAutoName) {
			metaInfo.setName(metaInfoAsInFile.ContentAutoName);
		}
		else {
			metaInfo.setName("");
		}

		const useExpertContext = Boolean(metaInfoAsInFile?.ExpertContext);
		const metaDict = useExpertContext ? metaInfoAsInFile?.ExpertContext : metaInfoAsInFile;

		if (metaDict?.Created && metaDict?.Created.length != 0) {
			const created = DateHelper.parseDate(metaDict.Created);
			metaInfo.setCreatedDate(created);
		}

		if (metaDict?.Updated && metaDict?.Updated.length != 0) {
			const updated = DateHelper.parseDate(metaDict.Updated);
			metaInfo.setUpdatedDate(updated);
		}

		const eventDescriptionsPlain = metaInfoAsInFile?.EventDescriptions as any[];
		if (eventDescriptionsPlain) {
			const eventDescriptions = eventDescriptionsPlain.map(edp => {
				const eventDesc = new MetaInfoEventDescription();
				if (!edp.Criteria) {
					throw new ParseException("Ошибка консистентности критерия локализации");
				}

				eventDesc.setCriteria(edp.Criteria);
				eventDesc.setLocalizationId(edp.LocalizationId);
				return eventDesc;
			});

			metaInfo.addEventDescriptions(eventDescriptions);
		}

		if(metaInfoAsInFile?.ObjectId) {
			metaInfo.setObjectId(metaInfoAsInFile.ObjectId);
		}

		if (metaDict?.KnowledgeHolders) {
			metaInfo.KnowledgeHolders = metaDict.KnowledgeHolders as string[];
		}

		if (metaDict?.Usecases) {
			metaInfo.Usecases = metaDict.Usecases as string[];
		}

		if (metaDict?.Falsepositives) {
			metaInfo.Falsepositives = metaDict.Falsepositives as string[];
		}

		if (metaDict?.References) {
			metaInfo.References = metaDict.References as string[];
		}

		if (metaDict?.Improvements) {
			metaInfo.Improvements = metaDict.Improvements as string[];
		}

		if (metaDict?.DataSources) {
			metaInfo.DataSources = metaDict.DataSources as DataSource[];
		}

		if (metaDict?.ContentLabels) {
			metaInfo.ContentLabels = metaDict.ContentLabels as string[];
		}

		let attackDict = {};
		// Обратная совместимость
		if (metaInfoAsInFile?.ATTACK) {
			attackDict = metaInfoAsInFile.ATTACK;
		}
		
		if (metaInfoAsInFile?.ContentRelations?.Implements?.ATTACK) {
			attackDict = metaInfoAsInFile.ContentRelations.Implements.ATTACK;
		}
		
		if (attackDict) {
			metaInfo.ATTACK = Object.keys(attackDict).map(
				tactic => {
					const ta = new Attack();
					ta.Tactic = tactic;
					ta.Techniques = attackDict[tactic];
					return ta;
				}
			);
		}

		// Локализации если есть, для макросов
		// Filter:
		// 	Name:
		// 		ru: 'Проверяет специфичное значение для событий вайтлистинга, связанных с ...'
		// 		en: 'Checks a specific value for ... events according to the whitelisting system'
		// 	Description:
		// 		ru: 'Данный фильтр используется для сокращения повторяющейся части проверки через систему табличных списков'
		// 		en: 'This filter is used to reduce the repetitive part of the check through the table list system'
		// 	UseAsEventName: false
		const filter = metaDict?.Filter;
		if(filter) {
			const ruDescription = filter?.Name?.ru;
			if(ruDescription) {
				metaInfo.setRuDescription(ruDescription);
			}

			const enDescription = filter?.Name?.en;
			if(enDescription) {
				metaInfo.setEnDescription(enDescription);
			}
		}

		return metaInfo;
	}

	/// Описания правила.
	public setRuDescription(description: string) : void {
		this._ruDescription = description;
	}

	public setEnDescription(description: string) : void {
		this._enDescription = description;
	}

	public getRuDescription() : string {
		return this._ruDescription;
	}

	public getEnDescription() : string {
		return this._enDescription;
	}

	public async toObject(): Promise<any> {

		// Сохраняем если ранее не был сохранен.
		//const metainfoFilePath = path.join(this.getDirectoryPath(), MetaInfo.METAINFO_FILENAME);
		//if (!fs.existsSync(metainfoFilePath)) {
		//	await this.save();
		//}

		//const metainfoString = await FileSystemHelper.readContentFile(metainfoFilePath);
		//const metaInfo = YamlHelper.parse(metainfoString);

		// Модифицируем ATTACK для форматирования корректного.
		//metaInfo.ATTACK = this.getAttacks();
		return this; //metaInfo;
	}

	public setDirectoryPath(dirPath: string): void {
		this._directoryPath = dirPath;
	}

	public getDirectoryPath(): string {
		return this._directoryPath;
	}

	public setCreatedDate(date: Date): void {
		this.Created = date;
		this.FormattedCreated = DateHelper.dateToString(date);
	}

	public getCreatedDate(): Date {
		return this.Created;
	}

	public setUpdatedDate(date: Date) : void {
		this.Updated = date;
		this.FormattedUpdated = DateHelper.dateToString(date);
	}

	public getUpdatedDate(): Date {
		return this.Updated;
	}

	public setName(name: string)  : void {
		this.Name = name;
	}

	public getName(): string | undefined {
		return this.Name;
	}

	public setObjectId(objectId: string) : void {
		this.ObjectId = objectId;
	}

	public getObjectId(): string | undefined {
		return this.ObjectId;
	}

	public setUseCases(usecase: string[]) : void {
		if (!usecase) {
			this.Usecases = [];
			return;
		}

		if (usecase.length == 1 && usecase[0] == "") {
			this.Usecases = [];
			return;
		}

		this.Usecases = usecase;
	}

	public getUseCases(): string[] {
		return this.Usecases;
	}

	public setKnowledgeHolders(knowledgeHolders: string[]) : void {
		if (!knowledgeHolders) {
			this.KnowledgeHolders = [];
			return;
		}

		if (knowledgeHolders.length == 1 && knowledgeHolders[0] == "") {
			this.KnowledgeHolders = [];
			return;
		}

		this.KnowledgeHolders = knowledgeHolders;
	}

	public getKnowledgeHolders(): string[] {
		return this.KnowledgeHolders;
	}

	public setImprovements(improvements: string[]) : void {
		if (!improvements) {
			this.Improvements = [];
			return;
		}

		if (improvements.length == 1 && improvements[0] == "") {
			this.Improvements = [];
			return;
		}

		this.Improvements = improvements;
	}

	public getImprovements(): string[] {
		return this.Improvements;
	}

	public setDataSources(dataSources: DataSource[]) : void {
		if (!dataSources) {
			this.DataSources = [];
			return;
		}

		this.DataSources = dataSources;
	}

	public getDataSources(): DataSource[] {
		return this.DataSources;
	}

	public setFalsePositives(falsepositives: string[]) : void {
		if (!falsepositives) {
			this.Falsepositives = [];
			return;
		}

		if (falsepositives.length == 1 && falsepositives[0] == "") {
			this.Falsepositives = [];
			return;
		}

		this.Falsepositives = falsepositives;
	}

	public getFalsePositives(): string[] {
		return this.Falsepositives;
	}

	public setReferences(references: string[]) : void {
		if (!references) {
			this.References = [];
			return;
		}

		if (references.length == 1 && references[0] == "") {
			this.References = [];
			return;
		}

		this.References = references;
	}

	public getReferences(): string[] {
		return this.References;
	}

	public getAttacks(): Attack[] {
		return this.ATTACK;
	}

	public setAttacks(attacks: Attack[]) : void {
		this.ATTACK = attacks;
	}

	public addEventDescriptions(eventDescriptions: MetaInfoEventDescription[]): void {
		const existingLocalizations = this.EventDescriptions.map((metainfoED) => {
			return metainfoED.getLocalizationId();
		});
		eventDescriptions.forEach((ed) => {
			if (!existingLocalizations.includes(ed.getLocalizationId())) {
				this.EventDescriptions.push(ed);
			}
		});
		//this.EventDescriptions.push(...eventDescription);
	}

	public getEventDescriptions(): MetaInfoEventDescription[] {
		return this.EventDescriptions;
	}

	public setEventDescriptions(eventDescriptions: MetaInfoEventDescription[]): void {
		this.EventDescriptions = [];
		this.addEventDescriptions(eventDescriptions);
	}

	public clearEventDescriptions(): void {
		this.EventDescriptions = [];
	}

	public toString(): string {
		this.setUpdatedDate(new Date());

		// Если дата создания не задана, то будет текущая.
		if (!this.Created) {
			this.setCreatedDate(this.Updated);
		}

		// Для начального заполнения берем текущее состояние файла.
		// Далее будем менять известные нам поля, а неизвестные останутся как есть.
		const metaInfoObject = this.AsInFile;

		if (this.Name) metaInfoObject["ContentAutoName"] = this.Name;


		if (!metaInfoObject["ExpertContext"]) {
			metaInfoObject["ExpertContext"] = {};
		}
		metaInfoObject["ExpertContext"]["Created"] = DateHelper.dateToString(this.Created);
		metaInfoObject["ExpertContext"]["Updated"] = DateHelper.dateToString(this.Updated);

		if (this.ObjectId) {
			metaInfoObject["ObjectId"] = this.ObjectId;
		}
			
		if (this.KnowledgeHolders) {
			metaInfoObject["ExpertContext"]["KnowledgeHolders"] = this.KnowledgeHolders;
		}

		if (this.Usecases) {
			metaInfoObject["ExpertContext"]["Usecases"] = this.Usecases;
		}

		if (this.Falsepositives) {
			metaInfoObject["ExpertContext"]["Falsepositives"] = this.Falsepositives;
		}

		if (this.References) {
			metaInfoObject["ExpertContext"]["References"] = this.References;
		}

		if (this.Improvements) {
			metaInfoObject["ExpertContext"]["Improvements"] = this.Improvements;
		}
		if (this.ContentLabels) {
			metaInfoObject["ContentLabels"] = this.ContentLabels;
		} 

		if (this.EventDescriptions.length != 0) {
			metaInfoObject["EventDescriptions"] =
				this.EventDescriptions.map(function (ed, index) {
					return { "Criteria": ed.getCriteria(), "LocalizationId": ed.getLocalizationId() };
				});
		}

		const attackPlain = {};
		this.ATTACK.forEach(
			attack => {
				const tactic = attack.Tactic as string;
				const techniques = attack.Techniques as string[];

				if (!attackPlain[tactic]) attackPlain[tactic] = [];
				attackPlain[tactic] = attackPlain[tactic].concat(techniques);
			}
		);

		if (!JsHelper.isEmptyObj(attackPlain)) {
			if (metaInfoObject["ContentRelations"]) {
				if (!metaInfoObject["ContentRelations"]["Implements"]) {
					metaInfoObject["ContentRelations"]["Implements"] = {};
				}
			} else {
				metaInfoObject["ContentRelations"] = { "Implements": {} };
			}
			metaInfoObject["ContentRelations"]["Implements"]["ATTACK"] = attackPlain;
		}
		else {
			delete metaInfoObject["ContentRelations"];
		}

		if (this.DataSources.length != 0) {
			metaInfoObject["ExpertContext"]["DataSources"] = this.DataSources;
		}
		else {
			delete metaInfoObject["ExpertContext"]["DataSources"];
		}

		// Локализация макроса, которая хранится в метаинформации.
		const ruDescription = this.getRuDescription();
		const enDescription = this.getEnDescription();
		if(ruDescription || enDescription) {
			metaInfoObject.Filter = {};
			metaInfoObject.Filter.Name = {};

			// Определены оба описания
			if(ruDescription && enDescription) {
				metaInfoObject.Filter = {};
				metaInfoObject.Filter.Name = {};
				metaInfoObject.Filter.Name.ru = ruDescription;
				metaInfoObject.Filter.Name.en = enDescription;
			}

			// Определена только английское описание
			if(ruDescription && !enDescription) {
				metaInfoObject.Filter = {};
				metaInfoObject.Filter.Name = {};
				metaInfoObject.Filter.Name.ru = ruDescription;
			}

			// Определена только английская описание
			if(enDescription && !ruDescription) {
				metaInfoObject.Filter = {};
				metaInfoObject.Filter.Name = {};
				metaInfoObject.Filter.Name.en = enDescription;
			}
		} else {
			if(metaInfoObject?.Filter?.Name) {
				delete metaInfoObject.Filter;
			}
		}

		let yamlContent = YamlHelper.stringify(metaInfoObject);
		yamlContent = this.correctEventIds(yamlContent);
		return yamlContent;
	}

	public async save(ruleDirectoryFullPath?: string): Promise<void> {
		let metaInfoFullPath: string;
		if (ruleDirectoryFullPath) {
			metaInfoFullPath = path.join(ruleDirectoryFullPath, MetaInfo.METAINFO_FILENAME);
		} else {
			metaInfoFullPath = path.join(this.getDirectoryPath(), MetaInfo.METAINFO_FILENAME);
		}

		const yamlContent = this.toString();
		await FileSystemHelper.writeContentFileIfChanged(metaInfoFullPath, yamlContent);
	}

	public correctEventIds(metaInfoContent: string): string {
		if (!metaInfoContent) { return ""; }
		const eventIdItemRegExp = /- ['"](\d+)['"]$/gm;

		let curResult: RegExpExecArray | null;
		while ((curResult = eventIdItemRegExp.exec(metaInfoContent))) {
			if(curResult.length != 2)
				continue;

			const eventIdFull = curResult[0];
			const eventId = curResult[1];

			metaInfoContent = metaInfoContent.replace(eventIdFull, `- ${eventId}`);
		}
		return metaInfoContent;
	}

	public static METAINFO_FILENAME = "metainfo.yaml";

	private _directoryPath: string;
	private _ruDescription : string;
	private _enDescription : string;

	private Created: Date;
	private Updated: Date;
	private FormattedCreated: string;
	private FormattedUpdated: string;
	private Name: string | undefined = undefined;
	private ObjectId: string | undefined = undefined;

	private KnowledgeHolders: string[];
	private Usecases: string[];
	private References: string[];
	private Falsepositives: string[];
	private Improvements: string[];

	private DataSources: DataSource[] = [];
	private ATTACK: Attack[] = [];
	private EventDescriptions: MetaInfoEventDescription[] = [];
	private ContentLabels: string[];

	private AsInFile: any = {};
}



