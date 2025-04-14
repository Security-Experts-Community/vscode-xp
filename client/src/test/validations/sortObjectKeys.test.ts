import * as assert from 'assert';

import { JsHelper } from '../../helpers/jsHelper';

suite('Сортировка ключей объектов', async () => {
  test('Сортируем объект с вложенными массивами', async () => {
    const objString =
      '{"b": [{"h": "1", "c":[{"n":2,"e": 5},{"l":1, "x":3}]},{"d":"3","c":"5"}], "w": "r", "s":"7"}';
    const expected =
      '{"b":[{"c":[{"e":5,"n":2},{"l":1,"x":3}],"h":"1"},{"c":"5","d":"3"}],"s":"7","w":"r"}';
    const obj = JSON.parse(objString);
    const sorted = JSON.stringify(JsHelper.sortObjectKeys(obj));
    assert.strictEqual(sorted, expected);
  });
});
