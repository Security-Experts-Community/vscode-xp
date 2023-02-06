import * as assert from 'assert';
import * as vscode from 'vscode';

import { SiemJOutputParser } from '../../../views/integrationTests/siemJOutputParser';

suite('ModuleTestOutputParser', () => {

	test('Одна строка с ошибкой', () => {
		const parser = new SiemJOutputParser();
		const output = 
`
BUILD_RULES [Err] :: c:\\Work\\-=SIEM=-\\Content\\knowledgebase\\packages\\esc\\correlation_rules\\active_directory\\Active_Directory_Snapshot\\rule.co:27:29: syntax error, unexpected '='`

		const diagnostics = parser.parse(output);

		assert.strictEqual(diagnostics.length, 1);
		assert.strictEqual(diagnostics[0].Diagnostics.length, 1);

		const actualUriString = diagnostics[0].Uri.toString();
		const expextedUriString = vscode.Uri.file("c:\\Work\\-=SIEM=-\\Content\\knowledgebase\\packages\\esc\\correlation_rules\\active_directory\\Active_Directory_Snapshot\\rule.co").toString();
		assert.strictEqual(actualUriString, expextedUriString);

		assert.strictEqual(diagnostics[0].Diagnostics[0].message, "syntax error, unexpected '='");
		assert.strictEqual(diagnostics[0].Diagnostics[0].range.start.line, 26);
		assert.strictEqual(diagnostics[0].Diagnostics[0].range.start.character, 0);
		assert.strictEqual(diagnostics[0].Diagnostics[0].range.end.line, 26);
		assert.strictEqual(diagnostics[0].Diagnostics[0].range.end.character, 29);
	});

	test('Одна строка с предупреждением', () => {
		const parser = new SiemJOutputParser();
		const output = 
`
BUILD_RULES [Err] :: c:\\Work\\-=SIEM=-\\Content\\knowledgebase\\packages\\esc\\enrichment_rules\\logon_chains\\ESC_Write_Logon_Chain\\rule.en:162:28: warning: Read undefined variable 'target_asset'`

		const diagnostics = parser.parse(output);

		assert.strictEqual(diagnostics.length, 1);
		assert.strictEqual(diagnostics[0].Diagnostics.length, 1);

		const actualUriString = diagnostics[0].Uri.toString();
		const expextedUriString = vscode.Uri.file("c:\\Work\\-=SIEM=-\\Content\\knowledgebase\\packages\\esc\\enrichment_rules\\logon_chains\\ESC_Write_Logon_Chain\\rule.en").toString();
		assert.strictEqual(actualUriString, expextedUriString);

		assert.strictEqual(diagnostics[0].Diagnostics[0].message, "Read undefined variable 'target_asset'");
		assert.strictEqual(diagnostics[0].Diagnostics[0].range.start.line, 161);
		assert.strictEqual(diagnostics[0].Diagnostics[0].range.start.character, 0);
		assert.strictEqual(diagnostics[0].Diagnostics[0].range.end.line, 161);
		assert.strictEqual(diagnostics[0].Diagnostics[0].range.end.character, 28);
	});
});

