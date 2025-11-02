import React, { createContext, useState, useContext, useMemo, FC, ReactNode } from 'react';
import { ThemeProvider } from 'styled-components';
import { themes, GlobalStyle } from '../theme';

interface ThemeContextType {
    setTheme: (themeName: string) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeManagerProvider: FC<{ children: ReactNode }> = ({ children }) => {
    const [themeName, setThemeName] = useState('default');

    const setTheme = (name: string) => {
        setThemeName(name in themes ? name : 'default');
    };

    const activeTheme = useMemo(() => themes[themeName as keyof typeof themes] || themes.default, [themeName]);

    return (
        <ThemeContext.Provider value={{ setTheme }}>
            <ThemeProvider theme={activeTheme}>
                <GlobalStyle />
                {children}
            </ThemeProvider>
        </ThemeContext.Provider>
    );
};

export const useThemeManager = () => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useThemeManager must be used within a ThemeManagerProvider');
    }
    return context;
};
