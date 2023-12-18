import * as vscode from 'vscode';
import * as path from 'path';
import * as classTransformer from 'class-transformer';
import { FunctionNameParser } from './signature/functionNameParser';
import { CompleteSignature } from './signature/completeSignature';
import { FileSystemHelper } from '../helpers/fileSystemHelper';
import { TaxonomyHelper } from '../helpers/taxonomyHelper';
import { Configuration } from '../models/configuration';
import { DialogHelper } from '../helpers/dialogHelper';
import { Log } from '../extension';


export class XpHoverProvider implements vscode.HoverProvider {

	constructor(
		private _signatures: CompleteSignature[],
		private _taxonomySignatures: vscode.CompletionItem[]) {
	}

	public static async init(config : Configuration) : Promise<XpHoverProvider> {

		const signaturesFilePath = path.join(config.getContext().extensionPath, "syntaxes", "co.signature.json");
		const signaturesFileContent = await FileSystemHelper.readContentFile(signaturesFilePath);

		const signaturesPlain = JSON.parse(signaturesFileContent);
		let signatures : CompleteSignature[] = []; 
		if(!signaturesPlain) {
			Log.warn("Не было считано ни одного описания функций.");
		}

		signatures = 
			Array.from(signaturesPlain)
				.map(s => {
					const instance = classTransformer.plainToInstance(CompleteSignature, s);

					// Не нашёл другого способа сделать интервал между параметрами и примером кода.
					const lastParamIndex = instance.params.length - 1;
					instance.params[lastParamIndex] += "\n\n";

					return instance;
				});
				
		let taxonomySignatures : vscode.CompletionItem[] = [];
		try {
			taxonomySignatures = await TaxonomyHelper.getTaxonomyCompletions(config);
		}
		catch (error) {
			Log.warn(`Не удалось считать описания полей таксономии. Их описание при наведении работать не будет отображаться`, error);
		}

		return new XpHoverProvider(signatures, taxonomySignatures);
	}

	provideHover(
		document: vscode.TextDocument,
		position: vscode.Position,
		token: vscode.CancellationToken) : vscode.ProviderResult<vscode.Hover> {

		// Получаем функцию для дополнения.
		const line = document.lineAt(position.line);
		if(line.isEmptyOrWhitespace) {
			return null;
		}

		const firstNonWhitespaceCharacterIndex = line.firstNonWhitespaceCharacterIndex;
		const mouseOffset = position.character - firstNonWhitespaceCharacterIndex;
		const textLine = line.text.substring(firstNonWhitespaceCharacterIndex);

		// Ищем кусок токена до позиции мышки.
		const beforePart = textLine.substring(0, mouseOffset);
		let startTokenIndex = beforePart.length - 1;
		// eslint-disable-next-line for-direction
		for (; startTokenIndex > 0; startTokenIndex--) {
			if(beforePart[startTokenIndex] === " ") {
				startTokenIndex++;
				break;
			}

			// Проверяем предыдущий символ, который надо тоже исключить.
			const prevTokenIndex = startTokenIndex - 1;
			const prevChar = beforePart[prevTokenIndex];
			if(prevTokenIndex > 0 && [")", "]", "(", "["].includes(prevChar)) {
				break;
			}
		}

		// Ищем кусок токена после позиции мышки.
		const afterPart = textLine.substring(mouseOffset);
		let endTokenIndex = 0;
		for (; endTokenIndex < afterPart.length; endTokenIndex++) {
			if(afterPart[endTokenIndex] === " ") {
				break;
			}

			// Проверяем следующий символ, который надо тоже исключить.
			const nextTokenIndex = endTokenIndex;
			const nextChar = afterPart[nextTokenIndex];
			if(nextTokenIndex < afterPart.length - 1 && [")", "]", "(", "["].includes(nextChar)) {
				break;
			}
		}

		const selectedToken = beforePart.substring(startTokenIndex) + afterPart.substring(0, endTokenIndex);

		// Если выделенный токен это функция
		const foundFuncSignature = this._signatures.find( s => s.name === selectedToken);
		const foundTaxonomyField = this._taxonomySignatures.find(ci => ci.label === selectedToken);

		if(foundFuncSignature) {
			return this.getFuncHover(foundFuncSignature);
		}

		if(foundTaxonomyField) {
			return this.getTaxonomyField(foundTaxonomyField);
		}

		// Ничего не нашли.
		return {
			contents: null
		};
	}

	private getFuncHover(sign : CompleteSignature): vscode.Hover {
		// Прототип, описание, параметры и примеры.
		const contents: any [] = [];
		// TODO: нужна отдельная грамматика для подсветки прототипа функции, штатная не справляется.
		contents.push({ language: "xp", value: sign.signature });
		contents.push(sign.description);
		sign.params.forEach(p => contents.push(p));
		sign.examples.forEach(p => contents.push({ language: "xp", value: p }));

		return new vscode.Hover(contents);
	}

	private getTaxonomyField(sign : vscode.CompletionItem): vscode.Hover {
		return new vscode.Hover([
			// Выделяем название поля жирным
			new vscode.MarkdownString(`**${sign.label}**`),
			sign.documentation,
			sign.detail
		]);
	}
}