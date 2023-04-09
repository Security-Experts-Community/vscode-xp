import * as assert from 'assert';
import * as vscode from 'vscode';

import { SiemJOutputParser } from '../../../models/siemj/siemJOutputParser';
import { Configuration } from '../../../models/configuration';
import { TestFixture } from '../../helper';

suite('ModuleTestOutputParser', () => {

	test('Одна строка с ошибкой', async () => {
		const parser = new SiemJOutputParser();

		const ruleFilePath = TestFixture.getCorrelationFilePath("Active_Directory_Snapshot", "rule.co");

		// BUILD_RULES [Err] :: C:\\Content\\knowledgebase\\packages\\esc\\correlation_rules\\active_directory\\Active_Directory_Snapshot\\rule.co:27:29: syntax error, unexpected '='`
		const output = `
BUILD_RULES [Err] :: ${ruleFilePath}:5:1: syntax error, unexpected '='`

		const diagnostics = await parser.parse(output);

		assert.strictEqual(diagnostics.length, 1);
		assert.strictEqual(diagnostics[0].Diagnostics.length, 1);

		const actualUriString = diagnostics[0].Uri.toString();
		const expectedUriString = vscode.Uri.file(ruleFilePath).toString();
		assert.strictEqual(actualUriString, expectedUriString);

		assert.strictEqual(diagnostics[0].Diagnostics[0].message, "syntax error, unexpected '='");
		assert.strictEqual(diagnostics[0].Diagnostics[0].range.start.line, 4);
		assert.strictEqual(diagnostics[0].Diagnostics[0].range.start.character, 0);
		assert.strictEqual(diagnostics[0].Diagnostics[0].range.end.line, 4);
		assert.strictEqual(diagnostics[0].Diagnostics[0].range.end.character, 1);
	});

	test('Одна строка с предупреждением', async () => {
		const parser = new SiemJOutputParser();

		const rulePath = TestFixture.getEnrichmentFilePath("MSSQL_user_command", "rule.en");
		const output = 		
`
BUILD_RULES [Err] :: ${rulePath}:7:15: warning: Read undefined variable 'target_asset'`

		const diagnostics = await parser.parse(output);

		assert.strictEqual(diagnostics.length, 1);
		assert.strictEqual(diagnostics[0].Diagnostics.length, 1);

		const actualUriString = diagnostics[0].Uri.toString();
		const expextedUriString = vscode.Uri.file(rulePath).toString();
		assert.strictEqual(actualUriString, expextedUriString);

		assert.strictEqual(diagnostics[0].Diagnostics[0].message, "Read undefined variable 'target_asset'");
		assert.strictEqual(diagnostics[0].Diagnostics[0].range.start.line, 6);
		assert.strictEqual(diagnostics[0].Diagnostics[0].range.start.character, 0);
		assert.strictEqual(diagnostics[0].Diagnostics[0].range.end.line, 6);
		assert.strictEqual(diagnostics[0].Diagnostics[0].range.end.character, 15);
	});
});

