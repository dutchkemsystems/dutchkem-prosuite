export interface ThemeColors {
  primary: string;
  secondary: string;
  accent: string;
  text: string;
  card: string;
  cardBorder: string;
  button: string;
  buttonHover: string;
}

export interface ThemeEffects {
  particles: boolean;
  type: "nebula" | "sunset" | "ocean" | "aurora" | "sahara" | "jungle" | "cyberpunk" | "snow";
}

export interface Theme {
  id: string;
  name: string;
  icon: string;
  description: string;
  mood: string;
  colors: ThemeColors;
  effects: ThemeEffects;
  background: string;
}

export const THEMES: Record<string, Theme> = {
  NEBULA_DREAM: {
    id: "nebula-dream",
    name: "Nebula Dream",
    icon: "\u{1F30C}",
    description: "Cosmic, dreamy, mystical",
    mood: "Cosmic",
    colors: {
      primary: "#6C3CE1",
      secondary: "#00D4FF",
      accent: "#FF6B35",
      text: "#FFFFFF",
      card: "rgba(255,255,255,0.05)",
      cardBorder: "rgba(108,60,225,0.3)",
      button: "#6C3CE1",
      buttonHover: "#8B5CF6",
    },
    effects: { particles: true, type: "nebula" },
    background: "linear-gradient(135deg, #0F0C29, #302B63, #24243E)",
  },
  SUNSET_HORIZON: {
    id: "sunset-horizon",
    name: "Sunset Horizon",
    icon: "\u{1F305}",
    description: "Warm, calming, inspiring",
    mood: "Warm",
    colors: {
      primary: "#FF6B35",
      secondary: "#F7931E",
      accent: "#FF1493",
      text: "#FFFFFF",
      card: "rgba(255,107,53,0.08)",
      cardBorder: "rgba(255,107,53,0.25)",
      button: "#FF6B35",
      buttonHover: "#FF8C5A",
    },
    effects: { particles: true, type: "sunset" },
    background: "linear-gradient(135deg, #1A0A00, #FF512F, #F09819, #1A0A00)",
  },
  OCEAN_DEPTH: {
    id: "ocean-depth",
    name: "Ocean Depth",
    icon: "\u{1F30A}",
    description: "Serene, calm, professional",
    mood: "Serene",
    colors: {
      primary: "#0EA5E9",
      secondary: "#3B82F6",
      accent: "#10B981",
      text: "#FFFFFF",
      card: "rgba(14,165,233,0.06)",
      cardBorder: "rgba(14,165,233,0.2)",
      button: "#0EA5E9",
      buttonHover: "#38BDF8",
    },
    effects: { particles: true, type: "ocean" },
    background: "linear-gradient(135deg, #0F2027, #203A43, #2C5364)",
  },
  AURORA_BOREALIS: {
    id: "aurora-borealis",
    name: "Aurora Borealis",
    icon: "\u{1F320}",
    description: "Magical, vibrant, energetic",
    mood: "Magical",
    colors: {
      primary: "#8B5CF6",
      secondary: "#EC4899",
      accent: "#F59E0B",
      text: "#FFFFFF",
      card: "rgba(139,92,246,0.07)",
      cardBorder: "rgba(139,92,246,0.25)",
      button: "#8B5CF6",
      buttonHover: "#A78BFA",
    },
    effects: { particles: true, type: "aurora" },
    background: "linear-gradient(135deg, #0F172A, #1E1B4B, #0F172A)",
  },
  SAHARA_GOLD: {
    id: "sahara-gold",
    name: "Sahara Gold",
    icon: "\u{1F3DC}",
    description: "Warm, luxurious, earthy",
    mood: "Luxurious",
    colors: {
      primary: "#F59E0B",
      secondary: "#D97706",
      accent: "#78350F",
      text: "#FFFFFF",
      card: "rgba(245,158,11,0.06)",
      cardBorder: "rgba(245,158,11,0.2)",
      button: "#F59E0B",
      buttonHover: "#FBBF24",
    },
    effects: { particles: true, type: "sahara" },
    background: "linear-gradient(135deg, #1A120B, #2D1B0E, #3D2B1A)",
  },
  JUNGLE_OASIS: {
    id: "jungle-oasis",
    name: "Jungle Oasis",
    icon: "\u{1F334}",
    description: "Fresh, natural, vibrant",
    mood: "Fresh",
    colors: {
      primary: "#10B981",
      secondary: "#34D399",
      accent: "#F59E0B",
      text: "#FFFFFF",
      card: "rgba(16,185,129,0.06)",
      cardBorder: "rgba(16,185,129,0.2)",
      button: "#10B981",
      buttonHover: "#34D399",
    },
    effects: { particles: true, type: "jungle" },
    background: "linear-gradient(135deg, #064E3B, #065F46, #047857)",
  },
  CYBERPUNK_CITY: {
    id: "cyberpunk-city",
    name: "Cyberpunk City",
    icon: "\u{1F303}",
    description: "Edgy, futuristic, dynamic",
    mood: "Futuristic",
    colors: {
      primary: "#EC4899",
      secondary: "#8B5CF6",
      accent: "#06B6D4",
      text: "#FFFFFF",
      card: "rgba(236,72,153,0.07)",
      cardBorder: "rgba(236,72,153,0.25)",
      button: "#EC4899",
      buttonHover: "#F472B6",
    },
    effects: { particles: true, type: "cyberpunk" },
    background: "linear-gradient(135deg, #0F172A, #1E1B4B, #0C0A1A)",
  },
  SNOW_PEACE: {
    id: "snow-peace",
    name: "Snow Peace",
    icon: "\u{2744}\u{FE0F}",
    description: "Clean, minimal, peaceful",
    mood: "Peaceful",
    colors: {
      primary: "#94A3B8",
      secondary: "#CBD5E1",
      accent: "#3B82F6",
      text: "#FFFFFF",
      card: "rgba(148,163,184,0.06)",
      cardBorder: "rgba(148,163,184,0.15)",
      button: "#3B82F6",
      buttonHover: "#60A5FA",
    },
    effects: { particles: true, type: "snow" },
    background: "linear-gradient(135deg, #0F172A, #1E293B, #334155)",
  },
};

export const THEME_LIST = Object.values(THEMES);
export const DEFAULT_THEME = THEMES.NEBULA_DREAM;
export default THEMES;
