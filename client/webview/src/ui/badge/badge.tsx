import clsx from 'clsx';
import { ComponentPropsWithoutRef, forwardRef } from 'react';
import styles from './badge.module.scss';

interface BadgeProps extends ComponentPropsWithoutRef<'span'> {
  isCounter?: boolean;
}

const Badge = forwardRef<HTMLSpanElement, BadgeProps>(({ children, className, isCounter }, ref) => (
  <span ref={ref} className={clsx(styles.root, className, isCounter && styles.isCounter)}>
    {children}
  </span>
));

export default Badge;
