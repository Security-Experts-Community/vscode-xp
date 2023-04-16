import * as vscode from 'vscode';
import * as assert from 'assert';

import { TestFixture } from '../helper';
import { ContentTreeProvider } from '../../views/contentTree/contentTreeProvider';
import { Table } from '../../models/content/table';

suite('Табличные списки', () => {

	test('Успешный парсинг ТС', async () => {
		const rulePath = TestFixture.getTablesPath("AD_Domain_Controllers");
		const table = await Table.parseFromDirectory(rulePath);
		
		assert.strictEqual(table.getName(), "AD_Domain_Controllers");
		assert.ok(table.getCommand());
	});

	test('Успешная сработка нажатия на ТС', async () => {
		const rulePath = TestFixture.getTablesPath("AD_Domain_Controllers");
		const table = await Table.parseFromDirectory(rulePath);

		const commandResult = await vscode.commands.executeCommand(ContentTreeProvider.onRuleClickCommand, table);
		assert.ok(commandResult);
	});
});