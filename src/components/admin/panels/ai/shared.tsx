export { MetricCard } from "../shared";

export const roleColors: Record<string, string> = {
  admin: "bg-red-500/10 text-red-400",
  freelancer: "bg-blue-500/10 text-blue-400",
  user: "bg-emerald-500/10 text-emerald-400",
};

export const subStatusColors: Record<string, string> = {
  active: "bg-emerald-500/10 text-emerald-400",
  pending: "bg-amber-500/10 text-amber-400",
  canceled: "bg-slate-500/10 text-slate-400",
  expired: "bg-red-500/10 text-red-400",
  suspended: "bg-orange-500/10 text-orange-400",
};

export const platformNames: Record<string, string> = {
  x: "X (Twitter)",
  linkedin: "LinkedIn",
  facebook: "Facebook",
  instagram: "Instagram",
  tiktok: "TikTok",
  youtube: "YouTube",
  pinterest: "Pinterest",
  reddit: "Reddit",
  threads: "Threads",
  discord: "Discord",
  bluesky: "Bluesky",
};
