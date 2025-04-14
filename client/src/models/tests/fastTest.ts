import { CorrelationUnitTest } from './correlationUnitTest';

export class FastTest extends CorrelationUnitTest {
  constructor(testNumber: number) {
    super(testNumber);
  }

  public getTestExpectationPath() {
    return this._testFilePath;
  }

  public setTestExpectationPath(testFilePath: string): void {
    this._testFilePath = testFilePath;
  }

  private _testFilePath: string;
}
