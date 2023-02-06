import * as vscode from 'vscode';
import * as assert from 'assert';

import { getDocUri, testCompletion } from '../../helper';

suite('Автодополнение для корреляций', () => {
	const docUri = getDocUri('completion.en');

	test('Наличие автодополнения', async () => {
		const completions = await testCompletion(docUri, new vscode.Position(0, 0));
		assert.ok(completions.items.length >= 0);
	});
});

