export const PLATFORM_CHAR_LIMITS: Record<string, number> = {
  twitter: 280,
  linkedin: 3000,
  facebook: 63206,
  instagram: 2200,
  threads: 500,
  tiktok: 2200,
  youtube: 5000,
  pinterest: 500,
  reddit: 40000,
  bluesky: 300,
  telegram: 4096,
  discord: 2000,
};

export const PLATFORM_BEST_HOURS: Record<string, number[]> = {
  twitter: [8, 12, 17, 21],
  linkedin: [8, 12, 17],
  facebook: [9, 13, 16, 19],
  instagram: [11, 14, 19, 21],
  threads: [9, 12, 18, 21],
  tiktok: [6, 10, 19, 22],
  youtube: [15, 17, 20],
  pinterest: [14, 20, 22],
  reddit: [6, 9, 12, 18, 22],
  bluesky: [9, 13, 19],
  telegram: [10, 14, 19, 22],
  discord: [16, 19, 21, 23],
};

export const TRENDING_TOPICS: { topic: string; category: string; score: number; hashtags: string[] }[] = [
  { topic: "AI agents for small business", category: "ai", score: 95, hashtags: ["#AI", "#SmallBusiness", "#Automation"] },
  { topic: "Renewable energy in Africa", category: "sustainability", score: 89, hashtags: ["#RenewableEnergy", "#Africa", "#Sustainability"] },
  { topic: "Remote work productivity", category: "productivity", score: 87, hashtags: ["#RemoteWork", "#Productivity", "#WorkFromAnywhere"] },
  { topic: "Fintech in Nigeria", category: "finance", score: 92, hashtags: ["#Fintech", "#Nigeria", "#Payments"] },
  { topic: "WhatsApp marketing for SMEs", category: "marketing", score: 84, hashtags: ["#WhatsApp", "#Marketing", "#SME"] },
  { topic: "Cybersecurity tips for founders", category: "security", score: 81, hashtags: ["#CyberSecurity", "#Startups", "#Founders"] },
  { topic: "African creator economy", category: "creator", score: 88, hashtags: ["#CreatorEconomy", "#Africa", "#Content"] },
  { topic: "Voice AI and customer support", category: "ai", score: 90, hashtags: ["#VoiceAI", "#CustomerSupport", "#AI"] },
  { topic: "Mobile money and cross-border payments", category: "finance", score: 86, hashtags: ["#MobileMoney", "#Payments", "#Fintech"] },
  { topic: "TikTok for B2B lead generation", category: "marketing", score: 78, hashtags: ["#TikTok", "#B2B", "#LeadGen"] },
  { topic: "Sustainable fashion brands", category: "ecommerce", score: 75, hashtags: ["#SustainableFashion", "#Ecommerce", "#Green"] },
  { topic: "Mental health for entrepreneurs", category: "wellness", score: 83, hashtags: ["#MentalHealth", "#Entrepreneur", "#Wellness"] },
];
