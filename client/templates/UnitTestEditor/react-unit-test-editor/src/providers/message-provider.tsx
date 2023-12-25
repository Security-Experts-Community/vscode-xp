import { createContext, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useState } from 'react';

export type ThemeContext = {
    currentRawEvent: string;
    setCurrentRawEvent: (value: React.SetStateAction<string>) => void;
    currentExpectation: string;
    setCurrentExpectation: (value: React.SetStateAction<string>) => void;
};

export const MessageContext = createContext<ThemeContext>({} as ThemeContext);

export function MessageProvider({ children }: PropsWithChildren) {
    const [currentRawEvent, setCurrentRawEvent] = useState<string>('');
    const [currentExpectation, setCurrentExpectation] = useState<string>('');

    const messageListener = useCallback((e: MessageEvent) => {
        const message = e.data;
        switch (message.command) {
            case 'updateRawEvent': {
                if (!message.rawEvent) {
                    alert('Ошибка обновления сырых событий.');
                    return;
                }
                setCurrentRawEvent(message.rawEvent);
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

        const vscode = acquireVsCodeApi();
        vscode.postMessage({
            command: 'documentIsReady',
        });

        console.log('ducomentIsReady');

        return () => {
            window.removeEventListener('message', messageListener);
        };
    }, [messageListener]);

    return (
        <MessageContext.Provider
            value={{ currentExpectation, setCurrentRawEvent, currentRawEvent, setCurrentExpectation }}
        >
            {children}
        </MessageContext.Provider>
    );
}
