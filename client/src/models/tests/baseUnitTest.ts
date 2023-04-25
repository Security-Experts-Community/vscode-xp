import * as vscode from "vscode";
import * as path from "path";

import { TestStatus } from './testStatus';
import { Configuration } from '../configuration';
import { RuleBaseItem } from '../content/ruleBaseItem';
import { FileSystemHelper } from '../../helpers/fileSystemHelper';

export abstract class BaseUnitTest extends vscode.TreeItem {

	public abstract save() : Promise<void>;
	// public abstract show() : Promise<void>;
	// public abstract close(): Promise<void>;

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

	public setStatus(status: TestStatus) : void {

		this._status = status;
		const config = Configuration.get();
		const extenstionResources = path.join(config.getExtensionPath(), 'resources');

		switch (this._status) {
			case TestStatus.Unknown: {
				this.iconPath = {
					light: path.join(extenstionResources, 'light', 'document.svg'),
					dark: path.join(extenstionResources, 'resources', 'dark', 'document.svg')
				};
				return;
			}

			case TestStatus.Success: {
				this.iconPath = {
					light: path.join(extenstionResources, 'light', 'success.svg'),
					dark: path.join(extenstionResources, 'dark', 'success.svg')
				};
				return;
			}

			case TestStatus.Failed: {
				this.iconPath = {
						light: path.join(extenstionResources, 'light', 'failed.svg'),
						dark: path.join(extenstionResources, 'dark', 'failed.svg')
				};
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
	private _inputData : string;

	private _output : string;
	private _status : TestStatus;
}