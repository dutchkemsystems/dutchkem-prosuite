import { useState } from 'react'
import { useQuery } from 'convex/react'
import { api } from '../../../../convex/_generated/api'

const TYPE_COLORS: Record<string, string> = {
  document: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  database: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  qa: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  rules: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  dataset: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
}

export function AdminKnowledgeGraph({ adminToken, organizations }: { adminToken: string, agents: any[], organizations: any[] }) {
  const [selectedOrg, setSelectedOrg] = useState(organizations[0]?._id || '')
  const [searchQuery, setSearchQuery] = useState('')

  const entries = useQuery(api.enterprise_knowledge.listEntries, { orgId: selectedOrg as any, adminToken }, { enabled: !!selectedOrg })
  const stats = useQuery(api.enterprise_knowledge.getStats, { orgId: selectedOrg as any, adminToken }, { enabled: !!selectedOrg })
  const searchResults = useQuery(api.enterprise_knowledge.searchEntries, { orgId: selectedOrg as any, query: searchQuery, adminToken }, { enabled: !!selectedOrg && searchQuery.length > 0 })

  const displayEntries = searchQuery.length > 0 ? (searchResults || []) : (entries || [])

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black tracking-tight">Knowledge Graph</h2>
          <p className="text-sm text-slate-400 mt-1">Manage enterprise knowledge entries and entity relationships</p>
        </div>
        <select value={selectedOrg} onChange={(e) => setSelectedOrg(e.target.value)} className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-[#FF6B35]/50">
          <option value="" className="bg-[#0a0a0f]">Select organization...</option>
          {organizations.map((o: any) => <option key={o._id} value={o._id} className="bg-[#0a0a0f]">{o.name}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-cyan-500/20 to-cyan-600/10 border border-white/10 rounded-2xl p-5">
          <div className="text-3xl font-black">{stats?.totalEntries ?? displayEntries.length}</div>
          <div className="text-sm text-slate-400 mt-1">Total Entries</div>
        </div>
        <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/10 border border-white/10 rounded-2xl p-5">
          <div className="text-3xl font-black">{Object.keys(stats?.sourceBreakdown || {}).length}</div>
          <div className="text-sm text-slate-400 mt-1">Knowledge Sources</div>
        </div>
        <div className="bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 border border-white/10 rounded-2xl p-5">
          <div className="text-3xl font-black">{((stats?.avgConfidence || 0) * 100).toFixed(0)}%</div>
          <div className="text-sm text-slate-400 mt-1">Avg Confidence</div>
        </div>
      </div>

      <div className="relative">
        <input type="text" placeholder="Search knowledge entries..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#FF6B35]/50 transition-colors" />
      </div>

      <div className="space-y-3">
        {displayEntries.length === 0 && (
          <div className="text-center py-12 text-slate-600 text-sm">
            {selectedOrg ? 'No knowledge entries yet. Add entries from the client portal.' : 'Select an organization to view knowledge entries.'}
          </div>
        )}
        {displayEntries.map((entry: any) => {
          const sourceType = entry.source?.toLowerCase().includes('doc') ? 'document' : entry.source?.toLowerCase().includes('faq') ? 'qa' : entry.source?.toLowerCase().includes('rule') ? 'rules' : entry.source?.toLowerCase().includes('data') ? 'dataset' : 'database'
          return (
            <div key={entry._id} className="bg-white/5 border border-white/10 rounded-2xl p-4 hover:border-white/20 transition-all duration-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`px-2.5 py-1 rounded-lg text-[10px] font-black border ${TYPE_COLORS[sourceType] || TYPE_COLORS.document}`}>
                    {sourceType.toUpperCase()}
                  </div>
                  <div>
                    <div className="text-sm font-black text-white">{entry.entity}</div>
                    <div className="text-[10px] text-slate-500">{entry.source} · {entry.relationship}</div>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-xs text-slate-400">
                  <span>{(entry.confidence * 100).toFixed(0)}% confidence</span>
                  <span>{new Date(entry.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
              {entry.metadata && (
                <div className="mt-2 text-[10px] text-slate-500 truncate">
                  {typeof entry.metadata === 'object' ? JSON.stringify(entry.metadata).substring(0, 100) : String(entry.metadata)}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {Object.keys(stats?.sourceBreakdown || {}).length > 0 && (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
          <h3 className="text-sm font-black text-slate-300 mb-3">Knowledge Sources</h3>
          <div className="space-y-2">
            {Object.entries(stats.sourceBreakdown).map(([source, count]) => (
              <div key={source} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                <span className="text-sm text-white">{source}</span>
                <span className="text-xs text-cyan-400 font-black">{String(count)} entries</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
