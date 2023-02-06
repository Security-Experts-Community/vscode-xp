import * as vscode from "vscode";
import * as path from "path";

import { ExtensionHelper } from '../../helpers/extensionHelper';
import { TestStatus } from './testStatus';

export abstract class BaseUnitTest extends vscode.TreeItem {

	public abstract getTestPath() : string;

	public abstract save(testsDirFullPath?: string) : Promise<void>;

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

	public getRuleFullPath(): string {
		if(!this._ruleDirectoryPath) {
			throw new Error("Путь к директории правила не задан.");
		}

		if(!this._ruleFileName) {
			throw new Error("Имя файла правила не задано.");
		}

		return path.join(this._ruleDirectoryPath, this._ruleFileName);
	}

	public getTestsDirPath() : string {
		return path.join(this.getRuleDirectoryPath(), "tests");
	}

	public setRuleDirectoryPath(ruleDirectoryPath: string) {
		this._ruleDirectoryPath = ruleDirectoryPath;
	}

	public getRuleDirectoryPath() {
		return this._ruleDirectoryPath;
	}

	public setRuleFileName(ruleFileName: string) {
		this._ruleFileName = ruleFileName;
	}

	public setTestCode(testCode: string) {
		this._testCode = testCode;
	}

	public getTestCode() : string {
		return this._testCode;
	}

	public setStatus(status: TestStatus) : void {

		this._status = status;

		switch (this._status) {
			case TestStatus.Unknown: {
				this.iconPath = {
					light: path.join(ExtensionHelper.getExtentionPath(), 'resources', 'light', 'document.svg'),
					dark: path.join(ExtensionHelper.getExtentionPath(), 'resources', 'dark', 'document.svg')
				};
				return;
			}

			case TestStatus.Success: {
				this.iconPath = {
					light: path.join(ExtensionHelper.getExtentionPath(), 'resources', 'light', 'success.svg'),
					dark: path.join(ExtensionHelper.getExtentionPath(), 'resources', 'dark', 'success.svg')
				};
				return;
			}

			case TestStatus.Failed: {
				this.iconPath = {
						light: path.join(ExtensionHelper.getExtentionPath(), 'resources', 'light', 'failed.svg'),
						dark: path.join(ExtensionHelper.getExtentionPath(), 'resources', 'dark', 'failed.svg')
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

	private _number: number;
	private _ruleDirectoryPath : string;
	private _ruleFileName : string;
	private _testCode : string;

	private _output : string;
	private _status : TestStatus;
}