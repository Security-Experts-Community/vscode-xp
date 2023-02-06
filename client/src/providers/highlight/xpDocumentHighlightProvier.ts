import * as vscode from 'vscode';
import * as path from 'path';
import * as classTransformer from 'class-transformer';

import { Configuration } from '../../models/configuration';
import { FileSystemHelper } from '../../helpers/fileSystemHelper';
import { CompleteSignature } from '../signature/completeSignature';
import { RegExpHelper } from '../../helpers/regExpHelper';

export class XpDocumentHighlightProvider implements vscode.DocumentSemanticTokensProvider {

	public static async init(config: Configuration, legend: vscode.SemanticTokensLegend) : Promise<XpDocumentHighlightProvider> {
		// Считываем автодополнение функций.
		const signaturesFilePath = path.join(config.getContext().extensionPath, "syntaxes", "co.signature.json");

		const signaturesFileContent = await FileSystemHelper.readContentFile(signaturesFilePath);
		const functionSignaturesPlain = JSON.parse(signaturesFileContent);

		const functionNames = 
			Array.from(functionSignaturesPlain)
				.map(s => classTransformer.plainToInstance(CompleteSignature, s))
				.map(s => s.name);

		return new XpDocumentHighlightProvider(functionNames, legend)
	}	

	constructor(private _fuctionNames: string[], private _legend: vscode.SemanticTokensLegend) {
	}

	provideDocumentSemanticTokens(
		document: vscode.TextDocument, 
		token: vscode.CancellationToken)
		: vscode.ProviderResult<vscode.SemanticTokens> {

		const tokensBuilder = new vscode.SemanticTokensBuilder(this._legend);

		for(let currLine: number = 0; currLine < document.lineCount ; currLine++) {
			const line = document.lineAt(currLine);
			const functionCalls = RegExpHelper.parseFunctionCalls(line.text, currLine, this._fuctionNames);

			// Проходимся по каждой строке для того чтобы получить нужные Position в документе.
			for(const functionCallRange of functionCalls) {
				tokensBuilder.push(
					functionCallRange,
					'function',
					['declaration']
				);
			}
		}

		return tokensBuilder.build();
	}

	provideDocumentSemanticTokensEdits?(
		document: vscode.TextDocument, 
		previousResultId: string, 
		token: vscode.CancellationToken)
		: vscode.ProviderResult<vscode.SemanticTokens | vscode.SemanticTokensEdits> {
		throw new Error('Method not implemented.');
	}

	onDidChangeSemanticTokens?: vscode.Event<void>;
}