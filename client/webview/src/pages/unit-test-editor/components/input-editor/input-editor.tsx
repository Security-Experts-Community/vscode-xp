import { useTranslations } from '~/hooks/use-translations';
import { useActions, useEditor } from '../../store';
import CodeSection from '../code-section/code-section';

function InputEditor() {
  const translations = useTranslations();
  const { ruleType, openedTest, openedTestIndex } = useEditor();
  const { updateTest } = useActions();

  return (
    <CodeSection
      title={
        ruleType == 'correlation'
          ? translations.CorrelationRawEvents
          : translations.NormalizationRawEvents
      }
      language="json-lines"
      code={openedTest.inputData}
      setCode={(inputData) => {
        updateTest(openedTestIndex, { inputData });
      }}
    />
  );
}

export default InputEditor;
