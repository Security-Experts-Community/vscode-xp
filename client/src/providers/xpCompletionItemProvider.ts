import * as vscode from 'vscode';
import * as path from 'path';
import * as classTransformer from 'class-transformer';

import { FileSystemHelper } from '../helpers/fileSystemHelper';
import { Configuration } from '../models/configuration';
import { CompleteSignature } from './signature/completeSignature';
import { TaxonomyHelper } from '../helpers/taxonomyHelper';
import { ExtensionHelper } from '../helpers/extensionHelper';

/**
 * Позволяет сформировать необходимые списки автодополнения одинаковые для всех типов контента.
 */
export class XpCompletionItemProvider implements vscode.CompletionItemProvider {

	constructor(private _completionItems: vscode.CompletionItem[]) {
	}

	/**
	 * Считывает в память список автодополнения функций и полей таксономии.
	 * @param context контекст расширения
	 * @returns возвращает настроеннный провайдер.
	 */
	public static async init(context: vscode.ExtensionContext, configuration: Configuration): Promise<XpCompletionItemProvider> {

		let autocompleteSignatures: vscode.CompletionItem[] = [];

		// Считываем автодополнение функций.
		const signaturesFilePath = path.join(context.extensionPath, "syntaxes", "co.signature.json");
		try {
			const signaturesFileContent = await FileSystemHelper.readContentFile(signaturesFilePath);
			const functionSignaturesPlain = JSON.parse(signaturesFileContent);

			if (functionSignaturesPlain) {
				const functionsSignatures =
					Array.from(functionSignaturesPlain)
						.map(s => classTransformer.plainToInstance(CompleteSignature, s))
						.map(s => new vscode.CompletionItem(s.name, vscode.CompletionItemKind.Function));

				autocompleteSignatures = autocompleteSignatures.concat(functionsSignatures);
			} else {
				console.warn("Не было считано ни одного описания функций.");
			}
		}
		catch (error) {
			ExtensionHelper.showError(`Не удалось считать описания функций языка XP. Их автодополнение и описание параметров работать не будет. Возможно поврежден файл '${signaturesFilePath}'.`, error);
		}

		try {
			// Добавляем поля таксономии.
			const taxonomySignatures = await TaxonomyHelper.getTaxonomyCompletions(configuration);
			autocompleteSignatures = autocompleteSignatures.concat(taxonomySignatures);

			if (taxonomySignatures.length == 0) {
				console.warn("Не было считано ни одного описания функций.");
			}
		}
		catch (error) {
			ExtensionHelper.showError(`Не удалось считать описания полей таксономии. Их автодополнение работать не будет. Возможно поврежден файл '${signaturesFilePath}'.`, error);
		}

		try {
			// Добавляем ключевые слова языка.
			const keywords = [
				// общие логические
				"and", "or", "not", "with different", "null",

				// условия
				"if", "then", "elif", "else", "endif",
				"switch", "endswitch", "case",

				// общие для контента
				"event", "key",
				"query", "from", "qhandler", "limit", "skip",
				"filter",

				// агрегация
				"aggregate",

				// корреляции
				"rule", "init", "on", "emit", "close",
				"within", "timer", "timeout_timer", "as",

				"insert_into", "remove_from", "clear_table",

				// обогащение
				"enrichment", "enrich", "enrich_fields"
			]
				.map(k => new vscode.CompletionItem(k, vscode.CompletionItemKind.Keyword));

			autocompleteSignatures = autocompleteSignatures.concat(keywords);

			if (keywords.length == 0) {
				console.warn("Не было считано ни одного описания функций.");
			}
		}
		catch (error) {
			console.warn("Ошибка при считывании." + error.message);
		}

		return new XpCompletionItemProvider(autocompleteSignatures);
	}

	public provideCompletionItems(
		document: vscode.TextDocument,
		position: vscode.Position,
		token: vscode.CancellationToken,
		context: any) {

		return this._completionItems;
	}
}