import * as vscode from 'vscode';
import * as assert from 'assert';
import * as path from 'path';
import * as fs from 'fs';
import * as fsExtra from 'fs-extra';

import { FileSystemHelper } from '../helpers/fileSystemHelper';
import { DialogHelper } from '../helpers/dialogHelper';
import { YamlHelper } from '../helpers/yamlHelper';
import { Configuration } from '../models/configuration';

export let doc: vscode.TextDocument;
export let editor: vscode.TextEditor;
export let documentEol: string;
export let platformEol: string;

export class TestFixture {
  public static createOneLineTextLine(line: string): vscode.TextLine {
    const lineLength = line.length;
    const lineMaxOffset = lineLength - 1;

    let firstNonWhitespaceCharacterIndex = line.search(/\S/);
    if (firstNonWhitespaceCharacterIndex === -1) {
      firstNonWhitespaceCharacterIndex = 0;
    }

    const lineRange = new vscode.Range(
      new vscode.Position(0, 0),
      new vscode.Position(0, lineMaxOffset)
    );
    return {
      text: line,
      lineNumber: 0,
      range: lineRange,
      isEmptyOrWhitespace: false,
      firstNonWhitespaceCharacterIndex: firstNonWhitespaceCharacterIndex,
      rangeIncludingLineBreak: lineRange
    };
  }

  public static readErrorFile(filePath: string) {
    const testFileFullPath = this.getTestFilePath(filePath);
    const file = FileSystemHelper.readContentFileSync(testFileFullPath);
    return file.toString();
  }

  public static getTestFilePath(filePath: string) {
    return path.resolve(__dirname, '../../testFixture', filePath);
  }

  public static async readYamlFile(filePath: string): Promise<any> {
    const yamlContent = await fs.promises.readFile(filePath, 'utf8');
    return YamlHelper.parse(yamlContent);
  }

  public static getFixturePath(...pathSegments: string[]) {
    return path.resolve(__dirname, '../../testFixture', ...pathSegments);
  }

  public static getExtensionFilePath(...pathSegments: string[]) {
    const config = Configuration.get();
    return path.resolve(config.getExtensionPath(), ...pathSegments);
  }

  public static getCorrelationPath(name: string) {
    return path.resolve(__dirname, '../../testFixture', 'correlations', name);
  }

  public static getCorrelationFilePath(...name: string[]) {
    return path.join(path.resolve(__dirname, '../../testFixture', 'correlations'), ...name);
  }

  public static getEnrichmentPath(name: string) {
    return path.resolve(__dirname, '../../testFixture', 'enrichments', name);
  }

  public static getEnrichmentFilePath(...name: string[]) {
    return path.join(path.resolve(__dirname, '../../testFixture', 'enrichments'), ...name);
  }

  public static getNormalizationPath(name: string) {
    return path.resolve(__dirname, '../../testFixture', 'normalizations', name);
  }

  public static getAggregationsPath(name: string) {
    return path.resolve(__dirname, '../../testFixture', 'aggregations', name);
  }

  public static getTablesPath(name: string) {
    return path.resolve(__dirname, '../../testFixture', 'tables', name);
  }

  public static getMacrosPath(name: string) {
    return path.resolve(__dirname, '../../testFixture', 'macros', name);
  }

  public static getValidationUri(name: string) {
    return vscode.Uri.file(path.resolve(__dirname, '../../testFixture', 'validation', name));
  }

  public static getValidatioDirUri(dir: string, name: string) {
    return vscode.Uri.file(path.resolve(__dirname, '../../testFixture', 'validation', dir, name));
  }

  public static getTmpPath() {
    const tmpDirectory = Configuration.get().getRandTmpSubDirectoryPath();
    fs.mkdirSync(tmpDirectory, { recursive: true });
    return tmpDirectory;
  }

  public static async copyCorrelationToTmpDirectory(ruleName: string): Promise<string> {
    // Копируем корреляцию для переименования во временную директорию.
    const tmpPath = TestFixture.getTmpPath();
    const rulePath = TestFixture.getCorrelationPath(ruleName);

    const correlationTmpPath = path.join(tmpPath, ruleName);
    await fs.promises.mkdir(correlationTmpPath);
    await fsExtra.copy(rulePath, correlationTmpPath);

    return correlationTmpPath;
  }
}

export async function testCompletion(docUri: vscode.Uri, position: vscode.Position) {
  await activate(docUri);

  // Вызов команды `vscode.executeCompletionItemProvider` симулирует вызов автозавершения
  const actualCompletionList = (await vscode.commands.executeCommand(
    'vscode.executeCompletionItemProvider',
    docUri,
    position
  )) as vscode.CompletionList;

  return actualCompletionList;
}

export async function activate(docUri: vscode.Uri) {
  try {
    doc = await vscode.workspace.openTextDocument(docUri);
    editor = await vscode.window.showTextDocument(doc);
    await sleep(2000); // Wait for server activation
  } catch (e) {
    console.error(e);
  }
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const getDocPath = (p: string) => {
  return path.resolve(__dirname, '../../testFixture', p);
};

export const getDocUri = (p: string) => {
  return vscode.Uri.file(getDocPath(p));
};

export async function setTestContent(content: string): Promise<boolean> {
  const all = new vscode.Range(doc.positionAt(0), doc.positionAt(doc.getText().length));
  return editor.edit((eb) => eb.replace(all, content));
}

export function toRange(sLine: number, sChar: number, eLine: number, eChar: number): vscode.Range {
  const start = new vscode.Position(sLine, sChar);
  const end = new vscode.Position(eLine, eChar);
  return new vscode.Range(start, end);
}

export async function testDiagnostics(
  docUri: vscode.Uri,
  expectedDiagnostics: vscode.Diagnostic[]
): Promise<void> {
  await activate(docUri);

  const actualDiagnostics = vscode.languages.getDiagnostics(docUri);

  assert.strictEqual(actualDiagnostics.length, expectedDiagnostics.length);

  expectedDiagnostics.forEach((expectedDiagnostic, i) => {
    const actualDiagnostic = actualDiagnostics[i];
    assert.strictEqual(actualDiagnostic.message, expectedDiagnostic.message);
    assert.deepStrictEqual(actualDiagnostic.range, expectedDiagnostic.range);
    assert.strictEqual(actualDiagnostic.severity, expectedDiagnostic.severity);
  });
}
