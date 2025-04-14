import { useCallback } from 'react';
import { vscode } from '~/api/vscode';
import { RequestMessage } from '~/types';

// Returns a function that sends a message to the extension
export const usePostMessage = () => {
  return useCallback((message: RequestMessage) => {
    vscode.postMessage(message);
  }, []);
};
