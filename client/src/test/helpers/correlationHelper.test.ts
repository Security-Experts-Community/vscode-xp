import * as vscode from 'vscode';
import * as assert from 'assert';
import * as fs from 'fs';

import { getDocUri, activate, TestFixture } from '../helper';
import { TestHelper } from '../../helpers/testHelper';
import { Correlation } from '../../models/content/correlation';
import { ContentHelper } from '../../helpers/contentHelper';
import { Configuration } from '../../models/configuration';

suite('CorrelationHelper', async () => {
  test('Переименование множества строк для вайтлистинга', async () => {
    const ruleCode = `event AddType_Pipeline:
key:
	event_src.host
filter {
	filter::NotFromCorrelator()
	and ( (object.name != null and filter::CheckWL_Powershell("WinAPI_Access_from_Powershell", join([lower(object.name), lower(object.process.cmdline)], "|")))
		or (object.name == null and filter::CheckWL_Powershell("WinAPI_Access_from_Powershell", lower(object.process.cmdline)))
	)
}

event AddType_Command:
key:
	event_src.host
filter {
	and ( (object.name != null and filter::CheckWL_Powershell("WinAPI_Access_from_Powershell", join([lower(object.name), lower(object.process.cmdline)], "|")))
		or (object.name == null and filter::CheckWL_Powershell("WinAPI_Access_from_Powershell", lower(object.process.cmdline)))
	)
}

event dotNET_Private_Type:
key:
	event_src.host
filter {
	filter::NotFromCorrelator()
	and ( (object.name != null and filter::CheckWL_Powershell("WinAPI_Access_from_Powershell", join([lower(object.name), lower(object.process.cmdline)], "|")))
		or (object.name == null and filter::CheckWL_Powershell("WinAPI_Access_from_Powershell", lower(object.process.cmdline)))
	)
}

event Reflection_Dynamic_Method:
key:
	event_src.host
filter {
	filter::NotFromCorrelator()
	and ( (object.name != null and filter::CheckWL_Powershell("WinAPI_Access_from_Powershell", join([lower(object.name), lower(object.process.cmdline)], "|")))
		or (object.name == null and filter::CheckWL_Powershell("WinAPI_Access_from_Powershell", lower(object.process.cmdline)))
	)
}

rule WinAPI_Access_from_Powershell: AddType_Pipeline or AddType_Command or dotNET_Private_Type or Reflection_Dynamic_Method

	init {
		$labels = "w_auto"
	}

	on AddType_Pipeline {
	}

	on AddType_Command {
	}

	on dotNET_Private_Type {	
	}

	on Reflection_Dynamic_Method {
	}

emit {
}
`;

    const newRuleCode = ContentHelper.replaceAllCorrelationNameWithinCode(
      'Super_Duper_Correlation',
      ruleCode
    );
    assert.ok(!newRuleCode.includes('WinAPI_Access_from_Powershell'));
  });

  test('Переименование имени корреляции с пробельным символом перед : ', async () => {
    const ruleCode = `rule Active_Directory_Snapshot : Event {`;
    const newRuleCode = ContentHelper.replaceAllCorrelationNameWithinCode(
      'Super_Duper_Correlation',
      ruleCode
    );

    const expectedRuleCode = 'rule Super_Duper_Correlation: Event {';
    assert.strictEqual(newRuleCode, expectedRuleCode);
  });

  test('Переименование имени корреляции без пробельного символом перед : ', async () => {
    const ruleCode = `rule CVE_2021_41379_Subrule_Start_elevation: create_elevation_service and start_elevation within 1m`;

    const newRuleCode = ContentHelper.replaceAllCorrelationNameWithinCode(
      'Super_Duper_Correlation',
      ruleCode
    );

    const expectedRuleCode =
      'rule Super_Duper_Correlation: create_elevation_service and start_elevation within 1m';
    assert.strictEqual(newRuleCode, expectedRuleCode);
  });
});
