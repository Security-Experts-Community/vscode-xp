import * as jsYaml from 'js-yaml';
import * as os from 'os';

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
   * @returns
   */
  public static localizationsStringify(object: any): Promise<string> {
    const localizationDumpOptions = { ...this.dumpOptions };
    localizationDumpOptions.forceQuotes = true;

    return this.formatter(this.dumpToText(object, localizationDumpOptions));
  }

  public static tableStringify(object: any): Promise<string> {
    return this.formatter(this.dumpToText(object, this.dumpOptions));
  }

  public static stringify(object: any, styles?: any): Promise<string> {
    const dumpOptions = { ...this.dumpOptions };
    if (styles !== undefined) {
      dumpOptions.styles = styles;
    }

    return this.formatter(this.dumpToText(object, dumpOptions));
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
