import * as js_yaml from 'js-yaml';
import * as prettier from 'prettier';

export class YamlHelper {
	public static configure(
		dumpOptions: js_yaml.DumpOptions,
		loadOptions?: js_yaml.LoadOptions) {
		this.dumpOptions = dumpOptions;
		this.loadOptions = loadOptions;
	}

	/**
	 * Сериализует в строку локализацию. Отличие в принудельном обрамлении в строку и дублировании одинарных кавычек.
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
				'singleQuote': true,
			}
		);
	}

	public static stringify(object: any): string {
		const yamlContent = js_yaml.dump(object, this.dumpOptions);

		return prettier.format(
			yamlContent,
			{
				'parser': 'yaml',
				'tabWidth': this.dumpOptions.indent,
				//'aliasDuplicateObjects': false,
				// 'maxLineLength': this.dumpOptions.lineWidth,
			}
		);
	}

	public static parse(str: string): any {
		return js_yaml.load(str, this.loadOptions);
	}

	private static dumpOptions: js_yaml.DumpOptions;
	private static loadOptions: js_yaml.LoadOptions;
}
