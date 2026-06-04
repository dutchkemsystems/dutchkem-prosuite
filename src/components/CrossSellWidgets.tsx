import { useQuery } from "convex/react";

import { api } from "../../convex/_generated/api";

// ═══════════════════════════════════════════════════════════════════
// CROSS-SELL CARD — Smart service recommendations
// ═══════════════════════════════════════════════════════════════════

interface CrossSellCardProps {
  planId: string;
  onDismiss?: () => void;
}

export function CrossSellCard({ planId, onDismiss }: CrossSellCardProps) {
  const crossSells = useQuery(api.crossSell.getCrossSells, { planId });

  if (!crossSells || crossSells.length === 0) return null;

  return (
    <div className="rounded-2xl border border-white/5 bg-white/5 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h4 className="text-sm font-black text-white">Recommended for You</h4>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="text-xs text-slate-500 hover:text-white"
          >
            Dismiss
          </button>
        )}
      </div>

      <div className="space-y-2">
        {crossSells.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between rounded-xl border border-white/5 bg-white/5 p-3 transition-all hover:border-indigo-500/30 hover:bg-indigo-500/5"
          >
            <div>
              <div className="text-sm font-bold text-white">{item.name}</div>
              <div className="text-[10px] text-slate-400">
                {item.price === 0 ? "Free" : `₦${item.price?.toLocaleString()}`}
              </div>
            </div>
            <button className="rounded-lg bg-indigo-600 px-3 py-1.5 text-[10px] font-bold text-white transition-colors hover:bg-indigo-500">
              Add
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// TRENDING SERVICES — Social proof widget
// ═══════════════════════════════════════════════════════════════════

export function TrendingServices() {
  const trending = useQuery(api.crossSell.getTrendingServices, {});

  if (!trending || trending.length === 0) return null;

  return (
    <div className="rounded-2xl border border-white/5 bg-white/5 p-4">
      <h4 className="mb-3 text-sm font-black text-white">🔥 Trending This Week</h4>

      <div className="space-y-2">
        {trending.map((service, i) => (
          <div
            key={service.planId}
            className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/5 p-3"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 text-xs font-bold text-white">
              #{i + 1}
            </div>
            <div className="flex-1">
              <div className="text-sm font-bold text-white">{service.name}</div>
              <div className="text-[10px] text-slate-400">
                {service.recentPurchases} purchased this week
              </div>
            </div>
            <div className="h-1.5 w-16 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500"
                style={{ width: `${service.popularityScore}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// PERSONALIZED RECOMMENDATIONS — AI-powered suggestions
// ═══════════════════════════════════════════════════════════════════

export function PersonalizedRecommendations() {
  const recommendations = useQuery(api.crossSell.getRecommendations, {});

  if (!recommendations || recommendations.length === 0) return null;

  return (
    <div className="rounded-2xl border border-white/5 bg-white/5 p-4">
      <h4 className="mb-3 text-sm font-black text-white">✨ Picked for You</h4>

      <div className="space-y-3">
        {recommendations.map((rec) => (
          <div
            key={rec.id}
            className="rounded-xl border border-white/5 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 p-4"
          >
            <div className="mb-1 flex items-center gap-2">
              <span className="rounded-full bg-indigo-500/20 px-2 py-0.5 text-[10px] font-bold text-indigo-400">
                {rec.type === "upgrade" ? "⬆️ Upgrade" : "🔗 Cross-sell"}
              </span>
              <span className="text-[10px] text-slate-500">Score: {rec.score}%</span>
            </div>
            <div className="text-sm font-bold text-white">{rec.name}</div>
            <div className="text-[10px] text-slate-400">{rec.reason}</div>
            <div className="mt-2 flex items-center justify-between">
              <span className="text-xs font-bold text-indigo-400">
                {rec.price === 0 ? "Free" : `₦${(rec.price || 0).toLocaleString()}`}
              </span>
              <button className="rounded-lg bg-indigo-600 px-3 py-1.5 text-[10px] font-bold text-white transition-colors hover:bg-indigo-500">
                Learn More
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
