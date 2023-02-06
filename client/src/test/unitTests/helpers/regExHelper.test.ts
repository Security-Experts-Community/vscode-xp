import * as assert from 'assert';
import { Position, Range } from 'vscode';

import { RegExpHelper } from '../../../helpers/regExpHelper';

suite('RegExpHelper', async () => {

	test('Нет вызов функций', async () => {
		const actual = RegExpHelper.parseFunctionCalls(
			`Тут нет вызовов строк`,
			1,
			[]);

		assert.strictEqual(actual.length, 0);
	});

	test('Простой вызов', async () => {
		const actual = RegExpHelper.parseFunctionCalls(
			`        and lower(object.name) == "file"`,
			1,
			["lower"]);

		assert.strictEqual(actual.length, 1);

		const first = actual[0];
		assert.strictEqual(first.start.line, 1);
		assert.strictEqual(first.start.character, 12);

		assert.strictEqual(first.end.line, 1);
		assert.strictEqual(first.end.character, 17);
	});

	test('Простой закомменченный вызов', async () => {
		const actual = RegExpHelper.parseFunctionCalls(
			`#        and lower(object.name) == "file"`,
			1,
			["lower"]);

		assert.strictEqual(actual.length, 0);
	});

	test('Два вложенных вызова', async () => {
		const actual = RegExpHelper.parseFunctionCalls(
			`and regex(lower(object.path), "\\\\registry\\\\machine\\\\system\\\\(controlset001|currentcontrolset)\\\\services\\\\eventlog\\\\", 0) != null`,
			1,
			["regex", "lower"]);

		assert.strictEqual(actual.length, 2);

		const first = actual[0];
		assert.strictEqual(first.start.line, 1);
		assert.strictEqual(first.start.character, 4);

		assert.strictEqual(first.end.line, 1);
		assert.strictEqual(first.end.character, 9);

		const second = actual[1];
		assert.strictEqual(second.start.line, 1);
		assert.strictEqual(second.start.character, 10);

		assert.strictEqual(second.end.line, 1);
		assert.strictEqual(second.end.character, 15);

	});
});
