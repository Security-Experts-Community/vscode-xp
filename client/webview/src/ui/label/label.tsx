import clsx from 'clsx';
import { forwardRef, PropsWithChildren } from 'react';
import styles from './label.module.scss';

interface LabelProps extends PropsWithChildren {
  isRequired?: boolean;
}

const Label = forwardRef<HTMLDivElement, LabelProps>(({ children, isRequired }, ref) => {
  return (
    <div ref={ref} className={clsx(styles.root, isRequired && styles.isRequired)}>
      <div className={styles.content}>{children}</div>
    </div>
  );
});

export default Label;
