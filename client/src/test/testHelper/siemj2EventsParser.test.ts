import * as assert from 'assert';

import {
  parseSiemj2Events,
  parseSiemj2EventsBeforeCorrelation
} from '../../helpers/siemj2EventsParser';
import { RegExpHelper } from '../../helpers/regExpHelper';

suite('Разбор результатов интеграционных тестов новых утилит KBT', () => {
  test('Файл фактических событий в формате jsonl', () => {
    const events = parseSiemj2Events(
      '{"correlation_name":"Rule","value":1}\n{"correlation_name":"Rule","value":2}\n'
    );

    assert.deepStrictEqual(events, [
      '{"correlation_name":"Rule","value":1}',
      '{"correlation_name":"Rule","value":2}'
    ]);
  });

  test('Файл фактических событий с многострочным событием', () => {
    const events = parseSiemj2Events(
      ['{', '  "correlation_name": "Rule",', '  "object.name": "{host}"', '}'].join('\r\n')
    );

    assert.deepStrictEqual(events, ['{"correlation_name":"Rule","object.name":"{host}"}']);
  });

  test('Подробный отчет с этапами конвейера, разделенный LF', () => {
    const events = parseSiemj2Events(
      [
        '[FromNormalizer] {"normalized":true}',
        '[FromEnricher] {"normalized":true,"enriched":true}',
        '[FromCorrelator] {"correlation_name":"Rule"}',
        '[FromEnricher] {"correlation_name":"Rule","enriched":true}'
      ].join('\n')
    );

    assert.deepStrictEqual(events, ['{"correlation_name":"Rule","enriched":true}']);
  });

  test('Подробный отчет с этапами конвейера, разделенный CRLF', () => {
    const events = parseSiemj2Events(
      ['[FromCorrelator]', '[FromEnricher] {', '  "correlation_name": "Rule"', '}'].join('\r\n')
    );

    assert.deepStrictEqual(events, ['{"correlation_name":"Rule"}']);
  });

  test('Корреляционное событие без отработавшего обогащения', () => {
    const events = parseSiemj2Events(
      [
        '[FromNormalizer] {"normalized":true}',
        '[FromEnricher] {"normalized":true,"enriched":true}',
        '[FromCorrelator] {"correlation_name":"Rule"}'
      ].join('\n')
    );

    assert.deepStrictEqual(events, ['{"correlation_name":"Rule"}']);
  });

  test('Несколько корреляционных событий', () => {
    const events = parseSiemj2Events(
      [
        '[FromCorrelator] {"correlation_name":"Rule","value":1}',
        '[FromEnricher] {"correlation_name":"Rule","value":1}',
        '[FromCorrelator] {"correlation_name":"Rule","value":2}',
        '[FromEnricher] {"correlation_name":"Rule","value":2}'
      ].join('\n')
    );

    assert.deepStrictEqual(events, [
      '{"correlation_name":"Rule","value":1}',
      '{"correlation_name":"Rule","value":2}'
    ]);
  });

  test('Тест правила обогащения без корреляционного этапа', () => {
    const events = parseSiemj2Events(
      ['[FromNormalizer] {"normalized":true}', '[FromEnricher] {"enriched":true}'].join('\n')
    );

    assert.deepStrictEqual(events, ['{"enriched":true}']);
  });

  test('Подробный отчет с полным конвейером и секциями после событий', () => {
    // Так выглядит test_conds_N_result.txt: условие теста, события всех этапов, затем прочие секции.
    const events = parseSiemj2Events(
      [
        'The expected results for the events were not obtained.',
        'Expect 1, got 0 for ',
        '{"correlation_name":"Rule","object.name":"host1"}',
        '',
        'Event conditions:',
        '[FromNormalizer] {"uuid":"1","normalized":true}',
        '[FromAggregator] {"uuid":"1","normalized":true}',
        '[FromEnricher] {"uuid":"1","normalized":true}',
        '[FromCorrelator] {"correlation_name":"Rule","labels":"w_auto"}',
        '[FromAggregator] {"correlation_name":"Rule","labels":"w_auto"}',
        '[FromEnricher] {"correlation_name":"Rule","labels":"pre_whitelisted_1"}',
        '',
        'Events pipeline:',
        '*A 00000000-0000-0000-0000-000000000001 (Some_Normalization):',
        '  Normalizer -> Aggregator 2024-02-19T20:34:48.0000000',
        '',
        'Contents of the table lists (EnrichmentRule, CorrelationRule, Registry from test conditions):',
        '{',
        '  "Some_Table_List": [],',
        '  "Another_Table_List": []',
        '}'
      ].join('\r\n')
    );

    // Ни условие теста, ни состояние табличных списков не являются фактическими событиями.
    assert.deepStrictEqual(events, ['{"correlation_name":"Rule","labels":"pre_whitelisted_1"}']);
  });

  test('Файл фактических событий содержит события всех этапов конвейера', () => {
    // Так выглядит test_conds_N_events.txt: нормализованные события и корреляционное.
    const events = parseSiemj2Events(
      [
        '{"uuid":"1","generator.type":"logcollector","normalized":true}',
        '{"uuid":"2","generator.type":"logcollector","normalized":true}',
        '{"uuid":"3","generator.type":"correlationengine","correlation_name":"Rule"}'
      ].join('\r\n')
    );

    assert.strictEqual(events.length, 3);
  });

  test('Подробный отчет непрошедшего теста без этапов конвейера', () => {
    const events = parseSiemj2Events(
      [
        'The expected results for the events were not obtained.',
        'Expect 0, got 1 for ',
        '{"correlation_name":"Rule"}',
        'Event {',
        '  "correlation_name": "Rule",',
        '  "count": 1',
        '}'
      ].join('\n')
    );

    // Условие теста не является фактическим событием.
    assert.deepStrictEqual(events, ['{"correlation_name":"Rule","count":1}']);
  });

  test('Пустой результат теста', () => {
    assert.deepStrictEqual(parseSiemj2Events(''), []);
    assert.deepStrictEqual(parseSiemj2Events('Test SUCCESS'), []);
  });

  test('События, поступившие на вход корреляционному движку', () => {
    const events = parseSiemj2EventsBeforeCorrelation(
      [
        '[FromNormalizer] {"normalized":true}',
        '[FromEnricher] {"normalized":true,"enriched":true}',
        '[FromCorrelator] {"correlation_name":"Rule"}',
        '[FromEnricher] {"correlation_name":"Rule","enriched":true}'
      ].join('\r\n')
    );

    assert.deepStrictEqual(events, ['{"normalized":true,"enriched":true}']);
  });

  test('Поиск файлов с результатами теста по маске', () => {
    const eventsFileRegExp = RegExpHelper.getEnrichedCorrTestEventsFileNameV2('Rule', 3);

    assert.ok(eventsFileRegExp.test('C:\\Work\\Output\\reports\\tests\\test_conds_3_events.txt'));
    assert.ok(eventsFileRegExp.test('C:\\Work\\Output\\reports\\tests\\test_conds_3_result.txt'));
    assert.ok(!eventsFileRegExp.test('C:\\Work\\Output\\reports\\tests\\test_conds_13_events.txt'));
  });
});
