// src/context/ThemeContext.jsx
import { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext(null);

const DENSITIES = ['comfortable', 'compact', 'spacious'];

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => {
    return localStorage.getItem('sams_theme') === 'dark' ? 'dark' : 'light';
  });

  const [density, setDensityState] = useState(() => {
    const stored = localStorage.getItem('sams_density');
    return DENSITIES.includes(stored) ? stored : 'comfortable';
  });

  useEffect(() => {
    const html = document.documentElement;
    // Set class="dark" on <html> so Tailwind dark: utilities work
    html.classList.toggle('dark', theme === 'dark');
    // Set data-theme on both html and body for CSS variable selectors
    html.setAttribute('data-theme', theme);
    document.body.setAttribute('data-theme', theme);
    localStorage.setItem('sams_theme', theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.setAttribute('data-density', density);
    document.body.setAttribute('data-density', density);
    localStorage.setItem('sams_density', density);
  }, [density]);

  const toggleTheme = () => setThemeState(t => (t === 'dark' ? 'light' : 'dark'));
  const setDensity = (d) => { if (DENSITIES.includes(d)) setDensityState(d); };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, density, setDensity }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
