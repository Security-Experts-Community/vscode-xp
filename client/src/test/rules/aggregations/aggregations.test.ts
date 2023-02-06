import * as vscode from 'vscode';
import * as assert from 'assert';
import * as fs from 'fs';

import { TestFixture } from '../../helper';
import { Test } from 'mocha';
import { ContentTreeProvider } from '../../../views/contentTree/contentTreeProvider';
import { Aggregation } from '../../../models/content/aggregation';

suite('Агрегации', () => {

	test('Успешный парсинг агрегации', async () => {
		const rulePath = TestFixture.getAggregationsPath("Inspection_check_failed");
		const rule = await Aggregation.parseFromDirectory(rulePath);
		
		assert.strictEqual(rule.getName(), "Inspection_check_failed");
		assert.ok(rule.getCommand());
	});

	test('Успешная сработка нажатия на агрегации', async () => {
		const rulePath = TestFixture.getAggregationsPath("Inspection_check_failed");
		const aggregation = await Aggregation.parseFromDirectory(rulePath);

		const commandResult = await vscode.commands.executeCommand(ContentTreeProvider.onRuleClickCommand, aggregation);
		assert.ok(commandResult);
	});
});