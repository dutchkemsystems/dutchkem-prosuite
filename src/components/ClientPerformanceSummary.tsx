import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

export function ClientPerformanceSummary() {
  const summary = useQuery(api.composioClient.getPerformanceSummary, {});

  if (!summary) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8">
        <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-black text-white uppercase tracking-tight">Performance Summary</h3>
        <span className="text-[9px] text-purple-500 font-bold uppercase">Value Delivered</span>
      </div>

      {/* This Week */}
      <div className="mb-6">
        <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mb-3">This Week</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatBox label="Actions" value={summary.thisWeek?.totalActions || 0} icon="⚡" />
          <StatBox label="Success Rate" value={`${summary.thisWeek?.successRate || 0}%`} icon="✅" />
          <StatBox label="Platforms" value={summary.thisWeek?.platformsUsed || 0} icon="📱" />
          <StatBox label="Agents" value={summary.thisWeek?.agentsUsed || 0} icon="🤖" />
        </div>
      </div>

      {/* This Month */}
      <div className="mb-6">
        <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mb-3">This Month</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatBox label="Actions" value={summary.thisMonth?.totalActions || 0} icon="⚡" />
          <StatBox label="Success Rate" value={`${summary.thisMonth?.successRate || 0}%`} icon="✅" />
          <StatBox label="Platforms" value={summary.thisMonth?.platformsUsed || 0} icon="📱" />
          <StatBox label="Agents" value={summary.thisMonth?.agentsUsed || 0} icon="🤖" />
        </div>
      </div>

      {/* Platform Breakdown */}
      {Object.keys(summary.platformStats || {}).length > 0 && (
        <div>
          <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mb-3">Platform Activity</p>
          <div className="space-y-2">
            {Object.entries(summary.platformStats || {}).map(([platform, data]: [string, any]) => (
              <div key={platform} className="flex items-center justify-between p-3 bg-slate-950 rounded-xl border border-white/5">
                <div className="flex items-center gap-3">
                  <span className="text-sm">{getPlatformIcon(platform)}</span>
                  <span className="text-xs font-bold text-white capitalize">{platform}</span>
                </div>
                <div className="flex items-center gap-3 text-[10px]">
                  <span className="text-emerald-500 font-bold">{data.success} success</span>
                  <span className="text-slate-500">{data.actions} total</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Agent Breakdown */}
      {Object.keys(summary.agentStats || {}).length > 0 && (
        <div className="mt-6">
          <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mb-3">Agent Activity</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {Object.entries(summary.agentStats || {}).map(([agent, data]: [string, any]) => (
              <div key={agent} className="p-3 bg-slate-950 rounded-xl border border-white/5 text-center">
                <p className="text-sm font-black text-white">{agent}</p>
                <p className="text-[9px] text-emerald-500 font-bold">{data.success} success</p>
                <p className="text-[9px] text-slate-500">{data.actions} total</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {summary.thisWeek?.totalActions === 0 && summary.thisMonth?.totalActions === 0 && (
        <div className="text-center py-8">
          <p className="text-3xl mb-2">📊</p>
          <p className="text-sm text-slate-500 font-bold">No activity data yet</p>
          <p className="text-[10px] text-slate-600">Performance metrics will appear as agents work for you</p>
        </div>
      )}
    </div>
  );
}

function StatBox({ label, value, icon }: { label: string; value: string | number; icon: string }) {
  return (
    <div className="p-4 bg-slate-950 rounded-2xl border border-white/5 text-center">
      <span className="text-lg">{icon}</span>
      <p className="text-xl font-black text-white mt-1">{value}</p>
      <p className="text-[8px] text-slate-500 uppercase font-bold">{label}</p>
    </div>
  );
}

function getPlatformIcon(platform: string): string {
  const icons: Record<string, string> = {
    twitter: "🐦", linkedin: "💼", facebook: "📘", youtube: "📺",
    reddit: "🤖", discord: "💬", instagram: "📸", tiktok: "🎵",
    pinterest: "📌", threads: "🧵", bluesky: "🦋", telegram: "✈️",
  };
  return icons[platform] ?? "📱";
}
