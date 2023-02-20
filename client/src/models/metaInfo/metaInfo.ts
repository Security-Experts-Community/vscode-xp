import * as path from "path";
import * as fs from 'fs';

import { MetaInfoEventDescription } from './metaInfoEventDescription';
import { Attack } from './attack';
import { DateHelper } from '../../helpers/dateHelper';
import { DataSource } from './dataSource';
import { FileSystemHelper } from '../../helpers/fileSystemHelper';
import { JsHelper } from '../../helpers/jsHelper';
import { ParseException } from '../ParseException';
import { YamlHelper } from '../../helpers/yamlHelper';

export class MetaInfo {

	public static parseFromFile(ruleDirFullPath: string) : MetaInfo {
		
		const metaInfoFullPath = path.join(ruleDirFullPath, MetaInfo.MetaInfoFileName);

		if(!fs.existsSync(metaInfoFullPath)) {
			// Заполнение по умолчанию.
			const emptyMetainfo = new MetaInfo();
			emptyMetainfo.setDirectoryPath(ruleDirFullPath);

			const defaultRuleName = path.basename(ruleDirFullPath);
			emptyMetainfo.setName(defaultRuleName);

			return emptyMetainfo;
		}

		const yamlContent = FileSystemHelper.readContentFileSync(metaInfoFullPath);
		const metaInfoPlain = YamlHelper.parse(yamlContent);

		const metaInfo = MetaInfo.create(metaInfoPlain);
		metaInfo.setDirectoryPath(ruleDirFullPath);

		return metaInfo;
	}

	public static create(metaInfoPlain: any) : MetaInfo {
		
		const metaInfo = new MetaInfo();
		if(metaInfoPlain.Name) {
			metaInfo.setName(metaInfoPlain.Name);
		}
		else {
			metaInfo.setName("");
		}

		if(metaInfoPlain.Created && metaInfoPlain.Created.length != 0) {
			const created = DateHelper.parseDate(metaInfoPlain.Created);
			metaInfo.setCreatedDate(created);
		}

		if(metaInfoPlain.Updated && metaInfoPlain.Updated.length != 0) {
			const updated = DateHelper.parseDate(metaInfoPlain.Updated);
			metaInfo.setUpdatedDate(updated);
		}

		const eventDescriptionsPlain = metaInfoPlain.EventDescriptions as any[];
		if(eventDescriptionsPlain) {
			const eventDescriptions = eventDescriptionsPlain.map( edp => {
				const eventDesc = new MetaInfoEventDescription();
				if(!edp.Criteria) {
					throw new ParseException("Ошибка консистентности критерия локализации.");
				}

				eventDesc.setCriteria(edp.Criteria);
				eventDesc.setLocalizationId(edp.LocalizationId);
				return eventDesc;
			});
	
			metaInfo.addEventDescriptions(eventDescriptions);
		}

		metaInfo.setOrigin(metaInfoPlain.Origin);
		metaInfo.setObjectId(metaInfoPlain.ObjectId);

		if(metaInfoPlain.KnowledgeHolders) {
			metaInfo._knowledgeHolders = metaInfoPlain.KnowledgeHolders as string[];
		}

		if(metaInfoPlain.Usecases) {
			metaInfo._usecases = metaInfoPlain.Usecases as string[];
		}
		
		if(metaInfoPlain.Falsepositives) {
			metaInfo._falsepositives = metaInfoPlain.Falsepositives as string[];
		}

		if(metaInfoPlain.References) {
			metaInfo._references = metaInfoPlain.References as string[];
		}

		if(metaInfoPlain.Improvements) {
			metaInfo._improvements = metaInfoPlain.Improvements as string[];
		}

		if(metaInfoPlain.DataSources) {
			metaInfo._dataSources = metaInfoPlain.DataSources as DataSource[];
		}

		if(metaInfoPlain.ATTACK) {
			metaInfo._attacks = Object.keys(metaInfoPlain.ATTACK).map(
				tactic => {
					const ta = new Attack();
					ta.Tactic = tactic;
					ta.Techniques = metaInfoPlain.ATTACK[tactic];
					return ta;
				}
			);
		}

		return metaInfo;
	}

	public async toObject() : Promise<any> {
		
		// Сохраняем если ранее не был сохранен.
		const metainfoFilePath = path.join(this.getDirectoryPath(), "metainfo.yaml");
		if(!fs.existsSync(metainfoFilePath)) {
			await this.save();
		}

		const metainfoString = await FileSystemHelper.readContentFile(metainfoFilePath);
		const metaInfo = YamlHelper.parse(metainfoString);

		// Модифицируем ATTACK для форматирования корректного.
		metaInfo.ATTACK = this.getAttacks();
		return metaInfo;
	}

	public setDirectoryPath(dirPath: string) : void {
		this._directoryPath = dirPath;
	}

	public getDirectoryPath() : string {
		return this._directoryPath;
	}

	public setCreatedDate(date: Date) : void {
		this._createdDate = date;
	}

	public getCreatedDate() : Date {
		return this._createdDate;
	}

	public setUpdatedDate(date: Date) {
		this._updatedDate = date;
	}

	public setName(name: string) {
		this._name = name;
	}

	public getName() : string {
		return this._name;
	}

	public setObjectId(objectId: string) {
		this._objectId = objectId;
	}

	public getObjectId() : string {
		return this._objectId;
	}

	public setOrigin(origin: string) {
		this._origin = origin;
	}

	public getOrigin() : string {
		return this._origin;
	}

	public setUseCases(usecase: string[]) {
		if(!usecase) {
			this._usecases = [];
			return;
		}

		if(usecase.length == 1 && usecase[0] == "") {
			this._usecases = [];
			return;
		}

		this._usecases = usecase;
	}

	public getUseCases() : string [] {
		return this._usecases;
	}

	public setKnowledgeHolders(knowledgeHolders: string[]) {
		if(!knowledgeHolders) {
			this._knowledgeHolders = [];
			return;
		}

		if(knowledgeHolders.length == 1 && knowledgeHolders[0] == "") {
			this._knowledgeHolders = [];
			return;
		}

		this._knowledgeHolders = knowledgeHolders;
	}

	public getKnowledgeHolders() : string [] {
		return this._knowledgeHolders;
	}

	public setImprovements(improvements: string[]) {
		if(!improvements) {
			this._improvements = [];
			return;
		}

		if(improvements.length == 1 && improvements[0] == "") {
			this._improvements = [];
			return;
		}

		this._improvements = improvements;
	}

	public getImprovements() : string [] {
		return this._improvements;
	}

	public setDataSources(dataSources: DataSource[]) {
		if(!dataSources) {
			this._dataSources = [];
			return;
		}

		this._dataSources = dataSources;
	}

	public getDataSources() : DataSource [] {
		return this._dataSources;
	}

	public setFalsePositives(falsepositives: string[]) {
		if(!falsepositives) {
			this._falsepositives = [];
			return;
		}

		if(falsepositives.length == 1 && falsepositives[0] == "") {
			this._falsepositives = [];
			return;
		}

		this._falsepositives = falsepositives;
	}

	public getFalsePositives() : string [] {
		return this._falsepositives;
	}

	public setReferences(references: string[]) {
		if(!references) {
			this._references = [];
			return;
		}

		if(references.length == 1 && references[0] == "") {
			this._references = [];
			return;
		}

		this._references = references;
	}

	public getReferences() : string [] {
		return this._references;
	}

	public setTags(tags: string[]) {
		if(!tags) {
			this._tags = [];
			return;
		}

		if(tags.length == 1 && tags[0] == "") {
			this._tags = [];
			return;
		}

		this._tags = tags;
	}

	public getTags() : string [] {
		return this._tags;
	}

	public getAttacks() : Attack[] {
		return this._attacks;
	}

	public setAttacks(attacks: Attack[] ) {
		this._attacks = attacks;
	}

	public addEventDescriptions(eventDescription: MetaInfoEventDescription[]) : void {
		this._eventDescriptions.push(...eventDescription);
	}

	public getEventDescriptions() : MetaInfoEventDescription[] {
		return this._eventDescriptions;
	}

	public clearEventDescriptions() : void {
		this._eventDescriptions = [];
	}

	public async save(ruleDirectoryFullPath?: string) : Promise<void> {

		let metaInfoFullPath: string;
		if(ruleDirectoryFullPath) {
			metaInfoFullPath = path.join(ruleDirectoryFullPath, "metainfo.yaml");
		} else {
			metaInfoFullPath = path.join(this.getDirectoryPath(), "metainfo.yaml");
		}
		

		// Если дата создания не задана, то будет текущая.
		const updatedDate = new Date();
		if(!this._createdDate) {
			this._createdDate = updatedDate;
		}

		const metaInfoObject = {
			"Created" : DateHelper.dateToString(this._createdDate),
			"Updated" : DateHelper.dateToString(updatedDate)
		};

		if(this._name) {
			metaInfoObject["Name"] = this._name;
		}

		if(this._eventDescriptions.length != 0) {
			metaInfoObject["EventDescriptions"] = 
				this._eventDescriptions.map( function (ed, index) {
					return {"Criteria" : ed.getCriteria(), "LocalizationId" : ed.getLocalizationId()};
				});
		}	

		if(this._origin) {
			metaInfoObject["Origin"] = this._origin;
		}

		if(this._objectId) {
			metaInfoObject["ObjectId"] = this._objectId;
		}

		if(this._knowledgeHolders.length != 0) {
			metaInfoObject["KnowledgeHolders"] = this._knowledgeHolders;
		}
		
		if(this._usecases.length != 0) {
			metaInfoObject["Usecases"] = this._usecases;
		}
		
		if(this._falsepositives.length != 0) {
			metaInfoObject["Falsepositives"] = this._falsepositives;
		}
		
		if(this._tags.length != 0) {
			metaInfoObject["Tags"] = this._tags;
		}
		
		if(this._references.length != 0) {
			metaInfoObject["References"] = this._references;
		}

		if(this._improvements.length != 0) {
			metaInfoObject["Improvements"] = this._improvements;
		}

		const attackPlain = {};
		this._attacks.forEach( 
			attack => {
				const tactic = attack.Tactic as string;
				const techniques = attack.Techniques as string[];
				
				attackPlain[tactic] = techniques;
			}
		);

		if(!JsHelper.isEmptyObj(attackPlain)) {
			metaInfoObject["ATTACK"] = attackPlain;
		}
		
		if(this._dataSources.length != 0) {
			metaInfoObject["DataSources"] = this._dataSources;
		}

		let yamlContent = YamlHelper.stringify(metaInfoObject);
		// yamlContent = this.correctEventIds(yamlContent);

		await FileSystemHelper.writeContentFile(metaInfoFullPath, yamlContent);
	}

	public correctEventIds(metaInfoContent : string) : string {

		const eventIdItemRegExp = /- \'(\d+)\'$/gm;

		let curResult: RegExpExecArray | null;
		while ((curResult = eventIdItemRegExp.exec(metaInfoContent))) {
			const eventIdFull = curResult[0];
			const eventId = curResult[1];

			metaInfoContent = metaInfoContent.replace(eventIdFull, `- ${eventId}`);
		}
		return metaInfoContent;
	}

	public static MetaInfoFileName: string = "metainfo.yaml";

	private _directoryPath: string;

	private _createdDate: Date;
	private _updatedDate: Date;
	private _name: string = undefined
	private _objectId: string = undefined;
	private _origin: string = undefined;

	private _knowledgeHolders: string[] = [];
	private _usecases: string[] = [];
	private _references: string[] = [];
	private _falsepositives: string[] = [];
	private _improvements: string[] = [];
	private _tags: string[] = [];

	private _dataSources: DataSource[] = [];
	private _attacks: Attack [] = [];
	private _eventDescriptions: MetaInfoEventDescription [] = [];
}



