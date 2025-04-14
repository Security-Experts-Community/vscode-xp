import * as vscode from 'vscode';
import * as assert from 'assert';
import * as fs from 'fs';

import { getDocUri, activate, TestFixture } from '../helper';
import { TestHelper } from '../../helpers/testHelper';
import { Correlation } from '../../models/content/correlation';
import { ContentHelper } from '../../helpers/contentHelper';
import { Configuration } from '../../models/configuration';

suite('CorrelationHelper.createCorrelationFromTemplate', async () => {
  test('Сохранение пустой корреляции', async () => {
    const ruleName = 'ESC_Super_Duper';
    const rule = await ContentHelper.createCorrelationFromTemplate(
      ruleName,
      'Empty',
      Configuration.get()
    );

    assert.strictEqual(rule.getName(), ruleName);
    assert.strictEqual(rule.getMetaInfo().getName(), ruleName);

    const tmpPath = TestFixture.getTmpPath();
    await rule.save(tmpPath);
  });

  test('Сохранение универсальной корреляции для Windows', async () => {
    const ruleName = 'ESC_Super_Duper';
    const rule = await ContentHelper.createCorrelationFromTemplate(
      ruleName,
      'Windows_Universal',
      Configuration.get()
    );

    assert.strictEqual(rule.getName(), ruleName);
    assert.strictEqual(rule.getMetaInfo().getName(), ruleName);

    const tmpPath = TestFixture.getTmpPath();
    await rule.save(tmpPath);
  });

  test('Сохранение правила на профилирование', async () => {
    const ruleName = 'ESC_Super_Duper';
    const rule = await ContentHelper.createCorrelationFromTemplate(
      ruleName,
      'For_Profilling',
      Configuration.get()
    );

    assert.strictEqual(rule.getName(), ruleName);
    assert.strictEqual(rule.getMetaInfo().getName(), ruleName);

    const tmpPath = TestFixture.getTmpPath();
    await rule.save(tmpPath);
  });

  test('Сохранение правила на брут', async () => {
    const ruleName = 'ESC_Super_Duper';
    const rule = await ContentHelper.createCorrelationFromTemplate(
      ruleName,
      'Password_Brute',
      Configuration.get()
    );

    assert.strictEqual(rule.getName(), ruleName);
    assert.strictEqual(rule.getMetaInfo().getName(), ruleName);

    const tmpPath = TestFixture.getTmpPath();
    await rule.save(tmpPath);
  });

  test('Сохранение правила на подключение в Linux', async () => {
    const ruleName = 'ESC_Super_Duper';
    const rule = await ContentHelper.createCorrelationFromTemplate(
      ruleName,
      'Unix_Connect',
      Configuration.get()
    );

    assert.strictEqual(rule.getName(), ruleName);
    assert.strictEqual(rule.getMetaInfo().getName(), ruleName);

    const tmpPath = TestFixture.getTmpPath();
    await rule.save(tmpPath);
  });

  test('Сохранение правила на выполнение команд в Linux', async () => {
    const ruleName = 'ESC_Super_Duper';
    const rule = await ContentHelper.createCorrelationFromTemplate(
      ruleName,
      'Unix_Execve',
      Configuration.get()
    );

    assert.strictEqual(rule.getName(), ruleName);
    assert.strictEqual(rule.getMetaInfo().getName(), ruleName);

    const tmpPath = TestFixture.getTmpPath();
    await rule.save(tmpPath);
  });

  test('Сохранение правила на чтение файла в Linux', async () => {
    const ruleName = 'ESC_Super_Duper';
    const rule = await ContentHelper.createCorrelationFromTemplate(
      ruleName,
      'Unix_OpenOpenat',
      Configuration.get()
    );

    assert.strictEqual(rule.getName(), ruleName);
    assert.strictEqual(rule.getMetaInfo().getName(), ruleName);

    const tmpPath = TestFixture.getTmpPath();
    await rule.save(tmpPath);
  });

  test('Сохранение универсального правила для Linux', async () => {
    const ruleName = 'ESC_Super_Duper';
    const rule = await ContentHelper.createCorrelationFromTemplate(
      ruleName,
      'Unix_Universal',
      Configuration.get()
    );

    assert.strictEqual(rule.getName(), ruleName);
    assert.strictEqual(rule.getMetaInfo().getName(), ruleName);

    const tmpPath = TestFixture.getTmpPath();
    await rule.save(tmpPath);
  });

  test('Сохранение правила по созданию файла для Windows', async () => {
    const ruleName = 'ESC_Super_Duper';
    const rule = await ContentHelper.createCorrelationFromTemplate(
      ruleName,
      'Windows_FileCreate',
      Configuration.get()
    );

    assert.strictEqual(rule.getName(), ruleName);
    assert.strictEqual(rule.getMetaInfo().getName(), ruleName);

    const tmpPath = TestFixture.getTmpPath();
    await rule.save(tmpPath);
  });

  test('Сохранение правила по загрузке образа файла для Windows', async () => {
    const ruleName = 'ESC_Super_Duper';
    const rule = await ContentHelper.createCorrelationFromTemplate(
      ruleName,
      'Windows_Image_Load',
      Configuration.get()
    );

    assert.strictEqual(rule.getName(), ruleName);
    assert.strictEqual(rule.getMetaInfo().getName(), ruleName);

    const tmpPath = TestFixture.getTmpPath();
    await rule.save(tmpPath);
  });

  test('Сохранение правила по LDAP-запросу для Windows', async () => {
    const ruleName = 'ESC_Super_Duper';
    const rule = await ContentHelper.createCorrelationFromTemplate(
      ruleName,
      'Windows_LDAP',
      Configuration.get()
    );

    assert.strictEqual(rule.getName(), ruleName);
    assert.strictEqual(rule.getMetaInfo().getName(), ruleName);

    const tmpPath = TestFixture.getTmpPath();
    await rule.save(tmpPath);
  });

  test('Сохранение правила по авторизации для Windows', async () => {
    const ruleName = 'ESC_Super_Duper';
    const rule = await ContentHelper.createCorrelationFromTemplate(
      ruleName,
      'Windows_Logon',
      Configuration.get()
    );

    assert.strictEqual(rule.getName(), ruleName);
    assert.strictEqual(rule.getMetaInfo().getName(), ruleName);

    const tmpPath = TestFixture.getTmpPath();
    await rule.save(tmpPath);
  });

  test('Сохранение правила по сетевому подключению для Windows', async () => {
    const ruleName = 'ESC_Super_Duper';
    const rule = await ContentHelper.createCorrelationFromTemplate(
      ruleName,
      'Windows_Network_Connect',
      Configuration.get()
    );

    assert.strictEqual(rule.getName(), ruleName);
    assert.strictEqual(rule.getMetaInfo().getName(), ruleName);

    const tmpPath = TestFixture.getTmpPath();
    await rule.save(tmpPath);
  });

  test('Сохранение правила по выполнению Powershell команд', async () => {
    const ruleName = 'ESC_Super_Duper';
    const rule = await ContentHelper.createCorrelationFromTemplate(
      ruleName,
      'Windows_Powershell_Execute',
      Configuration.get()
    );

    assert.strictEqual(rule.getName(), ruleName);
    assert.strictEqual(rule.getMetaInfo().getName(), ruleName);

    const tmpPath = TestFixture.getTmpPath();
    await rule.save(tmpPath);
  });

  test('Сохранение правила по запуску процесса для Windows', async () => {
    const ruleName = 'ESC_Super_Duper';
    const rule = await ContentHelper.createCorrelationFromTemplate(
      ruleName,
      'Windows_Process_Start',
      Configuration.get()
    );

    assert.strictEqual(rule.getName(), ruleName);
    assert.strictEqual(rule.getMetaInfo().getName(), ruleName);

    const tmpPath = TestFixture.getTmpPath();
    await rule.save(tmpPath);
  });

  test('Сохранение правила по запуску процесса или Powershell-команды для Windows', async () => {
    const ruleName = 'ESC_Super_Duper';
    const rule = await ContentHelper.createCorrelationFromTemplate(
      ruleName,
      'Windows_Process_Start_or_Powershell',
      Configuration.get()
    );

    assert.strictEqual(rule.getName(), ruleName);
    assert.strictEqual(rule.getMetaInfo().getName(), ruleName);

    const tmpPath = TestFixture.getTmpPath();
    await rule.save(tmpPath);
  });

  test('Сохранение правила по модификации реестра Windows', async () => {
    const ruleName = 'ESC_Super_Duper';
    const rule = await ContentHelper.createCorrelationFromTemplate(
      ruleName,
      'Windows_Registry_modification',
      Configuration.get()
    );

    assert.strictEqual(rule.getName(), ruleName);
    assert.strictEqual(rule.getMetaInfo().getName(), ruleName);

    const tmpPath = TestFixture.getTmpPath();
    await rule.save(tmpPath);
  });

  test('Сохранение правила по созданию удаленного потока в Windows', async () => {
    const ruleName = 'ESC_Super_Duper';
    const rule = await ContentHelper.createCorrelationFromTemplate(
      ruleName,
      'Windows_Remote_Thread',
      Configuration.get()
    );

    assert.strictEqual(rule.getName(), ruleName);
    assert.strictEqual(rule.getMetaInfo().getName(), ruleName);

    const tmpPath = TestFixture.getTmpPath();
    await rule.save(tmpPath);
  });

  test('Сохранение правила по доступу по протоколу SMB для Windows', async () => {
    const ruleName = 'ESC_Super_Duper';
    const rule = await ContentHelper.createCorrelationFromTemplate(
      ruleName,
      'Windows_Share_Access',
      Configuration.get()
    );

    assert.strictEqual(rule.getName(), ruleName);
    assert.strictEqual(rule.getMetaInfo().getName(), ruleName);

    const tmpPath = TestFixture.getTmpPath();
    await rule.save(tmpPath);
  });

  test('Сохранение правила по доступу в память другого процесса для Windows', async () => {
    const ruleName = 'ESC_Super_Duper';
    const rule = await ContentHelper.createCorrelationFromTemplate(
      ruleName,
      'Windows_Sysmon10',
      Configuration.get()
    );

    assert.strictEqual(rule.getName(), ruleName);
    assert.strictEqual(rule.getMetaInfo().getName(), ruleName);

    const tmpPath = TestFixture.getTmpPath();
    await rule.save(tmpPath);
  });

  test('Сохранение правила по созданию задачи для Windows', async () => {
    const ruleName = 'ESC_Super_Duper';
    const rule = await ContentHelper.createCorrelationFromTemplate(
      ruleName,
      'Windows_Tasks_actions',
      Configuration.get()
    );

    assert.strictEqual(rule.getName(), ruleName);
    assert.strictEqual(rule.getMetaInfo().getName(), ruleName);

    const tmpPath = TestFixture.getTmpPath();
    await rule.save(tmpPath);
  });

  test('Создание пустой корреляции', async () => {
    const rule = await ContentHelper.createCorrelationFromTemplate(
      'ESC_Super_Duper',
      'Empty',
      Configuration.get()
    );

    assert.strictEqual(rule.getName(), 'ESC_Super_Duper');
    assert.strictEqual(rule.getMetaInfo().getName(), 'ESC_Super_Duper');
  });

  test('Проверяем наличие коллизии ObjectID', async () => {
    const firstCorrelation = await ContentHelper.createCorrelationFromTemplate(
      'ESC_Super_Duper',
      'Empty',
      Configuration.get()
    );
    const secondCorrelation = await ContentHelper.createCorrelationFromTemplate(
      'ESC_Super_Duper1',
      'Empty',
      Configuration.get()
    );

    const firstObjectId = firstCorrelation.getMetaInfo().getObjectId();
    const secondObjectId = secondCorrelation.getMetaInfo().getObjectId();
    assert.ok(firstObjectId != secondObjectId);
  });

  test('Сохранение пустой корреляции не упало', async () => {
    const correlation = await ContentHelper.createCorrelationFromTemplate(
      'ESC_Super_Duper',
      'Empty',
      Configuration.get()
    );

    const tmpPath = TestFixture.getTmpPath();
    await correlation.save(tmpPath);
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
