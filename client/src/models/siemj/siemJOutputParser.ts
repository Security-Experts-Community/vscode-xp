import * as vscode from 'vscode';
import * as fs from 'fs';

import { FileSystemHelper } from '../../helpers/fileSystemHelper';
import { TestHelper } from '../../helpers/testHelper';
import { Log } from '../../extension';
import { Configuration } from '../configuration';
import { VsCodeApiHelper } from '../../helpers/vsCodeApiHelper';

import { XpException } from '../../models/xpException';
import { SIEMJVersion } from './siemjManager';

export class FileDiagnostics {
  public uri: vscode.Uri;
  public diagnostics: vscode.Diagnostic[] = [];
}

export class SiemjExecutionResult {
  public testsStatus: boolean;
  public statusMessage: string;

  public fileDiagnostics: FileDiagnostics[] = [];
  public failedTestNumbers: number[] = [];
  public tmpDirectoryPath: string;
  public testCount?: number;
  public rawOutput: string;
}

interface ISiemJOutputPatterns {
  exitCodeSection: RegExp;
  buildRulesError: RegExp;
  buildLocalizationError: RegExp;
  testRulesFound: RegExp;
  testRulesFail: RegExp;
  testsSucceeded: RegExp;
}

export class SiemJOutputParser {
  private FirstSiemjPatterns: ISiemJOutputPatterns = {
    // SIEMJ :: -------------------- SUBPROCESS EXIT CODE: 3221225477 --------------------
    exitCodeSection:
      /SIEMJ :: -------------------- SUBPROCESS EXIT CODE: (\d+) --------------------/gm,

    buildRulesError: /BUILD_RULES \[Err\] :: (\S+?):(\d+):(\d+):([\S ]+)/gm,

    // BUILD_EVENT_LOCALIZATION :: [ERROR] Each EventDescriptions entry must be a dict of 2 non-empty elements: C:\\knowledgebase\\packages\\package\\normalization_formulas\\Login_success\\i18n\\i18n_en.yaml
    buildLocalizationError: /BUILD_EVENT_LOCALIZATION :: \[ERROR\] (.*?): (.*?)$/gm,

    // TEST_RULES [Err] :: Collected 5 tests.
    // TEST_RULES :: Collected 6 tests.
    testRulesFound: /Collected (\d+) tests./gm,

    // TEST_RULES :: Test Started: tests\\raw_events_1.json
    // TEST_RULES :: Expected results are not obtained.
    testRulesFail:
      /Test Started: tests\\raw_events_(\d+).json\s+TEST_RULES :: Expected results are not obtained./gm,

    testsSucceeded: /All tests OK/gm
  };

  private SecondSiemjPatterns: ISiemJOutputPatterns = {
    // SIEMJ :: -------------------- SUBPROCESS EXIT CODE: 3221225477 --------------------
    exitCodeSection:
      /SIEMJ :: -------------------- SUBPROCESS EXIT CODE: (\d+) --------------------/gm,

    buildRulesError: /BUILD_RULES \[Err\] :: (\S+?):(\d+):(\d+):([\S ]+)/gm,

    // BUILD_EVENT_LOCALIZATION :: [ERROR] Each EventDescriptions entry must be a dict of 2 non-empty elements: C:\\knowledgebase\\packages\\package\\normalization_formulas\\Login_success\\i18n\\i18n_en.yaml
    buildLocalizationError: /BUILD_EVENT_LOCALIZATION :: \[ERROR\] (.*?): (.*?)$/gm,

    testRulesFound: /(\d+) tests found/gm,

    testRulesFail:
      /Test start: tests.test_conds_(\d+).tc\s+TEST_PIPELINE :: The expected results for the events were not obtained./gm,
    testsSucceeded: /All tests passed successfully/gm
  };

  private siemjPatterns: ISiemJOutputPatterns;

  constructor(
    private config: Configuration,
    siemjVersion: SIEMJVersion
  ) {
    switch (siemjVersion) {
      case SIEMJVersion.First:
        this.siemjPatterns = this.FirstSiemjPatterns;
        break;
      case SIEMJVersion.Second:
        this.siemjPatterns = this.SecondSiemjPatterns;
        break;
      default:
        throw new XpException('Unknown SIEMJ version.');
    }
  }
  /**
   * Разбирает ошибки из вывода SIEMJ.
   * @param siemjOutput вывод SIEMJ.
   * @returns список локаций ошибок.
   */
  public async parse(siemjOutput: string): Promise<SiemjExecutionResult> {
    const result = new SiemjExecutionResult();
    this.processSectionsExitCode(siemjOutput, result);
    this.processBuildRules(siemjOutput, result);
    this.processBuildLocalization(siemjOutput, result);
    this.processTestRules(siemjOutput, result);

    // Корректировка диагностиков (выделение конкретных токенов) по анализу файлов с ошибками
    result.fileDiagnostics = await this.correctDiagnosticBeginCharRanges(result.fileDiagnostics);
    result.rawOutput = siemjOutput;
    return result;
  }

  /**
   * Проверяет возвращаемое значение от всех утилит SDK и Build Tools
   * @param siemjOutput
   * @param result
   */
  private processSectionsExitCode(siemjOutput: string, result: SiemjExecutionResult) {
    const pattern = this.siemjPatterns.exitCodeSection;
    let m: RegExpExecArray | null;
    while ((m = pattern.exec(siemjOutput))) {
      if (m.length != 2) {
        continue;
      }
      const exitCode = parseInt(m[1]);
      if (exitCode !== 0) {
        result.testsStatus = false;
        result.statusMessage = this.config.getMessage(`Error.CommonBuilding`);
        Log.error(`The utility returned an error code ${exitCode}`);
        return;
      }
    }

    result.testsStatus = true;
  }

  private processBuildRules(siemjOutput: string, result: SiemjExecutionResult) {
    const fileDiagnostics: FileDiagnostics[] = [];
    const pattern = this.siemjPatterns.buildRulesError;
    let m: RegExpExecArray | null;
    while ((m = pattern.exec(siemjOutput))) {
      if (m.length != 5) {
        continue;
      }

      if (!m?.[1] || !m?.[2] || !m?.[3] || !m?.[4]) {
        continue;
      }

      const ruleFilePath = (m[1] as string).trim();
      const fileLineNumber = parseInt(m[2]) - 1;
      const fileCharNumber = parseInt(m[3]);
      const errorDescription = (m[4] as string).trim();

      // Выделяем строку с начала, так как в выводе координаты только одного символа.
      const diagnostic = VsCodeApiHelper.createDiagnostic(
        fileLineNumber,
        0,
        fileLineNumber,
        fileCharNumber,
        errorDescription
      );

      if (errorDescription.includes('warning: ')) {
        diagnostic.severity = vscode.DiagnosticSeverity.Warning;
        diagnostic.message = diagnostic.message.replace('warning: ', '');
      } else {
        diagnostic.severity = vscode.DiagnosticSeverity.Error;
      }

      const fileUri = vscode.Uri.file(ruleFilePath);
      const ruleFileDiags = result.fileDiagnostics.find((rfd) => rfd.uri === fileUri);

      if (ruleFileDiags) {
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

  private processBuildLocalization(siemjOutput: string, result: SiemjExecutionResult) {
    const fileDiagnostics: FileDiagnostics[] = [];
    const pattern = this.siemjPatterns.buildLocalizationError;
    let m: RegExpExecArray | null;
    while ((m = pattern.exec(siemjOutput))) {
      if (m.length != 3) {
        continue;
      }

      if (!m?.[1] || !m?.[2]) {
        continue;
      }

      const errorDescription = (m[1] as string).trim();
      const filePath = (m[2] as string).trim();

      // В ошибке нет информации, где именно ошибка, указываем на начало файла.
      const diagnostic = VsCodeApiHelper.createDiagnostic(0, 0, 0, 0, errorDescription);
      diagnostic.severity = vscode.DiagnosticSeverity.Error;

      const newRuleFileDiag = this.addFileDiagnostics(result, filePath, diagnostic);
      fileDiagnostics.push(newRuleFileDiag);
    }

    result.fileDiagnostics.push(...fileDiagnostics);
  }

  private addFileDiagnostics(
    result: SiemjExecutionResult,
    filePath: string,
    diagnostic: vscode.Diagnostic
  ): FileDiagnostics {
    diagnostic.source = 'xp';
    const fileUri = vscode.Uri.file(filePath);
    const ruleFileDiags = result.fileDiagnostics.find((rfd) => rfd.uri === fileUri);

    if (ruleFileDiags) {
      // Файл был, добавляем в конец.
      ruleFileDiags.diagnostics.push(diagnostic);
      return;
    }

    // Такого файла еще не было, создаем и добавляем.
    const newRuleFileDiag = new FileDiagnostics();
    newRuleFileDiag.uri = fileUri;
    newRuleFileDiag.diagnostics.push(diagnostic);
    return newRuleFileDiag;
  }

  private processTestRules(siemjOutput: string, result: SiemjExecutionResult) {
    const runningTestRegExp = this.siemjPatterns.testRulesFound;
    if (!siemjOutput.match(runningTestRegExp)) {
      result.testsStatus = false;
      return;
    }

    // Количество тестов есть, парсим.
    let testCount: number;
    const collectedTestsResult = runningTestRegExp.exec(siemjOutput);
    if (collectedTestsResult && collectedTestsResult.length == 2) {
      const testCountString = collectedTestsResult[1];
      testCount = parseInt(testCountString);
    }

    result.testCount = testCount;

    // Все тесты прошли.
    if (this.siemjPatterns.testsSucceeded.exec(siemjOutput)) {
      result.testsStatus = true;
      return;
    }

    // Тесты не прошли, разбираем ошибки.
    result.testsStatus = false;

    // Не все прошли, значит есть ошибки.
    const failedTestRegExp = this.siemjPatterns.testRulesFail;

    let t: RegExpExecArray | null;
    while ((t = failedTestRegExp.exec(siemjOutput))) {
      if (t.length != 2) {
        continue;
      }

      const failedTestNumber = parseInt(t[1]);
      result.failedTestNumbers.push(failedTestNumber);
    }

    // Тесты не прошли, ошибок не нашлось, значит они все ошибочные.
    if (result.failedTestNumbers.length === 0) {
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
   * @param fileDiagnostics список диагностик для файлов.
   * @returns скорректированные диагностики.
   */
  private async correctDiagnosticBeginCharRanges(
    fileDiagnostics: FileDiagnostics[]
  ): Promise<FileDiagnostics[]> {
    for (const rfd of fileDiagnostics) {
      const ruleFilePath = rfd.uri.fsPath;
      if (!fs.existsSync(ruleFilePath)) {
        Log.warn(`The path to the file ${ruleFilePath} from the error does not exist`);
        continue;
      }

      const ruleContent = await FileSystemHelper.readContentFile(ruleFilePath);
      if (ruleContent) {
        rfd.diagnostics = TestHelper.correctWhitespaceCharacterFromErrorLines(
          ruleContent,
          rfd.diagnostics
        );
      }
    }

    return fileDiagnostics;
  }

  // private readonly TESTS_SUCCESS_SUBSTRING = 'All tests OK';
  // private readonly ERRORS_FOUND_SUBSTRING = 'TEST_RULES [Err] :: Errors found.';
}
