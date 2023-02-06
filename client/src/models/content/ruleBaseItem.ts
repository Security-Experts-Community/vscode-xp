import * as path from "path";
import * as yaml from 'yaml';
import * as fs from 'fs';

import { MetaInfo } from '../metaInfo/metaInfo';
import { Localization, LocalizationLanguage } from './localization';
import { CorrelationUnitTest } from '../tests/correlationUnitTest';
import { MetaInfoEventDescription } from '../metaInfo/metaInfoEventDescription';
import { IntegrationTest } from '../tests/integrationTest';
import { KbTreeBaseItem } from './kbTreeBaseItem';
import { FileSystemError } from 'vscode';
import { FileSystemHelper } from '../../helpers/fileSystemHelper';
import { Configuration } from '../configuration';
import { KbHelper } from '../../helpers/kbHelper';
import { ContentHelper } from '../../helpers/contentHelper';
import { ArgumentException } from '../argumentException';
import { XpExtentionException } from '../xpException';
import { ContentType } from '../../contentType/contentType';

/**
 * Базовый класс для всех правил.
 */
export abstract class RuleBaseItem extends KbTreeBaseItem {

	constructor(name: string, parentDirectoryPath? : string) {
		super(name);
		this._parentPath = parentDirectoryPath;
	}

	public static getRuleDirectoryPath(parentDirPath : string, ruleName : string ) : string {
		if(!parentDirPath) {
			throw new ArgumentException(`Не задан путь к директории правила.`);
		}

		if(!ruleName) {
			throw new ArgumentException(`Не задано имя корреляции.`);
		}

		return path.join(parentDirPath, ruleName);
	}

	public getDirectoryPath() : string {
		if(!this._parentPath) {
			throw new XpExtentionException(`Не задан путь к директории правила '${this.getName()}'.`);
		}

		return path.join(this._parentPath, this.getName());
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
		const kbPaths = config.getPathHelper();
		const roots = kbPaths.getContentRoots().map(folder => {return path.basename(folder);});
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

		throw new Error(`Путь к правилу '${this.getName()}' не содержит ни одну из корневых директорий: [${roots.join(", ")}].`);
	}

	public getContentRoot(config: Configuration): string{
		if(!this._parentPath) {
			throw new ArgumentException(`Не задан путь к директории правила '${this.getName()}'.`);
		}

		const pathEntities = this.getDirectoryPath().split(path.sep);
		const kbPaths = config.getPathHelper();
		const roots = kbPaths.getContentRoots().map(folder => {return path.basename(folder);});
		for (const root of roots){
			const  packagesDirectoryIndex = pathEntities.findIndex( pe => pe.toLocaleLowerCase() === root);
			if(packagesDirectoryIndex === -1){
				continue;
			}

			// Удаляем лишние элементы пути и собираем результирующий путь.
			pathEntities.splice(packagesDirectoryIndex + 1);
			const packageDirectoryPath = pathEntities.join(path.sep);
			return packageDirectoryPath;
		}

		throw new Error(`Путь к правилу '${this.getName()}' не содержит ни одну из корневых директорий: [${roots.join(", ")}].`);
	}

	public getMetaInfoFilePath(): string {
		return path.join(this.getDirectoryPath(), "metainfo.yaml");
	}

	public setMetaInfo(metaInfo : MetaInfo) {
		this._metaInfo = metaInfo;
	}

	public async saveModularTests(ruleFullPath?: string) : Promise<void> {

		if(!ruleFullPath) {
			ruleFullPath = this.getDirectoryPath();
		}

		// Создаем или очищаем директорию с тестами.
		const testDirPath = path.join(ruleFullPath, "tests");
		if(!fs.existsSync(testDirPath)) {
			await fs.promises.mkdir(testDirPath);
		} else {
			// Удаляем все модульные тесты, оставляя интеграционные.
			(await fs.promises.readdir(testDirPath))
				.map(f => path.join(testDirPath, f))
				.filter(f => f.endsWith(".sc"))
				.forEach(f => fs.unlinkSync(f));
		}

		// Сохраняем тесты и перезаписываем.
		this._modularTests.forEach( async (mt, index) => {
			mt.setNumber(index + 1);
			await mt.save(testDirPath);
		});
	}

	/**
	 * Добавляет модульные тесты к правилу.
	 * @param tests модульные тесты
	 */
	public addModularTests(tests: CorrelationUnitTest[]) : void {
		const startIndex = this._modularTests.length;
		
		tests.forEach( (t, index) => {
			t.setRuleDirectoryPath(this.getDirectoryPath());

			const newNumber = index + startIndex + 1;
			t.setNumber(newNumber);

			this._modularTests.push(t);
		});
	}

	public setModularTests(tests: CorrelationUnitTest[]) : void {
		this._modularTests = [];
		tests.forEach( (t, index) => {
			t.setRuleDirectoryPath(this.getDirectoryPath());

			const newNumber = index + 1;
			t.setNumber(newNumber);

			this._modularTests.push(t);
		});
	}

	/**
	 * Получает модульные тесты правила.
	 * @returns модульные тесты.
	 */
	public getModularTests() : CorrelationUnitTest[] {
		return this._modularTests;
	}

	public reloadModularTests() : void {
		const modularTests = CorrelationUnitTest.parseFromRuleDirectory(this.getDirectoryPath(), this);
		this._modularTests = [];
		this.addModularTests(modularTests);
	}

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
		const newTest = IntegrationTest.create(this._integrationTests.length + 1, this.getDirectoryPath());
		return newTest;
	}

	public async clearIntegrationTests() : Promise<void> {
		this._integrationTests.forEach( (it) => {
			it.remove();
		});

		this._integrationTests = [];
	}

	public getIntegrationTests() : IntegrationTest [] {
		return this._integrationTests;
	}

	public reloadIntegrationalTests() : void {
		this._integrationTests = [];

		const integrationTests = IntegrationTest.parseFromRuleDirectory(this.getDirectoryPath());
		this.addIntegrationTests(integrationTests);
	}

	public async saveIntegrationTest(ruleDirPath?: string) : Promise<void> {
		for (const it of this._integrationTests)  {
			if(ruleDirPath) {
				it.setRuleDirectoryPath(ruleDirPath);
			}
			
			await it.save();
		}
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

	public getLocalizations() : Localization[] {
		return this._localizations;
	}

	public async saveLocalizations() : Promise<void> {

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

		const localizationDirPath = path.join(fullPath, "i18n");
		if(!fs.existsSync(localizationDirPath)) {
			await fs.promises.mkdir(localizationDirPath);
		}

		// Русские локализации
		const ruLocFullPath = this.getLocalizationPath(LocalizationLanguage.Ru, fullPath);
		const ruEventDescriptions = this._localizations.map( function(loc) {
			const locId = loc.getLocalizationId();
			if(!locId) {
				throw new Error("Ошибка целостности локализаций правила, не задан localizationId");
			}

			const ruText = loc.getRuLocalizationText();
			if(!ruText) {
				throw new Error("Ошибка целостности локализаций правила, не задана русская локализация");
			}
			
			return {
				"LocalizationId" : locId,
				"EventDescription" : loc.getRuLocalizationText()
			};
		});

		const ruLocalizationYamlContent = yaml.stringify({
			"Description" : this.getRuDescription(),
			"EventDescriptions" : ruEventDescriptions
		});

		await FileSystemHelper.writeContentFile(ruLocFullPath, ruLocalizationYamlContent);

		// Английские локализации
		const enLocFullPath = this.getLocalizationPath(LocalizationLanguage.En, fullPath);
		const enEventDescriptions = this._localizations.map( function(loc) {
			const locId = loc.getLocalizationId();
			if(!locId) {
				throw new Error("Ошибка целостности локализации, не задан localizationId");
			}

			const enText = loc.getEnLocalizationText();
			if(!enText) {
				throw new Error("Ошибка целостности локализации, не задана английская локализация");
			}

			return {
				"LocalizationId" : locId,
				"EventDescription" : enText
			};
		});

		const enLocalizationYamlContent = yaml.stringify({
			"Description" : this.getEnDescription(),
			"EventDescriptions" : enEventDescriptions
		});

		await FileSystemHelper.writeContentFile(enLocFullPath, enLocalizationYamlContent);
	}

	protected getLocalizationPath(localizationLanguage: LocalizationLanguage, fullPath : string) : string {

		const localizationDirPath = path.join(fullPath, "i18n");
		switch (localizationLanguage) {
			case LocalizationLanguage.En: {
				return path.join(localizationDirPath, "i18n_en.yaml" );
			}

			case LocalizationLanguage.Ru: {
				return path.join(localizationDirPath, "i18n_ru.yaml" );
			}
		}
	}

	/**
	 * Обновляет (удаляет, добавляет) локализации и нужную метаинформации.
	 * @param localizations новые локализации
	 */
	public updateLocalizations(localizations : Localization[]) {

		// Очищаем все метаданные о локализациях.
		const metaInfo = this.getMetaInfo();
		metaInfo.clearEventDescriptions();

		const updatedLocalizations : Localization[] = [];
		for (const localization of localizations) {

			let locId = localization.getLocalizationId();

			// Локализация без индетификатора локализации - новая локализация. 
			if(locId) {
				// Если есть LocalizationId, тогда добавляем как есть.
				updatedLocalizations.push(localization);
			} else {
				locId = this.generateLocalizationId(updatedLocalizations);

				// Добавляем связку в виде LocalizationId
				localization.setLocalizationId(locId);
	
				// Дублируем описание в локализацию и добавляем её в новый список.
				localization.setRuDescription(this.getRuDescription());
				localization.setEnDescription(this.getEnDescription());
				updatedLocalizations.push(localization);
			}

			// Добавляем в метаинформацию связку localizationId и criteria
			const eventDesc = new MetaInfoEventDescription();
			eventDesc.setCriteria(localization.getCriteria());
			eventDesc.setLocalizationId(locId);

			metaInfo.getEventDescriptions().push(eventDesc);
		}

		this._localizations = updatedLocalizations;
	}


	/**
	 * Генерирует свободный идентификатор локализации
	 * @returns возвращает свободный идентификатор локализации
	 */
	private generateLocalizationId(updatedLocalizations : Localization []) : string {

		let name = this.getName();
		if(!name) {
			name = "name";
		}

		if(updatedLocalizations.length == 0) {
			return `corrname_${name}`;	
		} else {
			const locNumber: number = updatedLocalizations.length;
			return `corrname_${name}_${locNumber}`;
		}
	}
	
	// Метаданные.
	public getMetaInfo() : MetaInfo {
		return this._metaInfo;
	}

	public getRuleFilePath(): string {
		return path.join(this.getDirectoryPath(), this.getRuleFileName());
	}

	/**
	 * Возвращает код правила из файла с диска или из памяти.
	 * @returns код правила.
	 */
	public async getRuleCode(): Promise<string> {
		const rulePath = this.getRuleFilePath();
		if(fs.existsSync(rulePath)) {
			return fs.promises.readFile(rulePath, this.getRuleEncoding());
		}

		if(this._ruleCode) {
			return this._ruleCode;
		}

		throw new XpExtentionException("Отсутствует код правила.");
	}

	public setRuleFileName(fileName: string) {
		this._fileName = fileName;
	}

	public getRuleFileName() : string {
		return this._fileName;
	}

	public async save(fullPath?: string) : Promise<void> {
		throw new XpExtentionException("Сохранение данного типа контента не реализовано.");
	}

	public setParentPath(parentPath: string) : void{
		this._parentPath = parentPath;
	}

	public getParentPath() : string{
		return this._parentPath;
	}

	public setRuleCode(text: string): void {
		this._ruleCode = text;
	}

	protected _metaInfo: MetaInfo = new MetaInfo();

	protected _localizations: Localization [] = [];

	// Тесты
	protected _modularTests: CorrelationUnitTest [] = [];
	protected _integrationTests : IntegrationTest [] = [];
	
	private _parentPath: string;
	private _ruDescription : string;
	private _enDescription : string;

	protected _ruleCode : string;
	private _fileName: string;
}