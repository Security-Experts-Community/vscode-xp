import * as vscode  from 'vscode';
import { UnitTestOutputParser } from './unitTestOutputParser';

export class NormalizationUnitTestOutputParser implements UnitTestOutputParser {
	parseFailedOutput(output: string, expectation: string): string {
		throw new Error('Method not implemented.');
	}
	parseSuccessOutput(output: string): string {
		throw new Error('Method not implemented.');
	}
	
	private _diagnostics: vscode.Diagnostic[];
	
	/**
	 * Разбирает ошибки из вывода модульных тестов нормализаций.
	 * @param testOutput вывод модульных тестов нормализаций.
	 * @returns список локаций ошибок.
	 */
	public parse(testOutput : string) : vscode.Diagnostic[] {
		this._diagnostics = [];
		this.patterns.forEach((handler) => {handler(testOutput);});		
		return this._diagnostics;
	}

	private constructDiagnostics(ruleLineNumber: number, ruleCharNumber: number, errorDescription: string) {
		// Выделяем строку с начала, так как в выводе координаты только одного символа.
		const startPosition = new vscode.Position(ruleLineNumber, ruleCharNumber);
		const endPosition = new vscode.Position(ruleLineNumber, ruleCharNumber);
		return {
			severity: vscode.DiagnosticSeverity.Error,
			range: new vscode.Range(
				startPosition,
				endPosition
			),
			message: errorDescription,
			source: 'xp'
		};		
	}

	patterns = [
		(testOutput: string) => {
				// eslint-disable-next-line no-cond-assign
				const m = /\[ERROR\] (.*)/gm.exec(testOutput);
				if(m) {
					const ruleLineNumber = 0;
					const ruleCharNumber = 0;
					const errorDescription = (m[1] as string).trim();					
					const diagnostic = this.constructDiagnostics(ruleLineNumber, ruleCharNumber, errorDescription);
					this._diagnostics.push(diagnostic);
				}			
			},
			(testOutput: string) => {
				const m = /Failed to compile graph:\r?\n\t\t.*formula\.xp:(\d+):(\d+): (.*)\r?\n\r?\n/gm.exec(testOutput); 
				if (m) {
					const ruleLineNumber = parseInt(m[1]);
					const ruleCharNumber = parseInt(m[2]);
					const errorDescription = (m[3] as string).trim();
					// Почему-то интерфейс прибавляет 1 к строке и столбцу, вычтем для точности
					const diagnostic = this.constructDiagnostics(ruleLineNumber, ruleCharNumber, errorDescription);
					this._diagnostics.push(diagnostic);
				}
			}
	]
}
