import { v4 as uuidv4 } from 'uuid';
import * as xml2json_light from 'xml2json-light';
import * as fs from 'fs';
import * as os from 'os';
import * as readline from 'readline';

import { EventMimeType, TestHelper } from '../helpers/testHelper';
import { XpException } from './xpException';
import { StringHelper } from '../helpers/stringHelper';
import { Configuration } from './configuration';
import { Log } from '../extension';

export class Enveloper {
  constructor(private config: Configuration) {}
  /**
   * Оборачивает события без конверта в конверт с соответствующим mimeType и раскладывает их в одну строку.
   * @param rawEvents сырые события
   * @param mimeType тип конверта для не обернутых событий
   * @returns события без конверта обернуты в конверт и разложены в одну строку каждое
   */
  public addEnvelope(rawEvents: string, mimeType: EventMimeType): string[] {
    let rawEventsTrimmed = rawEvents.trim();
    if (!rawEventsTrimmed) {
      throw new XpException(
        this.config.getMessage('View.IntegrationTests.Message.NoRawEventsEnveloping')
      );
    }

    if (!mimeType) {
      throw new XpException('The MIME type of the event is not set. Add it and repeat the action');
    }

    // Проверяем, если исходное событие в формате xml (EventViewer)
    if (Enveloper.isRawEventXml(rawEventsTrimmed) && mimeType == 'application/x-pt-eventlog') {
      rawEventsTrimmed = Enveloper.convertEventLogXmlRawEventsToJson(rawEventsTrimmed);
    } else {
      // Сжимаем json-события.
      rawEventsTrimmed = TestHelper.compressJsonRawEvents(rawEventsTrimmed);
    }

    const compressedRawEvents = rawEventsTrimmed.split(Enveloper.END_OF_LINE).filter((e) => e);

    if (!Enveloper.thereAreUnEnvelopedEvents(compressedRawEvents)) {
      throw new XpException(
        this.config.getMessage('View.IntegrationTests.Message.EnvelopeHasAlreadyAdded')
      );
    }

    // Добавляем каждому конверт
    const envelopedRawEvents = Enveloper.addEventsToEnvelope(compressedRawEvents, mimeType);
    return envelopedRawEvents;
  }

  public async streamEnvelopeForXmlEvents(
    rawEventsFilePath: string,
    envelopedEventsFilePath: string
  ): Promise<number> {
    if (!rawEventsFilePath) {
      throw new XpException(
        'No raw events have been added to the test. Add them and repeat the action'
      );
    }

    // Проверяем, если исходное событие в формате xml (EventViewer)
    return Enveloper.streamConvertXmlRawEventsToJson(rawEventsFilePath, envelopedEventsFilePath);
  }

  public static isRawEventXml(rawEvent: string): any {
    const xmlCheckRegExp = /<Event [\s\S]*?<\/Event>/gm;
    return xmlCheckRegExp.test(rawEvent);
  }

  public static isEnvelopedEvent(rawEvents: string): boolean {
    rawEvents = rawEvents.trim();

    // Одно событие.
    if (!rawEvents.includes(Enveloper.END_OF_LINE)) {
      try {
        const newRawEvent = JSON.parse(rawEvents);
        if (newRawEvent.body) {
          return true;
        }
        return false;
      } catch (error) {
        return false;
      }
    }

    // Несколько событий.
    const isEnvelopedEvent = rawEvents.split(Enveloper.END_OF_LINE).some((rawEventLine, index) => {
      if (rawEventLine === '') {
        return;
      }

      try {
        const newRawEvent = JSON.parse(rawEventLine);
        if (newRawEvent.body) {
          return true;
        }
        return false;
      } catch (error) {
        return false;
      }
    });

    return isEnvelopedEvent;
  }

  public static thereAreUnEnvelopedEvents(rawEvents: string[]): boolean {
    let envelopedEvents = 0;
    for (const rawEvent of rawEvents) {
      try {
        const newRawEvent = JSON.parse(rawEvent);
        if (newRawEvent['body']) {
          envelopedEvents++;
        }
      } catch (error) {
        Log.debug(error);
      }
    }

    if (envelopedEvents != 0 && rawEvents.length === envelopedEvents) {
      return false;
    }

    return true;
  }

  /**
   * Оборачивает сжатые сырые события в конверт.
   * @param compressedRawEvents список сырых событий в строке
   * @param mimeType тип событий
   * @returns массив сырых событий, в котором каждое событие обернуто в конверт заданного типа и начинается с новой строки
   */
  public static addEventsToEnvelope(
    compressedRawEvents: string[],
    mimeType: EventMimeType
  ): string[] {
    const envelopedEvents = [];

    for (let index = 0; index < compressedRawEvents.length; index++) {
      let rawEvent = compressedRawEvents[index];
      if (rawEvent === '') {
        continue;
      }

      if (this.isEnvelopedEvent(rawEvent)) {
        envelopedEvents.push(rawEvent);
        continue;
      }

      // Убираем пустое поле в начале при копирование из SIEM-а группы (одного) события
      // importance = low и info добавляет пустое поле
      // importance = medium добавляет поле medium
      const regCorrection = /^"(?:medium)?","(.*?)"$/;
      const regExResult = rawEvent.match(regCorrection);
      if (regExResult && regExResult.length == 2) {
        rawEvent = regExResult[1];
      }

      // '2012-11-04T14:51:06.157Z'
      const date = new Date().toISOString();
      const uuidSeed = index + 1;

      const envelopedRawEvents = {
        body: rawEvent,
        recv_ipv4: '127.0.0.1',
        recv_time: date.toString(),
        task_id: '00000000-0000-0000-0000-000000000000',
        tag: 'some_tag',
        mime: mimeType,
        normalized: false,
        input_id: '00000000-0000-0000-0000-000000000000',
        type: 'raw',
        siem_id: '00000000-0000-0000-0000-000000000000', 
        site_id: '00000000-0000-0000-0000-000000000000',
        tenant_id: '00000000-0000-0000-0000-000000000000',
        primary_siem_app_id: '00000000-0000-0000-0000-000000000000',
        origin_app_id: '00000000-0000-0000-0000-000000000000',
        uuid: uuidv4(uuidSeed)
      };

      const newRawEvent = JSON.stringify(envelopedRawEvents);
      envelopedEvents.push(newRawEvent);
    }

    return envelopedEvents;
  }

  public static convertEventLogXmlRawEventsToJson(xmlRawEvent: string): string {
    let xmlRawEventCorrected = xmlRawEvent
      .replace(/- <Event/gm, '<Event')
      .replace(/- <System>/gm, '<System>')
      .replace(/- <EventData>/gm, '<EventData>');
    const xmlEventsRegex = /<Event [\s\S]*?<\/Event>/g;

    const allXmlEvents = xmlRawEventCorrected.match(xmlEventsRegex);
    for (const xmlEvent of allXmlEvents) {
      // Результирующий json.
      const resultXmlRawEvent = this.convertSingleEventLogXmlRawEventToJson(xmlEvent);
      xmlRawEventCorrected = xmlRawEventCorrected.replace(xmlEvent, function () {
        return resultXmlRawEvent;
      });
    }
    return xmlRawEventCorrected;
  }

  public static convertSingleEventLogXmlRawEventToJson(xmlEvent: string): string {
    // TODO: make it smarter
    // Because of such constructions the transformation breaks down, I do a manual escape
    // <Data Name="TargetImage"><unknown process></Data>
    const encodedUnknownProcess = '&lt;unknown process&gt;';
    const unknownProcess = '<unknown process>';

    const escapedXml = StringHelper.safeReplace(xmlEvent, unknownProcess, encodedUnknownProcess);
    // escapedXml = StringHelper.safeReplace(escapedXml, `<Data Name=\\"RuleName\\" />`, "");

    const jsonEventObject = xml2json_light.xml2json(escapedXml);
    let jsonEventString = JSON.stringify(jsonEventObject);

    // Inverse conversion
    jsonEventString = StringHelper.safeReplace(
      jsonEventString,
      encodedUnknownProcess,
      unknownProcess
    );

    // Результирующий json.
    const resultJsonEvent = jsonEventString.replace(
      Enveloper.XML_EVENTLOG_ATTRIBUTE_REGEXP,
      Enveloper.X_PT_EVENTLOG_ATTRIBUTE
    );
    return resultJsonEvent;
  }

  public static async streamConvertXmlRawEventsToJson(
    xmlFilePath: string,
    envelopedJsonEventsFilePath: string
  ): Promise<number> {
    const xmlEvents = (await fs.promises.readFile(xmlFilePath)).toString();
    const xmlEventsRegex = /<Event [\s\S]*?<\/Event>/g;

    const allXmlEvents = xmlEvents.match(xmlEventsRegex);
    let eventsCounter = 0;
    for (const xmlEvent of allXmlEvents) {
      // Переводим в json-строку
      const jsonEventObject = xml2json_light.xml2json(xmlEvent);
      const jsonEventString = JSON.stringify(jsonEventObject);

      // Убираем артефакты, добавляем конверт и добавляем в файл
      const resultJsonRawEvent = jsonEventString.replace(
        Enveloper.XML_EVENTLOG_ATTRIBUTE_REGEXP,
        Enveloper.X_PT_EVENTLOG_ATTRIBUTE
      );
      const envelopedRawEvent = this.addEventsToEnvelope(
        [resultJsonRawEvent],
        'application/x-pt-eventlog'
      );
      await fs.promises.appendFile(envelopedJsonEventsFilePath, envelopedRawEvent[0] + os.EOL);

      eventsCounter++;
    }

    return eventsCounter;
  }

  public static async streamEnvelopeJsonlEvents(
    jsonlFilePath: string,
    envelopedJsonEventsFilePath: string,
    encoding: BufferEncoding
  ): Promise<number> {
    const fileStream = fs.createReadStream(jsonlFilePath);
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity
    });

    let eventsCounter = 0;
    for await (const jsonEvent of rl) {
      const envelopedRawEvent = this.addEventsToEnvelope([jsonEvent], 'application/x-pt-eventlog');
      await fs.promises.appendFile(
        envelopedJsonEventsFilePath,
        envelopedRawEvent[0] + os.EOL,
        encoding
      );

      eventsCounter++;
    }

    return eventsCounter;
  }

  // TODO: решить вопрос с визуализацией и кроссплатформенностью.
  public static XML_EVENTLOG_ATTRIBUTE_REGEXP = /_@ttribute/gm;
  public static X_PT_EVENTLOG_ATTRIBUTE = 'text';

  public static END_OF_LINE = '\n';
}
