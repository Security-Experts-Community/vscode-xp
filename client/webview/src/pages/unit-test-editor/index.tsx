import { useCallback, useState } from 'react';
import { useMessage } from '~/hooks/use-message';
import Editor from './components/editor/editor';
import { useActions } from './store';

function UnitTestEditor() {
  const [isDataReady, setIsDataReady] = useState(false);
  const {
    setData,
    setRuleType,
    setRuleData,
    setDefaultInputData,
    setDefaultExpectationData,
    updateTest
  } = useActions();

  useMessage(
    useCallback((message) => {
      switch (message.command) {
        case 'UnitTestEditor.setState':
          setData(message.payload.tests);
          setRuleType(message.payload.ruleType);
          setRuleData(message.payload.ruleData);
          setDefaultInputData(message.payload.defaultInputData);
          setDefaultExpectationData(message.payload.defaultExpectationData);
          setIsDataReady(true);
          break;

        case 'UnitTestEditor.updateTest':
          updateTest(message.payload.testNumber - 1, message.payload);
          break;
      }
    }, []) // eslint-disable-line react-hooks/exhaustive-deps
  );

  return isDataReady && <Editor />;
}

export default UnitTestEditor;
