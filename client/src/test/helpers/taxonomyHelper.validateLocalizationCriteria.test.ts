import * as assert from 'assert';

import { TaxonomyHelper } from '../../helpers/taxonomyHelper';
import { TaxonomyFieldDetails } from '../../providers/taxonomyFieldDetails';

suite('TaxonomyHelper.validateLocalizationCriteria', async () => {
  const taxonomy: Record<string, TaxonomyFieldDetails> = {
    correlation_name: { type: 'String' },
    datafield1: { type: 'String' },
    numfield1: { type: 'Number' },
    'count.subevents': { type: 'Number' },
    'subject.account.name': { type: 'String' },
    'src.ip': { type: 'IPAddress' },
    // У полей-перечислений тип не задан.
    object: { type: undefined }
  };

  test('Корректный критерий', async () => {
    const actual = TaxonomyHelper.validateLocalizationCriteria(
      'correlation_name = "Rule" and count.subevents = 1 and (numfield1 != 3 or datafield1 == "3") and object != "process" and subject.account.name != null and src.ip = "10.0.0.1"',
      taxonomy
    );

    assert.deepStrictEqual(actual, []);
  });

  test('Поля нет в таксономии', async () => {
    const actual = TaxonomyHelper.validateLocalizationCriteria(
      'correlation_name = "Rule" and datafield100 = null and subject.account.nam != null',
      taxonomy
    );

    assert.deepStrictEqual(actual, [
      'поле datafield100 отсутствует в таксономии',
      'поле subject.account.nam отсутствует в таксономии'
    ]);
  });

  test('Числовое поле сравнивается со строкой', async () => {
    const actual = TaxonomyHelper.validateLocalizationCriteria(
      'correlation_name = "Rule" and numfield1 = "3"',
      taxonomy
    );

    assert.deepStrictEqual(actual, ['числовое поле numfield1 сравнивается со строкой "3"']);
  });

  test('Строковое поле сравнивается с числом', async () => {
    const actual = TaxonomyHelper.validateLocalizationCriteria(
      'correlation_name = "Rule" and datafield1 = 3',
      taxonomy
    );

    assert.deepStrictEqual(actual, ['строковое поле datafield1 сравнивается с числом 3']);
  });

  test('Поле без типа и поле нечислового типа считаются строковыми', async () => {
    const actual = TaxonomyHelper.validateLocalizationCriteria(
      'object = 1 or src.ip != 2',
      taxonomy
    );

    assert.deepStrictEqual(actual, [
      'строковое поле object сравнивается с числом 1',
      'строковое поле src.ip сравнивается с числом 2'
    ]);
  });

  test('Оператор без пробелов и значение слева от поля', async () => {
    const actual = TaxonomyHelper.validateLocalizationCriteria(
      'numfield1="3" and 5 != datafield1',
      taxonomy
    );

    assert.deepStrictEqual(actual, [
      'числовое поле numfield1 сравнивается со строкой "3"',
      'строковое поле datafield1 сравнивается с числом 5'
    ]);
  });

  test('Имена полей внутри строк не проверяются', async () => {
    const actual = TaxonomyHelper.validateLocalizationCriteria(
      'datafield1 = "unknown_field = 3 and numfield1 = \\"3\\""',
      taxonomy
    );

    assert.deepStrictEqual(actual, []);
  });

  test('Одинаковые ошибки не дублируются', async () => {
    const actual = TaxonomyHelper.validateLocalizationCriteria(
      'unknown_field = "a" or unknown_field = "b"',
      taxonomy
    );

    assert.deepStrictEqual(actual, ['поле unknown_field отсутствует в таксономии']);
  });
});
