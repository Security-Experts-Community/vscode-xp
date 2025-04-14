import { useCallback, useState } from 'react';
import { useMessage } from '~/hooks/use-message';
import Editor from './components/editor/editor';
import { useActions } from './store';

function MetaInfoEditor() {
  const [isDataReady, setIsDataReady] = useState(false);
  const { setAuthor, setData } = useActions();

  useMessage(
    useCallback((message) => {
      switch (message.command) {
        case 'MetaInfoEditor.setState':
          const { author, metaInfo } = message.payload;
          setAuthor(author);
          setData(metaInfo);
          setIsDataReady(true);
          break;
      }
    }, []) // eslint-disable-line react-hooks/exhaustive-deps
  );

  return isDataReady && <Editor />;
}

export default MetaInfoEditor;
