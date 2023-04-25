import { BaseUnitTest } from './baseUnitTest';

export interface UnitTestRunner {
	run(test: BaseUnitTest): Promise<BaseUnitTest>;
}
