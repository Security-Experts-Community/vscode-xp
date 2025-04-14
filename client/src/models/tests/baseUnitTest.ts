import * as vscode from 'vscode';
import * as path from 'path';

import { TestStatus } from './testStatus';
import { Configuration } from '../configuration';
import { RuleBaseItem } from '../content/ruleBaseItem';

export abstract class BaseUnitTest extends vscode.TreeItem {
  public abstract getDefaultInputData(): string;
  public abstract getDefaultExpectation(): string;

  public abstract save(): Promise<void>;

  constructor(number: number) {
    super(number.toString());
    this.setNumber(number);
    this.setStatus(TestStatus.Unknown);
  }

  public setNumber(number: number): void {
    this._number = number;
    this.label = number.toString();
  }

  public getNumber(): number {
    return this._number;
  }

  public setCommand(command: vscode.Command): void {
    this.command = command;
  }

  public getRuleFullPath(): string {
    return this._rule.getFilePath();
  }

  public getTestsDirPath(): string {
    return path.join(this.getRuleDirectoryPath(), RuleBaseItem.TESTS_DIRNAME);
  }

  public abstract getTestExpectationPath(): string;

  public abstract getTestInputDataPath(): string;

  public getRuleDirectoryPath(): string {
    return this._rule.getDirectoryPath();
  }

  public setTestExpectation(testExpectation: string): void {
    this.testExpectation = testExpectation;
  }

  public getTestExpectation(): string {
    return this.testExpectation;
  }

  public getActualData(): string {
    return this._actualEvent;
  }

  public setActualEvent(actualEvent: string): void {
    this._actualEvent = actualEvent;
  }

  public setStatus(status: TestStatus): void {
    this._status = status;
    const config = Configuration.get();
    const extensionResources = path.join(config.getExtensionPath(), 'resources');

    switch (this._status) {
      case TestStatus.Unknown: {
        this.iconPath = new vscode.ThemeIcon('circle-large-outline');
        return;
      }

      case TestStatus.Success: {
        const iconPath = path.join(extensionResources, 'test-passed.svg');
        this.iconPath = { light: iconPath, dark: iconPath };
        return;
      }

      case TestStatus.Failed: {
        const iconPath = path.join(extensionResources, 'test-failed.svg');
        this.iconPath = { light: iconPath, dark: iconPath };
        return;
      }
    }
  }

  public getStatus(): TestStatus {
    return this._status;
  }

  public setOutput(output: string): void {
    this._output = output;
  }

  public getOutput(): string {
    return this._output;
  }

  public setTestInputData(inputData: string): void {
    this._inputData = inputData;
  }

  public getTestInputData(): string {
    return this._inputData;
  }

  public setRule(rule: RuleBaseItem): void {
    this._rule = rule;
  }

  public getRule(): RuleBaseItem {
    return this._rule;
  }

  public static UNIT_TEST_NEWLINE_SYMBOL = '\n';

  protected _rule: RuleBaseItem;

  private _number: number;

  private testExpectation: string;
  private _actualEvent: string;

  private _inputData: string;

  private _output: string;
  private _status: TestStatus;
}
