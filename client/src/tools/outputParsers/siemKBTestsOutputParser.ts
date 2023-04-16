import * as vscode  from 'vscode';
import * as path  from 'path';

import { RuleFileDiagnostics } from '../../views/integrationTests/ruleFileDiagnostics';
import { ParseException } from '../../models/parseException';

export class SiemKBTestsOutputParser {
	constructor(private _rulePath: string){}
	/**
	 * Разбирает ошибки из вывода модульных тестов.
	 * @param testOutput вывод модульных тестов.
	 * @returns список локаций ошибок.
	 */
	public parse(testOutput : string) : RuleFileDiagnostics[] {
		const result: RuleFileDiagnostics[] = [];

		/** Пример сообщения:
		 *  
		 * [WARNING] Problem with spaces found in "ru" locale for content C:\Users\aw350m3\Desktop\Inbox\Projects\XP\edr-xp-rules-main\rules\windows\siem-rules\antimalware\correlation_rules\Windows_Defender_Disable:
		 * ���������Windows�Defender���������:������������������"{object.name}"�������������������1�(True)
		 * Please check for double spaces / tabulation / etc
		 * 
		 */
		//const pattern = /\[(WARNING|ERROR)\] (.*? in "(en|ru)" locale .*?)\s+([cC]:\\.*?):\s+(.*?)/sgm;
		const pattern = /\[(ERROR)\] Errors were found in test conditions ([cC]:\\.*?\\tests\\test_conds_\d+.tc):\s+(.*?)\s+\[ERROR\] Found errors in test suites/sgm;
		let m: RegExpExecArray | null;

		do {
			m = pattern.exec(testOutput);
			if (!m) break;

			if(m.length != 4) {
				continue;
			}
			const type = (m[1] as string).trim();
			const ruleFilePath = (m[2] as string).trim();
			const ruleLineNumber = 0;
			const ruleCharNumber = 0;
			const errorDescription = (m[3] as string).trim();

			// Выделяем строку с начала, так как в выводе координаты только одного символа.
			const startPosition = new vscode.Position(ruleLineNumber, 0);
			const endPosition = new vscode.Position(ruleLineNumber, ruleCharNumber);

			const diagnostic = new vscode.Diagnostic(
				new vscode.Range(
					startPosition,
					endPosition
				),
				errorDescription
			);

			diagnostic.source = 'SIEMKB_TESTS.EXE';

			if(type == "WARNING") {
				diagnostic.severity = vscode.DiagnosticSeverity.Warning;
			} else {
				diagnostic.severity = vscode.DiagnosticSeverity.Error;
			}

			const fileUri = vscode.Uri.file(ruleFilePath);
			const ruleFileDiags = result.find(rfd => rfd.Uri == fileUri);

			if(ruleFileDiags) {
				// Файл был, добавляем в конец.
				ruleFileDiags.Diagnostics.push(diagnostic);
				continue;
			}

			// Такого файла еще не было, создаем и добавляем.
			const newRuleFileDiag = new RuleFileDiagnostics();
			newRuleFileDiag.Uri = fileUri;
			newRuleFileDiag.Diagnostics.push(diagnostic);

			result.push(newRuleFileDiag);
		} while(m);
		
		const pattern2 = /##teamcity\[testStarted name='tests\\raw_events_(\d+)\.json' captureStandardOutput='true'\]\s+Expected results are not obtained.\s+(.*?)\s+##teamcity\[testFailed name='tests\\raw_events_(\1)\.json' message='See messages above'\]\s+(.*?)\s+##teamcity\[testFinished name='tests\\raw_events_(\1).json'\]/sgm;
		do {
			m = pattern2.exec(testOutput);
			if (!m) break;

			if(m.length != 6) {
				continue;
			}
						
			const testNumber = parseInt(m[1], 10);
			if (isNaN(testNumber)) { 
				throw new ParseException(`Can't parse failed test number! ${testOutput}`); 
			}
			const ruleFilePath = path.join(this._rulePath, "tests", `test_conds_${testNumber}.tc`);
			const ruleLineNumber = 0;
			const ruleCharNumber = 0;
			const errorDescription = (m[2] as string).trim() + "\n\n" + (m[4] as string).trim();

			// Выделяем строку с начала, так как в выводе координаты только одного символа.
			const startPosition = new vscode.Position(ruleLineNumber, 0);
			const endPosition = new vscode.Position(ruleLineNumber, ruleCharNumber);

			const diagnostic = new vscode.Diagnostic(
				new vscode.Range(
					startPosition,
					endPosition
				),
				errorDescription
			);

			diagnostic.source = 'SIEMKB_TESTS.EXE';			
			diagnostic.severity = vscode.DiagnosticSeverity.Error;

			const fileUri = vscode.Uri.file(ruleFilePath);
			const ruleFileDiags = result.find(rfd => rfd.Uri == fileUri);

			if(ruleFileDiags) {
				// Файл был, добавляем в конец.
				ruleFileDiags.Diagnostics.push(diagnostic);
				continue;
			}

			// Такого файла еще не было, создаем и добавляем.
			const newRuleFileDiag = new RuleFileDiagnostics();
			newRuleFileDiag.Uri = fileUri;
			newRuleFileDiag.Diagnostics.push(diagnostic);

			result.push(newRuleFileDiag);
		} while(m);


		return result;
	}

	/**
	 * Меняет начальное смещение ошибки на первый не пробельный символ, так как исходная ошибка возвращается в виде одного символа.
	 * @param ruleFileDiagnostics список диагностик для файлов.
	 * @returns скорректированные диагностики.
	 */
	public async correctDiagnosticBeginCharRanges(ruleFileDiagnostics : RuleFileDiagnostics[]) : Promise<RuleFileDiagnostics[]> {
		for(const rfd of ruleFileDiagnostics) {
			// TODO: заменить ручным чтением, ибо открытие каждого файла очень хорошо видно в редакторе.
			const textEditor = await vscode.window.showTextDocument(rfd.Uri);
			this.removeWhitespaceCharacterFromErrorLines(textEditor.document, rfd);
		}

		return ruleFileDiagnostics;
	}

	private removeWhitespaceCharacterFromErrorLines(ruleDocument : vscode.TextDocument, diagnostics : RuleFileDiagnostics) : void {

		diagnostics.Diagnostics = diagnostics.Diagnostics.map(d => {
			const errorLine = ruleDocument.lineAt(d.range.start.line);

			const firstNonWhitespaceCharacterIndex = errorLine.firstNonWhitespaceCharacterIndex;
			d.range = new vscode.Range(
				new vscode.Position(d.range.start.line, firstNonWhitespaceCharacterIndex),
				d.range.end);

			return d;
		});
	}
}