/**
 * Разбор результатов интеграционных тестов, полученных от утилит нового KBT (evt-tests).
 *
 * Результаты теста могут быть представлены в двух видах:
 * - файл фактических событий `test_conds_N_events.txt` — события в формате JSON/JSONL без каких-либо маркеров;
 * - подробный отчет `test_conds_N_result.txt` — события каждого этапа конвейера, помеченные маркерами
 *   вида `[FromNormalizer]`, `[FromEnricher]`, `[FromCorrelator]`, а также фактические события,
 *   помеченные словом `Event`.
 */

interface StageSegment {
  stage: string;
  payload: string;
}

const STAGE_MARKER_REGEX = /^[^\S\r\n]*\[From([A-Za-z]+)\][^\S\r\n]*/gm;
const EVENT_MARKER_REGEX = /^[^\S\r\n]*Event[^\S\r\n]*(?=\{)/gm;

/**
 * Возвращает фактические (результирующие) события теста.
 * @param actualEventsString содержимое файла с результатами теста
 * @returns список событий в виде компактного json
 */
export function parseSiemj2Events(actualEventsString: string): string[] {
  if (!actualEventsString) {
    return [];
  }

  const segments = splitByStages(actualEventsString);
  if (segments.length !== 0) {
    return parseStagedOutput(segments);
  }

  const reportedEvents = parseDetailedReportEvents(actualEventsString);
  if (reportedEvents.length !== 0) {
    return reportedEvents;
  }

  return extractJsonObjects(actualEventsString);
}

/**
 * Возвращает события, поступившие на вход корреляционному движку, то есть нормализованные и обогащенные события.
 * @param detailedReportString содержимое подробного отчета о выполнении теста
 * @returns список событий в виде компактного json
 */
export function parseSiemj2EventsBeforeCorrelation(detailedReportString: string): string[] {
  if (!detailedReportString) {
    return [];
  }

  const segments = splitByStages(detailedReportString);
  const correlatorIndex = segments.findIndex((s) => s.stage === 'Correlator');
  const beforeCorrelator = correlatorIndex === -1 ? segments : segments.slice(0, correlatorIndex);

  return collectStageEvents(beforeCorrelator, 'Enricher');
}

/**
 * Разбивает вывод конвейера на секции, каждая из которых начинается с маркера этапа.
 */
function splitByStages(text: string): StageSegment[] {
  const markers = [...text.matchAll(STAGE_MARKER_REGEX)];

  return markers.map((marker, index) => {
    const payloadStart = marker.index + marker[0].length;
    const payloadEnd = index + 1 < markers.length ? markers[index + 1].index : text.length;
    return {
      stage: marker[1],
      payload: text.substring(payloadStart, payloadEnd)
    };
  });
}

/**
 * Отбирает результирующие события конвейера: события корреляционного движка, обогащенные,
 * если для них отработали правила обогащения.
 */
function parseStagedOutput(segments: StageSegment[]): string[] {
  const correlatorIndex = segments.findIndex((s) => s.stage === 'Correlator');

  // Для правил обогащения корреляционного этапа может не быть вовсе,
  // в этом случае результатом являются обогащенные нормализованные события.
  const resultSegments = correlatorIndex === -1 ? segments : segments.slice(correlatorIndex);

  const enrichedEvents = collectStageEvents(resultSegments, 'Enricher');
  if (enrichedEvents.length !== 0) {
    return enrichedEvents;
  }

  // Правила обогащения могли не отработать для корреляционного события.
  const correlationEvents = collectStageEvents(resultSegments, 'Correlator');
  if (correlationEvents.length !== 0) {
    return correlationEvents;
  }

  return resultSegments.flatMap((s) => extractStageEvent(s));
}

function collectStageEvents(segments: StageSegment[], stage: string): string[] {
  return segments.filter((s) => s.stage === stage).flatMap((s) => extractStageEvent(s));
}

/**
 * Каждый маркер этапа помечает ровно одно событие, поэтому берем только первый json-объект.
 * За последним событием в отчете следуют другие секции, например состояние табличных списков.
 */
function extractStageEvent(segment: StageSegment): string[] {
  return extractJsonObjects(segment.payload, 1);
}

/**
 * Отбирает из подробного отчета фактические события, помеченные словом `Event`.
 * Отчет содержит и другие json-объекты (например, условия теста), поэтому берем только помеченные.
 */
function parseDetailedReportEvents(reportString: string): string[] {
  return [...reportString.matchAll(EVENT_MARKER_REGEX)].flatMap((marker) =>
    extractJsonObjects(reportString.substring(marker.index + marker[0].length), 1)
  );
}

/**
 * Извлекает json-объекты из текста, в том числе многострочные.
 * @param text текст, содержащий json-объекты
 * @param maxCount максимальное число извлекаемых объектов
 */
function extractJsonObjects(text: string, maxCount?: number): string[] {
  const events: string[] = [];

  let objectStart = -1;
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = 0; index < text.length; index++) {
    const character = text[index];

    if (objectStart < 0) {
      if (character === '{') {
        objectStart = index;
        depth = 1;
      }
      continue;
    }

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (character === '\\') {
        escaped = true;
      } else if (character === '"') {
        inString = false;
      }
      continue;
    }

    if (character === '"') {
      inString = true;
      continue;
    }

    if (character === '{') {
      depth++;
      continue;
    }

    if (character === '}') {
      depth--;
      if (depth !== 0) {
        continue;
      }

      const candidate = text.substring(objectStart, index + 1);
      objectStart = -1;

      try {
        events.push(JSON.stringify(JSON.parse(candidate)));
      } catch {
        // Отчет может содержать текстовые блоки в фигурных скобках, они не являются событиями.
        continue;
      }

      if (maxCount && events.length >= maxCount) {
        return events;
      }
    }
  }

  return events;
}
