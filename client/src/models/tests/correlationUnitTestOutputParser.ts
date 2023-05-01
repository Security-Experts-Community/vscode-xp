import * as vscode  from 'vscode';
import { UnitTestOutputParser } from './unitTestOutputParser';
import { TestHelper } from '../../helpers/testHelper';
import { diffJson } from 'diff';

export class CorrelationUnitTestOutputParser implements UnitTestOutputParser {
	
	public parseFailedOutput(output: string, expectation: string): string {
			if(/Got no resulting events/.exec(output)) {
				return "Got no resulting events";
			}

			const testResults = /(?:Got these results:\s*)(\{.*\})(?:\s*(\{.*\}))*/m.exec(output);
			if (!testResults) { return output; }
			const pattern = testResults.filter((s): s is string => !!s);
			if (pattern && pattern.length > 1){
				const results = pattern.slice(1);
				const expected = /\{.*?\}/m.exec(expectation);
				const multipleExpectatoin = !!/expect.*expect/sm.exec(expectation);
				if (results.length == 1 && !multipleExpectatoin){
					const result = JSON.parse(results[0]);
					if (expected) {
						const expectedJson = JSON.parse(expected[0]);
						const expectedKeys = Object.keys(expectedJson);
						const filteredResult = Object.keys(result)
							.filter(key => expectedKeys.includes(key))
							.reduce((obj, key) => {
								obj[key] = result[key];
								return obj;
						}, {});

						const difference = diffJson(filteredResult, expectedJson);
			
						let result_diff = "";
						for (const part of difference) {
							const sign = part.added ? '+' :	(part.removed ? '-' : ' ');
							const lines = part.value.split(/\r?\n/).filter((line)=>{return line != '';});
							for (const line of lines){
								result_diff += sign + line + '\n';
							}
						}
						return result_diff;
					} else {

						return results[0];
					}
				} else {
					return output;
				}	
			}		
	}

	public parseSuccessOutput(output: string): string {
		let m: RegExpExecArray;
        let correlations = [];
        const re = /^\{.*?\}$/gm;
        while ((m = re.exec(output))) {
            correlations = correlations.concat(m[0]);
        }
        // const pattern = /(\{.*\})(?:\s*(\{.*\}))*/m.exec(output).filter((s) => !!s);
		if (correlations && correlations.length > 0) {
			// const results = correlations.slice(1);	
			const result = correlations.map(json => {
				const correlation = JSON.parse(json);
				delete correlation._objects;
				delete correlation._subjects;
				return TestHelper.formatTestCodeAndEvents(JSON.stringify(correlation));
			}).join('\n');
			return result;
		}
		return output;
	}

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
		while ((m = pattern.exec(testOutput))) {

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
