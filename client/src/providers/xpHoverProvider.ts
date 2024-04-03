import * as vscode from 'vscode';
import * as path from 'path';
import * as classTransformer from 'class-transformer';
import { CompleteSignature } from './signature/completeSignature';
import { FileSystemHelper } from '../helpers/fileSystemHelper';
import { TaxonomyHelper } from '../helpers/taxonomyHelper';
import { Configuration } from '../models/configuration';
import { Log } from '../extension';
import { ParserHelper } from '../helpers/parserHelper';


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
			Log.warn("Не было считано ни одного описания функций");
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
			Log.warn(`Не удалось считать описания полей таксономии. Их описание при наведении курсора мыши не будет отображаться`, error);
		}

		const xpHoverProvider = new XpHoverProvider(signatures, taxonomySignatures);
		config.getContext().subscriptions.push(
			vscode.languages.registerHoverProvider([
				{
					scheme: 'file',
					language: 'co'
				},
				{
					scheme: 'file',
					language: 'xp'
				},
				{
					scheme: 'file',
					language: 'en'
				}], 
				xpHoverProvider
			)
		);

		return xpHoverProvider;
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

		const selectedToken = ParserHelper.parseTokenWithInsidePosition(line, position);

		// Если выделенный токен это функция или таксономическое поле
		const foundFuncSignature = this._signatures.find((s) => s.name === selectedToken);

		const foundTaxonomyField = this._taxonomySignatures.find(t => {
			// Таксономическое поле текущего событие
			return t.label === selectedToken ||
			// Таксономическое поле формируемого события
			(
				selectedToken.startsWith('$') &&
				selectedToken.substring(1) === t.label
			);
		});

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
			// Выделяем название поля жирным а на следующей строке общее описание. Две новых строки нужно, так как это markdown.
			new vscode.MarkdownString(
`**${sign.label}**

${sign.detail}`),
			sign.documentation
		]);
	}
}