import { memo, useMemo } from 'react';
import { useTranslations } from '~/hooks/use-translations';
import Header from '~/ui/header/header';
import Tabs from '~/ui/tabs/tabs';
import { useEditor } from '../../store';
import ColumnsTable from '../columns-table/columns-table';
import DefaultsTableEditor from '../defaults-table/defaults-table-editor';
import GeneralSettings from '../general-settings/general-settings';
import SaveButton from '../save-button/save-button';
import styles from './editor.module.scss';

function Editor() {
  const {
    data: { fillType },
    isGeneralEditorValid,
    isColumnsEditorValid,
    isDefaultsEditorValid
  } = useEditor();
  const translations = useTranslations();
  const isRegistry = fillType == 'Registry';

  const tabsData = useMemo(
    () => [
      {
        id: 'general',
        label: translations.GeneralTab,
        element: <GeneralSettings />,
        isInvalid: !isGeneralEditorValid
      },
      {
        id: 'columns-editor',
        label: translations.ColumnsTab,
        element: <ColumnsTable />,
        isInvalid: !isColumnsEditorValid
      },
      {
        id: 'defaults-editor',
        label: translations.DefaultValuesTab,
        element: <DefaultsTableEditor />,
        isInvalid: !isDefaultsEditorValid,
        isDisabled: !isRegistry || !isColumnsEditorValid
      }
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isGeneralEditorValid, isColumnsEditorValid, isDefaultsEditorValid, isRegistry]
  );

  return (
    <div className={styles.root}>
      <Header title={translations.EditorTitle}>
        <SaveButton />
      </Header>
      <div className={styles.editor}>
        <Tabs data={tabsData} />
      </div>
    </div>
  );
}

export default memo(Editor);
