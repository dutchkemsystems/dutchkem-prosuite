import { useState } from 'react'
import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'

const MODEL_COLORS: Record<string, string> = {
  groq: '#FBBF24', openrouter: '#60A5FA', aiml: '#A78BFA', mimo: '#34D399', nvidia: '#4ADE80',
}
const MODEL_ICONS: Record<string, string> = {
  groq: '⚡', openrouter: '🧠', aiml: '🎨', mimo: '🚀', nvidia: '🟢',
}

export function ModelAnalyticsPanel({ adminToken }: { adminToken: string }) {
  const [activeTab, setActiveTab] = useState<'overview' | 'performance' | 'tasks' | 'recent' | 'revenue'>('overview')
  const [revenuePeriod, setRevenuePeriod] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('daily')

  const overview: any = useQuery(api.model_analytics.getOverview, {})
  const performance: any = useQuery(api.model_analytics.getModelPerformance, {})
  const taskDist: any = useQuery(api.model_analytics.getTaskDistribution, {})
  const recent: any = useQuery(api.model_analytics.getRecentUsage, { limit: 30 })
  const revenue: any = useQuery(
    api.model_analytics.getModelRevenue,
    activeTab === "revenue" ? { period: revenuePeriod } : "skip"
  )

  if (!overview || !performance || !taskDist || !recent) {
    return (
      <div className="space-y-6">
        <h2 className="text-xl font-black">📊 Model Usage Analytics</h2>
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  const tabs = [
    { id: 'overview' as const, label: 'Overview', icon: '📊' },
    { id: 'performance' as const, label: 'Performance', icon: '⚡' },
    { id: 'tasks' as const, label: 'Tasks', icon: '🎯' },
    { id: 'revenue' as const, label: 'Revenue', icon: '💰' },
    { id: 'recent' as const, label: 'Recent', icon: '📋' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-black">📊 Model Usage Analytics</h2>
        <p className="text-xs text-slate-400 mt-1">Track AI model usage, performance, and reliability</p>
      </div>

      <div className="flex gap-1 bg-slate-800 rounded-xl p-1">
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === tab.id ? 'bg-orange-500 text-white' : 'text-slate-400 hover:text-white'
            }`}>
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <KPICard label="Total Requests" value={overview.total ?? 0} color="text-white" />
            <KPICard label="Success Rate" value={`${overview.successRate ?? 0}%`} color={parseFloat(overview.successRate ?? '0') >= 90 ? 'text-emerald-400' : 'text-amber-400'} />
            <KPICard label="Last Hour" value={overview.lastHour ?? 0} color="text-blue-400" />
            <KPICard label="Last 24h" value={overview.lastDay ?? 0} color="text-purple-400" />
            <KPICard label="Avg Response" value={`${overview.avgResponseTime ?? 0}ms`} color="text-cyan-400" />
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <h3 className="text-sm font-bold mb-3">Model Usage Breakdown</h3>
            <div className="space-y-3">
              {Object.entries(overview.byModel ?? {}).map(([model, data]: [string, any]) => (
                <div key={model} className="flex items-center gap-3">
                  <span className="text-lg">{MODEL_ICONS[model] || '🤖'}</span>
                  <span className="text-xs font-bold w-20">{model}</span>
                  <div className="flex-1 h-3 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{
                      width: `${overview.total > 0 ? (data.count / overview.total) * 100 : 0}%`,
                      backgroundColor: MODEL_COLORS[model] || '#666',
                    }} />
                  </div>
                  <span className="text-xs text-slate-400 w-16 text-right">{data.count} ({((data.count / Math.max(overview.total, 1)) * 100).toFixed(0)}%)</span>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <h3 className="text-sm font-bold mb-3">Requests Over Last 24 Hours</h3>
            <div className="flex items-end gap-1 h-24">
              {Object.entries(overview.hourlyTrend ?? {}).map(([hour, count]: [string, any]) => {
                const vals = Object.values(overview.hourlyTrend ?? {}) as number[];
                const maxCount = Math.max(...vals, 1);
                return (
                  <div key={hour} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full bg-orange-500 rounded-t" style={{ height: `${Math.max(((count ?? 0) / maxCount) * 100, 2)}%` }} title={`${hour}: ${count}`} />
                    {Object.keys(overview.hourlyTrend ?? {}).indexOf(hour) % 4 === 0 && (
                      <span className="text-[8px] text-slate-500">{hour}</span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
          {(overview.total ?? 0) === 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center">
              <p className="text-5xl mb-4">📊</p>
              <p className="text-sm font-bold text-slate-400">No usage data yet</p>
              <p className="text-xs text-slate-500 mt-2">Analytics populate as AI models are used</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'performance' && (
        <div className="space-y-4">
          {(performance ?? []).map((model: any) => (
            <div key={model.model} className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-2xl">{MODEL_ICONS[model.model] || '🤖'}</span>
                <h3 className="font-black">{model.model}</h3>
                <span className="px-3 py-1 bg-slate-800 rounded-full text-[10px] font-bold text-slate-400">{model.dayTotal} today</span>
              </div>
              <div className="grid grid-cols-4 gap-4">
                <div><p className="text-[10px] text-slate-500 uppercase">Calls</p><p className="text-lg font-black">{model.total}</p></div>
                <div><p className="text-[10px] text-slate-500 uppercase">Success</p><p className={`text-lg font-black ${parseFloat(model.successRate) >= 95 ? 'text-emerald-400' : parseFloat(model.successRate) >= 80 ? 'text-amber-400' : 'text-red-400'}`}>{model.successRate}%</p></div>
                <div><p className="text-[10px] text-slate-500 uppercase">Avg</p><p className="text-lg font-black">{model.avgResponseTime}ms</p></div>
                <div><p className="text-[10px] text-slate-500 uppercase">P95</p><p className="text-lg font-black">{model.p95ResponseTime}ms</p></div>
              </div>
              {Object.keys(model.errorsByTask ?? {}).length > 0 && (
                <div className="mt-3 pt-3 border-t border-slate-800">
                  <p className="text-[10px] text-red-400 font-bold mb-1">Errors by Task</p>
                  <div className="flex gap-2 flex-wrap">
                    {Object.entries(model.errorsByTask).map(([task, count]) => (
                      <span key={task} className="px-2 py-0.5 bg-red-500/10 text-red-400 rounded text-[10px]">{task}: {count as number}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {activeTab === 'tasks' && (
        <div className="space-y-4">
          {Object.entries(taskDist ?? {}).map(([task, data]: [string, any]) => (
            <div key={task} className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-black capitalize">{task.replace(/_/g, ' ')}</h3>
                <div className="flex gap-3">
                  <span className="text-xs text-slate-400">{data.count} req</span>
                  <span className={`text-xs font-bold ${parseFloat(data.successRate) >= 90 ? 'text-emerald-400' : 'text-amber-400'}`}>{data.successRate}% ok</span>
                  <span className="text-xs text-slate-400">{data.avgTime}ms</span>
                </div>
              </div>
              <div className="flex gap-2">
                {Object.entries(data.byModel ?? {}).map(([model, count]) => (
                  <div key={model} className="flex items-center gap-1 bg-slate-800 rounded-lg px-3 py-1.5">
                    <span className="text-xs">{MODEL_ICONS[model] || '🤖'}</span>
                    <span className="text-[10px] text-slate-400">{model}</span>
                    <span className="text-[10px] font-bold" style={{ color: MODEL_COLORS[model] }}>{count as number}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'revenue' && (
        <div className="space-y-4">
          <div className="flex gap-1 bg-slate-800 rounded-xl p-1">
            {(['daily', 'weekly', 'monthly', 'yearly'] as const).map(p => (
              <button key={p} onClick={() => setRevenuePeriod(p)}
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${revenuePeriod === p ? 'bg-emerald-500 text-white' : 'text-slate-400 hover:text-white'}`}>
                {p[0].toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>
          {!revenue && (
            <div className="flex justify-center py-10">
              <div className="w-6 h-6 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            </div>
          )}
          {revenue && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border border-emerald-500/20 rounded-2xl p-4 text-center">
                  <p className="text-2xl font-black text-emerald-400">₦{(revenue.grandTotalRevenue ?? 0).toLocaleString()}</p>
                  <p className="text-[10px] text-slate-500 uppercase mt-1">Revenue ({revenue.periodLabel})</p>
                </div>
                <KPICard label="Requests" value={(revenue.grandTotalRequests ?? 0).toLocaleString()} color="text-white" />
                <KPICard label="Avg/Request" value={`₦${revenue.avgRevenuePerRequest ?? 0}`} color="text-white" />
                <KPICard label="Tokens" value={`${((revenue.totalTokens ?? 0) / 1000).toFixed(0)}K`} color="text-white" />
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
                <h3 className="text-sm font-bold mb-3">Revenue by Model — {revenue.periodLabel}</h3>
                <div className="space-y-3">
                  {Object.entries(revenue.byModel ?? {})
                    .sort(([, a]: [string, any], [, b]: [string, any]) => (b.estimatedRevenue ?? 0) - (a.estimatedRevenue ?? 0))
                    .map(([model, data]: [string, any]) => {
                      const pct = (revenue.grandTotalRevenue ?? 0) > 0 ? ((data.estimatedRevenue ?? 0) / revenue.grandTotalRevenue) * 100 : 0;
                      return (
                        <div key={model} className="flex items-center gap-3">
                          <span className="text-lg">{MODEL_ICONS[model] || '🤖'}</span>
                          <span className="text-xs font-bold w-20">{model}</span>
                          <div className="flex-1 h-4 bg-slate-800 rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${Math.max(pct, 1)}%`, backgroundColor: MODEL_COLORS[model] || '#666' }} />
                          </div>
                          <span className="text-xs font-bold w-20 text-right text-emerald-400">₦{(data.estimatedRevenue ?? 0).toLocaleString()}</span>
                          <span className="text-[10px] text-slate-400 w-12 text-right">{pct.toFixed(0)}%</span>
                        </div>
                      );
                    })}
                </div>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                <table className="w-full">
                  <thead><tr className="border-b border-slate-800">
                    <th className="text-left px-4 py-3 text-[10px] text-slate-500 uppercase font-bold">Model</th>
                    <th className="text-right px-4 py-3 text-[10px] text-slate-500 uppercase font-bold">Requests</th>
                    <th className="text-right px-4 py-3 text-[10px] text-slate-500 uppercase font-bold">Tokens</th>
                    <th className="text-right px-4 py-3 text-[10px] text-slate-500 uppercase font-bold">Revenue</th>
                    <th className="text-right px-4 py-3 text-[10px] text-slate-500 uppercase font-bold">Avg/Req</th>
                    <th className="text-right px-4 py-3 text-[10px] text-slate-500 uppercase font-bold">Success</th>
                  </tr></thead>
                  <tbody>
                    {Object.entries(revenue.byModel ?? {})
                      .sort(([, a]: [string, any], [, b]: [string, any]) => (b.estimatedRevenue ?? 0) - (a.estimatedRevenue ?? 0))
                      .map(([model, d]: [string, any]) => (
                        <tr key={model} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                          <td className="px-4 py-3 text-xs font-bold">{MODEL_ICONS[model] || '🤖'} {model}</td>
                          <td className="px-4 py-3 text-right text-xs">{(d.totalRequests ?? 0).toLocaleString()}</td>
                          <td className="px-4 py-3 text-right text-xs">{((d.totalTokens ?? 0) / 1000).toFixed(0)}K</td>
                          <td className="px-4 py-3 text-right text-xs font-bold text-emerald-400">₦{(d.estimatedRevenue ?? 0).toLocaleString()}</td>
                          <td className="px-4 py-3 text-right text-xs">₦{d.avgRevenuePerRequest ?? 0}</td>
                          <td className="px-4 py-3 text-right"><span className={`text-[10px] px-2 py-0.5 rounded ${parseFloat(d.successRate ?? '0') >= 95 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>{d.successRate ?? '0'}%</span></td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
              <div className="bg-blue-500/5 border border-blue-500/20 rounded-2xl p-4 flex items-start gap-3">
                <span className="text-xl">📈</span>
                <div>
                  <p className="text-sm font-bold text-blue-400">Revenue Projection</p>
                  <p className="text-xs text-slate-400 mt-1">
                    Based on {revenue.periodLabel?.toLowerCase()} data, projected annual:
                    <span className="font-bold text-emerald-400 ml-1">₦{((revenue.grandTotalRevenue ?? 0) * (revenue.period === 'daily' ? 365 : revenue.period === 'weekly' ? 52 : revenue.period === 'monthly' ? 12 : 1)).toLocaleString()}</span>
                  </p>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {activeTab === 'recent' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          <table className="w-full">
            <thead><tr className="border-b border-slate-800">
              <th className="text-left px-4 py-3 text-[10px] text-slate-500 uppercase font-bold">Time</th>
              <th className="text-left px-4 py-3 text-[10px] text-slate-500 uppercase font-bold">Model</th>
              <th className="text-left px-4 py-3 text-[10px] text-slate-500 uppercase font-bold">Task</th>
              <th className="text-left px-4 py-3 text-[10px] text-slate-500 uppercase font-bold">Agent</th>
              <th className="text-center px-4 py-3 text-[10px] text-slate-500 uppercase font-bold">Status</th>
              <th className="text-right px-4 py-3 text-[10px] text-slate-500 uppercase font-bold">Time</th>
            </tr></thead>
            <tbody>
              {(recent ?? []).map((u: any, i: number) => (
                <tr key={i} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                  <td className="px-4 py-3 text-[10px] text-slate-500">{new Date(u.timestamp).toLocaleTimeString()}</td>
                  <td className="px-4 py-3 text-xs font-bold">{MODEL_ICONS[u.modelName] || '🤖'} {u.modelName}</td>
                  <td className="px-4 py-3"><span className="text-[10px] px-2 py-0.5 bg-slate-800 rounded">{u.taskType}</span></td>
                  <td className="px-4 py-3 text-[10px] text-slate-400">{u.agentId || '—'}</td>
                  <td className="px-4 py-3 text-center">
                    {u.success ? <span className="text-[10px] px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded">✓</span> : <span className="text-[10px] px-2 py-0.5 bg-red-500/10 text-red-400 rounded">✗</span>}
                  </td>
                  <td className="px-4 py-3 text-right text-[10px] text-slate-400">{u.responseTimeMs}ms</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function KPICard({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
      <p className={`text-xl font-black ${color}`}>{value}</p>
      <p className="text-[10px] text-slate-500 uppercase mt-1">{label}</p>
    </div>
  )
}
