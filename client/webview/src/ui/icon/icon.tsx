import clsx from 'clsx';
import { forwardRef } from 'react';
import styles from './icon.module.scss';

interface IconProps {
  className?: string;
  id: string;
  size?: number;
}

const Icon = forwardRef<HTMLSpanElement, IconProps>(({ className = '', id, size }, ref) => {
  return (
    <span
      ref={ref}
      className={clsx(styles.root, 'codicon', `codicon-${id}`, className)}
      style={{ fontSize: size ? `${size}px` : '' }}
    />
  );
});

export default Icon;
