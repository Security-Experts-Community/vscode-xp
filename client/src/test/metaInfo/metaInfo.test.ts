import * as assert from 'assert';
import * as path from 'path';
import * as fs from 'fs';

import { MetaInfo } from '../../models/metaInfo/metaInfo';
import { MetaInfoEventDescription } from '../../models/metaInfo/metaInfoEventDescription';
import { TestFixture } from '../helper';
import { DataSource } from '../../models/metaInfo/dataSource';
import { FileSystemHelper } from '../../helpers/fileSystemHelper';

suite('MetaInfo', () => {

	test('EventID без кавычек для Windows', async () => {

		const metaInfo = new MetaInfo();
		metaInfo.setDataSources([
			new DataSource("Microsoft-Windows-Security-Auditing", ["1644", "5136"])
		]);
		const tmpDir = TestFixture.getTmpPath();

		await metaInfo.save(tmpDir);

		const metaInfoFilePath = path.join(tmpDir, MetaInfo.METAINFO_FILENAME);
		const metaInfoString = await FileSystemHelper.readContentFile(metaInfoFilePath);

		assert.ok(metaInfoString.includes("- 1644"));
		assert.ok(metaInfoString.includes("- 5136"));
	});

	test('EventID без кавычек для Linux', async () => {

		const metaInfo = new MetaInfo();
		metaInfo.setDataSources([
			new DataSource("Unix", ["pt_siem_execve", "pt_siem_execve_daemon", "user_cmd"])
		]);

		const tmpDir = TestFixture.getTmpPath();
		await metaInfo.save(tmpDir);

		const metaInfoFilePath = path.join(tmpDir, MetaInfo.METAINFO_FILENAME);
		const metaInfoString = await FileSystemHelper.readContentFile(metaInfoFilePath);

		assert.ok(metaInfoString.includes("- pt_siem_execve"));
		assert.ok(metaInfoString.includes("- pt_siem_execve_daemon"));
		assert.ok(metaInfoString.includes("- user_cmd"));
	});

	test('Минимальная метаинформация, содержащая только ObjectId', () => {
		const metaInfoPath = TestFixture.getTestPath("metaInfo", "onlyObjectId");
		const metaInfo = MetaInfo.fromFile(metaInfoPath);

		assert.strictEqual(metaInfo.getObjectId(), "LOC-ER-1");
	});

	test('Поле Created = []', () => {
		const metaInfoPath = TestFixture.getTestPath("metaInfo", "createdIsEmptyArray");
		const metaInfo = MetaInfo.fromFile(metaInfoPath);

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
		const metaInfoPath = path.join(savePath, MetaInfo.METAINFO_FILENAME);
		const metaInfoPlain = await TestFixture.readYamlFile(metaInfoPath);

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
	setup(() => {
		const tmpPath = TestFixture.getTmpPath();
		if (!fs.existsSync(tmpPath)) {
			fs.mkdirSync(tmpPath);
		}
	});

	// Удаляем созданные корреляции.
	teardown(() => {
		const tmpPath = TestFixture.getTmpPath();
		if (fs.existsSync(tmpPath)) {
			fs.rmdirSync(tmpPath, { recursive: true });
		}
	});
});