import * as vscode from 'vscode';

import { Configuration } from '../models/configuration';
import { TaxonomyFieldDetails } from '../providers/taxonomyFieldDetails';
import { FileSystemHelper } from './fileSystemHelper';
import { YamlHelper } from './yamlHelper';
import { TaxonomyLocalePathLocator } from '../models/locator/taxonomyLocalePathLocator';

export class TaxonomyHelper {
  public static async getTaxonomySignaturesPlain(configuration: Configuration): Promise<any> {
    // Считываем поля таксономии.
    const taxonomyFilePath = configuration.getTaxonomyFullPath();
    const taxonomyFileContent = await FileSystemHelper.readContentFile(taxonomyFilePath);
    const taxonomySignaturesPlain = JSON.parse(taxonomyFileContent);
    return taxonomySignaturesPlain;
  }

  public static async getTaxonomyCompletions(
    configuration: Configuration
  ): Promise<vscode.CompletionItem[]> {
    const taxonomySignaturesPlain = await TaxonomyHelper.getTaxonomySignaturesPlain(configuration);

    // Считываем русскую локализацию для полей таксономии.
    const lfpl = new TaxonomyLocalePathLocator(
      vscode.env.language,
      configuration.getTaxonomyDirPath()
    );
    const taxonomyRuLocalizationFilePath = lfpl.getLocaleFilePath();
    const taxonomyRuLocalizationFileContent = await FileSystemHelper.readContentFile(
      taxonomyRuLocalizationFilePath
    );
    const ruLocalizationPlain = YamlHelper.parse(taxonomyRuLocalizationFileContent);

    const fieldsRuLocalization = ruLocalizationPlain?.Fields;

    if (!taxonomySignaturesPlain) {
      return [];
    }

    const fields = Object.keys(taxonomySignaturesPlain) as string[];

    const taxonomySignatures = Array.from(fields).flatMap((field) => {
      // Поля события.
      const eventCi = this.convertFieldToCompletionItem(
        field,
        taxonomySignaturesPlain,
        fieldsRuLocalization
      );
      return [eventCi];
    });

    return taxonomySignatures;
  }

  private static convertFieldToCompletionItem(
    field: string,
    taxonomySignaturesPlain: any,
    fieldsRuLocalization: any
  ): vscode.CompletionItem {
    const eventCi = new vscode.CompletionItem(field, vscode.CompletionItemKind.Field);

    const fieldDetails = taxonomySignaturesPlain?.[field] as TaxonomyFieldDetails;

    if (fieldDetails?.type) {
      eventCi.documentation = new vscode.MarkdownString(
        `Тип значения **${fieldDetails.type}**`,
        true
      );
    } else {
      eventCi.documentation = new vscode.MarkdownString(`Тип значения **не задан**.`, true);
    }

    // Описание поля таксономии на русском языке.
    if (fieldsRuLocalization) {
      const fieldTitle = fieldsRuLocalization?.[field]?.Title;
      if (fieldTitle) {
        eventCi.detail = fieldTitle;
      }
    }

    return eventCi;
  }
}
