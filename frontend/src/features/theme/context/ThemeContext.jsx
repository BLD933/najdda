import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { readStore, writeStore } from '../../../utils/storage';

const STORAGE_KEY = 'najdda-theme';
const ThemeContext = createContext();

const systemDark = () => window.matchMedia('(prefers-color-scheme: dark)').matches;

// The inline script in index.html has already set `.dark` before React mounts;
// this only keeps the class in sync afterwards, and tracks the OS while the
// preference is 'system'.
export const ThemeProvider = ({ children }) => {
  const [theme, setThemeState] = useState(() => readStore(STORAGE_KEY) || 'system');

  const apply = useCallback((value) => {
    const dark = value === 'dark' || (value === 'system' && systemDark());
    document.documentElement.classList.toggle('dark', dark);
  }, []);

  useEffect(() => {
    apply(theme);
    if (theme !== 'system') return undefined;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => apply('system');
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [theme, apply]);

  const setTheme = useCallback((value) => {
    setThemeState(value);
    writeStore(STORAGE_KEY, value);
  }, []);

  const resolved = theme === 'system' ? (systemDark() ? 'dark' : 'light') : theme;

  return (
    <ThemeContext.Provider value={{ theme, resolved, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within a ThemeProvider');
  return context;
};
