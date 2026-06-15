import { useState, useEffect } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { api } from '../../../../convex/_generated/api'

export function WorkflowBuilderTab({ token }: { token: string }) {
  const [retryKey, setRetryKey] = useState(0)
  const [view, setView] = useState<'list' | 'templates' | 'builder'>('list')
  const [selectedWorkflow, setSelectedWorkflow] = useState<any>(null)
  const [builderNodes, setBuilderNodes] = useState<any[]>([])
  const [builderEdges, setBuilderEdges] = useState<any[]>([])
  const [workflowName, setWorkflowName] = useState('')
  const [workflowDesc, setWorkflowDesc] = useState('')
  const [saving, setSaving] = useState(false)
  const [running, setRunning] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [editNodeId, setEditNodeId] = useState<string | null>(null)
  const [editLabel, setEditLabel] = useState('')
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const org = useQuery(api.enterprise_auth.getOrgDetails, token ? { token } : 'skip')
  const orgId = org?._id

  const wq = useQuery(api.enterprise_workflows.listWorkflows, orgId ? { orgId } : 'skip')
  const tq = useQuery(api.admin_enterprise_hub.listTemplates)
  const workflows = wq || []
  const templates = tq || []

  const createWorkflow = useMutation(api.enterprise_workflows.createWorkflow)
  const updateWorkflow = useMutation(api.enterprise_workflows.updateWorkflow)
  const deleteWorkflow = useMutation(api.enterprise_workflows.deleteWorkflow)
  const runWorkflow = useMutation(api.enterprise_workflows.runWorkflow)
  const duplicateWorkflow = useMutation(api.enterprise_workflows.duplicateWorkflow)

  const getWorkflow = useQuery(
    api.enterprise_workflows.getWorkflow,
    selectedWorkflow ? { workflowId: selectedWorkflow._id } : 'skip'
  ) || null

  useEffect(() => {
    if (getWorkflow && getWorkflow.nodes) {
      setBuilderNodes(getWorkflow.nodes || [])
      setBuilderEdges(getWorkflow.edges || [])
    }
  }, [getWorkflow])

  const NODE_TYPES = [
    { type: 'trigger', label: 'Trigger', icon: '⚡', color: '#f59e0b' },
    { type: 'action', label: 'Action', icon: '🔧', color: '#8b5cf6' },
    { type: 'condition', label: 'Condition', icon: '🔀', color: '#3b82f6' },
    { type: 'output', label: 'Output', icon: '📤', color: '#06b6d4' },
    { type: 'delay', label: 'Delay', icon: '⏱️', color: '#ef4444' },
  ]

  const showToast = (msg: string, isError = false) => {
    if (isError) setError(msg)
    else setSuccess(msg)
    setTimeout(() => { setError(''); setSuccess('') }, 3000)
  }

  const handleCreateFromTemplate = async (template: any) => {
    setSaving(true)
    try {
      const result = await createWorkflow({ orgId: orgId!, name: template.name, description: template.description, nodes: template.nodes || [], edges: template.edges || [], createdBy: 'admin' })
      if (result.error) { showToast(result.error, true); return }
      showToast(`Workflow "${template.name}" created!`)
      setView('list')
    } catch (e: any) { showToast(e.message || 'Failed', true) }
    finally { setSaving(false) }
  }

  const handleCreateFromScratch = () => {
    setWorkflowName('')
    setWorkflowDesc('')
    setBuilderNodes([{ id: 'node_1', type: 'trigger', label: 'Start', icon: '⚡', x: 50, y: 120, config: {} }])
    setBuilderEdges([])
    setSelectedWorkflow(null)
    setView('builder')
  }

  const handleEditWorkflow = (wf: any) => {
    setSelectedWorkflow(wf)
    setWorkflowName(wf.name)
    setWorkflowDesc(wf.description || '')
    setView('builder')
  }

  const handleSave = async () => {
    if (!workflowName.trim()) { showToast('Workflow name is required', true); return }
    setSaving(true)
    try {
      if (selectedWorkflow) {
        const result = await updateWorkflow({ workflowId: selectedWorkflow._id, name: workflowName, description: workflowDesc })
        if (result.error) { showToast(result.error, true); return }
        showToast('Workflow updated!')
      } else {
        const result = await createWorkflow({ orgId: orgId!, name: workflowName, description: workflowDesc, nodes: builderNodes, edges: builderEdges, createdBy: 'admin' })
        if (result.error) { showToast(result.error, true); return }
        showToast('Workflow created!')
      }
      setView('list')
    } catch (e: any) { showToast(e.message || 'Failed', true) }
    finally { setSaving(false) }
  }

  const handleRun = async (wf: any) => {
    setRunning(wf._id)
    try {
      const result = await runWorkflow({ workflowId: wf._id })
      if (result.error) { showToast(result.error, true); return }
      showToast(`Workflow executed! Run #${result.runNumber}`)
    } catch (e: any) { showToast(e.message || 'Failed', true) }
    finally { setRunning(null) }
  }

  const handleDelete = async (wfId: string) => {
    const result = await deleteWorkflow({ workflowId: wfId as any })
    if (result.error) { showToast(result.error, true); return }
    showToast('Workflow deleted!')
    setConfirmDelete(null)
  }

  const handleDuplicate = async (wf: any) => {
    const result = await duplicateWorkflow({ workflowId: wf._id, newName: `${wf.name} (Copy)` })
    if (result.error) { showToast(result.error, true); return }
    showToast('Workflow duplicated!')
  }

  const handleAddNode = (type: string) => {
    const nodeType = NODE_TYPES.find(n => n.type === type)!
    const id = `node_${Date.now()}`
    const maxX = builderNodes.length > 0 ? Math.max(...builderNodes.map((n: any) => n.x)) : 0
    setBuilderNodes([...builderNodes, { id, type, label: nodeType.label, icon: nodeType.icon, x: maxX + 180, y: 120, config: {} }])
  }

  const handleRemoveNode = (nodeId: string) => {
    setBuilderNodes(builderNodes.filter((n: any) => n.id !== nodeId))
    setBuilderEdges(builderEdges.filter((e: any) => e.from !== nodeId && e.to !== nodeId))
  }

  const handleConnectNodes = (fromId: string, toId: string) => {
    if (fromId === toId) return
    const exists = builderEdges.some((e: any) => e.from === fromId && e.to === toId)
    if (!exists) setBuilderEdges([...builderEdges, { from: fromId, to: toId }])
  }

  const handleUpdateNodeLabel = (nodeId: string, label: string) => {
    setBuilderNodes(builderNodes.map((n: any) => n.id === nodeId ? { ...n, label } : n))
    setEditNodeId(null)
  }

  const statusColors: Record<string, string> = {
    active: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    draft: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
    paused: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    archived: 'bg-red-500/10 text-red-400 border-red-500/20',
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500" key={retryKey}>
      {(error || success) && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl text-sm font-black ${error ? 'bg-red-600 text-white' : 'bg-emerald-600 text-white'}`}>
          {error || success}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black tracking-tight">Workflow Builder</h2>
          <p className="text-sm text-slate-400 mt-1">Visual drag-drop agent orchestration</p>
        </div>
        <div className="flex gap-3">
          {view === 'builder' && (
            <button onClick={() => setView('list')} className="px-4 py-2 bg-white/5 border border-white/10 text-white font-bold text-sm rounded-xl hover:bg-white/10 transition-all">
              ← Back
            </button>
          )}
          {view !== 'builder' && (
            <>
              <button onClick={() => setView('templates')} className="px-5 py-3 bg-white/5 border border-white/10 text-white font-black text-sm rounded-xl hover:bg-white/10 transition-all">
                📋 Templates
              </button>
              <button onClick={handleCreateFromScratch} className="px-5 py-3 bg-gradient-to-r from-violet-500 to-purple-600 text-white font-black text-sm rounded-xl hover:scale-105 transition-all">
                + New Workflow
              </button>
            </>
          )}
        </div>
      </div>

      {view === 'templates' && (
        <div className="space-y-6">
          <p className="text-sm text-slate-400">Choose a pre-built template to get started quickly</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {templates.map((tpl: any) => (
              <div key={tpl.id} className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all group">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 bg-violet-500/10 rounded-xl flex items-center justify-center text-2xl">🔄</div>
                  <span className="px-2 py-0.5 bg-white/5 rounded text-[9px] font-black uppercase text-slate-500">{tpl.category}</span>
                </div>
                <h3 className="font-black text-lg mb-2">{tpl.name}</h3>
                <p className="text-sm text-slate-400 mb-4">{tpl.description}</p>
                <div className="flex items-center gap-2 text-xs text-slate-500 mb-4">
                  <span>{tpl.nodes.length} nodes</span><span>·</span><span>{tpl.edges.length} connections</span>
                </div>
                <button onClick={() => handleCreateFromTemplate(tpl)} disabled={saving}
                  className="w-full py-3 bg-violet-600 text-white font-black text-sm rounded-xl hover:bg-violet-700 transition-all disabled:opacity-50">
                  {saving ? 'Creating...' : 'Use Template'}
                </button>
              </div>
            ))}
          </div>
          <button onClick={() => { setView('list'); handleCreateFromScratch() }}
            className="w-full py-4 border-2 border-dashed border-white/10 rounded-2xl text-slate-500 font-black hover:border-violet-500/50 hover:text-violet-400 transition-all">
            + Create From Scratch
          </button>
        </div>
      )}

      {view === 'builder' && (
        <div className="space-y-6">
          <div className="flex gap-4">
            <input value={workflowName} onChange={(e) => setWorkflowName(e.target.value)} placeholder="Workflow name..."
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-violet-500/50 font-medium" />
            <input value={workflowDesc} onChange={(e) => setWorkflowDesc(e.target.value)} placeholder="Description (optional)..."
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-violet-500/50 font-medium" />
            <button onClick={handleSave} disabled={saving}
              className="px-6 py-3 bg-emerald-600 text-white font-black text-sm rounded-xl hover:bg-emerald-700 transition-all disabled:opacity-50">
              {saving ? 'Saving...' : selectedWorkflow ? 'Update' : 'Save Workflow'}
            </button>
          </div>
          <div className="grid grid-cols-5 gap-6">
            <div className="space-y-3">
              <p className="text-xs font-black text-slate-500 uppercase tracking-widest">Add Nodes</p>
              {NODE_TYPES.map(nt => (
                <button key={nt.type} onClick={() => handleAddNode(nt.type)}
                  className="w-full flex items-center gap-2 px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm font-bold hover:bg-white/10 transition-all text-left">
                  <span>{nt.icon}</span> {nt.label}
                </button>
              ))}
            </div>
            <div className="col-span-4 bg-white/5 border border-white/10 rounded-2xl p-6 min-h-[400px] relative overflow-hidden">
              <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4">Agent Flow Canvas</p>
              {builderNodes.length === 0 ? (
                <div className="flex items-center justify-center h-64 text-slate-600 font-bold">Add nodes from the palette to start building</div>
              ) : (
                <div className="relative" style={{ minHeight: 350 }}>
                  <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }}>
                    {builderEdges.map((edge: any, i: number) => {
                      const from = builderNodes.find((n: any) => n.id === edge.from)
                      const to = builderNodes.find((n: any) => n.id === edge.to)
                      if (!from || !to) return null
                      return <line key={i} x1={from.x + 80} y1={from.y + 25} x2={to.x + 20} y2={to.y + 25} stroke="rgba(139,92,246,0.4)" strokeWidth="2" strokeDasharray="5,5" />
                    })}
                  </svg>
                  {builderNodes.map((node: any) => {
                    const nodeType = NODE_TYPES.find(n => n.type === node.type) || NODE_TYPES[0]
                    return (
                      <div key={node.id}
                        className="absolute flex items-center gap-2 px-4 py-3 rounded-xl border cursor-move hover:scale-105 transition-transform group"
                        style={{ left: node.x, top: node.y, borderColor: nodeType.color + '40', background: nodeType.color + '15' }}>
                        <span className="text-lg">{node.icon}</span>
                        {editNodeId === node.id ? (
                          <input value={editLabel} onChange={e => setEditLabel(e.target.value)}
                            onBlur={() => handleUpdateNodeLabel(node.id, editLabel)}
                            onKeyDown={e => e.key === 'Enter' && handleUpdateNodeLabel(node.id, editLabel)}
                            className="bg-transparent border-b border-white/30 text-sm font-black text-white w-24 focus:outline-none" autoFocus />
                        ) : (
                          <span className="text-sm font-black text-white" onDoubleClick={() => { setEditNodeId(node.id); setEditLabel(node.label) }}>{node.label}</span>
                        )}
                        <button onClick={() => handleRemoveNode(node.id)} className="opacity-0 group-hover:opacity-100 ml-1 text-red-400 text-xs hover:text-red-300 transition-all">✕</button>
                        {builderNodes.indexOf(node) < builderNodes.length - 1 && (
                          <button onClick={() => { const next = builderNodes[builderNodes.indexOf(node) + 1]; if (next) handleConnectNodes(node.id, next.id) }}
                            className="opacity-0 group-hover:opacity-100 text-violet-400 text-xs hover:text-violet-300 transition-all ml-1">→</button>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {view === 'list' && (
        <div className="space-y-4">
          {workflows.length === 0 ? (
            <div className="text-center py-16 bg-white/5 border border-white/10 rounded-2xl">
              <p className="text-4xl mb-4">🔄</p>
              <p className="text-slate-500 font-bold mb-4">No workflows yet</p>
              <button onClick={() => setView('templates')} className="px-6 py-3 bg-violet-600 text-white font-black text-sm rounded-xl hover:bg-violet-700 transition-all">
                Browse Templates
              </button>
            </div>
          ) : workflows.map((wf: any) => (
            <div key={wf._id} className="flex items-center justify-between p-6 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-all">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-violet-500/10 rounded-xl flex items-center justify-center text-2xl">🔄</div>
                <div>
                  <h3 className="font-black">{wf.name}</h3>
                  <p className="text-xs text-slate-400">{wf.nodeCount} nodes · {wf.runCount} runs · Last: {wf.lastRunAt ? new Date(wf.lastRunAt).toLocaleString() : 'Never'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${statusColors[wf.status] || statusColors.draft}`}>{wf.status}</span>
                <button onClick={() => handleEditWorkflow(wf)} className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-xs font-bold hover:bg-white/10 transition-all">Edit</button>
                <button onClick={() => handleDuplicate(wf)} className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-xs font-bold hover:bg-white/10 transition-all">Duplicate</button>
                <button onClick={() => handleRun(wf)} disabled={running === wf._id}
                  className="px-4 py-2 bg-violet-600 text-white rounded-lg text-xs font-bold hover:bg-violet-700 transition-all disabled:opacity-50">
                  {running === wf._id ? 'Running...' : 'Run'}
                </button>
                {confirmDelete === wf._id ? (
                  <div className="flex gap-2">
                    <button onClick={() => handleDelete(wf._id)} className="px-3 py-2 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-700">Confirm</button>
                    <button onClick={() => setConfirmDelete(null)} className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-xs font-bold hover:bg-white/10">Cancel</button>
                  </div>
                ) : (
                  <button onClick={() => setConfirmDelete(wf._id)} className="px-3 py-2 bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg text-xs font-bold hover:bg-red-500/20">Delete</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
