import * as assert from 'assert';
import * as path from 'path';
import * as fs from 'fs';

import { MetaInfo } from '../../models/metaInfo/metaInfo';
import { MetaInfoEventDescription } from '../../models/metaInfo/metaInfoEventDescription';
import { TestFixture } from '../helper';

suite('MetaInfo', () => {
	
	test('Минимальная метаинформация, содержащая только ObjectId', () => {
		const metaInfoPath = TestFixture.getTestPath("metaInfo", "onlyObjectId");
		const metaInfo = MetaInfo.parseFromFile(metaInfoPath);
		
		assert.strictEqual(metaInfo.getObjectId(), "LOC-ER-1");
	});

	test('Поле Created = []', () => {
		const metaInfoPath = TestFixture.getTestPath("metaInfo", "createdIsEmptyArray");
		const metaInfo = MetaInfo.parseFromFile(metaInfoPath);
		
		assert.strictEqual(metaInfo.getCreatedDate(), undefined);
	});

	test('Сохранение только заданных полей', async () => {
		// Создаем метаданные.
		const metaInfo = new MetaInfo();
		const ed = new MetaInfoEventDescription();
		ed.setCriteria("criteria");
		ed.setLocalizationId("localizationId");
		metaInfo.addEventDescriptions([ed]);

		const savePath = TestFixture.getTmpPath();
		await metaInfo.save(savePath);

		// Проверяем, что нас устраиват формат сохранения.
		const metaInfoPath = path.join(savePath, "metainfo.yaml");
		const metaInfoPlain = TestFixture.readYamlFile(metaInfoPath);

		assert.ok(!metaInfoPlain.Name);
		assert.ok(metaInfoPlain.Created);
		assert.ok(metaInfoPlain.Updated);

		assert.strictEqual(metaInfoPlain.EventDescriptions[0].Criteria, "criteria");
		assert.strictEqual(metaInfoPlain.EventDescriptions[0].LocalizationId, "localizationId");

		assert.ok(!metaInfoPlain.DataSources);
		assert.ok(!metaInfoPlain.Falsepositives);
		assert.ok(!metaInfoPlain.Improvements);
		assert.ok(!metaInfoPlain.KnowledgeHolders);
		assert.ok(!metaInfoPlain.Usecases);
		assert.ok(!metaInfoPlain.References);
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