import clsx from 'clsx';
import { useTranslations } from '~/hooks/use-translations';
import { UnitTest } from '~/types';
import ActionButton from '~/ui/action-button/action-button';
import Icon from '~/ui/icon/icon';
import Tooltip from '~/ui/tooltip/tooltip';
import { useActions, useEditor } from '../../store';
import styles from './test-control-item.module.scss';

interface TestControlItemProps {
  test: UnitTest;
  testIndex: number;
}

function TestControlItem({ test, testIndex }: TestControlItemProps) {
  const translations = useTranslations();
  const { openedTestIndex } = useEditor();
  const { openTest, deleteTest } = useActions();
  const isTestPassed = test.status == 'Success';
  const isTestFailed = test.status == 'Failed';

  const handleTestOpen = () => {
    openTest(testIndex);
  };

  const handleTestDelete = (e: React.MouseEvent) => {
    deleteTest(testIndex);
    e.stopPropagation();
  };

  return (
    <div
      key={testIndex}
      className={clsx(styles.root, {
        [styles.isSelected]: testIndex === openedTestIndex,
        [styles.isSuccess]: isTestPassed,
        [styles.isFailed]: isTestFailed
      })}
      onClick={handleTestOpen}
    >
      {(isTestPassed || isTestFailed) && (
        <span className={styles.icon}>
          <Tooltip
            title={isTestPassed ? translations.TestPassed : translations.TestFailed}
            variant={isTestPassed ? 'info' : 'error'}
          >
            <Icon id={isTestPassed ? 'pass-filled' : 'error'} size={16} />
          </Tooltip>
        </span>
      )}
      <span className={styles.label}>Test #{testIndex + 1}</span>
      <div className={styles.controls}>
        <Tooltip title={translations.DeleteTest} position="top">
          <ActionButton iconId="trash" size={14} onClick={handleTestDelete} />
        </Tooltip>
      </div>
    </div>
  );
}

export default TestControlItem;
