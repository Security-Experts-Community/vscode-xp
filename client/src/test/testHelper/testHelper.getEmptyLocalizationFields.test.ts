import * as assert from 'assert';

import { TestHelper } from '../../helpers/testHelper';
import { Localization } from '../../models/content/localization';

suite('TestHelper.getEmptyLocalizationFields', async () => {
  const attack = Localization.create(
    'correlation_name = "Rule" and object = "artifact"',
    'Пользователь {subject.account.name} с узла {src.host} провел атаку (попыток: {numfield1})',
    'User {subject.account.name} from host {src.host} carried out an attack (attempts: {numfield1})'
  );
  const anyText = Localization.create('correlation_name = "Rule"', '{datafield1}', '{datafield1}');

  test('Все поля шаблона заполнены', async () => {
    const event = { 'subject.account.name': 'admin', 'src.host': 'wks01', numfield1: 0 };

    const actual = TestHelper.getEmptyLocalizationFields(
      [attack],
      event,
      'Пользователь admin с узла wks01 провел атаку (попыток: 0)',
      'User admin from host wks01 carried out an attack (attempts: 0)'
    );

    assert.deepStrictEqual(actual, []);
  });

  test('Поля нет в событии, поле равно null или пустой строке', async () => {
    const event = { 'subject.account.name': '', 'src.host': null as string };

    const actual = TestHelper.getEmptyLocalizationFields(
      [attack],
      event,
      'Пользователь  с узла  провел атаку (попыток: )',
      'User  from host  carried out an attack (attempts: )'
    );

    assert.deepStrictEqual(actual, ['subject.account.name', 'src.host', 'numfield1']);
  });

  test('Поля проверяются только у сработавшего шаблона', async () => {
    const event = { 'subject.account.name': 'admin', 'src.host': 'wks01', numfield1: 3 };

    const actual = TestHelper.getEmptyLocalizationFields(
      [anyText, attack],
      event,
      'Пользователь admin с узла wks01 провел атаку (попыток: 3)',
      'User admin from host wks01 carried out an attack (attempts: 3)'
    );

    assert.deepStrictEqual(actual, []);
  });

  test('Локализация по умолчанию не относится ни к одному шаблону', async () => {
    const actual = TestHelper.getEmptyLocalizationFields(
      [attack],
      {},
      'account access system success на узле dc01',
      'account access system success on host dc01'
    );

    assert.deepStrictEqual(actual, []);
  });
});
