import { useState } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { useQueryClient } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { api } from '../../../convex/_generated/api'

export function ModelTogglePanel({ adminToken }: { adminToken: string }) {
  const [toggling, setToggling] = useState<string | null>(null)
  const [toast, setToast] = useState<{ type: string; message: string } | null>(null)
  const queryClient = useQueryClient()

  const stats = useQuery(api.model_toggle.getModelStats, {})
  const toggleModel = useMutation(api.model_toggle.toggleModel)
  const toggleMultiple = useMutation(api.model_toggle.toggleMultipleModels)
  const resetAll = useMutation(api.model_toggle.resetAllModels)

  const invalidate = () => {
    queryClient.invalidateQueries({
      queryKey: convexQuery(api.model_toggle.getModelStats, {}).queryKey,
    })
  }

  const showToast = (type: string, message: string) => {
    setToast({ type, message })
    setTimeout(() => setToast(null), 4000)
  }

  const handleToggle = async (modelName: string, currentEnabled: boolean) => {
    setToggling(modelName)
    try {
      const result = await toggleModel({ modelName, enabled: !currentEnabled, adminToken })
      if (result.success) {
        showToast('success', `${result.modelName} is now ${result.enabled ? 'ENABLED' : 'DISABLED'}`)
        invalidate()
      }
    } catch (e: any) {
      showToast('error', `Failed: ${e.message}`)
    } finally {
      setToggling(null)
    }
  }

  const handleToggleAll = async (enabled: boolean) => {
    setToggling('all')
    try {
      const toggles: Record<string, boolean> = {}
      stats?.models?.forEach((m: any) => { toggles[m.modelName] = enabled })
      await toggleMultiple({ toggles, adminToken })
      showToast('success', `All models ${enabled ? 'ENABLED' : 'DISABLED'}`)
      invalidate()
    } catch (e: any) {
      showToast('error', `Failed: ${e.message}`)
    } finally {
      setToggling(null)
    }
  }

  const handleResetAll = async () => {
    setToggling('all')
    try {
      await resetAll({ adminToken })
      showToast('success', 'All models reset to ENABLED')
      invalidate()
    } catch (e: any) {
      showToast('error', `Failed: ${e.message}`)
    } finally {
      setToggling(null)
    }
  }

  const models = stats?.models || []
  const totalModels = stats?.total || 0
  const enabledCount = stats?.enabled || 0
  const disabledCount = stats?.disabled || 0
  const recentLogs = stats?.recentLogs || []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black">🤖 AI Model Control Panel</h2>
          <p className="text-xs text-slate-400 mt-1">Enable or disable AI models globally across ALL dashboards</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
          <p className="text-2xl font-black text-white">{totalModels}</p>
          <p className="text-[10px] text-slate-500 uppercase">Total Models</p>
        </div>
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 text-center">
          <p className="text-2xl font-black text-emerald-400">{enabledCount}</p>
          <p className="text-[10px] text-slate-500 uppercase">Enabled</p>
        </div>
        <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 text-center">
          <p className="text-2xl font-black text-red-400">{disabledCount}</p>
          <p className="text-[10px] text-slate-500 uppercase">Disabled</p>
        </div>
      </div>

      <div className="flex gap-2">
        <button onClick={() => handleToggleAll(true)} disabled={toggling === 'all'}
          className="px-4 py-2 bg-emerald-500 text-white rounded-xl text-xs font-bold hover:bg-emerald-600 transition-all disabled:opacity-50">
          {toggling === 'all' ? '⏳...' : '✅ Enable All'}
        </button>
        <button onClick={() => handleToggleAll(false)} disabled={toggling === 'all'}
          className="px-4 py-2 bg-red-500 text-white rounded-xl text-xs font-bold hover:bg-red-600 transition-all disabled:opacity-50">
          {toggling === 'all' ? '⏳...' : '❌ Disable All'}
        </button>
        <button onClick={handleResetAll} disabled={toggling === 'all'}
          className="px-4 py-2 bg-slate-700 text-white rounded-xl text-xs font-bold hover:bg-slate-600 transition-all disabled:opacity-50">
          🔄 Reset All
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {models.map((model: any) => {
          const isEnabled = model.isEnabled
          const isTogglingThis = toggling === model.modelName
          return (
            <div key={model.modelName}
              className={`rounded-2xl border-l-4 p-5 transition-all ${
                isEnabled
                  ? 'bg-emerald-500/5 border-emerald-500/30 border-l-emerald-500'
                  : 'bg-red-500/5 border-red-500/30 border-l-red-500 opacity-70'
              }`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{model.icon}</span>
                  <div>
                    <p className="font-black text-sm">{model.displayName}</p>
                    <p className="text-[10px] text-slate-500">{model.providerType}</p>
                  </div>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  isEnabled ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                }`}>
                  {isEnabled ? '🟢 Active' : '🔴 Inactive'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mb-4">{model.description}</p>
              <div className="flex items-center gap-3">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={isEnabled}
                    onChange={() => handleToggle(model.modelName, isEnabled)}
                    disabled={isTogglingThis}
                    className="sr-only peer" />
                  <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500" />
                </label>
                <button onClick={() => handleToggle(model.modelName, isEnabled)}
                  disabled={isTogglingThis}
                  className={`px-4 py-1.5 rounded-lg text-[11px] font-bold transition-all disabled:opacity-50 ${
                    isEnabled ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20' : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                  }`}>
                  {isTogglingThis ? '⏳' : isEnabled ? 'Disable' : 'Enable'}
                </button>
              </div>
              {model.lastToggledAt && (
                <p className="text-[10px] text-slate-500 mt-2">
                  Last changed: {new Date(model.lastToggledAt).toLocaleString()}
                </p>
              )}
            </div>
          )
        })}
      </div>

      {recentLogs.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <h3 className="text-sm font-bold mb-3">📋 Recent Activity</h3>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {recentLogs.map((log: any, i: number) => (
              <div key={i} className="flex items-center gap-3 text-xs">
                <span className={`w-2 h-2 rounded-full ${log.enabled ? 'bg-emerald-400' : 'bg-red-400'}`} />
                <span className="text-slate-400">{new Date(log.timestamp).toLocaleTimeString()}</span>
                <span className="font-bold">{log.modelName}</span>
                <span className={log.enabled ? 'text-emerald-400' : 'text-red-400'}>{log.action}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-blue-500/5 border border-blue-500/20 rounded-2xl p-4 flex items-start gap-3">
        <span className="text-xl">🌍</span>
        <div>
          <p className="text-sm font-bold text-blue-400">Global Scope</p>
          <p className="text-xs text-slate-400 mt-1">
            Changes apply instantly to ALL areas: Client Dashboard, Enterprise Dashboard, Admin Dashboard,
            all 15 Agents (A1-A15), and all AI-powered features.
          </p>
        </div>
      </div>

      {toast && (
        <div className={`fixed bottom-6 right-6 px-5 py-3 rounded-2xl shadow-2xl z-50 animate-pulse ${
          toast.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'
        }`}>
          <p className="text-sm font-bold">{toast.message}</p>
        </div>
      )}
    </div>
  )
}
