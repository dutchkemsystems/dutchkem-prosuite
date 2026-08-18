import { useState } from 'react'
import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'

const PROVIDER_ICONS: Record<string, string> = {
  freellmapi: '🆓', tencent: '🐉', cerebras: '⚡', mistral: '🌀',
  groq: '⚡', openrouter: '🧠', nvidia: '🟢', aiml: '🎨', mimo: '🚀',
}

export function OrchestratorDashboard({ adminToken }: { adminToken: string }) {
  const [activeTab, setActiveTab] = useState<'overview' | 'providers' | 'usecases' | 'models'>('overview')

  const health: any = useQuery(api.model_orchestrator.getProviderHealth)
  const useCases: any = useQuery(api.model_orchestrator.getUseCaseMapping)
  const costTiers: any = useQuery(api.model_orchestrator.getCostTiers)

  if (!health || !useCases || !costTiers) {
    return (
      <div className="space-y-6">
        <h2 className="text-xl font-black">🔄 Model Orchestrator</h2>
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  const healthyCount = health.providers?.filter((p: any) => p.health?.status === 'healthy')?.length || 0
  const degradedCount = health.providers?.filter((p: any) => p.health?.status === 'degraded')?.length || 0
  const totalModels = health.providers?.reduce((sum: number, p: any) => sum + (p.modelCount || 0), 0) || 0
  const freeModels = health.providers?.filter((p: any) => p.cost === 0)?.reduce((sum: number, p: any) => sum + (p.modelCount || 0), 0) || 0

  const tabs = [
    { id: 'overview' as const, label: 'Overview', icon: '📊' },
    { id: 'providers' as const, label: 'Providers', icon: '🔧' },
    { id: 'usecases' as const, label: 'Use Cases', icon: '🎯' },
    { id: 'models' as const, label: 'Models', icon: '🤖' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-black">🔄 Model Orchestrator</h2>
        <p className="text-xs text-slate-400 mt-1">9 providers, 14 use cases, 5 cost tiers, 5-retry failover</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <KPICard label="Providers" value={`${healthyCount}/${health.total || 9}`} icon="🔧" color={healthyCount === 9 ? 'emerald' : 'amber'} />
        <KPICard label="Healthy" value={healthyCount} icon="✅" color="emerald" />
        <KPICard label="Degraded" value={degradedCount} icon="⚠️" color={degradedCount > 0 ? 'amber' : 'slate'} />
        <KPICard label="Models" value={totalModels} icon="🤖" color="blue" />
        <KPICard label="Free" value={freeModels} icon="🆓" color="purple" />
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
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <h3 className="text-sm font-bold mb-4">Provider Health</h3>
            <div className="space-y-3">
              {health.providers?.map((p: any) => (
                <div key={p.name} className="flex items-center gap-3">
                  <span className="text-lg">{PROVIDER_ICONS[p.name] || '🤖'}</span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold">{p.displayName}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        p.health?.status === 'healthy' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
                      }`}>
                        {p.health?.status || 'unknown'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] text-slate-500">P{p.priority}</span>
                      <span className="text-[10px] text-slate-500">•</span>
                      <span className="text-[10px] text-slate-500">{p.modelCount} models</span>
                      <span className="text-[10px] text-slate-500">•</span>
                      <span className="text-[10px] text-slate-500">${p.cost}/1M</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <h3 className="text-sm font-bold mb-4">Cost Tiers</h3>
            <div className="space-y-3">
              {costTiers && Object.entries(costTiers).map(([tier, providers]: [string, any]) => (
                <div key={tier} className="bg-slate-800 rounded-xl p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold capitalize">{tier}</span>
                    <span className="text-[10px] text-slate-500">{Array.isArray(providers) ? providers.length : 0} providers</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {Array.isArray(providers) && providers.map((p: string) => (
                      <span key={p} className="text-[10px] px-2 py-0.5 bg-slate-700 rounded-full text-slate-300">
                        {PROVIDER_ICONS[p] || '🤖'} {p}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Providers Tab */}
      {activeTab === 'providers' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {health.providers?.map((p: any) => (
            <div key={p.name} className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-2xl">{PROVIDER_ICONS[p.name] || '🤖'}</span>
                <div>
                  <h3 className="text-sm font-bold">{p.displayName}</h3>
                  <p className="text-[10px] text-slate-500">Priority {p.priority} • {p.category}</p>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-500">Status</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    p.health?.status === 'healthy' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
                  }`}>
                    {p.health?.status || 'unknown'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-500">Cost</span>
                  <span className="text-[10px] font-bold text-white">{p.cost === 0 ? 'FREE' : `$${p.cost}/1M`}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-500">Models</span>
                  <span className="text-[10px] font-bold text-white">{p.modelCount}</span>
                </div>
                <div className="mt-3">
                  <span className="text-[10px] text-slate-500">Capabilities</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {p.capabilities?.map((c: string) => (
                      <span key={c} className="text-[9px] px-1.5 py-0.5 bg-slate-800 rounded text-slate-400">{c}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Use Cases Tab */}
      {activeTab === 'usecases' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <h3 className="text-sm font-bold mb-4">14 Use Case Mappings</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {useCases && Object.entries(useCases).map(([useCase, providers]: [string, any]) => (
              <div key={useCase} className="bg-slate-800 rounded-xl p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold capitalize">{useCase}</span>
                  <span className="text-[10px] text-slate-500">{Array.isArray(providers) ? providers.length : 0} providers</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {Array.isArray(providers) && providers.map((p: string, i: number) => (
                    <span key={p} className={`text-[10px] px-2 py-0.5 rounded-full ${
                      i === 0 ? 'bg-orange-500/20 text-orange-400 font-bold' : 'bg-slate-700 text-slate-300'
                    }`}>
                      {PROVIDER_ICONS[p] || '🤖'} {p}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Models Tab */}
      {activeTab === 'models' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <h3 className="text-sm font-bold mb-4">Available Models</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-slate-500 border-b border-slate-800">
                  <th className="pb-2 font-bold">Provider</th>
                  <th className="pb-2 font-bold">Category</th>
                  <th className="pb-2 font-bold">Cost</th>
                  <th className="pb-2 font-bold">Models</th>
                  <th className="pb-2 font-bold">Status</th>
                </tr>
              </thead>
              <tbody>
                {health.providers?.map((p: any) => (
                  <tr key={p.name} className="border-b border-slate-800/50">
                    <td className="py-2">
                      <span className="flex items-center gap-1">
                        {PROVIDER_ICONS[p.name]} {p.displayName}
                      </span>
                    </td>
                    <td className="py-2 text-slate-500">{p.category}</td>
                    <td className="py-2">{p.cost === 0 ? <span className="text-emerald-400 font-bold">FREE</span> : <span className="text-amber-400">${p.cost}/1M</span>}</td>
                    <td className="py-2 font-bold">{p.modelCount}</td>
                    <td className="py-2">
                      <span className={`w-2 h-2 rounded-full inline-block ${p.health?.status === 'healthy' ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

function KPICard({ label, value, icon, color }: { label: string; value: string | number; icon: string; color: string }) {
  const colorMap: Record<string, string> = {
    emerald: 'text-emerald-400', amber: 'text-amber-400', blue: 'text-blue-400',
    purple: 'text-purple-400', slate: 'text-slate-400',
  }
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">{icon}</span>
        <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">{label}</span>
      </div>
      <p className={`text-2xl font-black ${colorMap[color] || 'text-white'}`}>{value}</p>
    </div>
  )
}
