import * as vscode from 'vscode';
import * as fs from 'fs';
import * as classTransformer from 'class-transformer';

import { FileSystemHelper } from '../../helpers/fileSystemHelper';
import { CompleteSignature } from './completeSignature';
import { FunctionNameParser } from './functionNameParser';
import { Log } from '../../extension';
import { FunctionsLocalePathLocator } from '../../models/locator/functionsLocalePathLocator';

export class XpSignatureHelpProvider implements vscode.SignatureHelpProvider {
  constructor(
    private parser: FunctionNameParser,
    private signatures: CompleteSignature[]
  ) {}

  public static async init(context: vscode.ExtensionContext): Promise<XpSignatureHelpProvider> {
    const locator = new FunctionsLocalePathLocator(vscode.env.language, context.extensionPath);
    const signaturesFilePath = locator.getLocaleFilePath();

    if (!fs.existsSync(signaturesFilePath)) {
      Log.warn(`Function description file at path ${signaturesFilePath} not found`);
      return;
    }

    const signaturesFileContent = await FileSystemHelper.readContentFile(signaturesFilePath);

    const parser = new FunctionNameParser();
    const signaturesPlain = JSON.parse(signaturesFileContent);
    if (!signaturesPlain) {
      Log.warn('Не было считано ни одного описания функций');
      return new XpSignatureHelpProvider(parser, []);
    }

    const signatures = Array.from(signaturesPlain).map((s) => {
      const instance = classTransformer.plainToInstance(CompleteSignature, s);

      // Не нашел другого способа сделать интервал между параметрами и примером кода.
      const lastParamIndex = instance.params.length - 1;
      instance.params[lastParamIndex] += '\n\n';

      return instance;
    });

    const signatureProvider = new XpSignatureHelpProvider(parser, signatures);
    context.subscriptions.push(
      vscode.languages.registerSignatureHelpProvider(
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
          },
          {
            scheme: 'file',
            language: 'agr'
          }
        ],
        signatureProvider,
        '(',
        ','
      )
    );

    return signatureProvider;
  }

  public provideSignatureHelp(
    document: vscode.TextDocument,
    position: vscode.Position,
    token: vscode.CancellationToken
  ): Promise<vscode.SignatureHelp> {
    // Получаем функцию для дополнения.
    const textLine = document.lineAt(position.line);
    const functionName = this.parser.parse(textLine.text, position.character);

    if (!functionName) {
      return this.getStub('Имя функции');
    }

    const foundSignature = this.signatures.find((s) => s.name === functionName);
    if (!foundSignature) {
      return this.getStub(functionName);
    }

    return Promise.resolve(this.getSignature(foundSignature));
  }

  private getSignature(sign: CompleteSignature): vscode.SignatureHelp {
    const descriptions = new vscode.MarkdownString();

    // Описание.
    descriptions.appendMarkdown(sign.description);

    // Строки описания параметров.
    sign.params.forEach((p) => descriptions.appendCodeblock(p));

    // Строки описания примеров.
    sign.examples.forEach((p) => descriptions.appendCodeblock(p));

    const signatureHelp = new vscode.SignatureHelp();
    signatureHelp.signatures = [new vscode.SignatureInformation(sign.signature, descriptions)];

    return signatureHelp;
  }

  private getStub(functionName: string): Promise<vscode.SignatureHelp> {
    const stub = new CompleteSignature();
    stub.description = `Тут скоро будет список параметров. **Stay tuned!**`;
    stub.name = functionName;

    const signature = this.getSignature(stub);
    return Promise.resolve(signature);
  }
}
