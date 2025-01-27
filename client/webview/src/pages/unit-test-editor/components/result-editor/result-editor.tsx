import { useTranslations } from '~/hooks/use-translations';
import { useActions, useEditor } from '../../store';
import CodeSection from '../code-section/code-section';

function ResultEditor() {
  const translations = useTranslations();
  const { openedTest, openedTestIndex } = useEditor();
  const { updateTest } = useActions();

  return (
    <CodeSection
      readOnly
      language="json"
      title={translations.ActualResult}
      code={openedTest.actualData}
      setCode={(actualData) => {
        updateTest(openedTestIndex, { actualData });
      }}
    />
  );
}

export default ResultEditor;
