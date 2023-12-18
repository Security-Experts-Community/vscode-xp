import * as path from "path";
import * as fs from 'fs';
import * as vscode from 'vscode';

import { MetaInfo } from '../metaInfo/metaInfo';
import { Localization, LocalizationExample, LocalizationLanguage } from './localization';
import { MetaInfoEventDescription } from '../metaInfo/metaInfoEventDescription';
import { IntegrationTest } from '../tests/integrationTest';
import { ContentTreeBaseItem } from './contentTreeBaseItem';
import { FileSystemHelper } from '../../helpers/fileSystemHelper';
import { Configuration } from '../configuration';
import { YamlHelper } from '../../helpers/yamlHelper';
import { ArgumentException } from '../argumentException';
import { XpException } from '../xpException';
import { BaseUnitTest } from '../tests/baseUnitTest';
import { UnitTestRunner } from '../tests/unitTestsRunner';
import { UnitTestOutputParser } from '../tests/unitTestOutputParser';

export enum ContentItemStatus {
	Default = 1,
	Verified,
	Unverified
}

/**
 * Базовый класс для всех правил.
 */
export abstract class RuleBaseItem extends ContentTreeBaseItem {

	constructor(name: string, parentDirectoryPath? : string) {
		super(name, parentDirectoryPath);
		this.iconPath = new vscode.ThemeIcon('file');
	}

	public abstract convertUnitTestFromObject(object: any) : BaseUnitTest;
	public abstract createNewUnitTest(): BaseUnitTest;
	public abstract clearUnitTests() : void;
	public abstract getUnitTestRunner(): UnitTestRunner;
	public abstract getUnitTestOutputParser(): UnitTestOutputParser;
	
	protected abstract getLocalizationPrefix() : string;

	public addNewUnitTest() : BaseUnitTest {
		const newUnitTest = this.createNewUnitTest();
		this.addUnitTests([newUnitTest]);
		return newUnitTest;
	}

	public setTooltip(tooltip: string) : void {
		this.tooltip = tooltip;
	}

	public static getRuleDirectoryPath(parentDirPath : string, ruleName : string ) : string {
		if(!parentDirPath) {
			throw new ArgumentException(`Не задан путь к директории правила.`);
		}

		if(!ruleName) {
			throw new ArgumentException(`Не задано имя правила.`);
		}

		return path.join(parentDirPath, ruleName);
	}

	/**
	 * Возвращает путь к пакету, в котором расположеню правило.
	 * @returns путь к пакету, в котором расположеню правило.
	 */
	public getPackagePath(config: Configuration) : string {
		if(!this._parentPath) {
			throw new ArgumentException(`Не задан путь к директории правила '${this.getName()}'.`);
		}

		const pathEntities = this.getDirectoryPath().split(path.sep);
		const roots = config.getContentRoots().map(folder => {return path.basename(folder);});
		for (const root of roots){
			const  packagesDirectoryIndex = pathEntities.findIndex( pe => pe.toLocaleLowerCase() === root);
			if(packagesDirectoryIndex === -1){
				continue;
			}

			// Удаляем лишние элементы пути и собираем результирующий путь.
			const packageNameIndex = packagesDirectoryIndex + 2;
			pathEntities.splice(packageNameIndex);
			const packageDirectoryPath = pathEntities.join(path.sep);
			return packageDirectoryPath;
		}

		throw new XpException(`Путь к правилу '${this.getName()}' не содержит ни одну из корневых директорий: [${roots.join(", ")}].`);
	}


	public getTestsPath():string {
		return path.join(this.getDirectoryPath(), RuleBaseItem.TESTS_DIRNAME);
	}

	public async saveUnitTests(): Promise<void> {	
		// Создаем или очищаем директорию с тестами.
		const testDirPath = this.getTestsPath();
		if(!fs.existsSync(testDirPath)) {
			await fs.promises.mkdir(testDirPath, {recursive: true});
		} 
		else {
			// Удаляем файлы, которые относятся к модульным тестам
			this.clearUnitTests();
		}

		// Сохраняем тесты и перезаписываем.
		this._unitTests.forEach( async (mt, index) => {
			mt.setNumber(index + 1);
			await mt.save();
		});
	}

	/**
	 * Добавляет модульные тесты к правилу.
	 * @param tests модульные тесты
	 */
	public addUnitTests(tests: BaseUnitTest[]) : void {
		
		if (!tests){ return; }

		const startIndex = this._unitTests.length;
		
		tests.forEach( (t, index) => {
			const newNumber = index + startIndex + 1;
			t.setNumber(newNumber);
			this._unitTests.push(t);
		});
	}

	public setUnitTests(tests: BaseUnitTest[]) : void {
		this._unitTests = [];
		tests.forEach( (unitTest, index) => {
			const newNumber = index + 1;
			unitTest.setNumber(newNumber);
			unitTest.setRule(this);
			this._unitTests.push(unitTest);
		});
	}

	/**
	 * Получает модульные тесты правила.
	 * @returns модульные тесты.
	 */
	public getUnitTests() : BaseUnitTest[] {
		return this._unitTests;
	}

	public abstract reloadUnitTests() : void;

	public addIntegrationTests(tests: IntegrationTest[]) : void {
		const ruleDirectoryPath = this.getDirectoryPath();
		tests.forEach( (it, index) => {
			it.setNumber(index + 1);
			it.setRuleDirectoryPath(ruleDirectoryPath);

			this._integrationTests.push(it);
		});
	}

	public setIntegrationTests(tests: IntegrationTest[]) : void {
		this._integrationTests = [];
		this.addIntegrationTests(tests);
	}

	public createIntegrationTest() : IntegrationTest {
		const newItTestNumber = this._integrationTests.length + 1;
		if(this.getDirectoryPath()) {
			return IntegrationTest.create(newItTestNumber, this.getDirectoryPath());
		}

		return IntegrationTest.create(newItTestNumber);
	}

	public async clearIntegrationTests() : Promise<void> {
		this._integrationTests = [];
	}

	public getIntegrationTests() : IntegrationTest[] {
		return this._integrationTests;
	}

	public reloadIntegrationTests() : void {
		this._integrationTests = [];

		const integrationTests = IntegrationTest.parseFromRuleDirectory(this.getDirectoryPath());
		this.addIntegrationTests(integrationTests);
	}

	public async saveIntegrationTests(ruleDirPath?: string) : Promise<void> {
		for (const it of this._integrationTests)  {
			if(ruleDirPath) {
				it.setRuleDirectoryPath(ruleDirPath);
			}
			
			await it.save();
		}
	}

	public getLocalizations() : Localization[] {
		return this._localizations;
	}
	
	public setLocalizationTemplates(localizations: Localization[]) : void {
		this._localizations = [];
		this.getMetaInfo().setEventDescriptions([]);
		localizations.forEach((loc) => {
			this.addLocalization(loc);
		});
	}

	public setLocalizationExamples(localizations: LocalizationExample[]) : void {
		this._localizationExamples = localizations;
	}

	public getLocalizationExamples() : LocalizationExample[] {
		return this._localizationExamples;
	}

	public setRuDescription(description: string) : void {
		this._ruDescription = description;
	}

	/// Описания правила.
	public setEnDescription(description: string) : void {
		this._enDescription = description;
	}

	public getRuDescription() : string {
		return this._ruDescription;
	}

	public getEnDescription() : string {
		return this._enDescription;
	}

	public async saveMetaInfoAndLocalizations() : Promise<void> {

		const fullPath = this.getDirectoryPath();
		// Обновление метаинформации.
		await this.getMetaInfo().save(fullPath);

		// Обновление локализаций.
		await this.saveLocalizationsImpl(fullPath);
	}

	protected async saveLocalizationsImpl(fullPath: string) : Promise<void> {

		if(!this.getRuDescription() && !this.getEnDescription()) {
			return;
		}

		const localizationDirPath = path.join(fullPath, Localization.LOCALIZATIONS_DIRNAME);
		if(!fs.existsSync(localizationDirPath)) {
			await fs.promises.mkdir(localizationDirPath, {recursive: true});
		}

		// Русские локализации
		const ruLocFullPath = this.getLocalizationPath(LocalizationLanguage.Ru, fullPath);
		const ruEventDescriptions = this._localizations.map( function(loc) {
			const locId = loc.getLocalizationId();
			if(!locId) {
				throw new XpException(`Ошибка целостности локализаций правила ${fullPath}, не задан localizationId`);
			}

			let ruText = loc.getRuLocalizationText();
			if(!ruText) {
				ruText = "";
			}
			
			return {
				"LocalizationId" : locId,
				"EventDescription" : ruText
			};
		});

		const writeRuLocalization = this.writeLocalizationToDisk(ruLocFullPath, ruEventDescriptions, this.getRuDescription());

		// Английские локализации
		const enLocFullPath = this.getLocalizationPath(LocalizationLanguage.En, fullPath);
		const enEventDescriptions = this._localizations.map( function(loc) {
			const locId = loc.getLocalizationId();
			if(!locId) {
				throw new XpException("Ошибка целостности локализации, не задан localizationId");
			}

			let enText = loc.getEnLocalizationText();
			if(!enText) {
				enText = "";
			}

			return {
				"LocalizationId" : locId,
				"EventDescription" : enText
			};
		});

		const writeEnLocalization = this.writeLocalizationToDisk(enLocFullPath, enEventDescriptions, this.getEnDescription());
		await Promise.all([writeRuLocalization, writeEnLocalization]);
	}

	private async writeLocalizationToDisk(localizationFullPath: string, eventDescriptions : any[], description : string) : Promise<void> {
		let localizationYamlContent : any;
		if(eventDescriptions.length != 0) {
			localizationYamlContent = YamlHelper.localizationsStringify({
				"Description" : description,
				"EventDescriptions" : eventDescriptions
			});
		} else {
			localizationYamlContent = YamlHelper.localizationsStringify({
				"Description" : description
			});
		}

		await FileSystemHelper.writeContentFileIfChanged(localizationFullPath, localizationYamlContent);
	}

	protected getLocalizationPath(localizationLanguage: LocalizationLanguage, fullPath : string) : string {

		const localizationDirPath = path.join(fullPath, Localization.LOCALIZATIONS_DIRNAME);
		switch (localizationLanguage) {
			case LocalizationLanguage.En: {
				return path.join(localizationDirPath, Localization.EN_LOCALIZATION_FILENAME);
			}

			case LocalizationLanguage.Ru: {
				return path.join(localizationDirPath, Localization.RU_LOCALIZATION_FILENAME);
			}
		}
	}

	private alreadyHaveSuchALocalization(localization : Localization) : boolean{
		const localizations = this.getLocalizations();
		for(const loc of localizations) {
			if (loc.getCriteria() === localization.getCriteria()) {
				return true;
			}
		}
		return false;
	}

	protected checkLocalizationConsistency(localizations: Localization[], metaInfo: MetaInfo) : boolean {
		const metaLocIds = metaInfo.getEventDescriptions().map((ed) => {
			return ed.getLocalizationId();
		});

		const localizationLocIds = localizations.map((loc) => {
			return loc.getLocalizationId();
		});

		return metaLocIds.sort().join('_') === localizationLocIds.sort().join('_');
	}

	/**
	 * Добавляет локализацию и нужную метаинформацию.
	 * @param localization новая локализация
	 */
	public addLocalization(localization : Localization): void {
		const metaInfo = this.getMetaInfo();

		// Если уже есть такая локализация
		if (this.alreadyHaveSuchALocalization(localization)){
			throw new XpException("Не могу добавить локализацию. Такой критерий уже присутствует.");
		}

		let locId = localization.getLocalizationId();

		// Локализация без идентификатора локализации - новая локализация. 
		if(locId) {
			// Если есть LocalizationId, тогда добавляем как есть.
			this._localizations.push(localization);
		} else {
			// Добавляем связку в виде LocalizationId
			locId = this.generateLocalizationId();
			localization.setLocalizationId(locId);

			// Дублируем описание в локализацию и добавляем её в новый список.
			localization.setRuDescription(this.getRuDescription());
			localization.setEnDescription(this.getEnDescription());
			this._localizations.push(localization);
		}

		// Добавляем в метаинформацию связку localizationId и criteria
		const eventDesc = new MetaInfoEventDescription();
		eventDesc.setCriteria(localization.getCriteria());
		eventDesc.setLocalizationId(locId);
		metaInfo.addEventDescriptions([eventDesc]);
	}
	

	/**
	 * Генерирует свободный идентификатор локализации
	 * @returns возвращает свободный идентификатор локализации
	 */
	private generateLocalizationId() : string {
		let name = this.getName();
		if(!name) { name = "name"; }

		const localizations = this.getLocalizations();

		if(localizations.length == 0) {
			return `${this.getLocalizationPrefix()}_${name}`;	
		} else {
			return `${this.getLocalizationPrefix()}_${name}_${localizations.length + 1}`;
		}
	}

	/**
	 * Возвращает путь к файлу правила, либо undefined.
	 * @returns возвращает путь к файлу правила. 
	 */
	public getRuleFilePath(): string {
		const directoryPath = this.getDirectoryPath();
		const fileName = this.getFileName();
		if(!directoryPath || !fileName) {
			return undefined;
		}

		return path.join(directoryPath, fileName);
	}

	/**
	 * Возвращает код правила из файла с диска или из памяти.
	 * @returns код правила.
	 */
	public async getRuleCode(): Promise<string> {
		const rulePath = this.getRuleFilePath();
		if(fs.existsSync(rulePath)) {
			this._ruleCode = await fs.promises.readFile(rulePath, this.getRuleEncoding());
			return this._ruleCode;
		}

		if(this._ruleCode) {
			return this._ruleCode;
		}

		return "";
	}


	/**
	 * Изменяет код правила в памяти и на диске, если правило уже сохранено.
	 * @param code новый код правила
	 */
	public setRuleCode(code: string): Promise<void> {
		if(code === undefined) {
			throw new XpException("Код правила не задан.");
		}
		
		this._ruleCode = code;

		// Меняем код правила на диске.
		const ruleFilePath = this.getRuleFilePath();
		if(fs.existsSync(ruleFilePath)) {
			return FileSystemHelper.writeContentFileIfChanged(ruleFilePath, code);
		}
	}

	public async save(fullPath?: string) : Promise<void> {
		throw new XpException("Сохранение данного типа контента не реализовано.");
	}

	public setStatus(status: ContentItemStatus, tooltip?: string) : void {

		this._status = status;
		const config = Configuration.get();
		const extensionResources = path.join(config.getExtensionPath(), 'resources');

		if(tooltip) {
			this.tooltip = tooltip;
		} else {
			// Задаем дефолтное значение подсказки, которая показывается при наведении.
			this.tooltip = this.getName();
		}

		switch (this._status) {
			case ContentItemStatus.Default: {
				this.iconPath = vscode.ThemeIcon.File;
				return;
			}

			case ContentItemStatus.Verified: {
				const iconPath = path.join(extensionResources, 'test-passed.svg');
				this.iconPath = { light: iconPath, dark: iconPath };
				return;
			}

			case ContentItemStatus.Unverified: {
				const iconPath = path.join(extensionResources, 'test-failed.svg');
				this.iconPath = { light: iconPath, dark: iconPath };
				return;
			}
			default: {
				throw new XpException(`Поддержка значения ${status} еще не реализована`);
			}
		}
	}
	

	private _localizations: Localization [] = [];
	private _localizationExamples : LocalizationExample [] = [];

	protected _unitTests: BaseUnitTest [] = [];
	protected _integrationTests : IntegrationTest [] = [];
	
	private _ruDescription : string;
	private _enDescription : string;

	private _status : ContentItemStatus;
	protected _ruleCode = "";

	contextValue = "BaseRule";

	public static TESTS_DIRNAME = `tests`;
}
