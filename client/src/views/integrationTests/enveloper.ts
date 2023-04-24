import { EventEmitter } from 'events';

import { EventMimeType, TestHelper } from '../../helpers/testHelper';
import { XpException } from '../../models/xpException';

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
		if(TestHelper.isRawEventXml(rawEventsTrimmed)) {
			const eventJsonObject = TestHelper.convertXmlRawEventToJsonObject(rawEventsTrimmed);
			rawEventsTrimmed = JSON.stringify(eventJsonObject);
		}

		if(TestHelper.isEnvelopedEvents(rawEventsTrimmed)) {
			throw new XpException("Конверт для событий уже добавлен.");
		}
		
		// Сжали список событий и обернули в конверт.
		const compressedRawEvents = TestHelper.compressRawEvents(rawEventsTrimmed);
		const envelopedRawEvents = TestHelper.addEventsToEnvelope(compressedRawEvents, mimeType);
		const envelopedRawEventsString = envelopedRawEvents.join('\n');

		return envelopedRawEventsString;
	}
}