import { useState, useEffect } from 'react';
import type { Theme } from '../constants/preferences';
import { DARK_THEMES, THEME_OPTIONS } from '../constants/preferences';

export const STORAGE_KEY = 'midas-theme';

const VALID_THEMES = new Set(THEME_OPTIONS.map((o) => o.value));

function isValidTheme(value: string): value is Theme {
  return VALID_THEMES.has(value as Theme);
}

export function getInitialTheme(): Theme {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored && isValidTheme(stored)) return stored;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(getInitialTheme);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.classList.toggle('dark', DARK_THEMES.includes(theme));
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  return { theme, setTheme };
}
