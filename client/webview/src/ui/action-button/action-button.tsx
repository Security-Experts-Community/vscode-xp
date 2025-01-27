import clsx from 'clsx';
import { ComponentPropsWithoutRef, forwardRef } from 'react';
import Icon from '../icon/icon';
import styles from './action-button.module.scss';

interface ActionButtonProps extends ComponentPropsWithoutRef<'button'> {
  iconId: string;
  className?: string;
  size?: number;
  isDisabled?: boolean;
  onClick?(e: React.MouseEvent): void;
}

const ActionButton = forwardRef<HTMLButtonElement, ActionButtonProps>(
  ({ className, iconId, size, isDisabled, onClick }, ref) => (
    <button
      ref={ref}
      className={clsx(styles.root, className, isDisabled && styles.isDisabled)}
      tabIndex={-1}
      onClick={isDisabled ? undefined : onClick}
    >
      <Icon id={iconId} size={size} />
    </button>
  )
);

export default ActionButton;
