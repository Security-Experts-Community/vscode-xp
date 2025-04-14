import { VscodeButton } from '@vscode-elements/react-elements';
import clsx from 'clsx';
import styles from './button.module.scss';

interface ButtonProps extends React.PropsWithChildren {
  className?: string;
  variant?: 'primary' | 'secondary';
  isDisabled?: boolean;
  onClick?(): void;
}

function Button({ children, className, variant = 'primary', isDisabled, onClick }: ButtonProps) {
  const isSecondary = variant == 'secondary';

  return (
    <VscodeButton
      className={clsx(styles.root, className)}
      secondary={isSecondary}
      disabled={isDisabled}
      onClick={isDisabled ? undefined : onClick}
    >
      {children}
    </VscodeButton>
  );
}

export default Button;
