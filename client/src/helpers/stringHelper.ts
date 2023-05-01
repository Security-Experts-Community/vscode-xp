export class StringHelper {
	public static textToOneLine(str : string) : string {
		if (!str) { return ""; }
		return str.replace(/(?:\r\n|\r|\n)/g, '');
	}

	public static textToOneLineAndTrim(str : string) : string {
		if (!str) { return ""; }
		return str.replace(/(?:\r\n|\r|\n)/g, '').trim();
	}
}