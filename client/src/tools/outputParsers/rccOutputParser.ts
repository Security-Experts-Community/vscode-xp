import * as vscode  from 'vscode';

import { RuleFileDiagnostics } from '../../views/integrationTests/ruleFileDiagnostics';

export class RCCOutputParser {
	/**
	 * Разбирает ошибки из вывода утилиты rcc.exe
	 * @param testOutput вывод утилиты rcc.exe
	 * @returns список локаций ошибок
	 */
	public parse(testOutput : string) : RuleFileDiagnostics[] {
		const result: RuleFileDiagnostics[] = [];

		/** Пример строки:
		 * 
		 * c:\XP\kb\packages:0:0: error: file not exists: The operation completed successfully: "c:\XP\kb\packages"
		 * 
		 */
		const pattern = /^(.*?):(\d+):(\d+): error: (.*?)$/gm;

		let m: RegExpExecArray|null;

		do {
			m = pattern.exec(testOutput);
			if (!m) break;

			if(m.length != 5) {
				continue;
			}

			const ruleFilePath = (m[1] as string).trim();
			const ruleLineNumber = parseInt(m[2]);
			const ruleCharNumber = parseInt(m[3]);
			const errorDescription = (m[4] as string).trim();

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

			diagnostic.source = 'RCC.EXE';

			if(errorDescription.includes("warning: ")) {
				diagnostic.severity = vscode.DiagnosticSeverity.Warning;
				diagnostic.message = diagnostic.message.replace("warning: ", "");
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
		
		// обрабатываем другой шаблон
		// TODO: нужно сделать универсальный обработчик и в цикле передавать шаблоны

		/** Пример строки:
		 * 
		 * error: file not exists
		 * 
		 */
		const pattern2 = /^error: (.*?)$/gm;
		do {
			m = pattern2.exec(testOutput);
			if (!m) break;

			if(m.length != 2) {
				continue;
			}

			const ruleLineNumber = 0;
			const ruleCharNumber = 0;
			const errorDescription = (m[1] as string).trim();

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

			diagnostic.source = 'RCC.EXE';

			if(errorDescription.includes("warning: ")) {
				diagnostic.severity = vscode.DiagnosticSeverity.Warning;
				diagnostic.message = diagnostic.message.replace("warning: ", "");
			} else {
				diagnostic.severity = vscode.DiagnosticSeverity.Error;
			}

			const fileUri = vscode.Uri.file("rcc.exe");
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