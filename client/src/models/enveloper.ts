import { v4 as uuidv4 } from 'uuid';
import * as xml2json_light from 'xml2json-light';
import * as fs from 'fs';
import * as os from 'os';

import { EventMimeType, TestHelper } from '../helpers/testHelper';
import { XpException } from './xpException';
import { StringHelper } from '../helpers/stringHelper';

export class Enveloper {
	/**
	 * Оборачивает события без конверта в конверт с соответствующим mimeType и раскладывает их в одну строку.
	 * @param rawEvents сырые события
	 * @param mimeType тип конверта для не обертнутых событий
	 * @returns события без конверта обёрнуты в конверт и разложены в одну строку каждое
	 */
	public static async addEnvelope(rawEvents: string, mimeType : EventMimeType) {
		
		if(!rawEvents) {
			throw new XpException("В тест не добавлены сырые события. Добавьте их и повторите действие");
		}

		if(!mimeType) {
			throw new XpException("Не задан MIME-тип события. Добавьте его и повторите действие");
		}

		// Проверяем, если исходное событие в формате xml (EventViewer)
		let rawEventsTrimmed = rawEvents.trim();
		if(this.isRawEventXml(rawEventsTrimmed)) {
			rawEventsTrimmed = this.сonvertEventLogXmlRawEventsToJson(rawEventsTrimmed);
		}

		// Сжимаем json-события.
		const compressedRawEventsString = TestHelper.compressJsonRawEvents(rawEventsTrimmed);
		const compressedRawEvents = compressedRawEventsString.split(Enveloper.END_OF_LINE);

		if(!this.thereAreUnenvelopedEvents(compressedRawEvents)) {
			throw new XpException("Конверт для всех событий уже добавлен");
		}

		// Добавляем каждому конверт
		const envelopedRawEvents = this.addEventsToEnvelope(compressedRawEvents, mimeType);
		return envelopedRawEvents;
	}

	public static async streamEnvelopeForXmlEvents(rawEventsFilePath: string, envelopedEventsFilePath: string): Promise<number> {
		
		if(!rawEventsFilePath) {
			throw new XpException("В тест не добавлены сырые события. Добавьте их и повторите действие");
		}

		// Проверяем, если исходное событие в формате xml (EventViewer)
		return this.streamConvertXmlRawEventsToJson(rawEventsFilePath, envelopedEventsFilePath);
	}

	public static isRawEventXml(rawEvent : string) : any {
		const xmlCheckRegExp = /<Event [\s\S]*?<\/Event>/gm;
		return xmlCheckRegExp.test(rawEvent);
	}

	public static isEnvelopedEvents(rawEvents : string) : boolean {
		rawEvents = rawEvents.trim();

		// Одно событие.
		if(!rawEvents.includes("\n")) {
			try {
				const newRawEvent = JSON.parse(rawEvents);
				if(newRawEvent.body) {
					return true;
				}
				return false;
			}
			catch (error) {
				return false;
			}
		}

		// Несколько событий.
		const isEnvelopedEvent = rawEvents.split("\n").some(
			(rawEventLine, index) => {

				if(rawEventLine === "") {
					return;
				}
				
				try {
					const newRawEvent = JSON.parse(rawEventLine);
					if(newRawEvent.body) {
						return true;
					}
					return false;
				}
				catch (error) {
					return false;
				}
			}
		);

		return isEnvelopedEvent;
	}

	public static thereAreUnenvelopedEvents(rawEvents : string[]) : boolean {

		let envelopedEvents = 0;
		for (const rawEvent of rawEvents) {
			try {
				const newRawEvent = JSON.parse(rawEvent);
				if(newRawEvent['body']) {
					envelopedEvents++;
				}
			}
			catch (error) {
				let var1: string;
			}
		}

		if(rawEvents.length === envelopedEvents) {
			return false;
		}

		return true;
	}

	/**
	 * Оборачивает сжатые сырые события в конверт.
	 * @param compressedRawEvents список сырых событий в строке
	 * @param mimeType тип событий
	 * @returns массив сырых событий, в котором каждое событие обёрнуто в конверт заданного типа и начинается с новой строки
	 */
	public static addEventsToEnvelope(compressedRawEvents : string[], mimeType : EventMimeType) : string[] {
		const envelopedEvents = [];
		
		for(let index = 0; index < compressedRawEvents.length; index++) {

			let rawEvent = compressedRawEvents[index];
			if(rawEvent === "") {
				continue;
			}

			if(this.isEnvelopedEvents(rawEvent)) {
				envelopedEvents.push(rawEvent);
				continue;
			}

			// Убираем пустое поле в начале при копирование из SIEM-а группы (одного) события
			// importance = low и info добавляет пустое поле
			// importance = medium добавляет поле medium
			const regCorrection = /^"(?:medium)?","(.*?)"$/;
			const regExResult = rawEvent.match(regCorrection);
			if(regExResult && regExResult.length == 2) {
				rawEvent = regExResult[1];
			}
			
			// '2012-11-04T14:51:06.157Z'
			const date = new Date().toISOString();
			const uuidSeed = index + 1;

			const envelopedRawEvents = {
				body : rawEvent,
				recv_ipv4 : "127.0.0.1",
				recv_time : date.toString(),
				task_id : '00000000-0000-0000-0000-000000000000',
				tag : "some_tag",
				mime : mimeType,
				normalized : false,
				input_id : "00000000-0000-0000-0000-000000000000",
				type : "raw",
				uuid : uuidv4(uuidSeed)
			};
	
			const newRawEvent = JSON.stringify(envelopedRawEvents);
			envelopedEvents.push(newRawEvent);
		}

		return envelopedEvents;
	}

	public static сonvertEventLogXmlRawEventsToJson(xmlRawEvent : string) : string {

        const events = [];
        let xmlRawEventCorrected = xmlRawEvent
            .replace(/^- <Event/gm, "<Event")
            .replace(/^- <System>/gm, "<System>")
            .replace(/^- <EventData>/gm, "<EventData>");
        const xmlEventsRegex = /<Event [\s\S]*?<\/Event>/g;
        
        const allXmlEvents = xmlRawEventCorrected.match(xmlEventsRegex);
        for (const xmlEvent of allXmlEvents) {
            
			// const xmlEventsRegex = /<Data>[\s\S]*?<\/Data>/g;
			// const dataResult = xmlEvent.match(xmlEventsRegex);

			let jsonEventString = "";
			// TODO: возможность не потерять символы новых строк для событий MSSQL
            // if (dataResult && dataResult.length == 1) {
			// 	const originalData = dataResult[0];
			// 	const escapedData = StringHelper.escapeSpecialChars(originalData);
			// 	const xmlEventEscapeSpecSymbols = xmlEvent.replace(originalData, escapedData);

			// 	const jsonEventObject = xml2json_light.xml2json(xmlEventEscapeSpecSymbols);
			// 	jsonEventString = JSON.stringify(jsonEventObject);
			// 	jsonEventString = jsonEventString.replace(/\\\\n/gm, '\\n');
			// } else {
				// Конвертируем xml в json.
				const jsonEventObject = xml2json_light.xml2json(xmlEvent);
				jsonEventString = JSON.stringify(jsonEventObject);
			// }

            // Результирующий json.
            const resultXmlRawEvent = jsonEventString.replace(/_@ttribute/gm, "text");
            xmlRawEventCorrected = xmlRawEventCorrected.replace(xmlEvent, resultXmlRawEvent);
        }
        return xmlRawEventCorrected;
	}

	public static async streamConvertXmlRawEventsToJson(xmlFilePath : string, envelopedJsonEventsFilePath: string) : Promise<number> {

		const xmlEvents = (await fs.promises.readFile(xmlFilePath)).toString();
        const xmlEventsRegex = /<Event [\s\S]*?<\/Event>/g;
        
        const allXmlEvents = xmlEvents.match(xmlEventsRegex);
		let eventsCounter = 0;
        for (const xmlEvent of allXmlEvents) {
            
			// Переводим в json-строку
			const jsonEventObject = xml2json_light.xml2json(xmlEvent);
			const jsonEventString = JSON.stringify(jsonEventObject);

            // Убираем артефакты, добавляем конверт и добавляем в файл
            const resultJsonRawEvent = jsonEventString.replace(/_@ttribute/gm, "text");
			const envelopedRawEvent = this.addEventsToEnvelope([resultJsonRawEvent], "application/x-pt-eventlog");
			await fs.promises.appendFile(envelopedJsonEventsFilePath, envelopedRawEvent[0] + os.EOL);

			eventsCounter++;
        }

		return eventsCounter;
	}

	public static async streamEnvelopeJsonlEvents(jsonlFilePath : string, envelopedJsonEventsFilePath: string, encoding: BufferEncoding) : Promise<number> {

		const jsonEventsContent = (await fs.promises.readFile(jsonlFilePath, encoding)).toString();
        
		let eventsCounter = 0;
        const jsonEvents = jsonEventsContent.split(os.EOL);
        for (const jsonEvent of jsonEvents) {
            
			const envelopedRawEvent = this.addEventsToEnvelope([jsonEvent], "application/x-pt-eventlog");
			await fs.promises.appendFile(envelopedJsonEventsFilePath, envelopedRawEvent[0] + os.EOL, encoding);

			eventsCounter++;
        }

		return eventsCounter;
	}

	// TODO: решить вопрос с визуализацией и кроссплатформенностью.
	public static END_OF_LINE = "\n";
}