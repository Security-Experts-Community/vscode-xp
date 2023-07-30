import { EOL } from 'os';
import * as vscode from 'vscode';

import { RuleBaseItem } from '../models/content/ruleBaseItem';
import { IntegrationTest } from '../models/tests/integrationTest';
import { RegExpHelper } from './regExpHelper';
import { XpException } from '../models/xpException';
import { ParseException } from '../models/parseException';
import { BaseUnitTest } from '../models/tests/baseUnitTest';

export type EventMimeType = "application/x-pt-eventlog" | "application/json" | "text/plain" | "text/csv" | "text/xml"

export class TestHelper {

	/**
	 * Убирает из кода теста ключи 'generator.version', 'uuid', '_subjects', '_objects', 'subevents', 'subevents.time'
	 * @param testCode код теста
	 * @returns код теста, очищенный от тегов
	 */
	public static cleanTestCode(testCode: string) : string {
        if (!testCode) { return ""; }
		const regexPatterns = [
			/\s*"generator.version"(\s*):(\s*)"(.*?",)/g,
			
			/\s*"uuid"(\s*):(\s*)".*?",/g,	// в середине json-а
			/,\s*"uuid"(\s*):(\s*)".*?"/g,	// в конце json-а

			/\s*"time"(\s*):(\s*)".*?",/g,	// в середине json-а
			/,\s*"time"(\s*):(\s*)".*?"/g,	// в конце json-а

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
	 * @param ruleContent код правила.
	 * @param diagnostics список ошибок, полученный из разбора лога.
	 * @returns список ошибок, в котором задан начальный символ строки первым непробельным символом.
	 */
	public static correctWhitespaceCharacterFromErrorLines(ruleContent : string, diagnostics : vscode.Diagnostic[]) : vscode.Diagnostic[] {
		if (!ruleContent) { return []; }
		const fixedContent = ruleContent.replace(/(\r\n)/gm, "\n");
		const lines = fixedContent.split('\n');

		return diagnostics.map(d => {
			const lineNumber = d.range.start.line;

			if(lineNumber >= lines.length) {
				throw new ParseException(`Не удалось разобрать сообщения об ошибках в коде правила: ${ruleContent}`);
			}

			const errorLine = lines[lineNumber];
			const firstNonWhitespaceCharacterIndex = errorLine.search(/[^\s]/);
			
			// Если не удалось скорректировать, тогда возвращем как ест.
			if(firstNonWhitespaceCharacterIndex === -1) {
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
	public static compressRawEvents(rawEvents: string) : string {

		if(!rawEvents) {
			throw new Error("Переданный список событий пуст.");
		}

		const compressedNormalizedEventReg = /^{\s*"Event"\s*[\s\S]*?\n}/gm;

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
			catch(error) {
				console.warn(error.message);
			}
		}

		return compressedRawEvents.trim();
	}

	public static compressTestCode(testCode: string) {
		const compressedNormalizedEventReg = /{\s+"[\s\S]*\s+}$/gm;

		let formattedTestCode = testCode;
		let comNormEventResult: RegExpExecArray | null;
		while ((comNormEventResult = compressedNormalizedEventReg.exec(testCode))) {
			if (comNormEventResult.length != 1) {
				continue;
			}

			const formatedEvent = comNormEventResult[0];
			let compressedEvent = formatedEvent
				.replace(/^[ \t]+/gm, "")
				.replace(/":\s+/gm, "\": ")
				.replace(/,\r\n/gm, ", ")
				.replace(/,\n/gm, ", ");

			compressedEvent = compressedEvent
				.replace(/{\r\n/gm, "{")
				.replace(/\r\n}/gm, "}")
				.replace(/{\n/gm, "{")
				.replace(/\n}/gm, "}");

			compressedEvent = compressedEvent
				.replace(/\[\r\n/gm, "[")
				.replace(/\r\n\]/gm, "]")
				.replace(/\[\n/gm, "[")
				.replace(/\n\]/gm, "]");


			formattedTestCode = formattedTestCode.replace(formatedEvent, compressedEvent);
		}

		return formattedTestCode;
	}

	public static formatTestCodeAndEvents(testCode: string) {
		const compressedNormalizedEventReg = /{"\S.*}$/gm;

		let formattedTestCode = testCode;
		let comNormEventResult: RegExpExecArray | null;
		while ((comNormEventResult = compressedNormalizedEventReg.exec(testCode))) {
			if (comNormEventResult.length != 1) {
				continue;
			}

			const compessedEvent = comNormEventResult[0];
			const escapedCompessedEvent = TestHelper.escapeRawEvent(compessedEvent);

			// Форматируем событие и сортируем поля объекта, чтобы поля групп типа subject.* были рядом.
			try {
				const compressEventJson = JSON.parse(escapedCompessedEvent);
				const orderedCompressEventJson = Object.keys(compressEventJson).sort().reduce(
					(obj, key) => { 
						obj[key] = compressEventJson[key]; 
						return obj;
					}, 
					{}
				);
				const formatedEvent = JSON.stringify(orderedCompressEventJson, null, 4);
				formattedTestCode = formattedTestCode.replace(compessedEvent, formatedEvent);
			}
			catch (error) {
				// Если не удалось отформатировать, пропускаем и пишем в лог.
				console.warn(`Не удалось отформатировать событие ${compessedEvent}.`);
				continue;
			}
		}

		return formattedTestCode;
	}

	public static sortObjectKeys(object: any) {
		if(typeof object != "object") { return object; }
		if(object instanceof Array) {
			return object.map((obj) => { return this.sortObjectKeys(obj); });
		}
		const keys = Object.keys(object);
		if(!keys) { return object; }
		return keys.sort().reduce((obj, key) => {
			if (object[key] instanceof Array) {
				obj[key] = this.sortObjectKeys(object[key]);
			} else {
				obj[key] = object[key];
			}
			return obj;
		}, {});
	}

	// Пока не используется, может пригодиться в дальнейшем. 
	// Если при сжатии понадобится сортировка.
	public static minifyJSONInText(testCode: string) : string {
		const compressedNormalizedEventReg = /\{.*?\}$/gms;

		let formattedTestCode = testCode;
		let comNormEventResult: RegExpExecArray | null;
		while ((comNormEventResult = compressedNormalizedEventReg.exec(testCode))) {
			if (comNormEventResult.length != 1) {
				continue;
			}

			const compessedEvent = comNormEventResult[0];
			const escapedCompessedEvent = TestHelper.escapeRawEvent(compessedEvent);

			// Форматируем событие и сортируем поля объекта, чтобы поля групп типа subject.* были рядом.
			try {
				const compressEventJson = JSON.parse(escapedCompessedEvent);
				const orderedCompressEventJson = this.sortObjectKeys(compressEventJson);
				const formatedEvent = JSON.stringify(orderedCompressEventJson);
				formattedTestCode = formattedTestCode.replace(compessedEvent, formatedEvent);
			}
			catch (error) {
				// Если не удалось отформатировать, пропускаем и пишем в лог.
				console.warn(`Ошибка сжатия события ${compessedEvent}.`);
				continue;
			}
		}

		return formattedTestCode;
	}

	public static async saveIntegrationTest(rule : RuleBaseItem, message: any) {
		
		// Новый тест или уже существующий.
		let test : IntegrationTest;
		if(message?.test) {
			test = IntegrationTest.convertFromObject(message.test);
		} else {
			test = rule.createIntegrationTest();
		}
		
		// Сырые события.
		const rawEvents = message?.newValues?.rawEvents;
		if(!rawEvents) {
			throw new Error(`В тест №${test.getNumber()} не добавлены сырые события. Добавьте их и повторите действие.`);
		}

		// Если обновляем сырые событиях, то разумно убрать нормализованные события, если такие есть.
		test.setRawEvents(rawEvents);
		test.setNormalizedEvents("");

		// Сохраняем код теста.
		// Когда хотим получить нормализованное событие, код теста не задаем, поэтому позволяю сохранить без него.
		const testCode = message?.newValues?.testCode;
		if(testCode) {
			const compressedTestCode = TestHelper.compressTestCode(testCode);
			test.setTestCode(compressedTestCode);
		}

		// Номер активного теста.
		const activeTestNumberString = message?.activeTestNumber;
		if(!activeTestNumberString) {
			throw new Error(`Не задан номер активного теста.`);
		}

		// Обновление или добавление теста.
		const tests = rule.getIntegrationTests();
		const testIndex = tests.findIndex( it => it.getNumber() == test.getNumber());
		if(testIndex == -1) {
			tests.push(test);
		} else {
			tests[testIndex] = test;
		}

		test.save();
		return test;
	}

	public static async saveUnitTest(rule : RuleBaseItem, message: any) {
		
		// Новый тест или уже существующий.
		let test : BaseUnitTest;
		if(message?.test) {
			test = rule.convertUnitTestFromObject(message.test);
		} else {
			test = rule.createNewUnitTest();
		}
		
		// Сырые события.
		const rawEvent = message?.newValues?.rawEvent;
		if(!rawEvent) {
			throw new Error(`Не заданы сырые события для теста №${test.getNumber()}. Добавьте их и повторите.`);
		}

		// Если обновляем сырые событиях, то разумно убрать нормализованные события, если такие есть.
		test.setTestInputData(rawEvent);

		// Сохраняем код теста.
		// Когда хотим получить нормализованное событие, код теста не задаем, поэтому позволяю сохранить без него.
		const expectation = message?.newValues?.expectation;
		if(expectation) {
			const compressedTestCode = TestHelper.compressTestCode(expectation);
			test.setTestExpectation(compressedTestCode);
		}

		// Номер активного теста.
		const activeTestNumberString = message?.activeTestNumber;
		if(!activeTestNumberString) {
			throw new Error(`Не задан номер активного теста.`);
		}

		// Обновление или добавление теста.
		const tests = rule.getUnitTests();
		const testIndex = tests.findIndex( it => it.getNumber() == test.getNumber());
		if(testIndex == -1) {
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
	public static isRuleCodeContainsSubrules(ruleCode : string) : boolean {
		const correlationNameCompareRegex = /correlation_name\s*==\s*"\w+"/gm;
		const correlationNameWithLowerCompareRegex = /lower\(\s*correlation_name\s*\)\s*==\s*"\w+"/gm;
		const lowerCorrelationNameInListRegex = /in_list\(\s*\[[\w\W]+\]\s*,\s*lower\s*\(\s*correlation_name\s*\)/gm;


		const correlationNameCompareResult = correlationNameCompareRegex.test(ruleCode);
		if(correlationNameCompareResult) {
			return true;
		}

		const correlationNameWithLowerCompareResult = correlationNameWithLowerCompareRegex.test(ruleCode);
		if(correlationNameWithLowerCompareResult) {
			return true;
		}

		const lowerCorrelationNameInListResult = lowerCorrelationNameInListRegex.test(ruleCode);
		if(lowerCorrelationNameInListResult) {
			return true;
		}

		// in_list([
		// 	"Subrule_Windows_Host_Abnormal_Access", 
		// 	"Subrule_Unix_Server_Abnormal_Access"
		// ], correlation_name)
		const correlationNameInListRegex = /in_list\(\s*\[[\w\W]+\]\s*,\s*correlation_name\s*\)/gm;
		const correlationNameInListResult = correlationNameInListRegex.test(ruleCode);
		if(correlationNameInListResult) {
			return true;
		}
		
		return false;
	}

	public static parseSubRuleNames(ruleCode : string) : string[] {
		const correlationNameCompareRegex = /correlation_name\s*==\s*"(\w+)"/gm;
		const correlationNameWithLowerCompareRegex = /lower\(\s*correlation_name\s*\)\s*==\s*"(\w+)"/gm;
		const correlationNameInListRegex = /in_list\(\s*(\[[\w\W]+\])\s*,\s*lower\(correlation_name\)/gm;

		const correlationNameCompareRegexResult = RegExpHelper.parseValuesFromText(ruleCode, correlationNameCompareRegex);
		const correlationNameWithLowerCompareRegexResult = RegExpHelper.parseValuesFromText(ruleCode, correlationNameWithLowerCompareRegex);

		let correlationNameInListRegexResult = RegExpHelper.parseValuesFromText(ruleCode, correlationNameInListRegex);
		correlationNameInListRegexResult = correlationNameInListRegexResult.flatMap(correlationList => JSON.parse(correlationList));

		return correlationNameCompareRegexResult
			.concat(correlationNameWithLowerCompareRegexResult)
			.concat(correlationNameInListRegexResult);
	}

	/**
	 * 
	 * @param message Сообщение, полученное из front-end.
	 * @param rule 
	 * @returns 
	 */
	public static async saveAllTest(message: any, rule : RuleBaseItem) : Promise<RuleBaseItem> {
		const plainTests = message.tests as any[];

		// Количество тестов уменьшилось, удаляем старые и записываем новые.
		if(rule.getIntegrationTests().length > plainTests.length) {
			const promises = rule.getIntegrationTests()
				.map(it => it.remove());

			await Promise.all(promises);
		}

		// Очищаем интеграционные тесты.
		rule.clearIntegrationTests();

		const tests = plainTests.map( (plainTest, index) => {
			const test = rule.createIntegrationTest();

			const number = index + 1;
			test.setNumber(number);

			// Сырые события.
			let rawEvents = plainTest?.rawEvents;
			if(!rawEvents || rawEvents == "") {
				throw new XpException(`Попытка сохранения теста №${number} без сырых событий.`);
			}

			// Из textarea новые строки только \n, поэтому надо их поправить под систему.
			rawEvents = rawEvents.replace(/(?<!\\)\n/gm, EOL);
			test.setRawEvents(TestHelper.compressTestCode(rawEvents));

			// Код теста.
			let testCode = plainTest?.testCode;
			if(!testCode || testCode == "") {
				throw new XpException("Попытка сохранения теста без тестового кода событий.");
			}

			// Из textarea новые строки только \n, поэтому надо их поправить под систему.
			testCode = testCode.replace(/(?<!\\)\n/gm, EOL);
			test.setTestCode(TestHelper.compressTestCode(testCode));

			// Нормализованные события.
			const normEvents = plainTest?.normEvents;
			if(normEvents) {
				test.setNormalizedEvents(TestHelper.compressTestCode(normEvents));
			}

			return test;
		});

		rule.setIntegrationTests(tests);
		await rule.saveIntegrationTests();
		return rule;
	}

	public static escapeRawEvent(normalizedEvent: string) {
		return normalizedEvent;
	}
}
