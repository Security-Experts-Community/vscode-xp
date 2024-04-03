import '@bendera/vscode-webview-elements/dist/vscode-collapsible';
import '@bendera/vscode-webview-elements/dist/vscode-textarea';

import { useContext, useState } from 'react';

import { MessageContext } from '../providers/message-provider';
import Checkbox from '../ui/checkbox/checkbox';
import Editor from '../ui/editor/editor';

export default function InputData() {
    const { inputData, setInputData } = useContext(MessageContext);
    const [isWordWrap, setIsWordWrap] = useState<boolean>(false);

    return (
        <div className="flex h-full flex-auto flex-col gap-2">
            <div className="flex h-5 w-full items-center justify-between">
                <span>Нормализованные события в формате JSON Lines</span>
                <Checkbox label="Переносить по словам" setIsCheckedState={setIsWordWrap} />
            </div>
            <Editor text={inputData} setText={setInputData} isWordWrap={isWordWrap} />
        </div>
    );
}
