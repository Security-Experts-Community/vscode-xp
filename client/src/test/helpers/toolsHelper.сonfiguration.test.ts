import * as assert from 'assert';
import * as vscode from 'vscode';
import * as fs from 'fs';

import { Configuration } from '../../models/configuration';

suite('Configuration', () => {
  test('Наличие ecatest', () => {
    const fullPath = Configuration.get().getEcatestFullPath();
    assert.ok(fs.existsSync(fullPath));
  });

  test('Наличие таксономии', async () => {
    const fullPath = Configuration.get().getTaxonomyFullPath();
    assert.ok(fs.existsSync(fullPath));
  });

  test('Наличие siemj', async () => {
    const fullPath = Configuration.get().getSiemjPath();
    assert.ok(fs.existsSync(fullPath));
  });

  test('Создание временной директории', async () => {
    const fullPath = Configuration.get().getTmpDirectoryPath();
    assert.ok(fs.existsSync(fullPath));
  });
});
