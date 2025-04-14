import * as vscode from 'vscode';

export interface UnitTestOutputParser {
  parseFailedOutput(output: string, expectation: string): string;
  parseSuccessOutput(output: string): string;
  /**
   * Разбирает ошибки из вывода модульных тестов.
   * @param testOutput вывод модульных тестов.
   * @returns список локаций ошибок.
   */
  parse(testOutput: string): vscode.Diagnostic[];
}
