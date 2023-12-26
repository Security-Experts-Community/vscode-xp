import { createContext, PropsWithChildren, useCallback, useEffect, useState } from 'react';

import { vscode } from '../utils/vscode';

export type ThemeContext = {
    currentInputEvents: string;
    setCurrentInputEvents: (value: React.SetStateAction<string>) => void;
    currentExpectation: string;
    setCurrentExpectation: (value: React.SetStateAction<string>) => void;
    currentResult: string;
    setCurrentResult: (value: React.SetStateAction<string>) => void;
};

export const MessageContext = createContext<ThemeContext>({} as ThemeContext);

export function MessageProvider({ children }: PropsWithChildren) {
    const [currentInputEvents, setCurrentInputEvents] = useState<string>('');
    const [currentExpectation, setCurrentExpectation] = useState<string>('');
    const [currentResult, setCurrentResult] = useState<string>('');

    const messageListener = useCallback((e: MessageEvent) => {
        const message = e.data;
        switch (message.command) {
            case 'setIUnitTestEditorViewContent': {
                if (!message.inputEvents.data || !message.expectation.data) {
                    // alert('Ошибка обновления кода теста событий.');
                    // return;
                }
                setCurrentExpectation(message.expectation.data);
                setCurrentInputEvents(message.inputEvents.data);
                console.log('setIUnitTestEditorViewContent');
                break;
            }
            case 'updateRawEvent': {
                if (!message.rawEvent) {
                    alert('Ошибка обновления сырых событий.');
                    return;
                }
                setCurrentInputEvents(message.rawEvent);
                break;
            }
            case 'updateExpectation': {
                if (!message.expectation) {
                    alert('Ошибка обновления кода теста событий.');
                    return;
                }
                setCurrentExpectation(message.expectation);
                break;
            }
        }
    }, []);

    // Добавляем листенер сообщений с бекенда, затем после первого рендера
    // триггерим бекенд на отправку на отправку данных через эвенты-сообщения
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
                currentExpectation,
                setCurrentInputEvents,
                currentInputEvents,
                setCurrentExpectation,
                currentResult,
                setCurrentResult,
            }}
        >
            {children}
        </MessageContext.Provider>
    );
}
