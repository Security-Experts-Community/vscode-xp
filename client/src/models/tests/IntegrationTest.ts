import * as fs from 'fs';
import * as path from "path";

import { TestStatus } from './testStatus';
import { FileSystemHelper } from '../../helpers/fileSystemHelper';
import { ExtensionHelper } from '../../helpers/extensionHelper';
import { XpException } from '../xpException';

// TODO: вынести общие методы из класс BaseUnitTest.
export class IntegrationTest {

	private constructor() {
		//
	}

	public static parseFromRuleDirectory(ruleDirFullPath: string) : IntegrationTest [] {
		const testsDirectoryFullPath = path.join(ruleDirFullPath, "tests");

		// Тестов нет.
		if(!fs.existsSync(testsDirectoryFullPath)) {
			return [];
		}

		const tests = fs.readdirSync(testsDirectoryFullPath)
			.filter(f => f.endsWith(".tc"))
			.map((testFileName, index) => {
				// Парсим номер теста, для того чтобы открыть нужный файл с сырыми событиями.
				const parseNumberResult = /test_conds_(\d+).tc/.exec(testFileName);
				if(!parseNumberResult || parseNumberResult.length != 2) {
					return;
				}
				const testNumber = parseInt(parseNumberResult[1]);
				const test = IntegrationTest.create(testNumber, ruleDirFullPath);
								
				// Получаем файл с содержимым теста
				const testCodeFileName = `test_conds_${testNumber}.tc`;
				const testCodeFilePath = path.join(testsDirectoryFullPath, testCodeFileName);
				if(!fs.existsSync(testCodeFilePath)) {
					ExtensionHelper.showUserError(`Повреждены файлы тестов, не найден файл '${testCodeFilePath}'`);
					// В этом случае в массив добавляется неопределённый элемент
					return;
				}
				const testCodeContent = fs.readFileSync(testCodeFilePath, "utf8");
				test.setTestCode(testCodeContent);			
				
				// Получаем файл с сырыми событиями.
				const rawEventsFileName = `raw_events_${testNumber}.json`;				
				const rawEventsFullPath = path.join(testsDirectoryFullPath, rawEventsFileName);
				if(!fs.existsSync(rawEventsFullPath)) {
					ExtensionHelper.showUserError(`Повреждены файлы тестов, не найден файл '${rawEventsFullPath}'`);
					// В этом случае в массив добавляется неопределённый элемент
					return;
				}
				const rawEvents = fs.readFileSync(rawEventsFullPath, "utf8");
				test.setRawEvents(rawEvents);

				return test;
			// Проверяем, что все элементы массива имеют нужный тип. 
			// Если одного из файлов нет, то элемент массива может быть неопределён
			}).filter((item) => {return item instanceof IntegrationTest;});

		return tests;
	}

	public static create(testNumber : number, ruleDirPath: string) : IntegrationTest {
		
		const test = new IntegrationTest();
		test.setNumber(testNumber);
		test.setRuleDirectoryPath(ruleDirPath);
		test.setTestCode("");
		test.setRawEvents("");

		return test;
	}

	public static convertFromObject(object: any) : IntegrationTest {
		return Object.assign(new IntegrationTest(), object) as IntegrationTest;
	}

	public setStatus(status: TestStatus) : void {
		this._testStatus = status;
	}

	public getStatus() : TestStatus {
		return this._testStatus;
	}

	public setRuleDirectoryPath(ruleDirectoryPath: string) {
		this._ruleDirectoryPath = ruleDirectoryPath;
	}

	public getRuleDirectoryPath() {
		return this._ruleDirectoryPath;
	}

	public getRuleFullPath() {
		// TODO: подходит только для корреляции.
		return path.join(this.getRuleDirectoryPath(), `rule.co`);
	}

	public getTestCodeFilePath() : string {
		return path.join(this._ruleDirectoryPath, `tests`, `test_conds_${this.getNumber()}.tc`);
	}

	public getRawEventsFilePath() : string {
		return path.join(this._ruleDirectoryPath, `tests`, `raw_events_${this.getNumber()}.json`);
	}

	public setOutput(output: string) {
		this._output = output;
	}

	public getOutput() {
		return this._output;
	}

	public async save() : Promise<void> {

		if(!this._number) {
			throw new Error("Для интеграционного теста не задан порядковый номер");
		}

		if(this._rawEvents == undefined) {
			throw new XpException("Код теста не задан.");
		}

		if(!this.getRuleDirectoryPath()) {
			throw new XpException("Не задана директория правила");
		}

		if(!fs.existsSync(this._ruleDirectoryPath)) {
			await fs.promises.mkdir(this._ruleDirectoryPath);
		}

		const testDirectoryPath = path.join(this._ruleDirectoryPath, `tests`);
		if(!fs.existsSync(testDirectoryPath)) {
			await fs.promises.mkdir(testDirectoryPath);
		}

		// Позволяет сохранять тест без кода теста для нормализации событий, если нам сам тест не нужен.
		// test_conds_1.tc
		if(this._testCode != undefined && this._testCodeUpdated) {
			const testFullPath = this.getTestCodeFilePath();
			await FileSystemHelper.writeContentFile(testFullPath, this._testCode);
		}

		// raw_events_N.json
		// const rawEventFullPath = path.join(testDirectoryPath, `raw_events_${this._number}.json`);
		const rawEventFullPath = this.getRawEventsFilePath();
		if(this._rawEvents != undefined && this._rawEventsUpdated) {
			await FileSystemHelper.writeContentFile(rawEventFullPath, this._rawEvents);
		}

		// Сбрасываем флаги обновлённых полей.
		this._numberUpdated = false;
		this._rawEventsUpdated = false;
		this._testCodeUpdated = false;
	}

	public async remove() : Promise<[void, void]> {
		const rmRawEventsPromise = fs.promises.unlink(this.getRawEventsFilePath());
		const rmTestCodePromise = fs.promises.unlink(this.getTestCodeFilePath());
		return Promise.all([rmRawEventsPromise, rmTestCodePromise]);
	}

	public setNumber(number: number) : void {
		this._number = number;
		this._numberUpdated = true;
	}

	public getNumber() : number {
		return this._number;
	}

	public setNormalizedEvents(normalizeEvents: string) {
		this._normalizeEvents = normalizeEvents;
	}

	public getNormalizedEvents() {
		return this._normalizeEvents;
	}

	public setRawEvents(rawEvent: string) {
		this._rawEvents = rawEvent;
		this._rawEventsUpdated = true;
	}

	public getRawEvents() {
		return this._rawEvents;
	}

	public setTestCode(testCode: string) {
		this._testCode = testCode;
		this._testCodeUpdated = true;
	}

	public getTestCode() {
		return this._testCode;
	}

	private _ruleDirectoryPath : string;

	protected _number: number;
	protected _numberUpdated = false;

	protected _rawEvents : string;
	protected _rawEventsUpdated = false;

	protected _testCode : string;
	protected _testCodeUpdated = false;
	
	protected _normalizeEvents : string;
	protected _testStatus : TestStatus = TestStatus.Unknown;

	protected _output : string;

	private static MaxTestIndex = 255;
}