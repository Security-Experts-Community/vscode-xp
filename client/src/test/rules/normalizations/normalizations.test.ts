import * as vscode from 'vscode';
import * as assert from 'assert';
import * as fs from 'fs';

import { TestFixture } from '../../helper';
import { Test } from 'mocha';
import { Normalization } from '../../../models/content/normalization';
import { ContentTreeProvider } from '../../../views/contentTree/contentTreeProvider';

suite('Нормализации', () => {

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
});