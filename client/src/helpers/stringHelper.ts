export class StringHelper {
	public static textToOneLine(str : string) : string {
		if (!str) { return ""; }
		return str.replace(/(?:\r\n|\r|\n)/g, '');
	}

	public static escapeSpecialChars(str: string) : string {
		return str
			.replace(/(?<!\\)\n/gm, '\\n')
			.replace(/(?<!\\)\r\n/gm, '\\r\\n')
			.replace(/(?<!\\)\r/gm, '\\r\\n');
	}

	public static textToOneLineAndTrim(str : string) : string {
		if (!str) { return ""; }
		return str.replace(/(?:\r\n|\r|\n)/g, '').trim();
	}

	public static splitTextOnLines(str: string) : string [] {
		return str.replace(/\r?\n/gm, '\n')
			.split('\n')
			.filter(l => l);
	}
}