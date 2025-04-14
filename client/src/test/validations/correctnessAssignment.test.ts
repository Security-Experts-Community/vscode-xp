import * as vscode from 'vscode';
import * as assert from 'assert';

import { TestFixture, activate } from '../helper';

suite('Валидации присвоения в блоках on/emit', async () => {
  test('Одно некорректное присвоение в блоке on', async () => {
    const docUri = TestFixture.getValidationUri('on_incorrect_field_assignment.co');
    await activate(docUri);

    const actualDiagnostics = vscode.languages.getDiagnostics(docUri);
    assert.ok(actualDiagnostics.length == 1);
  });

  test('Некорректное присвоение в во втором блоке on', async () => {
    const docUri = TestFixture.getValidationUri('on_second_incorrect_field_assignment.co');
    await activate(docUri);

    const actualDiagnostics = vscode.languages.getDiagnostics(docUri);
    assert.ok(actualDiagnostics.length == 1);
  });

  test('Одно некорректное присвоение в блоке emit', async () => {
    const docUri = TestFixture.getValidationUri('emit_incorrect_field_assignment.co');
    await activate(docUri);

    const actualDiagnostics = vscode.languages.getDiagnostics(docUri);
    assert.ok(actualDiagnostics.length == 1);
  });
});
