import * as vscode  from 'vscode';

import { RuleFileDiagnostics } from '../../views/integrationTests/ruleFileDiagnostics';

export class FillFPTAOutputParser {
	/**
	 * Разбирает ошибки из вывода утилиты fpta_filler.exe
	 * @param testOutput вывод утилиты fpta_filler.exe
	 * @returns список локаций ошибок
	 */
	public parse(testOutput : string) : RuleFileDiagnostics[] {
		const result: RuleFileDiagnostics[] = [];

		/** Пример сообщения:
		 * 
		 * Error in table Common_whitelist_regex:
		 * [-] Something went wrong:  : Failed to exit transaction: FPTA_TXN_CANCELLED: Transaction already cancelled
		 * 
		 */
		const pattern = /^Error in table (.*?):\r\n\[-\] Something went wrong:\s+: (.*?)$/gm;
		let m: RegExpExecArray;

		do {
			m = pattern.exec(testOutput);
			if (!m) break;

			if(m.length != 3) {
				continue;
			}
			
			const ruleFilePath = (m[1] as string).trim();
			const ruleLineNumber = 0;
			const ruleCharNumber = 0;
			const errorDescription = (m[2] as string).trim();

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

			diagnostic.source = 'FPTA_FILLER.EXE';
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

export class BuildLocsOutputParser {
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
		const pattern = /\[(WARNING|ERROR)\] (.*? in "(en|ru)" locale .*?)\s+([cC]:\\.*?):\s+(.*?)/sgm;
		let m: RegExpExecArray | null;

		do {
			m = pattern.exec(testOutput);
			if (!m) break;

			if(m.length != 6) {
				continue;
			}
			const type = (m[1] as string).trim();
			const locale = (m[3] as string);
			const ruleFilePath = (m[4] as string).trim() + "\\i18n" + "\\i18n_" + locale + ".yaml";
			const ruleLineNumber = 0;
			const ruleCharNumber = 0;
			const errorDescription = (m[2] as string).trim();

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
		 * [ERROR] EventDescriptions must be a not-empty list: C:\projects\knowledgebase\packages\esc\correlation_rules\supply_chain_risk\ESC_Artifactory_Sensitive_File_Access\metainfo.yaml
		 * 
		 */		
		const pattern2 = /\[(WARNING|ERROR)\] (.*?):\s+([cC]:\\.*?)/gm;
		do {
			m = pattern2.exec(testOutput);
			if (!m) break;

			if(m.length != 6) {
				continue;
			}
			const type = (m[1] as string).trim();
			const ruleFilePath = (m[3] as string).trim();
			const ruleLineNumber = 0;
			const ruleCharNumber = 0;
			const errorDescription = (m[2] as string).trim();

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
