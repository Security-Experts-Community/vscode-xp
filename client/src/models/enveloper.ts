import { v4 as uuidv4 } from 'uuid';
import * as xml2json_light from 'xml2json-light';

import { EventMimeType, TestHelper } from '../helpers/testHelper';
import { XpException } from './xpException';

export class Enveloper {
	public static async addEnvelope(rawEvents: string, mimeType : EventMimeType) {
		
		if(!rawEvents) {
			throw new XpException("В тест не добавлены сырые события. Добавьте их и повторите действие.");
		}

		if(!mimeType) {
			throw new XpException("Не задан MIME-тип события. Добавьте его и повторите действие.");
		}

		// Проверяем, если исходное событие в формате xml (EventViewer)
		const rawEventsTrimmed = rawEvents.trim();
		if(this.isRawEventXml(rawEventsTrimmed)) {
			const convertedXmlEvents = this.convertXmlRawEventsToJson(rawEventsTrimmed);
			return this.addEventsToEnvelope(convertedXmlEvents, mimeType);
		}

		// Сжимаем json-события.
		const compressedRawEventsString = TestHelper.compressRawEvents(rawEventsTrimmed);
		const compressedRawEvents = compressedRawEventsString.split(Enveloper.END_OF_LINE);

		if(!this.thereAreUnenvelopedEvents(compressedRawEvents)) {
			throw new XpException("Конверт для всех событий уже добавлен.");
		}

		// Добавляем каждому конверт
		const envelopedRawEvents = this.addEventsToEnvelope(compressedRawEvents, mimeType);
		return envelopedRawEvents;
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

			// Убираем пустое поле в начале при копироваине из SIEM-а группы (одного) события
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

	public static convertXmlRawEventsToJson(xmlRawEvent : string) : string[] {

		const events : string[] = [];
		const xmlRawEventCorrected = xmlRawEvent
			.replace(/^- <Event /gm, "<Event ")
			.replace(/^- <System>/gm, "<System>")
			.replace(/^- <EventData>/gm, "<EventData>");

		const xmlEventsRegex = /<Event[\s\S]*?<\/Event>/gm;
		let xmlRawEventResult: RegExpExecArray | null;
		while ((xmlRawEventResult = xmlEventsRegex.exec(xmlRawEventCorrected))) {
			if (xmlRawEventResult.length != 1) {
				continue;
			}

			const xmlEvent = xmlRawEventResult[0];
			
			// Конвертируем xml в json.
			const jsonEventObject = xml2json_light.xml2json(xmlEvent);
			const jsonEventString = JSON.stringify(jsonEventObject);

			// Исправляем xml.
			const resultXmlRawEvent = jsonEventString.replace(/_@ttribute/gm, "text");
			
			events.push(resultXmlRawEvent);
		}

		return events;
	}

	// TODO: решить вопрос с визуализацией и кроссплатформенностью.
	public static END_OF_LINE = "\n";
}