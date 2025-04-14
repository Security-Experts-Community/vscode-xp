import { useTranslations } from '~/hooks/use-translations';
import ActionButton from '~/ui/action-button/action-button';
import Tooltip from '~/ui/tooltip/tooltip';
import { useActions, useEditor } from '../../store';
import TestControlItem from './test-control-item';
import styles from './tests-control-panel.module.scss';

function TestsControlPanel() {
  const translations = useTranslations();
  const { tests } = useEditor();
  const { addTest, openTest } = useActions();

  const handleTestAdd = () => {
    addTest();
    openTest(tests.length);
  };

  return (
    <div className={styles.root}>
      <div className={styles.tests}>
        {tests.map((test, index) => (
          <TestControlItem key={index} test={test} testIndex={index} />
        ))}
      </div>
      <Tooltip title={translations.AddTest} position="top">
        <ActionButton
          className={styles.addTestButton}
          iconId="add"
          size={14}
          onClick={handleTestAdd}
        />
      </Tooltip>
    </div>
  );
}

export default TestsControlPanel;
