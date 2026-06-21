import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { THEMES } from './themes';

type ThemeType = typeof THEMES[keyof typeof THEMES];

interface ThemeContextType {
  currentTheme: ThemeType;
  changeTheme: (themeId: string) => void;
  themes: typeof THEMES;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
};

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [currentTheme, setCurrentTheme] = useState<ThemeType>(() => {
    if (typeof window === 'undefined') return THEMES.NEBULA_DREAM;
    const saved = localStorage.getItem('dutchkem-theme');
    return saved && THEMES[saved as keyof typeof THEMES] ? THEMES[saved as keyof typeof THEMES] : THEMES.NEBULA_DREAM;
  });

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--theme-primary', currentTheme.colors.primary);
    root.style.setProperty('--theme-secondary', currentTheme.colors.secondary);
    root.style.setProperty('--theme-accent', currentTheme.colors.accent);
    root.style.setProperty('--theme-bg', currentTheme.background);
    root.style.setProperty('--theme-button', currentTheme.colors.button);
    root.style.setProperty('--theme-button-hover', currentTheme.colors.buttonHover);
    root.style.setProperty('--theme-card', currentTheme.colors.card);
    root.style.setProperty('--theme-card-border', currentTheme.colors.cardBorder);
    document.body.style.background = currentTheme.background;
    document.body.style.backgroundAttachment = 'fixed';
    localStorage.setItem('dutchkem-theme', currentTheme.id);
  }, [currentTheme]);

  const changeTheme = (themeId: string) => {
    if (themeId === currentTheme.id) return;
    const theme = THEMES[themeId as keyof typeof THEMES];
    if (theme) setCurrentTheme(theme);
  };

  return (
    <ThemeContext.Provider value={{ currentTheme, changeTheme, themes: THEMES }}>
      {children}
    </ThemeContext.Provider>
  );
}
