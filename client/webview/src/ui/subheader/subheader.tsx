import { PropsWithChildren } from 'react';
import styles from './subheader.module.scss';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface SubheaderProps extends PropsWithChildren {}

function Subheader({ children }: SubheaderProps) {
  return <h2 className={styles.root}>{children}</h2>;
}

export default Subheader;
