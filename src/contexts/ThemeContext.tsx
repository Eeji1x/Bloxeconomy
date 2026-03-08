import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';

export type ThemeId = 'sodablox' | 'roblox2016' | 'roblox2015' | 'roblox2012' | 'roblox2008';

const VALID_THEMES: ThemeId[] = ['sodablox', 'roblox2016', 'roblox2015', 'roblox2012', 'roblox2008'];

interface ThemeOption {
  id: ThemeId;
  name: string;
  description: string;
  preview: {
    bg: string;
    navbar: string;
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
      navbar: '#0a0a1a',
      accent: '#00ffff',
      card: '#141428',
      text: '#e0ffff',
    },
  },
  {
    id: 'roblox2016',
    name: 'SODABLOX 2016',
    description: 'Classic 2016 style — blue navbar, light sidebar, white panels',
    preview: {
      bg: '#E8E8E8',
      navbar: '#0074BD',
      accent: '#01A2FD',
      card: '#FFFFFF',
      text: '#1E1E1F',
    },
  },
  {
    id: 'roblox2015',
    name: 'SODABLOX 2015',
    description: 'Classic 2015 style — dark charcoal navbar, red logo accent, light panels',
    preview: {
      bg: '#E6E6E6',
      navbar: '#393B3D',
      accent: '#E2231A',
      card: '#FFFFFF',
      text: '#191919',
    },
  },
  {
    id: 'roblox2012',
    name: 'SODABLOX 2012',
    description: 'Classic 2012 style — dark blue header, gray tab navigation',
    preview: {
      bg: '#E1E1E1',
      navbar: '#1A3352',
      accent: '#0066CC',
      card: '#FFFFFF',
      text: '#333333',
    },
  },
  {
    id: 'roblox2008',
    name: 'Roblox 2008',
    description: 'Classic nostalgic 2008 layout — blue gradient header, grey sidebar, white panels',
    preview: {
      bg: '#F1F1F1',
      navbar: '#4A6EA9',
      accent: '#003399',
      card: '#FFFFFF',
      text: '#000000',
    },
  },
];

interface ThemeContextType {
  theme: ThemeId;
  setTheme: (theme: ThemeId) => void;
  isLoading: boolean;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'sodablox',
  setTheme: () => {},
  isLoading: true,
});

export const useTheme = () => useContext(ThemeContext);

function sanitizeTheme(val: unknown): ThemeId {
  if (typeof val === 'string' && VALID_THEMES.includes(val as ThemeId)) {
    return val as ThemeId;
  }
  return 'sodablox';
}

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [theme, setThemeState] = useState<ThemeId>(() => {
    // Instant load from localStorage for no flash
    return sanitizeTheme(localStorage.getItem('sodablox-theme'));
  });
  const [isLoading, setIsLoading] = useState(true);

  // On mount, try to load from DB (overrides localStorage)
  useEffect(() => {
    const loadFromDb = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data } = await supabase
            .from('site_settings')
            .select('value')
            .eq('key', `theme_${user.id}`)
            .maybeSingle();
          if (data?.value) {
            const dbTheme = sanitizeTheme((data.value as any)?.theme);
            setThemeState(dbTheme);
            localStorage.setItem('sodablox-theme', dbTheme);
          }
        }
      } catch {
        // Fallback to localStorage value
      }
      setIsLoading(false);
    };
    loadFromDb();
  }, []);

  // Apply to DOM whenever theme changes
  useEffect(() => {
    localStorage.setItem('sodablox-theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const setTheme = async (t: ThemeId) => {
    const safe = sanitizeTheme(t);
    setThemeState(safe);

    // Persist to DB
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('site_settings')
          .upsert(
            {
              key: `theme_${user.id}`,
              value: { theme: safe },
              updated_by: user.id,
            },
            { onConflict: 'key' }
          );
      }
    } catch {
      // Still works via localStorage
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, isLoading }}>
      {children}
    </ThemeContext.Provider>
  );
};
