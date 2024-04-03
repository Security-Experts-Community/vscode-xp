import * as vscode from 'vscode';
import * as path from 'path';
import * as classTransformer from 'class-transformer';

import { FileSystemHelper } from '../helpers/fileSystemHelper';
import { Configuration } from '../models/configuration';
import { CompleteSignature } from './signature/completeSignature';
import { TaxonomyHelper } from '../helpers/taxonomyHelper';
import { DialogHelper } from '../helpers/dialogHelper';
import { Log } from '../extension';

/**
 * Позволяет сформировать необходимые списки автодополнения одинаковые для всех типов контента.
 */
export class XpCompletionItemProvider implements vscode.CompletionItemProvider {

	constructor(private _completionItems: vscode.CompletionItem[]) {
	}

	/**
	 * Считывает в память список автодополнения функций и полей таксономии.
	 * @param context контекст расширения
	 * @returns возвращает настроенный провайдер.
	 */
	public static async init(configuration: Configuration): Promise<XpCompletionItemProvider> {

		let autocompleteSignatures: vscode.CompletionItem[] = [];

		// Считываем автодополнение функций.
		const signaturesFilePath = path.join(configuration.getContext().extensionPath, "syntaxes", "co.signature.json");
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
				Log.warn("Не было считано ни одного описания функций");
			}
		}
		catch (error) {
			DialogHelper.showError(`Не удалось считать описания функций языка XP. Их автодополнение и описание параметров работать не будет.`, error);
		}

		try {
			// Добавляем поля таксономии.
			const taxonomySignatures = await TaxonomyHelper.getTaxonomyCompletions(configuration);
			autocompleteSignatures = autocompleteSignatures.concat(taxonomySignatures);
		}
		catch (error) {
			Log.warn(`Не удалось считать описания полей таксономии. Их автодополнение работать не будет.`, error);
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
				Log.warn("Не было считано ни одного описания функций");
			}
		}
		catch (error) {
			Log.warn("Ошибка при считывании: " + error.message);
		}

		const completionItemProvider = new XpCompletionItemProvider(autocompleteSignatures);
		configuration.getContext().subscriptions.push(
			vscode.languages.registerCompletionItemProvider(
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
				],
				completionItemProvider,
				"$"
			)
		);

		return completionItemProvider;
	}

	public provideCompletionItems(
		document: vscode.TextDocument,
		position: vscode.Position,
		token: vscode.CancellationToken,
		context: any) {

		// Извлекаем строку без пробелов до текущего токена.
		const lineText = document.lineAt(position.line).text;
		
		const firstNonWhitespaceCharacterIndex = document.lineAt(position.line).firstNonWhitespaceCharacterIndex;
		const lastAutocompleteWordIndex = position.character;
		const prevText = lineText.substring(firstNonWhitespaceCharacterIndex, lastAutocompleteWordIndex);

		// Выделяем токен.
		const parseResult = /\b([a-z0-9.]+)$/g.exec(prevText);
		if(!parseResult || parseResult.length != 2) {
			return this._completionItems;
		}

		const unendedToken = parseResult[1];
		const filteredItems = this._completionItems.filter(ci => ci.label.toString().startsWith(unendedToken));

		// Вставлять будем только окончание, вместо полного item-а.
		// const wordRange = document.getWordRangeAtPosition(position);
		// const word = document.getText(wordRange);
		
		for (const filteredItem of filteredItems) {
			const unendedTokenWithoutLastChar = unendedToken.slice(0, -1);
			filteredItem.insertText = filteredItem.label.toString().replace(unendedTokenWithoutLastChar, "");
		}

		return filteredItems;
	}
}