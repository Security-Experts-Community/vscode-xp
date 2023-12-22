import { useState } from 'react';

import Editor from '../ui/editor/editor';

export default function Results() {
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
        <div className="grid h-full w-full grid-cols-2 gap-2">
            <div className="col-span-1 flex flex-col gap-2">
                <span className="h-5">Ожидаемый результат</span>
                <Editor text={text1} setText={setText1} />
            </div>
            <div className="col-span-1 flex flex-col gap-2">
                <span className="h-5">Полученный результат</span>
                <Editor text={text1} setText={setText1} isReadOnly={true} />
            </div>
        </div>
    );
}
