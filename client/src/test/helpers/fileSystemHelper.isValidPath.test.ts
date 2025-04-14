import * as assert from 'assert';

import { FileSystemHelper } from '../../helpers/fileSystemHelper';

suite('fileSystemHelper.isValidPath', () => {
  test('Windows. Валидный путь', async () => {
    assert.ok(FileSystemHelper.isValidPath(`c:\\tmp\\Content\\RuleDirectory\\rule.co`));
  });

  test('Windows. Валидный путь c - и =', async () => {
    assert.ok(FileSystemHelper.isValidPath(`c:\\tmp\\-=SIEM=-\\Content\\RuleDirectory\\rule.co`));
  });

  test('Windows. Невалидный путь с пробелом ', async () => {
    assert.ok(!FileSystemHelper.isValidPath(`c:\\tmp\\Cont ent\\RuleDirectory\\rule.co`));
  });

  test('Windows. Невалидный путь с кириллицей', async () => {
    assert.ok(!FileSystemHelper.isValidPath(`c:\\tmp\\Контент\\RuleDirectory\\rule.co`));
  });

  test('Linux. Валидный путь', async () => {
    assert.ok(FileSystemHelper.isValidPath(`/home/user/Content/RuleDirectory/rule.co`));
  });

  test('Linux. Невалидный путь с пробелом ', async () => {
    assert.ok(!FileSystemHelper.isValidPath(`/home/user/Con tent/RuleDirectory/rule.co`));
  });

  test('Linux. Невалидный путь с кириллицей', async () => {
    assert.ok(!FileSystemHelper.isValidPath(`/home/user/Контент/RuleDirectory/rule.co`));
  });
});
