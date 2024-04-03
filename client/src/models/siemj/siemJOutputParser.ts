import * as vscode  from 'vscode';
import * as fs  from 'fs';

import { FileSystemHelper } from '../../helpers/fileSystemHelper';
import { TestHelper } from '../../helpers/testHelper';

export class FileDiagnostics {
	public uri : vscode.Uri;
	public diagnostics : vscode.Diagnostic[] = [];
}

export class SiemjExecutionResult {
	public testsStatus : boolean;
	public statusMessage : string;

	public fileDiagnostics : FileDiagnostics[] = [];
	public failedTestNumbers : number[] = [];
	public tmpDirectoryPath: string;
	public testCount?: number;
}

export class SiemJOutputParser {
	/**
	 * Разбирает ошибки из вывода SIEMJ.
	 * @param siemjOutput вывод SIEMJ.
	 * @returns список локаций ошибок.
	 */
	public async parse(siemjOutput : string) : Promise<SiemjExecutionResult> {
		
		const result = new SiemjExecutionResult();
		this.processSectionsExitCode(siemjOutput, result);
		this.processBuildRules(siemjOutput, result);
		this.processTestRules(siemjOutput, result);

		// Корректировка диагностиков (выделение конкретных токенов) по анализу файлов с ошибками
		result.fileDiagnostics = await this.correctDiagnosticBeginCharRanges(result.fileDiagnostics);
		return result;
	}

	/**
	 * Проверяет возвращаемое значение от всех утилит SDK и Build Tools
	 * @param siemjOutput 
	 * @param result 
	 */
	private processSectionsExitCode(siemjOutput: string, result: SiemjExecutionResult) {
		// SIEMJ :: -------------------- SUBPROCESS EXIT CODE: 3221225477 --------------------
		const pattern = /SIEMJ :: -------------------- SUBPROCESS EXIT CODE: (\d+) --------------------/gm;
		let m: RegExpExecArray | null;
		while ((m = pattern.exec(siemjOutput))) {
			if(m.length != 2) {
				continue;
			}
			const exitCode = parseInt(m[1]);
			if(exitCode !== 0) {
				result.testsStatus = false;
				result.statusMessage = `Ошибка выполнения, так как одна из утилит вернула код ошибки ${exitCode}, отличный от нуля. [Смотри Output](command:xp.commonCommands.showOutputChannel)`;
				return;
			}
		}

		result.testsStatus = true;
	}

	private processBuildRules(siemjOutput: string, result: SiemjExecutionResult) {
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

		result.fileDiagnostics.push(...fileDiagnostics);
	}

	private processTestRules(siemjOutput: string, result: SiemjExecutionResult) {

		// Количество тестов не собрали.
		// TEST_RULES [Err] :: Collected 5 tests.
		// TEST_RULES :: Collected 6 tests.
		const runningTestRegExp = /Collected (\d+) tests./gm;
		if(!siemjOutput.match(runningTestRegExp)) {
			result.testsStatus = false;
			return;
		}

		// Количество тестов есть, парсим.
		let testCount : number;
		const collectedTestsResult = runningTestRegExp.exec(siemjOutput);
		if(collectedTestsResult && collectedTestsResult.length == 2) {
			const testCountString = collectedTestsResult[1];
			testCount = parseInt(testCountString);
		}

		result.testCount = testCount;

		// Все тесты прошли.
		if(siemjOutput.includes(this.TESTS_SUCCESS_SUBSTRING)) {
			result.testsStatus = true;
			return;
		} 

		// Тесты не прошли, разбираем ошибки.
		result.testsStatus = false;

		// Не все прошли, значит есть ошибки.
		// TEST_RULES :: Test Started: tests\\raw_events_1.json
		// TEST_RULES :: Expected results are not obtained.
		const failedTestRegExp = 
			/Test Started: tests\\raw_events_(\d+).json\s+TEST_RULES :: Expected results are not obtained./gm;

		let t: RegExpExecArray | null;
		while ((t = failedTestRegExp.exec(siemjOutput))) {

			if(t.length != 2) {
				continue;
			}

			const failedTestNumber = parseInt(t[1]);
			result.failedTestNumbers.push(failedTestNumber);
		}

		// Тесты не прошли, ошибок не нашлось, значит они все ошибочные.
		if(result.failedTestNumbers.length === 0) {
			const failedTestNumbers = [...Array(testCount + 1).keys()];
			failedTestNumbers.shift();
			result.failedTestNumbers = failedTestNumbers;
		}

		// Тесты даже не запустились.
		// Например, сырое событие без конверта.
		// if(siemjOutput.includes(this.ERRORS_FOUND_SUBSTRING)) {
		// 	result.testsStatus = false;
		// 	return;
		// }
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
			rfd.diagnostics = TestHelper.correctWhitespaceCharacterFromErrorLines(ruleContent, rfd.diagnostics);
		}

		return FileDiagnostics;
	}

	private readonly TESTS_SUCCESS_SUBSTRING = "All tests OK";
	private readonly ERRORS_FOUND_SUBSTRING = "TEST_RULES [Err] :: Errors found.";
}
