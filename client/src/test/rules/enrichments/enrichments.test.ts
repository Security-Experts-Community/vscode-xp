import * as vscode from 'vscode';
import * as assert from 'assert';
import * as path from 'path';

import { getDocUri, testCompletion, TestFixture } from '../../helper';
import { ContentTreeProvider } from '../../../views/contentTree/contentTreeProvider';
import { Enrichment } from '../../../models/content/enrichment';

suite('Обогащение', () => {

	const docUri = getDocUri(path.join('completion', 'completion.en'));

	test('ObjectID остается такой же после переименования', async () => {
		// Копируем корреляцию во временную директорию.
		const enrichment = Enrichment.create("New_enrichment");
		const oldId = enrichment.getMetaInfo().getObjectId();

		enrichment.rename("New_enrichment1");
		const newId = enrichment.getMetaInfo().getObjectId();

		assert.strictEqual(oldId, newId);
	});

	test('Наличие автодополнения', async () => {
		const completions = await testCompletion(docUri, new vscode.Position(0, 0));
		assert.ok(completions.items.length > 0);
	});

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