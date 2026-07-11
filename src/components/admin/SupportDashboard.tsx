import { useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { AutoResponseRulesPanel } from './AutoResponseRulesPanel'

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
  const [activeTab, setActiveTab] = useState<'overview' | 'interactions' | 'escalations' | 'agents' | 'rules' | 'settings'>('overview')
  const [days, setDays] = useState(7)

  const analytics: any = useQuery(api.support_orchestrator.getSupportAnalytics, { days })
  const interactions: any = useQuery(api.support_orchestrator.getRecentInteractions, { limit: 50 })
  const escalations: any = useQuery(api.support_orchestrator.getPendingEscalations)
  const status: any = useQuery(api.support_orchestrator.getOrchestratorStatus)
  const agentStates: any = useQuery(api.support_orchestrator.getAgentStates)
  const toggleAgent = useMutation(api.support_orchestrator.toggleAgent)

  const handleToggleAgent = async (agentId: string, enabled: boolean) => {
    await toggleAgent({ agentId, enabled })
  }

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
    { id: 'rules' as const, label: 'Rules', icon: '⚙️' },
    { id: 'settings' as const, label: 'Settings', icon: '🔧' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black">🎧 Support Orchestrator</h2>
          <p className="text-xs text-slate-400 mt-1">Multi-agent customer support analytics, monitoring & configuration</p>
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
        <EscalationsTab escalations={escalations} />
      )}

      {activeTab === 'agents' && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <h3 className="text-sm font-black uppercase tracking-tight text-white mb-2">🤖 Agent Control</h3>
            <p className="text-xs text-slate-400 mb-4">Enable or disable agents for the support orchestrator. Disabled agents won't receive routed messages from clients.</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {Object.entries(AGENT_NAMES).filter(([id]) => id !== 'GENERAL').map(([id, name]) => {
                const enabled = agentStates?.[id] !== false
                const count = analytics.agentCounts?.[id] || 0
                return (
                  <div key={id} className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${
                    enabled ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-slate-950 border-red-500/20 opacity-60'
                  }`}>
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{AGENT_ICONS[id]}</span>
                      <div>
                        <p className="text-sm font-bold text-white">{name}</p>
                        <p className="text-[9px] text-slate-500">{id} · {count} interactions</p>
                      </div>
                    </div>
                    <button onClick={() => handleToggleAgent(id, !enabled)}
                      className={`w-11 h-6 rounded-full transition-all relative ${
                        enabled ? 'bg-emerald-500' : 'bg-slate-700'
                      }`}>
                      <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all ${
                        enabled ? 'left-5.5' : 'left-0.5'
                      }`} />
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'rules' && (
        <AutoResponseRulesPanel adminToken="" />
      )}

      {activeTab === 'settings' && (
        <SettingsTab />
      )}
    </div>
  )
}

function EscalationsTab({ escalations }: { escalations: any[] }) {
  const resolveEsc = useMutation(api.support_orchestrator.resolveEscalation)
  const assignEsc = useMutation(api.support_orchestrator.assignEscalation)
  const addResponse = useMutation(api.support_orchestrator.addEscalationResponse)
  const [resolution, setResolution] = useState<Record<string, string>>({})
  const [responseText, setResponseText] = useState<Record<string, string>>({})
  const [localStatus, setLocalStatus] = useState<Record<string, string>>({})

  const handleAssign = async (id: string) => {
    await assignEsc({ escalationId: id as any, assignedTo: "admin" })
    setLocalStatus(prev => ({ ...prev, [id]: "in_progress" }))
  }

  const handleResolve = async (id: string) => {
    const res = resolution[id] || "Resolved by admin"
    await resolveEsc({ escalationId: id as any, resolution: res })
    setLocalStatus(prev => ({ ...prev, [id]: "resolved" }))
  }

  const handleAddResponse = async (id: string) => {
    const text = responseText[id]
    if (!text) return
    await addResponse({ escalationId: id as any, response: text })
    setResponseText(prev => ({ ...prev, [id]: "" }))
  }

  const getStatus = (e: any) => localStatus[e._id] || e.status

  const statusColors: Record<string, string> = {
    pending: "bg-yellow-500/10 text-yellow-400",
    in_progress: "bg-blue-500/10 text-blue-400",
    resolved: "bg-emerald-500/10 text-emerald-400",
  }

  return (
    <div className="space-y-3">
      {escalations && escalations.length > 0 ? escalations.map((e: any) => {
        const status = getStatus(e)
        return (
          <div key={e._id} className={`bg-slate-900 border rounded-2xl p-4 ${
            status === 'resolved' ? 'border-emerald-500/20 opacity-60' :
            status === 'in_progress' ? 'border-blue-500/20' :
            'border-red-500/20'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white">🚨 Escalation</span>
                {e.assignedTo && (
                  <span className="text-[10px] text-slate-500">→ {e.assignedTo}</span>
                )}
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${statusColors[status] || statusColors.pending}`}>
                {status}
              </span>
            </div>
            <p className="text-xs text-slate-400">Agent: {AGENT_NAMES[e.agentId] || e.agentId}</p>
            <p className="text-xs text-slate-400">Reason: {e.reason}</p>
            <div className="flex items-center gap-3 mt-1">
              <p className="text-[10px] text-slate-500">Created: {new Date(e.createdAt).toLocaleString()}</p>
              {e.resolvedAt && (
                <p className="text-[10px] text-emerald-500">Resolved: {new Date(e.resolvedAt).toLocaleString()}</p>
              )}
            </div>

            {/* Response history */}
            {e.responses && e.responses.length > 0 && (
              <div className="mt-3 space-y-2">
                {e.responses.map((r: any, i: number) => (
                  <div key={i} className="bg-slate-800 rounded-lg p-2 text-[10px] text-slate-300">
                    <span className="text-slate-500">{new Date(r.timestamp).toLocaleTimeString()}</span> — {r.text}
                  </div>
                ))}
              </div>
            )}

            {/* Actions */}
            {status !== 'resolved' && (
              <div className="mt-3 space-y-2">
                {status === 'pending' && (
                  <button onClick={() => handleAssign(e._id)}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 rounded-lg text-[10px] font-bold text-white">
                    Take Ownership
                  </button>
                )}
                {status === 'in_progress' && (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={responseText[e._id] || ''}
                      onChange={(ev) => setResponseText(prev => ({ ...prev, [e._id]: ev.target.value }))}
                      onKeyDown={(ev) => { if (ev.key === 'Enter') handleAddResponse(e._id) }}
                      placeholder="Add response note..."
                      className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500"
                    />
                    <button onClick={() => handleAddResponse(e._id)}
                      className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-[10px] font-bold text-white">
                      Add Note
                    </button>
                  </div>
                )}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={resolution[e._id] || ''}
                    onChange={(ev) => setResolution(prev => ({ ...prev, [e._id]: ev.target.value }))}
                    placeholder="Resolution notes..."
                    className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500"
                  />
                  <button onClick={() => handleResolve(e._id)}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 rounded-lg text-[10px] font-bold text-white">
                    Resolve
                  </button>
                </div>
              </div>
            )}
          </div>
        )
      }) : (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-10 text-center">
          <p className="text-lg mb-2">✅</p>
          <p className="text-sm text-slate-400">No active escalations</p>
        </div>
      )}
    </div>
  )
}

function SettingsTab() {
  const status: any = useQuery(api.support_orchestrator.getOrchestratorStatus)
  const agentStates: any = useQuery(api.support_orchestrator.getAgentStates)
  const updateModelConfig = useMutation(api.support_orchestrator.updateModelConfig)
  const toggleAgent = useMutation(api.support_orchestrator.toggleAgent)

  const [primaryModel, setPrimaryModel] = useState('')
  const [fallbackModel, setFallbackModel] = useState('')
  const [emergencyModel, setEmergencyModel] = useState('')
  const [saved, setSaved] = useState(false)

  // Set initial values from status
  if (status && !primaryModel) {
    setPrimaryModel(status.primaryModel || '')
    setFallbackModel(status.fallbackModel || '')
    setEmergencyModel(status.emergencyModel || '')
  }

  const handleSaveModels = async () => {
    await updateModelConfig({ primaryModel, fallbackModel, emergencyModel })
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const handleToggleAgent = async (agentId: string, enabled: boolean) => {
    await toggleAgent({ agentId, enabled })
  }

  return (
    <div className="space-y-6">
      {saved && (
        <div className="p-4 rounded-2xl text-center text-sm font-black bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
          Model configuration saved!
        </div>
      )}

      {/* Model Configuration */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <h3 className="text-sm font-black uppercase tracking-tight text-white mb-4">🤖 Model Configuration</h3>
        <p className="text-xs text-slate-400 mb-4">Configure the AI models used for intent classification and support responses.</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Primary Model</label>
            <input type="text" value={primaryModel} onChange={(e) => setPrimaryModel(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white" />
          </div>
          <div>
            <label className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Fallback Model</label>
            <input type="text" value={fallbackModel} onChange={(e) => setFallbackModel(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white" />
          </div>
          <div>
            <label className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Emergency Model</label>
            <input type="text" value={emergencyModel} onChange={(e) => setEmergencyModel(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white" />
          </div>
        </div>
        <button onClick={handleSaveModels}
          className="mt-4 px-6 py-2.5 bg-orange-600 hover:bg-orange-700 rounded-xl text-xs font-black text-white transition-all">
          Save Model Config
        </button>
      </div>

      {/* Agent Toggles */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <h3 className="text-sm font-black uppercase tracking-tight text-white mb-4">🎛️ Agent Control</h3>
        <p className="text-xs text-slate-400 mb-4">Enable or disable individual agents. Disabled agents won't receive routed messages.</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {Object.entries(AGENT_NAMES).filter(([id]) => id !== 'GENERAL').map(([id, name]) => {
            const enabled = agentStates?.[id] !== false
            return (
              <div key={id} className={`flex items-center justify-between p-3 rounded-xl border ${
                enabled ? 'bg-slate-950 border-emerald-500/20' : 'bg-slate-950 border-red-500/20 opacity-60'
              }`}>
                <div className="flex items-center gap-2">
                  <span>{AGENT_ICONS[id]}</span>
                  <div>
                    <p className="text-xs font-bold text-white">{name}</p>
                    <p className="text-[9px] text-slate-500">{id}</p>
                  </div>
                </div>
                <button onClick={() => handleToggleAgent(id, !enabled)}
                  className={`w-10 h-5 rounded-full transition-all relative ${
                    enabled ? 'bg-emerald-500' : 'bg-slate-700'
                  }`}>
                  <div className={`w-4 h-4 bg-white rounded-full absolute top-0.5 transition-all ${
                    enabled ? 'left-5' : 'left-0.5'
                  }`} />
                </button>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
