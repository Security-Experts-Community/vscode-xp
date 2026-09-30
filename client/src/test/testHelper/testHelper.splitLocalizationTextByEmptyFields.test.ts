import * as assert from 'assert';

import { TestHelper } from '../../helpers/testHelper';

suite('TestHelper.splitLocalizationTextByEmptyFields', async () => {
  const templates = [
    '{datafield1}',
    'Пользователь {subject.account.name} с узла {src.host} провел атаку (попыток: {numfield1})'
  ];

  test('Пустых полей нет', async () => {
    const text = 'Пользователь admin с узла wks01 провел атаку (попыток: 3)';

    const actual = TestHelper.splitLocalizationTextByEmptyFields(templates, text, []);

    assert.deepStrictEqual(actual, [{ text, isEmptyField: false }]);
  });

  test('Пустое поле в середине текста', async () => {
    const actual = TestHelper.splitLocalizationTextByEmptyFields(
      templates,
      'Пользователь admin с узла  провел атаку (попыток: 3)',
      ['src.host']
    );

    assert.deepStrictEqual(actual, [
      { text: 'Пользователь admin с узла', isEmptyField: false },
      { text: '  ', isEmptyField: true },
      { text: 'провел атаку (попыток: 3)', isEmptyField: false }
    ]);
  });

  test('Несколько пустых полей, пробел только с одной стороны', async () => {
    const actual = TestHelper.splitLocalizationTextByEmptyFields(
      templates,
      'Пользователь  с узла wks01 провел атаку (попыток: )',
      ['subject.account.name', 'numfield1']
    );

    assert.deepStrictEqual(actual, [
      { text: 'Пользователь', isEmptyField: false },
      { text: '  ', isEmptyField: true },
      { text: 'с узла wks01 провел атаку (попыток:', isEmptyField: false },
      { text: ' ', isEmptyField: true },
      { text: ')', isEmptyField: false }
    ]);
  });

  test('Рядом с пустым полем нет пробелов', async () => {
    const actual = TestHelper.splitLocalizationTextByEmptyFields(
      ['Запущен процесс [{object.process.name}] пользователем {subject.account.name}'],
      'Запущен процесс [] пользователем admin',
      ['object.process.name']
    );

    assert.deepStrictEqual(actual, [
      { text: 'Запущен процесс [', isEmptyField: false },
      { text: '', isEmptyField: true },
      { text: '] пользователем admin', isEmptyField: false }
    ]);
  });

  test('Пустые поля подряд и в конце текста', async () => {
    const actual = TestHelper.splitLocalizationTextByEmptyFields(
      ['Узел {src.host} {src.ip} обратился к {dst.host}'],
      'Узел   обратился к ',
      ['src.host', 'src.ip', 'dst.host']
    );

    assert.deepStrictEqual(actual, [
      { text: 'Узел', isEmptyField: false },
      { text: '   ', isEmptyField: true },
      { text: 'обратился к', isEmptyField: false },
      { text: ' ', isEmptyField: true }
    ]);
  });

  test('Текст локализации не меняется', async () => {
    const text = 'Пользователь  с узла  провел атаку (попыток: )';

    const actual = TestHelper.splitLocalizationTextByEmptyFields(templates, text, [
      'subject.account.name',
      'src.host',
      'numfield1'
    ]);

    assert.strictEqual(actual.map((textPart) => textPart.text).join(''), text);
  });

  test('Текст не подходит ни под один шаблон с таким пустым полем', async () => {
    const text = 'account access system success на узле dc01';

    const actual = TestHelper.splitLocalizationTextByEmptyFields([templates[1]], text, [
      'src.host'
    ]);

    assert.deepStrictEqual(actual, [{ text, isEmptyField: false }]);
  });
});
