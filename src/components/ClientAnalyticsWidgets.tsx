import { useState } from "react";
import { useQuery } from "convex/react";

import { api } from "../../convex/_generated/api";

// ═══════════════════════════════════════════════════════════════════
// CLIENT ANALYTICS DASHBOARD — User behavior insights
// ═══════════════════════════════════════════════════════════════════

export function ClientAnalyticsDashboard() {
  const [period, setPeriod] = useState<"7d" | "30d" | "90d">("7d");
  const analytics = useQuery(api.clientAnalytics.getUserAnalytics, { period });

  if (!analytics) return null;

  return (
    <div className="space-y-6">
      {/* Period Selector */}
      <div className="flex gap-2">
        {(["7d", "30d", "90d"] as const).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
              period === p
                ? "bg-indigo-600 text-white"
                : "bg-white/5 text-slate-400 hover:bg-white/10"
            }`}
          >
            {p === "7d" ? "7 Days" : p === "30d" ? "30 Days" : "90 Days"}
          </button>
        ))}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-2xl border border-white/5 bg-white/5 p-4 text-center">
          <div className="text-2xl font-black text-white">{analytics.totalEvents}</div>
          <div className="text-[10px] text-slate-400">Total Events</div>
        </div>
        <div className="rounded-2xl border border-white/5 bg-white/5 p-4 text-center">
          <div className="text-2xl font-black text-white">{analytics.uniqueSessions}</div>
          <div className="text-[10px] text-slate-400">Unique Sessions</div>
        </div>
        <div className="rounded-2xl border border-white/5 bg-white/5 p-4 text-center">
          <div className="text-2xl font-black text-white">
            {Math.round(analytics.avgSessionDuration / 60)}m
          </div>
          <div className="text-[10px] text-slate-400">Avg Session</div>
        </div>
        <div className="rounded-2xl border border-white/5 bg-white/5 p-4 text-center">
          <div className="text-2xl font-black text-white">
            {analytics.dailyActivity.length > 0
              ? Math.round(
                  analytics.dailyActivity.reduce((s, d) => s + d.count, 0) /
                    analytics.dailyActivity.length
                )
              : 0}
          </div>
          <div className="text-[10px] text-slate-400">Daily Avg</div>
        </div>
      </div>

      {/* Daily Activity Chart */}
      <div className="rounded-2xl border border-white/5 bg-white/5 p-4">
        <h4 className="mb-3 text-sm font-black text-white">📈 Daily Activity</h4>
        <div className="flex items-end gap-1 h-32">
          {analytics.dailyActivity.map((day, i) => {
            const maxCount = Math.max(...analytics.dailyActivity.map((d) => d.count));
            const height = maxCount > 0 ? (day.count / maxCount) * 100 : 0;
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div className="text-[8px] text-slate-500">{day.count}</div>
                <div
                  className="w-full bg-gradient-to-t from-indigo-500 to-purple-500 rounded-t"
                  style={{ height: `${height}%`, minHeight: "2px" }}
                />
                <div className="text-[8px] text-slate-500">
                  {new Date(day.date).toLocaleDateString("en", { weekday: "short" })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Top Pages */}
      {analytics.pageViews.length > 0 && (
        <div className="rounded-2xl border border-white/5 bg-white/5 p-4">
          <h4 className="mb-3 text-sm font-black text-white">📄 Top Pages</h4>
          <div className="space-y-2">
            {analytics.pageViews.map((item, i) => (
              <div key={i} className="flex items-center justify-between rounded-xl border border-white/5 bg-white/5 p-3">
                <div className="text-xs text-slate-400 truncate max-w-[200px]">{item.page}</div>
                <div className="text-xs font-bold text-white">{item.count}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Device & Browser Breakdown */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-2xl border border-white/5 bg-white/5 p-4">
          <h4 className="mb-3 text-sm font-black text-white">📱 Devices</h4>
          <div className="space-y-2">
            {analytics.devices.map((item, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <span className="text-slate-400 capitalize">{item.device}</span>
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-16 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-indigo-500"
                      style={{ width: `${item.percentage}%` }}
                    />
                  </div>
                  <span className="text-white font-bold">{item.percentage}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-white/5 bg-white/5 p-4">
          <h4 className="mb-3 text-sm font-black text-white">🌐 Browsers</h4>
          <div className="space-y-2">
            {analytics.browsers.map((item, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <span className="text-slate-400">{item.browser}</span>
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-16 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-purple-500"
                      style={{ width: `${item.percentage}%` }}
                    />
                  </div>
                  <span className="text-white font-bold">{item.percentage}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
