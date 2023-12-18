import * as os from 'os';
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

import { RuleBaseItem } from '../models/content/ruleBaseItem';
import { IntegrationTest } from '../models/tests/integrationTest';
import { RegExpHelper } from './regExpHelper';
import { XpException } from '../models/xpException';
import { ParseException } from '../models/parseException';
import { BaseUnitTest } from '../models/tests/baseUnitTest';
import { StringHelper } from './stringHelper';
import { Log } from '../extension';
import { FileSystemHelper } from './fileSystemHelper';
import { CorrelationEvent } from '../models/content/correlation';
import { ArgumentException } from '../models/argumentException';
import { JsHelper } from './jsHelper';

export type EventMimeType = "application/x-pt-eventlog" | "application/json" | "text/plain" | "text/csv" | "text/xml"

export class TestHelper {

	public static isNegativeTest(testCode: string) : boolean {
		return /expect\s+not\s+/gm.test(testCode);
	}

	public static removeKeys(object: any, removedKeys: string[]): any {

		const objectCopy = Object.assign({}, object);
		const objectKeys = Object.keys(object);
		for(const objectKey of objectKeys) {
			if(removedKeys.includes(objectKey)) {
				delete objectCopy[objectKey];
			}
		}

		return objectCopy;
	}

	public static removeAnotherObjectKeys(object: any, requiredKeys: string[]): any {

		const objectCopy = Object.assign({}, object);
		const objectKeys = Object.keys(object);
		for(const objectKey of objectKeys) {
			if(!requiredKeys.includes(objectKey)) {
				delete objectCopy[objectKey];
			}
		}

		return objectCopy;
	}

	public static filterCorrelationEvents(jsons: string[], ruleName: string): string[] {
		const filteredJsons: string[] = [];
		for(const eventJson of jsons) {
			try {
				const eventObject = JSON.parse(eventJson) as CorrelationEvent;
				if(eventObject.correlation_name === ruleName) {
					filteredJsons.push(eventJson.trim());
				}
			}
			catch(error) {
				Log.warn("Ошибка фильтрации событий", error);
			}
		}

		return filteredJsons;
	}

	/**
	 * Убирает из кода теста ключи 'generator.version', 'uuid', '_subjects', '_objects', 'subevents', 'subevents.time'
	 * @param testCode код теста
	 * @returns код теста, очищенный от тегов
	 */
	public static cleanTestCode(testCode: string): string {
		if (!testCode) { 
			throw new ArgumentException("Не задан обязательных параметр", "testCode");
		}

		const regexPatterns = [
			/\s*"generator.version"(\s*):(\s*)"(.*?",)/g,

			/\s*"uuid"(\s*):(\s*)".*?",/g,	// в середине json-а
			/,\s*"uuid"(\s*):(\s*)".*?"/g,	// в конце json-а

			/\s*"time"(\s*):(\s*)".*?",/g,	// в середине json-а
			/,\s*"time"(\s*):(\s*)".*?"/g,	// в конце json-а

			/\s*"incident.name"(\s*):(\s*)".*?",/g,	// в середине json-а
			/,\s*"incident.name"(\s*):(\s*)".*?"/g,	// в конце json-а

			/\s*"siem_id"(\s*):(\s*)".*?",/g,	// в середине json-а
			/,\s*"siem_id"(\s*):(\s*)".*?"/g,	// в конце json-а

			/\s*"labels"(\s*):(\s*)".*?",/g,	// в середине json-а
			/,\s*"labels"(\s*):(\s*)".*?"/g,	// в конце json-а

			/\s*"_subjects"(\s*):(\s*)\[[\s\S]*?\],/g,
			/,\s*"_subjects"(\s*):(\s*)\[[\s\S]*?\]/g,

			/\s*"_objects"(\s*):(\s*)\[[\s\S]*?\],/g,
			/,\s*"_objects"(\s*):(\s*)\[[\s\S]*?\]/g,

			/\s*"subevents"(\s*):(\s*)\[[\s\S]*?\],/g,
			/,\s*"subevents"(\s*):(\s*)\[[\s\S]*?\]/g,

			/\s*"subevents.time"(\s*):(\s*)\[[\s\S]*?\],/g,
			/,\s*"subevents.time"(\s*):(\s*)\[[\s\S]*?\]/g
		];

		for (const regexPattern of regexPatterns) {
			testCode = testCode.replace(regexPattern, "");
		}

		return testCode;
	}

	/**
	 * Очищает, сортирует и форматирует json ожидаемого события
	 * @param testCode строка с ожидаемым событием в json
	 * @returns результирующее ожидаемое событие в json
	 */
	public static cleanSortFormatExpectedEventTestCode(expectedEvent: string): string {

		try {
			let object = JSON.parse(expectedEvent);
			object = TestHelper.removeKeys(object, [
					"body", // Встречается в нормализованных (обогащенных) событиях
					
					"_subjects",
					"_objects",
					"_rule",

					"time",

					"generator.version",
					"generator.type",

					"count",		// Количество агрегированных инцидентов

					"uuid",
					"incident.name",

					"primary_siem_app_id",
					"siem_id",
					"origin_app_id",

					"normalized",
					"labels",

					"subevents",
					"subevents.time"
				]
			);
			object = JsHelper.sortObjectKeys(object);
			return JsHelper.formatJsonObject(object);
		}
		catch(error) {
			throw new XpException("Полученные данные не являются событием формата json", error);
		}
	}

	/**
	 * Возвращает путь к результату интеграционных тестов. Данный путь существует только тогда, когда включено сохранение временных файлов. В противном случае директория очищается.
	 * @param integrationTestsTmpDirPath 
	 * @param testNumber 
	 */
	public static getEnrichedNormEventFilePath(integrationTestsTmpDirPath: string, ruleName: string, testNumber: number): string {
		// c:\Users\username\AppData\Local\Temp\eXtraction and Processing\eca77764-57c3-519a-3ad1-db70584b924e\2023-10-02_18-43-35_unknown_sdk_gbto4rfk\RuleName\tests\
		const files = FileSystemHelper.getRecursiveFilesSync(integrationTestsTmpDirPath);
		const resultEvents = files.filter(fp => {
			return RegExpHelper.getEnrichedNormTestEventsFileName(ruleName, testNumber).test(fp);
		});

		if(resultEvents.length === 1) {
			return resultEvents[0];
		}

		if(resultEvents.length > 1) {
			throw new XpException("Найдено больше одного файла обогащенного нормализованного события, перезапустите VSCode и попробуйте еще раз");
		}

		return undefined;
	}

	/**
	 * Возвращает путь к результату интеграционных тестов. Данный путь существует только тогда, когда включено сохранение временных файлов. В противном случае директория очищается.
	 * @param integrationTestsTmpDirPath 
	 * @param testNumber 
	 */
	public static getEnrichedCorrEventFilePath(integrationTestsTmpDirPath: string, ruleName: string, testNumber: number): string {
		// c:\Users\username\AppData\Local\Temp\eXtraction and Processing\eca77764-57c3-519a-3ad1-db70584b924e\2023-10-02_18-43-35_unknown_sdk_gbto4rfk\RuleName\tests\
		const files = FileSystemHelper.getRecursiveFilesSync(integrationTestsTmpDirPath);
		const resultEvents = files.filter(fp => {
			return RegExpHelper.getEnrichedCorrTestEventsFileName(ruleName, testNumber).test(fp);
		});

		if(resultEvents.length === 1) {
			return resultEvents[0];
		}

		if(resultEvents.length > 1) {
			throw new XpException("Найдено больше одного файла обогащенного корреляционного события, перезапустите VSCode и попробуйте еще раз");
		}

		return undefined;
	}

	public static getCorrEventEventFilePath(integrationTestsTmpDirPath: string, ruleName: string, testNumber: number): string {
		// c:\Users\username\AppData\Local\Temp\eXtraction and Processing\eca77764-57c3-519a-3ad1-db70584b924e\2023-10-02_18-43-35_unknown_sdk_gbto4rfk\RuleName\tests\
		const files = FileSystemHelper.getRecursiveFilesSync(integrationTestsTmpDirPath);
		const resultEvents = files.filter(fp => {
			return RegExpHelper.getCorrTestEventsFileName(ruleName, testNumber).test(fp);
		});

		if(resultEvents.length === 1) {
			return resultEvents[0];
		}

		if(resultEvents.length > 1) {
			throw new XpException("Найдено больше одного файла корреляционного события, перезапустите VSCode и попробуйте еще раз");
		}

		return undefined;
	}

	public static cleanModularTestResult(testCode: string) : string {
        if (!testCode) { return ""; }
		const regexPatterns = [
			/\s*"generator.version"(\s*):(\s*)"(.*?",)/g,
			
			/\s*"uuid"(\s*):(\s*)".*?",/g,	// в середине json-а
			/,\s*"uuid"(\s*):(\s*)".*?"/g,	// в конце json-а

			/\s*"siem_id"(\s*):(\s*)".*?",/g,	// в середине json-а
			/,\s*"siem_id"(\s*):(\s*)".*?"/g,	// в конце json-а

			/\s*"labels"(\s*):(\s*)".*?",/g,	// в середине json-а
			/,\s*"labels"(\s*):(\s*)".*?"/g,	// в конце json-а

			/\s*"_subjects"(\s*):(\s*)\[[\s\S]*?\],/g,
			/,\s*"_subjects"(\s*):(\s*)\[[\s\S]*?\]/g,

			/\s*"_objects"(\s*):(\s*)\[[\s\S]*?\],/g,
			/,\s*"_objects"(\s*):(\s*)\[[\s\S]*?\]/g,
			
			/\s*"subevents"(\s*):(\s*)\[[\s\S]*?\],/g,
			/,\s*"subevents"(\s*):(\s*)\[[\s\S]*?\]/g,

			/\s*"subevents.time"(\s*):(\s*)\[[\s\S]*?\],/g,
			/,\s*"subevents.time"(\s*):(\s*)\[[\s\S]*?\]/g
		];
		
		for (const regexPattern of regexPatterns) {
			testCode = testCode.replace(regexPattern, "");
		}

		return testCode;
	}

	/**
	 * Убираем пробельные символы из ошибки.
	 * @param fileContent код правила.
	 * @param diagnostics список ошибок, полученный из разбора лога.
	 * @returns список ошибок, в котором задан начальный символ строки первым не пробельным символом.
	 */
	public static correctWhitespaceCharacterFromErrorLines(fileContent: string, diagnostics: vscode.Diagnostic[]): vscode.Diagnostic[] {
		if (!fileContent) { 
			return []; 
		}
		
		const fixedContent = fileContent.replace(/(\r\n)/gm, "\n");
		const lines = fixedContent.split('\n');

		return diagnostics.map(d => {
			const lineNumber = d.range.start.line;

			// Ссылка на строку, которой нет файле
			if (lineNumber >= lines.length) {
				Log.warn(`В файле ${d.source} не удалось скорректировать ссылку на ошибку, так как указанная строка больше фактического количества строк в файле`);
				return d;
			}

			const errorLine = lines[lineNumber];
			const firstNonWhitespaceCharacterIndex = errorLine.search(/[^\s]/);

			// Если не удалось скорректировать, тогда возвращаем как ест.
			if (firstNonWhitespaceCharacterIndex === -1) {
				return d;
			}

			d.range = new vscode.Range(
				new vscode.Position(d.range.start.line, firstNonWhitespaceCharacterIndex),
				d.range.end);

			return d;
		});
	}

	/**
	 * Сжатие json-событий.
	 * @param rawEvents строка с сырыми событиями
	 * @returns строка с сырыми событиями, в которых json-события сжаты
	 */
	public static compressJsonRawEvents(rawEvents: string): string {

		if (!rawEvents) {
			throw new Error("Переданный список событий пуст.");
		}

		// TODO: надо поддержать упаковку любых json-ов
		const compressedNormalizedEventReg = /^{$[\s\S]+?^}/gm;

		let comNormEventResult: RegExpExecArray | null;
		let compressedRawEvents = rawEvents;
		while ((comNormEventResult = compressedNormalizedEventReg.exec(rawEvents))) {
			if (comNormEventResult.length != 1) {
				continue;
			}

			const jsonRawEvent = comNormEventResult[0];
			try {
				const jsonObject = JSON.parse(jsonRawEvent);
				const compressedEventString = JSON.stringify(jsonObject);

				compressedRawEvents = compressedRawEvents.replace(jsonRawEvent, compressedEventString);
			}
			catch (error) {
				throw new XpException("Не удалось распарсить сырое JSON-событие", error);
			}
		}

		return compressedRawEvents.trim();
	}

	public static removeFieldsFromJsonl(jsonlStr: string, ...fields: string[]): string {
		let jsonlCleaned = "";
		try {
			const jsonLines = StringHelper.splitTextOnLines(jsonlStr);

			jsonlCleaned = jsonLines
				.map(nes => JSON.parse(nes))
				.map(neo => {
					// Очищаем поля из списка.
					for (const field of fields) {
						if (neo[field]) {
							delete neo[field];
						}
					}

					return neo;
				})
				.map(neo => JSON.stringify(neo))
				.join(os.EOL);

		}
		catch (error) {
			throw new XpException("Ошибка очистки JSON от полей", error);
		}
		return jsonlCleaned;
	}

	public static isDefaultLocalization(localization: string) {
		// account start process success на узле wks01.testlab.esc
		const defaultLocRegExp = /^\w+ \w+ \w+ \w+ (на узле|on host) [\w.]+$/g;
		return defaultLocRegExp.test(localization);
	}


	public static compressTestCode(testCode: string) {
		const compressedNormalizedEventReg = /{\s*[\s\S]*\s*}\s*$/gm;

		let formattedTestCode = testCode;
		let comNormEventResult: RegExpExecArray | null;
		while ((comNormEventResult = compressedNormalizedEventReg.exec(testCode))) {
			if (comNormEventResult.length != 1) {
				continue;
			}

			const formattedEvent = comNormEventResult[0];
			let compressedEvent = formattedEvent
				.replace(/^[ \t]+/gm, "")
				.replace(/":\s+/gm, "\": ")
				.replace(/,\s*\r\n/gm, ", ")
				.replace(/,\s*\n/gm, ", ");

			compressedEvent = compressedEvent
				.replace(/{\s*\r\n/gm, "{")
				.replace(/\r\n\s*}/gm, "}")
				.replace(/{\s*\n/gm, "{")
				.replace(/\n\s*}/gm, "}");

			compressedEvent = compressedEvent
				.replace(/\[\s*\r\n/gm, "[")
				.replace(/\r\n\s*\]/gm, "]")
				.replace(/\[\s*\n/gm, "[")
				.replace(/\n\s*\]/gm, "]");

			formattedTestCode = formattedTestCode.replace(formattedEvent, compressedEvent);
		}

		return formattedTestCode;
	}

	public static formatTestCodeAndEvents(testCode: string) {
		const compressedNormalizedEventReg = /({\S.+})\s*$/gm;

		let formattedTestCode = testCode;
		let comNormEventResult: RegExpExecArray | null;
		while ((comNormEventResult = compressedNormalizedEventReg.exec(testCode))) {
			if (comNormEventResult.length != 2) {
				continue;
			}

			const compressedEvent = comNormEventResult[1];
			const escapedCompressedEvent = TestHelper.escapeRawEvent(compressedEvent);

			// Форматируем событие и сортируем поля объекта, чтобы поля групп типа subject.* были рядом.
			try {
				const compressEventJson = JSON.parse(escapedCompressedEvent);
				const orderedCompressEventJson = Object.keys(compressEventJson).sort().reduce(
					(obj, key) => {
						obj[key] = compressEventJson[key];
						return obj;
					},
					{}
				);
				const formattedEvent = JSON.stringify(orderedCompressEventJson, null, 4);
				formattedTestCode = formattedTestCode.replace(compressedEvent, formattedEvent);
			}
			catch (error) {
				// Если не удалось отформатировать, пропускаем и пишем в лог.
				Log.error(error, `Не удалось отформатировать событие ${compressedEvent}`, );
				continue;
			}
		}

		return formattedTestCode;
	}

	// Пока не используется, может пригодиться в дальнейшем. 
	// Если при сжатии понадобится сортировка.
	public static minifyJSONInText(testCode: string): string {
		const compressedNormalizedEventReg = /\{.*?\}$/gms;

		let formattedTestCode = testCode;
		let comNormEventResult: RegExpExecArray | null;
		while ((comNormEventResult = compressedNormalizedEventReg.exec(testCode))) {
			if (comNormEventResult.length != 1) {
				continue;
			}

			const compressedEvent = comNormEventResult[0];
			const escapedCompressedEvent = TestHelper.escapeRawEvent(compressedEvent);

			// Форматируем событие и сортируем поля объекта, чтобы поля групп типа subject.* были рядом.
			try {
				const compressEventJson = JSON.parse(escapedCompressedEvent);
				const orderedCompressEventJson = JsHelper.sortObjectKeys(compressEventJson);
				const formattedEvent = JSON.stringify(orderedCompressEventJson);
				formattedTestCode = formattedTestCode.replace(compressedEvent, formattedEvent);
			}
			catch (error) {
				// Если не удалось отформатировать, пропускаем и пишем в лог.
				console.warn(`Ошибка сжатия события ${compressedEvent}.`);
				continue;
			}
		}

		return formattedTestCode;
	}

	public static async saveIntegrationTest(rule: RuleBaseItem, message: any) {

		// Новый тест или уже существующий.
		let test: IntegrationTest;
		if (message?.test) {
			test = IntegrationTest.convertFromObject(message.test);
		} else {
			test = rule.createIntegrationTest();
		}

		// Сырые события.
		const rawEvents = message?.newValues?.rawEvents;
		if (!rawEvents) {
			throw new Error(`В тест №${test.getNumber()} не добавлены сырые события. Добавьте их и повторите действие.`);
		}

		// Если обновляем сырые событиях, то разумно убрать нормализованные события, если такие есть.
		test.setRawEvents(rawEvents);
		test.setNormalizedEvents("");

		// Сохраняем код теста.
		// Когда хотим получить нормализованное событие, код теста не задаем, поэтому позволяю сохранить без него.
		const testCode = message?.newValues?.testCode;
		if (testCode) {
			const compressedTestCode = TestHelper.compressTestCode(testCode);
			test.setTestCode(compressedTestCode);
		}

		// Номер активного теста.
		const activeTestNumberString = message?.activeTestNumber;
		if (!activeTestNumberString) {
			throw new Error(`Не задан номер активного теста.`);
		}

		// Обновление или добавление теста.
		const tests = rule.getIntegrationTests();
		const testIndex = tests.findIndex(it => it.getNumber() == test.getNumber());
		if (testIndex == -1) {
			tests.push(test);
		} else {
			tests[testIndex] = test;
		}

		test.save();
		return test;
	}

	public static async saveUnitTest(rule: RuleBaseItem, message: any) {

		// Новый тест или уже существующий.
		let test: BaseUnitTest;
		if (message?.test) {
			test = rule.convertUnitTestFromObject(message.test);
		} else {
			test = rule.createNewUnitTest();
		}

		// Сырые события.
		const rawEvent = message?.newValues?.rawEvent;
		if (!rawEvent) {
			throw new Error(`Не заданы сырые события для теста №${test.getNumber()}. Добавьте их и повторите.`);
		}

		// Если обновляем сырые событиях, то разумно убрать нормализованные события, если такие есть.
		test.setTestInputData(rawEvent);

		// Сохраняем код теста.
		// Когда хотим получить нормализованное событие, код теста не задаем, поэтому позволяю сохранить без него.
		const expectation = message?.newValues?.expectation;
		if (expectation) {
			const compressedTestCode = TestHelper.compressTestCode(expectation);
			test.setTestExpectation(compressedTestCode);
		}

		// Номер активного теста.
		const activeTestNumberString = message?.activeTestNumber;
		if (!activeTestNumberString) {
			throw new Error(`Не задан номер активного теста.`);
		}

		// Обновление или добавление теста.
		const tests = rule.getUnitTests();
		const testIndex = tests.findIndex(it => it.getNumber() == test.getNumber());
		if (testIndex == -1) {
			tests.push(test);
		} else {
			tests[testIndex] = test;
		}

		test.save();
		return test;
	}
	/**
	 * Проверяет по специфичным конструкциям, использует ли правило subrules.
	 * @param ruleCode код правила
	 */
	public static isRuleCodeContainsSubrules(ruleCode: string): boolean {

		// Сбрасываем состояние после предыдущего выполнения.
		this.CORRELATION_NAME_COMPARE_REGEX.lastIndex = 0;
		this.LOWER_CORRELATION_NAME_COMPARE_REGEX.lastIndex = 0;
		this.INLIST_LOWER_CORRELATION_NAME_REGEX.lastIndex = 0;
		this.INLIST_CORRELATION_NAME_REGEX.lastIndex = 0;

		if (
			this.CORRELATION_NAME_COMPARE_REGEX.test(ruleCode) ||
			this.LOWER_CORRELATION_NAME_COMPARE_REGEX.test(ruleCode) ||
			this.INLIST_LOWER_CORRELATION_NAME_REGEX.test(ruleCode) ||

			// in_list([
			// 	"Subrule_Windows_Host_Abnormal_Access", 
			// 	"Subrule_Unix_Server_Abnormal_Access"
			// ], correlation_name)
			this.INLIST_CORRELATION_NAME_REGEX.test(ruleCode)
		) {
			return true;
		}
		return false;
	}

	public static parseSubRuleNamesFromKnownOperation(ruleCode: string): string[] {
		// Сбрасываем состояние после предыдущего выполнения.
		this.CORRELATION_NAME_COMPARE_REGEX.lastIndex = 0;
		this.LOWER_CORRELATION_NAME_COMPARE_REGEX.lastIndex = 0;
		this.INLIST_LOWER_CORRELATION_NAME_REGEX.lastIndex = 0;
		this.INLIST_CORRELATION_NAME_REGEX.lastIndex = 0;

		// const correlationNameCompareRegex = /correlation_name\s*==\s*"(\w+)"/gm;
		const correlationNameCompareRegexResult = RegExpHelper.parseValues(ruleCode, this.CORRELATION_NAME_COMPARE_REGEX, "gm");

		// const correlationNameWithLowerCompareRegex = /lower\(\s*correlation_name\s*\)\s*==\s*"(\w+)"/gm;
		const correlationNameWithLowerCompareRegexResult = RegExpHelper.parseValues(ruleCode, this.LOWER_CORRELATION_NAME_COMPARE_REGEX, "gm");

		// const correlationNameWithLowerInListRegex = /in_list\(\s*(\[[\w\W]+\])\s*,\s*lower\(correlation_name\)/gm;
		const correlationNameWithLowerInListRegexResult = RegExpHelper.parseJsArrays(ruleCode, this.INLIST_LOWER_CORRELATION_NAME_REGEX, "gm");

		const correlationNameInListRegexResult = RegExpHelper.parseJsArrays(ruleCode, this.INLIST_CORRELATION_NAME_REGEX, "gm");

		return correlationNameCompareRegexResult
			.concat(correlationNameWithLowerCompareRegexResult)
			.concat(correlationNameWithLowerInListRegexResult)
			.concat(correlationNameInListRegexResult);
	}

	public static isCorrelationNameUsedInFilter(ruleCode: string): boolean {
		return /filter\s+{[\s\S]+?correlation_name[\s\S]+?}/gm.test(ruleCode);
	}

	/**
	 * 
	 * @param message Сообщение, полученное из front-end.
	 * @param rule 
	 * @returns 
	 */
	public static async saveAllTest(message: any, rule: RuleBaseItem): Promise<RuleBaseItem> {
		const plainTests = message.tests as any[];

		// Количество тестов уменьшилось, удаляем старые и записываем новые.
		if (rule.getIntegrationTests().length > plainTests.length) {
			const promises = rule.getIntegrationTests()
				.map(it => it.remove());

			await Promise.all(promises);
		}

		// Проверяем, что все тесты - нормальные
		plainTests.forEach((plainTest, index) => {
			// Сырые события.
			let rawEvents = plainTest?.rawEvents;
			rawEvents = rawEvents ? rawEvents.trim() : "";
			if (!rawEvents || rawEvents == "") {
				throw new XpException(`Попытка сохранения теста №${plainTest.number ?? 0} без сырых событий`);
			}

			// Код теста.
			const testCode = plainTest?.testCode;
			if (!testCode || testCode == "") {
				throw new XpException("Попытка сохранения теста без тестового кода событий");
			}
		});

		if (plainTests.length) {
			// Очищаем интеграционные тесты.
			rule.clearIntegrationTests();

			const tests = plainTests.map((plainTest, index) => {
				const test = rule.createIntegrationTest();

				const number = index + 1;
				test.setNumber(number);

				// Сырые события.
				let rawEvents = plainTest?.rawEvents;

				// Из textarea новые строки только \n, поэтому надо их поправить под систему.
				rawEvents = rawEvents.replace(/(?<!\\)\n/gm, os.EOL);
				const compressedRawEvents = TestHelper.compressTestCode(rawEvents);
				test.setRawEvents(compressedRawEvents);

				// Код теста.
				let testCode = plainTest?.testCode;

				// Из textarea новые строки только \n, поэтому надо их поправить под систему.
				testCode = testCode.replace(/(?<!\\)\n/gm, os.EOL);
				const compressedCode = TestHelper.compressTestCode(testCode);
				test.setTestCode(compressedCode);

				// Нормализованные события.
				const normEvents = plainTest?.normEvents;
				if (normEvents) {
					test.setNormalizedEvents(TestHelper.compressTestCode(normEvents));
				}

				return test;
			});

			rule.setIntegrationTests(tests);
			await rule.saveIntegrationTests();
		}

		return rule;
	}



	public static escapeRawEvent(normalizedEvent: string) {
		return normalizedEvent
			.replace(/\\n/g, "\\n")
			.replace(/\\'/g, "\\'")
			.replace(/\\"/g, '\\"')
			.replace(/\\&/g, "\\&")
			.replace(/\\r/g, "\\r")
			.replace(/\\t/g, "\\t")
			.replace(/\\b/g, "\\b")
			.replace(/\\f/g, "\\f");
	}

	private static CORRELATION_NAME_COMPARE_REGEX = /correlation_name\s*==\s*"(\w+)"/gm;
	private static LOWER_CORRELATION_NAME_COMPARE_REGEX = /lower\s*\(\s*correlation_name\s*\)\s*==\s*"(\w+)"/gm;

	private static INLIST_LOWER_CORRELATION_NAME_REGEX = /in_list\s*\(\s*(\[[\w\W]+\])\s*,\s*lower\s*\(\s*correlation_name\s*\)/gm;
	private static INLIST_CORRELATION_NAME_REGEX = /in_list\s*\(\s*(\[[\w\W]+\])\s*,\s*correlation_name\s*\)/gm;
}
