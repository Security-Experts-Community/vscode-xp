import * as vscode  from 'vscode';
import { EOL } from 'os';
import { UnitTestOutputParser } from './unitTestOutputParser';

export class CorrelationUnitTestOutputParser implements UnitTestOutputParser {
	/**
	 * Разбирает ошибки из вывода модульных тестов.
	 * @param testOutput вывод модульных тестов.
	 * @returns список локаций ошибок.
	 */
	public parse(testOutput : string) : vscode.Diagnostic[] {
		const diagnostics : vscode.Diagnostic[] = [];

		// [ERROR] Compilation failed:
		// c:\Work\-=SIEM=-\Content\knowledgebase\packages\esc\correlation_rules\active_directory\Active_Directory_Snapshot\rule.co:27:29: syntax error, unexpected '='
		const pattern = /\[ERROR\] Compilation failed:\s*(\S+?):(\d+):(\d+):([\S ]+)/gm;
		let m: RegExpExecArray | null;

		// eslint-disable-next-line no-cond-assign
		while (m = pattern.exec(testOutput)) {

			const ruleLineNumber = parseInt(m[2]) - 1;
			const ruleCharNumber = parseInt(m[3]);
			const errorDescription = (m[4] as string).trim();

			// Выделяем строку с начала, так как в выводе координаты только одного символа.
			const startPosition = new vscode.Position(ruleLineNumber, 0);
			const endPosition = new vscode.Position(ruleLineNumber, ruleCharNumber);

			// TODO: обернуть для избежания копипаста.
			const diagnostic: vscode.Diagnostic = {
				severity: vscode.DiagnosticSeverity.Error,
				range: new vscode.Range(
					startPosition,
					endPosition
				),
				message: errorDescription,
				source: 'xp'
			};

			diagnostics.push(diagnostic);
		}

		return diagnostics;
	}


}
