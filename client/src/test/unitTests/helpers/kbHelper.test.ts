import * as vscode from 'vscode';
import * as assert from 'assert';
import { getDocUri, activate } from '../../helper';
import { TestHelper } from '../../../helpers/testHelper';
import { KbHelper } from '../../../helpers/kbHelper';
import { Correlation } from '../../../models/content/correlation';

suite('KbHelper', async () => {
	test('Два события скопированные через Ctrl+C из SIEM', async () => {
		const actual = KbHelper.convertWindowsEOFToLinux(`Тут встречается новая строка \r\n`);
		assert.strictEqual(actual, 'Тут встречается новая строка \n');
	});

	test('Проверяем коллизию для различных имён правил', async () => {
		const prefix = "ESC";

		const firstObjectId = KbHelper.generateRuleObjectId("ESC_Sessions_Hijacked", prefix);
		const secondObjectId = KbHelper.generateRuleObjectId("OpenVPN_Password_Spraying", prefix);

		assert.ok(firstObjectId != secondObjectId);
	});
});