import * as vscode  from 'vscode';

import { RuleFileDiagnostics } from '../../views/integrationTests/ruleFileDiagnostics';

export class MktablesOutputParser {
	/**
	 * Разбирает ошибки из вывода утилиты mktables.exe
	 * @param testOutput вывод утилиты mktables.exe
	 * @returns список локаций ошибок
	 */
	public parse(testOutput : string) : RuleFileDiagnostics[] {
		const result: RuleFileDiagnostics[] = [];

		/** Пример сообщения:
		 * 
		 * [WARNING] Table "DMZ_hosts_with_open_ports": Field "uri" is both primaryKey and nullable
		 * [ERROR] Table specifications file was not found!
		 * 
		 */
		const pattern = /^\[(WARNING|ERROR)\] Table "(.*?)": (.*?)$/gm;
		let m: RegExpExecArray;

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

			diagnostic.source = 'MKTABLES.EXE';

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
		
		/** Пример сообщения:
		 * 
		 * [ERROR] Table specifications file was not found!
		 * 
		 */
		const pattern2 = /^\[(WARNING|ERROR)\] "(.*?)"!$/gm;
		do {
			m = pattern.exec(testOutput);
			if (!m) break;

			if(m.length != 4) {
				continue;
			}
			const type = (m[1] as string).trim();
			const ruleFilePath = "Unknown";
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

			diagnostic.source = 'MKTABLES.EXE';

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