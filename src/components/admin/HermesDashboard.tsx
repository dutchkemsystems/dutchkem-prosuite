import { useState } from 'react'
import { useQuery, useMutation, useAction } from 'convex/react'
import { api } from '../../../convex/_generated/api'

type HermesDashboardProps = {
  adminToken: string
}

export function HermesDashboard({ adminToken }: HermesDashboardProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'tasks' | 'healing' | 'platforms' | 'design' | 'install'>('overview')
  const [toast, setToast] = useState<{ type: string; msg: string } | null>(null)
  const [taskInput, setTaskInput] = useState('')
  const [designForm, setDesignForm] = useState({ headline: '', body: '', cta: '', template: 'social_media', style: 'modern' })
  const [creatingDesign, setCreatingDesign] = useState(false)
  const [previewItem, setPreviewItem] = useState<any>(null)
  const [autoPostEnabled, setAutoPostEnabled] = useState(true)

  const status: any = useQuery(api.hermes_orchestrator.getStatus)
  const tasks: any = useQuery(api.hermes_orchestrator.getTasks, { limit: 20 })
  const healingLogs: any = useQuery(api.hermes_orchestrator.getHealingLogs, { limit: 20 })
  const platforms: any = useQuery(api.hermes_gateway.getPlatforms)
  const gatewayStats: any = useQuery(api.hermes_gateway.getGatewayStats)
  const installedServices: any = useQuery(api.hermes_auto_install.getInstalledServices)
  const availableServices: any = useQuery(api.hermes_auto_install.getAvailableServices)
  const adStatus: any = useQuery(api.adOrchestrator.getOrchestratorStatus)
  const generatedContent: any = useQuery(api.adOrchestrator.getGeneratedContent, { limit: 10, adminToken })
  const pendingApprovals: any = useQuery(api.adOrchestrator.getPendingApprovals, { adminToken })

  const startOrchestrator = useMutation(api.hermes_orchestrator.startOrchestrator)
  const stopOrchestrator = useMutation(api.hermes_orchestrator.stopOrchestrator)
  const runSelfHeal = useMutation(api.hermes_orchestrator.runSelfHeal)
  const delegateTask = useMutation(api.hermes_orchestrator.delegateTask)
  const togglePlatform = useMutation(api.hermes_gateway.togglePlatform)
  const installService = useMutation(api.hermes_auto_install.installService)
  const uninstallService = useMutation(api.hermes_auto_install.uninstallService)
  const toggleAdOrchestrator = useMutation(api.adOrchestrator.toggleOrchestrator)
  const toggleAdPlatform = useMutation(api.adOrchestrator.togglePlatform)
  const generateAdContent = useMutation(api.adOrchestrator.generateContent)
  const createDesign = useAction(api.ad_designer.createNewAdDesign)
  const generateVideo = useAction(api.video_generator.generateVideo)
  const approveContent = useMutation(api.adOrchestrator.approveContent)
  const rejectContent = useMutation(api.adOrchestrator.rejectContent)
  const postContent = useAction(api.adOrchestrator.postAcrossPlatforms)

  const showToast = (type: string, msg: string) => {
    setToast({ type, msg })
    setTimeout(() => setToast(null), 4000)
  }

  const handleStart = async () => {
    try {
      await startOrchestrator({ adminToken })
      showToast('success', 'Hermes orchestrator started')
    } catch (e: any) { showToast('error', e.message) }
  }

  const handleStop = async () => {
    try {
      await stopOrchestrator({ adminToken })
      showToast('success', 'Hermes orchestrator stopped')
    } catch (e: any) { showToast('error', e.message) }
  }

  const handleSelfHeal = async () => {
    try {
      const result = await runSelfHeal({ adminToken })
      showToast('success', `Health check: ${result.results?.length || 0} items checked`)
    } catch (e: any) { showToast('error', e.message) }
  }

  const handleDelegate = async () => {
    if (!taskInput.trim()) return
    try {
      await delegateTask({ task: taskInput, adminToken })
      setTaskInput('')
      showToast('success', 'Task queued')
    } catch (e: any) { showToast('error', e.message) }
  }

  const handleTogglePlatform = async (platformId: string, enabled: boolean) => {
    try {
      const result = await togglePlatform({ platformId, enabled, adminToken })
      if (result?.success) {
        showToast('success', `${platformId} ${enabled ? 'activated' : 'deactivated'}`)
      } else {
        showToast('error', result?.error || 'Failed to toggle platform')
      }
    } catch (e: any) { showToast('error', e.message) }
  }

  const handleInstall = async (serviceId: string) => {
    try {
      const result = await installService({ serviceId, adminToken })
      if (result?.success) {
        showToast('success', `${result.name} installed successfully`)
      } else {
        showToast('error', result?.error || 'Installation failed')
      }
    } catch (e: any) { showToast('error', e.message) }
  }

  const handleUninstall = async (serviceId: string) => {
    try {
      const result = await uninstallService({ serviceId, adminToken })
      if (result?.success) {
        showToast('success', 'Service uninstalled')
      } else {
        showToast('error', result?.error || 'Uninstall failed')
      }
    } catch (e: any) { showToast('error', e.message) }
  }

  const tabs = [
    { id: 'overview' as const, label: 'Overview', icon: '📊' },
    { id: 'tasks' as const, label: 'Tasks', icon: '📋' },
    { id: 'healing' as const, label: 'Self-Heal', icon: '🩺' },
    { id: 'platforms' as const, label: 'Platforms', icon: '🌐' },
    { id: 'design' as const, label: 'Design & Ads', icon: '🎨' },
    { id: 'install' as const, label: 'Install', icon: '📦' },
  ]

  if (!status) {
    return (
      <div className="space-y-6">
        <h2 className="text-xl font-black">🤖 Hermes AI Orchestrator</h2>
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black">🤖 Hermes AI Orchestrator</h2>
          <p className="text-xs text-slate-400 mt-1">Self-healing • Auto-diagnose • Multi-platform gateway</p>
        </div>
        <div className="flex gap-2">
          {!status.isRunning ? (
            <button onClick={handleStart} className="px-4 py-2 bg-emerald-500 text-white rounded-xl text-xs font-bold hover:bg-emerald-600">
              ▶ Start
            </button>
          ) : (
            <button onClick={handleStop} className="px-4 py-2 bg-red-500 text-white rounded-xl text-xs font-bold hover:bg-red-600">
              ⏹ Stop
            </button>
          )}
          <button onClick={handleSelfHeal} className="px-4 py-2 bg-blue-500 text-white rounded-xl text-xs font-bold hover:bg-blue-600">
            🩺 Run Check
          </button>
        </div>
      </div>

      <div className="flex gap-1 bg-slate-800 rounded-xl p-1">
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === tab.id ? 'bg-purple-500 text-white' : 'text-slate-400 hover:text-white'
            }`}>
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className={`rounded-2xl p-4 text-center ${status.isRunning ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-slate-900 border border-slate-800'}`}>
              <p className="text-2xl">{status.isRunning ? '🟢' : '🔴'}</p>
              <p className="text-[10px] text-slate-500 uppercase mt-1">Orchestrator</p>
            </div>
            <div className={`rounded-2xl p-4 text-center ${status.selfHealingActive ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-slate-900 border border-slate-800'}`}>
              <p className="text-2xl">{status.selfHealingActive ? '🟢' : '🔴'}</p>
              <p className="text-[10px] text-slate-500 uppercase mt-1">Self-Healing</p>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
              <p className="text-2xl font-black text-white">{status.tasksCompleted || 0}</p>
              <p className="text-[10px] text-slate-500 uppercase mt-1">Tasks Done</p>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
              <p className="text-2xl font-black text-emerald-400">{status.issuesFixed || 0}</p>
              <p className="text-[10px] text-slate-500 uppercase mt-1">Issues Fixed</p>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
            <h3 className="font-bold text-sm mb-3">📤 Delegate Task</h3>
            <div className="flex gap-2">
              <input type="text" value={taskInput} onChange={(e) => setTaskInput(e.target.value)}
                placeholder="Describe the task..."
                onKeyDown={(e) => e.key === 'Enter' && handleDelegate()}
                className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white" />
              <button onClick={handleDelegate} className="px-6 py-3 bg-purple-500 text-white rounded-xl text-sm font-bold hover:bg-purple-600">
                🚀 Delegate
              </button>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
            <h3 className="font-bold text-sm mb-3">🌐 Platform Gateway</h3>
            <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
              {platforms?.slice(0, 12).map((p: any) => (
                <div key={p.id} className={`p-2 rounded-xl text-center text-xs ${
                  p.connected ? 'bg-emerald-500/10 text-emerald-400' : 
                  p.status === 'active' ? 'bg-blue-500/10 text-blue-400' : 
                  'bg-slate-800 text-slate-500'
                }`}>
                  <span className="text-lg">{p.icon}</span>
                  <p className="mt-1 truncate">{p.name}</p>
                  <p className="text-[8px] mt-0.5">
                    {p.connected ? '🟢 Connected' : p.status === 'active' ? '🟡 Available' : '⚪ Inactive'}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'tasks' && (
        <div className="space-y-4">
          <h3 className="font-black">📋 Task Queue</h3>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
            <table className="w-full">
              <thead><tr className="border-b border-slate-800">
                <th className="text-left px-4 py-3 text-[10px] text-slate-500 uppercase font-bold">Task</th>
                <th className="text-left px-4 py-3 text-[10px] text-slate-500 uppercase font-bold">Status</th>
                <th className="text-left px-4 py-3 text-[10px] text-slate-500 uppercase font-bold">Priority</th>
              </tr></thead>
              <tbody>
                {tasks?.map((t: any) => (
                  <tr key={t._id} className="border-b border-slate-800/50">
                    <td className="px-4 py-3 text-xs font-bold">{t.description}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        t.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400' :
                        t.status === 'running' ? 'bg-blue-500/10 text-blue-400' :
                        t.status === 'failed' ? 'bg-red-500/10 text-red-400' :
                        'bg-slate-700 text-slate-400'
                      }`}>{t.status}</span>
                    </td>
                    <td className="px-4 py-3 text-xs">{t.priority}</td>
                  </tr>
                ))}
                {(!tasks || tasks.length === 0) && (
                  <tr><td colSpan={3} className="px-4 py-8 text-center text-xs text-slate-500">No tasks yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'healing' && (
        <div className="space-y-4">
          <h3 className="font-black">🩺 Self-Healing Logs</h3>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
            <table className="w-full">
              <thead><tr className="border-b border-slate-800">
                <th className="text-left px-4 py-3 text-[10px] text-slate-500 uppercase font-bold">Time</th>
                <th className="text-left px-4 py-3 text-[10px] text-slate-500 uppercase font-bold">Component</th>
                <th className="text-left px-4 py-3 text-[10px] text-slate-500 uppercase font-bold">Action</th>
                <th className="text-right px-4 py-3 text-[10px] text-slate-500 uppercase font-bold">Fixes</th>
              </tr></thead>
              <tbody>
                {healingLogs?.map((log: any) => (
                  <tr key={log._id} className="border-b border-slate-800/50">
                    <td className="px-4 py-3 text-xs text-slate-400">{new Date(log.timestamp).toLocaleString()}</td>
                    <td className="px-4 py-3 text-xs font-bold">{log.component}</td>
                    <td className="px-4 py-3 text-xs">{log.action}</td>
                    <td className="px-4 py-3 text-right text-xs text-emerald-400">{log.fixesApplied}</td>
                  </tr>
                ))}
                {(!healingLogs || healingLogs.length === 0) && (
                  <tr><td colSpan={4} className="px-4 py-8 text-center text-xs text-slate-500">No healing logs yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'platforms' && (
        <div className="space-y-4">
          <h3 className="font-black">🌐 Platform Gateway ({platforms?.length || 0} platforms)</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {platforms?.map((p: any) => (
              <div key={p.id} className={`rounded-2xl border-l-4 p-4 transition-all ${
                p.status === 'active' ? 'bg-emerald-500/5 border-l-emerald-500' : 'bg-slate-900 border-l-slate-700'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{p.icon}</span>
                    <div>
                      <p className="font-black text-sm">{p.name}</p>
                      <p className="text-[10px] text-slate-400">{p.number || p.description || p.id}</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" checked={p.status === 'active'}
                      onChange={(e) => handleTogglePlatform(p.id, e.target.checked)}
                      className="sr-only peer" />
                    <div className="w-11 h-6 bg-slate-700 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-500" />
                  </label>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'design' && (
        <div className="space-y-4">
          <h3 className="font-black">🎨 Design & Advert Creation</h3>
          <p className="text-xs text-slate-400">Auto-generate → Preview → Approve → Auto-Post</p>

          {/* Status Bar */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="font-black text-sm">🌍 Auto-Post Orchestrator</p>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" checked={adStatus?.enabled ?? false}
                  onChange={async () => {
                    try {
                      await toggleAdOrchestrator({ enabled: !(adStatus?.enabled ?? false), adminToken })
                      showToast('success', `Orchestrator ${!(adStatus?.enabled ?? false) ? 'ENABLED' : 'DISABLED'}`)
                    } catch (e: any) { showToast('error', e.message) }
                  }}
                  className="sr-only peer" />
                <div className="w-11 h-6 bg-slate-700 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500" />
              </label>
            </div>
            <div className="grid grid-cols-4 gap-2 text-center">
              <div><p className="text-base font-black text-white">{adStatus?.totalGenerated ?? 0}</p><p className="text-[9px] text-slate-500">Generated</p></div>
              <div><p className="text-base font-black text-amber-400">{pendingApprovals?.length ?? 0}</p><p className="text-[9px] text-slate-500">Pending</p></div>
              <div><p className="text-base font-black text-emerald-400">{adStatus?.totalPosted ?? 0}</p><p className="text-[9px] text-slate-500">Posted</p></div>
              <div><p className="text-base font-black text-blue-400">{adStatus?.platforms?.filter((p: any) => p.enabled).length ?? 0}</p><p className="text-[9px] text-slate-500">Platforms</p></div>
            </div>
          </div>

          {/* ALL 7 BUTTONS - Always Visible */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <h4 className="font-bold text-sm mb-3">⚡ All Action Buttons</h4>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={async () => {
                try {
                  const result = await generateAdContent({ adminToken })
                  showToast('success', `Generated: ${result.headline}`)
                } catch (e: any) { showToast('error', e.message) }
              }} className="py-3 bg-emerald-500 text-white rounded-xl text-sm font-bold hover:bg-emerald-600">
                📢 Generate Ad Content
              </button>
              <button onClick={async () => {
                try {
                  const result = await generateAdContent({ adminToken })
                  await approveContent({ contentId: result.contentId, autoPost: true, adminToken })
                  showToast('success', `Generated & posted: ${result.headline}`)
                } catch (e: any) { showToast('error', e.message) }
              }} className="py-3 bg-purple-500 text-white rounded-xl text-sm font-bold hover:bg-purple-600">
                ⚡ Generate & Auto-Post
              </button>
              <button onClick={async () => {
                if (!pendingApprovals || pendingApprovals.length === 0) { showToast('error', 'No pending items to approve'); return }
                const item = pendingApprovals[0]
                try {
                  await approveContent({ contentId: item._id, autoPost: true, adminToken })
                  showToast('success', `Approved & posting: ${item.headline}`)
                } catch (e: any) { showToast('error', e.message) }
              }} className="py-3 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700">
                ✅ Approve & Post
              </button>
              <button onClick={async () => {
                if (!pendingApprovals || pendingApprovals.length === 0) { showToast('error', 'No pending items to approve'); return }
                const item = pendingApprovals[0]
                try {
                  await approveContent({ contentId: item._id, autoPost: false, adminToken })
                  showToast('success', `Approved: ${item.headline}`)
                } catch (e: any) { showToast('error', e.message) }
              }} className="py-3 bg-blue-500 text-white rounded-xl text-sm font-bold hover:bg-blue-600">
                📋 Approve Only
              </button>
              <button onClick={async () => {
                if (!pendingApprovals || pendingApprovals.length === 0) { showToast('error', 'No pending items to reject'); return }
                const item = pendingApprovals[0]
                try {
                  await rejectContent({ contentId: item._id, adminToken })
                  showToast('success', `Rejected: ${item.headline}`)
                } catch (e: any) { showToast('error', e.message) }
              }} className="py-3 bg-red-500 text-white rounded-xl text-sm font-bold hover:bg-red-600">
                ✗ Reject
              </button>
              <button onClick={async () => {
                if (!designForm.headline || !designForm.body) { showToast('error', 'Fill headline & body first'); return }
                setCreatingDesign(true)
                try {
                  await createDesign({ adminToken, headline: designForm.headline, body: designForm.body, cta: designForm.cta || 'Learn More', url: 'https://dutchkem-prosuite-app.vercel.app', template: designForm.template, style: designForm.style })
                  showToast('success', 'Design created!')
                } catch (e: any) { showToast('error', e.message) }
                setCreatingDesign(false)
              }} disabled={creatingDesign} className="py-3 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 disabled:opacity-50">
                {creatingDesign ? '⏳ Creating...' : '🎨 Create Design'}
              </button>
              <button onClick={async () => {
                const prompt = (document.getElementById('videoPrompt') as HTMLInputElement)?.value
                const duration = parseInt((document.getElementById('videoDuration') as HTMLSelectElement)?.value || '30')
                const quality = (document.getElementById('videoQuality') as HTMLSelectElement)?.value || 'hd'
                if (!prompt) { showToast('error', 'Enter video description'); return }
                try {
                  const result = await generateVideo({ prompt, duration, quality, adminToken })
                  showToast('success', `Video generated! Model: ${result.model}`)
                } catch (e: any) { showToast('error', e.message) }
              }} className="py-3 bg-orange-500 text-white rounded-xl text-sm font-bold hover:bg-orange-600">
                🎥 Generate Video
              </button>
            </div>
          </div>

          {/* Design Form */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <h4 className="font-bold text-sm mb-3">🖼️ Design Settings</h4>
            <div className="space-y-3">
              <input type="text" value={designForm.headline} onChange={(e) => setDesignForm({ ...designForm, headline: e.target.value })}
                placeholder="Headline" className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white" />
              <textarea value={designForm.body} onChange={(e) => setDesignForm({ ...designForm, body: e.target.value })}
                placeholder="Body text" className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white h-16" />
              <input type="text" value={designForm.cta} onChange={(e) => setDesignForm({ ...designForm, cta: e.target.value })}
                placeholder="Call to Action" className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white" />
              <div className="grid grid-cols-2 gap-3">
                <select value={designForm.template} onChange={(e) => setDesignForm({ ...designForm, template: e.target.value })}
                  className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white">
                  <option value="social_media">Social Media</option>
                  <option value="story">Story/Reel</option>
                  <option value="banner">Banner</option>
                  <option value="flyer">Flyer</option>
                  <option value="poster">Poster</option>
                </select>
                <select value={designForm.style} onChange={(e) => setDesignForm({ ...designForm, style: e.target.value })}
                  className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white">
                  <option value="modern">Modern</option>
                  <option value="vibrant">Vibrant</option>
                  <option value="minimal">Minimal</option>
                  <option value="corporate">Corporate</option>
                  <option value="playful">Playful</option>
                </select>
              </div>
            </div>
          </div>

          {/* Video Form */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <h4 className="font-bold text-sm mb-3">🎬 Video Settings (A8)</h4>
            <input type="text" id="videoPrompt" placeholder="Describe your video"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white mb-3" />
            <div className="grid grid-cols-2 gap-3">
              <select id="videoDuration" className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white">
                <option value="15">15 sec</option>
                <option value="30">30 sec</option>
                <option value="60">60 sec</option>
                <option value="90">90 sec</option>
              </select>
              <select id="videoQuality" className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white">
                <option value="sd">SD (720p)</option>
                <option value="hd">HD (1080p)</option>
                <option value="4k">4K Ultra</option>
              </select>
            </div>
          </div>

          {/* Platforms */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <h4 className="font-bold text-sm mb-3">🌐 Platforms</h4>
            <div className="grid grid-cols-3 gap-2">
              {(adStatus?.platforms ?? []).map((p: any) => (
                <div key={p.id} className="flex items-center gap-2 bg-slate-800 rounded-lg p-2">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" checked={p.enabled}
                      onChange={async () => {
                        try {
                          await toggleAdPlatform({ platformId: p.id, enabled: !p.enabled, adminToken })
                          showToast('success', `${p.id} ${!p.enabled ? 'ON' : 'OFF'}`)
                        } catch (e: any) { showToast('error', e.message) }
                      }}
                      className="sr-only peer" />
                    <div className="w-8 h-4 bg-slate-700 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-emerald-500" />
                  </label>
                  <span className="text-[10px] text-slate-400">{p.id}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Recent */}
          {generatedContent?.content?.length > 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <h4 className="font-bold text-sm mb-3">📋 Recent</h4>
              {generatedContent.content.slice(0, 3).map((c: any) => (
                <div key={c._id} className="bg-slate-800 rounded-lg p-3 mb-2 flex justify-between items-center">
                  <span className="text-xs font-bold truncate">{c.headline}</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    c.status === 'posted' ? 'bg-emerald-500/20 text-emerald-400' :
                    c.status === 'approved' ? 'bg-blue-500/20 text-blue-400' :
                    c.status === 'pending' ? 'bg-amber-500/20 text-amber-400' :
                    'bg-slate-700 text-slate-400'
                  }`}>{c.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'install' && (
        <div className="space-y-4">
          <h3 className="font-black">📦 Auto-Installation</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {availableServices?.map((s: any) => {
              const installed = installedServices?.find((i: any) => i.serviceId === s.id)
              const isInstalled = installed?.status === 'installed'
              return (
                <div key={s.id} className={`border rounded-2xl p-4 transition-all ${isInstalled ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-slate-900 border-slate-800'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-black text-sm">{s.name}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      isInstalled ? 'bg-emerald-500/10 text-emerald-400' :
                      installed?.status === 'installing' ? 'bg-blue-500/10 text-blue-400' :
                      'bg-slate-700 text-slate-400'
                    }`}>{installed?.status || 'available'}</span>
                  </div>
                  <p className="text-xs text-slate-400 mb-3">{s.description}</p>
                  {isInstalled ? (
                    <div className="flex gap-2">
                      <div className="flex-1 py-2 bg-emerald-500/10 text-emerald-400 rounded-xl text-xs font-bold text-center">
                        ✅ Installed {installed.version ? `v${installed.version}` : ''}
                      </div>
                      <button onClick={() => handleUninstall(s.id)}
                        className="px-4 py-2 bg-red-500/10 text-red-400 rounded-xl text-xs font-bold hover:bg-red-500/20 transition-all">
                        Uninstall
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => handleInstall(s.id)}
                      disabled={installed?.status === 'installing'}
                      className="w-full py-2 bg-purple-500 text-white rounded-xl text-xs font-bold hover:bg-purple-600 disabled:opacity-50 disabled:bg-slate-700 transition-all">
                      {installed?.status === 'installing' ? '⏳ Installing...' : '📦 Install'}
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {toast && (
        <div className={`fixed bottom-6 right-6 px-5 py-3 rounded-2xl shadow-2xl z-50 animate-pulse ${
          toast.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'
        }`}>
          <p className="text-sm font-bold">{toast.msg}</p>
        </div>
      )}
    </div>
  )
}
