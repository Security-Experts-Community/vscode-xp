import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as fsExtra from 'fs-extra';
import * as yaml from 'yaml';

import { FileSystemHelper } from '../helpers/fileSystemHelper';
import { ExtensionHelper } from '../helpers/extensionHelper';

export let doc: vscode.TextDocument;
export let editor: vscode.TextEditor;
export let documentEol: string;
export let platformEol: string;


export class TestFixture {

	
	public static readErrorFile(filePath: string) {
		const testFileFullPath = this.getTestFilePath(filePath);
		const file = FileSystemHelper.readContentFileSync(testFileFullPath);
		return file.toString();
	}
	
	public static getTestFilePath(filePath:string) {
		return path.resolve(__dirname, '../../testFixture', filePath);
	}

	public static readYamlFile(filePath : string) : any {
		const yamlContent = fs.readFileSync(filePath, 'utf8');
		return yaml.parse(yamlContent);
	}
	
	public static getTestPath(...pathSegments : string[]) {
		return path.resolve(__dirname, '../../testFixture', ...pathSegments);
	}

	public static getExtensionFilePath(...pathSegments : string[]) {
		return path.resolve(ExtensionHelper.getExtentionPath(),  ...pathSegments);
	}

	public static getCorrelationPath(name : string) {
		return path.resolve(__dirname, '../../testFixture', "correlations", name);
	}

	public static getNormalizationPath(name : string) {
		return path.resolve(__dirname, '../../testFixture', "normalizations", name);
	}

	public static getEnrichmentPath(name : string) {
		return path.resolve(__dirname, '../../testFixture', "enrichments", name);
	}

	public static getAggregationsPath(name : string) {
		return path.resolve(__dirname, '../../testFixture', "aggregations", name);
	}

	public static getTablesPath(name : string) {
		return path.resolve(__dirname, '../../testFixture', "tables", name);
	}

	public static getTmpPath() {
		const tmpDirectory = this.getTestPath("tmp");
		return tmpDirectory;
	}

	public static async copyCorrelationToTmpDirectory(ruleName : string) : Promise<string> {
		// Копируем корреляцию для переименования во временную директорию.
		const tmpPath = TestFixture.getTmpPath();
		const rulePath = TestFixture.getCorrelationPath(ruleName);

		const correlationTmpPath = path.join(tmpPath, ruleName);
		fs.mkdirSync(correlationTmpPath);
		await fsExtra.copy(rulePath, correlationTmpPath);

		return correlationTmpPath;
	}
}

export async function testCompletion(
	docUri: vscode.Uri,
	position: vscode.Position
) {
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
	return new Promise(resolve => setTimeout(resolve, ms));
}

export const getDocPath = (p: string) => {
	return path.resolve(__dirname, '../../testFixture', p);
};

export const getDocUri = (p: string) => {
	return vscode.Uri.file(getDocPath(p));
};

export async function setTestContent(content: string): Promise<boolean> {
	const all = new vscode.Range(
		doc.positionAt(0),
		doc.positionAt(doc.getText().length)
	);
	return editor.edit(eb => eb.replace(all, content));
}
