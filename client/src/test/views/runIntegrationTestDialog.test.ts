import * as vscode from 'vscode';
import * as assert from 'assert';

import { getDocUri, activate, TestFixture, toRange, testDiagnostics } from '../helper';
import { Correlation } from '../../models/content/correlation';
import { RunIntegrationTestDialog } from '../../views/runIntegrationDialog';
import { Configuration } from '../../models/configuration';
import { CompilationType } from '../../models/tests/integrationTestRunner';

suite('RunIntegrationTestDialog', async () => {
  test('В случах отсутствия полного равенства, например, match(correlation_name, "*_Brute") собираем текущий пакет', async () => {
    const rule = new Correlation('CorrelationName');
    rule.setRuleCode(
      `event Event:
key:
	event_src.host
filter {
	match(correlation_name, "*_Brute")
}`
    );
    const optionsDialog = new RunIntegrationTestDialog(Configuration.get());
    const options = await optionsDialog.getIntegrationTestRunOptionsForSingleRule(rule);

    assert.strictEqual(options.correlationCompilation, CompilationType.CurrentPackage);
  });
});
