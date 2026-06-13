import { useState } from 'react'
import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { AdminWorkflowBuilder } from '~/components/admin/enterprise/AdminWorkflowBuilder'
import { AdminMarketplace } from '~/components/admin/enterprise/AdminMarketplace'
import { AdminKnowledgeGraph } from '~/components/admin/enterprise/AdminKnowledgeGraph'
import { AdminCompanion } from '~/components/admin/enterprise/AdminCompanion'
import { AdminPayments } from '~/components/admin/enterprise/AdminPayments'
import { AdminEmotionalAI } from '~/components/admin/enterprise/AdminEmotionalAI'
import { AutonomousOverview } from '~/components/admin/enterprise/AutonomousOverview'

const TABS = [
  { id: 'autonomous', label: 'Autonomous', icon: '🧬' },
  { id: 'workflows', label: 'Workflow Builder', icon: '⚙️' },
  { id: 'marketplace', label: 'Agent Marketplace', icon: '🏪' },
  { id: 'knowledge', label: 'Knowledge Graph', icon: '🧠' },
  { id: 'companion', label: 'Companion Agent', icon: '🤖' },
  { id: 'payments', label: 'Agentic Payments', icon: '💳' },
  { id: 'emotional', label: 'Emotional AI', icon: '❤️' },
] as const

type TabId = typeof TABS[number]['id']

export function AdminEnterpriseHub({ adminToken }: { adminToken: string }) {
  const [activeTab, setActiveTab] = useState<TabId>('autonomous')

  const stats = useQuery(api.admin_enterprise_hub.getHubStats, {})
  const agentList = useQuery(api.admin_enterprise_hub.listAgents, {})
  const orgList = useQuery(api.admin_enterprise.listOrganizations, { adminToken })
  const autonomousMetrics = useQuery(api.enterprise_autonomous.getAutonomousMetrics, {})

  const agents = agentList || []
  const organizations = orgList || []
  const auto = autonomousMetrics || {}

  const statCards = [
    { label: 'Templates', value: stats?.templateCount ?? 0, icon: '📋', color: 'from-orange-500/20 to-orange-600/10' },
    { label: 'Published', value: stats?.publishedCount ?? 0, icon: '🚀', color: 'from-emerald-500/20 to-emerald-600/10' },
    { label: 'Agents', value: stats?.agentCount ?? 0, icon: '🤖', color: 'from-blue-500/20 to-blue-600/10' },
    { label: 'Orgs', value: stats?.orgCount ?? 0, icon: '🏢', color: 'from-purple-500/20 to-purple-600/10' },
  ]

  const renderTab = () => {
    switch (activeTab) {
      case 'autonomous':
        return <AutonomousOverview adminToken={adminToken} />
      case 'workflows':
        return <AdminWorkflowBuilder adminToken={adminToken} />
      case 'marketplace':
        return <AdminMarketplace adminToken={adminToken} agents={agents} organizations={organizations} />
      case 'knowledge':
        return <AdminKnowledgeGraph adminToken={adminToken} agents={agents} organizations={organizations} />
      case 'companion':
        return <AdminCompanion adminToken={adminToken} agents={agents} organizations={organizations} />
      case 'payments':
        return <AdminPayments adminToken={adminToken} agents={agents} organizations={organizations} />
      case 'emotional':
        return <AdminEmotionalAI adminToken={adminToken} agents={agents} organizations={organizations} />
      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Admin Enterprise Hub</h1>
          <p className="text-sm text-slate-400 mt-1">Autonomous self-healing, self-optimizing enterprise platform</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
            <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
            <span className="text-xs font-bold text-emerald-400">AUTONOMOUS</span>
          </div>
          <div className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-slate-300">
            {auto.agentsOnline ?? 15} Agents · {organizations.length} Orgs · {auto.todayExecutions ?? 0} Execs Today
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <div
            key={card.label}
            className={`bg-gradient-to-br ${card.color} border border-white/10 rounded-2xl p-5 transition-all duration-300 hover:scale-[1.02] hover:border-white/20`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-2xl">{card.icon}</span>
            </div>
            <div className="text-3xl font-black">{card.value}</div>
            <div className="text-sm text-slate-400 mt-1">{card.label}</div>
          </div>
        ))}
      </div>

      <div className="flex gap-1 bg-white/5 border border-white/10 rounded-2xl p-1 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-[#FF6B35] text-white shadow-lg shadow-[#FF6B35]/20'
                : 'text-slate-400 hover:text-white hover:bg-white/10'
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      <div className="min-h-[60vh]">
        {renderTab()}
      </div>
    </div>
  )
}
