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

    const [autoOpenPdf, setAutoOpenPdf] = useState(() => {
        const saved = localStorage.getItem('app-auto-open-pdf');
        return saved !== null ? JSON.parse(saved) : true;
    });

    useEffect(() => {
        const root = window.document.documentElement;
        root.classList.remove('light', 'dark');
        root.setAttribute('data-theme', theme);
        root.setAttribute('data-variant', variant);
        localStorage.setItem('app-theme', theme);
        localStorage.setItem('app-theme-variant', variant);
    }, [theme, variant]);

    useEffect(() => {
        localStorage.setItem('app-auto-open-pdf', JSON.stringify(autoOpenPdf));
    }, [autoOpenPdf]);

    const toggleTheme = () => {
        setTheme((prevTheme) => (prevTheme === 'light' ? 'dark' : 'light'));
    };

    const changeVariant = (newVariant) => {
        setVariant(newVariant);
    };

    const toggleAutoOpenPdf = () => {
        setAutoOpenPdf(prev => !prev);
    };

    return (
        <ThemeContext.Provider value={{ 
            theme, setTheme, toggleTheme, 
            variant, changeVariant, 
            autoOpenPdf, toggleAutoOpenPdf 
        }}>
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
