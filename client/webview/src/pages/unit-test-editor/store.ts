import { proxy, useSnapshot } from 'valtio';
import { RuleType, UnitTest } from '~/types';

export type State = {
  ruleType: RuleType;
  ruleData: string;
  defaultInputData: string;
  defaultExpectationData: string;
  tests: UnitTest[];
  openedTestNumber: number;
  openedTestIndex: number;
  openedTest: UnitTest;
  isEditorValid: boolean;
};

export const state = proxy<State>({
  ruleType: 'correlation',
  ruleData: '',
  defaultInputData: '',
  defaultExpectationData: '',
  tests: [],
  openedTestIndex: 0,
  get openedTestNumber(): number {
    return state.openedTestIndex + 1;
  },
  get openedTest(): UnitTest {
    return state.tests[state.openedTestIndex];
  },
  get isEditorValid(): boolean {
    return state.tests.every((test) => !!test.inputData);
  }
});

export const actions = {
  setData(tests: UnitTest[]) {
    state.tests = tests;

    if (state.tests.length == 0) {
      actions.addTest();
    }
  },

  setRuleType(ruleType: RuleType) {
    state.ruleType = ruleType;
  },

  setRuleData(ruleData: string) {
    state.ruleData = ruleData;
  },

  setDefaultInputData(defaultInputData: string) {
    state.defaultInputData = defaultInputData;
  },

  setDefaultExpectationData(defaultExpectationData: string) {
    state.defaultExpectationData = defaultExpectationData;
  },

  openTest(testIndex: number) {
    state.openedTestIndex = testIndex;
  },

  addTest() {
    state.tests.push(generateTest());
  },

  updateTest(testIndex: number, test: Partial<UnitTest>) {
    Object.assign(state.tests[testIndex], test);
  },

  deleteTest(testIndex: number) {
    state.tests.splice(testIndex, 1);
    if (state.openedTestIndex >= state.tests.length) {
      state.openedTestIndex = state.tests.length - 1;
    }
  }
};

const generateTest = (): UnitTest => ({
  status: 'Unknown',
  inputData: state.defaultInputData,
  expectationData: state.defaultExpectationData,
  actualData: ''
});

export const useActions = () => actions;
export const useEditor = () => useSnapshot(state);
