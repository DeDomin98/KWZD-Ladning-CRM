import React from 'react';
// Upewnij się, że ta ścieżka do contextu jest poprawna w Twojej strukturze plików!
import { useTheme } from '../../../context/ThemeContext';

const ThemeToggle = () => {
  const { theme, setTheme } = useTheme();

  const toggleTheme = () => {
    // Przełącza między trybem 'default' a 'pink'
    setTheme(prev => prev === 'default' ? 'pink' : 'default');
  };

  return (
    <button
      onClick={toggleTheme}
      title={theme === 'default' ? "Włącz tryb różowy" : "Przywróć tryb klasyczny"}
      className={`
        w-8 h-8 flex items-center justify-center rounded-full transition-all duration-300 ease-in-out
        border border-transparent
        ${theme === 'pink' 
          ? 'bg-rose-100 text-rose-500 shadow-sm rotate-12 scale-110 border-rose-200' // Styl aktywny (Różowy)
          : 'bg-transparent text-stone-400 hover:text-stone-600 hover:bg-stone-100' // Styl klasyczny (Szary)
        }
      `}
    >
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C8 2 4.5 5.5 4.5 9.5c0 2.5 1.5 5 4 6.5-.5 2-2 3.5-2 3.5s3-.5 5-2c2 1.5 5 2 5 2s-1.5-1.5-2-3.5c2.5-1.5 4-4 4-6.5C19.5 5.5 16 2 12 2z" /></svg>
    </button>
  );
};

export default ThemeToggle;