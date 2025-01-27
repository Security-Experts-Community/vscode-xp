import EditorHeader from '../editor-header/editor-header';
import TestEditors from '../test-editors/test-editors';
import TestsControlPanel from '../tests-control-panel/tests-control-panel';
import styles from './editor.module.scss';

function Editor() {
  return (
    <div className={styles.root}>
      <EditorHeader />
      <TestsControlPanel />
      <div className={styles.content}>
        <TestEditors />
      </div>
    </div>
  );
}

export default Editor;
