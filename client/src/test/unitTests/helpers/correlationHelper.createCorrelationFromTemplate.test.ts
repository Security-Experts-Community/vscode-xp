
import * as vscode from 'vscode';
import * as assert from 'assert';
import * as fs from 'fs';

import { getDocUri, activate, TestFixture } from '../../helper';
import { TestHelper } from '../../../helpers/testHelper';
import { Correlation } from '../../../models/content/correlation';
import { ContentHelper } from '../../../helpers/contentHelper';
import { Configuration } from '../../../models/configuration';

suite('CorrelationHelper.createCorrelationFromTemplate', async () => {

	test('Создание универсальной корреляции в памяти', async () => {
		const rule = await ContentHelper.createCorrelationFromTemplate("ESC_Super_Duper", "Windows_Universal", Configuration.get());

		assert.strictEqual(rule.getName(), "ESC_Super_Duper");
		assert.strictEqual(rule.getMetaInfo().getName(), "ESC_Super_Duper");
	});

	test('Сохранение универсальной корреляции не упало', async () => {
		const correlation = await ContentHelper.createCorrelationFromTemplate("ESC_Super_Duper", "Windows_Universal", Configuration.get());

		const tmpPath = TestFixture.getTmpPath();
		await correlation.save(tmpPath);
	});

	test('Создание пустой корреляции', async () => {
		const rule = await ContentHelper.createCorrelationFromTemplate("ESC_Super_Duper", "Empty", Configuration.get());

		assert.strictEqual(rule.getName(), "ESC_Super_Duper");
		assert.strictEqual(rule.getMetaInfo().getName(), "ESC_Super_Duper");
	});

	test('Проверяем наличие коллизии ObjectID', async () => {
		const firstCorrelation = await ContentHelper.createCorrelationFromTemplate("ESC_Super_Duper", "Empty", Configuration.get());
		const secondCorrelation = await ContentHelper.createCorrelationFromTemplate("ESC_Super_Duper1", "Empty", Configuration.get());

		const firstObjectId = firstCorrelation.getMetaInfo().getObjectId();
		const secondObjectId = secondCorrelation.getMetaInfo().getObjectId();
		assert.ok(firstObjectId != secondObjectId);
	});
	
	test('Сохранение пустой корреляции не упало', async () => {
		const correlation = await ContentHelper.createCorrelationFromTemplate("ESC_Super_Duper", "Empty", Configuration.get());

		const tmpPath = TestFixture.getTmpPath();
		await correlation.save(tmpPath);
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