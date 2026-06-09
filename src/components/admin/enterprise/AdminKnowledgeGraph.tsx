import { useState } from 'react'
import { useQuery } from 'convex/react'
import { api } from '../../../../convex/_generated/api'

const SAMPLE_ENTRIES = [
  { id: 'K1', title: 'Company Policies', type: 'document', entities: 47, relationships: 128, lastUpdated: '2h ago' },
  { id: 'K2', title: 'Product Catalog', type: 'database', entities: 312, relationships: 856, lastUpdated: '5h ago' },
  { id: 'K3', title: 'Customer FAQ', type: 'qa', entities: 89, relationships: 234, lastUpdated: '1d ago' },
  { id: 'K4', title: 'Technical Documentation', type: 'document', entities: 156, relationships: 412, lastUpdated: '3d ago' },
  { id: 'K5', title: 'Compliance Rules', type: 'rules', entities: 67, relationships: 189, lastUpdated: '1w ago' },
  { id: 'K6', title: 'Market Research Data', type: 'dataset', entities: 234, relationships: 567, lastUpdated: '2d ago' },
]

const TYPE_COLORS: Record<string, string> = {
  document: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  database: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  qa: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  rules: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  dataset: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
}

export function AdminKnowledgeGraph({ agents, organizations }: { agents: any[], organizations: any[] }) {
  const [filter, setFilter] = useState('all')
  const templates = useQuery(api.admin_enterprise_hub.listTemplates, {})

  const templateCount = templates?.length || 0
  const totalEntities = SAMPLE_ENTRIES.reduce((sum, e) => sum + e.entities, 0)
  const totalRelationships = SAMPLE_ENTRIES.reduce((sum, e) => sum + e.relationships, 0)

  const filtered = filter === 'all' ? SAMPLE_ENTRIES : SAMPLE_ENTRIES.filter((e) => e.type === filter)
  const types = ['all', ...new Set(SAMPLE_ENTRIES.map((e) => e.type))]

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black tracking-tight">Knowledge Graph</h2>
          <p className="text-sm text-slate-400 mt-1">Manage enterprise knowledge entries and entity relationships</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-cyan-500/20 to-cyan-600/10 border border-white/10 rounded-2xl p-5">
          <div className="text-3xl font-black">{SAMPLE_ENTRIES.length + templateCount}</div>
          <div className="text-sm text-slate-400 mt-1">Total Entries</div>
        </div>
        <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/10 border border-white/10 rounded-2xl p-5">
          <div className="text-3xl font-black">{totalEntities.toLocaleString()}</div>
          <div className="text-sm text-slate-400 mt-1">Total Entities</div>
        </div>
        <div className="bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 border border-white/10 rounded-2xl p-5">
          <div className="text-3xl font-black">{totalRelationships.toLocaleString()}</div>
          <div className="text-sm text-slate-400 mt-1">Total Relationships</div>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {types.map((t) => (
          <button
            key={t}
            onClick={() => setFilter(t)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 ${
              filter === t
                ? 'bg-[#FF6B35] text-white'
                : 'bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.map((entry) => (
          <div
            key={entry.id}
            className="bg-white/5 border border-white/10 rounded-2xl p-4 hover:border-white/20 transition-all duration-200"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`px-2.5 py-1 rounded-lg text-[10px] font-black border ${TYPE_COLORS[entry.type] || TYPE_COLORS.document}`}>
                  {entry.type.toUpperCase()}
                </div>
                <div>
                  <div className="text-sm font-black text-white">{entry.title}</div>
                  <div className="text-[10px] text-slate-500">Updated {entry.lastUpdated}</div>
                </div>
              </div>
              <div className="flex items-center gap-4 text-xs text-slate-400">
                <span>{entry.entities} entities</span>
                <span>{entry.relationships} relationships</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {organizations.length > 0 && (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
          <h3 className="text-sm font-black text-slate-300 mb-3">Knowledge Distribution by Organization</h3>
          <div className="space-y-2">
            {organizations.slice(0, 5).map((org: any) => (
              <div key={org._id} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                <span className="text-sm text-white">{org.name}</span>
                <span className="text-xs text-slate-400">{Math.floor(Math.random() * 50) + 10} entries</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
