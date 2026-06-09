import { useState } from 'react'

const MARKETPLACE_AGENTS = [
  { id: 'M1', name: 'Customer Support Bot', description: 'Handles customer inquiries, ticket routing, and support escalation with 24/7 availability', category: 'Support', installs: 2847 },
  { id: 'M2', name: 'Sales Lead Qualifier', description: 'Scores and qualifies inbound leads using BANT framework and custom scoring models', category: 'Sales', installs: 1923 },
  { id: 'M3', name: 'Content Writer Pro', description: 'Generates SEO-optimized blog posts, social media content, and marketing copy', category: 'Marketing', installs: 3156 },
  { id: 'M4', name: 'Data Analyst Agent', description: 'Analyzes datasets, generates reports, and creates visualizations from raw data', category: 'Analytics', installs: 1567 },
  { id: 'M5', name: 'HR Onboarding Bot', description: 'Streamlines new hire onboarding with document collection, training scheduling, and FAQ handling', category: 'HR', installs: 1234 },
  { id: 'M6', name: 'Legal Document Review', description: 'Reviews contracts, identifies risk clauses, and ensures compliance with legal standards', category: 'Legal', installs: 892 },
  { id: 'M7', name: 'Finance Assistant', description: 'Manages expense tracking, budget monitoring, and financial report generation', category: 'Finance', installs: 2103 },
  { id: 'M8', name: 'Project Manager Agent', description: 'Coordinates tasks, tracks milestones, and manages team workflows across projects', category: 'Operations', installs: 1678 },
]

export function AdminMarketplace({ agents, organizations }: { agents: any[], organizations: any[] }) {
  const [filter, setFilter] = useState('all')

  const categories = ['all', ...new Set(MARKETPLACE_AGENTS.map((a) => a.category))]
  const filtered = filter === 'all' ? MARKETPLACE_AGENTS : MARKETPLACE_AGENTS.filter((a) => a.category === filter)

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black tracking-tight">Agent Marketplace</h2>
          <p className="text-sm text-slate-400 mt-1">Pre-built agents available for enterprise deployment</p>
        </div>
        <div className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-slate-300">
          {MARKETPLACE_AGENTS.length} Agents
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 ${
              filter === cat
                ? 'bg-[#FF6B35] text-white'
                : 'bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filtered.map((agent) => (
          <div
            key={agent.id}
            className="bg-white/5 border border-white/10 rounded-2xl p-5 hover:border-[#FF6B35]/30 hover:bg-[#FF6B35]/5 transition-all duration-300 group"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="px-2.5 py-1 bg-[#FF6B35]/10 border border-[#FF6B35]/20 rounded-lg text-[10px] font-black text-[#FF6B35]">
                {agent.category}
              </div>
              <div className="text-xs text-slate-500">{agent.installs.toLocaleString()} installs</div>
            </div>
            <h3 className="text-base font-black text-white mb-2 group-hover:text-[#FF6B35] transition-colors">{agent.name}</h3>
            <p className="text-xs text-slate-400 leading-relaxed mb-4">{agent.description}</p>
            <div className="flex gap-2">
              <button className="flex-1 px-3 py-2 bg-[#FF6B35] hover:bg-[#FF8255] text-white rounded-xl text-xs font-black transition-all duration-200">
                Deploy
              </button>
              <button className="px-3 py-2 bg-white/5 border border-white/10 text-white rounded-xl text-xs font-bold hover:bg-white/10 transition-all duration-200">
                Preview
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
