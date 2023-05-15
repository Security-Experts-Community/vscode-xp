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
export class XpEnumValuesCompletionItemProvider implements vscode.CompletionItemProvider {

	constructor(private _taxonomySignatures: any[]) {
	}

	/**
	 * Считывает в память список автодополнения функций и полей таксономии.
	 * @param context контекст расширения
	 * @returns возвращает настроеннный провайдер.
	 */
	public static async init(context: vscode.ExtensionContext, configuration: Configuration): Promise<XpEnumValuesCompletionItemProvider> {

		let taxonomySignatures: any[] = [];

		try {
			// Добавляем поля таксономии.
			taxonomySignatures = await TaxonomyHelper.getTaxonomySignaturesPlain(configuration);

			if (taxonomySignatures.length == 0) {
				console.warn("Не было считано ни одного описания функций.");
			}
		}
		catch (error) {
			ExtensionHelper.showError(`Не удалось считать описания полей таксономии. Их автодополнение работать не будет. Возможно поврежден файл таксономии`, error);
		}

		return new XpEnumValuesCompletionItemProvider(taxonomySignatures);
	}

	public provideCompletionItems(
		document: vscode.TextDocument,
		position: vscode.Position,
		token: vscode.CancellationToken,
		context: vscode.CompletionContext) : vscode.ProviderResult<vscode.CompletionItem[] | vscode.CompletionList<vscode.CompletionItem>> {

		if(position.line >= document.lineCount) {
			return [];
		}
		
		const line = document.lineAt(position.line).text;

		// Извлекаем имя поля таксономии.
		const variableAssignment = /(\S+)\s*={1,2}/gm;
		const regExpResult = variableAssignment.exec(line);
		if(!regExpResult || regExpResult.length != 2) {
			return [];
		}

		let completionFieldName = regExpResult?.[1];
		if(!completionFieldName) {
			return [];
		}

		if(completionFieldName.startsWith("$")){
			completionFieldName = completionFieldName.substring(1);
		}
		
		const taxonomyFields = Object.keys(this._taxonomySignatures) as string [];
		if(!taxonomyFields.includes(completionFieldName)) {
			return [];
		}

		const selectedTaxonomyField = this._taxonomySignatures[completionFieldName];
		const enumValues = Object.keys(selectedTaxonomyField?.enum) as string [];
		
		if(!enumValues) {
			return [];
		}
		
		const ci = Array.from(enumValues).map(v => new vscode.CompletionItem(v, vscode.CompletionItemKind.Enum));
		return ci;
	}
}