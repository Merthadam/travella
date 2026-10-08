import React, { createContext, useContext, useEffect, useLayoutEffect, useState } from 'react';
import './appearance.css';

export const APPEARANCE_KEY = 'travella.theme';
const legacyKey = 'travella.account.theme';
const Appearance = createContext(null);
const valid = value => value === 'light' || value === 'dark';
function systemTheme() {
  try { return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'; }
  catch { return 'light'; }
}
function initialTheme() {
  try {
    const stored = localStorage.getItem(APPEARANCE_KEY);
    if (valid(stored)) return stored;
    const legacy = localStorage.getItem(legacyKey);
    if (valid(legacy)) return legacy;
  } catch { /* Appearance still works when browser storage is unavailable. */ }
  return systemTheme();
}

export function AppearanceProvider({ children }) {
  const [theme, setTheme] = useState(initialTheme);
  useLayoutEffect(() => {
    const root = document.documentElement;
    const previousTheme = root.getAttribute('data-theme');
    const previousScheme = root.style.colorScheme;
    return () => {
      if (previousTheme === null) root.removeAttribute('data-theme');
      else root.setAttribute('data-theme', previousTheme);
      root.style.colorScheme = previousScheme;
    };
  }, []);
  useLayoutEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    try {
      localStorage.setItem(APPEARANCE_KEY, theme);
      localStorage.removeItem(legacyKey);
    } catch { /* Retain the current in-memory selection. */ }
  }, [theme]);
  useEffect(() => {
    const sync = event => {
      if (event.key === APPEARANCE_KEY || event.key === null) {
        setTheme(valid(event.newValue) ? event.newValue : systemTheme());
      }
    };
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);
  return <Appearance.Provider value={{ theme, setTheme: value => { if (valid(value)) setTheme(value); } }}>{children}</Appearance.Provider>;
}

export function useAppearance() {
  const appearance = useContext(Appearance);
  if (!appearance) throw new Error('AppearanceProvider is required');
  return appearance;
}
