import * as vscode from 'vscode';
import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';

import { Correlation } from '../../../models/content/correlation';
import { TestFixture } from '../../helper';
import { ContentTreeProvider } from '../../../views/contentTree/contentTreeProvider';
import { MetaInfo } from '../../../models/metaInfo/metaInfo';
import { RuleBaseItem } from '../../../models/content/ruleBaseItem';
import { Configuration } from '../../../models/configuration';

suite('Корреляции', () => {
  test('Проверка корректности создания дубликата корреляционного правила', async () => {
    const rulePath = TestFixture.getCorrelationPath('with_unit_test');
    const templateRule = await Correlation.parseFromDirectory(rulePath);
    const newRuleName = 'modified_test';
    const tmpDirPath = TestFixture.getTmpPath();

    const rule = await templateRule.duplicate(newRuleName, tmpDirPath);

    assert.strictEqual(rule.getParentPath(), tmpDirPath);
    assert.strictEqual(rule.getName(), newRuleName);
    const newRuleDir = path.join(tmpDirPath, newRuleName);
    assert.strictEqual(rule.getDirectoryPath(), newRuleDir);
    assert.strictEqual(rule.getFileName(), templateRule.getFileName());
    assert.strictEqual(rule.getFilePath(), path.join(newRuleDir, templateRule.getFileName()));

    assert.strictEqual(rule.getEnDescription(), templateRule.getEnDescription());
    assert.strictEqual(rule.getRuDescription(), templateRule.getRuDescription());

    assert.strictEqual(rule.getTestsPath(), path.join(newRuleDir, RuleBaseItem.TESTS_DIRNAME));
    assert.deepStrictEqual(rule.getUnitTestOutputParser(), templateRule.getUnitTestOutputParser());
    assert.deepStrictEqual(rule.getUnitTestRunner(), templateRule.getUnitTestRunner());
    rule.getUnitTests().forEach((unitTest) => {
      assert.strictEqual(unitTest.getRule(), rule);
      assert.strictEqual(unitTest.getRuleDirectoryPath(), rule.getDirectoryPath());
      assert.strictEqual(unitTest.getRuleFullPath(), rule.getFilePath());
      assert.strictEqual(unitTest.getTestsDirPath(), rule.getTestsPath());
    });

    rule.getIntegrationTests().forEach((integrationTest) => {
      assert.strictEqual(integrationTest.getRuleDirectoryPath(), rule.getDirectoryPath());
      assert.strictEqual(integrationTest.getRuleFullPath(), rule.getFilePath());
    });

    const expectedCommand = {
      command: ContentTreeProvider.onRuleClickCommand,
      title: 'Open File',
      arguments: [rule]
    };
    assert.deepStrictEqual(rule.getCommand(), expectedCommand);

    const localization = rule.getLocalizations()[0];
    assert.deepStrictEqual(localization.getLocalizationId(), newRuleName);
    assert.strictEqual(
      rule.getMetaInfoFilePath(),
      path.join(newRuleDir, MetaInfo.METAINFO_FILENAME)
    );

    assert.strictEqual(await rule.getRuleCode(), await templateRule.getRuleCode());
    assert.strictEqual(rule.getRuleFilePath(), path.join(newRuleDir, templateRule.getFileName()));
  });

  test('ObjectID остается такой же после переименования', async () => {
    // Копируем корреляцию во временную директорию.
    const correlation = Correlation.create('New_correlation');
    const oldId = correlation.getMetaInfo().getObjectId();

    correlation.rename('New_correlation1');
    const newId = correlation.getMetaInfo().getObjectId();

    assert.strictEqual(oldId, newId);
  });

  test('Правильное создание ObjectID', async () => {
    Configuration.get().setContentPrefix('LOC');

    const correlation = Correlation.create('New_correlation');
    const expectedObjectId = 'LOC-CR-109745836';

    assert.strictEqual(correlation.generateObjectId(), expectedObjectId);
    assert.strictEqual(correlation.getMetaInfo().getObjectId(), expectedObjectId);
  });

  test('Переименование открытой корреляции без сохранения на диск', async () => {
    const oldRuleName = 'Active_Directory_Snapshot';
    const correlationTmpPath = TestFixture.getCorrelationPath(oldRuleName);
    const correlation = await Correlation.parseFromDirectory(correlationTmpPath);

    // Копируем во временную директорию.
    const tmpPath = TestFixture.getTmpPath();
    const correlationCopy = await correlation.copy(tmpPath);

    const newRuleName = 'Super_Duper_Correlation';
    await correlationCopy.rename(newRuleName);

    const newRuleDirPath = correlationCopy.getDirectoryPath();
    const ruleDirectoryName = path.basename(newRuleDirPath);
    assert.strictEqual(ruleDirectoryName, newRuleName);

    assert.strictEqual(correlationCopy.getName(), newRuleName);

    const metainfo = correlationCopy.getMetaInfo();
    assert.strictEqual(metainfo.getName(), newRuleName);

    const newRuleCode = await correlationCopy.getRuleCode();
    assert.ok(newRuleCode.includes(newRuleName) && !newRuleCode.includes(oldRuleName));

    // Интеграционные тесты.
    const intTests = correlationCopy.getIntegrationTests();
    assert.strictEqual(intTests.length, 2);

    const intTests1 = intTests[0];
    const testCode1 = intTests1.getTestCode();
    assert.ok(!testCode1.includes(oldRuleName));

    const intTests2 = intTests[1];
    const testCode2 = intTests2.getTestCode();
    assert.ok(!testCode2.includes(oldRuleName));

    // Модульные тесты.
    const modTests = correlationCopy.getUnitTests();
    assert.strictEqual(modTests.length, 0);
  });

  test('Успешная сработка нажатия на корреляции', async () => {
    const rulePath = TestFixture.getCorrelationPath('Active_Directory_Snapshot');
    const correlation = await Correlation.parseFromDirectory(rulePath);

    const commandResult = await vscode.commands.executeCommand(
      ContentTreeProvider.onRuleClickCommand,
      correlation
    );
    assert.ok(commandResult);
  });

  test('Корректное сохранение добавленного модульного теста на диск', async () => {
    const tmpPath = TestFixture.getTmpPath();
    const rule = Correlation.create('SavedOnDiskCorrelation', tmpPath);

    const modTest = rule.createNewUnitTest();
    modTest.setTestExpectation('expect 1 {"code": "test code"}');
    rule.addUnitTests([modTest]);
    await rule.save();
    const readedRule = await Correlation.parseFromDirectory(rule.getDirectoryPath());
    const modularTests = readedRule.getUnitTests();

    assert.ok(modularTests.length == 1);
    assert.strictEqual(modularTests[0].getTestExpectation(), 'expect 1 {"code": "test code"}');
    assert.strictEqual(modularTests[0].getTestInputData(), modularTests[0].getDefaultInputData());
    assert.strictEqual(modularTests[0].getNumber(), 1);
  });

  test('Корректное сохранение добавленного модульного теста на диск с некорректным условием', async () => {
    const tmpPath = TestFixture.getTmpPath();
    const rule = Correlation.create('BrokenCorrelation', tmpPath);

    const modTest = rule.createNewUnitTest();
    modTest.setTestExpectation('test code');
    rule.addUnitTests([modTest]);
    await rule.save();
    const readedRule = await Correlation.parseFromDirectory(rule.getDirectoryPath());
    const unitTests = readedRule.getUnitTests();

    assert.ok(unitTests.length == 1);
    const unitTest = unitTests[0];
    assert.strictEqual(unitTest.getTestExpectation(), unitTest.getDefaultExpectation());
    assert.strictEqual(unitTest.getTestInputData(), unitTest.getDefaultInputData());
    assert.strictEqual(unitTest.getNumber(), 1);
  });

  test('Изменение кода правила в памяти и на диске', async () => {
    const oldRuleName = 'Active_Directory_Snapshot';
    const correlationTmpPath = TestFixture.getCorrelationPath(oldRuleName);
    const correlation = await Correlation.parseFromDirectory(correlationTmpPath);

    const tmpPath = TestFixture.getTmpPath();
    const copiedCorrelation = await correlation.copy(tmpPath);
    await copiedCorrelation.setRuleCode('new rule code');

    await copiedCorrelation.save();

    const ruleCode = await copiedCorrelation.getRuleCode();
    assert.strictEqual(ruleCode, 'new rule code');
  });

  test('Перименование корреляции без кода', async () => {
    const rulePath = TestFixture.getCorrelationPath('empty_correlation_code');
    const correlation = await Correlation.parseFromDirectory(rulePath);

    const newName = 'NEW_CORRELATION_NAME';
    await correlation.rename(newName);

    assert.strictEqual(correlation.getName(), newName);
  });

  // Удаляем созданные корреляции.
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
