import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { THEME_LIST, THEMES, DEFAULT_THEME, type Theme } from "./themes";

const STORAGE_KEY = "dutchkem-theme";

function loadSavedTheme(): Theme {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const found = THEME_LIST.find((t) => t.id === saved);
      if (found) return found;
    }
  } catch {}
  return DEFAULT_THEME;
}

interface ThemeContextValue {
  currentTheme: Theme;
  changeTheme: (themeId: string) => void;
  themes: Record<string, Theme>;
}

const ThemeContext = createContext<ThemeContextValue>({
  currentTheme: DEFAULT_THEME,
  changeTheme: () => {},
  themes: THEMES,
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [currentTheme, setCurrentTheme] = useState<Theme>(loadSavedTheme);

  const changeTheme = useCallback((themeId: string) => {
    const theme = THEME_LIST.find((t) => t.id === themeId);
    if (!theme || theme.id === currentTheme.id) return;
    setCurrentTheme(theme);
    localStorage.setItem(STORAGE_KEY, theme.id);
    document.body.style.background = theme.background;
    document.body.style.backgroundAttachment = "fixed";
    document.documentElement.style.setProperty("--theme-primary", theme.colors.primary);
    document.documentElement.style.setProperty("--theme-secondary", theme.colors.secondary);
    document.documentElement.style.setProperty("--theme-accent", theme.colors.accent);
    document.documentElement.style.setProperty("--theme-bg", theme.background);
    document.documentElement.style.setProperty("--theme-button", theme.colors.button);
    document.documentElement.style.setProperty("--theme-card", theme.colors.card);
    document.documentElement.style.setProperty("--theme-card-border", theme.colors.cardBorder);
  }, [currentTheme.id]);

  useEffect(() => {
    document.body.style.background = currentTheme.background;
    document.body.style.backgroundAttachment = "fixed";
    document.documentElement.style.setProperty("--theme-primary", currentTheme.colors.primary);
    document.documentElement.style.setProperty("--theme-secondary", currentTheme.colors.secondary);
    document.documentElement.style.setProperty("--theme-accent", currentTheme.colors.accent);
    document.documentElement.style.setProperty("--theme-bg", currentTheme.background);
    document.documentElement.style.setProperty("--theme-button", currentTheme.colors.button);
    document.documentElement.style.setProperty("--theme-card", currentTheme.colors.card);
    document.documentElement.style.setProperty("--theme-card-border", currentTheme.colors.cardBorder);
  }, [currentTheme]);

  return (
    <ThemeContext.Provider value={{ currentTheme, changeTheme, themes: THEMES }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}
