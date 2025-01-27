import ExpectationEditor from '../expectation-editor/expectation-editor';
import InputEditor from '../input-editor/input-editor';
import ResultEditor from '../result-editor/result-editor';
import styles from './test-editors.module.scss';

/* For the rule code at the left side of the editor: */
// import RuleEditor from '../rule-editor/rule-editor';

function TestEditors() {
  return (
    <div className={styles.root}>
      <section className={styles.section}>
        <InputEditor />
      </section>
      <section className={styles.section}>
        <ExpectationEditor />
        <ResultEditor />
      </section>
    </div>
    /* For the rule code at the left side of the editor: */
    // <div className={styles.root}>
    //   <section className={styles.section}>
    //     <RuleEditor />
    //   </section>
    //   <section className={styles.verticalSection}>
    //     <InputEditor />
    //     <ExpectationEditor />
    //     <ResultEditor />
    //   </section>
    // </div>
  );
}

export default TestEditors;
