import * as vscode from 'vscode';

import { Configuration } from '../models/configuration';
import { TaxonomyFieldDetails } from '../providers/taxonomyFieldDetails';
import { FileSystemHelper } from './fileSystemHelper';
import { YamlHelper } from './yamlHelper';

export class TaxonomyHelper {
	public static async getTaxonomyCompletions(configuration: Configuration) : Promise<vscode.CompletionItem[]> {
		// Считываем поля таксономии.
		const taxonomyFilePath = configuration.getTaxonomyFullPath();
		const taxonomyFileContent = await FileSystemHelper.readContentFile(taxonomyFilePath);
		const taxonomySignaturesPlain = JSON.parse(taxonomyFileContent);

		// Считываем русскую локализацию для полей таксономии.
		const taxonomyRuLocalizationFilePath = configuration.getTaxonomyRuLocalizationFullPath();
		const taxonomyRuLocalizationFileContent = await FileSystemHelper.readContentFile(taxonomyRuLocalizationFilePath);
		const ruLocalizationPlain = YamlHelper.parse(taxonomyRuLocalizationFileContent);

		const fieldsRuLocalization = ruLocalizationPlain?.Fields;

		if(!taxonomySignaturesPlain) {
			return [];
		}

		const fields = Object.keys(taxonomySignaturesPlain) as string [];

		const taxonomySignatures = 
			Array.from(fields)
				.flatMap(field => {
					// Поля события.
					const eventCi = this.convertFieldToCompletionItem(field, taxonomySignaturesPlain, fieldsRuLocalization);

					// Поля правила.
					// const correlationCi = this.convertFieldToCompletionItem(`$${field}`, taxonomySignaturesPlain, fieldsRuLocalization);

					// return [eventCi, correlationCi];
					return [eventCi];
				});

		return taxonomySignatures;
	}

	private static convertFieldToCompletionItem(field : string, taxonomySignaturesPlain : any, fieldsRuLocalization : any) : vscode.CompletionItem {
		const eventCi = new vscode.CompletionItem(field, vscode.CompletionItemKind.Field);

		const fieldDetails = taxonomySignaturesPlain?.[field] as TaxonomyFieldDetails;
		
		if(fieldDetails?.type) {
			eventCi.documentation = new vscode.MarkdownString(`Тип значения **${fieldDetails.type}**`, true);
		} else {
			eventCi.documentation = new vscode.MarkdownString(`Тип значения **не задан**.`, true);
		}

		// Описание поля таксономии на русском языке.
		if(fieldsRuLocalization) {
			const fieldTitle = fieldsRuLocalization?.[field]?.Title;
			if(fieldTitle) {
				eventCi.detail = fieldTitle;
			}
		}

		return eventCi;
	}
}