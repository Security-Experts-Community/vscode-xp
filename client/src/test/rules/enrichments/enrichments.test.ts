import * as vscode from 'vscode';
import * as assert from 'assert';
import * as path from 'path';

import { getDocUri, testCompletion, TestFixture } from '../../helper';
import { ContentTreeProvider } from '../../../views/contentTree/contentTreeProvider';
import { Enrichment } from '../../../models/content/enrichment';
import { Configuration } from '../../../models/configuration';

suite('Обогащение', () => {
  const docUri = getDocUri(path.join('completion', 'completion.en'));

  test('ObjectID остается такой же после переименования', async () => {
    // Копируем корреляцию во временную директорию.
    const enrichment = Enrichment.create('New_enrichment');
    const oldId = enrichment.getMetaInfo().getObjectId();

    enrichment.rename('New_enrichment1');
    const newId = enrichment.getMetaInfo().getObjectId();

    assert.strictEqual(oldId, newId);
  });

  test('Правильное создание ObjectID', async () => {
    Configuration.get().setContentPrefix('LOC');

    const enrichment = Enrichment.create('New_enrichment');
    const expectedObjectId = 'LOC-ER-140080387';
    assert.strictEqual(enrichment.generateObjectId(), expectedObjectId);
    assert.strictEqual(enrichment.getMetaInfo().getObjectId(), expectedObjectId);
  });

  test('Наличие автодополнения', async () => {
    const completions = await testCompletion(docUri, new vscode.Position(0, 0));
    assert.ok(completions.items.length > 0);
  });

  test('Парсинг обогащения без тестов', async () => {
    const rulePath = TestFixture.getEnrichmentPath('without_tests');
    const enrichment = await Enrichment.parseFromDirectory(rulePath);

    assert.ok(enrichment);
  });

  test('Успешный парсинг обогащения', async () => {
    const rulePath = TestFixture.getEnrichmentPath('MSSQL_user_command');
    const rule = await Enrichment.parseFromDirectory(rulePath);

    assert.strictEqual(rule.getName(), 'MSSQL_user_command');
    assert.ok(rule.getRuleCode());
    assert.strictEqual(
      rule.getRuDescription(),
      `Извлечение имени команды или процесса из событий MS SQL`
    );
    assert.strictEqual(
      rule.getEnDescription(),
      `Extraction of a command or process name from MS SQL events`
    );
  });

  test('Успешная сработка нажатия на обогащении', async () => {
    const rulePath = TestFixture.getEnrichmentPath('MSSQL_user_command');
    const enrichment = await Enrichment.parseFromDirectory(rulePath);

    const commandResult = await vscode.commands.executeCommand(
      ContentTreeProvider.onRuleClickCommand,
      enrichment
    );
    assert.ok(commandResult);
  });

  test('Переименование обогащения с тестами и локализациями в памяти', async () => {
    const enrichmentName = `Super_Duper_Enrichment`;
    const enrichment = Enrichment.create(enrichmentName);
    await enrichment.setRuleCode(
      `enrichment ${enrichmentName}
    enrich correlation:
`
    );

    const it1 = enrichment.createIntegrationTest();
    it1.setNormalizedEvents('');
    it1.setTestCode(`expect 1 {"correlation_name" : "${enrichmentName}"}`);
    enrichment.addIntegrationTests([it1]);

    const unitTest = enrichment.addNewUnitTest();
    unitTest.setTestInputData('test input');
    unitTest.setTestExpectation('test expectation');

    const newEnrichmentName = 'NewEnrichmentName';
    await enrichment.rename(newEnrichmentName);

    // Общая проверка.
    assert.strictEqual(enrichment.getName(), newEnrichmentName);
    assert.strictEqual(enrichment.getMetaInfo().getName(), newEnrichmentName);
    assert.strictEqual(enrichment.getIntegrationTests().length, 1);
    assert.strictEqual(enrichment.getUnitTests().length, 1);

    // Детальная проверка.
    const newIt1 = enrichment.getIntegrationTests()[0];
    assert.strictEqual(
      newIt1.getTestCode(),
      `expect 1 {"correlation_name" : "${newEnrichmentName}"}`
    );
  });
});
