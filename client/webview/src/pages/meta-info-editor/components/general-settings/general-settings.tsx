import { memo } from 'react';
import { useTranslations } from '~/hooks/use-translations';
import Subheader from '~/ui/subheader/subheader';
import SettingsGroup from './general-settings-group';
import styles from './general-settings.module.scss';

function GeneralSettings() {
  const translations = useTranslations();

  return (
    <div className={styles.root}>
      <div className={styles.content}>
        <Subheader>{translations.GeneralTab}</Subheader>
        <SettingsGroup title={translations.KnowledgeHolders} dataField="knowledgeHolders" />
        <SettingsGroup title={translations.Falsepositives} dataField="falsepositives" isMultiline />
        <SettingsGroup title={translations.Improvements} dataField="improvements" isMultiline />
        <SettingsGroup title={translations.References} dataField="references" />
        <SettingsGroup title={translations.Usecases} dataField="usecases" isMultiline />
      </div>
    </div>
  );
}

export default memo(GeneralSettings);
