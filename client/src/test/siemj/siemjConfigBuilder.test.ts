import * as assert from 'assert';
import * as path from 'path';

import { SiemjConfBuilder } from '../../models/siemj/siemjConfigBuilder';
import { Configuration } from '../../models/configuration';
import { TestFixture } from '../helper';
import { IntegrationTest } from '../../models/tests/integrationTest';

suite('SiemjConfigBuilder', () => {
  test('Собрать локализации с путем по умолчанию', async () => {
    const config = Configuration.get();
    const configBuilder = new SiemjConfBuilder(config, 'packages');
    configBuilder.addLocalizationsBuilding();
    const siemJConfig = configBuilder.build();

    // Описание сценария
    assert.ok(siemJConfig.includes('[make-loca]'));
    assert.ok(siemJConfig.includes('type=BUILD_EVENT_LOCALIZATION'));
    assert.ok(siemJConfig.includes(`rules_src=`));
    assert.ok(siemJConfig.includes(path.join('out=${output_folder}', 'langs')));

    // Вызов сценария
    assert.ok(siemJConfig.includes('[main]'));
    assert.ok(siemJConfig.includes('type=SCENARIO'));
    assert.ok(siemJConfig.includes('make-loca'));
  });

  test('Собрать локализации с заданным путем', async () => {
    const configBuilder = new SiemjConfBuilder(Configuration.get(), 'packages');
    configBuilder.addLocalizationsBuilding({
      rulesSrcPath: 'C:\\Content\\knowledgebase\\packages',
      force: true
    });
    const result = configBuilder.build();

    // Описание сценария
    assert.ok(result.includes('[make-loca]'));
    assert.ok(result.includes('type=BUILD_EVENT_LOCALIZATION'));
    assert.ok(result.includes('rules_src=C:\\Content\\knowledgebase\\packages'));
    assert.ok(result.includes(path.join('out=${output_folder}', 'langs')));

    // Вызов сценария
    assert.ok(result.includes('[main]'));
    assert.ok(result.includes('type=SCENARIO'));
    assert.ok(result.includes('make-loca'));
  });

  // test('Нормализовать и обогатить событие', async () => {
  // 	const rulePath = TestFixture.getCorrelationPath("Active_Directory_Snapshot");
  // 	const actualTests = IntegrationTest.parseFromRuleDirectory(rulePath);
  // 	const rawEventsFilePath = actualTests[0].getRawEventsFilePath();

  // 	// TODO: Уточнить тут второй параметр
  // 	const configBuilder = new SiemjConfBuilder(Configuration.get(), "packages");
  // 	configBuilder.addNormalizationsGraphBuilding();
  // 	configBuilder.addTablesSchemaBuilding();
  // 	configBuilder.addTablesDbBuilding();
  // 	configBuilder.addEnrichmentsGraphBuilding();
  // 	configBuilder.addEventsNormalization(rawEventsFilePath);
  // 	configBuilder.addEventsEnrichment();

  // 	const result = configBuilder.build();

  // 	// Секция по умолчанию
  // 	assert.ok(result.includes("[DEFAULT]"));
  // 	assert.ok(result.includes("ptsiem_sdk="));
  // 	assert.ok(result.includes("build_tools="));
  // 	assert.ok(result.includes("taxonomy="));
  // 	assert.ok(result.includes("output_folder="));
  // 	assert.ok(result.includes("temp="));

  // 	// Выбранные секции
  // 	assert.ok(result.includes("[make-nfgraph]"));
  // 	assert.ok(result.includes("[make-tables-schema]"));
  // 	assert.ok(result.includes("[make-tables-db]"));
  // 	assert.ok(result.includes("[make-ergraph]"));
  // 	assert.ok(result.includes("[run-normalize]"));
  // 	assert.ok(result.includes("[run-enrich]"));

  // 	// Сценарий
  // 	assert.ok(result.includes("[main]"));
  // 	assert.ok(result.includes("type=SCENARIO"));
  // 	assert.ok(result.includes("make-nfgraph make-tables-schema make-tables-db make-ergraph run-normalize run-enrich"));
  // });
});
