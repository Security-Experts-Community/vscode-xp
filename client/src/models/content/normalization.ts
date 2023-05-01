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
		this.setName(newName);
	}

	public async save(fullPath: string): Promise<void> {
		throw new Error('Method not implemented.');
	}

	private constructor(name: string, parentDirectoryPath?: string) {
		super(name, parentDirectoryPath);
		this.setFileName("formula.xp");
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