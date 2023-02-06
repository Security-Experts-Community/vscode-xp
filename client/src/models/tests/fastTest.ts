import { CorrelationUnitTest } from './correlationUnitTest';

export class FastTest extends CorrelationUnitTest {

	public getTestPath() {
		return this._testFilePath;
	}

	public setTestPath(testFilePath : string) : void {
		this._testFilePath = testFilePath;
	}

	private _testFilePath : string;
}