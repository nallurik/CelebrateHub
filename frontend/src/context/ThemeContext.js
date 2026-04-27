import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const ThemeContext = createContext(null);

const THEMES = [
  { id: 'vibrant',  label: 'Vibrant',  icon: '🎨', colors: ['#2563EB', '#EC4899', '#F59E0B'] },
  { id: 'ocean',    label: 'Ocean',    icon: '🌊', colors: ['#0891B2', '#06B6D4', '#22D3EE'] },
  { id: 'sunset',   label: 'Sunset',   icon: '🌅', colors: ['#EA580C', '#DC2626', '#F59E0B'] },
  { id: 'forest',   label: 'Forest',   icon: '🌿', colors: ['#059669', '#10B981', '#84CC16'] },
  { id: 'royal',    label: 'Royal',    icon: '👑', colors: ['#7C3AED', '#6D28D9', '#F59E0B'] },
  { id: 'midnight', label: 'Midnight', icon: '🌙', colors: ['#1E293B', '#60A5FA', '#A78BFA'] },
];

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('ch_theme') || 'vibrant';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('ch_theme', theme);
  }, [theme]);

  const cycleTheme = useCallback(() => {
    setTheme(prev => {
      const idx = THEMES.findIndex(t => t.id === prev);
      return THEMES[(idx + 1) % THEMES.length].id;
    });
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, cycleTheme, themes: THEMES }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
