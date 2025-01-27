import { useTranslations } from '~/hooks/use-translations';
import { useActions, useEditor } from '../../store';
import CodeSection from '../code-section/code-section';

function ExpectationEditor() {
  const translations = useTranslations();
  const { ruleType, openedTest, openedTestIndex } = useEditor();
  const { updateTest } = useActions();

  return (
    <CodeSection
      title={translations.ConditionForPassingTheTest}
      language={ruleType == 'correlation' ? 'xp-test-code' : 'json'}
      code={openedTest.expectationData}
      setCode={(expectationData) => {
        updateTest(openedTestIndex, { expectationData });
      }}
    />
  );
}

export default ExpectationEditor;
