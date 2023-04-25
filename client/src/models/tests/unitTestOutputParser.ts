import * as vscode  from 'vscode';

export interface UnitTestOutputParser {
	/**
	 * Разбирает ошибки из вывода модульных тестов.
	 * @param testOutput вывод модульных тестов.
	 * @returns список локаций ошибок.
	 */
	parse(testOutput : string) : vscode.Diagnostic[];
}
