// src/components/SocialProofFeed.tsx
// Live activity feed for the client dashboard
// Additive: reads from existing social_activities table

import { useSuspenseQuery } from "@tanstack/react-query";
import { convexQuery } from "@convex-dev/react-query";
import { api } from "../../convex/_generated/api";

const ACTIVITY_ICONS: Record<string, string> = {
  purchase: "💳",
  signup: "🎉",
  review: "⭐",
  download: "📥",
  subscription: "🔔",
  upgrade: "⬆️",
};

const ACTIVITY_COLORS: Record<string, string> = {
  purchase: "text-emerald-400 bg-emerald-500/10",
  signup: "text-blue-400 bg-blue-500/10",
  review: "text-amber-400 bg-amber-500/10",
  download: "text-purple-400 bg-purple-500/10",
  subscription: "text-cyan-400 bg-cyan-500/10",
  upgrade: "text-pink-400 bg-pink-500/10",
};

const ACTIVITY_MESSAGES: Record<string, string> = {
  purchase: "{name} just purchased {agent}",
  signup: "{name} just signed up",
  review: "{name} left a {agent} review",
  download: "{name} downloaded {agent}",
  subscription: "{name} subscribed to {agent}",
  upgrade: "{name} upgraded {agent}",
};

function formatMessage(act: any): string {
  const tpl = ACTIVITY_MESSAGES[act.type] || "{name} did something with {agent}";
  return tpl
    .replace("{name}", act.userName || "Someone")
    .replace("{agent}", act.agentName || "a service");
}

function timeAgo(ts: number): string {
  const seconds = Math.floor((Date.now() - ts) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function SocialProofFeed({ limit = 10 }: { limit?: number }) {
  const { data: activities } = useSuspenseQuery(convexQuery(api.socialProof.getRecentActivity, {}));

  if (!activities || activities.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center">
        <p className="text-sm text-slate-400">No recent activity yet. Be the first to make a move!</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900/80 to-slate-800/40 p-4">
      <div className="mb-3 flex items-center gap-2">
        <div className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
        <h3 className="text-sm font-semibold uppercase tracking-wider text-white">Live Activity</h3>
      </div>
      <ul className="space-y-2">
        {activities.slice(0, limit).map((act: any) => (
          <li
            key={act._id}
            className="flex items-start gap-3 rounded-lg bg-white/5 p-2.5 transition-colors hover:bg-white/10"
          >
            <div
              className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg text-base ${
                ACTIVITY_COLORS[act.type] || "text-slate-400 bg-slate-500/10"
              }`}
            >
              {ACTIVITY_ICONS[act.type] || "•"}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm text-white">{formatMessage(act)}</p>
              {act.amount && act.amount > 0 && (
                <p className="text-xs text-emerald-400">+₦{act.amount.toLocaleString()}</p>
              )}
            </div>
            <span className="flex-shrink-0 text-xs text-slate-500">{timeAgo(act.createdAt)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ActiveViewersCounter({ agentId }: { agentId: string }) {
  const { data } = useSuspenseQuery(convexQuery(api.socialProof.getActiveViewers, { agentId }));

  const count = (data as any)?.count || 0;
  if (count === 0) return null;

  return (
    <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-400">
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
      </span>
      {count} {count === 1 ? "person" : "people"} viewing now
    </div>
  );
}

export function ActivityStats() {
  const { data } = useSuspenseQuery(convexQuery(api.socialProof.getActivityStats, {}));

  if (!data) return null;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-center">
        <p className="text-2xl font-black text-white">{data.usedThisWeek}</p>
        <p className="text-xs text-slate-400">Used this week</p>
      </div>
      <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-center">
        <p className="text-2xl font-black text-white">{data.purchasesThisWeek}</p>
        <p className="text-xs text-slate-400">Purchases this week</p>
      </div>
      <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-center">
        <p className="text-2xl font-black text-emerald-400">₦{data.revenueThisWeek.toLocaleString()}</p>
        <p className="text-xs text-slate-400">Revenue this week</p>
      </div>
      <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-center">
        <p className="text-2xl font-black text-white">{data.usedThisMonth}</p>
        <p className="text-xs text-slate-400">Used this month</p>
      </div>
    </div>
  );
}
