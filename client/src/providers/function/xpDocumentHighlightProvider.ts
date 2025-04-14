import * as vscode from 'vscode';
import * as fs from 'fs';
import * as classTransformer from 'class-transformer';

import { Configuration } from '../../models/configuration';
import { FileSystemHelper } from '../../helpers/fileSystemHelper';
import { CompleteSignature } from './completeSignature';
import { RegExpHelper } from '../../helpers/regExpHelper';
import { FunctionsLocalePathLocator } from '../../models/locator/functionsLocalePathLocator';
import { Log } from '../../extension';

export class XpDocumentHighlightProvider implements vscode.DocumentSemanticTokensProvider {
  public static async init(
    config: Configuration,
    legend: vscode.SemanticTokensLegend
  ): Promise<XpDocumentHighlightProvider> {
    // Считываем автодополнение функций
    const locator = new FunctionsLocalePathLocator(
      vscode.env.language,
      config.getContext().extensionPath
    );
    const signaturesFilePath = locator.getLocaleFilePath();
    if (!fs.existsSync(signaturesFilePath)) {
      Log.warn(`Function description file at path ${signaturesFilePath} not found`);
      return;
    }

    const signaturesFileContent = await FileSystemHelper.readContentFile(signaturesFilePath);
    const functionSignaturesPlain = JSON.parse(signaturesFileContent);

    const functionNames = Array.from(functionSignaturesPlain)
      .map((s) => classTransformer.plainToInstance(CompleteSignature, s))
      .map((s) => s.name);

    const xpDocumentHighlightProvider = new XpDocumentHighlightProvider(functionNames, legend);
    vscode.languages.registerDocumentSemanticTokensProvider(
      [
        {
          scheme: 'file',
          language: 'xp'
        },
        {
          scheme: 'file',
          language: 'co'
        },
        {
          scheme: 'file',
          language: 'en'
        },
        {
          scheme: 'file',
          language: 'flt'
        }
      ],
      xpDocumentHighlightProvider,
      legend
    );

    return xpDocumentHighlightProvider;
  }

  constructor(
    private functionNames: string[],
    private legend: vscode.SemanticTokensLegend
  ) {}

  provideDocumentSemanticTokens(
    document: vscode.TextDocument,
    token: vscode.CancellationToken
  ): vscode.ProviderResult<vscode.SemanticTokens> {
    const tokensBuilder = new vscode.SemanticTokensBuilder(this.legend);

    for (let currLine = 0; currLine < document.lineCount; currLine++) {
      const line = document.lineAt(currLine);
      const functionCalls = RegExpHelper.parseFunctionCalls(
        line.text,
        currLine,
        this.functionNames
      );

      // Проходимся по каждой строке для того чтобы получить нужные Position в документе.
      for (const functionCallRange of functionCalls) {
        tokensBuilder.push(functionCallRange, 'function', ['declaration']);
      }
    }

    return tokensBuilder.build();
  }

  provideDocumentSemanticTokensEdits?(
    document: vscode.TextDocument,
    previousResultId: string,
    token: vscode.CancellationToken
  ): vscode.ProviderResult<vscode.SemanticTokens | vscode.SemanticTokensEdits> {
    throw new Error('Method not implemented.');
  }

  onDidChangeSemanticTokens?: vscode.Event<void>;
}
