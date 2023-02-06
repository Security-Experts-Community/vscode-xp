export class StringHelper {
	public static textToOneLine(str : string) : string {
		return str.replace(/(?:\r\n|\r|\n)/g, '');
	}

	public static textToOneLineAndTrim(str : string) : string {
		return str.replace(/(?:\r\n|\r|\n)/g, '').trim();
	}
}