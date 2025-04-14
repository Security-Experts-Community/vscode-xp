import * as assert from 'assert';
import { FunctionNameParser } from '../../providers/function/functionNameParser';

suite('Парсинг имен функций', () => {
  test('Вложенный вызов функций', () => {
    const parser = new FunctionNameParser();

    const text = '        and lower()';
    const actualFunctionName = parser.parse(text, 18);

    assert.strictEqual('lower', actualFunctionName);
  });

  test('Простой вызов', () => {
    const parser = new FunctionNameParser();

    const text = '        and lower(replace())';
    const actualFunctionName = parser.parse(text, 26);

    assert.strictEqual('replace', actualFunctionName);
  });
});
