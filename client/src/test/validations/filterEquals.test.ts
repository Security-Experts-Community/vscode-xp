import * as vscode from 'vscode';
import * as assert from 'assert';

import { activate, TestFixture } from '../helper';

suite('Сравнение в блоке filter', async () => {
  test('Использование одиночного = в одном фильтре', async () => {
    const docUri = TestFixture.getValidationUri('multy_filter_equals_error.co');
    await activate(docUri);

    const actualDiagnostics = vscode.languages.getDiagnostics(docUri);
    assert.ok(actualDiagnostics.length == 2);
  });
});
