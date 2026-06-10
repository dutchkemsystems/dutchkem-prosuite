import { useState } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../../convex/_generated/api'

export function AdminMarketplace({ adminToken, organizations }: { adminToken: string, agents: any[], organizations: any[] }) {
  const [filter, setFilter] = useState('all')
  const [selectedOrg, setSelectedOrg] = useState(organizations[0]?._id || '')
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const marketplaceAgents = useQuery(api.enterprise_marketplace.listAgents, { category: filter !== 'all' ? filter : undefined })
  const installedAgents = useQuery(api.enterprise_marketplace.getInstalledAgents, selectedOrg ? { orgId: selectedOrg as any, adminToken } : "skip")
  const installAgent = useMutation(api.enterprise_marketplace.installAgent)
  const uninstallAgent = useMutation(api.enterprise_marketplace.uninstallAgent)

  const agents = marketplaceAgents || []
  const installed = installedAgents || []
  const installedIds = new Set(installed.map((i: any) => i.templateId))

  const categories = ['all', ...new Set(agents.map((a: any) => a.category))]

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  const handleInstall = async (agent: any) => {
    if (!selectedOrg) { showToast('Select an organization first', 'error'); return }
    try {
      const result: any = await installAgent({ templateId: agent.id, templateName: agent.name, orgId: selectedOrg as any, adminToken })
      if (result?.error) { showToast(result.error, 'error'); return }
      showToast(`${agent.name} installed!`, 'success')
    } catch (e: any) { showToast(e.message || 'Install failed', 'error') }
  }

  const handleUninstall = async (installId: string) => {
    try {
      await uninstallAgent({ installId: installId as any, adminToken })
      showToast('Uninstalled successfully', 'success')
    } catch (e: any) { showToast(e.message || 'Uninstall failed', 'error') }
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl text-sm font-black ${toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-emerald-600 text-white'}`}>
          {toast.message}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black tracking-tight">Agent Marketplace</h2>
          <p className="text-sm text-slate-400 mt-1">Install and manage enterprise agents per organization</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedOrg}
            onChange={(e) => setSelectedOrg(e.target.value)}
            className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-[#FF6B35]/50"
          >
            <option value="" className="bg-[#0a0a0f]">Select organization...</option>
            {organizations.map((o: any) => <option key={o._id} value={o._id} className="bg-[#0a0a0f]">{o.name}</option>)}
          </select>
          <div className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-slate-300">
            {agents.length} Agents
          </div>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {categories.map((cat) => (
          <button key={cat} onClick={() => setFilter(cat)} className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 ${filter === cat ? 'bg-[#FF6B35] text-white' : 'bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10'}`}>
            {cat}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {agents.map((agent: any) => {
          const isInstalled = installedIds.has(agent.id)
          return (
            <div key={agent.id} className="bg-white/5 border border-white/10 rounded-2xl p-5 hover:border-[#FF6B35]/30 hover:bg-[#FF6B35]/5 transition-all duration-300 group">
              <div className="flex items-start justify-between mb-3">
                <div className="px-2.5 py-1 bg-[#FF6B35]/10 border border-[#FF6B35]/20 rounded-lg text-[10px] font-black text-[#FF6B35]">{agent.category}</div>
                {isInstalled && <span className="px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 text-[9px] rounded-full font-bold">INSTALLED</span>}
              </div>
              <h3 className="text-base font-black text-white mb-2 group-hover:text-[#FF6B35] transition-colors">{agent.name}</h3>
              <p className="text-xs text-slate-400 leading-relaxed mb-3">{agent.description}</p>
              {agent.capabilities && (
                <div className="flex flex-wrap gap-1 mb-3">
                  {agent.capabilities.slice(0, 3).map((cap: string) => (
                    <span key={cap} className="px-1.5 py-0.5 bg-white/5 border border-white/10 rounded text-[9px] text-slate-400">{cap}</span>
                  ))}
                </div>
              )}
              <div className="flex items-center justify-between text-[10px] text-slate-500 mb-3">
                {agent.price !== undefined && <span>₦{agent.price?.toLocaleString()}</span>}
                {agent.complexity && <span className="capitalize">{agent.complexity}</span>}
                {agent.estimatedTime && <span>{agent.estimatedTime}</span>}
              </div>
              <div className="flex gap-2">
                {isInstalled ? (
                  <button onClick={() => {
                    const install = installed.find((i: any) => i.templateId === agent.id)
                    if (install) handleUninstall(install._id)
                  }} className="flex-1 px-3 py-2 bg-red-500/20 border border-red-500/30 text-red-400 rounded-xl text-xs font-black hover:bg-red-500/30 transition-all duration-200">
                    Uninstall
                  </button>
                ) : (
                  <button onClick={() => handleInstall(agent)} className="flex-1 px-3 py-2 bg-[#FF6B35] hover:bg-[#FF8255] text-white rounded-xl text-xs font-black transition-all duration-200">
                    Install
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {selectedOrg && installed.length > 0 && (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
          <h3 className="text-sm font-black text-slate-300 mb-3">Installed Agents ({installed.length})</h3>
          <div className="space-y-2">
            {installed.map((inst: any) => (
              <div key={inst._id} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                <div>
                  <span className="text-sm text-white font-bold">{inst.templateName}</span>
                  <span className="text-[10px] text-slate-500 ml-2">Installed {new Date(inst.installedAt).toLocaleDateString()}</span>
                </div>
                <button onClick={() => handleUninstall(inst._id)} className="px-2 py-1 bg-red-500/20 border border-red-500/30 rounded-lg text-[10px] font-bold text-red-400 hover:bg-red-500/30 transition-all duration-200">Remove</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
