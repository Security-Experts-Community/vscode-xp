import * as path from "path";
import * as fs from 'fs';

import { UnitTestContentEditorViewProvider } from '../../views/unitTestEditor/unitTestEditorViewProvider';
import { BaseUnitTest } from './baseUnitTest';
import { FileSystemHelper } from '../../helpers/fileSystemHelper';
import { RuleBaseItem } from '../content/ruleBaseItem';
import { Correlation } from '../content/correlation';
import { XpException } from '../xpException';
import { Enrichment } from '../content/enrichment';
import { EnrichmentUnitTest } from './enrichmentUnitTest';
import { TestHelper } from '../../helpers/testHelper';

export class CorrelationUnitTest extends BaseUnitTest {

	public getDefaultExpectation(): string {
		return `# Тут будет твой тест. В секции expect укажи сколько и каких корреляционных событий ты ожидаешь\nexpect 1 {"correlation_name":"${this._rule.getName()}"}\n`;
	}

	public getDefaultInputData(): string {
		return `# Здесь укажи какие нормализованные события ты подаёшь на вход корреляци\n`;
	}

	public static containsInputData(fileContent) : boolean {
		const inputData = /(?:^\{.*?\}$)/gms.exec(fileContent);
		if (!inputData || inputData.length === 0) {
			return false;
		}
		return true;
	}

	public static containsExpectation(fileContent) : boolean {
		const expectation = /(?:^expect\s+(?:\d+|not)\s+\{.*?\}$)/gms.exec(fileContent);
		if (!expectation || expectation.length === 0){
			return false;
		}
		return true;
	}

	public static readFromFile(filePath: string, rule: RuleBaseItem): CorrelationUnitTest {
		if (!fs.existsSync(filePath)){
			throw new XpException(`Невозможно создать тест. Файла ${filePath} нет на диске`);
		}		
		let testFileContent = fs.readFileSync(filePath, "utf8");
		testFileContent = TestHelper.minifyTestCodeAndEvents(testFileContent);

		const unitTest = rule.createNewUnitTest();
		if (this.containsInputData(testFileContent)) {
			const pattern = /(?:^#.*$|\r?\n)*^(?:\{.*?\}$)(?:\s*(?:^\{.*?\}$))*/m;
			const inputData = pattern.exec(testFileContent);
			let data = inputData[0].replace(/\r/gms, '');
			data = data.replace(/^\s*\n/gms, '');
			data = data.replace(/#(\S)/gms, '# $1');
			unitTest.setTestInputData(data.trim());
		}
		
		if (this.containsExpectation(testFileContent)) {
			const pattern = /(?:^#.*$|\r?\n)*(?:table_list\s+default\r?\n)?(?:table_list\s+\{.*?\}\r?\n)?(?:^expect\s+(?:\d+|not)\s+\{.*?\}$)(?:\s*(?:^expect\s+(?:\d+|not)\s+\{.*?\}$))*/m;
			const expectation = pattern.exec(testFileContent);
			let data = expectation[0].replace(/\r/gms, '');
			data = data.replace(/^\s*\n/gms, '');
			data = data.replace(/#(\S)/gms, '# $1');
			unitTest.setTestExpectation(data.trim());
		}

		// TODO: возможно, в этом случае нужно предложить пользователю дефолтное заполнение
        if (unitTest.getTestExpectation() === unitTest.getDefaultExpectation()
         && unitTest.getTestInputData() === unitTest.getDefaultInputData()) {
            unitTest.setTestExpectation(testFileContent);
            unitTest.setTestInputData("");
        }	

		unitTest.command = { 
			command: UnitTestContentEditorViewProvider.onTestSelectionChangeCommand,  
			title: "ModularTestContentEditorViewProvider.onTestSelectionChangeCommand", 
			arguments: [unitTest] 
		};

		return unitTest;
	}

	public static parseFromRuleDirectory(rule: Correlation | Enrichment) : (CorrelationUnitTest | EnrichmentUnitTest) [] {
		const ruleDirectoryFullPath = rule.getDirectoryPath();
		const testsFullPath = path.join(ruleDirectoryFullPath, "tests");
		if (!fs.existsSync(testsFullPath)){
			return [];
		}

		const tests = fs.readdirSync(testsFullPath)
			.map(f => path.join(testsFullPath, f))
			.filter(f => f.endsWith(".sc"))
			.filter(f => fs.existsSync(f))
			.map((f, _) => {
				return CorrelationUnitTest.readFromFile(f, rule);
			})
			.filter((t): t is CorrelationUnitTest => !!t);

		return tests;
	}

	public static create(rule: RuleBaseItem) : CorrelationUnitTest {
		const baseDirFullPath = rule.getDirectoryPath();
		const testsFullPath = path.join(baseDirFullPath, "tests");

		for(let testNumber = 1; testNumber < CorrelationUnitTest.MaxTestIndex; testNumber++) {
			const testFullPath = path.join(testsFullPath, `test_${testNumber}.sc`);
			if(fs.existsSync(testFullPath))
				continue;

			const test = new CorrelationUnitTest();
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
			throw new Error("Не задан путь для сохранения.");
		}

		if(!this.getNumber()) {
			throw new Error("Для модульного теста не задан порядковый номер");
		}

		// if(!this.getTestExpectation()) {
		// 	throw new Error("Нельзя сохранять пустой тест");
		// }

		// Модульные тесты корреляций содержат условия и начальные данные в одном файле
		const minifiedTestInput = TestHelper.minifyTestCodeAndEvents(this.getTestInputData());
		this.setTestInputData(minifiedTestInput);
		const mitifiedTestExpectation = TestHelper.minifyTestCodeAndEvents(this.getTestExpectation());
		this.setTestExpectation(mitifiedTestExpectation);

		const fileContent = mitifiedTestExpectation + '\n\n' + minifiedTestInput;
		const filePath = this.getTestExpectationPath();
		
		return fs.writeFileSync(filePath, fileContent, FileSystemHelper._fileEncoding);
	}

	constructor() {
		super(1);
	}

	public getTestExpectationPath() : string {
		return path.join(this.getTestsDirPath(), `test_${this.getNumber()}.sc`);
	}
	
	public getTestInputDataPath() : string {
		return "";
	}

	private static MaxTestIndex = 255;
}