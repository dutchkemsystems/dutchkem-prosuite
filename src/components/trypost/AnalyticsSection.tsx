import { StatCard } from "../ui/StatCard";

export function AnalyticsSection({ analytics }: { analytics: any }) {
  if (!analytics || analytics.authError) {
    return (
      <div className="bg-slate-900/30 border border-slate-700 rounded-3xl p-8 text-center text-slate-400">
        No analytics available yet.
      </div>
    );
  }
  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Published" value={analytics.summary?.postsPublished ?? 0} icon="📅" color="emerald" />
        <StatCard label="Impressions" value={analytics.summary?.totalImpressions ?? 0} icon="👁️" color="blue" />
        <StatCard label="Engagement" value={analytics.summary?.totalEngagement ?? 0} icon="💬" color="purple" />
        <StatCard
          label="Engagement Rate"
          value={`${(analytics.summary?.engagementRate ?? 0).toFixed(1)}%`}
          icon="📈"
          color="amber"
        />
      </div>
      {analytics.byPlatform && Object.keys(analytics.byPlatform).length > 0 && (
        <div className="bg-slate-900/50 border border-slate-700 rounded-3xl p-6">
          <h3 className="text-lg font-bold text-white mb-4">🌐 By Platform (7d)</h3>
          <div className="space-y-2">
            {Object.entries(analytics.byPlatform).map(([platform, data]: any) => (
              <div key={platform} className="bg-slate-800/30 rounded-xl p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-white font-bold capitalize">{platform}</span>
                  <span className="text-xs text-emerald-300">{data.engagementRate.toFixed(1)}%</span>
                </div>
                <div className="grid grid-cols-4 gap-2 text-xs text-slate-400">
                  <div>👁️ {data.impressions}</div>
                  <div>❤️ {data.likes}</div>
                  <div>💬 {data.comments}</div>
                  <div>🔁 {data.shares}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
