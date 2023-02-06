import * as path from "path";
import * as fs from 'fs';

import { ModularTestContentEditorViewProvider } from '../../views/modularTestsEditor/modularTestContentEditorViewProvider';
import { BaseUnitTest } from './baseUnitTest';
import { FileSystemHelper } from '../../helpers/fileSystemHelper';

export class NormalizationUnitTest extends BaseUnitTest {

	public static parseFromRuleDirectory(ruleDirectoryFullPath: string, ruleFileName : string) : NormalizationUnitTest [] {
		const testsFullPath = path.join(ruleDirectoryFullPath, "tests");

		const tests = fs.readdirSync(testsFullPath)
			.map(f => path.join(testsFullPath, f))
			.filter(f => f.endsWith(".js"))
			.filter(f => fs.existsSync(f))
			.map((f, index) => {
				const code = fs.readFileSync(f, "utf8");
				const test = NormalizationUnitTest.parse(index + 1, ruleDirectoryFullPath,	code, ruleFileName);
				return test;
			});

		return tests;
	}

	public static parse(number: number, ruleDirectoryFullPath: string,code: string, ruleFileName : string) : NormalizationUnitTest {
		const test = new NormalizationUnitTest(number);

		// Общая информация по правилу.
		test.setRuleDirectoryPath(ruleDirectoryFullPath);
		test.setRuleFileName(ruleFileName);
		test.setTestCode(code);

		// Получаем файл с сырыми событиями.
		const rawEventFileName = `raw_${number}.txt`;
		const rawEventFilePath = path.join(test.getTestsDirPath(), rawEventFileName);

		if(!fs.existsSync(rawEventFilePath)) {
			console.error(`Повреждены файлы тестов, не найден файл '${rawEventFilePath}'`);
			return;
		}

		const rawEvent = FileSystemHelper.readContentFileSync(rawEventFilePath);
		test.setRawEvents(rawEvent);

		test.command = { 
			command: ModularTestContentEditorViewProvider.onTestSelectionChangeCommand,  
			title: "ModularTestContentEditorViewProvider.onTestSelectionChangeCommand", 
			arguments: [test] 
		};
		return test;
	}

	public static create(baseDirFullPath: string, ruleFileName : string) : NormalizationUnitTest {
		const testsFullPath = path.join(baseDirFullPath, "tests");

		for(let testNumber = 1; testNumber < NormalizationUnitTest.MaxTestIndex; testNumber++) {
			const testFullPath = path.join(testsFullPath, `test_${testNumber}.sc`);
			if(fs.existsSync(testFullPath))
				continue;

			const test = new NormalizationUnitTest(testNumber);
			test.setTestCode(`# Тут будет твой тест.`);

			test.setRuleDirectoryPath(baseDirFullPath);
			test.setRuleFileName(ruleFileName);

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

		if(!this.getNumber()) {
			throw new Error("Нельзя сохранять пустой тест");
		}

		// test_1.sc
		let fullTestPath : string;
		if(testsDirFullPath) {
			fullTestPath = path.join(testsDirFullPath, `test_${this.getNumber()}.sc`);
		} 

		// Пишем в ранее заданный путь.
		FileSystemHelper.writeContentFile(fullTestPath, this.getTestCode());
	}

	public setRawEvents(rawEvent: string) : void {
		this._rawEvents = rawEvent;
	}

	public getRawEvents() : string {
		return this._rawEvents;
	}

	protected constructor(number: number) {
		super(number);
	}

	public getTestPath() : string {
		return path.join(this.getTestsDirPath(), `norm_${this.getNumber()}.js`);
	}

	private _rawEvents : string;
	
	private static MaxTestIndex = 255;
}