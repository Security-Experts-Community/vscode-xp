import { useCallback, useState } from 'react';
import { useMessage } from '~/hooks/use-message';
import Editor from './components/editor/editor';
import { useActions } from './store';

function TableListEditor() {
  const [isDataReady, setIsDataReady] = useState(false);
  const { setData } = useActions();

  useMessage(
    useCallback((message) => {
      switch (message.command) {
        case 'TableListEditor.setState':
          setData(message.payload);
          setIsDataReady(true);
          break;
      }
    }, []) // eslint-disable-line react-hooks/exhaustive-deps
  );

  return isDataReady && <Editor />;
}

export default TableListEditor;
