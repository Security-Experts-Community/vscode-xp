import * as vscode from 'vscode';
import * as assert from 'assert';

import { getDocUri, activate, TestFixture, toRange, testDiagnostics } from '../helper';

suite('Проверка валидаций корректности кода корреляции.', async () => {
  test('Проверка использования в вайтлистинге alert.key из сабруля. Сработок быть не должно.', async () => {
    const docUri = TestFixture.getValidationUri('subrule_alertkey_redifinition.co');
    await activate(docUri);

    const actualDiagnostics = vscode.languages.getDiagnostics(docUri);
    assert.ok(actualDiagnostics.length == 0);
  });

  test('alert.key задается в блоке emit', async () => {
    const docUri = TestFixture.getValidationUri('alertkey_emit_definition_noerror.co');
    await activate(docUri);

    const actualDiagnostics = vscode.languages.getDiagnostics(docUri);
    assert.ok(actualDiagnostics.length == 0);
  });
});
