import * as fs from 'fs';
import * as path from "path";

import { UnitTestContentEditorViewProvider } from '../../views/unitTestEditor/unitTestEditorViewProvider';
import { BaseUnitTest } from './baseUnitTest';
import { FileSystemHelper } from '../../helpers/fileSystemHelper';
import { Normalization } from '../content/normalization';
import { XpException } from '../xpException';

export class NormalizationUnitTest extends BaseUnitTest {
	public getDefaultExpectation(): string {
		return `{}`;
	}

	public getDefaultInputData(): string {
		return `# Здесь укажи какое сырое событие (одно) ты подаёшь на вход правилу нормализации.\n`;
	}

	public static parseFromRuleDirectory(rule: Normalization) : NormalizationUnitTest [] {
		
		const ruleDirectoryFullPath = rule.getDirectoryPath();
		const testsFullPath = path.join(ruleDirectoryFullPath, "tests");
		if (!fs.existsSync(testsFullPath)){
			return [];
		}
		const tests = fs.readdirSync(testsFullPath)
			.map(f => path.join(testsFullPath, f))
			.filter(f => f.endsWith(".js"))
			.filter(f => fs.existsSync(f))
			.map((f, _) => {
				const expectedNormalizedEvent = fs.readFileSync(f, "utf8");
				const regex = /norm_(\d+)\.js/.exec(f);
				if (regex && regex.length > 0) {
					const index = parseInt(regex[1]);
					
					const unitTest = NormalizationUnitTest.create(index, rule);
					unitTest.setTestExpectation(expectedNormalizedEvent);
					
					const rawEventFileName = `raw_${index}.txt`;
					const rawEventFilePath = path.join(unitTest.getTestsDirPath(), rawEventFileName);
					if(!fs.existsSync(rawEventFilePath)) {
						console.error(`Повреждены файлы тестов, не найден файл '${rawEventFilePath}'`);
						return;
					}

					const rawEvent = FileSystemHelper.readContentFileSync(rawEventFilePath);
					unitTest.setTestInputData(rawEvent);

					unitTest.command = { 
						command: UnitTestContentEditorViewProvider.onTestSelectionChangeCommand,  
						title: "ModularTestContentEditorViewProvider.onTestSelectionChangeCommand", 
						arguments: [unitTest] 
					};

					return unitTest;
				}
			})
			// Сортируем тесты, ибо в противном случае сначала будет 1, потом 10 и т.д.
			.sort((a, b) => a.getNumber() - b.getNumber());

		return tests;
	}

	public static convertFromObject(object: any) : NormalizationUnitTest {
		return Object.assign(new NormalizationUnitTest(1), object) as NormalizationUnitTest;
	}

	public static create(number: number, rule : Normalization) : NormalizationUnitTest {
		const baseDirFullPath = rule.getDirectoryPath();

		const test = new NormalizationUnitTest(number);
		test.setRule(rule);
		test.setTestExpectation(test.getDefaultExpectation());
		test.setTestInputData(test.getDefaultInputData());

		test.command = { 
			command: UnitTestContentEditorViewProvider.onTestSelectionChangeCommand,  
			title: "Open File", 
			arguments: [test] 
		};
		return test;
	}


	public static createFromExistFile(rule : Normalization) : NormalizationUnitTest {
		const baseDirFullPath = rule.getDirectoryPath();
		const testsFullPath = path.join(baseDirFullPath, "tests");

		for(let testNumber = 1; testNumber < NormalizationUnitTest.MaxTestIndex; testNumber++) {
			const testFullPath = path.join(testsFullPath, `norm_${testNumber}.js`);
			if(fs.existsSync(testFullPath))
				continue;

			const test = new NormalizationUnitTest(testNumber);
			test.setRule(rule);
			test.setTestExpectation(test.getDefaultExpectation());
			test.setTestInputData(test.getDefaultInputData());

			test.command = { 
				command: UnitTestContentEditorViewProvider.onTestSelectionChangeCommand,  
				title: "Open File", 
				arguments: [test] 
			};
			return test;
		}
	}

	public async save() : Promise<void> {
		if(!this.getTestsDirPath()) {
			throw new XpException("Не задан путь для сохранения.");
		}

		if(!this.getNumber()) {
			throw new XpException("Для модульного теста не задан порядковый номер");
		}

		// if(!this.getTestExpectation()) {
		// 	throw new Error("Нельзя сохранять пустой тест");
		// }

		// if(!this.getTestInputData()){
		// 	throw new Error("Нельзя сохранять тест без входных данных");
		// }
	
		await FileSystemHelper.writeContentFileIfChanged(
			this.getTestInputDataPath(),
			this.getTestInputData()
		);

		await FileSystemHelper.writeContentFileIfChanged(
			this.getTestExpectationPath(),
			this.getTestExpectation()
		);
	}

	public getTestExpectationPath() : string {
		return path.join(this.getTestsDirPath(), `norm_${this.getNumber()}.js`);
	}

	public getTestInputDataPath() : string {
		return path.join(this.getTestsDirPath(), `raw_${this.getNumber()}.txt`);
	}

	protected constructor(number = 0) {
		super(number);
	}
	
	private static MaxTestIndex = 255;
}