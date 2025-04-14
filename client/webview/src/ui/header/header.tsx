import clsx from 'clsx';
import Tooltip from '../tooltip/tooltip';
import styles from './header.module.scss';

interface HeaderProps extends React.PropsWithChildren {
  className?: string;
  title: React.ReactNode;
}

function Header({ className, title, children }: HeaderProps) {
  return (
    <header className={clsx(styles.root, className)}>
      <Tooltip title={title} position="bottom">
        <h1>{title}</h1>
      </Tooltip>
      {children}
    </header>
  );
}

export default Header;
