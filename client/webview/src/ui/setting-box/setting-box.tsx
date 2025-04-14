import clsx from 'clsx';
import { ComponentPropsWithoutRef, forwardRef } from 'react';
import styles from './setting-box.module.scss';

const SettingBox = forwardRef<HTMLDivElement, ComponentPropsWithoutRef<'div'>>(
  ({ children, className }, ref) => (
    <div ref={ref} className={clsx(styles.root, className)}>
      {children}
    </div>
  )
);

export default SettingBox;
