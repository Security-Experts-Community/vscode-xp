import { v4 as uuidv4 } from 'uuid';
import * as xml2json_light from 'xml2json-light';

import { EventMimeType, TestHelper } from '../helpers/testHelper';
import { XpException } from './xpException';

export class Enveloper {
	public static async addEnvelope(rawEvents: string, mimeType : EventMimeType) {
		
		if(!rawEvents) {
			throw new XpException("Не заданы сырые события для теста. Добавьте их и повторите.")
		}

		if(!mimeType) {
			throw new XpException("Не задан mime. Задайте его и повторите.");
		}

		// Проверяем, если исходное событие в формате xml (EventViewer)
		let rawEventsTrimmed = rawEvents.trim();
		if(this.isRawEventXml(rawEventsTrimmed)) {
			const eventJsonObject = this.convertXmlRawEventToJsonObject(rawEventsTrimmed);
			rawEventsTrimmed = JSON.stringify(eventJsonObject);
		}

		if(this.isEnvelopedEvents(rawEventsTrimmed)) {
			throw new XpException("Конверт для событий уже добавлен.");
		}
		
		// Сжали список событий и обернули в конверт.
		const compressedRawEvents = TestHelper.compressRawEvents(rawEventsTrimmed);
		const envelopedRawEvents = this.addEventsToEnvelope(compressedRawEvents, mimeType);
		const envelopedRawEventsString = envelopedRawEvents.join('\n');

		return envelopedRawEventsString;
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

	/**
	 * Оборачивает сжатые сырые события в конверт.
	 * @param compressedRawEvents список сырых событий в строке
	 * @param mimeType тип событий
	 * @returns массив сырых событий, в котором каждое событие обёрнуто в конверт заданного типа и начинается с новой строки
	 */
	public static addEventsToEnvelope(compressedRawEvents : string, mimeType : EventMimeType) : string[] {
		const newRawEvents = [];
		
		const trimmedCompressedRawEvents = compressedRawEvents.trim();

		trimmedCompressedRawEvents.split("\n").forEach(
			(rawEvent, index) => {

				if(rawEvent === "") {
					return;
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
				newRawEvents.push(newRawEvent);
			}
		);

		return newRawEvents;
	}

	public static convertXmlRawEventToJsonObject(xmlRawEvent : string) : any {

		const xmlRawEventCorrected = xmlRawEvent
			.replace(/^- <Event /gm, "<Event ")
			.replace(/^- <System>/gm, "<System>")
			.replace(/^- <EventData>/gm, "<EventData>")

		const jsonEvent = xml2json_light.xml2json(xmlRawEventCorrected);
		let jsonEventString = JSON.stringify(jsonEvent);

		// Меняем имя атрибута на ожидамое значение text.
		jsonEventString = jsonEventString.replace(/_@ttribute/gm, "text");
		const jsonEventObject = JSON.parse(jsonEventString);
		
		return jsonEventObject;
	}
}