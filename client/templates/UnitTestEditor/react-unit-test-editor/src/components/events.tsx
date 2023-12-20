import '@bendera/vscode-webview-elements/dist/vscode-collapsible';
import '@bendera/vscode-webview-elements/dist/vscode-checkbox';
import '@bendera/vscode-webview-elements/dist/vscode-textarea';

import { useState } from 'react';

import Editor from './editor/editor';

export default function Events() {
    const [text1, setText1] = useState(`{
        "glossary": {
            "title": "example glossary",
            "GlossDiv": {
                "title": "S",
                "GlossList": {
                    "GlossEntry": {
                        "ID": "SGML",
                        "SortAs": "SGML",
                        "GlossTerm": "Standard Generalized Markup Language",
                        "Acronym": "SGML",
                        "Abbrev": "ISO 8879:1986",
                        "GlossDef": {
                            "para": "A meta-markup language, used to create markup languages such as DocBook.",
                            "GlossSeeAlso": ["GML", "XML"]
                        },
                        "GlossSee": "markup"
                    }
                }
            }
        }
    }`);
    return (
        <div className="flex h-full flex-auto flex-col gap-2">
            <div className="flex h-5 w-full items-center justify-between">
                <span>События для модульного теста</span>
                <vscode-checkbox label="Переносить по словам" value="testvalue1"></vscode-checkbox>
            </div>
            <Editor text={text1} setText={setText1} />
        </div>
    );
}
