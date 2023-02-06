import * as vscode from 'vscode';
import * as assert from 'assert';
import { getDocUri, activate } from '../../helper';
import { TestHelper } from '../../../helpers/testHelper';
import { KbHelper } from '../../../helpers/kbHelper';

suite('KbHelper', async () => {
	test('Два события скопированные через Ctrl+C из SIEM', async () => {

		const actual = KbHelper.convertWindowsEOFToLinux(`Тут встречается новая строка \r\n`);
		assert.strictEqual(actual, 'Тут встречается новая строка \n');
	});
});