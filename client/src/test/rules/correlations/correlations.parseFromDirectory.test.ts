import * as assert from 'assert';
import * as os from 'os';

import { Correlation } from '../../../models/content/correlation';
import { TestFixture } from '../../helper';
import { StringHelper } from '../../../helpers/stringHelper';

suite('Correlations.parseFromDirectory', () => {
  test('Попытка парсинга несуществующей корреляции', async () => {
    const rulePath = TestFixture.getCorrelationPath('qwertyuiopasdfghjk');
    assert.rejects(Correlation.parseFromDirectory(rulePath));
  });

  test('Парсинг корреляции без тестов', async () => {
    const rulePath = TestFixture.getCorrelationPath('without_tests');
    const correlation = await Correlation.parseFromDirectory(rulePath);

    assert.ok(correlation);
  });

  test('Парсинг корреляции без локализаций', async () => {
    const rulePath = TestFixture.getCorrelationPath('without_localizations');
    const correlation = await Correlation.parseFromDirectory(rulePath);

    assert.ok(correlation);
  });

  test('Парсинг корреляции без английской локализации', async () => {
    const rulePath = TestFixture.getCorrelationPath('without_en_localization');
    const correlation = await Correlation.parseFromDirectory(rulePath);

    assert.ok(correlation);
  });

  test('Попытка открыть с неконсистентным LocalizationId в метаинформации и самой локализации не приводит к исключениям', () => {
    const rulePath = TestFixture.getCorrelationPath('inconsistent_localization_identifiers');
    Correlation.parseFromDirectory(rulePath);
  });

  test('Парсинг кода правила', async () => {
    const rulePath = TestFixture.getCorrelationPath('Active_Directory_Snapshot');
    const correlation = await Correlation.parseFromDirectory(rulePath);

    assert.strictEqual(
      await correlation.getRuleCode(),
      `event Event {` +
        os.EOL +
        os.EOL +
        `}` +
        os.EOL +
        os.EOL +
        `rule Active_Directory_Snapshot : Event {` +
        os.EOL +
        os.EOL +
        `}`
    );
  });

  test('Парсинг наиболее полной корреляции', async () => {
    const rulePath = TestFixture.getCorrelationPath('Active_Directory_Snapshot');
    const correlation = await Correlation.parseFromDirectory(rulePath);

    assert.ok(correlation.getCommand());

    assert.strictEqual(correlation.getName(), 'Active_Directory_Snapshot');
    assert.strictEqual(
      correlation.getRuDescription(),
      'Создание снепшота структуры Active Directory'
    );
    assert.strictEqual(correlation.getEnDescription(), 'Snapshot of Active Directory');

    const metaInfo = correlation.getMetaInfo();
    assert.strictEqual(metaInfo.getName(), 'Active_Directory_Snapshot');
    assert.strictEqual(metaInfo.getObjectId(), 'LOC-CR-2539352345');
    assert.deepStrictEqual(metaInfo.getKnowledgeHolders(), ['Ivan Ivanov']);
    assert.deepStrictEqual(metaInfo.getUseCases(), [
      'LDAP-запросы для выгрузки полной структуры AD генерируемый инструментом AdExplorer при создании снепшота'
    ]);
    assert.deepStrictEqual(metaInfo.getFalsePositives(), []);
    assert.deepStrictEqual(metaInfo.getReferences(), [
      'https://techcommunity.microsoft.com/t5/sysinternals/create-snapshots-with-active-directory-explorer-ad-explorer-from/m-p/2232412'
    ]);
    assert.deepStrictEqual(metaInfo.getImprovements(), [
      'Добавить adexplorer с ключом -snapshot в подозрительные команды'
    ]);

    // Атаки по MITRE.
    const attacks = metaInfo.getAttacks();
    assert.strictEqual(attacks.length, 2);
    assert.strictEqual(attacks[0].Tactic, 'initial_access');
    assert.deepStrictEqual(attacks[0].Techniques, ['T1078.002', 'T1078.003']);
    assert.strictEqual(attacks[1].Tactic, 'credential_access');
    assert.deepStrictEqual(attacks[1].Techniques, ['T1110']);

    // Источники данных.
    const dataSources = metaInfo.getDataSources();
    assert.strictEqual(dataSources.length, 1);
    assert.strictEqual(dataSources[0].Provider, 'Microsoft-Windows-Security-Auditing');
    assert.deepStrictEqual(dataSources[0].EventID, [1644]);

    // Критерии локализаций
    const eventDescriptions = metaInfo.getEventDescriptions();
    assert.strictEqual(eventDescriptions.length, 1);
    const eventDescription1 = eventDescriptions[0];
    assert.strictEqual(
      eventDescription1.getCriteria(),
      `correlation_name = "Active_Directory_Snapshot"`
    );
    assert.strictEqual(eventDescription1.getLocalizationId(), `corrname_Active_Directory_Snapshot`);

    // Источники данных.
    const integrationTests = correlation.getIntegrationTests();
    assert.strictEqual(integrationTests.length, 2);

    const integrationsTest1 = integrationTests[0];
    assert.strictEqual(integrationsTest1.getNumber(), 1);
    const testCode1 = integrationsTest1.getTestCode();
    assert.strictEqual(
      testCode1,
      `expect 1 {"subject.account.name": "pushkin", "src.port": 63691,  "origin_app_id": "00000000-0000-0000-0000-000000000005", "labels": "whitelisted", "subject": "account", "_rule": "Active_Directory_Snapshot", "subject.account.domain": "testlab", "object": "resource", "primary_siem_app_id": "00000000-0000-0000-0000-000000000005", "src.ip": "172.16.222.132", "subject.account.id": "S-1-5-21-1129291328-2819992169-918366777-1118",  "src.host": "172.16.222.132", "incident.category": "Undefined", "correlation_name": "Active_Directory_Snapshot", "action": "access",  "time": "2022-03-28T14:47:27Z", "correlation_type": "event", "incident.aggregation.timeout": 7200,  "alert.context": "|(objectClass=attributeSchema)|(objectClass=classSchema)|(objectClass=displaySpecifier)|(objectClass=controlAccessRight)", "importance": "medium", "count": 1,  "incident.aggregation.key": "Active_Directory_Snapshot|S-1-5-21-1129291328-2819992169-918366777-1118|172.16.222.132", "incident.severity": "medium", "generator.type": "correlationengine", "status": "success", "alert.key": "pushkin|172.16.222.132", "normalized": true, "category.generic": "Attack"}`
    );

    const integrationsTest2 = integrationTests[1];
    assert.strictEqual(integrationsTest2.getNumber(), 2);
    const testCode2 = integrationsTest2.getTestCode();

    const expectedTestCode2 = `# Вайтлист
table_list default
table_list {"Common_whitelist_auto":[{"rule":"Active_Directory_Snapshot","specific_value": "pushkin|172.16.222.132"}]}
expect not {"correlation_name": "Active_Directory_Snapshot"}`;

    assert.strictEqual(
      StringHelper.textToOneLine(testCode2),
      StringHelper.textToOneLine(expectedTestCode2)
    );
  });

  test('Парсинг правила с несовпадающими LocalizationId', async () => {
    const rulePath = TestFixture.getCorrelationPath('incompatible_localizationid');
    assert.rejects(
      async () => await Correlation.parseFromDirectory(rulePath),
      Error,
      'Наборы идентификаторов локализаций в файле метаинформации и файлах локализаций не совпадают'
    );
  });

  test('Парсинг корреляции с модульным тестом без коррелируемых событий', async () => {
    const rulePath = TestFixture.getCorrelationPath('unit_test_without_input_events');
    const correlation = await Correlation.parseFromDirectory(rulePath);
    const unitTests = correlation.getUnitTests();
    assert.strictEqual(unitTests.length, 1);
    const unitTest = unitTests[0];

    const expectedInputData = `# Comment 1
# Comment 2
# Comment 3
table_list default
table_list {"tl_name":[{"rule": "unit_test_without_input_events","specific_value": "pushkin|172.16.222.132"}]}`;
    assert.strictEqual(unitTest.getTestInputData(), expectedInputData);

    const expectedCondition = `expect 1 {"correlation_name": "unit_test_without_input_events","subject.account.name":"username"}`;
    assert.strictEqual(unitTest.getTestExpectation(), expectedCondition);
  });

  test('Парсинг корреляции с пустым модульным тестом', async () => {
    const rulePath = TestFixture.getCorrelationPath('with_empty_unit_test_file');
    const correlation = await Correlation.parseFromDirectory(rulePath);
    const unitTests = correlation.getUnitTests();

    assert.strictEqual(unitTests.length, 1);

    const unitTest = unitTests[0];
    assert.strictEqual(unitTest.getTestInputData(), unitTest.getDefaultInputData());
    assert.strictEqual(unitTest.getTestExpectation(), unitTest.getDefaultExpectation());
  });

  test('Парсинг корреляции с закомментированным модульным тестом', async () => {
    const rulePath = TestFixture.getCorrelationPath('with_commented_unit_test');
    const correlation = await Correlation.parseFromDirectory(rulePath);
    const unitTests = correlation.getUnitTests();

    assert.strictEqual(unitTests.length, 1);

    const unitTest = unitTests[0];
    assert.strictEqual(unitTest.getTestInputData(), unitTest.getDefaultInputData());
    assert.strictEqual(unitTest.getTestExpectation(), unitTest.getDefaultExpectation());
  });
});
