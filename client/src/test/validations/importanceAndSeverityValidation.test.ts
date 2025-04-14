import * as vscode from 'vscode';
import * as assert from 'assert';

import { activate, TestFixture } from '../helper';

suite('Валидация равенства $importance и $incident.severity', async () => {
  test('Различные константные значения', async () => {
    const docUri = TestFixture.getValidationUri('importance_not_equals_severity.co');
    await activate(docUri);

    const actualDiagnostics = vscode.languages.getDiagnostics(docUri);
    assert.ok(actualDiagnostics.length == 1);
  });

  test('$incident.severity присваевается $importance', async () => {
    const docUri = TestFixture.getValidationUri('severity_equals_importance.co');
    await activate(docUri);

    const actualDiagnostics = vscode.languages.getDiagnostics(docUri);
    assert.ok(actualDiagnostics.length == 0);
  });
});
