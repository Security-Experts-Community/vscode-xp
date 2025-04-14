import * as assert from 'assert';

import { JsHelper } from '../../helpers/jsHelper';

suite('JsHelper.sortRootKeysAccordingToSchema', async () => {
  test('Ключи корректно сортируются в соответствии со схемой', async () => {
    const data = {
      a: 'a',
      h: 'h',
      b: 'b',
      g: 'g',
      c: 'c',
      d: 'd',
      f: 'f'
    };
    const schema = ['f', 'g', 'h'];
    const result = JsHelper.sortRootKeysAccordingToSchema(data, schema);
    const expected = {
      f: 'f',
      g: 'g',
      h: 'h',
      a: 'a',
      b: 'b',
      c: 'c',
      d: 'd'
    };

    assert.strictEqual(JSON.stringify(result), JSON.stringify(expected));
  });

  test('Возвращается копия исходного объекта, если он не содержит ключей из схемы', async () => {
    const data = {
      a: 'a',
      b: 'b',
      c: 'c'
    };
    const schema = ['d', 'f', 'g'];
    const result = JsHelper.sortRootKeysAccordingToSchema(data, schema);
    const expected = data;

    assert.strictEqual(JSON.stringify(result), JSON.stringify(expected));
  });

  test('Возвращается пустой объект для пустого исходного объекта', async () => {
    const data = {};
    const schema = [];
    const result = JsHelper.sortRootKeysAccordingToSchema(data, schema);
    const expected = data;

    assert.strictEqual(JSON.stringify(result), JSON.stringify(expected));
  });

  test('Возвращается копия иходного объекта для пустой схемы', async () => {
    const data = {
      a: 'a',
      b: 'b',
      c: 'c'
    };
    const schema = [];
    const result = JsHelper.sortRootKeysAccordingToSchema(data, schema);
    const expected = data;

    assert.strictEqual(JSON.stringify(result), JSON.stringify(expected));
  });

  test('Корректно обрабатываются различные типы данных', async () => {
    const data = {
      i: [
        {
          j: 'j',
          k: [{ b: 'b' }, { m: {} }],
          l: {},
          a: 'a'
        }
      ],
      a: {},
      f: 'f',
      b: null,
      g: 'g',
      c: false,
      h: 'h',
      e: 'e',
      d: []
    };
    const schema = ['a', 'b', 'c', 'd'];
    const result = JsHelper.sortRootKeysAccordingToSchema(data, schema);
    const expected = {
      a: {},
      b: null,
      c: false,
      d: [],
      i: [
        {
          j: 'j',
          k: [{ b: 'b' }, { m: {} }],
          l: {},
          a: 'a'
        }
      ],
      f: 'f',
      g: 'g',
      h: 'h',
      e: 'e'
    };

    assert.strictEqual(JSON.stringify(result), JSON.stringify(expected));
  });
});
