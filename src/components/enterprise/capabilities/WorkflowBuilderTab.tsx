import { useState } from 'react'
import { useMutation } from 'convex/react'
import { api } from '../../../../convex/_generated/api'

const sampleWorkflows = [
  { id: '1', name: 'Lead Generation Pipeline', status: 'active' as const, nodes: 5, runs: 142, lastRun: '2 hours ago' },
  { id: '2', name: 'Content Production Line', status: 'active' as const, nodes: 8, runs: 89, lastRun: '5 hours ago' },
  { id: '3', name: 'Customer Support Triage', status: 'draft' as const, nodes: 4, runs: 0, lastRun: 'Never' },
]

export function WorkflowBuilderTab({ token }: { token: string }) {
  const [workflows, setWorkflows] = useState(sampleWorkflows)
  const [selectedWorkflow, setSelectedWorkflow] = useState<string | null>(null)
  const [showBuilder, setShowBuilder] = useState(false)
  const [newName, setNewName] = useState('')

  const nodes = [
    { id: 'trigger', label: 'Trigger', icon: '⚡', x: 50, y: 120, color: '#f59e0b' },
    { id: 'research', label: 'Research Agent', icon: '🔍', x: 220, y: 60, color: '#8b5cf6' },
    { id: 'analyze', label: 'Analysis Agent', icon: '📊', x: 220, y: 180, color: '#3b82f6' },
    { id: 'write', label: 'Writing Agent', icon: '✍️', x: 400, y: 60, color: '#10b981' },
    { id: 'review', label: 'Review Agent', icon: '✅', x: 400, y: 180, color: '#ef4444' },
    { id: 'output', label: 'Output', icon: '📤', x: 570, y: 120, color: '#06b6d4' },
  ]

  const connections = [
    { from: 'trigger', to: 'research' }, { from: 'trigger', to: 'analyze' },
    { from: 'research', to: 'write' }, { from: 'analyze', to: 'review' },
    { from: 'write', to: 'output' }, { from: 'review', to: 'output' },
  ]

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black tracking-tight">Workflow Builder</h2>
          <p className="text-sm text-slate-400 mt-1">Visual drag-drop agent orchestration</p>
        </div>
        <button
          onClick={() => setShowBuilder(!showBuilder)}
          className="px-6 py-3 bg-gradient-to-r from-violet-500 to-purple-600 text-white font-black text-sm rounded-xl hover:scale-105 transition-all"
        >
          {showBuilder ? '← Back to List' : '+ New Workflow'}
        </button>
      </div>

      {showBuilder ? (
        <div className="space-y-6">
          <div className="flex gap-4">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Workflow name..."
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-violet-500/50 font-medium"
            />
            <button className="px-6 py-3 bg-emerald-600 text-white font-black text-sm rounded-xl hover:bg-emerald-700 transition-all">
              Save Workflow
            </button>
          </div>

          {/* Visual Canvas */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-8 min-h-[400px] relative overflow-hidden">
            <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-6">Agent Flow Canvas</p>
            <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }}>
              {connections.map((conn, i) => {
                const from = nodes.find(n => n.id === conn.from)!
                const to = nodes.find(n => n.id === conn.to)!
                return (
                  <line key={i} x1={from.x + 80} y1={from.y + 25} x2={to.x + 20} y2={to.y + 25}
                    stroke="rgba(255,255,255,0.1)" strokeWidth="2" strokeDasharray="5,5" />
                )
              })}
            </svg>
            <div className="relative z-10">
              {nodes.map((node) => (
                <div
                  key={node.id}
                  className="absolute flex items-center gap-3 px-5 py-3 rounded-xl border cursor-move hover:scale-105 transition-transform"
                  style={{ left: node.x, top: node.y, borderColor: node.color + '40', background: node.color + '15' }}
                >
                  <span className="text-xl">{node.icon}</span>
                  <span className="text-sm font-black text-white">{node.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {workflows.map((wf) => (
            <div key={wf.id} className="flex items-center justify-between p-6 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-all">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-violet-500/10 rounded-xl flex items-center justify-center text-2xl">🔄</div>
                <div>
                  <h3 className="font-black">{wf.name}</h3>
                  <p className="text-xs text-slate-400">{wf.nodes} agents · {wf.runs} runs · Last: {wf.lastRun}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                  wf.status === 'active' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-500/10 text-slate-400'
                }`}>{wf.status}</span>
                <button className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-xs font-bold hover:bg-white/10 transition-all">Edit</button>
                <button className="px-4 py-2 bg-violet-600 text-white rounded-lg text-xs font-bold hover:bg-violet-700 transition-all">Run</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
