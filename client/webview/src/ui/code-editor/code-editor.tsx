import MonacoEditor, { loader, type Monaco } from '@monaco-editor/react';
import { editor } from 'monaco-editor';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useTheme } from '~/hooks/use-theme';
import { Language } from '~/types';
import styles from './code-editor.module.scss';
import {
  createMonacoThemeFromCSSVariables,
  getMonacoThemeByVSCodeThemeKind,
  initMonaco
} from './monaco';

// Build worker into a separate chunk and get the path inside of the `out` folder
import mainWorker from '../../../node_modules/monaco-editor/min/vs/base/worker/workerMain.js?raw';

// In production mode we need to tell Monaco the paths to workers, otherwise
// VSCode won't load them correctly
if (!import.meta.env.DEV) {
  window.MonacoEnvironment = {
    getWorker: () => {
      const blob = new Blob([mainWorker]);
      const uri = URL.createObjectURL(blob);
      return new Worker(uri);
    }
  };
}

loader.config({
  paths: {
    // In development mode we load assets from the Vite dev server, in
    // production - from the assets folder inside of the .vsix archive
    vs: `${window.__webview.webviewRootUri}/node_modules/monaco-editor/${
      import.meta.env.DEV ? 'dev' : 'min'
    }/vs`
  }
});

type CodeEditorProps = {
  code: string;
  language?: Language;
  readOnly?: boolean;
  wordWrap?: boolean;
  setCode(code: string): void;
};

function CodeEditor({
  code,
  language,
  readOnly = false,
  wordWrap = false,
  setCode
}: CodeEditorProps) {
  const { themeName, themeKind } = useTheme();
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const [monacoInstance, setMonacoInstance] = useState<Monaco | null>();

  const options = useMemo(
    () => ({
      // Defined in the WebviewHtmlProvider.ts
      ...window.__webview.monacoEditorConfiguration,
      lineNumbersMinChars: 3,
      wordWrap: wordWrap ? 'on' : 'off',
      readOnly
    }),
    [] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const handleChange = useCallback(
    (editorText?: string) => {
      setCode(editorText || '');
    },
    [setCode]
  );

  const handleMount = (editor: editor.IStandaloneCodeEditor, monaco: Monaco) => {
    editorRef.current = editor;
    initMonaco(monaco);
    setMonacoInstance(monaco);
  };

  useLayoutEffect(() => {
    if (!monacoInstance) {
      return;
    }
    monacoInstance.editor.defineTheme('vscode-theme', createMonacoThemeFromCSSVariables(themeKind));
    monacoInstance.editor.setTheme('vscode-theme');
  }, [monacoInstance, themeName, themeKind]);

  useEffect(() => {
    editorRef.current?.updateOptions({
      readOnly
    });
  }, [readOnly]);

  useEffect(() => {
    editorRef.current?.updateOptions({
      wordWrap: wordWrap ? 'on' : 'off'
    });
  }, [wordWrap]);

  return (
    <div className={styles.root}>
      <div className={styles.wrapper}>
        <MonacoEditor
          width="100%"
          height="100%"
          theme={getMonacoThemeByVSCodeThemeKind(themeKind)}
          language={language}
          value={code}
          loading={null}
          options={options}
          onMount={handleMount}
          onChange={readOnly ? undefined : handleChange}
        />
      </div>
    </div>
  );
}

export default CodeEditor;
