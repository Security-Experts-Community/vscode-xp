import { useMemo } from 'react';
import Tabs from '~/ui/tabs/tabs';
import { useEditor } from '../../store';
import DefaultsTable from './defaults-table';

function DefaultsTableEditor() {
  const { isDefaultsPtEditorValid, isDefaultsLocEditorValid } = useEditor();

  const tabsData = useMemo(
    () => [
      {
        id: 'PT',
        label: 'PT',
        isInvalid: !isDefaultsPtEditorValid,
        element: <DefaultsTable defaultsKey="PT" />
      },
      {
        id: 'LOC',
        label: 'LOC',
        isInvalid: !isDefaultsLocEditorValid,
        element: <DefaultsTable defaultsKey="LOC" />
      }
    ],
    [isDefaultsPtEditorValid, isDefaultsLocEditorValid]
  );

  return <Tabs data={tabsData} />;
}

export default DefaultsTableEditor;
