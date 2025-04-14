import * as assert from 'assert';

import { FileSystemHelper } from '../../helpers/fileSystemHelper';

suite('fileSystemHelper.ruleFilePathToDirectory', () => {
  test('Путь к коду корреляции', async () => {
    const ruleDirectoryPath = FileSystemHelper.ruleFilePathToDirectory(
      `c:\\tmp\\Content\\RuleDirectory\\rule.co`
    );

    assert.strictEqual(`c:\\tmp\\Content\\RuleDirectory`, ruleDirectoryPath);
  });

  test('Путь к метаинформации', async () => {
    const ruleDirectoryPath = FileSystemHelper.ruleFilePathToDirectory(
      `c:\\tmp\\Content\\RuleDirectory\\metainfo.yaml`
    );

    assert.strictEqual(`c:\\tmp\\Content\\RuleDirectory`, ruleDirectoryPath);
  });

  test('Путь к тесту', async () => {
    const ruleDirectoryPath = FileSystemHelper.ruleFilePathToDirectory(
      `c:\\tmp\\Content\\RuleDirectory\\tests\\test_conds_1.tc`
    );

    assert.strictEqual(`c:\\tmp\\Content\\RuleDirectory`, ruleDirectoryPath);
  });

  test('Путь к локализации', async () => {
    const ruleDirectoryPath = FileSystemHelper.ruleFilePathToDirectory(
      `c:\\tmp\\Content\\RuleDirectory\\i18n\\i18n_en.yaml`
    );

    assert.strictEqual(`c:\\tmp\\Content\\RuleDirectory`, ruleDirectoryPath);
  });

  test('Путь к коду обогащения', async () => {
    const ruleDirectoryPath = FileSystemHelper.ruleFilePathToDirectory(
      `c:\\tmp\\Content\\RuleDirectory\\rule.en`
    );

    assert.strictEqual(`c:\\tmp\\Content\\RuleDirectory`, ruleDirectoryPath);
  });

  test('Путь к коду нормализации', async () => {
    const ruleDirectoryPath = FileSystemHelper.ruleFilePathToDirectory(
      `c:\\tmp\\Content\\RuleDirectory\\rule.xp`
    );

    assert.strictEqual(`c:\\tmp\\Content\\RuleDirectory`, ruleDirectoryPath);
  });

  test('Путь к табличному списку', async () => {
    const ruleDirectoryPath = FileSystemHelper.ruleFilePathToDirectory(
      `c:\\tmp\\Content\\RuleDirectory\\rule.tl`
    );

    assert.strictEqual(`c:\\tmp\\Content\\RuleDirectory`, ruleDirectoryPath);
  });
});
