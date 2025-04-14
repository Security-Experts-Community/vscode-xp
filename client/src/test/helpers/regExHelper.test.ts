import * as assert from 'assert';

import { RegExpHelper } from '../../helpers/regExpHelper';

suite('RegExpHelper', async () => {
  test('Успешный поиск файла с обогащенными корреляционными событиями из директории с временными файлами', async () => {
    const corrEventsFilePath =
      'c:\\Users\\userName\\AppData\\Local\\Temp\\eXtraction and Processing\\823b1962-c75c-536b-6b49-68f2943936a5\\2043-01-26_22-07-09_unknown_sdk_yrgriogu\\RuleName\\tests\\raw_events_1_norm_enr.json';

    const result =
      RegExpHelper.getEnrichedNormTestEventsFileName('RuleName').test(corrEventsFilePath);

    assert.ok(result);
  });

  test('Успешный поиск файла с обогащенными корреляционными событиями из директории с временными файлами', async () => {
    const corrEventsFilePath =
      'c:\\Users\\userName\\AppData\\Local\\Temp\\eXtraction and Processing\\823b1962-c75c-536b-6b49-68f2943936a5\\2043-01-26_22-07-09_unknown_sdk_yrgriogu\\RuleName\\tests\\raw_events_2_norm_enr_corr_enr.json';

    const result =
      RegExpHelper.getEnrichedCorrTestEventsFileName('RuleName').test(corrEventsFilePath);

    assert.ok(result);
  });

  test('Успешный поиск файла с обогащенными корреляционными событиями из директории с временными файлами для выбранного теста', async () => {
    const corrEventsFilePath =
      'c:\\Users\\userName\\AppData\\Local\\Temp\\eXtraction and Processing\\823b1962-c75c-536b-6b49-68f2943936a5\\2043-01-26_22-07-09_unknown_sdk_yrgriogu\\RuleName\\tests\\raw_events_2_norm_enr_corr_enr.json';

    const result = RegExpHelper.getEnrichedCorrTestEventsFileName('RuleName', 2).test(
      corrEventsFilePath
    );

    assert.ok(result);
  });

  test('Успешный поиск файла с корреляционными событиями из директории с временными файлами', async () => {
    const corrEventsFilePath =
      'c:\\Users\\userName\\AppData\\Local\\Temp\\eXtraction and Processing\\823b1962-c75c-536b-6b49-68f2943936a5\\2043-01-26_22-07-09_unknown_sdk_yrgriogu\\RuleName\\tests\\raw_events_2_norm_enr_corr.json';

    const result = RegExpHelper.getCorrTestEventsFileName('RuleName').test(corrEventsFilePath);

    assert.ok(result);
  });

  test('Успешный поиск файла с корреляционными событиями из директории с временными файлами для выбранного теста', async () => {
    const corrEventsFilePath =
      'c:\\Users\\userName\\AppData\\Local\\Temp\\eXtraction and Processing\\823b1962-c75c-536b-6b49-68f2943936a5\\2043-01-26_22-07-09_unknown_sdk_yrgriogu\\RuleName\\tests\\raw_events_2_norm_enr_corr.json';

    const result = RegExpHelper.getCorrTestEventsFileName('RuleName', 2).test(corrEventsFilePath);

    assert.ok(result);
  });

  test('Нет вызов функций', async () => {
    const actual = RegExpHelper.parseFunctionCalls(`Тут нет вызовов строк`, 1, []);

    assert.strictEqual(actual.length, 0);
  });

  test('Простой вызов', async () => {
    const actual = RegExpHelper.parseFunctionCalls(`        and lower(object.name) == "file"`, 1, [
      'lower'
    ]);

    assert.strictEqual(actual.length, 1);

    const first = actual[0];
    assert.strictEqual(first.start.line, 1);
    assert.strictEqual(first.start.character, 12);

    assert.strictEqual(first.end.line, 1);
    assert.strictEqual(first.end.character, 17);
  });

  test('Простой закомменченный вызов', async () => {
    const actual = RegExpHelper.parseFunctionCalls(`#        and lower(object.name) == "file"`, 1, [
      'lower'
    ]);

    assert.strictEqual(actual.length, 0);
  });

  test('Два вложенных вызова', async () => {
    const actual = RegExpHelper.parseFunctionCalls(
      `and regex(lower(object.path), "\\\\registry\\\\machine\\\\system\\\\(controlset001|currentcontrolset)\\\\services\\\\eventlog\\\\", 0) != null`,
      1,
      ['regex', 'lower']
    );

    assert.strictEqual(actual.length, 2);

    const first = actual[0];
    assert.strictEqual(first.start.line, 1);
    assert.strictEqual(first.start.character, 4);

    assert.strictEqual(first.end.line, 1);
    assert.strictEqual(first.end.character, 9);

    const second = actual[1];
    assert.strictEqual(second.start.line, 1);
    assert.strictEqual(second.start.character, 10);

    assert.strictEqual(second.end.line, 1);
    assert.strictEqual(second.end.character, 15);
  });
});
