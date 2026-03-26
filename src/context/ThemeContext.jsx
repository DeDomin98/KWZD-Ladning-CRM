import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  // Pobieramy zapisany motyw lub ustawiamy domyślny
  const savedTheme = localStorage.getItem('app-theme') || 'default';
  const [theme, setTheme] = useState(savedTheme);

  // Ustawiamy atrybut data-theme przy pierwszym renderowaniu
  useEffect(() => {
    const htmlElement = document.documentElement;
    if (savedTheme === 'pink') {
      htmlElement.setAttribute('data-theme', 'pink');
    } else {
      htmlElement.removeAttribute('data-theme');
    }
  }, []); // Tylko przy pierwszym renderowaniu

  useEffect(() => {
    // Zapisujemy wybór w pamięci przeglądarki przy każdej zmianie
    localStorage.setItem('app-theme', theme);
    
    // Ustawiamy atrybut data-theme na elemencie <html> aby aktywować style CSS
    const htmlElement = document.documentElement;
    if (theme === 'pink') {
      htmlElement.setAttribute('data-theme', 'pink');
    } else {
      htmlElement.removeAttribute('data-theme');
    }
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
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

export default ThemeContext;