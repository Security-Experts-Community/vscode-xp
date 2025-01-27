import { RuleType } from './common';

export type UnitTestsDto = {
  ruleType: RuleType;
  ruleData: string;
  tests: UnitTest[];
  defaultInputData: string;
  defaultExpectationData: string;
};

export type UnitTest = {
  testNumber?: number;
  status: 'Unknown' | 'Success' | 'Failed';
  inputData: string;
  expectationData: string;
  actualData: string;
};
