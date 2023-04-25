import * as vscode from 'vscode';
import * as assert from 'assert';
import * as path from 'path';

import { getDocUri, testCompletion, TestFixture } from '../../helper';
import { Normalization } from '../../../models/content/normalization';
import { ContentTreeProvider } from '../../../views/contentTree/contentTreeProvider';

suite('Нормализация', () => {

	const docUri = getDocUri(path.join('completion', 'completion.xp'));
	
	test('Наличие автодополнения', async () => {
		const completions = await testCompletion(docUri, new vscode.Position(0, 0));
		assert.ok(completions.items.length > 0);
	});

	test('Успешный парсинг нормализации', async () => {
		const rulePath = TestFixture.getNormalizationPath("1001_Application_Error");
		const normalization = await Normalization.parseFromDirectory(rulePath);

		assert.strictEqual(normalization.getName(), "1001_Application_Error");
		assert.ok(normalization.getCommand());
	});

	test('Успешная сработка нажатия на нормализации', async () => {
		const rulePath = TestFixture.getNormalizationPath("1001_Application_Error");
		const normalization = await Normalization.parseFromDirectory(rulePath);

		const commandResult = await vscode.commands.executeCommand(ContentTreeProvider.onRuleClickCommand, normalization);
		assert.ok(commandResult);
	});

	test('Перименование нормализации без кода', async () => {
		const rulePath = TestFixture.getCorrelationPath("empty_normalization_code");
		const normalization = await Normalization.parseFromDirectory(rulePath);
		const newName = "NEW_NORMALIZATION_NAME";
		normalization.rename(newName);
		assert.strictEqual(normalization.getName(), newName);
	});
});