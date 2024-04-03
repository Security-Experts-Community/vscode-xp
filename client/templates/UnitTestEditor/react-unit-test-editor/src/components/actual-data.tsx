import { useContext, useState } from 'react';

import { MessageContext } from '../providers/message-provider';
import Checkbox from '../ui/checkbox/checkbox';
import Editor from '../ui/editor/editor';

export default function ActualData() {
    const { actualData, setActualData } = useContext(MessageContext);
    const [isWordWrap, setIsWordWrap] = useState<boolean>(false);
    return (
        <div className="col-span-1 flex flex-col gap-2">
            <div className="flex h-5 w-full items-center justify-between">
                <span>Фактический результат</span>
                <Checkbox label="Переносить по словам" setIsCheckedState={setIsWordWrap} />
            </div>
            <Editor text={actualData} setText={setActualData} isReadOnly={true} isWordWrap={isWordWrap} />
        </div>
    );
}
