import * as vscode from 'vscode';
import * as assert from 'assert';

import { getDocUri, activate, TestFixture, toRange, testDiagnostics } from '../helper';

suite('Небезопасное преобразование типа Number к строке', async () => {
  test('Конкатенация dst.port', async () => {
    const docUri = TestFixture.getValidatioDirUri('type_to_string', 'dst_port_concat.co');
    await activate(docUri);

    const actualDiagnostics = vscode.languages.getDiagnostics(docUri);
    assert.ok(actualDiagnostics.length == 2);
  });

  test('Код без ошибок', async () => {
    const docUri = TestFixture.getValidatioDirUri('type_to_string', 'no_errors.co');
    await activate(docUri);

    const actualDiagnostics = vscode.languages.getDiagnostics(docUri);
    assert.ok(actualDiagnostics.length == 0);
  });
});
