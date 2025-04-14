import { useMemo } from 'react';
import { useTranslations } from '~/hooks/use-translations';
import Header from '~/ui/header/header';
import Tabs from '~/ui/tabs/tabs';
import { useEditor } from '../../store';
import Dependencies from '../dependencies/dependencies';
import GeneralSettings from '../general-settings/general-settings';
import Metadata from '../metadata/metadata';
import SaveButton from '../save-button/save-button';
import SourcesAndTactics from '../sources-and-tactics/sources-and-tactics';
import styles from './editor.module.scss';

function Editor() {
  const {
    isGeneralEditorValid,
    data: { dependencies }
  } = useEditor();
  const translations = useTranslations();

  const tabsData = useMemo(
    () => {
      const tabs = [
        {
          id: 'general',
          label: translations.GeneralTab,
          element: <GeneralSettings />,
          isInvalid: !isGeneralEditorValid
        },
        {
          id: 'sources-and-tactics',
          label: translations.SourcesAndTacticsTab,
          element: <SourcesAndTactics />
        }
      ];

      if (dependencies) {
        tabs.push({
          id: 'dependencies',
          label: translations.DependenciesTab,
          element: <Dependencies />
        });
      }

      return tabs;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [dependencies, isGeneralEditorValid]
  );

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <Header title={translations.EditorTitle}>
          <div className={styles.controls}>
            <SaveButton />
          </div>
          <Metadata className={styles.metadata} />
        </Header>
      </div>
      <div className={styles.content}>
        <Tabs data={tabsData} />
      </div>
    </div>
  );
}

export default Editor;
