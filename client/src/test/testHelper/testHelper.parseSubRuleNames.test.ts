import * as assert from 'assert';

import { TestHelper } from '../../helpers/testHelper';

suite('TestHelper.parseSubRuleNames', async () => {
  test('Последовательный in_list в разных event', async () => {
    //         const ruleCode =
    // `event Event1:
    // key:
    //     event_src.host
    // filter {
    //     in_list(["RuleName1", "RuleName2"], correlation_name)
    // }

    // event Event2:
    // key:
    //     event_src.host
    // filter {
    //     in_list(["RuleName3", "RuleName4"], correlation_name)
    // }
    // `;

    const ruleCode = `event Event1:
key:
    event_src.host
filter {
    in_list(["RuleName1", "RuleName2"], correlation_name)
    and filter::CheckWL_Tasks("CurrentRuleName", lower(join([subject.account.name, object.name], "|")))
}

event Event2:
key:
    event_src.host
filter {
    in_list(["RuleName3", "RuleName4"], correlation_name)
}
`;
    const subRuleNames = TestHelper.parseSubRuleNamesFromKnownOperation(ruleCode);

    assert.deepStrictEqual(subRuleNames, ['RuleName1', 'RuleName2', 'RuleName3', 'RuleName4']);
  });

  test('Есть комменты для сабрулей', async () => {
    const ruleCode = `event Event:
key:
    event_src.host, subject.account.id
filter {
    in_list([
        "Super_Duper_SubRule", # Тут есть "dfdf"
    ], correlation_name)
`;

    const subRuleNames = TestHelper.parseSubRuleNamesFromKnownOperation(ruleCode);

    assert.deepStrictEqual(subRuleNames, ['Super_Duper_SubRule']);
  });

  test('Сравнение имени сабруля c lower', async () => {
    const ruleCode = `event Encoded_Powershell_Process:
key:
    event_src.host, event_src.title, object.process.name, object.process.id
filter {
    lower(correlation_name) == "execute_encoded_powershell"
    and object == "process"
    and filter::CheckWL_Process_Creation("Cobalt_Strike", lower(alert.key))
}`;

    const subRuleNames = TestHelper.parseSubRuleNamesFromKnownOperation(ruleCode);

    assert.deepStrictEqual(subRuleNames, ['execute_encoded_powershell']);
  });

  test('Сравнение имени сабруля', async () => {
    const ruleCode = `filter {
    correlation_name == "Potential_Users_Or_Groups_Enumeration_Process"
    and filter::CheckWL_Specific_Only("Groups_And_Users_Enumeration", lower(object.process.cmdline))
}`;

    const subRuleNames = TestHelper.parseSubRuleNamesFromKnownOperation(ruleCode);

    assert.deepStrictEqual(subRuleNames, ['Potential_Users_Or_Groups_Enumeration_Process']);
  });

  test('Проверка сабруля из списка c lower', async () => {
    const ruleCode = `event Syscall_execve_run_process:
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

    const subRuleNames = TestHelper.parseSubRuleNamesFromKnownOperation(ruleCode);

    assert.deepStrictEqual(subRuleNames, [
      'esc_unix_suspicious_command',
      'esc_unix_recon_tools_and_commands',
      'esc_unix_inline_reverse_or_bind_shell',
      'esc_unix_hacktool_usage',
      'suspicious_emodji_cmdline'
    ]);
  });

  test('Проверка сабруля из списка без lower', async () => {
    const ruleCode = `event Syscall_execve_run_process:
key:
    event_src.host, object.name, alert.key
filter {
    in_list([
        "Subrule_Windows_Host_Abnormal_Access", 
        "Subrule_Unix_Server_Abnormal_Access"
        ], correlation_name)
    and find_substr(lower(object.value), "cron -f") == null
    and
    (
        in_list(["48", "33", "500"], object.account.id) 
        or in_list(["www-data", "apache", "nagios", "oracle", "confluence", "bitrix", "git", "teamcity", "tomcat"], object.account.name)
    )
    and filter::CheckWL_Specific_Only("ESC_Unix_Malicious_Activity_from_Webserver", lower(object.account.name) + "|" + lower(alert.key))
}`;

    const subRuleNames = TestHelper.parseSubRuleNamesFromKnownOperation(ruleCode);

    assert.deepStrictEqual(subRuleNames, [
      'Subrule_Windows_Host_Abnormal_Access',
      'Subrule_Unix_Server_Abnormal_Access'
    ]);
  });
});
