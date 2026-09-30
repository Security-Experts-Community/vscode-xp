import * as assert from 'assert';

import { TestHelper } from '../../helpers/testHelper';
import { Localization, LocalizationExample } from '../../models/content/localization';

suite('TestHelper.getNotTriggeredLocalizations', async () => {
  const createExample = (ruText: string, enText: string) => {
    const example = new LocalizationExample();
    example.ruText = ruText;
    example.enText = enText;
    return example;
  };

  const first = Localization.create(
    'correlation_name = "Rule" and object = "artifact"',
    'Пользователь {subject.account.name} провел атаку на узле {event_src.host}',
    'User {subject.account.name} carried out an attack on host {event_src.host}'
  );
  const second = Localization.create(
    'correlation_name = "Rule" and object != "artifact"',
    'Возможная атака. Пользователь {subject.account.name} запросил билеты (для учетных записей: {datafield3})',
    'Possible attack. User {subject.account.name} requested tickets (for accounts: {datafield3})'
  );

  test('Все критерии сработали', async () => {
    const examples = [
      createExample(
        'Пользователь admin провел атаку на узле dc01',
        'User admin carried out an attack on host dc01'
      ),
      createExample(
        'Возможная атака. Пользователь admin запросил билеты (для учетных записей: user1|user2)',
        'Possible attack. User admin requested tickets (for accounts: user1|user2)'
      )
    ];

    const actual = TestHelper.getNotTriggeredLocalizations([first, second], examples);

    assert.deepStrictEqual(actual, []);
  });

  test('Один критерий не сработал', async () => {
    const examples = [
      createExample(
        'Возможная атака. Пользователь admin запросил билеты (для учетных записей: user1|user2)',
        'Possible attack. User admin requested tickets (for accounts: user1|user2)'
      )
    ];

    const actual = TestHelper.getNotTriggeredLocalizations([first, second], examples);

    assert.deepStrictEqual(actual, [first]);
  });

  test('Поле таксономии без значения', async () => {
    const examples = [
      createExample('Пользователь  провел атаку на узле ', 'User  carried out an attack on host ')
    ];

    const actual = TestHelper.getNotTriggeredLocalizations([first], examples);

    assert.deepStrictEqual(actual, []);
  });

  test('Локализация по умолчанию не относится ни к одному критерию', async () => {
    const examples = [
      createExample(
        'account access system success на узле dc01',
        'account access system success on host dc01'
      )
    ];

    const actual = TestHelper.getNotTriggeredLocalizations([first, second], examples);

    assert.deepStrictEqual(actual, [first, second]);
  });
});
