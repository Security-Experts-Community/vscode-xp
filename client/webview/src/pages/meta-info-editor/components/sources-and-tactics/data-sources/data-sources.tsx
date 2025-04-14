import { useTranslations } from '~/hooks/use-translations';
import Button from '~/ui/button/button';
import Label from '~/ui/label/label';
import SettingBox from '~/ui/setting-box/setting-box';
import { state, useEditor } from '../../../store';
import styles from '../sources-and-tactics.module.scss';
import DataSourcesRow from './data-sources-row';

function DataSources() {
  const translations = useTranslations();
  const { data, availableProviders } = useEditor();

  return (
    <SettingBox>
      <Label>{translations.DataSources}</Label>
      {Object.keys(data.dataSources).map((index) => (
        <DataSourcesRow key={index} index={+index} />
      ))}
      <Button
        className={styles.button}
        isDisabled={availableProviders.length === 0}
        onClick={() => {
          state.data.dataSources.push({
            Provider: availableProviders[0],
            EventID: []
          });
        }}
      >
        {translations.Add}
      </Button>
    </SettingBox>
  );
}

export default DataSources;
