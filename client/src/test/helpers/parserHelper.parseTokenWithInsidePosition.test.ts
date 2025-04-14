import * as assert from 'assert';
import * as vscode from 'vscode';

import { ParserHelper } from '../../helpers/parserHelper';
import { TestFixture } from '../helper';

suite('parserHelper.parseTokenWithInsidePosition', async () => {
  test('Функция in_list вначале строки', async () => {
    const textLine = TestFixture.createOneLineTextLine(
      `            in_list(["cmd.exe"], lower(object.process.name))`
    );
    const actual = ParserHelper.parseTokenWithInsidePosition(textLine, new vscode.Position(0, 14));

    assert.strictEqual(actual, 'in_list');
  });

  test('Функция lower в in_list', async () => {
    const textLine = TestFixture.createOneLineTextLine(
      `            in_list(["cmd.exe"], lower(object.process.name))`
    );
    const actual = ParserHelper.parseTokenWithInsidePosition(textLine, new vscode.Position(0, 34));

    assert.strictEqual(actual, 'lower');
  });

  test('Функция вначале строки', async () => {
    const textLine = TestFixture.createOneLineTextLine(
      '	and object.process.parent.name == "services.exe"'
    );
    const actual = ParserHelper.parseTokenWithInsidePosition(textLine, new vscode.Position(0, 10));

    assert.strictEqual(actual, 'object.process.parent.name');
  });

  test('Поле object.process.name вложенное в in_list и lower', async () => {
    const textLine = TestFixture.createOneLineTextLine(
      `            in_list(["cmd.exe"], lower(object.process.name))`
    );
    const actual = ParserHelper.parseTokenWithInsidePosition(textLine, new vscode.Position(0, 45));

    assert.strictEqual(actual, 'object.process.name');
  });

  test('Поле в первом параметре функции', async () => {
    const textLine = TestFixture.createOneLineTextLine(
      `            lower(join([object.name, datafield2], "|"))`
    );
    const actual = ParserHelper.parseTokenWithInsidePosition(textLine, new vscode.Position(0, 26));

    assert.strictEqual(actual, 'object.name');
  });

  test('No name', async () => {
    const textLine = TestFixture.createOneLineTextLine(
      `	and regex(lower(datafield3), "(.*?)@", 1) != lower(subject.name)`
    );
    const actual = ParserHelper.parseTokenWithInsidePosition(textLine, new vscode.Position(0, 60));

    assert.strictEqual(actual, 'subject.name');
  });
});
