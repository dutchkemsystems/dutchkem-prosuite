import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useQuery, useMutation } from 'convex/react'
import { useState, useEffect } from 'react'
import { api } from '../../../convex/_generated/api'
import { CompanyLogo } from '~/components/CompanyLogo'
import { WorkflowViewerTab } from '~/components/enterprise/capabilities/WorkflowViewerTab'
import { MarketplaceTab } from '~/components/enterprise/capabilities/MarketplaceTab'
import { KnowledgeGraphTab } from '~/components/enterprise/capabilities/KnowledgeGraphTab'
import { CompanionAgentTab } from '~/components/enterprise/capabilities/CompanionAgentTab'
import { AgenticPaymentsTab } from '~/components/enterprise/capabilities/AgenticPaymentsTab'
import { EmotionalAITab } from '~/components/enterprise/capabilities/EmotionalAITab'

export const Route = createFileRoute('/enterprise/dashboard')({
  component: EnterpriseDashboard,
})

const tabs = [
  { id: 'overview', icon: '📊', label: 'Overview' },
  { id: 'workflow', icon: '🔄', label: 'Workflows' },
  { id: 'marketplace', icon: '🛒', label: 'Agent Marketplace' },
  { id: 'knowledge', icon: '🧠', label: 'Knowledge Graph' },
  { id: 'companion', icon: '🤝', label: 'Companion Agent' },
  { id: 'payments', icon: '💳', label: 'Agentic Payments' },
  { id: 'emotional', icon: '💖', label: 'Emotional AI' },
]

function EnterpriseDashboard() {
  const navigate = useNavigate()
  const [token, setToken] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('overview')
  const logout = useMutation(api.enterprise_auth.logout)

  useEffect(() => {
    const t = localStorage.getItem('enterprise_token')
    if (!t) { navigate({ to: '/enterprise/login' }); return }
    setToken(t)
  }, [navigate])

  const org = useQuery(
    api.enterprise_auth.getOrgDetails,
    token ? { token } : 'skip'
  )

  const handleLogout = async () => {
    if (token) await logout({ token })
    localStorage.removeItem('enterprise_token')
    navigate({ to: '/enterprise/login' })
  }

  if (!token || !org) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const trialDaysLeft = org.trialEndsAt
    ? Math.max(0, Math.ceil((org.trialEndsAt - Date.now()) / (1000 * 60 * 60 * 24)))
    : null

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-72 bg-slate-900 border-r border-slate-800 flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-slate-800">
          <div className="flex items-center gap-3 mb-4">
            <CompanyLogo className="w-10 h-10" />
            <div>
              <p className="font-black text-sm tracking-tight">{org.name}</p>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest">{org.plan} Plan</p>
            </div>
          </div>
          {org.status === 'trial' && trialDaysLeft !== null && (
            <div className={`p-3 rounded-xl text-xs font-bold ${trialDaysLeft <= 3 ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-orange-500/10 text-orange-400 border border-orange-500/20'}`}>
              ⏳ {trialDaysLeft} days left in trial
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                activeTab === tab.id
                  ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <span className="text-lg">{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 space-y-2">
          <button
            onClick={() => navigate({ to: '/' })}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-slate-400 hover:bg-slate-800 hover:text-white transition-all"
          >
            <span>🏠</span>
            <span>Back to Home</span>
          </button>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-red-400 hover:bg-red-500/10 transition-all"
          >
            <span>🚪</span>
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto">
        {/* Top bar */}
        <header className="sticky top-0 z-10 bg-slate-950/80 backdrop-blur-xl border-b border-slate-800 px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-black tracking-tight">
              {tabs.find(t => t.id === activeTab)?.icon} {tabs.find(t => t.id === activeTab)?.label}
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              {org.industry ? `${org.industry} · ` : ''}{org.email}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
              org.status === 'active' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
              org.status === 'trial' ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' :
              'bg-red-500/10 text-red-400 border border-red-500/20'
            }`}>
              {org.status}
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="p-6">
          {activeTab === 'overview' && <OverviewTab org={org} token={token} />}
          {activeTab === 'workflow' && <WorkflowViewerTab token={token} />}
          {activeTab === 'marketplace' && <MarketplaceTab token={token} />}
          {activeTab === 'knowledge' && <KnowledgeGraphTab token={token} />}
          {activeTab === 'companion' && <CompanionAgentTab token={token} />}
          {activeTab === 'payments' && <AgenticPaymentsTab token={token} />}
          {activeTab === 'emotional' && <EmotionalAITab token={token} />}
        </div>
      </main>
    </div>
  )
}

function OverviewTab({ org, token }: { org: any; token: string }) {
  const capabilities = [
    { icon: '🔄', name: 'Workflows', desc: 'View and trigger assigned workflows', tab: 'workflow', color: 'from-violet-500 to-purple-600' },
    { icon: '🛒', name: 'Agent Marketplace', desc: 'Install pre-built AI agents', tab: 'marketplace', color: 'from-orange-500 to-amber-600' },
    { icon: '🧠', name: 'Knowledge Graph', desc: 'Traceable, explainable AI decisions', tab: 'knowledge', color: 'from-blue-500 to-indigo-600' },
    { icon: '🤝', name: 'Companion Agent', desc: 'Real-time guidance for human teams', tab: 'companion', color: 'from-emerald-500 to-green-600' },
    { icon: '💳', name: 'Agentic Payments', desc: 'Autonomous agent-to-agent commerce', tab: 'payments', color: 'from-amber-500 to-yellow-600' },
    { icon: '💖', name: 'Emotional AI', desc: 'Memory, personality, retention', tab: 'emotional', color: 'from-pink-500 to-rose-600' },
  ]

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 bg-white/5 border border-white/10 rounded-2xl">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 mb-2">Organization</p>
          <p className="text-2xl font-black">{org.name}</p>
          <p className="text-sm text-slate-400 mt-1">{org.email}</p>
        </div>
        <div className="p-6 bg-white/5 border border-white/10 rounded-2xl">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 mb-2">Plan</p>
          <p className="text-2xl font-black capitalize">{org.plan}</p>
          <p className="text-sm text-slate-400 mt-1 capitalize">{org.status} status</p>
        </div>
        <div className="p-6 bg-white/5 border border-white/10 rounded-2xl">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 mb-2">Capabilities</p>
          <p className="text-2xl font-black">6</p>
          <p className="text-sm text-slate-400 mt-1">Enterprise modules active</p>
        </div>
      </div>

      <h2 className="text-lg font-black tracking-tight">Enterprise Capabilities</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {capabilities.map((cap) => (
          <button
            key={cap.tab}
            onClick={() => {
              const url = new URL(window.location.href)
              window.dispatchEvent(new CustomEvent('navigate-tab', { detail: cap.tab }))
            }}
            className="group p-6 bg-white/5 border border-white/10 rounded-2xl text-left hover:bg-white/10 hover:border-white/20 transition-all duration-300 hover:scale-[1.02]"
          >
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl mb-4 bg-gradient-to-br ${cap.color} group-hover:scale-110 transition-transform`}>
              {cap.icon}
            </div>
            <h3 className="font-black text-lg mb-1">{cap.name}</h3>
            <p className="text-sm text-slate-400">{cap.desc}</p>
            <p className="text-xs text-orange-400 font-bold mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
              Open Module →
            </p>
          </button>
        ))}
      </div>
    </div>
  )
}
