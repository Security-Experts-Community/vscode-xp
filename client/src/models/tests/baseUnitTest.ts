import * as vscode from "vscode";
import * as path from "path";

import { TestStatus } from './testStatus';
import { Configuration } from '../configuration';
import { RuleBaseItem } from '../content/ruleBaseItem';

export abstract class BaseUnitTest extends vscode.TreeItem {
	public abstract getDefaultInputData(): string;
	public abstract getDefaultExpectation(): string;

	public abstract save() : Promise<void>;

	constructor(number: number) {
		super(number.toString());
		this.setNumber(number);
		this.setStatus(TestStatus.Unknown);
	}

	public setNumber(number: number) {
		this._number = number;
		this.label = number.toString();
	}

	public getNumber() {
		return this._number;
	}

	public setCommand(command: any): void {
		this.command = command;
	}

	public getRuleFullPath(): string {
		return this._rule.getFilePath();
	}

	public getTestsDirPath() : string {
		return path.join(this.getRuleDirectoryPath(), "tests");
	}

	public abstract getTestExpectationPath() : string;

	public abstract getTestInputDataPath() : string;

	public getRuleDirectoryPath() {
		return this._rule.getDirectoryPath();
	}

	public setTestExpectation(testExpectation: string) {
		this._testExpectation = testExpectation;
	}

	public getTestExpectation() : string {
		return this._testExpectation;
	}

	public getActualEvent() : string {
		return this._actualEvent;
	}

	public setActualEvent(actualEvent: string) : void {
		this._actualEvent = actualEvent;
	}

	public setStatus(status: TestStatus) : void {

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

	public getStatus() : TestStatus {
		return this._status;
	}

	public setOutput(output: string) {
		this._output = output;
	}

	public getOutput() {
		return this._output;
	}

	public setTestInputData(inputData : string) : void {
		this._inputData = inputData;
	}

	public getTestInputData() : string {
		return this._inputData;
	}

	public setRule(rule: RuleBaseItem){
		this._rule = rule;
	}

	public getRule(): RuleBaseItem{
		return this._rule;
	}

	protected _rule : RuleBaseItem;

	private _number: number;

	private _testExpectation : string;
	private _actualEvent : string;

	private _inputData : string;

	private _output : string;
	private _status : TestStatus;
}