import * as path from "path";
import * as fs from "fs";

import { RuleBaseItem } from './ruleBaseItem';
import { MetaInfo } from '../metaInfo/metaInfo';
import { CorrelationUnitTest } from '../tests/correlationUnitTest';
import { ContentTreeProvider } from '../../views/contentTree/contentTreeProvider';
import { FileSystemHelper } from '../../helpers/fileSystemHelper';
import { Configuration } from '../configuration';
import { KbHelper } from '../../helpers/kbHelper';
import { IntegrationTest } from '../tests/integrationTest';
import { ContentHelper } from '../../helpers/contentHelper';
import { BaseUnitTest } from '../tests/baseUnitTest';
import { UnitTestRunner } from '../tests/unitTestsRunner';
import { UnitTestOutputParser } from '../tests/unitTestOutputParser';
import { EnrichmentUnitTest } from '../tests/enrichmentUnitTest';
import { CorrelationUnitTestOutputParser } from '../tests/correlationUnitTestOutputParser';
import { CorrelationUnitTestsRunner } from '../tests/correlationUnitTestsRunner';

/**
 * Обогащение
 */
export class Enrichment extends RuleBaseItem {

	public clearUnitTests(): void {
		const testDirPath = this.getTestsPath();
		fs.readdirSync(testDirPath)
			.map(f => path.join(testDirPath, f))
			.filter(f => f.endsWith(".sc"))
			.forEach(f => fs.unlinkSync(f));
	}

	public getUnitTestOutputParser(): UnitTestOutputParser {
		return new CorrelationUnitTestOutputParser();
	}

	public getUnitTestRunner(): UnitTestRunner {
		const outputParser = this.getUnitTestOutputParser();
		return new CorrelationUnitTestsRunner(Configuration.get(), outputParser);
	}
	public reloadUnitTests() : void {
		const unitTests = CorrelationUnitTest.parseFromRuleDirectory(this);
		this._unitTests = [];
		this.addUnitTests(unitTests);
	}
	public createNewUnitTest(): BaseUnitTest {
		return CorrelationUnitTest.create(this);
	}

	public convertUnitTestFromObject(object: any) : CorrelationUnitTest{
		return Object.assign(CorrelationUnitTest.create(this), object) as CorrelationUnitTest;
	}

	protected getLocalizationPrefix(): string {
		return "enrichment";
	}

	public async save(parentFullPath?: string): Promise<void> {
		// Путь либо передан как параметр, либо он уже задан в правиле.
		let directoryFullPath = "";
		if (parentFullPath) {
			directoryFullPath = path.join(parentFullPath, this._name);
			this.setParentPath(parentFullPath);
		} else {
			directoryFullPath = this.getDirectoryPath();
		}

		if (!fs.existsSync(directoryFullPath)) {
			await fs.promises.mkdir(directoryFullPath);
		}

		const ruleFullPath = path.join(directoryFullPath, this.getFileName());
		await FileSystemHelper.writeContentFile(ruleFullPath, this._ruleCode);

		await this.getMetaInfo().save(directoryFullPath);
		await this.saveLocalizationsImpl(directoryFullPath);
		await this.saveIntegrationTests();
	}

	public async rename(newRuleName: string): Promise<void> {

		// Старые значения.
		const oldRuleName = this.getName();

		// Переименовываем директорию с правилом
		const parentDirectoryPath = this.getParentPath();

		let newRuleDirectoryPath : string;
		if(parentDirectoryPath && fs.existsSync(parentDirectoryPath)) {
			newRuleDirectoryPath = path.join(parentDirectoryPath, newRuleName);

			// Переименовываем в коде правила.
			const ruleCode = await this.getRuleCode();
			
			// Модифицируем код, если он есть
			if (ruleCode) {			
				const newRuleCode = ContentHelper.replaceAllEnrichmentNameWithinCode(newRuleName, ruleCode);
				this.setRuleCode(newRuleCode);
			}
		}

		// В метаинформации.
		const metainfo = this.getMetaInfo();
		metainfo.setName(newRuleName);

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
			integrationTest => {
				const testCode = integrationTest.getTestCode();
				const newTestCode = ContentHelper.replaceAllRuleNamesWithinString(oldRuleName, newRuleName, testCode);
				integrationTest.setTestCode(newTestCode);
			}
		);

		this.getUnitTests().forEach( 
			unitTest => {
				const testCode = unitTest.getTestExpectation();
				const newTestCode = ContentHelper.replaceAllRuleNamesWithinString(oldRuleName, newRuleName, testCode);
				unitTest.setTestExpectation(newTestCode);
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

	private constructor(name: string, parentDirectoryPath? : string) {
		super(name, parentDirectoryPath);
		this.setFileName("rule.en");
	}

	public static create(name: string, parentPath?: string, fileName?: string): Enrichment {
		const rule = new Enrichment(name, parentPath);

		// Если явно указано имя файла, то сохраняем его.
		// Иначе используем заданное в конструкторе
		if (fileName) {
			rule.setFileName(fileName);
		}

		const metainfo = rule.getMetaInfo();
		metainfo.setName(name);

		// Берем модуль, потому что crc32 может быть отрицательным.
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

	public static async parseFromDirectory(directoryPath: string, fileName?: string): Promise<Enrichment> {
		// Получаем имя корреляции и родительский путь.
		const name = path.basename(directoryPath);
		const parentDirectoryPath = path.dirname(directoryPath);

		const enrichment = new Enrichment(name, parentDirectoryPath);

		// Если явно указано имя файла, то сохраняем его.
		// Иначе используем заданное в конструкторе
		if (fileName) {
			enrichment.setFileName(fileName);
		}

		// Парсим основные метаданные.
		const metaInfo = MetaInfo.fromFile(directoryPath);
		enrichment.setMetaInfo(metaInfo);

		const modularTest = EnrichmentUnitTest.parseFromRuleDirectory(enrichment);
		enrichment.addUnitTests(modularTest);

		const integrationalTests = IntegrationTest.parseFromRuleDirectory(directoryPath);
		enrichment.addIntegrationTests(integrationalTests);

		// Добавляем команду, которая пробрасываем параметром саму рубрику.
		enrichment.setCommand({
			command: ContentTreeProvider.onRuleClickCommand,
			title: "Open File",
			arguments: [enrichment]
		});

		return enrichment;
	}

	contextValue = 'Enrichment';
}
