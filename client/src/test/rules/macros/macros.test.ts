import * as vscode from 'vscode';
import * as assert from 'assert';
import * as path from 'path';

import { getDocUri, testCompletion } from '../../helper';

suite('Макрос', () => {

	const docUri = getDocUri(path.join('completion', 'completion.flt'));
	
	test('Наличие автодополнения', async () => {
		const completions = await testCompletion(docUri, new vscode.Position(0, 0));
		assert.ok(completions.items.length > 0);
	});
});