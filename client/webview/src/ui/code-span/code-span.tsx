import { PropsWithChildren } from 'react';
import styles from './code-span.module.scss';

function CodeSpan({ children }: PropsWithChildren) {
  return <code className={styles.root}>{children}</code>;
}
export default CodeSpan;
