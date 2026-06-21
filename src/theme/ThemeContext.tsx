import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { THEMES, DEFAULT_THEME, type Theme } from "./themes";

interface ThemeContextValue {
  currentTheme: Theme;
  changeTheme: (themeId: string) => void;
  themes: Record<string, Theme>;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const STORAGE_KEY = "dutchkem-theme";

function loadSavedTheme(): Theme {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && typeof parsed === "object" && "id" in parsed) {
        return parsed as Theme;
      }
      if (typeof parsed === "string" && THEMES[parsed]) {
        return THEMES[parsed];
      }
    }
  } catch {
    // ignore
  }
  return DEFAULT_THEME;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [currentTheme, setCurrentTheme] = useState<Theme>(loadSavedTheme);
  const [transitioning, setTransitioning] = useState(false);

  const changeTheme = useCallback((themeId: string) => {
    const theme = THEMES[themeId];
    if (!theme || theme.id === currentTheme.id) return;
    setTransitioning(true);
    setTimeout(() => {
      setCurrentTheme(theme);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(theme));
      setTimeout(() => setTransitioning(false), 400);
    }, 200);
  }, [currentTheme.id]);

  useEffect(() => {
    const root = document.documentElement;
    const c = currentTheme.colors;
    root.style.setProperty("--theme-primary", c.primary);
    root.style.setProperty("--theme-secondary", c.secondary);
    root.style.setProperty("--theme-accent", c.accent);
    root.style.setProperty("--theme-bg", c.bg);
    root.style.setProperty("--theme-bg-secondary", c.bgSecondary);
    root.style.setProperty("--theme-bg-tertiary", c.bgTertiary);
    root.style.setProperty("--theme-text", c.text);
    root.style.setProperty("--theme-text-secondary", c.textSecondary);
    root.style.setProperty("--theme-card", c.card);
    root.style.setProperty("--theme-card-border", c.cardBorder);
    root.style.setProperty("--theme-button", c.button);
    root.style.setProperty("--theme-button-hover", c.buttonHover);
    root.style.setProperty("--theme-shadow", c.shadow);
    root.style.setProperty("--theme-glow", c.glow);
    root.style.setProperty("--theme-type", `"${currentTheme.effects.type}"`);
  }, [currentTheme]);

  return (
    <ThemeContext.Provider value={{ currentTheme, changeTheme, themes: THEMES }}>
      <div
        style={{
          opacity: transitioning ? 0 : 1,
          transition: "opacity 0.4s ease",
        }}
      >
        {children}
      </div>
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
