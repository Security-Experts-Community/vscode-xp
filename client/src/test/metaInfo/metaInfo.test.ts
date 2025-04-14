import * as assert from 'assert';
import * as path from 'path';
import * as fs from 'fs';

import { MetaInfo } from '../../models/metaInfo/metaInfo';
import { MetaInfoEventDescription } from '../../models/metaInfo/metaInfoEventDescription';
import { TestFixture } from '../helper';
import { DataSource } from '../../models/metaInfo/dataSource';
import { FileSystemHelper } from '../../helpers/fileSystemHelper';
import { Attack } from '../../models/metaInfo/attack';

suite('MetaInfo', () => {
  test('Очищение поля Improvements', async () => {
    const metaInfo = new MetaInfo();
    metaInfo.setImprovements(['first improvements', 'second improvements']);
    metaInfo.setImprovements([]);

    const metainfoString = await metaInfo.toString();
    assert.ok(metainfoString.includes('Improvements: []'));
  });

  test('EventID без кавычек для Windows', async () => {
    const metaInfo = new MetaInfo();
    metaInfo.setDataSources([
      new DataSource('Microsoft-Windows-Security-Auditing', ['1644', '5136'])
    ]);
    const tmpDir = TestFixture.getTmpPath();

    await metaInfo.save(tmpDir);

    const metaInfoFilePath = path.join(tmpDir, MetaInfo.METAINFO_FILENAME);
    const metaInfoString = await FileSystemHelper.readContentFile(metaInfoFilePath);

    assert.ok(metaInfoString.includes('- 1644'));
    assert.ok(metaInfoString.includes('- 5136'));
  });

  test('EventID без кавычек для Linux', async () => {
    const metaInfo = new MetaInfo();
    metaInfo.setDataSources([
      new DataSource('Unix', ['pt_siem_execve', 'pt_siem_execve_daemon', 'user_cmd'])
    ]);

    const tmpDir = TestFixture.getTmpPath();
    await metaInfo.save(tmpDir);

    const metaInfoFilePath = path.join(tmpDir, MetaInfo.METAINFO_FILENAME);
    const metaInfoString = await FileSystemHelper.readContentFile(metaInfoFilePath);

    assert.ok(metaInfoString.includes('- pt_siem_execve'));
    assert.ok(metaInfoString.includes('- pt_siem_execve_daemon'));
    assert.ok(metaInfoString.includes('- user_cmd'));
  });

  test('Минимальная метаинформация, содержащая только ObjectId', async () => {
    const metaInfoPath = TestFixture.getFixturePath('metaInfo', 'onlyObjectId');
    const metaInfo = await MetaInfo.fromFile(metaInfoPath);

    assert.strictEqual(metaInfo.getObjectId(), 'LOC-ER-1');
  });

  test('Поле Created = []', async () => {
    const metaInfoPath = TestFixture.getFixturePath('metaInfo', 'createdIsEmptyArray');
    const metaInfo = await MetaInfo.fromFile(metaInfoPath);

    assert.strictEqual(metaInfo.getCreatedDate(), undefined);
  });

  test('Несколько техник в одной тактике', async () => {
    const metaInfo = new MetaInfo();
    const attack1 = new Attack();
    const attack2 = new Attack();
    attack1.Tactic = attack2.Tactic = 'discovery';
    attack1.Techniques = ['T1010', 'T1217'];
    attack2.Techniques = ['T1580', 'T1526'];

    metaInfo.setAttacks([attack1, attack2]);

    const savePath = TestFixture.getTmpPath();
    await metaInfo.save(savePath);

    const metaInfoPath = path.join(savePath, MetaInfo.METAINFO_FILENAME);
    const metaInfoString = await FileSystemHelper.readContentFile(metaInfoPath);
    const metaInfoPlain = await TestFixture.readYamlFile(metaInfoPath);

    assert.ok(metaInfoString.match('discovery').length == 1); // в metainfo.yaml строго один ключ тактики discovery
    assert.ok(
      ['T1010', 'T1217', 'T1580', 'T1526'].every((item) =>
        metaInfoPlain.ContentRelations.Implements.ATTACK.discovery.includes(item)
      )
    );
  });

  test('Сохранение только заданных полей', async () => {
    // Создаем метаданные.
    const metaInfo = new MetaInfo();
    const ed = new MetaInfoEventDescription();
    ed.setCriteria('criteria');
    ed.setLocalizationId('localizationId');
    metaInfo.addEventDescriptions([ed]);

    const savePath = TestFixture.getTmpPath();
    await metaInfo.save(savePath);

    // Проверяем, что нас устраивает формат сохранения.
    const metaInfoPath = path.join(savePath, MetaInfo.METAINFO_FILENAME);
    const metaInfoPlain = await TestFixture.readYamlFile(metaInfoPath);

    assert.ok(!metaInfoPlain.Name);
    assert.ok(!metaInfoPlain.ObjectId);
    assert.ok(metaInfoPlain.ExpertContext.Created);
    assert.ok(metaInfoPlain.ExpertContext.Updated);

    assert.strictEqual(metaInfoPlain.EventDescriptions[0].Criteria, 'criteria');
    assert.strictEqual(metaInfoPlain.EventDescriptions[0].LocalizationId, 'localizationId');

    assert.ok(!metaInfoPlain.ExpertContext.DataSources);
    assert.ok(!metaInfoPlain.ExpertContext.Falsepositives);
    assert.ok(!metaInfoPlain.ExpertContext.Improvements);
    assert.ok(!metaInfoPlain.ExpertContext.KnowledgeHolders);
    assert.ok(!metaInfoPlain.ExpertContext.Usecases);
    assert.ok(!metaInfoPlain.ExpertContext.References);
    assert.ok(!metaInfoPlain.ContentRelations); // ATTACK
  });

  test('Сохранение произвольных полей metainfo', async () => {
    const metaInfoPath = TestFixture.getFixturePath('metaInfo', 'keepUnknownFields');

    const metainfo = await MetaInfo.fromFile(metaInfoPath);

    metainfo.setAttacks([{ Tactic: 'test', Techniques: ['T1234.56'] }]);
    metainfo.setName('KeepUnknownFieldsTest');

    const savePath = TestFixture.getTmpPath();
    await metainfo.save(savePath);

    const newMetainfoPlain = await TestFixture.readYamlFile(
      path.join(savePath, MetaInfo.METAINFO_FILENAME)
    );

    assert.strictEqual(newMetainfoPlain.ContentAutoName, 'KeepUnknownFieldsTest');
    assert.strictEqual(newMetainfoPlain.UnknownField, 'Unknown data');
    assert.strictEqual(newMetainfoPlain.ExpertContext.UnknownFieldInExpertContext, 'lalala');

    assert.deepStrictEqual(newMetainfoPlain.ContentRelations.Implements.ATTACK, {
      test: ['T1234.56']
    });
    assert.deepStrictEqual(newMetainfoPlain.ContentLabels, ['ContentLabel1']);
    assert.deepStrictEqual(newMetainfoPlain.ContentRelations.InternalField, ['some', 'strings']);
  });

  test('Сохранение ContentLabels после сохранения', async () => {
    const metaInfoPath = TestFixture.getFixturePath('metaInfo', 'keepUnknownFields');
    const metainfo = await MetaInfo.fromFile(metaInfoPath);

    const savePath = TestFixture.getTmpPath();
    await metainfo.save(savePath);

    const newMetainfoPlain = await TestFixture.readYamlFile(
      path.join(savePath, MetaInfo.METAINFO_FILENAME)
    );
    assert.deepStrictEqual(newMetainfoPlain.ContentLabels, ['ContentLabel1']);
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
