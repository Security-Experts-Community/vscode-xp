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

    return this.formatter(jsYaml.dump(object, localizationDumpOptions));
  }

  public static tableStringify(object: any): Promise<string> {
    return this.formatter(jsYaml.dump(object, this.dumpOptions).replace(/\n/g, os.EOL));
  }

  public static stringify(object: any, styles?: any): Promise<string> {
    if (styles !== undefined) {
      this.dumpOptions.styles = styles;
    }

    return this.formatter(jsYaml.dump(object, this.dumpOptions).replace(/\n/g, os.EOL));
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

  private static dumpOptions: jsYaml.DumpOptions;
  private static loadOptions: jsYaml.LoadOptions;
  private static formatter: Formatter;
}
