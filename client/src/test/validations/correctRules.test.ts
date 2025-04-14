import * as vscode from 'vscode';
import * as assert from 'assert';

import { TestFixture, activate } from '../helper';

suite('Валидации корректных правил', async () => {
  test('Корректная корреляция', async () => {
    const docUri = TestFixture.getValidationUri('correctCorrelation.co');
    await activate(docUri);

    const actualDiagnostics = vscode.languages.getDiagnostics(docUri);
    assert.ok(actualDiagnostics.length == 0);
  });
});
