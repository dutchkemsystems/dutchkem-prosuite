import { useState } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../../convex/_generated/api'

const SENTIMENT_COLORS: Record<string, string> = {
  positive: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  neutral: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  active: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  ended: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
  negative: 'bg-red-500/20 text-red-400 border-red-500/30',
}

export function AdminCompanion({ adminToken, organizations }: { adminToken: string, agents: any[], organizations: any[] }) {
  const [filter, setFilter] = useState('all')
  const [selectedOrg, setSelectedOrg] = useState(organizations[0]?._id || '')
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const sessions = useQuery(api.enterprise_companion.listSessions, selectedOrg ? { orgId: selectedOrg as any, adminToken } : "skip")
  const stats = useQuery(api.enterprise_companion.getStats, selectedOrg ? { orgId: selectedOrg as any, adminToken } : "skip")
  const endSession = useMutation(api.enterprise_companion.endSession)

  const sessionList = sessions || []
  const filtered = filter === 'all' ? sessionList : sessionList.filter((s: any) => s.status === filter)

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  const handleEndSession = async (sessionId: string) => {
    try {
      await endSession({ sessionId: sessionId as any, adminToken })
      showToast('Session ended', 'success')
    } catch (e: any) { showToast(e.message || 'Failed', 'error') }
  }

  return (
    <div className="space-y-6 ">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl text-sm font-black ${toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-emerald-600 text-white'}`}>
          {toast.message}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black tracking-tight">Companion Agent</h2>
          <p className="text-sm text-slate-400 mt-1">Monitor active companion sessions and user interactions</p>
        </div>
        <select value={selectedOrg} onChange={(e) => setSelectedOrg(e.target.value)} className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-[#FF6B35]/50">
          <option value="" className="bg-[#0a0a0f]">Select organization...</option>
          {organizations.map((o: any) => <option key={o._id} value={o._id} className="bg-[#0a0a0f]">{o.name}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 border border-white/10 rounded-2xl p-5">
          <div className="text-3xl font-black">{stats?.activeSessions ?? 0}</div>
          <div className="text-sm text-slate-400 mt-1">Active Sessions</div>
        </div>
        <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/10 border border-white/10 rounded-2xl p-5">
          <div className="text-3xl font-black">{stats?.totalSessions ?? 0}</div>
          <div className="text-sm text-slate-400 mt-1">Total Sessions</div>
        </div>
        <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/10 border border-white/10 rounded-2xl p-5">
          <div className="text-3xl font-black">{Math.round((stats?.avgDuration || 0) / 60000)}m</div>
          <div className="text-sm text-slate-400 mt-1">Avg Duration</div>
        </div>
      </div>

      <div className="flex gap-2">
        {['all', 'active', 'ended'].map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 ${filter === f ? 'bg-[#FF6B35] text-white' : 'bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10'}`}>
            {f}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.length === 0 && (
          <div className="text-center py-12 text-slate-600 text-sm">
            {selectedOrg ? 'No companion sessions yet.' : 'Select an organization to view sessions.'}
          </div>
        )}
        {filtered.map((session: any) => (
          <div key={session._id} className="bg-white/5 border border-white/10 rounded-2xl p-4 hover:border-white/20 transition-all duration-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-2.5 h-2.5 rounded-full ${session.status === 'active' ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
                <div>
                  <div className="text-sm font-black text-white">User {session.userId}</div>
                  <div className="text-[10px] text-slate-500">{session.channel} · Started {new Date(session.startedAt).toLocaleTimeString()}</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-400">{session.guidanceCount || 0} interactions</span>
                <div className={`px-2 py-0.5 rounded-lg text-[10px] font-black border ${SENTIMENT_COLORS[session.status] || SENTIMENT_COLORS.neutral}`}>
                  {session.status}
                </div>
                {session.status === 'active' && (
                  <button onClick={() => handleEndSession(session._id)} className="px-2 py-1 bg-red-500/20 border border-red-500/30 rounded-lg text-[10px] font-bold text-red-400 hover:bg-red-500/30 transition-all duration-200">
                    End
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
