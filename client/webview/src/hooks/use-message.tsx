import { useEffect } from 'react';
import { ResponseMessage } from '~/types';

// Listens to the extension messages and pass the message object to the provided messageListener
export function useMessage(messageListener: (message: ResponseMessage) => void) {
  useEffect(() => {
    const handleMessage = (e: MessageEvent<ResponseMessage>) => {
      messageListener(e.data);
    };

    window.addEventListener('message', handleMessage);

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [messageListener]);
}
