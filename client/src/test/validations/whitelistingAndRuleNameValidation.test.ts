import * as vscode from 'vscode';

import { TestFixture, toRange, testDiagnostics } from '../helper';

suite('Валидация первого параметра макроса вайтлистинга и имени правила', async () => {
  test('Отличается имя корреляции и первый параметр макроса вайтлистинга в корреляции', async () => {
    const docUri = TestFixture.getValidationUri('whitelisting_and_corr_name_error.co');
    await testDiagnostics(docUri, [
      {
        message: 'Отличается имя корреляции и первый параметр макроса вайтлистинга',
        range: toRange(5, 43, 5, 56),
        severity: vscode.DiagnosticSeverity.Error,
        source: 'xp'
      }
    ]);
  });
});
