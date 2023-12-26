import { useContext } from 'react';

import { MessageContext } from '../providers/message-provider';
import { vscode } from '../utils/vscode';

export type Test = {
    rawEvent: string;
    expectation: string;
};

type PostCommand = 'saveTest' | 'updateExpectEvent' | 'runTest';

export default function usePostMessage() {
    const { currentExpectation, currentInputEvents } = useContext(MessageContext);

    const postMessageWithoutTest = (command: PostCommand): void => {
        vscode.postMessage({
            command: command,
        });
    };

    const postMessageWithTest = (command: PostCommand): void => {
        vscode.postMessage({
            command: command,
            test: {
                rawEvent: currentInputEvents,
                expectation: currentExpectation,
            },
        });
    };

    const postUpdateExpectEvent = () => postMessageWithoutTest('updateExpectEvent');
    const postRunTest = () => postMessageWithTest('runTest');
    const postSaveTest = () => postMessageWithTest('saveTest');

    return { postUpdateExpectEvent, postRunTest, postSaveTest };
}
