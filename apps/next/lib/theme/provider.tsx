'use client';

import { createContext, useContext, useEffect, useState } from 'react';

type Theme   = 'light' | 'dark';
type Density = 'comfortable' | 'compact' | 'spacious';

interface ThemeContextValue {
  theme:       Theme;
  density:     Density;
  toggleTheme: () => void;
  setDensity:  (d: Density) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme:       'light',
  density:     'comfortable',
  toggleTheme: () => {},
  setDensity:  () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme,   setTheme]   = useState<Theme>('light');
  const [density, setDensityState] = useState<Density>('comfortable');

  // Hydrate from localStorage on mount
  useEffect(() => {
    const t = (localStorage.getItem('sams_theme') as Theme)   || 'light';
    const d = (localStorage.getItem('sams_density') as Density) || 'comfortable';
    applyTheme(t);
    applyDensity(d);
    setTheme(t);
    setDensityState(d);
  }, []);

  function applyTheme(t: Theme) {
    const html = document.documentElement;
    const body = document.body;
    if (t === 'dark') { html.classList.add('dark'); } else { html.classList.remove('dark'); }
    html.setAttribute('data-theme', t);
    body.setAttribute('data-theme', t);
  }

  function applyDensity(d: Density) {
    document.documentElement.setAttribute('data-density', d);
    document.body.setAttribute('data-density', d);
  }

  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    setTheme(next);
    localStorage.setItem('sams_theme', next);
  }

  function setDensity(d: Density) {
    applyDensity(d);
    setDensityState(d);
    localStorage.setItem('sams_density', d);
  }

  return (
    <ThemeContext.Provider value={{ theme, density, toggleTheme, setDensity }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
