import * as assert from 'assert';

import { TestHelper } from '../../helpers/testHelper';

suite('TestHelper.isDefaultLocalization', async () => {
  test('С конструкцией на узле', async () => {
    const compressedTestCode = `Массовая блокировка пользователей обнаружена на узле fedora.host.form`;
    const result = TestHelper.isDefaultLocalization(compressedTestCode);
    assert.ok(!result);
  });

  test('object включает подчеркивание', async () => {
    const compressedTestCode = `account modify ds_object success на узле dc3-w16.testlab.org`;
    const result = TestHelper.isDefaultLocalization(compressedTestCode);
    assert.ok(result);
  });

  test('Локализация по умолчанию', async () => {
    const compressedTestCode = `account start process success на узле wks01.testlab.esc`;
    const result = TestHelper.isDefaultLocalization(compressedTestCode);
    assert.ok(result);
  });

  test('Локализация', async () => {
    const compressedTestCode = `Пользователь pupkin запустил подозрительный процесс mimikatz на узле wks01.testlab.esc`;
    const result = TestHelper.isDefaultLocalization(compressedTestCode);
    assert.ok(!result);
  });
});
