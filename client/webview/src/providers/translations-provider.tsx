import { createContext, PropsWithChildren } from 'react';

export const TranslationsContext = createContext<Record<string, string>>({});

export function TranslationsProvider({ children }: PropsWithChildren) {
  return (
    <TranslationsContext.Provider value={window.__webview.translations}>
      {children}
    </TranslationsContext.Provider>
  );
}
