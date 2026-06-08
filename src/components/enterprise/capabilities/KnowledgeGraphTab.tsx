import { useState } from 'react'

const sampleEntities = [
  { entity: 'CEO', type: 'Person', connections: 12, confidence: 0.98 },
  { entity: 'Q4 Revenue Target', type: 'Metric', connections: 8, confidence: 0.95 },
  { entity: 'Lagos Office', type: 'Location', connections: 15, confidence: 0.99 },
  { entity: 'Product Launch Plan', type: 'Document', connections: 6, confidence: 0.92 },
  { entity: 'Key Client - MTN', type: 'Organization', connections: 22, confidence: 0.97 },
]

const sampleDecisions = [
  { id: '1', decision: 'Recommended pricing increase of 15%', confidence: 94, sources: ['Market Analysis Q4', 'Competitor Report', 'Customer Survey'], timestamp: '2 min ago' },
  { id: '2', decision: 'Flagged unusual transaction pattern', confidence: 97, sources: ['Transaction Log', 'Fraud Database', 'Behavioral Model'], timestamp: '15 min ago' },
  { id: '3', decision: 'Suggested hiring 3 new engineers', confidence: 88, sources: ['Workload Analysis', 'Project Timeline', 'Budget Forecast'], timestamp: '1 hour ago' },
]

export function KnowledgeGraphTab({ token }: { token: string }) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedEntity, setSelectedEntity] = useState<string | null>(null)

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h2 className="text-2xl font-black tracking-tight">Knowledge Graph</h2>
        <p className="text-sm text-slate-400 mt-1">Traceable, explainable AI decisions — audit-ready</p>
      </div>

      <div className="flex gap-4">
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search entities, decisions, or relationships..."
          className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 font-medium"
        />
        <button className="px-6 py-3 bg-blue-600 text-white font-black text-sm rounded-xl hover:bg-blue-700 transition-all">Search</button>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Entities */}
        <div className="space-y-4">
          <h3 className="text-sm font-black uppercase tracking-widest text-slate-500">Entities</h3>
          {sampleEntities.map((ent, i) => (
            <div key={i} onClick={() => setSelectedEntity(ent.entity)}
              className={`p-4 rounded-xl border cursor-pointer transition-all ${
                selectedEntity === ent.entity
                  ? 'bg-blue-500/10 border-blue-500/30'
                  : 'bg-white/5 border-white/5 hover:bg-white/10'
              }`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-black">{ent.entity}</p>
                  <p className="text-xs text-slate-400">{ent.type} · {ent.connections} connections</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-black text-emerald-400">{(ent.confidence * 100).toFixed(0)}%</p>
                  <p className="text-[9px] text-slate-500 uppercase">confidence</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Recent Decisions */}
        <div className="space-y-4">
          <h3 className="text-sm font-black uppercase tracking-widest text-slate-500">Recent AI Decisions</h3>
          {sampleDecisions.map((d) => (
            <div key={d.id} className="p-5 bg-white/5 border border-white/10 rounded-xl space-y-3">
              <div className="flex items-start justify-between">
                <p className="font-black text-sm flex-1">{d.decision}</p>
                <span className="text-xs text-slate-500 ml-4">{d.timestamp}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden flex-1">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${d.confidence}%` }} />
                </div>
                <span className="text-xs font-black text-emerald-400">{d.confidence}%</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {d.sources.map((s, j) => (
                  <span key={j} className="px-2 py-1 bg-white/5 rounded-lg text-[10px] font-bold text-slate-400">📄 {s}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
