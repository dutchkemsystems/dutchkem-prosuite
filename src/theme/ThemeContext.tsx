import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { THEMES, DEFAULT_THEME, type Theme } from "./themes";

const STORAGE_KEY = "dutchkem-theme";

function loadSavedTheme(): Theme {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && THEMES[saved]) return THEMES[saved];
  } catch {}
  return DEFAULT_THEME;
}

interface ThemeContextValue {
  currentTheme: Theme;
  changeTheme: (themeId: string) => void;
}

const ThemeContext = createContext<ThemeContextValue>({ currentTheme: DEFAULT_THEME, changeTheme: () => {} });

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [currentTheme, setCurrentTheme] = useState<Theme>(loadSavedTheme);

  const changeTheme = useCallback((themeId: string) => {
    const theme = THEMES[themeId];
    if (!theme) return;
    setCurrentTheme(theme);
    localStorage.setItem(STORAGE_KEY, themeId);
    // Apply immediately
    document.body.style.background = theme.background;
    document.body.style.backgroundAttachment = 'fixed';
    document.documentElement.style.setProperty('--theme-primary', theme.colors.primary);
    document.documentElement.style.setProperty('--theme-secondary', theme.colors.secondary);
    document.documentElement.style.setProperty('--theme-accent', theme.colors.accent);
    document.documentElement.style.setProperty('--theme-bg', theme.background);
    document.documentElement.style.setProperty('--theme-button', theme.colors.button);
    document.documentElement.style.setProperty('--theme-card', theme.colors.card);
    document.documentElement.style.setProperty('--theme-card-border', theme.colors.cardBorder);
  }, []);

  useEffect(() => {
    document.body.style.background = currentTheme.background;
    document.body.style.backgroundAttachment = 'fixed';
  }, [currentTheme]);

  return (
    <ThemeContext.Provider value={{ currentTheme, changeTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}
