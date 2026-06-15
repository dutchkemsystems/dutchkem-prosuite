import { useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { api } from '../../../../convex/_generated/api'

export function CompanionAgentTab({ token }: { token: string }) {
  const org = useQuery(api.enterprise_auth.getOrgDetails, token ? { token } : 'skip')
  const orgId = org?._id

  const sessions = useQuery(api.enterprise_companion.listSessions, orgId ? { orgId, token } : 'skip') || []
  const stats = useQuery(api.enterprise_companion.getStats, orgId ? { orgId, token } : 'skip') || { totalSessions: 0, activeSessions: 0, avgDuration: 0 }
  const startSession = useMutation(api.enterprise_companion.startSession)
  const endSession = useMutation(api.enterprise_companion.endSession)
  const generateGuidance = useMutation(api.enterprise_companion.generateGuidance)

  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)
  const [guidance, setGuidance] = useState<any[]>([])
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [starting, setStarting] = useState(false)
  const [userId, setUserId] = useState('')
  const [channel, setChannel] = useState('live_chat')
  const [showStartForm, setShowStartForm] = useState(false)
  const [generatingGuidance, setGeneratingGuidance] = useState(false)

  const showToast = (msg: string, isError = false) => {
    if (isError) setError(msg)
    else setSuccess(msg)
    setTimeout(() => { setError(''); setSuccess('') }, 3000)
  }

  const handleStart = async () => {
    if (!userId.trim()) { showToast('User ID is required', true); return }
    setStarting(true)
    try {
      const result = await startSession({ orgId: orgId!, token, userId: userId as any, channel })
      if (result.error) { showToast(result.error, true); return }
      setActiveSessionId(result.sessionId as string)
      setShowStartForm(false)
      showToast('Companion session started!')
    } catch (e: any) { showToast(e.message || 'Failed', true) }
    finally { setStarting(false) }
  }

  const handleEnd = async () => {
    if (!activeSessionId) return
    try {
      const result = await endSession({ sessionId: activeSessionId as any, token })
      if (result.error) { showToast(result.error, true); return }
      setActiveSessionId(null)
      setGuidance([])
      showToast('Session ended')
    } catch (e: any) { showToast(e.message || 'Failed', true) }
  }

  const handleGenerateGuidance = async () => {
    if (!activeSessionId) return
    setGeneratingGuidance(true)
    try {
      const result = await generateGuidance({ sessionId: activeSessionId as any, token, userId: userId as any, question: 'Help me with my task' })
      if (result.error) { showToast(result.error, true); return }
      setGuidance(prev => [{ type: 'suggestion', message: `Guidance generated (count: ${result.guidanceCount})`, time: new Date().toLocaleTimeString() }, ...prev].slice(0, 20))
      showToast('Guidance generated!')
    } catch (e: any) { showToast(e.message || 'Failed', true) }
    finally { setGeneratingGuidance(false) }
  }

  const typeColors: Record<string, string> = {
    suggestion: 'bg-blue-500/10 text-blue-400',
    compliance: 'bg-red-500/10 text-red-400',
    template: 'bg-violet-500/10 text-violet-400',
    alert: 'bg-amber-500/10 text-amber-400',
    upsell: 'bg-emerald-500/10 text-emerald-400',
  }

  const typeIcons: Record<string, string> = {
    suggestion: '💡',
    compliance: '⚠️',
    template: '📝',
    alert: '🔔',
    upsell: '📈',
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {(error || success) && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl text-sm font-black ${error ? 'bg-red-600 text-white' : 'bg-emerald-600 text-white'}`}>
          {error || success}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black tracking-tight">Companion Agent</h2>
          <p className="text-sm text-slate-400 mt-1">Real-time guidance for human teams</p>
        </div>
        {activeSessionId ? (
          <button onClick={handleEnd}
            className="px-6 py-3 bg-red-500/10 text-red-400 border border-red-500/20 font-black text-sm rounded-xl hover:bg-red-500/20 transition-all">
            ⏹ End Session
          </button>
        ) : (
          <button onClick={() => setShowStartForm(!showStartForm)}
            className="px-6 py-3 bg-emerald-600 text-white font-black text-sm rounded-xl hover:bg-emerald-700 transition-all">
            ▶ Start Session
          </button>
        )}
      </div>

      {error && <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm font-bold">{error}</div>}
      {success && <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-sm font-bold">{success}</div>}

      {/* Start Session Form */}
      {showStartForm && (
        <div className="p-6 bg-white/5 border border-white/10 rounded-2xl space-y-4">
          <h3 className="font-black">Start Companion Session</h3>
          <div className="grid grid-cols-2 gap-4">
            <input value={userId} onChange={e => setUserId(e.target.value)}
              placeholder="User/Customer ID" className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 font-medium" />
            <select value={channel} onChange={e => setChannel(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 font-medium">
              <option value="live_chat">Live Chat</option>
              <option value="phone">Phone</option>
              <option value="email">Email</option>
              <option value="social">Social Media</option>
            </select>
          </div>
          <button onClick={handleStart} disabled={starting}
            className="px-6 py-3 bg-emerald-600 text-white font-black text-sm rounded-xl hover:bg-emerald-700 transition-all disabled:opacity-50">
            {starting ? 'Starting...' : 'Start Session'}
          </button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="p-5 bg-white/5 border border-white/10 rounded-2xl text-center">
          <p className="text-3xl font-black text-emerald-400">{stats.totalSessions}</p>
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">Total Sessions</p>
        </div>
        <div className="p-5 bg-white/5 border border-white/10 rounded-2xl text-center">
          <p className="text-3xl font-black text-blue-400">{stats.activeSessions}</p>
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">Active Now</p>
        </div>
        <div className="p-5 bg-white/5 border border-white/10 rounded-2xl text-center">
          <p className="text-3xl font-black text-violet-400">{stats.avgDuration > 0 ? `${Math.round(stats.avgDuration / 60000)}m` : '0m'}</p>
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">Avg Duration</p>
        </div>
      </div>

      {/* Live Guidance Feed */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-black uppercase tracking-widest text-slate-500">
            {activeSessionId ? '🔴 Live Guidance Feed' : 'Recent Guidance'}
          </h3>
          {activeSessionId && (
            <button onClick={handleGenerateGuidance} disabled={generatingGuidance}
              className="px-4 py-2 bg-emerald-600 text-white font-black text-xs rounded-xl hover:bg-emerald-700 transition-all disabled:opacity-50">
              {generatingGuidance ? 'Generating...' : '⚡ Generate Guidance'}
            </button>
          )}
        </div>
        <div className="space-y-3 max-h-[400px] overflow-y-auto">
          {guidance.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-4xl mb-4">🤝</p>
              <p className="text-slate-500 font-bold">
                {activeSessionId ? 'Click "Generate Guidance" to get real-time suggestions' : 'Start a session to receive real-time guidance'}
              </p>
            </div>
          ) : guidance.map((g: any, i: number) => (
            <div key={i} className={`flex items-start gap-3 p-4 rounded-xl transition-all ${
              i === 0 && activeSessionId ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-white/5'
            }`}>
              <div className="w-8 h-8 bg-emerald-500/20 rounded-lg flex items-center justify-center text-sm flex-shrink-0">
                {typeIcons[g.type] || '🤝'}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-300">{g.message}</p>
                <div className="flex items-center gap-3 mt-2">
                  <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${typeColors[g.type] || 'bg-white/5 text-slate-400'}`}>
                    {g.type}
                  </span>
                  <span className="text-[10px] text-slate-600">{g.time}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Sessions */}
      {sessions.length > 0 && (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <h3 className="text-sm font-black uppercase tracking-widest text-slate-500 mb-4">Recent Sessions</h3>
          <div className="divide-y divide-white/5">
            {sessions.slice(0, 5).map((s: any) => (
              <div key={s._id} className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${s.status === 'active' ? 'bg-emerald-400' : 'bg-slate-600'}`} />
                  <div>
                    <p className="text-sm font-bold">{s.userId}</p>
                    <p className="text-xs text-slate-500">{s.channel} · {s.guidanceCount} guidance</p>
                  </div>
                </div>
                <span className="text-xs text-slate-500">{new Date(s.startedAt).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
