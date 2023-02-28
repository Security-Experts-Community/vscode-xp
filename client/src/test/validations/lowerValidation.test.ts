import * as vscode from 'vscode';
import * as assert from 'assert';

import { activate, TestFixture } from '../helper';

suite('Проверки логики использования lower()', async () => {

	test('Корректный код', async () => {
		const docUri = TestFixture.getValidationUri('lower_equals_noerror.co');
		await activate(docUri);

		const actualDiagnostics = vscode.languages.getDiagnostics(docUri);
		assert.ok(actualDiagnostics.length == 0);
	});


	test('lower(event_src.subsys) == "Directory Service"', async () => {
		const docUri = TestFixture.getValidationUri('lower_equals_single_error.co');
		await activate(docUri);

		const actualDiagnostics = vscode.languages.getDiagnostics(docUri);
		assert.ok(actualDiagnostics.length == 1);
	});

	test('lower(event_src.subsys) != "Directory Service"', async () => {
		const docUri = TestFixture.getValidationUri('lower_not_equals_single_error.co');
		await activate(docUri);

		const actualDiagnostics = vscode.languages.getDiagnostics(docUri);
		assert.ok(actualDiagnostics.length == 1);
	});
});