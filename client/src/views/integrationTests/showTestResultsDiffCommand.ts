import * as vscode from 'vscode';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';

import { Command, CommandParams } from '../command';
import { DialogHelper } from '../../helpers/dialogHelper';
import { FileSystemHelper } from '../../helpers/fileSystemHelper';
import { RegExpHelper } from '../../helpers/regExpHelper';
import { TestHelper } from '../../helpers/testHelper';
import { XpException } from '../../models/xpException';
import { Log } from '../../extension';

export interface ShowTestResultsDiffParams extends CommandParams {
	testNumber: number;
}

export class ShowTestResultsDiffCommand extends Command {
	constructor(private params: ShowTestResultsDiffParams) {
		super();
	}
	
	public async execute() : Promise<boolean> {
		Log.info(`Запрошено сравнение фактического и ожидаемого события правила ${this.params.rule.getName()} теста №${this.params.testNumber}`);

		// Получаем ожидаемое событие.
		const tests = this.params.rule.getIntegrationTests();
		if(tests.length < this.params.testNumber) {
			DialogHelper.showError(`Запрашиваемый интеграционный тест №${this.params.testNumber} правила ${this.params.rule.getName()} не найден`);
			return;
		}

		const testIndex = this.params.testNumber - 1;
		const currTest = tests[testIndex];

		let expectedEvent = "";
		if(!TestHelper.isNegativeTest(currTest.getTestCode())) {
			const testCode = currTest.getTestCode();
			expectedEvent = RegExpHelper.getSingleExpectEvent(testCode);
			if(!expectedEvent) {
				DialogHelper.showError(`Ожидаемое событий интеграционного теста №${this.params.testNumber} правила ${this.params.rule.getName()} пусто`);
				return;
			}
		} else {
			// Если не ожидаем событие, а получили его. Тогда хочется увидеть что мы получили, поэтому задаем заглушку для отсутствующего ожидаемого.
			expectedEvent = "{}";
		}

		let expectedKeys: string[] = [];
		try {
			const expectedEventObject = JSON.parse(expectedEvent);
			expectedKeys = Object.keys(expectedEventObject);
		}
		catch(error) {
			throw new XpException(`Из ожидаемого события тест №${currTest.getNumber} не удалось получить JSON. Проверьте его корректность и повторите`, error);
		}

		const formattedExpectedEvent = TestHelper.formatTestCodeAndEvents(expectedEvent.trim());

		// Записываем ожидаемое фактическое значение файл для последующего сравнения
		const expectedEventTestFilePath = path.join(this.params.tmpDirPath, `expectedEvents${this.params.testNumber}.json`);
		await FileSystemHelper.writeContentFile(expectedEventTestFilePath, formattedExpectedEvent);


		// Получаем фактическое событие.
		const actualEventsFilePath = TestHelper.getTestActualEventsFilePath(this.params.tmpDirPath, this.params.testNumber);
		if(!actualEventsFilePath) {
			throw new XpException(`Результаты интеграционного теста №${this.params.testNumber} правила ${this.params.rule.getName()} не найдены`);
		}

		if(!fs.existsSync(actualEventsFilePath)) {
			throw new XpException(`Файл результатов тестов ${actualEventsFilePath} не найден`);
		}

		// Событие может прилетать не одно
		const actualEventsString = await FileSystemHelper.readContentFile(actualEventsFilePath);
		if(!actualEventsString) {
			throw new XpException(`Фактическое событий интеграционного теста №${this.params.testNumber} правила ${this.params.rule.getName()} пусто`);
		}

		const actualEvents = actualEventsString.split(os.EOL).filter(l => l);
		// Отбираем ожидаемое событие по имени правила
		const actualFilteredEvents = TestHelper.filterCorrelationEvents(actualEvents, this.params.rule.getName());

		// Если мы не получили сработки нашей корреляции, тогда покажем те события, который отработали.
		let formattedActualEvent = "";
		if(actualFilteredEvents.length !== 0) {
			// Исключаем поля, которых нет в ожидаемом, чтобы сравнение было репрезентативным.
			let actualOutputEventsString = "";
			if(expectedKeys.length !== 0) {
				actualOutputEventsString = actualFilteredEvents
					.map(arl => JSON.parse(arl))
					.map(aro => TestHelper.removeAnotherObjectKeys(aro, expectedKeys))
					.map(aro => JSON.stringify(aro))
					.join(os.EOL);
			} else {
				// Так как в правилах expect not нет ожидаемых событий, ничего не фильтруем.
				actualOutputEventsString = actualFilteredEvents.join(os.EOL);
			}
			
			// Помимо форматирование их требутеся почистить от технических полей.
			formattedActualEvent = TestHelper.formatTestCodeAndEvents(actualOutputEventsString);
			formattedActualEvent = TestHelper.cleanTestCode(formattedActualEvent);
		} else {
			// Из отработавших правил не исключаем никаких полей, чтобы было видно полный результат.
			// Помимо форматирование их требутеся почистить от технических полей.
			const actualOutputEventsString = actualEvents.join(os.EOL);
			formattedActualEvent = TestHelper.formatTestCodeAndEvents(actualOutputEventsString);
			formattedActualEvent = TestHelper.cleanTestCode(formattedActualEvent);
		}

		// Записываем очищенное фактическое значение файл для последующего сравнения
		const actualEventTestFilePath = path.join(this.params.tmpDirPath, `actualEvents${this.params.testNumber}.json`);
		await FileSystemHelper.writeContentFile(actualEventTestFilePath, formattedActualEvent);

		Log.info(`Фактическое событие сохранено в файле по пути ${actualEventTestFilePath}, ожидаемое - ${expectedEventTestFilePath}`);

		vscode.commands.executeCommand("vscode.diff", 
			vscode.Uri.file(actualEventTestFilePath),
			vscode.Uri.file(expectedEventTestFilePath),
			`Фактическое и ожидаемое события теста №${this.params.testNumber}`
		);
		return true;
	}
}