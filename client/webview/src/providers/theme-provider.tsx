import { createContext, PropsWithChildren, useLayoutEffect, useState } from 'react';

type ThemeName = string;
type ThemeKind =
  | 'vscode-dark'
  | 'vscode-light'
  | 'vscode-high-contrast'
  | 'vscode-high-contrast-light';

type ThemeContext = {
  themeName: ThemeName;
  themeKind: ThemeKind;
};

export const ThemeContext = createContext<ThemeContext>({} as ThemeContext);

export function ThemeProvider({ children }: PropsWithChildren) {
  const [themeData, setThemeData] = useState<ThemeContext>({} as ThemeContext);

  useLayoutEffect(() => {
    const updateThemeData = () => {
      const { vscodeThemeName, vscodeThemeKind } = document.body.dataset;
      setThemeData({
        themeName: vscodeThemeName as ThemeName,
        themeKind: vscodeThemeKind as ThemeKind
      });
    };

    updateThemeData();

    const observer = new MutationObserver(updateThemeData);
    observer.observe(document.body, { attributes: true });

    return () => {
      observer.disconnect();
    };
  }, []);

  return <ThemeContext.Provider value={themeData}>{children}</ThemeContext.Provider>;
}
