import * as vscode from 'vscode';
import * as assert from 'assert';
import * as path from 'path';

import { TestFixture } from '../helper';
import { ContentTreeProvider } from '../../views/contentTree/contentTreeProvider';
import { Table } from '../../models/content/table';
import { Configuration } from '../../models/configuration';
import { MetaInfo } from '../../models/metaInfo/metaInfo';

suite('Табличные списки', () => {
  test('Успешный парсинг ТС без указания имени файла табличного списка', async () => {
    const tablePath = TestFixture.getTablesPath('AD_Domain_Controllers');
    const testTablesPath = path.join(TestFixture.getFixturePath(), 'tables');
    const table = await Table.parseFromDirectory(tablePath);

    assert.strictEqual(table.getName(), 'AD_Domain_Controllers');
    assert.strictEqual(tablePath, path.join(testTablesPath, 'AD_Domain_Controllers'));
    assert.strictEqual(table.getParentPath(), testTablesPath);
    assert.strictEqual(table.getDirectoryPath(), tablePath);
    assert.strictEqual(table.getFileName(), Table.DEFAULT_TABLELIST_FILENAME);
    assert.strictEqual(table.getFilePath(), path.join(tablePath, Table.DEFAULT_TABLELIST_FILENAME));
    assert.strictEqual(
      table.getMetaInfoFilePath(),
      path.join(tablePath, MetaInfo.METAINFO_FILENAME)
    );
    assert.ok(table.getCommand());
  });

  test('Успешный парсинг ТС с указанием имени файла табличного списка', async () => {
    const tablePath = TestFixture.getTablesPath('AD_Domain_Controllers');
    const testTablesPath = path.join(TestFixture.getFixturePath(), 'tables');

    const tableFileName = 'table.tl';
    const table = await Table.parseFromDirectory(tablePath, tableFileName);

    assert.strictEqual(table.getName(), 'AD_Domain_Controllers');
    assert.strictEqual(tablePath, path.join(testTablesPath, 'AD_Domain_Controllers'));
    assert.strictEqual(table.getParentPath(), testTablesPath);
    assert.strictEqual(table.getDirectoryPath(), tablePath);
    assert.strictEqual(table.getFileName(), tableFileName);
    assert.strictEqual(table.getFilePath(), path.join(tablePath, tableFileName));
    assert.strictEqual(
      table.getMetaInfoFilePath(),
      path.join(tablePath, MetaInfo.METAINFO_FILENAME)
    );
    assert.ok(table.getCommand());
  });

  test('Успешная сработка нажатия на ТС', async () => {
    const tablePath = TestFixture.getTablesPath('AD_Domain_Controllers');
    const table = await Table.parseFromDirectory(tablePath);

    const commandResult = await vscode.commands.executeCommand(
      ContentTreeProvider.onRuleClickCommand,
      table
    );
    assert.ok(commandResult);
  });

  test('ObjectID остается такой же после переименования', async () => {
    // Копируем корреляцию во временную директорию.
    const tablePath = TestFixture.getTablesPath('AD_Domain_Controllers');
    const table = await Table.parseFromDirectory(tablePath);
    const oldId = table.getMetaInfo().getObjectId();

    table.rename('New_table1');
    const newId = table.getMetaInfo().getObjectId();

    assert.strictEqual(oldId, newId);
  });

  test('Правильное создание ObjectID', async () => {
    Configuration.get().setContentPrefix('LOC');

    const tablePath = TestFixture.getTablesPath('AD_Domain_Controllers');
    const table = await Table.parseFromDirectory(tablePath);
    const expectedObjectId = 'LOC-TL-757135800';
    assert.strictEqual(table.generateObjectId(), expectedObjectId);
  });
});
