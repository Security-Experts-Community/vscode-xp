import { memo } from 'react';
import { useTranslations } from '~/hooks/use-translations';
import Subheader from '~/ui/subheader/subheader';
import TableDescription from '../table-description/table-description';
import TableFillType from '../table-fill-type/table-fill-type';
import TableName from '../table-name/table-name';
import styles from './general-settings.module.scss';

function GeneralSettings() {
  const translations = useTranslations();

  return (
    <div className={styles.root}>
      <div className={styles.content}>
        <Subheader>{translations.GeneralTab}</Subheader>
        <TableName />
        <TableDescription language="ru" />
        <TableDescription language="en" />
        <TableFillType />
      </div>
    </div>
  );
}

export default memo(GeneralSettings);
