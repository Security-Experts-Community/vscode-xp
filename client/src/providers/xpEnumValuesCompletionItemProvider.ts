import * as vscode from 'vscode';

import { Configuration } from '../models/configuration';
import { TaxonomyHelper } from '../helpers/taxonomyHelper';
import { Log } from '../extension';

/**
 * Позволяет сформировать необходимые списки автодополнения одинаковые для всех типов контента.
 */
export class XpEnumValuesCompletionItemProvider implements vscode.CompletionItemProvider {
  constructor(private _taxonomySignatures: any[]) {}

  /**
   * Считывает в память список автодополнения функций и полей таксономии.
   * @param context контекст расширения
   * @returns возвращает настроенный провайдер.
   */
  public static async init(
    configuration: Configuration
  ): Promise<XpEnumValuesCompletionItemProvider> {
    let taxonomySignatures: any[] = [];
    try {
      // Добавляем поля таксономии.
      taxonomySignatures = await TaxonomyHelper.getTaxonomySignaturesPlain(configuration);

      if (taxonomySignatures.length == 0) {
        Log.warn('Не было считано ни одного поля таксономии');
      }
    } catch (error) {
      Log.warn(
        `Не удалось считать описания полей таксономии. Автодополнение значений enum работать не будет.`,
        error
      );
    }

    const literalItemProvider = new XpEnumValuesCompletionItemProvider(taxonomySignatures);
    configuration.getContext().subscriptions.push(
      vscode.languages.registerCompletionItemProvider(
        [
          {
            scheme: 'file',
            language: 'co'
          },
          {
            scheme: 'file',
            language: 'xp'
          }
        ],
        literalItemProvider,
        '"'
      )
    );

    return literalItemProvider;
  }

  public provideCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position,
    token: vscode.CancellationToken,
    context: vscode.CompletionContext
  ): vscode.ProviderResult<vscode.CompletionItem[] | vscode.CompletionList<vscode.CompletionItem>> {
    if (position.line >= document.lineCount) {
      return [];
    }

    const line = document.lineAt(position.line).text;

    // Извлекаем имя поля таксономии.
    const variableAssignment = /(\S+)\s*={1,2}/gm;
    const regExpResult = variableAssignment.exec(line);
    if (!regExpResult || regExpResult.length != 2) {
      return [];
    }

    let completionFieldName = regExpResult?.[1];
    if (!completionFieldName) {
      return [];
    }

    if (completionFieldName.startsWith('$')) {
      completionFieldName = completionFieldName.substring(1);
    }

    const taxonomyFields = Object.keys(this._taxonomySignatures) as string[];
    if (!taxonomyFields.includes(completionFieldName)) {
      return [];
    }

    const selectedTaxonomyField = this._taxonomySignatures[completionFieldName];
    const enumValues = Object.keys(selectedTaxonomyField?.enum) as string[];

    if (!enumValues) {
      return [];
    }

    const ci = Array.from(enumValues).map(
      (v) => new vscode.CompletionItem(v, vscode.CompletionItemKind.Enum)
    );
    return ci;
  }
}
