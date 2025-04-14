import * as vscode from 'vscode';
import * as assert from 'assert';
import { NormalizationUnitTestOutputParser } from '../../../models/tests/normalizationUnitTestOutputParser';

suite('NormalizationUnitTestOutputParser', () => {
  test('Попытка использования незарезервированного значения для поля с типом Enum', () => {
    const parser = new NormalizationUnitTestOutputParser();
    const testOutput = `Detected MIME type text/plain from formula

Must exit due to some critical errors!
Removing temp directory c:\\tmp\\2023-04-21_18-56-39_unknown_sdk_iuhqtibs
[ERROR] Field "subject" has value "account1" which is not listed in taxonomy enum
`;
    const diagnostics = parser.parse(testOutput);

    assert.strictEqual(diagnostics.length, 1);
    assert.strictEqual(
      diagnostics[0].message,
      'Field "subject" has value "account1" which is not listed in taxonomy enum'
    );

    assert.strictEqual(diagnostics[0].range.start.line, 0);
    assert.strictEqual(diagnostics[0].range.start.character, 0);

    assert.strictEqual(diagnostics[0].range.end.line, 0);
    assert.strictEqual(diagnostics[0].range.end.character, 0);
  });

  test('Попытка использования незарезервированного названия поля', () => {
    const parser = new NormalizationUnitTestOutputParser();
    const testOutput = `Detected MIME type text/plain from formula
Failed to compile graph:
		c:\\tmp\\DemoVSCodeXP\\xp-rules\\rules\\windows\\system\\system\\normalization_formulas\\Accord\\SUCU\\filemonitor\\Exit_program\\formula.xp:18:9: syntax error, unexpected '=', expecting '('

Must exit due to some critical errors!
Removing temp directory c:\\tmp\\DemoVSCodeXP\\xp-rules\\out\\windows\\temp\\2023-04-21_21-20-41_unknown_sdk_e8ybzqmd
`;
    const diagnostics = parser.parse(testOutput);

    assert.strictEqual(diagnostics.length, 1);
    assert.strictEqual(diagnostics[0].message, "syntax error, unexpected '=', expecting '('");

    assert.strictEqual(diagnostics[0].range.start.line, 18);
    assert.strictEqual(diagnostics[0].range.start.character, 9);

    assert.strictEqual(diagnostics[0].range.end.line, 18);
    assert.strictEqual(diagnostics[0].range.end.character, 9);
  });

  // test('Одна строка', () => {
  // assert.strictEqual(true, false);

  // 		const parser = new NormalizationUnitTestOutputParser();
  // 		const output =
  // `
  // [ERROR] Compilation failed:
  // C:\\Content\\knowledgebase\\packages\\esc\\correlation_rules\\active_directory\\Active_Directory_Snapshot\\rule.co:27:29: syntax error, unexpected '='
  // Build failed
  // Total files: 159
  // Total warnings: 0
  // Total errors: 1

  // [INFO] Creating temp directory C:\\Output\\temp\\2022-10-24_10-43-03_25.0.9349

  // Must exit due to some critical errors!
  // Removing temp directory C:\\Output\\temp\\2022-10-24_10-43-03_25.0.9349`;

  // 		const diagnostics = parser.parse(output);

  // 		assert.strictEqual(diagnostics.length, 1);
  // 		assert.strictEqual(diagnostics[0].message, "syntax error, unexpected '='");

  // 		assert.strictEqual(diagnostics[0].range.start.line, 26);
  // 		assert.strictEqual(diagnostics[0].range.start.character, 0);

  // 		assert.strictEqual(diagnostics[0].range.end.line, 26);
  // 		assert.strictEqual(diagnostics[0].range.end.character, 29);
  // });
});
