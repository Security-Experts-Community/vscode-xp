import * as vscode from 'vscode';
import * as assert from 'assert';
import { CorrelationUnitTestOutputParser } from '../../../models/tests/correlationUnitTestOutputParser';

suite('ModuleTestOutputParser', () => {

	test('Одна строка', () => {
		const parser = new CorrelationUnitTestOutputParser();
		const output = 
`
[ERROR] Compilation failed:
C:\\Content\\knowledgebase\\packages\\esc\\correlation_rules\\active_directory\\Active_Directory_Snapshot\\rule.co:27:29: syntax error, unexpected '='
Build failed
Total files: 159
Total warnings: 0
Total errors: 1

[INFO] Creating temp directory C:\\Output\\temp\\2022-10-24_10-43-03_25.0.9349

Must exit due to some critical errors!
Removing temp directory C:\\Output\\temp\\2022-10-24_10-43-03_25.0.9349`;

		const diagnostics = parser.parse(output);

		assert.strictEqual(diagnostics.length, 1);
		assert.strictEqual(diagnostics[0].message, "syntax error, unexpected '='");

		assert.strictEqual(diagnostics[0].range.start.line, 26);
		assert.strictEqual(diagnostics[0].range.start.character, 0);

		assert.strictEqual(diagnostics[0].range.end.line, 26);
		assert.strictEqual(diagnostics[0].range.end.character, 29);
	});
});

