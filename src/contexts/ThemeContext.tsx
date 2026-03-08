import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type ThemeId = 'sodablox' | 'roblox2020';

interface ThemeOption {
  id: ThemeId;
  name: string;
  description: string;
  preview: {
    bg: string;
    accent: string;
    card: string;
    text: string;
  };
}

export const THEMES: ThemeOption[] = [
  {
    id: 'sodablox',
    name: 'SODABLOX Default',
    description: 'Dark cyberpunk theme with neon glow effects',
    preview: {
      bg: '#0a0a1a',
      accent: '#00ffff',
      card: '#141428',
      text: '#e0ffff',
    },
  },
  {
    id: 'roblox2020',
    name: 'ROBLOX 2020',
    description: 'Classic light theme inspired by Roblox circa 2020',
    preview: {
      bg: '#f2f2f2',
      accent: '#00a2ff',
      card: '#ffffff',
      text: '#191919',
    },
  },
];

interface ThemeContextType {
  theme: ThemeId;
  setTheme: (theme: ThemeId) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'sodablox',
  setTheme: () => {},
});

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [theme, setThemeState] = useState<ThemeId>(() => {
    const saved = localStorage.getItem('sodablox-theme');
    return (saved === 'roblox2020' ? 'roblox2020' : 'sodablox') as ThemeId;
  });

  useEffect(() => {
    localStorage.setItem('sodablox-theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const setTheme = (t: ThemeId) => setThemeState(t);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
