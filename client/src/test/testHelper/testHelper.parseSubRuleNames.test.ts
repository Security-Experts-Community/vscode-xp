import * as assert from 'assert';

import { TestHelper } from '../../helpers/testHelper';

suite('TestHelper.parseSubRuleNames', async () => {

	test('Сравнение имени сабруля c lower', async () => {

		const ruleCode =
`	event Encoded_Powershell_Process:
key:
	event_src.host, event_src.title, object.process.name, object.process.id
filter {
	lower(correlation_name) == "execute_encoded_powershell"
	and object == "process"
	and filter::CheckWL_Process_Creation("ESC_Cobalt_Strike_Powershell_Payload_Delivery", lower(alert.key))
}`;

		const subRuleNames = TestHelper.parseSubRuleNames(ruleCode);

		assert.strictEqual(subRuleNames.length, 1);
		assert.strictEqual(subRuleNames[0], "execute_encoded_powershell");
	});
	
	test('Сравнение имени сабруля', async () => {

		const ruleCode =
`filter {
	correlation_name == "Potential_Users_Or_Groups_Enumeration_Process"
	and filter::CheckWL_Specific_Only("Groups_And_Users_Enumeration", lower(object.process.cmdline))
}`;

		const subRuleNames = TestHelper.parseSubRuleNames(ruleCode);
		
		assert.strictEqual(subRuleNames.length, 1);
		assert.strictEqual(subRuleNames[0], "Potential_Users_Or_Groups_Enumeration_Process");
	});

	test('Проверка сабруля из списка', async () => {

		const ruleCode =
`event Syscall_execve_run_process:
key:
	event_src.host, object.name, alert.key
filter {
	in_list(
		["esc_unix_suspicious_command",
		"esc_unix_recon_tools_and_commands",
		"esc_unix_inline_reverse_or_bind_shell",
		"esc_unix_hacktool_usage", 
		"suspicious_emodji_cmdline"], 
		lower(correlation_name)
		)
	and find_substr(lower(object.value), "cron -f") == null
	and
	(
		in_list(["48", "33", "500"], object.account.id) 
		or in_list(["www-data", "apache", "nagios", "oracle", "confluence", "bitrix", "git", "teamcity", "tomcat"], object.account.name)
	)
	and filter::CheckWL_Specific_Only("ESC_Unix_Malicious_Activity_from_Webserver", lower(object.account.name) + "|" + lower(alert.key))
}`;

		const subRuleNames = TestHelper.parseSubRuleNames(ruleCode);

		assert.strictEqual(subRuleNames.length, 5);
		
		assert.strictEqual(subRuleNames[0], "esc_unix_suspicious_command");
		assert.strictEqual(subRuleNames[1], "esc_unix_recon_tools_and_commands");
		assert.strictEqual(subRuleNames[2], "esc_unix_inline_reverse_or_bind_shell");
		assert.strictEqual(subRuleNames[3], "esc_unix_hacktool_usage");
		assert.strictEqual(subRuleNames[4], "suspicious_emodji_cmdline");
	});
});