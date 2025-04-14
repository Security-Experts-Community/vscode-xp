import * as assert from 'assert';
import * as path from 'path';

import { TestFixture } from '../../helper';
import { Enrichment } from '../../../models/content/enrichment';
import { RuleBaseItem } from '../../../models/content/ruleBaseItem';

suite('Модульный тест обогащения', () => {
  test('Нет базовой директории для тестов', async () => {
    const rulePath = TestFixture.getEnrichmentPath('without_tests');
    const rule = await Enrichment.parseFromDirectory(rulePath);
    const actualTests = rule.getUnitTests();

    assert.strictEqual(actualTests.length, 0);
  });

  test('Проверка пути до теста', async () => {
    const rulePath = TestFixture.getEnrichmentPath('without_tests');
    const rule = await Enrichment.parseFromDirectory(rulePath);
    const unitTest = rule.createNewUnitTest();

    const expectTestPath = path.join(rulePath, RuleBaseItem.TESTS_DIRNAME, 'test_1.sc');
    const actualTestPath = unitTest.getTestExpectationPath();
    assert.strictEqual(actualTestPath, expectTestPath);
  });

  test('Проверка пути до правила', async () => {
    const rulePath = TestFixture.getEnrichmentPath('without_tests');
    const rule = await Enrichment.parseFromDirectory(rulePath);
    const unitTest = rule.createNewUnitTest();

    const expectRulePath = path.join(rulePath, 'rule.en');
    const actualRulePath = unitTest.getRuleFullPath();
    assert.strictEqual(actualRulePath, expectRulePath);
  });

  test('Проверка парсинга модульного теста с правильным порядком инструкций', async () => {
    const rulePath = TestFixture.getEnrichmentPath('with_unit_test');
    const rule = await Enrichment.parseFromDirectory(rulePath);
    const unitTests = rule.getUnitTests();
    assert.strictEqual(unitTests.length, 1);
    const unitTest = unitTests[0];
    const expectedInputData = `# Check for logon_type  & src.ip (rule cmstp)
table_list default
# Some comment
table_list {"Windows_Logon_Sessions":[{"host":"test_w10x64-130.org", "session_id":"39868910", "logon_type":"3"}], "Active_External_Sessions":[{"external_ip":"8.8.8.8", "provider":"Susp provider"}]}
# Another one comment
{"datafield10": "CMSTP.EXE", "subject.account.name": "username", "category.low": "CMSTP","incident.aggregation.timeout": 7200, "_objects": [{"AssetId": null, "Fqdn": "test_w10x64-130", "IpAddress": null, "EventTimestamp": "2021-08-09T08:48:12Z"}, {"AssetId": null, "Fqdn": "test_w10x64-130", "IpAddress": null, "EventTimestamp": "2021-08-09T08:48:12Z"}, {"AssetId": null, "Fqdn": null, "IpAddress": "127.0.0.1", "EventTimestamp": "2021-08-09T08:48:12Z"}],"subevents": ["b03631c1-ebd5-454e-8bf4-71897e44cb7e"], "uuid": "1268d453-5fa2-42ec-843f-a6608a39349b"}
# Этот комментарий не будет удален
{"datafield10": "CMSTP.EXE", "subject.account.name": "username", "category.low": "CMSTP","incident.aggregation.timeout": 7200, "_objects": [{"AssetId": null, "Fqdn": "test_w10x64-130", "IpAddress": null, "EventTimestamp": "2021-08-09T08:48:12Z"}, {"AssetId": null, "Fqdn": "test_w10x64-130", "IpAddress": null, "EventTimestamp": "2021-08-09T08:48:12Z"}, {"AssetId": null, "Fqdn": null, "IpAddress": "127.0.0.1", "EventTimestamp": "2021-08-09T08:48:12Z"}],"subevents": ["b03631c1-ebd5-454e-8bf4-71897e44cb7e"], "uuid": "1268d453-5fa2-42ec-843f-a6608a39349b"}`;
    const actualInputData = unitTest.getTestInputData();
    assert.strictEqual(actualInputData, expectedInputData);
    const expectedCondition = `# ExpectedComment Here\nexpect 1 {"logon_type":3,"assigned_src_ip":"8.8.8.8","src.geo.org":"Susp provider"}`;
    const actualCondition = unitTest.getTestExpectation();
    assert.strictEqual(actualCondition, expectedCondition);
  });
});
