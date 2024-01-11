import { createContext, PropsWithChildren, useCallback, useEffect, useState } from 'react';

import { vscode } from '../utils/vscode';

export type MessageContext = {
    inputData: string;
    setInputData: (value: React.SetStateAction<string>) => void;
    expectation: string;
    setExpectation: (value: React.SetStateAction<string>) => void;
    actualData: string;
    setActualData: (value: React.SetStateAction<string>) => void;
};

export const MessageContext = createContext<MessageContext>({} as MessageContext);

export function MessageProvider({ children }: PropsWithChildren) {
    const [inputData, setInputData] = useState<string>('');
    const [expectation, setExpectation] = useState<string>('');
    const [actualData, setActualData] = useState<string>('');

    const messageListener = useCallback((e: MessageEvent) => {
        const message = e.data;
        switch (message.command) {
            case 'setIUnitTestEditorViewContent': {
                if (!message.inputEvents.data || !message.expectation.data) {
                    alert(
                        'Ошибка, события для модульного теста или ожидаемый результат не пришли с бекенда. Смотри консоль разработчика.',
                    );
                    console.log(message);
                    return;
                }
                setExpectation(message.expectation.data);
                setInputData(message.inputEvents.data);
                break;
            }
            case 'updateInputData': {
                if (!message.inputData) {
                    alert('Ошибка, события для модульного теста не пришли с бекенда. Смотри консоль разработчика.');
                    console.log(message);
                    return;
                }
                setInputData(message.inputData);
                break;
            }
            case 'updateExpectation': {
                if (!message.expectation) {
                    alert('Ошибка, ожидаемый результат не пришел с бекенда. Смотри консоль разработчика.');
                    console.log(message);
                    return;
                }
                setExpectation(message.expectation);
                break;
            }
            case 'updateActualData': {
                if (!message.actualData) {
                    alert('Ошибка, результат не пришел с бекенда. Смотри консоль разработчика.');
                    console.log(message);
                    return;
                }
                setActualData(message.actualData);
                break;
            }
        }
    }, []);

    // Добавляем листенер сообщений с бекенда, затем после первого рендера
    // триггерим бекенд на отправку данных через эвенты-сообщения
    useEffect(() => {
        window.addEventListener('message', messageListener);

        vscode.postMessage({
            command: 'documentIsReady',
        });

        return () => {
            window.removeEventListener('message', messageListener);
        };
    }, [messageListener]);

    return (
        <MessageContext.Provider
            value={{
                expectation,
                setInputData,
                inputData,
                setExpectation,
                actualData,
                setActualData,
            }}
        >
            {children}
        </MessageContext.Provider>
    );
}
