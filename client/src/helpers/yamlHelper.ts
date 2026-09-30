import * as jsYaml from 'js-yaml';
import * as os from 'os';

import { JsHelper } from './jsHelper';

type Formatter = (text: string) => Promise<string>;

export class YamlHelper {
  public static configure(
    dumpOptions: jsYaml.DumpOptions,
    loadOptions?: jsYaml.LoadOptions,
    formatter?: Formatter
  ): void {
    this.dumpOptions = dumpOptions;
    this.loadOptions = loadOptions;
    this.formatter = formatter;
  }

  /**
   * Сериализует в строку локализацию. Отличие в принудительном обрамлении в строку и дублировании одинарных кавычек.
   * @param object объект для сериализации в строку
   * @param currentYaml текущее содержимое файла, отступы которого надо сохранить
   * @returns
   */
  public static localizationsStringify(object: any, currentYaml?: string): Promise<string> {
    const localizationDumpOptions = this.getDumpOptionsByExample(currentYaml);
    localizationDumpOptions.forceQuotes = true;

    return this.formatter(this.dumpToText(object, localizationDumpOptions));
  }

  public static tableStringify(object: any): Promise<string> {
    return this.formatter(this.dumpToText(object, this.dumpOptions));
  }

  public static stringify(object: any, styles?: any, currentYaml?: string): Promise<string> {
    const dumpOptions = this.getDumpOptionsByExample(currentYaml);
    if (styles !== undefined) {
      dumpOptions.styles = styles;
    }

    return this.formatter(this.dumpToText(object, dumpOptions));
  }

  /**
   * Сравнивает yaml-документы по содержимому без учета форматирования и порядка ключей.
   * @param firstYaml первый документ
   * @param secondYaml второй документ
   * @param ignore удаляет из разобранного документа поля, которые не нужно сравнивать
   * @returns совпадает ли содержимое документов
   */
  public static isSameContent(
    firstYaml: string,
    secondYaml: string,
    ignore?: (object: any) => void
  ): boolean {
    let first: any;
    let second: any;
    try {
      first = this.parse(firstYaml);
      second = this.parse(secondYaml);
    } catch {
      return false;
    }

    ignore?.(first);
    ignore?.(second);
    return JsHelper.isEqualIgnoringEmptyValues(first, second);
  }

  public static stringifyTable(object: any): string {
    return jsYaml.dump(object, {
      styles: { '!!null': 'empty' },
      lineWidth: -1,
      quotingType: '"'
    });
  }

  public static jsonToYaml(jsonStr: string): string {
    return jsYaml.dump(JSON.parse(jsonStr));
  }

  public static yamlToJson(yamlStr: string): string {
    return JSON.stringify(jsYaml.load(yamlStr, this.loadOptions));
  }

  public static parse(str: string): any {
    return jsYaml.load(str, this.loadOptions);
  }

  /**
   * Подбирает параметры сериализации под отступы текущего файла, чтобы при сохранении не переформатировать его.
   */
  private static getDumpOptionsByExample(currentYaml?: string): jsYaml.DumpOptions {
    const indent = currentYaml ? this.detectIndent(currentYaml) : undefined;
    if (!indent || indent === this.dumpOptions.indent) {
      return { ...this.dumpOptions };
    }

    return { ...this.dumpOptions, indent, noArrayIndent: false };
  }

  /**
   * Определяет отступ вложенного блока по первому ключу, значение которого задано со следующей строки.
   */
  private static detectIndent(yaml: string): number | undefined {
    const lines = yaml
      .split(/\r?\n/)
      .filter((line) => line.trim() !== '' && !line.trimStart().startsWith('#'));

    for (let index = 1; index < lines.length; index++) {
      const parentLine = lines[index - 1];
      if (!parentLine.trimEnd().endsWith(':')) {
        continue;
      }

      const parentIndent = parentLine.search(/\S/);
      const childIndent = lines[index].search(/\S/);
      if (childIndent > parentIndent) {
        return childIndent - parentIndent;
      }
    }

    return undefined;
  }

  private static dumpToText(object: any, dumpOptions: jsYaml.DumpOptions): string {
    const text = jsYaml
      .dump(object, dumpOptions)
      .replace(/[ \t]+$/gm, '')
      .replace(/\n/g, os.EOL);

    return this.normalizeSequenceMappings(text, dumpOptions.indent ?? 2);
  }

  private static normalizeSequenceMappings(text: string, indentSize: number): string {
    const normalizedEol = text.replace(/\r\n/g, '\n');
    const lines = normalizedEol.split('\n');
    const result: string[] = [];
    let activeSequence:
      | {
          sourceChildIndent: string;
          desiredDashIndent: string;
          desiredChildIndent: string;
        }
      | undefined;

    for (let index = 0; index < lines.length; index++) {
      const currentLine = lines[index];
      const previousLine = result[result.length - 1];
      const dashOnlyMatch = /^(\s*)-\s*$/.exec(currentLine);

      if (!dashOnlyMatch) {
        if (currentLine.trim() !== '') {
          activeSequence = undefined;
        }
        result.push(currentLine);
        continue;
      }

      const childIndex = index + 1;
      const childLine = lines[childIndex];
      const childIndentMatch = childLine?.match(/^(\s+)\S/);
      if (!childIndentMatch) {
        result.push(currentLine);
        continue;
      }

      const childIndent = childIndentMatch[1];

      if (!activeSequence) {
        if (!previousLine?.trimEnd().endsWith(':')) {
          result.push(currentLine);
          continue;
        }

        const previousIndent = previousLine.match(/^(\s*)/)?.[1].length ?? 0;
        const desiredDashIndent = ' '.repeat(previousIndent + indentSize);
        activeSequence = {
          sourceChildIndent: childIndent,
          desiredDashIndent,
          desiredChildIndent: `${desiredDashIndent}  `
        };
      }

      result.push(`${activeSequence.desiredDashIndent}- ${childLine.slice(childIndent.length)}`);
      index = childIndex;

      while (index + 1 < lines.length) {
        const nextLine = lines[index + 1];
        if (!nextLine.startsWith(activeSequence.sourceChildIndent) || nextLine.trim() === '') {
          break;
        }

        result.push(
          `${activeSequence.desiredChildIndent}${nextLine.slice(activeSequence.sourceChildIndent.length)}`
        );
        index++;
      }
    }

    return result.join(os.EOL);
  }

  private static dumpOptions: jsYaml.DumpOptions;
  private static loadOptions: jsYaml.LoadOptions;
  private static formatter: Formatter;
}
