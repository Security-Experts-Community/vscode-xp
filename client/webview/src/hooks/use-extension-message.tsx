import { useCallback, useEffect, useState } from 'react';
import { ResponseMessage } from '~/types';

// Subscribes component to the messages from the extension. The component will
// be updated with new hook value only if the webview receive messages with the
// particular command
export const useExtensionMessage = <T extends ResponseMessage, U extends T['command']>(
  command: U
) => {
  type Q = Extract<T, { command: U }>;

  const [messageData, setMessageData] = useState<Q>();

  const handleMessage = useCallback(
    (e: MessageEvent<Q>) => {
      if (command == '*' || e.data.command == command) {
        setMessageData(e.data);
      }
    },
    [command]
  );

  useEffect(() => {
    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [handleMessage]);

  return messageData;
};
