import { useContext } from 'react';
import { json } from '@codemirror/lang-json';
import { EditorView } from '@codemirror/view';
import { vscodeDark } from '@uiw/codemirror-theme-vscode';
import { xcodeLight } from '@uiw/codemirror-theme-xcode';
import CodeMirror from '@uiw/react-codemirror';

import { ThemeContext } from '../../providers/theme-provider';

type Props = {
    text: string;
    setText: (value: React.SetStateAction<string>) => void;
    isReadOnly?: boolean;
    isWordWrap?: boolean;
};

export default function Editor({ text, setText, isReadOnly = false, isWordWrap = false }: Props) {
    const { currentTheme } = useContext(ThemeContext);
    const theme = currentTheme == 'vscode-light' ? xcodeLight : vscodeDark;
    const extensions = isWordWrap ? [json(), EditorView.lineWrapping] : [json()];
    return (
        <div className="relative flex shrink grow">
            <div className="absolute h-full w-full">
                <CodeMirror
                    style={{ height: '100%', width: '100%' }}
                    value={text}
                    height="100%"
                    theme={theme}
                    onChange={(value) => setText(value)}
                    extensions={extensions}
                    readOnly={isReadOnly}
                />
            </div>
        </div>
    );
}
