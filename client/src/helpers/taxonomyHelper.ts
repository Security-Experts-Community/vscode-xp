import * as vscode from 'vscode';

import { Configuration } from '../models/configuration';
import { TaxonomyFieldDetails } from '../providers/taxonomyFieldDetails';
import { YamlHelper } from './yamlHelper';
import { TaxonomyLocalePathLocator } from '../models/locator/taxonomyLocalePathLocator';

interface CriteriaToken {
  type: 'string' | 'number' | 'identifier' | 'operator' | 'other';
  value: string;
}

export class TaxonomyHelper {
  public static async getTaxonomySignaturesPlain(configuration: Configuration): Promise<any> {
    // Считываем поля таксономии.
    const taxonomyFilePath = configuration.getTaxonomyFullPath();
    const taxonomyFileContent = await configuration.readTextFile(taxonomyFilePath);
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
    const taxonomyRuLocalizationFileContent = await configuration.readTextFile(
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

  /**
   * Проверяет соответствие критерия локализации таксономии: все поля критерия должны быть в таксономии,
   * а тип значения, с которым сравнивается поле, должен совпадать с типом поля. Различаются только
   * числовые и строковые поля, строковым считается любое поле, тип которого не Number.
   * @param criteria критерий локализации
   * @param taxonomySignaturesPlain описание полей таксономии из taxonomy.json
   * @returns описания найденных несоответствий
   */
  public static validateLocalizationCriteria(
    criteria: string,
    taxonomySignaturesPlain: Record<string, TaxonomyFieldDetails>
  ): string[] {
    const tokens = TaxonomyHelper.tokenizeCriteria(criteria);
    const errors = new Set<string>();

    tokens.forEach((token, index) => {
      if (
        token.type !== 'identifier' ||
        TaxonomyHelper.CRITERIA_KEYWORDS.includes(token.value.toLowerCase())
      ) {
        return;
      }

      // Имя функции, а не поле.
      if (tokens[index + 1]?.value === '(') {
        return;
      }

      const field = token.value;
      if (!Object.prototype.hasOwnProperty.call(taxonomySignaturesPlain, field)) {
        errors.add(`поле ${field} отсутствует в таксономии`);
        return;
      }

      const isNumberField = taxonomySignaturesPlain[field]?.type?.toLowerCase() === 'number';
      for (const literal of TaxonomyHelper.getComparedLiterals(tokens, index)) {
        if (isNumberField && literal.type === 'string') {
          errors.add(`числовое поле ${field} сравнивается со строкой ${literal.value}`);
        }

        if (!isNumberField && literal.type === 'number') {
          errors.add(`строковое поле ${field} сравнивается с числом ${literal.value}`);
        }
      }
    });

    return Array.from(errors);
  }

  private static tokenizeCriteria(criteria: string): CriteriaToken[] {
    const tokens: CriteriaToken[] = [];
    const tokenRegExp =
      /("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')|(-?\d+(?:\.\d+)?(?![\w.]))|([A-Za-z_][\w.]*)|(==|!=|<=|>=|=|<|>)|(\S)/g;

    let match: RegExpExecArray | null;
    while ((match = tokenRegExp.exec(criteria ?? ''))) {
      const [value, string, number, identifier, operator] = match;
      if (string) {
        tokens.push({ type: 'string', value });
      } else if (number) {
        tokens.push({ type: 'number', value });
      } else if (identifier) {
        tokens.push({ type: 'identifier', value });
      } else if (operator) {
        tokens.push({ type: 'operator', value });
      } else {
        tokens.push({ type: 'other', value });
      }
    }

    return tokens;
  }

  /**
   * Возвращает значения, с которыми сравнивается поле: `field = "value"`, `"value" = field`
   * и `field in ["value1", "value2"]`.
   */
  private static getComparedLiterals(tokens: CriteriaToken[], fieldIndex: number): CriteriaToken[] {
    const isLiteral = (token?: CriteriaToken) =>
      token?.type === 'string' || token?.type === 'number';
    const literals: CriteriaToken[] = [];

    const next = tokens[fieldIndex + 1];
    if (next?.type === 'operator' && isLiteral(tokens[fieldIndex + 2])) {
      literals.push(tokens[fieldIndex + 2]);
    }

    const previous = tokens[fieldIndex - 1];
    if (previous?.type === 'operator' && isLiteral(tokens[fieldIndex - 2])) {
      literals.push(tokens[fieldIndex - 2]);
    }

    let listIndex = fieldIndex + 1;
    if (tokens[listIndex]?.value.toLowerCase() === 'not') {
      listIndex++;
    }
    if (tokens[listIndex]?.value.toLowerCase() === 'in' && tokens[listIndex + 1]?.value === '[') {
      for (let i = listIndex + 2; i < tokens.length && tokens[i].value !== ']'; i++) {
        if (isLiteral(tokens[i])) {
          literals.push(tokens[i]);
        }
      }
    }

    return literals;
  }

  private static readonly CRITERIA_KEYWORDS = [
    'and',
    'or',
    'not',
    'in',
    'null',
    'true',
    'false',
    'match',
    'contains',
    'startswith',
    'endswith',
    'like'
  ];

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
