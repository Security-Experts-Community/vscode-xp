
export class FunctionNameParser {
	public parse(trimmedString: string, triggerCharPosition: number) : string {

		const truncatedByTriggerChar = trimmedString.substring(0, triggerCharPosition);
		trimmedString = truncatedByTriggerChar.trim();

		const parseFunction = /(?:.*?)([A-Za-z0-9_]+)\($/;
		const result = parseFunction.exec(trimmedString);
		if(!result) {
			return null;
		}

		if(result.length != 2) {
			return null;
		}

		return result[1];
	}
}