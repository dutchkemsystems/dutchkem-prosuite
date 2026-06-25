import { useState } from 'react'
import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'

// ═══════════════════════════════════════════════════════════════════
// MODEL USAGE ANALYTICS DASHBOARD
// Track model usage, performance, success rates, task distribution
// ═══════════════════════════════════════════════════════════════════

const MODEL_COLORS: Record<string, string> = {
  groq: '#FBBF24',
  openrouter: '#60A5FA',
  aiml: '#A78BFA',
  mimo: '#34D399',
  nvidia: '#4ADE80',
}

const MODEL_ICONS: Record<string, string> = {
  groq: '⚡',
  openrouter: '🧠',
  aiml: '🎨',
  mimo: '🚀',
  nvidia: '🟢',
}

export function ModelAnalyticsPanel({ adminToken }: { adminToken: string }) {
  const [activeTab, setActiveTab] = useState<'overview' | 'performance' | 'tasks' | 'recent'>('overview')

  const overview = useQuery(api.model_analytics.getOverview, {})
  const performance = useQuery(api.model_analytics.getModelPerformance, {})
  const taskDist = useQuery(api.model_analytics.getTaskDistribution, {})
  const recent = useQuery(api.model_analytics.getRecentUsage, { limit: 30 })

  const tabs = [
    { id: 'overview' as const, label: 'Overview', icon: '📊' },
    { id: 'performance' as const, label: 'Model Performance', icon: '⚡' },
    { id: 'tasks' as const, label: 'Task Distribution', icon: '🎯' },
    { id: 'recent' as const, label: 'Recent Usage', icon: '📋' },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black">📊 Model Usage Analytics</h2>
          <p className="text-xs text-slate-400 mt-1">Track AI model usage, performance, and reliability</p>
        </div>
      </div>

      {/* Tabs */}
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

      {/* Overview Tab */}
      {activeTab === 'overview' && overview && (
        <div className="space-y-4">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <KPICard label="Total Requests" value={overview.total} color="text-white" />
            <KPICard label="Success Rate" value={`${overview.successRate}%`} color={parseFloat(overview.successRate) >= 90 ? 'text-emerald-400' : 'text-amber-400'} />
            <KPICard label="Last Hour" value={overview.lastHour} color="text-blue-400" />
            <KPICard label="Last 24h" value={overview.lastDay} color="text-purple-400" />
            <KPICard label="Avg Response" value={`${overview.avgResponseTime}ms`} color="text-cyan-400" />
          </div>

          {/* Model Breakdown */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <h3 className="text-sm font-bold mb-3">Model Usage Breakdown</h3>
            <div className="space-y-3">
              {Object.entries(overview.byModel).map(([model, data]) => (
                <div key={model} className="flex items-center gap-3">
                  <span className="text-lg">{MODEL_ICONS[model] || '🤖'}</span>
                  <span className="text-xs font-bold w-20">{model}</span>
                  <div className="flex-1 h-3 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{
                      width: `${overview.total > 0 ? (data.count / overview.total) * 100 : 0}%`,
                      backgroundColor: MODEL_COLORS[model] || '#666',
                    }} />
                  </div>
                  <span className="text-xs text-slate-400 w-16 text-right">{data.count} ({((data.count / Math.max(overview.total, 1)) * 100).toFixed(0)}%)</span>
                </div>
              ))}
            </div>
          </div>

          {/* Hourly Trend */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <h3 className="text-sm font-bold mb-3">Requests Over Last 24 Hours</h3>
            <div className="flex items-end gap-1 h-24">
              {Object.entries(overview.hourlyTrend).map(([hour, count]) => {
                const maxCount = Math.max(...Object.values(overview.hourlyTrend), 1);
                const height = (count / maxCount) * 100;
                return (
                  <div key={hour} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full bg-orange-500 rounded-t" style={{ height: `${Math.max(height, 2)}%` }} title={`${hour}: ${count}`} />
                    {Object.keys(overview.hourlyTrend).indexOf(hour) % 4 === 0 && (
                      <span className="text-[8px] text-slate-500">{hour}</span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Performance Tab */}
      {activeTab === 'performance' && performance && (
        <div className="space-y-4">
          {performance.map((model) => (
            <div key={model.model} className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-2xl">{MODEL_ICONS[model.model] || '🤖'}</span>
                <h3 className="font-black">{model.model}</h3>
                <span className="px-3 py-1 bg-slate-800 rounded-full text-[10px] font-bold text-slate-400">
                  {model.dayTotal} today
                </span>
              </div>
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <p className="text-[10px] text-slate-500 uppercase">Total Calls</p>
                  <p className="text-lg font-black">{model.total}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 uppercase">Success Rate</p>
                  <p className={`text-lg font-black ${parseFloat(model.successRate) >= 95 ? 'text-emerald-400' : parseFloat(model.successRate) >= 80 ? 'text-amber-400' : 'text-red-400'}`}>
                    {model.successRate}%
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 uppercase">Avg Response</p>
                  <p className="text-lg font-black">{model.avgResponseTime}ms</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 uppercase">P95 Latency</p>
                  <p className="text-lg font-black">{model.p95ResponseTime}ms</p>
                </div>
              </div>
              {Object.keys(model.errorsByTask).length > 0 && (
                <div className="mt-3 pt-3 border-t border-slate-800">
                  <p className="text-[10px] text-red-400 font-bold mb-1">Errors by Task</p>
                  <div className="flex gap-2 flex-wrap">
                    {Object.entries(model.errorsByTask).map(([task, count]) => (
                      <span key={task} className="px-2 py-0.5 bg-red-500/10 text-red-400 rounded text-[10px]">
                        {task}: {count}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Tasks Tab */}
      {activeTab === 'tasks' && taskDist && (
        <div className="space-y-4">
          {Object.entries(taskDist).map(([task, data]) => (
            <div key={task} className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-black capitalize">{task.replace(/_/g, ' ')}</h3>
                <div className="flex gap-3">
                  <span className="text-xs text-slate-400">{data.count} requests</span>
                  <span className={`text-xs font-bold ${parseFloat(data.successRate) >= 90 ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {data.successRate}% success
                  </span>
                  <span className="text-xs text-slate-400">{data.avgTime}ms avg</span>
                </div>
              </div>
              <div className="flex gap-2">
                {Object.entries(data.byModel).map(([model, count]) => (
                  <div key={model} className="flex items-center gap-1 bg-slate-800 rounded-lg px-3 py-1.5">
                    <span className="text-xs">{MODEL_ICONS[model] || '🤖'}</span>
                    <span className="text-[10px] text-slate-400">{model}</span>
                    <span className="text-[10px] font-bold" style={{ color: MODEL_COLORS[model] }}>{count}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Recent Usage Tab */}
      {activeTab === 'recent' && recent && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-800">
                <th className="text-left px-4 py-3 text-[10px] text-slate-500 uppercase font-bold">Time</th>
                <th className="text-left px-4 py-3 text-[10px] text-slate-500 uppercase font-bold">Model</th>
                <th className="text-left px-4 py-3 text-[10px] text-slate-500 uppercase font-bold">Task</th>
                <th className="text-left px-4 py-3 text-[10px] text-slate-500 uppercase font-bold">Agent</th>
                <th className="text-center px-4 py-3 text-[10px] text-slate-500 uppercase font-bold">Status</th>
                <th className="text-right px-4 py-3 text-[10px] text-slate-500 uppercase font-bold">Time</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((u, i) => (
                <tr key={i} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                  <td className="px-4 py-3 text-[10px] text-slate-500">{new Date(u.timestamp).toLocaleTimeString()}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs font-bold">{MODEL_ICONS[u.modelName] || '🤖'} {u.modelName}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-[10px] px-2 py-0.5 bg-slate-800 rounded">{u.taskType}</span>
                  </td>
                  <td className="px-4 py-3 text-[10px] text-slate-400">{u.agentId || '—'}</td>
                  <td className="px-4 py-3 text-center">
                    {u.success
                      ? <span className="text-[10px] px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded">✓</span>
                      : <span className="text-[10px] px-2 py-0.5 bg-red-500/10 text-red-400 rounded" title={u.errorMessage}>✗</span>
                    }
                  </td>
                  <td className="px-4 py-3 text-right text-[10px] text-slate-400">{u.responseTimeMs}ms</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Empty state */}
      {activeTab === 'overview' && overview && overview.total === 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center">
          <p className="text-5xl mb-4">📊</p>
          <p className="text-sm font-bold text-slate-400">No usage data yet</p>
          <p className="text-xs text-slate-500 mt-2">Analytics will populate as AI models are used across the platform</p>
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
