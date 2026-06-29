import { useState } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'

type HermesDashboardProps = {
  adminToken: string
}

export function HermesDashboard({ adminToken }: HermesDashboardProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'tasks' | 'healing' | 'platforms' | 'install'>('overview')
  const [toast, setToast] = useState<{ type: string; msg: string } | null>(null)
  const [taskInput, setTaskInput] = useState('')

  const status: any = useQuery(api.hermes_orchestrator.getStatus)
  const tasks: any = useQuery(api.hermes_orchestrator.getTasks, { limit: 20 })
  const healingLogs: any = useQuery(api.hermes_orchestrator.getHealingLogs, { limit: 20 })
  const platforms: any = useQuery(api.hermes_gateway.getPlatforms)
  const gatewayStats: any = useQuery(api.hermes_gateway.getGatewayStats)
  const installedServices: any = useQuery(api.hermes_auto_install.getInstalledServices)
  const availableServices: any = useQuery(api.hermes_auto_install.getAvailableServices)

  const startOrchestrator = useMutation(api.hermes_orchestrator.startOrchestrator)
  const stopOrchestrator = useMutation(api.hermes_orchestrator.stopOrchestrator)
  const runSelfHeal = useMutation(api.hermes_orchestrator.runSelfHeal)
  const delegateTask = useMutation(api.hermes_orchestrator.delegateTask)
  const togglePlatform = useMutation(api.hermes_gateway.togglePlatform)
  const installService = useMutation(api.hermes_auto_install.installService)

  const showToast = (type: string, msg: string) => {
    setToast({ type, msg })
    setTimeout(() => setToast(null), 4000)
  }

  const handleStart = async () => {
    try {
      await startOrchestrator({ adminToken })
      showToast('success', 'Hermes orchestrator started')
    } catch (e: any) { showToast('error', e.message) }
  }

  const handleStop = async () => {
    try {
      await stopOrchestrator({ adminToken })
      showToast('success', 'Hermes orchestrator stopped')
    } catch (e: any) { showToast('error', e.message) }
  }

  const handleSelfHeal = async () => {
    try {
      const result = await runSelfHeal({ adminToken })
      showToast('success', `Health check: ${result.results?.length || 0} items checked`)
    } catch (e: any) { showToast('error', e.message) }
  }

  const handleDelegate = async () => {
    if (!taskInput.trim()) return
    try {
      await delegateTask({ task: taskInput, adminToken })
      setTaskInput('')
      showToast('success', 'Task queued')
    } catch (e: any) { showToast('error', e.message) }
  }

  const handleTogglePlatform = async (platformId: string, enabled: boolean) => {
    try {
      await togglePlatform({ platformId, enabled, adminToken })
      showToast('success', `Platform ${enabled ? 'enabled' : 'disabled'}`)
    } catch (e: any) { showToast('error', e.message) }
  }

  const handleInstall = async (serviceId: string) => {
    try {
      await installService({ serviceId, adminToken })
      showToast('success', 'Installation queued')
    } catch (e: any) { showToast('error', e.message) }
  }

  const tabs = [
    { id: 'overview' as const, label: 'Overview', icon: '📊' },
    { id: 'tasks' as const, label: 'Tasks', icon: '📋' },
    { id: 'healing' as const, label: 'Self-Heal', icon: '🩺' },
    { id: 'platforms' as const, label: 'Platforms', icon: '🌐' },
    { id: 'install' as const, label: 'Install', icon: '📦' },
  ]

  if (!status) {
    return (
      <div className="space-y-6">
        <h2 className="text-xl font-black">🤖 Hermes AI Orchestrator</h2>
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black">🤖 Hermes AI Orchestrator</h2>
          <p className="text-xs text-slate-400 mt-1">Self-healing • Auto-diagnose • Multi-platform gateway</p>
        </div>
        <div className="flex gap-2">
          {!status.isRunning ? (
            <button onClick={handleStart} className="px-4 py-2 bg-emerald-500 text-white rounded-xl text-xs font-bold hover:bg-emerald-600">
              ▶ Start
            </button>
          ) : (
            <button onClick={handleStop} className="px-4 py-2 bg-red-500 text-white rounded-xl text-xs font-bold hover:bg-red-600">
              ⏹ Stop
            </button>
          )}
          <button onClick={handleSelfHeal} className="px-4 py-2 bg-blue-500 text-white rounded-xl text-xs font-bold hover:bg-blue-600">
            🩺 Run Check
          </button>
        </div>
      </div>

      <div className="flex gap-1 bg-slate-800 rounded-xl p-1">
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === tab.id ? 'bg-purple-500 text-white' : 'text-slate-400 hover:text-white'
            }`}>
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className={`rounded-2xl p-4 text-center ${status.isRunning ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-slate-900 border border-slate-800'}`}>
              <p className="text-2xl">{status.isRunning ? '🟢' : '🔴'}</p>
              <p className="text-[10px] text-slate-500 uppercase mt-1">Orchestrator</p>
            </div>
            <div className={`rounded-2xl p-4 text-center ${status.selfHealingActive ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-slate-900 border border-slate-800'}`}>
              <p className="text-2xl">{status.selfHealingActive ? '🟢' : '🔴'}</p>
              <p className="text-[10px] text-slate-500 uppercase mt-1">Self-Healing</p>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
              <p className="text-2xl font-black text-white">{status.tasksCompleted || 0}</p>
              <p className="text-[10px] text-slate-500 uppercase mt-1">Tasks Done</p>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
              <p className="text-2xl font-black text-emerald-400">{status.issuesFixed || 0}</p>
              <p className="text-[10px] text-slate-500 uppercase mt-1">Issues Fixed</p>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
            <h3 className="font-bold text-sm mb-3">📤 Delegate Task</h3>
            <div className="flex gap-2">
              <input type="text" value={taskInput} onChange={(e) => setTaskInput(e.target.value)}
                placeholder="Describe the task..."
                onKeyDown={(e) => e.key === 'Enter' && handleDelegate()}
                className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white" />
              <button onClick={handleDelegate} className="px-6 py-3 bg-purple-500 text-white rounded-xl text-sm font-bold hover:bg-purple-600">
                🚀 Delegate
              </button>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
            <h3 className="font-bold text-sm mb-3">🌐 Platform Gateway</h3>
            <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
              {platforms?.slice(0, 12).map((p: any) => (
                <div key={p.id} className={`p-2 rounded-xl text-center text-xs ${p.status === 'active' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-800 text-slate-500'}`}>
                  <span className="text-lg">{p.icon}</span>
                  <p className="mt-1 truncate">{p.name}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'tasks' && (
        <div className="space-y-4">
          <h3 className="font-black">📋 Task Queue</h3>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
            <table className="w-full">
              <thead><tr className="border-b border-slate-800">
                <th className="text-left px-4 py-3 text-[10px] text-slate-500 uppercase font-bold">Task</th>
                <th className="text-left px-4 py-3 text-[10px] text-slate-500 uppercase font-bold">Status</th>
                <th className="text-left px-4 py-3 text-[10px] text-slate-500 uppercase font-bold">Priority</th>
              </tr></thead>
              <tbody>
                {tasks?.map((t: any) => (
                  <tr key={t._id} className="border-b border-slate-800/50">
                    <td className="px-4 py-3 text-xs font-bold">{t.description}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        t.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400' :
                        t.status === 'running' ? 'bg-blue-500/10 text-blue-400' :
                        t.status === 'failed' ? 'bg-red-500/10 text-red-400' :
                        'bg-slate-700 text-slate-400'
                      }`}>{t.status}</span>
                    </td>
                    <td className="px-4 py-3 text-xs">{t.priority}</td>
                  </tr>
                ))}
                {(!tasks || tasks.length === 0) && (
                  <tr><td colSpan={3} className="px-4 py-8 text-center text-xs text-slate-500">No tasks yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'healing' && (
        <div className="space-y-4">
          <h3 className="font-black">🩺 Self-Healing Logs</h3>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
            <table className="w-full">
              <thead><tr className="border-b border-slate-800">
                <th className="text-left px-4 py-3 text-[10px] text-slate-500 uppercase font-bold">Time</th>
                <th className="text-left px-4 py-3 text-[10px] text-slate-500 uppercase font-bold">Component</th>
                <th className="text-left px-4 py-3 text-[10px] text-slate-500 uppercase font-bold">Action</th>
                <th className="text-right px-4 py-3 text-[10px] text-slate-500 uppercase font-bold">Fixes</th>
              </tr></thead>
              <tbody>
                {healingLogs?.map((log: any) => (
                  <tr key={log._id} className="border-b border-slate-800/50">
                    <td className="px-4 py-3 text-xs text-slate-400">{new Date(log.timestamp).toLocaleString()}</td>
                    <td className="px-4 py-3 text-xs font-bold">{log.component}</td>
                    <td className="px-4 py-3 text-xs">{log.action}</td>
                    <td className="px-4 py-3 text-right text-xs text-emerald-400">{log.fixesApplied}</td>
                  </tr>
                ))}
                {(!healingLogs || healingLogs.length === 0) && (
                  <tr><td colSpan={4} className="px-4 py-8 text-center text-xs text-slate-500">No healing logs yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'platforms' && (
        <div className="space-y-4">
          <h3 className="font-black">🌐 Platform Gateway ({platforms?.length || 0} platforms)</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {platforms?.map((p: any) => (
              <div key={p.id} className={`rounded-2xl border-l-4 p-4 transition-all ${
                p.status === 'active' ? 'bg-emerald-500/5 border-l-emerald-500' : 'bg-slate-900 border-l-slate-700'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{p.icon}</span>
                    <div>
                      <p className="font-black text-sm">{p.name}</p>
                      <p className="text-[10px] text-slate-400">{p.number || p.description || p.id}</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" checked={p.status === 'active'}
                      onChange={(e) => handleTogglePlatform(p.id, e.target.checked)}
                      className="sr-only peer" />
                    <div className="w-11 h-6 bg-slate-700 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-500" />
                  </label>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'install' && (
        <div className="space-y-4">
          <h3 className="font-black">📦 Auto-Installation</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {availableServices?.map((s: any) => {
              const installed = installedServices?.find((i: any) => i.serviceId === s.id)
              return (
                <div key={s.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-black text-sm">{s.name}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      installed?.status === 'installed' ? 'bg-emerald-500/10 text-emerald-400' :
                      installed?.status === 'installing' ? 'bg-blue-500/10 text-blue-400' :
                      'bg-slate-700 text-slate-400'
                    }`}>{installed?.status || 'available'}</span>
                  </div>
                  <p className="text-xs text-slate-400 mb-3">{s.description}</p>
                  <button onClick={() => handleInstall(s.id)}
                    disabled={installed?.status === 'installed' || installed?.status === 'installing'}
                    className="w-full py-2 bg-purple-500 text-white rounded-xl text-xs font-bold hover:bg-purple-600 disabled:opacity-50 disabled:bg-slate-700">
                    {installed?.status === 'installed' ? '✅ Installed' : installed?.status === 'installing' ? '⏳ Installing...' : '📦 Install'}
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {toast && (
        <div className={`fixed bottom-6 right-6 px-5 py-3 rounded-2xl shadow-2xl z-50 animate-pulse ${
          toast.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'
        }`}>
          <p className="text-sm font-bold">{toast.msg}</p>
        </div>
      )}
    </div>
  )
}
