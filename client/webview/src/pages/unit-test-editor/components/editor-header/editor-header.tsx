import { memo } from 'react';
import { usePostMessage } from '~/hooks/use-post-message';
import { useTranslations } from '~/hooks/use-translations';
import Button from '~/ui/button/button';
import Header from '~/ui/header/header';
import Icon from '~/ui/icon/icon';
import { useEditor } from '../../store';
import styles from './editor-header.module.scss';

function EditorHeader() {
  const translations = useTranslations();
  const postMessage = usePostMessage();
  const { tests, openedTestNumber } = useEditor();

  const handleRunTest = () => {
    postMessage({
      command: 'UnitTestEditor.runTest',
      payload: {
        testNumber: openedTestNumber,
        tests: JSON.parse(JSON.stringify(tests))
      }
    });
  };

  const handleUpdateExpectation = () => {
    postMessage({
      command: 'UnitTestEditor.updateExpectation',
      payload: {
        testNumber: openedTestNumber
      }
    });
  };

  const handleRunAllTests = () => {
    postMessage({
      command: 'UnitTestEditor.runAllTests',
      payload: {
        tests: JSON.parse(JSON.stringify(tests))
      }
    });
  };
  const handleSaveAllTests = () => {
    postMessage({
      command: 'UnitTestEditor.saveAllTests',
      payload: {
        tests: JSON.parse(JSON.stringify(tests))
      }
    });
  };

  return (
    <Header className={styles.root} title={translations.EditorTitle}>
      <div className={styles.controls}>
        <Button onClick={handleRunTest}>
          <Icon id="play" size={12} />
          {translations.RunTest} #{openedTestNumber}
        </Button>
        <Button variant="secondary" onClick={handleUpdateExpectation}>
          {translations.ReplaceExpectedEventWithActual} #{openedTestNumber}
        </Button>
      </div>
      <div className={styles.controls}>
        <Button onClick={handleSaveAllTests}>
          <Icon id="save" size={12} />
          {translations.SaveAll}
        </Button>
        <Button onClick={handleRunAllTests}>
          <Icon id="play" size={12} />
          {translations.RunAll}
        </Button>
      </div>
    </Header>
  );
}

export default memo(EditorHeader);
