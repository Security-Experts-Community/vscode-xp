import { json } from '@codemirror/lang-json';
import { vscodeDark } from '@uiw/codemirror-theme-vscode';
import CodeMirror from '@uiw/react-codemirror';

import './styles/editor.css';

type Props = {
    text: string;
    setText: (value: React.SetStateAction<string>) => void;
    readOnly?: boolean;
};

export default function Editor({ text, setText, readOnly = false }: Props) {
    return (
        <CodeMirror
            value={text}
            theme={vscodeDark}
            onChange={(value) => setText(value)}
            extensions={[json()]}
            readOnly={readOnly}
        />
    );
}
