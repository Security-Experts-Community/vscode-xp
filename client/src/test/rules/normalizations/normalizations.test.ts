import * as vscode from 'vscode';
import * as assert from 'assert';
import * as path from 'path';

import { getDocUri, testCompletion, TestFixture } from '../../helper';
import { Normalization } from '../../../models/content/normalization';
import { ContentTreeProvider } from '../../../views/contentTree/contentTreeProvider';
import { Configuration } from '../../../models/configuration';

suite('Нормализация', () => {
  const docUri = getDocUri(path.join('completion', 'completion.xp'));

  test('Наличие автодополнения', async () => {
    const completions = await testCompletion(docUri, new vscode.Position(0, 0));
    assert.ok(completions.items.length > 0);
  });

  test('Успешный парсинг нормализации', async () => {
    const rulePath = TestFixture.getNormalizationPath('1001_Application_Error');
    const normalization = await Normalization.parseFromDirectory(rulePath);

    assert.strictEqual(normalization.getName(), '1001_Application_Error');
    assert.ok(normalization.getCommand());
  });

  test('Успешная сработка нажатия на нормализации', async () => {
    const rulePath = TestFixture.getNormalizationPath('1001_Application_Error');
    const normalization = await Normalization.parseFromDirectory(rulePath);

    const commandResult = await vscode.commands.executeCommand(
      ContentTreeProvider.onRuleClickCommand,
      normalization
    );
    assert.ok(commandResult);
  });

  test('Перименование нормализации без кода', async () => {
    const rulePath = TestFixture.getNormalizationPath('empty_normalization_code');
    const normalization = await Normalization.parseFromDirectory(rulePath);
    const newName = 'NEW_NORMALIZATION_NAME';
    normalization.rename(newName);
    assert.strictEqual(normalization.getName(), newName);
  });

  test('ObjectID остается такой же после переименования', async () => {
    // Копируем корреляцию во временную директорию.
    const rulePath = TestFixture.getNormalizationPath('empty_normalization_code');
    const normalization = await Normalization.parseFromDirectory(rulePath);
    const oldId = normalization.getMetaInfo().getObjectId();

    normalization.rename('New_normalization1');
    const newId = normalization.getMetaInfo().getObjectId();

    assert.strictEqual(oldId, newId);
  });

  test('Правильное создание ObjectID', async () => {
    Configuration.get().setContentPrefix('LOC');

    const rulePath = TestFixture.getNormalizationPath('empty_normalization_code');
    const normalization = await Normalization.parseFromDirectory(rulePath);
    const expectedObjectId = 'LOC-NF-196826125';
    assert.strictEqual(normalization.generateObjectId(), expectedObjectId);
    assert.strictEqual(normalization.getMetaInfo().getObjectId(), expectedObjectId);
  });
});
