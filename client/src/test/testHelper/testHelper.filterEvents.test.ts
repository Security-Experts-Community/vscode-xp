import * as assert from 'assert';

import { TestHelper } from '../../helpers/testHelper';

suite('Отбор фактических событий по условию интеграционного теста', () => {
  const correlationEvent =
    '{"correlation_name":"Some_Correlation","subject":"account","object.name":"user1"}';
  const enrichedNormEvent =
    '{"subject":"account","object.name":"user1","subject.account.name":"ivanov"}';
  const actualEvents = [correlationEvent, enrichedNormEvent];

  test('Условие без correlation_name: приоритет у событий после коррелятора', () => {
    const events = TestHelper.filterEventsByExpectedStage(
      actualEvents,
      '{"subject":"account","subject.account.name":"ivanov"}'
    );

    assert.deepStrictEqual(events, [correlationEvent]);
  });

  test('Условие без correlation_name: событий после коррелятора нет, берутся события до него', () => {
    const events = TestHelper.filterEventsByExpectedStage(
      [enrichedNormEvent],
      '{"subject":"account","subject.account.name":"ivanov"}'
    );

    assert.deepStrictEqual(events, [enrichedNormEvent]);
  });

  test('Сработало несколько правил: приоритет у события тестируемого правила', () => {
    const anotherCorrelationEvent =
      '{"correlation_name":"Another_Correlation","subject":"account","object.name":"user1"}';

    const events = TestHelper.filterEventsByExpectedStage(
      [anotherCorrelationEvent, correlationEvent, enrichedNormEvent],
      '{"subject":"account"}',
      'Some_Correlation'
    );

    assert.deepStrictEqual(events, [correlationEvent]);
  });

  test('Тестируемое правило не сработало: берутся события сработавших правил', () => {
    const anotherCorrelationEvent =
      '{"correlation_name":"Another_Correlation","subject":"account","object.name":"user1"}';

    const events = TestHelper.filterEventsByExpectedStage(
      [anotherCorrelationEvent, enrichedNormEvent],
      '{"subject":"account"}',
      'Some_Correlation'
    );

    assert.deepStrictEqual(events, [anotherCorrelationEvent]);
  });

  test('Пустое условие теста: берется событие тестируемого правила', () => {
    const anotherCorrelationEvent =
      '{"correlation_name":"Another_Correlation","subject":"account","object.name":"user1"}';

    const events = TestHelper.filterEventsByExpectedStage(
      [anotherCorrelationEvent, correlationEvent, enrichedNormEvent],
      '{}',
      'Some_Correlation'
    );

    assert.deepStrictEqual(events, [correlationEvent]);
  });

  test('Обогащение корреляционных событий: событие после коррелятора', () => {
    const events = TestHelper.filterEventsByExpectedStage(
      actualEvents,
      '{"correlation_name":"Some_Correlation","subject":"account"}'
    );

    assert.deepStrictEqual(events, [correlationEvent]);
  });

  test('Проверяемая корреляция не сработала: события не отбрасываются', () => {
    const events = TestHelper.filterEventsByExpectedStage(
      actualEvents,
      '{"correlation_name":"Another_Correlation"}'
    );

    assert.deepStrictEqual(events, actualEvents);
  });

  test('Пустое условие теста: берется корреляционное событие', () => {
    assert.deepStrictEqual(TestHelper.filterEventsByExpectedStage(actualEvents, '{}'), [
      correlationEvent
    ]);
  });

  test('Пустое условие теста: корреляционных событий нет, берется последнее обогащенное', () => {
    const firstEnrichedEvent = '{"subject":"account","object.name":"user1"}';
    const lastEnrichedEvent = '{"subject":"account","object.name":"user2"}';

    assert.deepStrictEqual(
      TestHelper.filterEventsByExpectedStage([firstEnrichedEvent, lastEnrichedEvent], '{}'),
      [lastEnrichedEvent]
    );
  });

  test('Условие теста не задано: события не отбрасываются', () => {
    assert.deepStrictEqual(TestHelper.filterEventsByExpectedStage(actualEvents, null), actualEvents);
  });

  test('Несколько событий одного этапа: выбирается ближайшее к условию теста', () => {
    const loginEvent = '{"subject":"account","object.name":"user1","action":"login"}';
    const startEvent = '{"subject":"process","object.name":"user2","action":"start"}';

    const events = TestHelper.selectEventsClosestToExpected(
      [loginEvent, startEvent],
      '{"subject":"account","action":"login"}'
    );

    assert.deepStrictEqual(events, [loginEvent]);
  });

  test('Тест не прошел из-за изменившегося поля: событие все равно находится', () => {
    const changedEvent = '{"subject":"account","object.name":"user_renamed","action":"login"}';
    const otherEvent = '{"subject":"process","object.name":"user2","action":"start"}';

    const events = TestHelper.selectEventsClosestToExpected(
      [changedEvent, otherEvent],
      '{"subject":"account","object.name":"user1","action":"login"}'
    );

    assert.deepStrictEqual(events, [changedEvent]);
  });

  test('Пустое условие теста: события не отбрасываются', () => {
    const firstEvent = '{"subject":"account"}';
    const secondEvent = '{"subject":"process"}';

    assert.deepStrictEqual(
      TestHelper.selectEventsClosestToExpected([firstEvent, secondEvent], '{}'),
      [firstEvent, secondEvent]
    );
  });

  test('Совпадений по полям нет: события не отбрасываются', () => {
    const firstEvent = '{"subject":"account"}';
    const secondEvent = '{"subject":"process"}';

    assert.deepStrictEqual(
      TestHelper.selectEventsClosestToExpected([firstEvent, secondEvent], '{"another.field":"x"}'),
      [firstEvent, secondEvent]
    );
  });

  test('Несколько сработок правила: все события корреляционные', () => {
    const firstCorrelationEvent = '{"correlation_name":"Some_Correlation","object.name":"user1"}';
    const secondCorrelationEvent = '{"correlation_name":"Some_Correlation","object.name":"user2"}';

    assert.ok(TestHelper.isCorrelationEvents([firstCorrelationEvent, secondCorrelationEvent]));
    assert.ok(!TestHelper.isCorrelationEvents([firstCorrelationEvent, enrichedNormEvent]));
    assert.ok(!TestHelper.isCorrelationEvents([]));
  });

  test('Тест без ожидаемого события', () => {
    assert.ok(TestHelper.isNegativeTest('expect 0 {"correlation_name": "Some_Correlation"}'));
    assert.ok(TestHelper.isNegativeTest('expect not {"correlation_name": "Some_Correlation"}'));
    assert.ok(!TestHelper.isNegativeTest('expect 1 {"correlation_name": "Some_Correlation"}'));
  });
});
