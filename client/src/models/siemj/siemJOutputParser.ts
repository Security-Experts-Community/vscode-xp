import * as vscode  from 'vscode';
import * as fs  from 'fs';
import { EOL } from 'os';

import { FileSystemHelper } from '../../helpers/fileSystemHelper';
import { TestHelper } from '../../helpers/testHelper';
import { ExtensionHelper } from '../../helpers/extensionHelper';
import { stat } from 'fs';

export class FileDiagnostics {
	public uri : vscode.Uri;
	public diagnostics : vscode.Diagnostic[] = [];
}

export class SiemjExecutionResult {
	public status : boolean;
	public fileDiagnostics : FileDiagnostics[] = [];
	public successTestNumber : number[] = [];
	public failedTestNumber : number[] = [];
}

export class SiemJOutputParser {
	/**
	 * Разбирает ошибки из вывода SIEMJ.
	 * @param siemjOutput вывод SIEMJ.
	 * @returns список локаций ошибок.
	 */
	public async parse(siemjOutput : string) : Promise<SiemjExecutionResult> {
		
		const result = new SiemjExecutionResult();

		// [ERROR] Compilation failed:
		// c:\Work\-=SIEM=-\Content\knowledgebase\packages\esc\correlation_rules\active_directory\Active_Directory_Snapshot\rule.co:27:29: syntax error, unexpected '='
		const fileDiagnostics: FileDiagnostics[] = [];
		const pattern = /BUILD_RULES \[Err\] :: (\S+?):(\d+):(\d+):([\S ]+)/gm;
		let m: RegExpExecArray | null;
		while ((m = pattern.exec(siemjOutput))) {

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
			const ruleFileDiags = fileDiagnostics.find(rfd => rfd.uri === fileUri);

			if(ruleFileDiags) {
				// Файл был, добавляем в конец.
				ruleFileDiags.diagnostics.push(diagnostic);
				continue;
			}

			// Такого файла еще не было, создаем и добавляем.
			const newRuleFileDiag = new FileDiagnostics();
			newRuleFileDiag.uri = fileUri;
			newRuleFileDiag.diagnostics.push(diagnostic);

			fileDiagnostics.push(newRuleFileDiag);
		}

		// TEST_RULES :: Test Started: tests\\raw_events_1.json
		// TEST_RULES :: Expected results are not obtained.
		const failedTestRegExp = /TEST_RULES :: Test Started: tests\\raw_events_(\d+).json\s+TEST_RULES :: Expected results are not obtained./gm;
		let t: RegExpExecArray | null;
		while ((t = failedTestRegExp.exec(siemjOutput))) {

			if(t.length != 2) {
				continue;
			}

			const failedTestNumber = parseInt(t[1]);
			result.failedTestNumber.push(failedTestNumber);
		}

		// Если хоть одна ошибка, тогда выполнение Siemj завершилось неуспешно.
		if(result.fileDiagnostics.some(fd => fd.diagnostics.some(d => d.severity == vscode.DiagnosticSeverity.Error))) {
			result.status = false;
		} else {
			result.status = true;
		}

		result.fileDiagnostics = await this.correctDiagnosticBeginCharRanges(fileDiagnostics);
		return result;
	}

	/**
	 * Меняет начальное смещение ошибки на первый не пробельный символ, так как исходная ошибка возвращается в виде одного символа.
	 * @param FileDiagnostics список диагностик для файлов.
	 * @returns скорректированные диагностики.
	 */
	private async correctDiagnosticBeginCharRanges(FileDiagnostics : FileDiagnostics[]) : Promise<FileDiagnostics[]> {
		for(const rfd of FileDiagnostics) {
			const ruleFilePath = rfd.uri.fsPath;
			if(!fs.existsSync(ruleFilePath)) {
				continue;
			}
			
			const ruleContent = await FileSystemHelper.readContentFile(ruleFilePath);
			
			const lines = ruleContent.split(EOL);
			lines.forEach(line => {if(line.includes("\n")){ExtensionHelper.showUserInfo(`File ${ruleFilePath} contains mixed ends of lines`);}});

			rfd.diagnostics = TestHelper.correctWhitespaceCharacterFromErrorLines(ruleContent, rfd.diagnostics);
		}

		return FileDiagnostics;
	}
}
