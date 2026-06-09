import { useState, useRef } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { api } from '../../../../convex/_generated/api'

const AGENTS = [
  { id: 'A1', name: 'Academic Pro', icon: '🎓', services: ['Thesis Writing', 'Research Papers', 'Dissertation Support'] },
  { id: 'A2', name: 'Business Pro', icon: '💼', services: ['Business Plan', 'Financial Model', 'Pitch Deck'] },
  { id: 'A3', name: 'Content Pro', icon: '✍️', services: ['SEO Blog Posts', 'Social Media Content', 'Sales Copy'] },
  { id: 'A4', name: 'Career Pro', icon: '📄', services: ['CV/Resume Writing', 'LinkedIn Optimization', 'Cover Letter'] },
  { id: 'A5', name: 'Personal Shopper', icon: '🛍️', services: ['Price Comparison', 'Product Research', 'Deal Finding'] },
  { id: 'A6', name: 'Exam Pro', icon: '📝', services: ['PMP Prep', 'CFA Study Guide', 'AWS Certification'] },
  { id: 'A7', name: 'Finance Pro', icon: '💰', services: ['Budget Planning', 'Savings Strategy', 'Investment Advice'] },
  { id: 'A8', name: 'MediaStudio Pro', icon: '🎬', services: ['Video Editing', '2D Animation', '3D Animation'] },
  { id: 'A9', name: 'Wellness Pro', icon: '🏥', services: ['Meal Plans', 'Workout Routines', 'Weight Management'] },
  { id: 'A10', name: 'Home Services', icon: '🧹', services: ['Cleaning Schedules', 'Home Organization', 'Maintenance Planning'] },
  { id: 'A11', name: 'Language Tutor', icon: '🗣️', services: ['Language Tutoring', 'Conversation Practice', 'Grammar Lessons'] },
  { id: 'A12', name: 'Travel Planner', icon: '✈️', services: ['Trip Planning', 'Itinerary Creation', 'Budget Planning'] },
  { id: 'A13', name: 'ServiceMart NG', icon: '🚀', services: ['JAMB Preparation', 'WAEC/NECO Prep', 'University Applications'] },
  { id: 'A14', name: 'Translation Hub', icon: '📝', services: ['Document Translation', 'Website Localization', 'Business Translation'] },
  { id: 'A15', name: 'Event Planner', icon: '🎉', services: ['Wedding Planning', 'Corporate Events', 'Birthday Parties'] },
]

const CATEGORIES = ['general', 'banking', 'insurance', 'healthcare', 'education', 'retail', 'manufacturing']
const INDUSTRIES = ['general', 'private', 'public', 'military']

const NODE_COLORS: Record<string, string> = {
  agent: '#FF6B35',
  condition: '#6B7280',
  email: '#3B82F6',
  payment: '#f59e0b',
}

interface CanvasNode {
  id: string
  type: string
  label: string
  icon: string
  x: number
  y: number
  agentId?: string
}

interface CanvasEdge {
  id: string
  from: string
  to: string
}

export function AdminWorkflowBuilder({ adminToken }: { adminToken: string }) {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null)
  const [templateName, setTemplateName] = useState('')
  const [templateDesc, setTemplateDesc] = useState('')
  const [templateCategory, setTemplateCategory] = useState('general')
  const [templateIndustry, setTemplateIndustry] = useState('general')
  const [canvasNodes, setCanvasNodes] = useState<CanvasNode[]>([])
  const [canvasEdges, setCanvasEdges] = useState<CanvasEdge[]>([])
  const [draggedAgent, setDraggedAgent] = useState<any>(null)
  const [showDeploy, setShowDeploy] = useState<string | null>(null)
  const [deployOrg, setDeployOrg] = useState('')
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const canvasRef = useRef<HTMLDivElement>(null)

  const templates = useQuery(api.admin_enterprise_hub.listTemplates, {})
  const orgs = useQuery(api.admin_enterprise.listOrganizations, { adminToken })
  const createTemplate = useMutation(api.admin_enterprise_hub.createTemplate)
  const updateTemplate = useMutation(api.admin_enterprise_hub.updateTemplate)
  const publishTemplate = useMutation(api.admin_enterprise_hub.publishTemplate)
  const deployToOrg = useMutation(api.admin_enterprise_hub.deployToOrg)
  const deleteTemplate = useMutation(api.admin_enterprise_hub.deleteTemplate)

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  const handleDragStart = (agent: any) => {
    setDraggedAgent(agent)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    if (!draggedAgent || !canvasRef.current) return
    const rect = canvasRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const newNode: CanvasNode = {
      id: `node_${Date.now()}`,
      type: 'agent',
      label: draggedAgent.name,
      icon: draggedAgent.icon,
      x,
      y,
      agentId: draggedAgent.id,
    }
    setCanvasNodes((prev) => [...prev, newNode])
    setDraggedAgent(null)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const addNode = (type: string) => {
    const labels: Record<string, string> = {
      condition: 'Condition',
      email: 'Send Email',
      payment: 'Payment',
    }
    const icons: Record<string, string> = {
      condition: '🔀',
      email: '📧',
      payment: '💰',
    }
    const newNode: CanvasNode = {
      id: `node_${Date.now()}`,
      type,
      label: labels[type] || type,
      icon: icons[type] || '📦',
      x: 200 + Math.random() * 200,
      y: 100 + Math.random() * 200,
    }
    setCanvasNodes((prev) => [...prev, newNode])
  }

  const removeNode = (nodeId: string) => {
    setCanvasNodes((prev) => prev.filter((n) => n.id !== nodeId))
    setCanvasEdges((prev) => prev.filter((e) => e.from !== nodeId && e.to !== nodeId))
  }

  const connectNodes = (fromId: string, toId: string) => {
    if (fromId === toId) return
    const exists = canvasEdges.some((e) => e.from === fromId && e.to === toId)
    if (!exists) {
      setCanvasEdges((prev) => [...prev, { id: `edge_${Date.now()}`, from: fromId, to: toId }])
    }
  }

  const handleSave = async () => {
    if (!templateName.trim()) { showToast('Template name is required', 'error'); return }
    setSaving(true)
    try {
      const requiredAgents = canvasNodes.filter((n) => n.type === 'agent').map((n) => n.agentId!).filter(Boolean)
      if (selectedTemplateId) {
        const result: any = await updateTemplate({
          templateId: selectedTemplateId as any,
          name: templateName,
          description: templateDesc,
          category: templateCategory,
          industry: templateIndustry,
          nodes: canvasNodes,
          edges: canvasEdges,
          requiredAgents,
        })
        if (result?.error) { showToast(result.error, 'error'); return }
        showToast('Template updated!', 'success')
      } else {
        const result: any = await createTemplate({
          name: templateName,
          description: templateDesc,
          category: templateCategory,
          industry: templateIndustry,
          nodes: canvasNodes,
          edges: canvasEdges,
          requiredAgents,
        })
        if (result?.error) { showToast(result.error, 'error'); return }
        showToast('Template created!', 'success')
      }
    } catch (e: any) { showToast(e.message || 'Failed', 'error') }
    finally { setSaving(false) }
  }

  const handlePublish = async (templateId: string) => {
    try {
      const result = await publishTemplate({ templateId: templateId as any })
      if (result.error) { showToast(result.error, 'error'); return }
      showToast('Template published!', 'success')
    } catch (e: any) { showToast(e.message || 'Failed', 'error') }
  }

  const handleDeploy = async (templateId: string) => {
    if (!deployOrg) { showToast('Select an organization', 'error'); return }
    try {
      const result = await deployToOrg({ templateId: templateId as any, orgId: deployOrg as any })
      if (result.error) { showToast(result.error, 'error'); return }
      showToast('Template deployed!', 'success')
      setShowDeploy(null)
      setDeployOrg('')
    } catch (e: any) { showToast(e.message || 'Failed', 'error') }
  }

  const handleDelete = async (templateId: string) => {
    try {
      await deleteTemplate({ templateId: templateId as any })
      showToast('Template deleted', 'success')
      if (selectedTemplateId === templateId) {
        setSelectedTemplateId(null)
        setTemplateName('')
        setTemplateDesc('')
        setCanvasNodes([])
        setCanvasEdges([])
      }
    } catch (e: any) { showToast(e.message || 'Failed', 'error') }
  }

  const handleLoadTemplate = (t: any) => {
    setSelectedTemplateId(t._id)
    setTemplateName(t.name)
    setTemplateDesc(t.description || '')
    setTemplateCategory(t.category || 'general')
    setTemplateIndustry(t.industry || 'general')
    setCanvasNodes(t.nodes || [])
    setCanvasEdges(t.edges || [])
  }

  const templateList = templates || []
  const orgList = orgs?.data || []

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl text-sm font-black ${toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-emerald-600 text-white'}`}>
          {toast.message}
        </div>
      )}

      <div className="grid grid-cols-12 gap-4" style={{ height: '70vh' }}>
        <div className="col-span-2 bg-white/5 border border-white/10 rounded-2xl p-3 overflow-y-auto">
          <h3 className="text-sm font-black mb-3 text-slate-300">Drag Agents</h3>
          <div className="space-y-2">
            {AGENTS.map((agent) => (
              <div
                key={agent.id}
                draggable
                onDragStart={() => handleDragStart(agent)}
                className="bg-white/5 border border-white/10 rounded-xl p-2.5 cursor-grab hover:border-[#FF6B35]/50 hover:bg-[#FF6B35]/10 transition-all duration-200 text-xs"
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">{agent.icon}</span>
                  <span className="font-bold text-white">{agent.name}</span>
                </div>
                <div className="text-[10px] text-slate-400 mt-1 truncate">{agent.services[0]}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="col-span-6 bg-white/5 border border-white/10 rounded-2xl flex flex-col">
          <div className="flex items-center justify-between px-4 py-2 border-b border-white/10">
            <h3 className="text-sm font-black text-slate-300">Canvas</h3>
            <div className="flex gap-1">
              {Object.entries(NODE_COLORS).map(([type, color]) => (
                type !== 'agent' && (
                  <button
                    key={type}
                    onClick={() => addNode(type)}
                    className="px-2 py-1 rounded-lg text-[10px] font-bold text-white transition-all duration-200 hover:opacity-80"
                    style={{ backgroundColor: color }}
                  >
                    + {type}
                  </button>
                )
              ))}
            </div>
          </div>
          <div
            ref={canvasRef}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            className="flex-1 relative overflow-hidden bg-[#0d0d14] rounded-b-2xl"
          >
            <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }}>
              {canvasEdges.map((edge) => {
                const fromNode = canvasNodes.find((n) => n.id === edge.from)
                const toNode = canvasNodes.find((n) => n.id === edge.to)
                if (!fromNode || !toNode) return null
                return (
                  <line
                    key={edge.id}
                    x1={fromNode.x + 60}
                    y1={fromNode.y + 25}
                    x2={toNode.x + 60}
                    y2={toNode.y + 25}
                    stroke="#FF6B35"
                    strokeWidth="2"
                    strokeOpacity="0.5"
                    markerEnd="url(#arrowhead)"
                  />
                )
              })}
              <defs>
                <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                  <polygon points="0 0, 10 3.5, 0 7" fill="#FF6B35" fillOpacity="0.5" />
                </marker>
              </defs>
            </svg>
            {canvasNodes.map((node) => (
              <div
                key={node.id}
                className="absolute flex items-center gap-2 px-3 py-2 rounded-xl border-2 text-xs font-bold text-white cursor-pointer hover:scale-105 transition-all duration-200"
                style={{
                  left: node.x,
                  top: node.y,
                  backgroundColor: `${NODE_COLORS[node.type] || '#FF6B35'}22`,
                  borderColor: NODE_COLORS[node.type] || '#FF6B35',
                  minWidth: '120px',
                }}
                onClick={() => {
                  const nextNode = canvasNodes.find((n) => n.id !== node.id)
                  if (nextNode) connectNodes(node.id, nextNode.id)
                }}
              >
                <span className="text-base">{node.icon}</span>
                <span className="flex-1 truncate">{node.label}</span>
                <button
                  onClick={(e) => { e.stopPropagation(); removeNode(node.id) }}
                  className="text-red-400 hover:text-red-300 transition-colors text-sm"
                >
                  ×
                </button>
              </div>
            ))}
            {canvasNodes.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center text-slate-600 text-sm">
                Drag agents here to build your workflow
              </div>
            )}
          </div>
        </div>

        <div className="col-span-4 space-y-4">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3">
            <h3 className="text-sm font-black text-slate-300">Template Details</h3>
            <input
              type="text"
              placeholder="Template name"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#FF6B35]/50 transition-colors"
            />
            <textarea
              placeholder="Description"
              value={templateDesc}
              onChange={(e) => setTemplateDesc(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#FF6B35]/50 transition-colors resize-none"
            />
            <select
              value={templateCategory}
              onChange={(e) => setTemplateCategory(e.target.value)}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-[#FF6B35]/50 transition-colors"
            >
              {CATEGORIES.map((c) => <option key={c} value={c} className="bg-[#0a0a0f]">{c}</option>)}
            </select>
            <select
              value={templateIndustry}
              onChange={(e) => setTemplateIndustry(e.target.value)}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-[#FF6B35]/50 transition-colors"
            >
              {INDUSTRIES.map((i) => <option key={i} value={i} className="bg-[#0a0a0f]">{i}</option>)}
            </select>
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 px-4 py-2 bg-[#FF6B35] hover:bg-[#FF8255] text-white rounded-xl text-sm font-black transition-all duration-200 disabled:opacity-50"
              >
                {saving ? 'Saving...' : selectedTemplateId ? 'Update' : 'Create'}
              </button>
              <button
                onClick={() => {
                  setSelectedTemplateId(null)
                  setTemplateName('')
                  setTemplateDesc('')
                  setCanvasNodes([])
                  setCanvasEdges([])
                }}
                className="px-4 py-2 bg-white/5 border border-white/10 text-white rounded-xl text-sm font-bold hover:bg-white/10 transition-all duration-200"
              >
                New
              </button>
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 max-h-[35vh] overflow-y-auto">
            <h3 className="text-sm font-black text-slate-300 mb-3">Saved Templates</h3>
            <div className="space-y-2">
              {templateList.length === 0 && (
                <div className="text-xs text-slate-500 text-center py-4">No templates yet</div>
              )}
              {templateList.map((t: any) => (
                <div
                  key={t._id}
                  className={`bg-white/5 border rounded-xl p-3 transition-all duration-200 ${
                    selectedTemplateId === t._id ? 'border-[#FF6B35]/50 bg-[#FF6B35]/10' : 'border-white/10 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold text-white truncate">{t.name}</div>
                      <div className="text-[10px] text-slate-400">{t.category} · {t.industry}</div>
                    </div>
                    <div className="flex items-center gap-1 ml-2">
                      {t.isPublished && <span className="px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 text-[9px] rounded-full font-bold">PUB</span>}
                      <span className="text-[10px] text-slate-500">v{t.version}</span>
                    </div>
                  </div>
                  <div className="flex gap-1 mt-2">
                    <button
                      onClick={() => handleLoadTemplate(t)}
                      className="flex-1 px-2 py-1 bg-white/5 border border-white/10 rounded-lg text-[10px] font-bold text-white hover:bg-white/10 transition-all duration-200"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handlePublish(t._id)}
                      className="flex-1 px-2 py-1 bg-emerald-500/20 border border-emerald-500/30 rounded-lg text-[10px] font-bold text-emerald-400 hover:bg-emerald-500/30 transition-all duration-200"
                    >
                      Publish
                    </button>
                    <div className="relative">
                      <button
                        onClick={() => setShowDeploy(showDeploy === t._id ? null : t._id)}
                        className="px-2 py-1 bg-blue-500/20 border border-blue-500/30 rounded-lg text-[10px] font-bold text-blue-400 hover:bg-blue-500/30 transition-all duration-200"
                      >
                        Deploy
                      </button>
                      {showDeploy === t._id && (
                        <div className="absolute top-full right-0 mt-1 bg-[#12121a] border border-white/10 rounded-xl p-2 z-10 w-48 shadow-xl">
                          <select
                            value={deployOrg}
                            onChange={(e) => setDeployOrg(e.target.value)}
                            className="w-full px-2 py-1 bg-white/5 border border-white/10 rounded-lg text-xs text-white mb-2 focus:outline-none"
                          >
                            <option value="" className="bg-[#0a0a0f]">Select org...</option>
                            {orgList.map((o: any) => <option key={o._id} value={o._id} className="bg-[#0a0a0f]">{o.name}</option>)}
                          </select>
                          <button
                            onClick={() => handleDeploy(t._id)}
                            className="w-full px-2 py-1 bg-blue-500 text-white rounded-lg text-[10px] font-bold hover:bg-blue-400 transition-colors"
                          >
                            Deploy Now
                          </button>
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => handleDelete(t._id)}
                      className="px-2 py-1 bg-red-500/20 border border-red-500/30 rounded-lg text-[10px] font-bold text-red-400 hover:bg-red-500/30 transition-all duration-200"
                    >
                      ×
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
