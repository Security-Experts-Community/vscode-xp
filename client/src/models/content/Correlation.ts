import * as path from "path";
import * as fs from 'fs';

import { MetaInfo } from '../metaInfo/metaInfo';
import { Localization } from './localization';
import { IntegrationTest } from '../tests/integrationTest';
import { RuleBaseItem } from './ruleBaseItem';
import { CorrelationUnitTest } from '../tests/correlationUnitTest';
import { FileSystemHelper } from '../../helpers/fileSystemHelper';
import { ContentTreeProvider } from '../../views/contentTree/contentTreeProvider';
import { KbHelper } from '../../helpers/kbHelper';
import { Configuration } from '../configuration';
import { ContentHelper } from '../../helpers/contentHelper';

export class Correlation extends RuleBaseItem {

	private constructor(name: string, parentDirectoryPath? : string) {
		super(name, parentDirectoryPath);
		this.setRuleFileName("rule.co");
	}

	public static async parseFromDirectory(directoryPath: string, fileName?: string) : Promise<Correlation> {

		if(!fs.existsSync(directoryPath)) {
			throw new Error(`Директория '${directoryPath}' не существует.`);
		}

		// Получаем имя корреляции и родительский путь.
		const correlationName = path.basename(directoryPath);
		const parentDirectoryPath = path.dirname(directoryPath);
		const correlation = new Correlation(correlationName, parentDirectoryPath);
		
		// Если явно указано имя файла, то сохраняем его.
		// Иначе используем заданное в конструкторе
		if (fileName){
			correlation.setRuleFileName(fileName);			
		}

		// Парсим основные метаданные.
		const metaInfo = MetaInfo.parseFromFile(directoryPath);
		correlation.setMetaInfo(metaInfo);

		const ruleFilePath = correlation.getRuleFilePath();
		const ruleCode = await FileSystemHelper.readContentFile(ruleFilePath);
		correlation.setRuleCode(ruleCode);

		// Парсим описания на разных языках.
		const ruDescription = await Localization.parseRuDescription(directoryPath);
		correlation.setRuDescription(ruDescription);

		const enDescription = await Localization.parseEnDescription(directoryPath);
		correlation.setEnDescription(enDescription);

		const localization = Localization.parseFromDirectory(directoryPath);
		correlation.updateLocalizations(localization);

		const modularTests = CorrelationUnitTest.parseFromRuleDirectory(directoryPath, correlation);
		correlation.addModularTests(modularTests);

		const integrationalTests = IntegrationTest.parseFromRuleDirectory(directoryPath);
		correlation.addIntegrationTests(integrationalTests);

		// Добавляем команду, которая пробрасываем параметром саму рубрику.
		correlation.setCommand({ 
			command: ContentTreeProvider.onRuleClickCommand,  
			title: "Open File", 
			arguments: [correlation] 
		});

		return correlation;
	}

	public static create(name: string, parentPath?: string, fileName?: string) : Correlation {
		const rule = new Correlation(name, parentPath);

		// Если явно указано имя файла, то сохраняем его.
		// Иначе используем заданное в конструкторе
		if (fileName){
			rule.setRuleFileName(fileName);			
		}

		const metainfo = rule.getMetaInfo();
		metainfo.setName(name);

		const contentPrefix = Configuration.get().getContentPrefix();
		const objectId = KbHelper.generateRuleObjectId(name, contentPrefix);
		metainfo.setObjectId(objectId);

		// Добавляем команду, которая пробрасываем параметром саму рубрику.
		rule.setCommand({ 
			command: ContentTreeProvider.onRuleClickCommand,  
			title: "Open File", 
			arguments: [rule] 
		});

		return rule;
	}

	public async save(parentFullPath?: string) : Promise<void> {

		// Путь либо передан как параметр, либо он уже задан в правиле.
		let corrDirPath = "";
		if(parentFullPath) {
			corrDirPath = path.join(parentFullPath, this._name);
			this.setParentPath(parentFullPath);
		} else {
			const parentPath = this.getParentPath();
			if(!parentPath) {
				throw new Error("Не задан путь для сохранения корреляции.");
			}

			corrDirPath = this.getDirectoryPath();
		}

		if(!fs.existsSync(corrDirPath)) {
			await fs.promises.mkdir(corrDirPath);
		} 

		const ruleFullPath = path.join(corrDirPath, this.getRuleFileName());
		if(this._ruleCode) {
			await FileSystemHelper.writeContentFile(ruleFullPath, this._ruleCode);
		} else {
			await FileSystemHelper.writeContentFile(ruleFullPath, "");
		}

		await this.getMetaInfo().save(corrDirPath);
		await this.saveLocalizationsImpl(corrDirPath);
		await this.saveIntegrationTest(corrDirPath);
		await this.saveModularTests(corrDirPath);
	}

	public async rename(newRuleName: string): Promise<void> {

		// Старые значения.
		const oldRuleName = this.getName();

		// Переименовываем директорию с правилом
		const parentDirectoryPath = this.getParentPath();
		const newRuleDirectoryPath = path.join(parentDirectoryPath, newRuleName);

		// Переименовываем в коде правила.
		const ruleCode = await this.getRuleCode();
		const newRuleCode = ContentHelper.replaceAllCorrelantionNameWithinCode(newRuleName, ruleCode);
		this.setRuleCode(newRuleCode);

		// В метаинформации.
		const metainfo = this.getMetaInfo();
		metainfo.setName(newRuleName);

		const contentPrefix = Configuration.get().getContentPrefix();
		const objectId = KbHelper.generateRuleObjectId(newRuleName, contentPrefix);
		metainfo.setObjectId(objectId);

		// Замена в критериях.
		this.getMetaInfo().getEventDescriptions().forEach(ed => {
			const criteria = ed.getCriteria();
			const newCriteria = ContentHelper.replaceAllRuleNamesWithinString(oldRuleName, newRuleName, criteria);
			ed.setCriteria(newCriteria);

			const localizationId = ed.getLocalizationId();
			const newLocalizationId = ContentHelper.replaceAllRuleNamesWithinString(oldRuleName, newRuleName, localizationId);
			ed.setLocalizationId(newLocalizationId);
		});

		// Замена в тестах.
		this.getIntegrationTests().forEach( 
			it => {
				it.setRuleDirectoryPath(newRuleDirectoryPath);
				const testCode = it.getTestCode();
				const newTestCode = ContentHelper.replaceAllRuleNamesWithinString(oldRuleName, newRuleName, testCode);
				it.setTestCode(newTestCode);
			}
		);

		this.getModularTests().forEach( 
			it => {
				it.setRuleDirectoryPath(newRuleDirectoryPath);
				const testCode = it.getTestCode();
				const newTestCode = ContentHelper.replaceAllRuleNamesWithinString(oldRuleName, newRuleName, testCode);
				it.setTestCode(newTestCode);
			}
		);

		this.getLocalizations().forEach( 
			loc => {
				const localizationId = loc.getLocalizationId();
				const newLocalizationId = ContentHelper.replaceAllRuleNamesWithinString(oldRuleName, newRuleName, localizationId);
				loc.setLocalizationId(newLocalizationId);
			}
		);

		// Имя правила.
		this.setName(newRuleName);
	}

	iconPath = {
		light: path.join(this.getResourcesPath(), 'light', 'rule.svg'),
		dark: path.join(this.getResourcesPath(), 'dark', 'rule.svg')
	};

	contextValue = 'Correlation';
}