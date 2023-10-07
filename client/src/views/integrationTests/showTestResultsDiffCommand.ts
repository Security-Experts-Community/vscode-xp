import * as vscode from 'vscode';
import * as path from 'path';
import * as os from 'os';

import { DialogHelper } from '../../helpers/dialogHelper';
import { FileSystemHelper } from '../../helpers/fileSystemHelper';
import { RegExpHelper } from '../../helpers/regExpHelper';
import { TestHelper } from '../../helpers/testHelper';
import { RuleBaseItem } from '../../models/content/ruleBaseItem';
import { XpException } from '../../models/xpException';
import { Log } from '../../extension';

export class ShowTestResultsDiffCommand {
	constructor(private rule: RuleBaseItem, private integrationTestTmpFilesPath: string, private testNumber: number) {}
	
	public async execute() : Promise<void> {
		Log.info(`Запрошено сравнение фактического и ожидаемого события правила ${this.rule.getName()} теста №${this.testNumber}`);

		// Получаем ожидаемое событие.
		const tests = this.rule.getIntegrationTests();
		if(tests.length < this.testNumber) {
			DialogHelper.showError(`Запрашиваемый интеграционный тест №${this.testNumber} правила ${this.rule.getName()} не найден`);
			return;
		}

		const testIndex = this.testNumber - 1;
		const test = tests[testIndex];

		const testCode = test.getTestCode();
		const expectedEvent = RegExpHelper.getSingleExpectEvent(testCode);
		if(!expectedEvent) {
			DialogHelper.showError(`Ожидаемое событий интеграционного теста №${this.testNumber} правила ${this.rule.getName()} пусто`);
			return;
		}

		let expectedKeys: string[] = [];
		try {
			const expectedEventObject = JSON.parse(expectedEvent);
			expectedKeys = Object.keys(expectedEventObject);
		}
		catch(error) {
			throw new XpException(`Из ожидаемого события тест №${test.getNumber} не удалось получить JSON. Проверьте его корректность и повторите`, error);
		}

		const formattedExpectedEvent = TestHelper.formatTestCodeAndEvents(expectedEvent.trim());

		// Записываем ожидаемое фактическое значение файл для последующего сравнения
		const expectedEventTestFilePath = path.join(this.integrationTestTmpFilesPath, `expectedEvents${this.testNumber}.json`);
		await FileSystemHelper.writeContentFile(expectedEventTestFilePath, formattedExpectedEvent);


		// Получаем фактическое событие.
		const actualEventsFilePath = TestHelper.getTestActualEventsFilePath(this.integrationTestTmpFilesPath, this.testNumber);
		if(!actualEventsFilePath) {
			throw new XpException(`Результаты интеграционного теста №${this.testNumber} правила ${this.rule.getName()} не найдены`);
		}

		// Событие может прилетать не одно
		const actualEventsString = await FileSystemHelper.readContentFile(actualEventsFilePath);
		if(!actualEventsString) {
			throw new XpException(`Фактическое событий интеграционного теста №${this.testNumber} правила ${this.rule.getName()} пусто`);
		}

		const actualEvents = actualEventsString.split(os.EOL).filter(l => l);
		// Отбираем ожидаемое событие по имени правила
		const actualFilteredEvents = TestHelper.filterCorrelationEvents(actualEvents, this.rule.getName());

		// Исключаем поля, которых нет в ожидаемом, чтобы сравнение было репрезентативным.
		const actualFilteredEventsString = actualFilteredEvents
			.map(arl => JSON.parse(arl))
			.map(aro => TestHelper.removeAnotherObjectKeys(aro, expectedKeys))
			.map(aro => JSON.stringify(aro))
			.join(os.EOL);

		const formattedActualEvent = TestHelper.formatTestCodeAndEvents(actualFilteredEventsString);

		// Записываем очищенное фактическое значение файл для последующего сравнения
		const actualEventTestFilePath = path.join(this.integrationTestTmpFilesPath, `actualEvents${this.testNumber}.json`);
		await FileSystemHelper.writeContentFile(actualEventTestFilePath, formattedActualEvent);

		Log.info(`Фактическое событие сохранено в файле по пути ${actualEventTestFilePath}, ожидаемое - ${expectedEventTestFilePath}`);

		vscode.commands.executeCommand("vscode.diff", 
			vscode.Uri.file(actualEventTestFilePath),
			vscode.Uri.file(expectedEventTestFilePath),
			`Фактическое и ожидаемое события теста №${this.testNumber}`
		);
	}
}