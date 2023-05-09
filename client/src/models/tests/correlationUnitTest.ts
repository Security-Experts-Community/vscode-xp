import * as path from "path";
import * as fs from 'fs';

import { UnitTestContentEditorViewProvider } from '../../views/unitTestEditor/unitTestEditorViewProvider';
import { BaseUnitTest } from './baseUnitTest';
import { FileSystemHelper } from '../../helpers/fileSystemHelper';
import { RuleBaseItem } from '../content/ruleBaseItem';
import { Correlation } from '../content/correlation';
import { XpException } from '../xpException';
import { Enrichment } from '../content/enrichment';
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

	public static fixStrings(rulePart: string): string {
		let data = rulePart.replace(/\r/gms, '');
		data = data.replace(/^\s*\n/gms, '');
		data = data.replace(/#(\S)/gms, '# $1');
		return data.trim();
	}

	public static readFromFile(filePath: string, rule: RuleBaseItem): CorrelationUnitTest {
		if (!fs.existsSync(filePath)){
			throw new XpException(`Невозможно создать тест. Файла ${filePath} нет на диске`);
		}		
		let testFileContent = fs.readFileSync(filePath, "utf8");
		testFileContent = TestHelper.compressTestCode(testFileContent);

		const unitTest = rule.createNewUnitTest();
		
		let inputData = "";

		const table_list_default =  /(?:^#.*$|\r?\n)*^table_list\s+default$/m.exec(testFileContent);
		if (table_list_default && table_list_default.length === 1) {
			inputData += '\n' + this.fixStrings(table_list_default[0]);
		}

		const table_list =  /(?:^#.*$|\r?\n)*^table_list\s+\{.*?\}$/m.exec(testFileContent);
		if (table_list && table_list.length === 1) {
			inputData += '\n' + this.fixStrings(table_list[0]);
		}

		let m: RegExpExecArray;
		const event_pattern = /(?:^#.*?$|\s)*(?:^\{.*?\}$)/gm;
		while((m = event_pattern.exec(testFileContent))) {
			inputData += '\n' + this.fixStrings(m[0]);
		}

		if (inputData && inputData !== '') {
			unitTest.setTestInputData(inputData.trim());
		}

		const pattern = /(?:^#.*$|\r?\n)*(?:^expect\s+(?:\d+|not)\s+\{.*?\}$)(?:\s*(?:^expect\s+(?:\d+|not)\s+\{.*?\}$))*/m;
		const expectation = pattern.exec(testFileContent);
		if(expectation && expectation.length === 1) {
			const expectedCondition = expectation[0].replace(unitTest.getDefaultInputData(), '');
			unitTest.setTestExpectation(this.fixStrings(expectedCondition));
		}

		unitTest.command = { 
			command: UnitTestContentEditorViewProvider.onTestSelectionChangeCommand,  
			title: "ModularTestContentEditorViewProvider.onTestSelectionChangeCommand", 
			arguments: [unitTest] 
		};

		return unitTest;
	}

	public static parseFromRuleDirectory(rule: Correlation | Enrichment) : CorrelationUnitTest [] {
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
		let testsFullPath : string;
		if(baseDirFullPath) {
			testsFullPath = path.join(baseDirFullPath, "tests");
		}

		for(let testNumber = 1; testNumber < CorrelationUnitTest.MAX_TEST_INDEX; testNumber++) {

			// Если задан путь к правилу
			if(testsFullPath) {
				const testFullPath = path.join(testsFullPath, `test_${testNumber}.sc`);
				if(fs.existsSync(testFullPath))
					continue;
			}

			const test = new CorrelationUnitTest(testNumber);
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
		// 	throw new XpException("Нельзя сохранять пустой тест");
		// }

		// Модульные тесты корреляций содержат условия и начальные данные в одном файле
		const minifiedTestInput = TestHelper.compressTestCode(this.getTestInputData());
		this.setTestInputData(minifiedTestInput);
		const mitifiedTestExpectation = TestHelper.compressTestCode(this.getTestExpectation());
		this.setTestExpectation(mitifiedTestExpectation);

		const fileContent = minifiedTestInput + '\n\n' + mitifiedTestExpectation;
		const filePath = this.getTestExpectationPath();
		
		return fs.writeFileSync(filePath, fileContent, FileSystemHelper._fileEncoding);
	}

	constructor(testNumber: number) {	
		super(testNumber);
	}

	public getTestExpectationPath() : string {
		return path.join(this.getTestsDirPath(), `test_${this.getNumber()}.sc`);
	}
	
	public getTestInputDataPath() : string {
		return "";
	}

	private static MAX_TEST_INDEX = 255;
}
