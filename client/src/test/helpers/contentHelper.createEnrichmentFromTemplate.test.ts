import * as vscode from 'vscode';
import * as assert from 'assert';
import * as fs from 'fs';

import { getDocUri, activate, TestFixture } from '../helper';
import { TestHelper } from '../../helpers/testHelper';
import { Correlation } from '../../models/content/correlation';
import { ContentHelper } from '../../helpers/contentHelper';
import { Configuration } from '../../models/configuration';

suite('CorrelationHelper.createEnrichmentFromTemplate', async () => {
  test('Создание пустого обогащения', async () => {
    const ruleName = 'Empty_Enrichment';
    const rule = await ContentHelper.createEnrichmentFromTemplate(
      ruleName,
      'Empty',
      Configuration.get()
    );

    assert.strictEqual(rule.getName(), ruleName);
    assert.strictEqual(rule.getMetaInfo().getName(), ruleName);
  });

  test('Создание универсального обогащения', async () => {
    const ruleName = 'Universal_Enrichment';
    const rule = await ContentHelper.createEnrichmentFromTemplate(
      ruleName,
      'Universal',
      Configuration.get()
    );

    assert.strictEqual(rule.getName(), ruleName);
    assert.strictEqual(rule.getMetaInfo().getName(), ruleName);
  });

  // Создаем временную директорию.
  setup(() => {
    const tmpPath = TestFixture.getTmpPath();
    if (!fs.existsSync(tmpPath)) {
      fs.mkdirSync(tmpPath);
    }
  });

  // Удаляем созданные корреляции.
  teardown(() => {
    const tmpPath = TestFixture.getTmpPath();
    if (fs.existsSync(tmpPath)) {
      fs.rmdirSync(tmpPath, { recursive: true });
    }
  });
});
