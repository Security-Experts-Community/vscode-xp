import * as assert from 'assert';

import { ContentHelper } from '../../helpers/contentHelper';

suite('ContentHelper', () => {
  test('Замена имени правила в expect', async () => {
    const testCode = `"expect 1 {"subject.account.name": "pushkin", "src.port": 63691,  "origin_app_id": "00000000-0000-0000-0000-000000000005", "labels": "whitelisted", "subject": "account", "_rule": "Active_Directory_Snapshot", "subject.account.domain": "testlab", "object": "resource", "primary_siem_app_id": "00000000-0000-0000-0000-000000000005", "src.ip": "172.16.222.132", "subject.account.id": "S-1-5-21-1129291328-2819992169-918366777-1118",  "src.host": "172.16.222.132", "incident.category": "Undefined", "correlation_name": "Active_Directory_Snapshot", "action": "access",  "time": "2022-03-28T14:47:27Z", "correlation_type": "event", "incident.aggregation.timeout": 7200,  "alert.context": "|(objectClass=attributeSchema)|(objectClass=classSchema)|(objectClass=displaySpecifier)|(objectClass=controlAccessRight)", "importance": "medium", "count": 1,  "incident.aggregation.key": "Active_Directory_Snapshot|S-1-5-21-1129291328-2819992169-918366777-1118|172.16.222.132", "incident.severity": "medium", "generator.type": "correlationengine", "status": "success", "alert.key": "pushkin|172.16.222.132", "normalized": true, "category.generic": "Attack"}"`;

    const newRuleCode = ContentHelper.replaceAllRuleNamesWithinString(
      'Active_Directory_Snapshot',
      'Super_Duper_Correlation',
      testCode
    );

    const expectedRuleCode = `"expect 1 {"subject.account.name": "pushkin", "src.port": 63691,  "origin_app_id": "00000000-0000-0000-0000-000000000005", "labels": "whitelisted", "subject": "account", "_rule": "Super_Duper_Correlation", "subject.account.domain": "testlab", "object": "resource", "primary_siem_app_id": "00000000-0000-0000-0000-000000000005", "src.ip": "172.16.222.132", "subject.account.id": "S-1-5-21-1129291328-2819992169-918366777-1118",  "src.host": "172.16.222.132", "incident.category": "Undefined", "correlation_name": "Super_Duper_Correlation", "action": "access",  "time": "2022-03-28T14:47:27Z", "correlation_type": "event", "incident.aggregation.timeout": 7200,  "alert.context": "|(objectClass=attributeSchema)|(objectClass=classSchema)|(objectClass=displaySpecifier)|(objectClass=controlAccessRight)", "importance": "medium", "count": 1,  "incident.aggregation.key": "Super_Duper_Correlation|S-1-5-21-1129291328-2819992169-918366777-1118|172.16.222.132", "incident.severity": "medium", "generator.type": "correlationengine", "status": "success", "alert.key": "pushkin|172.16.222.132", "normalized": true, "category.generic": "Attack"}"`;
    assert.strictEqual(newRuleCode, expectedRuleCode);
  });
});
