import * as vscode from 'vscode';
import * as assert from 'assert';
import * as fs from 'fs';

import { TestFixture } from '../../helper';
import { Test } from 'mocha';
import { ContentTreeProvider } from '../../../views/contentTree/contentTreeProvider';
import { Enrichment } from '../../../models/content/enrichment';

suite('Обогащения', () => {

	test('Парсинг обогащения без тестов', async () => {
		const rulePath = TestFixture.getEnrichmentPath("without_tests");
		const enrichment = await Enrichment.parseFromDirectory(rulePath);
		assert.ok(enrichment);
	});

	test('Успешный парсинг обогащения', async () => {
		const rulePath = TestFixture.getEnrichmentPath("MSSQL_user_command");
		const rule = await Enrichment.parseFromDirectory(rulePath);

		assert.strictEqual(rule.getName(), "MSSQL_user_command");
	});

	test('Успешная сработка нажатия на обогащении', async () => {
		const rulePath = TestFixture.getEnrichmentPath("MSSQL_user_command");
		const enrichment = await Enrichment.parseFromDirectory(rulePath);

		const commandResult = await vscode.commands.executeCommand(ContentTreeProvider.onRuleClickCommand, enrichment);
		assert.ok(commandResult);
	});
});