import * as vscode from 'vscode';
import * as assert from 'assert';

import { getDocUri, activate, TestFixture } from '../helper';

suite('Проверка валидаций корректности кода корреляции.', async () => {

	test('Код корректный. Встречается доллар в строчной константе alert.key.', async () => {
		const docUri = getDocUri('dollarInAlertKeyString.co');
		await activate(docUri);

		const actualDiagnostics = vscode.languages.getDiagnostics(docUri);
		assert.ok(actualDiagnostics.length == 0);
	});

	test('Корректная корреляция', async () => {
		const docUri = getDocUri('correctCorrelation.co');
		await activate(docUri);

		const actualDiagnostics = vscode.languages.getDiagnostics(docUri);
		assert.ok(actualDiagnostics.length == 0);
	});
	
	test('Отличие первого параметра вайтлистинга и имени корреляции', async () => {
		const docUri = getDocUri('whiteListingCorrNameError.co');
		await testDiagnostics(docUri, [
			{
				message: 'Отличается имя корреляции и первый параметр макроса вайтлистинга',
				range: toRange(5, 43, 5, 56), 
				severity: vscode.DiagnosticSeverity.Error, 
				source: 'xp' 
			}
		]);
	});


	test('Проверка совпадения второго параметра вайтлистинга и параметра alert.key', async () => {
		const docUri = getDocUri('whitelistingAndAlertKeyError.co');
		await activate(docUri);

		const actualDiagnostics = vscode.languages.getDiagnostics(docUri);
		assert.ok(actualDiagnostics.length == 0);
	});


	test('Проверка использования в вайтлистинге alert.key из сабруля. Сработок быть не должно.', async () => {
		const docUri = getDocUri('whitelistingSubRuleAlertKey.co');
		await activate(docUri);

		const actualDiagnostics = vscode.languages.getDiagnostics(docUri);
		assert.ok(actualDiagnostics.length == 0);
	});
});

function toRange(sLine: number, sChar: number, eLine: number, eChar: number) {
	const start = new vscode.Position(sLine, sChar);
	const end = new vscode.Position(eLine, eChar);
	return new vscode.Range(start, end);
}

async function testDiagnostics(docUri: vscode.Uri, expectedDiagnostics: vscode.Diagnostic[]) {
	await activate(docUri);

	const actualDiagnostics = vscode.languages.getDiagnostics(docUri);

	assert.strictEqual(actualDiagnostics.length, expectedDiagnostics.length);

	expectedDiagnostics.forEach((expectedDiagnostic, i) => {
		const actualDiagnostic = actualDiagnostics[i];
		assert.strictEqual(actualDiagnostic.message, expectedDiagnostic.message);
		assert.deepStrictEqual(actualDiagnostic.range, expectedDiagnostic.range);
		assert.strictEqual(actualDiagnostic.severity, expectedDiagnostic.severity);
	});
}