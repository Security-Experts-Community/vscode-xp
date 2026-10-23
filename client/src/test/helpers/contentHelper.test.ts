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

  test('Имя правила заменяется только целым словом', async () => {
    const testCode = `expect 1 {"correlation_name": "Logon", "logon_type": "Logon_Type", "object.name": "SuperLogon", "incident.aggregation.key": "Logon|admin"}`;

    const newTestCode = ContentHelper.replaceAllRuleNamesWithinString('Logon', 'Auth', testCode);

    const expectedTestCode = `expect 1 {"correlation_name": "Auth", "logon_type": "Logon_Type", "object.name": "SuperLogon", "incident.aggregation.key": "Auth|admin"}`;
    assert.strictEqual(newTestCode, expectedTestCode);
  });

  test('Имя правила в идентификаторе отделяется символом _', async () => {
    assert.strictEqual(
      ContentHelper.replaceRuleNameWithinIdentifier(
        'Password_Brute',
        'Brute_Force',
        'corrname_Password_Brute_2'
      ),
      'corrname_Brute_Force_2'
    );
    assert.strictEqual(
      ContentHelper.replaceRuleNameWithinIdentifier('Empty', 'New_Rule', 'Empty_1'),
      'New_Rule_1'
    );
    assert.strictEqual(
      ContentHelper.replaceRuleNameWithinIdentifier('Brute', 'Force', 'corrname_Bruteforce_1'),
      'corrname_Bruteforce_1'
    );
    assert.strictEqual(
      ContentHelper.replaceRuleNameWithinIdentifier(
        'Universal_CEF_Parser',
        'Universal_CEF_Parser_rename_test',
        'PT_Universal_CEF_Parser'
      ),
      'PT_Universal_CEF_Parser_rename_test'
    );
  });

  test('В коде нормализации заменяются только строковые литералы с именем правила', async () => {
    const ruleCode = `id = "Old_Rule"
# Old_Rule для событий входа
event_src.title = "Old_Rule_title"`;

    const newRuleCode = ContentHelper.replaceRuleNameLiteralsWithinCode(
      'Old_Rule',
      'New_Rule',
      ruleCode
    );

    const expectedRuleCode = `id = "New_Rule"
# Old_Rule для событий входа
event_src.title = "Old_Rule_title"`;
    assert.strictEqual(newRuleCode, expectedRuleCode);
  });

  test('Переименование корреляции не затрагивает комментарии', async () => {
    const ruleCode = `# rule note: старое правило
rule Old_Rule: Event

on Event {
    $alert.key = "Old_Rule"
}`;

    const newRuleCode = ContentHelper.replaceAllCorrelationNameWithinCode('New_Rule', ruleCode);

    const expectedRuleCode = `# rule note: старое правило
rule New_Rule: Event

on Event {
    $alert.key = "New_Rule"
}`;
    assert.strictEqual(newRuleCode, expectedRuleCode);
  });

  test('Переименование обогащения не затрагивает комментарии', async () => {
    const ruleCode = `# This enrichment adds external link
event Event:
    key:
        event_src.host

enrichment Old_Enrichment
enrich Event:
    enrich_fields {
        reason = "Old_Enrichment"
    }`;

    const newRuleCode = ContentHelper.replaceAllEnrichmentNameWithinCode(
      'New_Enrichment',
      ruleCode
    );

    const expectedRuleCode = `# This enrichment adds external link
event Event:
    key:
        event_src.host

enrichment New_Enrichment
enrich Event:
    enrich_fields {
        reason = "New_Enrichment"
    }`;
    assert.strictEqual(newRuleCode, expectedRuleCode);
  });
});
