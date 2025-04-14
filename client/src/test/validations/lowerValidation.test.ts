import * as vscode from 'vscode';
import * as assert from 'assert';

import { activate, TestFixture } from '../helper';

suite('Проверки логики использования функции lower', async () => {
  test('Корректный код', async () => {
    const docUri = TestFixture.getValidationUri('lower_equals_noerror.co');
    await activate(docUri);

    const actualDiagnostics = vscode.languages.getDiagnostics(docUri);
    assert.ok(actualDiagnostics.length == 0);
  });

  test('regex(lower(datafield3), "\\.\\S{2,6}\\s+\\"))', async () => {
    const docUri = TestFixture.getValidationUri('regex_lower_noerror.co');
    await activate(docUri);

    const actualDiagnostics = vscode.languages.getDiagnostics(docUri);
    assert.ok(actualDiagnostics.length === 0);
  });

  test('regex(lower(datafield3), "UPN=(.*?)@", 1) != lower(subject.name)', async () => {
    const docUri = TestFixture.getValidationUri('regex_lower_error.co');
    await activate(docUri);

    const actualDiagnostics = vscode.languages.getDiagnostics(docUri);
    assert.ok(actualDiagnostics.length == 2);
  });

  test('match(lower(datafield3), "Upn=*")', async () => {
    const docUri = TestFixture.getValidationUri('match_lower_error.co');
    await activate(docUri);

    const actualDiagnostics = vscode.languages.getDiagnostics(docUri);
    assert.ok(actualDiagnostics.length == 1);
  });

  test('find_substr(lower(datafield1), "Ct_flag_enrollee_supplies_subject") != null', async () => {
    const docUri = TestFixture.getValidationUri('find_substr_lower_error.co');
    await activate(docUri);

    const actualDiagnostics = vscode.languages.getDiagnostics(docUri);
    assert.ok(actualDiagnostics.length == 1);
  });

  test('lower(event_src.subsys) == "Directory Service"', async () => {
    const docUri = TestFixture.getValidationUri('lower_equals_error.co');
    await activate(docUri);

    const actualDiagnostics = vscode.languages.getDiagnostics(docUri);
    assert.ok(actualDiagnostics.length == 1);
  });

  test('lower(event_src.subsys) != "Directory Service"', async () => {
    const docUri = TestFixture.getValidationUri('lower_not_equals_error.co');
    await activate(docUri);

    const actualDiagnostics = vscode.languages.getDiagnostics(docUri);
    assert.ok(actualDiagnostics.length == 1);
  });
});
