import { v } from "convex/values";
import { action, mutation, query, internalAction, internalMutation } from "./_generated/server";
import { tryGetAdminSession, tryGetAdminSessionInAction } from "./auth_helpers";

// ═══════════════════════════════════════════════════════════════════
// MULTI-LANGUAGE SUPPORT
// Serve multiple African markets with localized content
// ═══════════════════════════════════════════════════════════════════

const LANGUAGES = [
  { code: "en", name: "English", flag: "🇳🇬", regions: ["Nigeria", "Ghana", "Kenya"] },
  { code: "yo", name: "Yoruba", flag: "🇳🇬", regions: ["Lagos", "Oyo", "Ogun"] },
  { code: "ig", name: "Igbo", flag: "🇳🇬", regions: ["Anambra", "Enugu", "Abia"] },
  { code: "ha", name: "Hausa", flag: "🇳🇬", regions: ["Kano", "Kaduna", "Sokoto"] },
  { code: "sw", name: "Swahili", flag: "🇰🇪", regions: ["Kenya", "Tanzania", "Uganda"] },
  { code: "am", name: "Amharic", flag: "🇪🇹", regions: ["Ethiopia"] },
  { code: "fr", name: "French", flag: "🇫🇷", regions: ["Senegal", "Ivory Coast", "Cameroon"] },
  { code: "pt", name: "Portuguese", flag: "🇲🇿", regions: ["Mozambique", "Angola"] },
];

const TRANSLATIONS: Record<string, Record<string, string>> = {
  en: {
    welcome: "Welcome to DutchKem Prosuite",
    get_started: "Get Started",
    learn_more: "Learn More",
    contact_us: "Contact Us",
    pricing: "Pricing",
    features: "Features",
    support: "Support",
    login: "Login",
    register: "Register",
    dashboard: "Dashboard",
    settings: "Settings",
  },
  yo: {
    welcome: "Kaabo si DutchKem Prosuite",
    get_started: "Bere Si",
    learn_more: "Ko Si Ba Si",
    contact_us: "Wa Si Pa Si",
    pricing: "Iye Owo",
    features: "Awọn Ohun Inú",
    support: "Atilẹyin",
    login: "Wọ inú",
    register: "Ko si sin",
    dashboard: "Dashboard",
    settings: "Eto",
  },
  ig: {
    welcome: "Nnọọ na DutchKem Prosuite",
    get_started: "Bido Uzọ",
    learn_more: "Mụtakwa Ọzọ",
    contact_us: "Jikọọ Anyị",
    pricing: "Ego",
    features: "Ihe Ịmaa",
    support: "Nkwado",
    login: "Banye",
    register: "Nyochaa",
    dashboard: "Dashboard",
    settings: "Ntọala",
  },
  ha: {
    welcome: "Barka da zuwa DutchKem Prosuite",
    get_started: "Fara",
    learn_more: "Koyi ƙari",
    contact_us: "Tuntuɓi mu",
    pricing: "Farashi",
    features: "Abubuwan da ke ciki",
    support: "Taimako",
    login: "Shiga",
    register: "Yi rajista",
    dashboard: "Dashboard",
    settings: "Saituna",
  },
  sw: {
    welcome: "Karibu DutchKem Prosuite",
    get_started: "Anza",
    learn_more: "Jifunza zaidi",
    contact_us: "Wasiliana nasi",
    pricing: "Bei",
    features: "Vipengele",
    support: "Msaada",
    login: "Ingia",
    register: "Jiandikishe",
    dashboard: "Dashboard",
    settings: "Mipangilio",
  },
  fr: {
    welcome: "Bienvenue sur DutchKem Prosuite",
    get_started: "Commencer",
    learn_more: "En savoir plus",
    contact_us: "Contactez-nous",
    pricing: "Tarifs",
    features: "Fonctionnalités",
    support: "Support",
    login: "Connexion",
    register: "S'inscrire",
    dashboard: "Tableau de bord",
    settings: "Paramètres",
  },
};

export const getLanguages = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    return LANGUAGES;
  },
});

export const getTranslation = action({
  args: {
    language: v.string(),
    key: v.string(),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const translations = TRANSLATIONS[args.language] || TRANSLATIONS.en;
    return translations[args.key] || args.key;
  },
});

export const getTranslationBundle = action({
  args: {
    language: v.string(),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    return TRANSLATIONS[args.language] || TRANSLATIONS.en;
  },
});

export const detectLanguage = action({
  args: {
    text: v.string(),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const textLower = args.text.toLowerCase();
    
    // Simple language detection based on common words
    if (/\b(kaabo|owo|ilé|omo)\b/i.test(textLower)) return { language: "yo", confidence: 0.8 };
    if (/\b(nnọọ|mụtakwa|bido)\b/i.test(textLower)) return { language: "ig", confidence: 0.8 };
    if (/\b(barka|fara|koyi)\b/i.test(textLower)) return { language: "ha", confidence: 0.8 };
    if (/\b(karibu|wasiliana|jifunza)\b/i.test(textLower)) return { language: "sw", confidence: 0.8 };
    if (/\b(bienvenue|commencer|contactez)\b/i.test(textLower)) return { language: "fr", confidence: 0.8 };
    
    return { language: "en", confidence: 0.5 };
  },
});
