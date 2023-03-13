import * as vscode from 'vscode';
import * as assert from 'assert';
import * as fs from 'fs';

import { SiemjConfBuilder } from '../../models/siemj/siemjConfigBuilder';
import { Configuration } from '../../models/configuration';
import { TestFixture } from '../helper';
import { IntegrationTest } from '../../models/tests/integrationTest';

suite('SiemjConfigBuilder', () => {

	test('Нормализовать и обогатить событие', async () => {
		const rulePath = TestFixture.getCorrelationPath("Active_Directory_Snapshot");
		const actualTests = IntegrationTest.parseFromRuleDirectory(rulePath);
		const rawEventsFilePath = actualTests[0].getRawEventsFilePath();
		
		const configBuilder = new SiemjConfBuilder(Configuration.get());
		configBuilder.addNfgraphBuilding();
		configBuilder.addTablesSchemaBuilding();
		configBuilder.addTablesDbBuilding();
		configBuilder.addEfgraphBuilding();
		configBuilder.addEventsNormalization(rawEventsFilePath);
		configBuilder.addEventsEnrich();

		const result = configBuilder.build();

		// Секция по умолчанию
		assert.ok(result.includes("[DEFAULT]"));
		assert.ok(result.includes("ptsiem_sdk="));
		assert.ok(result.includes("build_tools="));
		assert.ok(result.includes("taxonomy="));
		assert.ok(result.includes("output_folder="));
		assert.ok(result.includes("temp="));

		// Выбранные секции
		assert.ok(result.includes("[make-nfgraph]"));
		assert.ok(result.includes("[make-tables-schema]"));
		assert.ok(result.includes("[make-tables-db]"));
		assert.ok(result.includes("[make-ergraph]"));
		assert.ok(result.includes("[run-normalize]"));
		assert.ok(result.includes("[run-enrich]"));

		// Сценарий
		assert.ok(result.includes("[main]"));
		assert.ok(result.includes("type=SCENARIO"));
		assert.ok(result.includes("make-nfgraph make-tables-schema make-tables-db make-ergraph run-normalize run-enrich"));
	});
});