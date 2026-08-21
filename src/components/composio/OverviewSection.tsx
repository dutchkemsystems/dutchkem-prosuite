import type { Period, Toolkit } from "./types";
import { PERIOD_OPTIONS } from "./types";
import { StatCard } from "../ui/StatCard";

export function OverviewSection({
  stats,
  observability,
  toolkits,
  toolkitDetails,
  period,
  setPeriod,
  onToolkitClick,
}: {
  stats: any;
  observability: any;
  toolkits: any;
  toolkitDetails: any[];
  period: string;
  setPeriod: (p: Period) => void;
  onToolkitClick: (tk: Toolkit) => void;
}) {
  return (
    <>
      <div className="flex flex-wrap gap-2">
        {PERIOD_OPTIONS.map((o) => (
          <button
            key={o.value}
            onClick={() => setPeriod(o.value as Period)}
            className={`px-3 py-1 rounded-xl text-xs font-bold ${
              period === o.value ? "bg-indigo-500 text-white" : "bg-slate-800 text-slate-300"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Invocations" value={observability?.summary?.totalInvocations ?? 0} icon="📊" color="indigo" />
        <StatCard label="Success Rate" value={`${(observability?.summary?.successRate ?? 100).toFixed(1)}%`} icon="✅" color="emerald" />
        <StatCard label="Failed" value={observability?.summary?.failedCount ?? 0} icon="❌" color="rose" />
        <StatCard label="Platforms" value={observability?.summary?.uniquePlatforms ?? 0} icon="🌐" color="blue" />
      </div>

      {observability?.hourlyBuckets && observability.hourlyBuckets.length > 0 && (
        <div className="bg-slate-900/50 border border-slate-700 rounded-3xl p-6">
          <h3 className="text-lg font-bold text-white mb-4">📈 Hourly Activity (24h)</h3>
          <div className="flex items-end gap-1 h-32">
            {observability.hourlyBuckets.map((b: any, i: number) => {
              const max = Math.max(...observability.hourlyBuckets.map((x: any) => x.total), 1);
              const heightPct = (b.total / max) * 100;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1 group">
                  <div
                    className="w-full bg-gradient-to-t from-indigo-500 to-purple-400 rounded-t"
                    style={{ height: `${heightPct}%`, minHeight: "2px" }}
                    title={`${b.hour}: ${b.total} calls`}
                  />
                  <span className="text-[8px] text-slate-500 hidden group-hover:inline">{b.hour}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {observability?.byPlatform && Object.keys(observability.byPlatform).length > 0 && (
        <div className="bg-slate-900/50 border border-slate-700 rounded-3xl p-6">
          <h3 className="text-lg font-bold text-white mb-4">🌐 By Platform</h3>
          <div className="space-y-2">
            {Object.entries(observability.byPlatform)
              .sort(([, a]: any, [, b]: any) => b.total - a.total)
              .slice(0, 10)
              .map(([platform, data]: any) => (
                <div key={platform} className="flex items-center gap-3">
                  <div className="w-32 text-sm text-slate-300 font-bold">{platform}</div>
                  <div className="flex-1 bg-slate-800 rounded-full h-4 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 to-emerald-300"
                      style={{ width: `${(data.success / Math.max(data.total, 1)) * 100}%` }}
                    />
                  </div>
                  <div className="text-xs text-slate-400 font-mono w-24 text-right">
                    {data.success}/{data.total}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {observability?.topTools && observability.topTools.length > 0 && (
        <div className="bg-slate-900/50 border border-slate-700 rounded-3xl p-6">
          <h3 className="text-lg font-bold text-white mb-4">🏆 Top Tools</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {observability.topTools.map((t: any, i: number) => (
              <div key={i} className="flex items-center justify-between bg-slate-800/50 rounded-xl px-3 py-2">
                <span className="text-sm text-slate-200 font-mono truncate">{t.action}</span>
                <span className="text-xs text-indigo-300 font-bold">{t.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {toolkits && toolkits.length > 0 && (
        <div className="bg-slate-900/50 border border-slate-700 rounded-3xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-white">🧰 Toolkit Catalog — Click to explore</h3>
            <span className="text-xs text-slate-400">{toolkits.length} toolkits · 10,000+ tools</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 max-h-96 overflow-y-auto">
            {toolkits.map((t: any) => {
              const detail = toolkitDetails.find((d: any) => d.toolkit === t.toolkit);
              const toolCount = detail?.toolCount ?? t.tools;
              return (
                <button
                  key={t.toolkit}
                  onClick={() => onToolkitClick({
                    toolkit: t.toolkit,
                    name: t.name,
                    icon: t.icon,
                    description: detail?.description ?? `${t.name} integration via Composio`,
                    tools: detail?.tools ?? [],
                  })}
                  className="bg-slate-800/50 hover:bg-indigo-500/20 hover:border-indigo-500/50 border border-slate-700 rounded-xl px-3 py-2 transition text-left"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{t.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-white font-bold truncate">{t.name}</div>
                      <div className="text-[10px] text-slate-400">{toolCount} tools · {t.category}</div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}
