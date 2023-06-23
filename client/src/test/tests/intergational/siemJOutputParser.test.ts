import * as assert from 'assert';
import * as vscode from 'vscode';

import { SiemJOutputParser } from '../../../models/siemj/siemJOutputParser';
import { TestFixture } from '../../helper';

suite('SiemJOutputParser', () => {

	test('Прошли все тесты', async () => {
		const parser = new SiemJOutputParser();

		const output = 
`
TEST_RULES [Err] :: Collected 5 tests.
...
TEST_RULES [Err] :: All tests OK`;

		const status = await parser.parse(output);

		assert.ok(status.testStatus);
		assert.strictEqual(status.failedTestNumbers.length, 0);
	});

	test('Сырое событие без конверта', async () => {
		const parser = new SiemJOutputParser();

		const output = 
`
TEST_RULES [Err] :: Collected 1 tests.
TEST_RULES [Err] :: Found invalid raw events (malformed JSON or lack of envelope fields) in "c:\\Content\\packages\\package1\\correlation_rules\\rule\\tests\\raw_events_1.json":
TEST_RULES [Err] :: 	Lines: 1
TEST_RULES [Err] :: Errors found.`;

		const status = await parser.parse(output);

		assert.ok(!status.testStatus);
	});

	test('Один тест не прошёл', async () => {
		const parser = new SiemJOutputParser();

		const output = 
`
TEST_RULES [Err] :: Collected 5 tests.
...
TEST_RULES :: Test Started: tests\\raw_events_1.json
TEST_RULES :: Expected results are not obtained.`;

		const status = await parser.parse(output);

		assert.ok(!status.testStatus);
		assert.strictEqual(status.failedTestNumbers.length, 1);
	});

	test('Одна строка с ошибкой', async () => {
		const parser = new SiemJOutputParser();

		const ruleFilePath = TestFixture.getCorrelationFilePath("Active_Directory_Snapshot", "rule.co");

		// BUILD_RULES [Err] :: C:\\Content\\knowledgebase\\packages\\esc\\correlation_rules\\active_directory\\Active_Directory_Snapshot\\rule.co:27:29: syntax error, unexpected '='`
		const output = `
BUILD_RULES [Err] :: ${ruleFilePath}:5:1: syntax error, unexpected '='`;

		const status = await parser.parse(output);
		const diagnostics = status.fileDiagnostics;

		assert.strictEqual(diagnostics.length, 1);
		assert.strictEqual(diagnostics[0].diagnostics.length, 1);

		const actualUriString = diagnostics[0].uri.toString();
		const expectedUriString = vscode.Uri.file(ruleFilePath).toString();
		assert.strictEqual(actualUriString, expectedUriString);

		assert.strictEqual(diagnostics[0].diagnostics[0].message, "syntax error, unexpected '='");
		assert.strictEqual(diagnostics[0].diagnostics[0].range.start.line, 4);
		assert.strictEqual(diagnostics[0].diagnostics[0].range.start.character, 0);
		assert.strictEqual(diagnostics[0].diagnostics[0].range.end.line, 4);
		assert.strictEqual(diagnostics[0].diagnostics[0].range.end.character, 1);
	});

	test('Одна строка с предупреждением', async () => {
		const parser = new SiemJOutputParser();

		const rulePath = TestFixture.getEnrichmentFilePath("MSSQL_user_command", "rule.en");
		const output = 		
`
BUILD_RULES [Err] :: ${rulePath}:7:15: warning: Read undefined variable 'target_asset'`;

		const status = await parser.parse(output);
		const diagnostics = status.fileDiagnostics;

		assert.strictEqual(diagnostics.length, 1);
		assert.strictEqual(diagnostics[0].diagnostics.length, 1);

		const actualUriString = diagnostics[0].uri.toString();
		const expextedUriString = vscode.Uri.file(rulePath).toString();
		assert.strictEqual(actualUriString, expextedUriString);

		assert.strictEqual(diagnostics[0].diagnostics[0].message, "Read undefined variable 'target_asset'");
		assert.strictEqual(diagnostics[0].diagnostics[0].range.start.line, 6);
		assert.strictEqual(diagnostics[0].diagnostics[0].range.start.character, 0);
		assert.strictEqual(diagnostics[0].diagnostics[0].range.end.line, 6);
		assert.strictEqual(diagnostics[0].diagnostics[0].range.end.character, 15);
	});
});

