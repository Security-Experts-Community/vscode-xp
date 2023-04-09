import * as vscode  from 'vscode';
import { EOL } from 'os';

import { FileSystemHelper } from '../../helpers/fileSystemHelper';
import { TestHelper } from '../../helpers/testHelper';
import { RuleFileDiagnostics } from '../../views/integrationTests/ruleFileDiagnostics';
import { ExtensionHelper } from '../../helpers/extensionHelper';

export class SiemJOutputParser {
	/**
	 * Разбирает ошибки из вывода модульных тестов.
	 * @param testOutput вывод модульных тестов.
	 * @returns список локаций ошибок.
	 */
	public async parse(testOutput : string) : Promise<RuleFileDiagnostics[]> {
		let result: RuleFileDiagnostics[] = [];

		// [ERROR] Compilation failed:
		// c:\Work\-=SIEM=-\Content\knowledgebase\packages\esc\correlation_rules\active_directory\Active_Directory_Snapshot\rule.co:27:29: syntax error, unexpected '='
		const pattern = /BUILD_RULES \[Err\] :: (\S+?):(\d+):(\d+):([\S ]+)/gm;
		let m: RegExpExecArray | null;

		while (m = pattern.exec(testOutput)) {

			if(m.length != 5) {
				continue;
			}

			const ruleFilePath = (m[1] as string).trim();
			const ruleLineNumber = parseInt(m[2]) - 1;
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

			diagnostic.source = 'xp';

			if(errorDescription.includes("warning: ")) {
				diagnostic.severity = vscode.DiagnosticSeverity.Warning;
				diagnostic.message = diagnostic.message.replace("warning: ", "");
			} else {
				diagnostic.severity = vscode.DiagnosticSeverity.Error;
			}

			const fileUri = vscode.Uri.file(ruleFilePath);
			const ruleFileDiags = result.find(rfd => rfd.Uri === fileUri);

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
		}

		result = await this.correctDiagnosticBeginCharRanges(result);
		return result;
	}

	/**
	 * Меняет начальное смещение ошибки на первый не пробельный символ, так как исходная ошибка возвращается в виде одного символа.
	 * @param ruleFileDiagnostics список диагностик для файлов.
	 * @returns скорректированные диагностики.
	 */
	private async correctDiagnosticBeginCharRanges(ruleFileDiagnostics : RuleFileDiagnostics[]) : Promise<RuleFileDiagnostics[]> {
		for(const rfd of ruleFileDiagnostics) {
			const ruleFilePath = rfd.Uri.fsPath;
			const ruleContent = await FileSystemHelper.readContentFile(ruleFilePath);
			
			const lines = ruleContent.split(EOL);
			lines.forEach(line => {if(line.includes("\n")){ExtensionHelper.showUserInfo(`File ${ruleFilePath} contains mixed ends of lines`);}});

			rfd.Diagnostics = TestHelper.correctWhitespaceCharacterFromErrorLines(ruleContent, rfd.Diagnostics);
		}

		return ruleFileDiagnostics;
	}
}
