import * as js_yaml from 'js-yaml';
import * as prettier from 'prettier';
import * as os from 'os';

export class YamlHelper {
	public static configure(
		dumpOptions: js_yaml.DumpOptions,
		loadOptions?: js_yaml.LoadOptions) {
		this.dumpOptions = dumpOptions;
		this.loadOptions = loadOptions;
	}

	/**
	 * Сериализует в строку локализацию. Отличие в принудительном обрамлении в строку и дублировании одинарных кавычек.
	 * @param object объект для сериализации в строку
	 * @returns 
	 */
	public static localizationsStringify(object: any): string {
		const localizationDumpOptions = Object.assign({}, this.dumpOptions);
		localizationDumpOptions.forceQuotes = true;

		const yamlContent = js_yaml.dump(object, localizationDumpOptions);
		return prettier.format(
			yamlContent,
			{
				'parser': 'yaml',
				'tabWidth': this.dumpOptions.indent,
				//'aliasDuplicateObjects': false,
				'singleQuote': true
			}
		);
	}

	public static tableStringify(object: any): string {
		const yamlContent = js_yaml.dump(object, this.dumpOptions);

		return prettier.format(
			yamlContent,
			{
				'parser': 'yaml',
				'tabWidth': 2,
			}
		);

		return yamlContent.replace(/\n/g, os.EOL);
	}

	public static stringify(object: any): string {
		let yamlContent = js_yaml.dump(object, this.dumpOptions);

		yamlContent = prettier.format(
			yamlContent,
			{
				'parser': 'yaml',
				'tabWidth': this.dumpOptions.indent,
				//'aliasDuplicateObjects': false,
				// 'maxLineLength': this.dumpOptions.lineWidth,
			}
		);

		return yamlContent.replace(/\n/g, os.EOL);
	}

	public static stringifyTable(object: any) : string {
		return js_yaml.dump(object, {
            styles: { '!!null': 'empty' },
            lineWidth: -1,
            quotingType: '"'
        });
	}

	public static jsonToYaml(jsonStr: string) : string {
		return js_yaml.dump(JSON.parse(jsonStr));
	}

	public static yamlToJson(yamlStr: string) : string {
		return JSON.stringify(js_yaml.load(yamlStr, this.loadOptions));
	}

	public static parse(str: string): any {
		return js_yaml.load(str, this.loadOptions);
	}

	private static dumpOptions: js_yaml.DumpOptions;
	private static loadOptions: js_yaml.LoadOptions;
}
