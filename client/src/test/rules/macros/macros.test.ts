import * as vscode from 'vscode';
import * as assert from 'assert';
import * as path from 'path';

import { TestFixture, getDocUri, testCompletion } from '../../helper';
import { ContentTreeProvider } from '../../../views/contentTree/contentTreeProvider';
import { Macros } from '../../../models/content/macros';
import { Configuration } from '../../../models/configuration';

suite('Макросы', () => {
  const docUri = getDocUri(path.join('completion', 'completion.flt'));

  test('Наличие автодополнения', async () => {
    const completions = await testCompletion(docUri, new vscode.Position(0, 0));
    assert.ok(completions.items.length > 0);
  });

  test('Успешный парсинг макроса без указания имени', async () => {
    const testMacrosPath = path.join(TestFixture.getFixturePath(), 'macros');

    const macroDirectory = TestFixture.getMacrosPath('ProcessStart');
    const macro = await Macros.parseFromDirectory(macroDirectory);

    assert.strictEqual(macroDirectory, path.join(testMacrosPath, 'ProcessStart'));
    assert.strictEqual(macro.getParentPath(), testMacrosPath);
    assert.strictEqual(macro.getDirectoryPath(), macroDirectory);
    assert.strictEqual(macro.getFileName(), 'filter.flt');
    assert.strictEqual(macro.getFilePath(), path.join(macroDirectory, 'filter.flt'));
    assert.strictEqual(macro.getMetaInfoFilePath(), path.join(macroDirectory, 'metainfo.yaml'));
    assert.strictEqual(macro.getName(), 'ProcessStart');
    assert.ok(macro.getCommand());
  });

  test('Успешный парсинг макроса с указанием имени', async () => {
    const testMacrosPath = path.join(TestFixture.getFixturePath(), 'macros');

    const macroDirectory = TestFixture.getMacrosPath('ProcessStart');
    const macro = await Macros.parseFromDirectory(macroDirectory, 'NewFile.flt');

    assert.strictEqual(macroDirectory, path.join(testMacrosPath, 'ProcessStart'));
    assert.strictEqual(macro.getParentPath(), testMacrosPath);
    assert.strictEqual(macro.getDirectoryPath(), macroDirectory);
    assert.strictEqual(macro.getFileName(), 'NewFile.flt');
    assert.strictEqual(macro.getFilePath(), path.join(macroDirectory, 'NewFile.flt'));
    assert.strictEqual(macro.getMetaInfoFilePath(), path.join(macroDirectory, 'metainfo.yaml'));
    assert.strictEqual(macro.getName(), 'ProcessStart');
    assert.ok(macro.getCommand());
  });

  test('Успешная сработка нажатия на макрос', async () => {
    const macroDirectory = TestFixture.getMacrosPath('ProcessStart');
    const macro = await Macros.parseFromDirectory(macroDirectory);

    const commandResult = await vscode.commands.executeCommand(
      ContentTreeProvider.onRuleClickCommand,
      macro
    );
    assert.ok(commandResult);
  });

  test('Правильное создание ObjectID', async () => {
    Configuration.get().setContentPrefix('LOC');

    const macroDirectory = TestFixture.getMacrosPath('ProcessStart');
    const macro = await Macros.parseFromDirectory(macroDirectory);
    const expectedObjectId = 'LOC-RF-196803747';
    assert.strictEqual(macro.generateObjectId(), expectedObjectId);
  });
});
