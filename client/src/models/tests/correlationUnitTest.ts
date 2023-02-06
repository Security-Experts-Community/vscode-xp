import * as path from "path";
import * as fs from 'fs';

import { ModularTestContentEditorViewProvider } from '../../views/modularTestsEditor/modularTestContentEditorViewProvider';
import { BaseUnitTest } from './baseUnitTest';
import { FileSystemHelper } from '../../helpers/fileSystemHelper';
import { RuleBaseItem } from '../content/ruleBaseItem';

export class CorrelationUnitTest extends BaseUnitTest {

	public static parseFromRuleDirectory(ruleDirectoryFullPath: string, rule: RuleBaseItem) : CorrelationUnitTest [] {
		const testsFullPath = path.join(ruleDirectoryFullPath, "tests");

		// Тестов нет.
		if(!fs.existsSync(testsFullPath)) {
			return [];
		}

		const ruleFileName = rule.getRuleFileName();

		const tests = fs.readdirSync(testsFullPath)
			.map(f => path.join(testsFullPath, f))
			.filter(f => f.endsWith(".sc"))
			.filter(f => fs.existsSync(f))
			.map((f, index) => {
				const code = fs.readFileSync(f, "utf8");

				const test = new CorrelationUnitTest();
				test.setRuleDirectoryPath(ruleDirectoryFullPath);
				test.setTestCode(code);
				test.setRuleFileName(ruleFileName);
				test.setRule(rule);
				
				test.command = { 
					command: ModularTestContentEditorViewProvider.onTestSelectionChangeCommand,  
					title: "Open File", 
					arguments: [test] 
				};
				return test;
			});

		return tests;
	}

	public static create(baseDirFullPath: string, rule: RuleBaseItem) : CorrelationUnitTest {
		const testsFullPath = path.join(baseDirFullPath, "tests");

		for(let testNumber = 1; testNumber < CorrelationUnitTest.MaxTestIndex; testNumber++) {
			const testFullPath = path.join(testsFullPath, `test_${testNumber}.sc`);
			if(fs.existsSync(testFullPath))
				continue;

			const test = new CorrelationUnitTest();
			test.setTestCode(
`# Тут будет твой тест.
expect 1 {}`);

			test.setRuleDirectoryPath(baseDirFullPath);
			test.setRuleFileName(rule.getRuleFileName());
			test.setRule(rule);

			test.command = { 
				command: ModularTestContentEditorViewProvider.onTestSelectionChangeCommand,  
				title: "Open File", 
				arguments: [test] 
			};
			return test;
		}
	}

	public async save(testsDirFullPath?: string) : Promise<void> {

		if(!testsDirFullPath && !this.getRuleDirectoryPath()) {
			throw new Error("Не задан путь для сохранения.");
		}

		if(!this.getNumber()) {
			throw new Error("Для модульного теста не задан порядковый номер");
		}

		const testCode = this.getTestCode();
		if(!testCode) {
			throw new Error("Нельзя сохранять пустой тест");
		}

		// test_1.sc
		let fullTestPath : string;
		if(testsDirFullPath) {
			fullTestPath = path.join(testsDirFullPath, `test_${this.getNumber()}.sc`);
		} 

		// Пишем в ранее заданный путь.
		FileSystemHelper.writeContentFile(fullTestPath, testCode);
	}

	constructor() {
		super(1);
	}

	public getTestPath() : string {
		return path.join(this.getTestsDirPath(), `test_${this.getNumber()}.sc`);
	}

	public setRule(rule: RuleBaseItem){
		this._rule = rule;
	}

	public getRule(): RuleBaseItem{
		return this._rule;
	}

	private _rule: RuleBaseItem;
	private static MaxTestIndex = 255;
}