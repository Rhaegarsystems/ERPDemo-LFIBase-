import React, { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
    const [theme, setTheme] = useState(() => {
        const savedTheme = localStorage.getItem('app-theme');
        return savedTheme || 'light';
    });

    const [variant, setVariant] = useState(() => {
        const savedVariant = localStorage.getItem('app-theme-variant');
        return savedVariant || 'default';
    });

    useEffect(() => {
        const root = window.document.documentElement;
        root.classList.remove('light', 'dark');
        root.setAttribute('data-theme', theme);
        root.setAttribute('data-variant', variant);
        localStorage.setItem('app-theme', theme);
        localStorage.setItem('app-theme-variant', variant);
    }, [theme, variant]);

    const toggleTheme = () => {
        setTheme((prevTheme) => (prevTheme === 'light' ? 'dark' : 'light'));
    };

    const changeVariant = (newVariant) => {
        setVariant(newVariant);
    };

    return (
        <ThemeContext.Provider value={{ theme, setTheme, toggleTheme, variant, changeVariant }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};
