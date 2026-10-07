import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const ThemeContext = createContext(null);

const STORAGE_KEY = 'hazard_hunt_theme';

/** Reads the stored preference, defaulting to dark. Never throws. */
const readStoredTheme = () => {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'light' ? 'light' : 'dark';
  } catch {
    // Private browsing / storage disabled - fall back to the OS preference.
    return typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-color-scheme: light)').matches
      ? 'light'
      : 'dark';
  }
};

/**
 * Applies the theme by toggling a class on <html>.
 *
 * The class is the single source of truth for every `dark:` variant in the
 * stylesheet, so it is written here and nowhere else. It is also written BEFORE
 * first paint (see the inline script in index.html), which is what stops the
 * page flashing light before React mounts.
 */
const applyTheme = (theme) => {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.classList.toggle('dark', theme === 'dark');
  // `color-scheme` makes native UI (scrollbars, form controls, date pickers)
  // match the theme. Without it the scrollbar stays light in dark mode, which
  // is the most visible sign of a half-applied toggle.
  root.style.colorScheme = theme;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', theme === 'dark' ? '#0E1216' : '#F1F0EC');
};

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(readStoredTheme);

  useEffect(() => {
    applyTheme(theme);
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      /* storage unavailable - the class is still applied for this session */
    }

    // The 360 viewer and the WebGL canvas both size themselves from the
    // viewport, and a theme switch changes neither - but re-measuring is cheap
    // and keeps any canvas-backed layer in step with the new layout.
    window.dispatchEvent(new Event('resize'));
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, isDark: theme === 'dark', toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider');
  return ctx;
};