import clsx from 'clsx';
import { forwardRef } from 'react';
import ActionButton from '~/ui/action-button/action-button';
import styles from './interactive-item.module.scss';

interface CodeItemProps {
  label: string;
  link?: string;
  isDeprecated?: boolean;
  onRemove?(): void;
}

const InteractiveItem = forwardRef<HTMLDivElement, CodeItemProps>(
  ({ label, link, isDeprecated, onRemove }, ref) => {
    return (
      <div ref={ref} key={label} className={clsx(styles.root, !!link && styles.withLink)}>
        {!!link && (
          <a className={styles.link} href={link} rel="noreferrer noopener" target="_blank">
            <ActionButton iconId="link-external" />
          </a>
        )}
        <span className={styles.label}>{label}</span>
        {isDeprecated && <span className={styles.deprecatedMessage}>[deprecated]</span>}
        {onRemove && (
          <ActionButton className={styles.deleteButton} iconId="close" onClick={onRemove} />
        )}
      </div>
    );
  }
);

export default InteractiveItem;
