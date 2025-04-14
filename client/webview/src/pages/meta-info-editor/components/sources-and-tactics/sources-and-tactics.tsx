import { useEffect } from 'react';
import { useTranslations } from '~/hooks/use-translations';
import Subheader from '~/ui/subheader/subheader';
import { useActions, useEditor } from '../../store';
import Attacks from './attacks/attacks';
import DataSources from './data-sources/data-sources';
import styles from './sources-and-tactics.module.scss';

function SourcesAndTactics() {
  const translations = useTranslations();
  const { isMitreAttackDataLoaded } = useEditor();
  const { fetchMitreAttackData } = useActions();

  useEffect(() => {
    if (!isMitreAttackDataLoaded) {
      fetchMitreAttackData();
    }
  }, [isMitreAttackDataLoaded, fetchMitreAttackData]);

  if (!isMitreAttackDataLoaded) {
    return null;
  }

  return (
    <div className={styles.root}>
      <div className={styles.content}>
        <Subheader>{translations.SourcesAndTacticsTab}</Subheader>
        <DataSources />
        <Attacks />
      </div>
    </div>
  );
}

export default SourcesAndTactics;
