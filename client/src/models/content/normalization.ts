import * as path from "path";
import * as fs from "fs";

import { RuleBaseItem } from './ruleBaseItem';
import { MetaInfo } from '../metaInfo/metaInfo';
import { Localization } from './localization';
import { ContentTreeProvider } from '../../views/contentTree/contentTreeProvider';
import { BaseUnitTest } from '../tests/baseUnitTest';
import { NormalizationUnitTest } from '../tests/normalizationUnitTest';
import { UnitTestRunner } from '../tests/unitTestsRunner';
import { NormalizationUnitTestsRunner } from '../tests/normalizationUnitTestsRunner';
import { Configuration } from '../configuration';
import { UnitTestOutputParser } from '../tests/unitTestOutputParser';
import { NormalizationUnitTestOutputParser } from '../tests/normalizationUnitTestOutputParser';
import { FileSystemHelper } from '../../helpers/fileSystemHelper';
import { XPObjectType } from './xpObjectType';
import { ContentHelper } from '../../helpers/contentHelper';


export class Normalization extends RuleBaseItem {
	protected getLocalizationPrefix(): string {
		return "normalization";	
	}

	public clearUnitTests(): void {
		const testDirPath = this.getTestsPath();
		fs.readdirSync(testDirPath)
			.map(f => path.join(testDirPath, f))
			.filter(f => f.endsWith(".js")||f.endsWith(".txt"))
			.forEach(f => fs.unlinkSync(f));
	}

	public getUnitTestOutputParser(): UnitTestOutputParser {
		return new NormalizationUnitTestOutputParser();
	}

	public getUnitTestRunner(): UnitTestRunner {
		const outputParser = this.getUnitTestOutputParser();
		return new NormalizationUnitTestsRunner(Configuration.get(), outputParser);
	}

	public reloadUnitTests() : void {
		const unitTests = NormalizationUnitTest.parseFromRuleDirectory(this);
		this._unitTests = [];
		this.addUnitTests(unitTests);
	}
	
	public createNewUnitTest(): BaseUnitTest {
		return NormalizationUnitTest.create(this);
	}

	public convertUnitTestFromObject(object: any) : NormalizationUnitTest{
		return Object.assign(NormalizationUnitTest.create(this), object) as NormalizationUnitTest;
	}

	public async rename(newName: string): Promise<void> {
		const oldRuleName = this.getName();
		this.setName(newName);

		// Замена в критериях.
		this.getMetaInfo().getEventDescriptions().forEach(ed => {
			const criteria = ed.getCriteria();
			const newCriteria = ContentHelper.replaceAllRuleNamesWithinString(oldRuleName, newName, criteria);
			ed.setCriteria(newCriteria);

			const localizationId = ed.getLocalizationId();
			const newLocalizationId = ContentHelper.replaceAllRuleNamesWithinString(oldRuleName, newName, localizationId);
			ed.setLocalizationId(newLocalizationId);
		});

		this.getUnitTests().forEach(
			unitTest => {
				const testExpectation = unitTest.getTestExpectation();
				const newTestExpectation = ContentHelper.replaceAllRuleNamesWithinString(oldRuleName, newName, testExpectation);
				unitTest.setTestExpectation(newTestExpectation);				
				const testInputData = unitTest.getTestInputData();
				const newTestInputData = ContentHelper.replaceAllRuleNamesWithinString(oldRuleName, newName, testInputData);
				unitTest.setTestInputData(newTestInputData);
			}
		);

		// Замена в правилах локализации
		this.getLocalizations().forEach(
			loc => {
				const localizationId = loc.getLocalizationId();
				const newLocalizationId = ContentHelper.replaceAllRuleNamesWithinString(oldRuleName, newName, localizationId);
				loc.setLocalizationId(newLocalizationId);
			}
		);
	}

	public async save(parentFullPath: string): Promise<void> {
		// Путь либо передан как параметр, либо он уже задан в правиле.
		let rulePath = "";
		if (parentFullPath) {
			rulePath = path.join(parentFullPath, this._name);
			this.setParentPath(parentFullPath);
		} else {
			const parentPath = this.getParentPath();
			if (!parentPath) {
				throw new Error("Не задан путь для сохранения нормализации.");
			}
			rulePath = this.getDirectoryPath();
		}

		if (!fs.existsSync(rulePath)) {
			await fs.promises.mkdir(rulePath, {recursive: true});
		}

		const ruleFullPath = path.join(rulePath, this.getFileName());
		if (this._ruleCode) {
			await FileSystemHelper.writeContentFile(ruleFullPath, this._ruleCode);
		} else {
			await FileSystemHelper.writeContentFile(ruleFullPath, "");
		}

		await this.getMetaInfo().save(rulePath);
		await this.saveLocalizationsImpl(rulePath);
		await this.saveIntegrationTests(rulePath);
		await this.saveUnitTests();
	}

	private constructor(name: string, parentDirectoryPath?: string) {
		super(name, parentDirectoryPath);
		this.setFileName("formula.xp");
	}

	public getObjectType(): string {
		return XPObjectType.Normalization;
	}

	public static async parseFromDirectory(directoryPath: string, fileName?: string): Promise<Normalization> {

		// Получаем имя корреляции и родительский путь.
		const name = path.basename(directoryPath);
		const parentDirectoryPath = path.dirname(directoryPath);

		const normalization = new Normalization(name, parentDirectoryPath);

		// Если явно указано имя файла, то сохраняем его.
		// Иначе используем заданное в конструкторе
		if (fileName) {
			normalization.setFileName(fileName);
		}

		// Парсим основные метаданные.
		const metaInfo = MetaInfo.fromFile(directoryPath);
		normalization.setMetaInfo(metaInfo);

		// Парсим описания на разных языках.
		const ruDescription = await Localization.parseRuDescription(directoryPath);
		normalization.setRuDescription(ruDescription);

		const enDescription = await Localization.parseEnDescription(directoryPath);
		normalization.setEnDescription(enDescription);

		const localizations = Localization.parseFromDirectory(directoryPath);
			localizations.forEach((loc) => {
				normalization.addLocalization(loc);
			});

		const unitTests = NormalizationUnitTest.parseFromRuleDirectory(normalization);
		normalization.addUnitTests(unitTests);

		// Добавляем команду, которая пробрасываем параметром саму рубрику.
		normalization.setCommand({
			command: ContentTreeProvider.onRuleClickCommand,
			title: "Open File",
			arguments: [normalization]
		});

		return normalization;
	}

	contextValue = 'Normalization';
}