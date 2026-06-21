import { useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { api } from '../../../../convex/_generated/api'

export function MarketplaceTab({ token }: { token: string }) {
  const agents: any[] = useQuery(api.enterprise_marketplace.listAgents) || []
  const installedData: any[] = useQuery(api.enterprise_marketplace.getInstalledAgents, token ? { token } : 'skip') || []
  const installAgent = useMutation(api.enterprise_marketplace.installAgent)
  const uninstallAgent = useMutation(api.enterprise_marketplace.uninstallAgent)

  const [filter, setFilter] = useState('all')
  const [processing, setProcessing] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [selectedAgent, setSelectedAgent] = useState<any>(null)

  const installedIds = installedData.map((i: any) => i.templateId)
  const categories: string[] = ['all', ...Array.from(new Set(agents.map((a: any) => String(a.category || ''))))]
  const filtered = filter === 'all' ? agents : agents.filter((a: any) => a.category === filter)

  const showToast = (msg: string, isError = false) => {
    if (isError) setError(msg)
    else setSuccess(msg)
    setTimeout(() => { setError(''); setSuccess('') }, 3000)
  }

  const handleInstall = async (agent: any) => {
    setProcessing(agent.id)
    try {
      const result = await installAgent({ token, templateId: agent.id, templateName: agent.name } as any)
      if (result.error) { showToast(result.error, true); return }
      showToast(`"${agent.name}" installed successfully!`)
    } catch (e: any) { showToast(e.message || 'Install failed', true) }
    finally { setProcessing(null) }
  }

  const handleUninstall = async (agent: any) => {
    setProcessing(agent.id)
    try {
      const installRecord = installedData.find((i: any) => i.templateId === agent.id)
      if (!installRecord) { showToast('Agent not installed', true); return }
      const result = await uninstallAgent({ token, installId: installRecord._id } as any)
      if (result.error) { showToast(result.error, true); return }
      showToast(`"${agent.name}" uninstalled`)
    } catch (e: any) { showToast(e.message || 'Uninstall failed', true) }
    finally { setProcessing(null) }
  }

  return (
    <div className="space-y-6 ">
      {(error || success) && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl text-sm font-black ${error ? 'bg-red-600 text-white' : 'bg-emerald-600 text-white'}`}>
          {error || success}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black tracking-tight">Agent Marketplace</h2>
          <p className="text-sm text-slate-400 mt-1">Install pre-built AI agents for your organization</p>
        </div>
        <div className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl">
          <span className="text-xs font-black text-slate-500">INSTALLED:</span>
          <span className="text-sm font-black text-emerald-400 ml-2">{installedIds.length}</span>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {categories.map(cat => (
          <button key={cat} onClick={() => setFilter(cat)}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
              filter === cat ? 'bg-orange-500 text-white' : 'bg-white/5 text-slate-400 hover:bg-white/10'
            }`}>
            {cat}
          </button>
        ))}
      </div>

      {/* Detail Modal */}
      {selectedAgent && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setSelectedAgent(null)}>
          <div className="bg-slate-900 border border-white/10 rounded-2xl p-8 max-w-lg w-full space-y-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-4">
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-3xl bg-gradient-to-br ${selectedAgent.color}`}>
                {selectedAgent.icon}
              </div>
              <div>
                <h3 className="text-xl font-black">{selectedAgent.name}</h3>
                <p className="text-xs text-slate-500 uppercase">{selectedAgent.category}</p>
              </div>
            </div>
            <p className="text-sm text-slate-400">{selectedAgent.description}</p>
            <div>
              <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Features</p>
              <div className="space-y-2">
                {selectedAgent.features?.map((f: string, i: number) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-slate-300">
                    <span className="text-emerald-400">✓</span> {f}
                  </div>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-lg font-black text-orange-400">
                {selectedAgent.price === 0 ? 'Free' : `₦${selectedAgent.price.toLocaleString()}`}
              </span>
              {installedIds.includes(selectedAgent.id) ? (
                <button onClick={() => { handleUninstall(selectedAgent); setSelectedAgent(null) }}
                  disabled={processing === selectedAgent.id}
                  className="px-6 py-3 bg-red-500/10 text-red-400 border border-red-500/20 font-black text-sm rounded-xl hover:bg-red-500/20 transition-all disabled:opacity-50">
                  {processing === selectedAgent.id ? 'Processing...' : 'Uninstall'}
                </button>
              ) : (
                <button onClick={() => { handleInstall(selectedAgent); setSelectedAgent(null) }}
                  disabled={processing === selectedAgent.id}
                  className="px-6 py-3 bg-orange-500 text-white font-black text-sm rounded-xl hover:bg-orange-600 transition-all disabled:opacity-50">
                  {processing === selectedAgent.id ? 'Installing...' : 'Install Agent'}
                </button>
              )}
            </div>
            <button onClick={() => setSelectedAgent(null)} className="w-full text-center text-xs text-slate-500 font-bold hover:text-white transition-colors">Close</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map((agent: any) => {
          const isInstalled = installedIds.includes(agent.id)
          return (
            <div key={agent.id}
              className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all group cursor-pointer"
              onClick={() => setSelectedAgent(agent)}>
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl mb-4 bg-gradient-to-br ${agent.color} group-hover:scale-110 transition-transform`}>
                {agent.icon}
              </div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">{agent.category}</p>
              <h3 className="font-black text-lg mb-2">{agent.name}</h3>
              <p className="text-xs text-slate-400 mb-3 line-clamp-2">{agent.description}</p>
              <div className="flex items-center gap-4 text-xs text-slate-400 mb-4">
                <span>⭐ {agent.rating}</span>
                <span>📥 {agent.installs.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between" onClick={e => e.stopPropagation()}>
                <span className="text-sm font-black text-orange-400">
                  {agent.price === 0 ? 'Free' : `₦${agent.price.toLocaleString()}`}
                </span>
                <button
                  onClick={() => isInstalled ? handleUninstall(agent) : handleInstall(agent)}
                  disabled={processing === agent.id}
                  className={`px-4 py-2 rounded-xl text-xs font-black transition-all disabled:opacity-50 ${
                    isInstalled
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'bg-orange-500 text-white hover:bg-orange-600'
                  }`}>
                  {processing === agent.id ? '...' : isInstalled ? '✓ Installed' : 'Install'}
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
