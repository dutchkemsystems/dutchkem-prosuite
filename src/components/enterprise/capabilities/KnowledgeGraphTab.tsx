import { useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { api } from '../../../../convex/_generated/api'

export function KnowledgeGraphTab({ token }: { token: string }) {
  const org = useQuery(api.enterprise_auth.getOrgDetails, token ? { token } : 'skip')
  const orgId = org?._id

  const entries = useQuery(api.enterprise_knowledge.listEntries, orgId ? { orgId, token } : 'skip') || []
  const stats = useQuery(api.enterprise_knowledge.getStats, orgId ? { orgId, token } : 'skip') || { totalEntries: 0, entities: [], sources: [], avgConfidence: 0 }
  const addEntry = useMutation(api.enterprise_knowledge.addEntry)
  const deleteEntry = useMutation(api.enterprise_knowledge.deleteEntry)

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedEntity, setSelectedEntity] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [newEntry, setNewEntry] = useState({ source: '', entity: '', relationship: '', confidence: 90 })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [adding, setAdding] = useState(false)

  const searchResults = useQuery(
    api.enterprise_knowledge.searchEntries,
    orgId && searchQuery ? { orgId, token, query: searchQuery } : 'skip'
  ) || entries

  const showToast = (msg: string, isError = false) => {
    if (isError) setError(msg)
    else setSuccess(msg)
    setTimeout(() => { setError(''); setSuccess('') }, 3000)
  }

  const handleAdd = async () => {
    if (!newEntry.source || !newEntry.entity || !newEntry.relationship) {
      showToast('All fields are required', true); return
    }
    setAdding(true)
    try {
      const result = await addEntry({ orgId: orgId!, token, ...newEntry })
      if (result.error) { showToast(result.error, true); return }
      showToast('Knowledge entry added!')
      setShowAdd(false)
      setNewEntry({ source: '', entity: '', relationship: '', confidence: 90 })
    } catch (e: any) { showToast(e.message || 'Failed', true) }
    finally { setAdding(false) }
  }

  const handleDelete = async (entryId: string) => {
    const result = await deleteEntry({ entryId: entryId as any, token })
    if (result.error) { showToast(result.error, true); return }
    showToast('Entry deleted!')
  }

  const filteredEntries = selectedEntity
    ? searchResults.filter((e: any) => e.entity === selectedEntity)
    : searchResults

  const entityList = stats.entities || []
  const sourceList = stats.sources || []

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {(error || success) && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl text-sm font-black ${error ? 'bg-red-600 text-white' : 'bg-emerald-600 text-white'}`}>
          {error || success}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black tracking-tight">Knowledge Graph</h2>
          <p className="text-sm text-slate-400 mt-1">Traceable, explainable AI decisions — audit-ready</p>
        </div>
        <button onClick={() => setShowAdd(!showAdd)}
          className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-black text-sm rounded-xl hover:scale-105 transition-all">
          {showAdd ? '← Back' : '+ Add Entry'}
        </button>
      </div>

      {error && <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm font-bold">{error}</div>}
      {success && <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-sm font-bold">{success}</div>}

      {/* Add Entry Form */}
      {showAdd && (
        <div className="p-6 bg-white/5 border border-white/10 rounded-2xl space-y-4">
          <h3 className="font-black">Add Knowledge Entry</h3>
          <div className="grid grid-cols-2 gap-4">
            <input value={newEntry.source} onChange={e => setNewEntry({ ...newEntry, source: e.target.value })}
              placeholder="Source (e.g. Market Report Q4)" className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 font-medium" />
            <input value={newEntry.entity} onChange={e => setNewEntry({ ...newEntry, entity: e.target.value })}
              placeholder="Entity (e.g. Revenue Target)" className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 font-medium" />
            <input value={newEntry.relationship} onChange={e => setNewEntry({ ...newEntry, relationship: e.target.value })}
              placeholder="Relationship (e.g. correlates with)" className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 font-medium" />
            <div className="flex items-center gap-3">
              <label className="text-xs text-slate-400 whitespace-nowrap">Confidence:</label>
              <input type="range" min="0" max="100" value={newEntry.confidence}
                onChange={e => setNewEntry({ ...newEntry, confidence: Number(e.target.value) })}
                className="flex-1 accent-blue-500" />
              <span className="text-sm font-black text-blue-400 w-10 text-right">{newEntry.confidence}%</span>
            </div>
          </div>
          <button onClick={handleAdd} disabled={adding}
            className="px-6 py-3 bg-blue-600 text-white font-black text-sm rounded-xl hover:bg-blue-700 transition-all disabled:opacity-50">
            {adding ? 'Adding...' : 'Add Entry'}
          </button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="p-5 bg-white/5 border border-white/10 rounded-2xl text-center">
          <p className="text-3xl font-black text-blue-400">{stats.totalEntries}</p>
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">Total Entries</p>
        </div>
        <div className="p-5 bg-white/5 border border-white/10 rounded-2xl text-center">
          <p className="text-3xl font-black text-emerald-400">{entityList.length}</p>
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">Unique Entities</p>
        </div>
        <div className="p-5 bg-white/5 border border-white/10 rounded-2xl text-center">
          <p className="text-3xl font-black text-violet-400">{stats.avgConfidence.toFixed(0)}%</p>
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">Avg Confidence</p>
        </div>
      </div>

      {/* Search */}
      <div className="flex gap-4">
        <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search entities, sources, or relationships..."
          className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 font-medium" />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Entity sidebar */}
        <div className="space-y-3">
          <h3 className="text-sm font-black uppercase tracking-widest text-slate-500">Entities</h3>
          <button onClick={() => setSelectedEntity(null)}
            className={`w-full text-left p-3 rounded-xl border text-sm font-bold transition-all ${!selectedEntity ? 'bg-blue-500/10 border-blue-500/30 text-white' : 'bg-white/5 border-white/5 text-slate-400 hover:bg-white/10'}`}>
            All Entries ({entries.length})
          </button>
          {entityList.map((ent: any) => (
            <button key={ent.name} onClick={() => setSelectedEntity(ent.name)}
              className={`w-full text-left p-3 rounded-xl border text-sm font-bold transition-all ${
                selectedEntity === ent.name ? 'bg-blue-500/10 border-blue-500/30 text-white' : 'bg-white/5 border-white/5 text-slate-400 hover:bg-white/10'
              }`}>
              <div className="flex items-center justify-between">
                <span>{ent.name}</span>
                <span className="text-xs text-slate-500">{ent.count}</span>
              </div>
            </button>
          ))}
        </div>

        {/* Entries list */}
        <div className="lg:col-span-2 space-y-3">
          <h3 className="text-sm font-black uppercase tracking-widest text-slate-500">
            Knowledge Entries ({filteredEntries.length})
          </h3>
          {filteredEntries.length === 0 ? (
            <div className="text-center py-12 bg-white/5 border border-white/10 rounded-2xl">
              <p className="text-4xl mb-4">🧠</p>
              <p className="text-slate-500 font-bold">No entries yet. Add your first knowledge entry above.</p>
            </div>
          ) : filteredEntries.map((entry: any) => (
            <div key={entry._id} className="p-5 bg-white/5 border border-white/10 rounded-xl space-y-3 hover:bg-white/10 transition-all group">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-black text-sm">{entry.entity}</p>
                  <p className="text-xs text-slate-400 mt-1">
                    <span className="text-slate-500">Source:</span> {entry.source}
                    <span className="mx-2">·</span>
                    <span className="text-slate-500">Rel:</span> {entry.relationship}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-sm font-black text-emerald-400">{entry.confidence}%</p>
                    <p className="text-[9px] text-slate-500 uppercase">confidence</p>
                  </div>
                  <button onClick={() => handleDelete(entry._id)}
                    className="opacity-0 group-hover:opacity-100 text-red-400 text-xs hover:text-red-300 transition-all">✕</button>
                </div>
              </div>
              <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full transition-all" style={{ width: `${entry.confidence}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
