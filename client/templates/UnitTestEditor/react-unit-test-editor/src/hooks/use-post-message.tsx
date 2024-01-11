import { useContext } from 'react';

import { MessageContext } from '../providers/message-provider';
import { vscode } from '../utils/vscode';

export type Test = {
    rawEvent: string;
    expectation: string;
};

type PostCommand = 'saveTest' | 'updateExpectation' | 'runTest';

export default function usePostMessage() {
    const { expectation, inputData } = useContext(MessageContext);

    const postMessageWithExpectation = (command: PostCommand): void => {
        vscode.postMessage({
            command: command,
            expectation: expectation,
        });
    };

    const postMessageWithExpectationAndInputData = (command: PostCommand): void => {
        vscode.postMessage({
            command: command,
            inputData: inputData,
            expectation: expectation,
        });
    };

    const postUpdateExpectation = () => postMessageWithExpectation('updateExpectation');
    const postRunTest = () => postMessageWithExpectationAndInputData('runTest');
    const postSaveTest = () => postMessageWithExpectationAndInputData('saveTest');

    return { postUpdateExpectation, postRunTest, postSaveTest };
}
