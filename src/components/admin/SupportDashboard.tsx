import { useState } from 'react'
import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'

const AGENT_NAMES: Record<string, string> = {
  A1: 'Academic Pro', A2: 'Business Pro', A3: 'Content Pro',
  A4: 'Career Pro', A5: 'Personal Shopper', A6: 'Exam Pro',
  A7: 'Finance Pro', A8: 'MediaStudio Pro', A9: 'Health Pro',
  A10: 'Home Services Pro', A11: 'Language Tutor', A12: 'Travel Planner',
  A13: 'ServiceMart NG', A14: 'Translation Hub', A15: 'Event Planner',
  GENERAL: 'General Support',
}

const AGENT_ICONS: Record<string, string> = {
  A1: '🎓', A2: '💼', A3: '✍️', A4: '📄', A5: '🛍️',
  A6: '📝', A7: '💰', A8: '🎬', A9: '🏥', A10: '🧹',
  A11: '🗣️', A12: '✈️', A13: '🚀', A14: '📝', A15: '🎉',
  GENERAL: '💬',
}

export function SupportDashboard() {
  const [activeTab, setActiveTab] = useState<'overview' | 'interactions' | 'escalations' | 'agents'>('overview')
  const [days, setDays] = useState(7)

  const analytics: any = useQuery(api.support_orchestrator.getSupportAnalytics, { days })
  const interactions: any = useQuery(api.support_orchestrator.getRecentInteractions, { limit: 50 })
  const escalations: any = useQuery(api.support_orchestrator.getPendingEscalations)
  const status: any = useQuery(api.support_orchestrator.getOrchestratorStatus)

  if (!analytics || !interactions) {
    return (
      <div className="space-y-6">
        <h2 className="text-xl font-black">🎧 Support Orchestrator</h2>
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  const tabs = [
    { id: 'overview' as const, label: 'Overview', icon: '📊' },
    { id: 'interactions' as const, label: 'Interactions', icon: '💬' },
    { id: 'escalations' as const, label: 'Escalations', icon: '🚨' },
    { id: 'agents' as const, label: 'Agents', icon: '🤖' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black">🎧 Support Orchestrator</h2>
          <p className="text-xs text-slate-400 mt-1">Multi-agent customer support analytics and monitoring</p>
        </div>
        <div className="flex items-center gap-2">
          <select value={days} onChange={(e) => setDays(Number(e.target.value))}
            className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white">
            <option value={1}>Last 24h</option>
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
          <span className={`px-3 py-1 rounded-full text-xs font-bold ${status?.isAvailable ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
            {status?.isAvailable ? '🟢 Online' : '🔴 Offline'}
          </span>
        </div>
      </div>

      <div className="flex gap-1 bg-slate-800 rounded-xl p-1">
        {tabs.map(s => (
          <button key={s.id} onClick={() => setActiveTab(s.id)}
            className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === s.id ? 'bg-orange-500 text-white' : 'text-slate-400 hover:text-white'
            }`}>
            {s.icon} {s.label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
              <p className="text-2xl font-black text-orange-400">{analytics.totalInteractions}</p>
              <p className="text-[10px] text-slate-500 uppercase">Total Interactions</p>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
              <p className="text-2xl font-black text-emerald-400">{analytics.routedCount}</p>
              <p className="text-[10px] text-slate-500 uppercase">Routed to Agent</p>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
              <p className="text-2xl font-black text-red-400">{analytics.pendingEscalations}</p>
              <p className="text-[10px] text-slate-500 uppercase">Pending Escalations</p>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
              <p className="text-2xl font-black text-blue-400">{analytics.avgResponseMs}ms</p>
              <p className="text-[10px] text-slate-500 uppercase">Avg Response</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <h3 className="font-bold text-sm mb-3">🎯 Confidence Distribution</h3>
              <div className="space-y-2">
                {Object.entries(analytics.confidenceCounts).map(([level, count]: [string, number]) => (
                  <div key={level} className="flex items-center justify-between">
                    <span className="text-xs text-slate-400 capitalize">{level}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2 bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{
                          width: `${analytics.totalInteractions ? (count / analytics.totalInteractions) * 100 : 0}%`,
                          backgroundColor: level === 'high' ? '#10b981' : level === 'medium' ? '#f59e0b' : '#ef4444',
                        }} />
                      </div>
                      <span className="text-xs font-bold text-white w-8 text-right">{count}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <h3 className="font-bold text-sm mb-3">📈 Daily Trend</h3>
              <div className="space-y-1">
                {analytics.dailyBreakdown.slice(-7).map((day: any) => (
                  <div key={day.date} className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">{day.date.slice(5)}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-orange-400">{day.interactions} interactions</span>
                      {day.escalations > 0 && <span className="text-red-400">{day.escalations} escalated</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <h3 className="font-bold text-sm mb-3">🤖 Model Configuration</h3>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-slate-800 rounded-xl p-3">
                <p className="text-[10px] text-slate-500 uppercase">Primary</p>
                <p className="text-xs font-bold text-emerald-400">{status?.primaryModel || 'N/A'}</p>
              </div>
              <div className="bg-slate-800 rounded-xl p-3">
                <p className="text-[10px] text-slate-500 uppercase">Fallback</p>
                <p className="text-xs font-bold text-yellow-400">{status?.fallbackModel || 'N/A'}</p>
              </div>
              <div className="bg-slate-800 rounded-xl p-3">
                <p className="text-[10px] text-slate-500 uppercase">Emergency</p>
                <p className="text-xs font-bold text-red-400">{status?.emergencyModel || 'N/A'}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'interactions' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-800">
                  <th className="text-left px-4 py-3 text-slate-500 font-bold">Time</th>
                  <th className="text-left px-4 py-3 text-slate-500 font-bold">Agent</th>
                  <th className="text-left px-4 py-3 text-slate-500 font-bold">Message</th>
                  <th className="text-left px-4 py-3 text-slate-500 font-bold">Confidence</th>
                  <th className="text-left px-4 py-3 text-slate-500 font-bold">Routed</th>
                </tr>
              </thead>
              <tbody>
                {interactions.map((i: any) => (
                  <tr key={i._id} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                    <td className="px-4 py-3 text-slate-400 whitespace-nowrap">
                      {new Date(i.createdAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-bold text-white">
                        {AGENT_ICONS[i.agentId] || '💬'} {AGENT_NAMES[i.agentId] || i.agentId}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-300 max-w-xs truncate">{i.message}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        i.confidence === 'high' ? 'bg-emerald-500/10 text-emerald-400' :
                        i.confidence === 'medium' ? 'bg-yellow-500/10 text-yellow-400' :
                        'bg-red-500/10 text-red-400'
                      }`}>
                        {i.confidence}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {i.routed ? (
                        <span className="text-emerald-400">✓</span>
                      ) : (
                        <span className="text-slate-500">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {interactions.length === 0 && (
            <div className="text-center py-10 text-slate-500 text-sm">No interactions yet</div>
          )}
        </div>
      )}

      {activeTab === 'escalations' && (
        <div className="space-y-3">
          {escalations && escalations.length > 0 ? escalations.map((e: any) => (
            <div key={e._id} className="bg-red-500/5 border border-red-500/20 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-bold text-red-400">🚨 Escalation</span>
                <span className="px-2 py-0.5 bg-yellow-500/10 text-yellow-400 rounded-full text-[10px] font-bold">
                  {e.status}
                </span>
              </div>
              <p className="text-xs text-slate-400">Agent: {AGENT_NAMES[e.agentId] || e.agentId}</p>
              <p className="text-xs text-slate-400">Reason: {e.reason}</p>
              <p className="text-[10px] text-slate-500 mt-1">{new Date(e.createdAt).toLocaleString()}</p>
            </div>
          )) : (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-10 text-center">
              <p className="text-lg mb-2">✅</p>
              <p className="text-sm text-slate-400">No pending escalations</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'agents' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {status?.agents?.map((agent: any) => {
            const count = analytics.agentCounts[agent.id] || 0
            return (
              <div key={agent.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">{agent.icon}</span>
                  <div>
                    <p className="text-sm font-bold text-white">{agent.name}</p>
                    <p className="text-[10px] text-slate-500">{agent.id}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">{count} interactions</span>
                  <div className="w-16 h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-orange-500 rounded-full" style={{
                      width: `${analytics.totalInteractions ? (count / analytics.totalInteractions) * 100 : 0}%`,
                    }} />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
