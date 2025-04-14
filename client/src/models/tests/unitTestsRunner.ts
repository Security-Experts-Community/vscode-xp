import { BaseUnitTest } from './baseUnitTest';

export class UnitTestOptions {
  useAppendix?: boolean = false;
}

export interface UnitTestRunner {
  run(unitTest: BaseUnitTest, options?: UnitTestOptions): Promise<BaseUnitTest>;
}
