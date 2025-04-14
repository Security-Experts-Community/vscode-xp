import clsx from 'clsx';
import { memo } from 'react';
import { useTranslations } from '~/hooks/use-translations';
import { useEditor } from '../../store';
import styles from './metadata.module.scss';

interface MetadataProps {
  className?: string;
}

function Metadata({ className }: MetadataProps) {
  const translations = useTranslations();
  const { data } = useEditor();

  return (
    <div className={clsx(styles.root, className)}>
      {[
        [translations.Created, data.createdAt],
        [translations.Updated, data.updatedAt],
        [translations.Id, data.objectId]
      ].map(([label, value], i) => (
        <div key={i} className={styles.item}>
          <span>{label}:</span> <span>{value}</span>
        </div>
      ))}
    </div>
  );
}

export default memo(Metadata);
