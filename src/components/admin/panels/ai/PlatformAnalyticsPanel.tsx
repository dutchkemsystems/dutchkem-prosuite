import { useState } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { convexQuery } from "@convex-dev/react-query";
import { api } from "../../../../../convex/_generated/api";
import { MetricCard } from "./shared";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell, Legend } from "recharts";

export function PlatformAnalyticsPanel() {
  const [timeRange, setTimeRange] = useState<"day" | "week" | "month" | "year">("month");
  const { data: analytics } = useSuspenseQuery(convexQuery(api.platform_analytics.getPlatformAnalyticsSummary, { timeRange })) as { data: any };
  const { data: dailyMetrics } = useSuspenseQuery(convexQuery(api.platform_analytics.getDailyPlatformMetrics, { days: timeRange === "day" ? 1 : timeRange === "week" ? 7 : timeRange === "month" ? 30 : 365 })) as { data: any };

  const totals = analytics?.totals || {};
  const platforms = analytics?.platforms || [];

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard label="Total Visits" value={(totals.visits || 0).toLocaleString()} icon="👁️" color="blue" />
        <MetricCard label="Registrations" value={(totals.registrations || 0).toLocaleString()} icon="👥" color="emerald" />
        <MetricCard label="Subscriptions" value={(totals.subscriptions || 0).toLocaleString()} icon="💳" color="amber" />
        <MetricCard label="Revenue" value={`₦${(totals.revenue || 0).toLocaleString()}`} icon="💰" color="indigo" />
      </div>

      <div className="flex gap-2">
        {(["day", "week", "month", "year"] as const).map((range) => (
          <button
            key={range}
            onClick={() => setTimeRange(range)}
            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
              timeRange === range
                ? "bg-orange-600 text-white"
                : "bg-slate-800 text-slate-500 hover:bg-slate-700"
            }`}
          >
            {range}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <h3 className="text-sm font-black uppercase tracking-tight text-white mb-4">Daily Trend</h3>
          {dailyMetrics && dailyMetrics.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dailyMetrics}>
                  <defs>
                    <linearGradient id="visitsGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#64748b' }} tickFormatter={(v: string) => v.slice(5)} />
                  <YAxis tick={{ fontSize: 10, fill: '#64748b' }} />
                  <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 12, fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Area type="monotone" dataKey="visits" stroke="#3b82f6" fill="url(#visitsGrad)" strokeWidth={2} name="Visits" />
                  <Area type="monotone" dataKey="registrations" stroke="#f59e0b" fill="transparent" strokeWidth={2} name="Registrations" strokeDasharray="5 5" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-slate-500 text-xs">No daily data available</div>
          )}
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <h3 className="text-sm font-black uppercase tracking-tight text-white mb-4">Revenue Split</h3>
          {platforms.some((p: any) => p.revenue > 0) ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={platforms.filter((p: any) => p.revenue > 0)}
                    dataKey="revenue"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {platforms.filter((p: any) => p.revenue > 0).map((_: any, i: number) => (
                      <Cell key={i} fill={['#FF6B35', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'][i % 8]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => `₦${v.toLocaleString()}`} contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 12, fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-slate-500 text-xs">No revenue data yet</div>
          )}
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <h3 className="text-sm font-black uppercase tracking-tight text-white mb-6">Conversion Funnel</h3>
        <div className="flex items-center justify-between gap-2">
          {[
            { label: 'Visits', value: totals.visits || 0, color: 'bg-blue-500' },
            { label: 'Registrations', value: totals.registrations || 0, color: 'bg-emerald-500' },
            { label: 'Subscriptions', value: totals.subscriptions || 0, color: 'bg-amber-500' },
            { label: 'Revenue', value: totals.revenue || 0, color: 'bg-indigo-500', isCurrency: true },
          ].map((step, i, arr) => {
            const maxWidth = arr[0].value || 1;
            const widthPct = Math.max((step.value / maxWidth) * 100, 8);
            return (
              <div key={step.label} className="flex-1 flex flex-col items-center gap-2">
                <div className="w-full relative">
                  <div className={`${step.color} rounded-xl h-12 flex items-center justify-center transition-all`} style={{ width: `${widthPct}%`, margin: '0 auto', minWidth: 48 }}>
                    <span className="text-xs font-black text-white">{step.isCurrency ? `₦${step.value.toLocaleString()}` : step.value.toLocaleString()}</span>
                  </div>
                </div>
                <span className="text-[10px] text-slate-400 font-bold uppercase">{step.label}</span>
                {i < arr.length - 1 && arr[i + 1].value > 0 && (
                  <span className="text-[9px] text-slate-600">{((arr[i + 1].value / Math.max(step.value, 1)) * 100).toFixed(1)}%</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <h3 className="text-sm font-black uppercase tracking-tight text-white mb-6">Platform Performance</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {platforms.map((platform: any) => (
            <div key={platform.id} className="bg-slate-950 border border-white/5 rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className="text-xl">{platform.icon}</span>
                  <div>
                    <p className="text-sm font-bold text-white">{platform.name}</p>
                    <p className="text-[9px] text-slate-500">{platform.conversionRate}% conversion</p>
                  </div>
                </div>
                <span className="text-sm font-black text-emerald-400">₦{platform.revenue.toLocaleString()}</span>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-slate-500">Visits</span>
                  <span className="text-slate-300 font-bold">{platform.visits.toLocaleString()}</span>
                </div>
                <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full" style={{ width: `${totals.visits ? (platform.visits / totals.visits) * 100 : 0}%` }} />
                </div>
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-slate-500">Registrations</span>
                  <span className="text-slate-300 font-bold">{platform.registrations.toLocaleString()}</span>
                </div>
                <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${totals.registrations ? (platform.registrations / totals.registrations) * 100 : 0}%` }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
