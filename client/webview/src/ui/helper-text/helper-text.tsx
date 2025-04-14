import { ComponentPropsWithoutRef } from 'react';
import styles from './helper-text.module.scss';

function HelperText({ children }: ComponentPropsWithoutRef<'span'>) {
  return <span className={styles.root}>{children}</span>;
}

export default HelperText;
