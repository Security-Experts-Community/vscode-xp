import { createContext, PropsWithChildren, useContext, useEffect, useState } from 'react';

type Theme = 'vscode-light' | 'vscode-dark' | 'vscode-high-contrast';

type ThemeContext = {
    currentTheme: Theme;
};

export const ThemeContext = createContext<ThemeContext>({} as ThemeContext);

export function ThemeProvider({ children }: PropsWithChildren) {
    const [currentTheme, setCurrentTheme] = useState<Theme>('vscode-dark');

    useEffect(() => {
        const bodyClassList = document.body.classList;
        bodyClassList.contains('vscode-light')
            ? setCurrentTheme('vscode-light')
            : bodyClassList.contains('vscode-dark')
              ? setCurrentTheme('vscode-dark')
              : setCurrentTheme('vscode-high-contrast');
    }, []);
    return <ThemeContext.Provider value={{ currentTheme }}>{children}</ThemeContext.Provider>;
}
