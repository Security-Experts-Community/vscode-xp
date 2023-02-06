import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';

import { Correlation } from '../../../models/content/correlation';
import { IntegrationTest } from '../../../models/tests/integrationTest';
import { TestFixture } from '../../helper';

suite('Сохранение интеграционных тестов', () => {

	test('Сохраняем пустой тест', async () => {
		const ruleParentPath = TestFixture.getTmpPath();

		const rule = Correlation.create("SuperDuperCorrelation", ruleParentPath);
		const it = rule.createIntegrationTest();
		await it.save();

		const rawEventsFilePath = path.join(ruleParentPath, "SuperDuperCorrelation", "tests", "raw_events_1.json");
		assert.ok(fs.existsSync(rawEventsFilePath));

		const testCodeFilePath = path.join(ruleParentPath, "SuperDuperCorrelation", "tests", "test_conds_1.tc");
		assert.ok(fs.existsSync(testCodeFilePath));
	});

	// Создаем временную директорию.
	setup( () => {
		const tmpPath = TestFixture.getTmpPath();
		if(!fs.existsSync(tmpPath)) {
			fs.mkdirSync(tmpPath);
		}
	});

	// Удаляем созданные корреляции.
	teardown(() => {
		const tmpPath = TestFixture.getTmpPath();
		if(fs.existsSync(tmpPath)) {
			fs.rmdirSync(tmpPath, { recursive: true });
		}
	});
});