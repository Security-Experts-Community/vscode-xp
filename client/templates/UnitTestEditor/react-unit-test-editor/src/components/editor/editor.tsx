import { json } from '@codemirror/lang-json';
import { vscodeDark } from '@uiw/codemirror-theme-vscode';
import CodeMirror from '@uiw/react-codemirror';

// import './editor.css';

type Props = {
    text: string;
    setText: (value: React.SetStateAction<string>) => void;
    readOnly?: boolean;
};

export default function Editor({ text, setText, readOnly = false }: Props) {
    return (
        <div className="relative flex shrink grow">
            <div className="absolute h-full w-full">
                <CodeMirror
                    style={{ height: '100%', width: '100%' }}
                    value={text}
                    height="100%"
                    theme={vscodeDark}
                    onChange={(value) => setText(value)}
                    extensions={[json()]}
                    readOnly={readOnly}
                />
            </div>
        </div>
    );
}
