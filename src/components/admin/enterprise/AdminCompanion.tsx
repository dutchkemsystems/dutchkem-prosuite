import { useState } from 'react'

const SAMPLE_SESSIONS = [
  { id: 'CS1', userId: 'user_001', userName: 'Adaeze Okonkwo', channel: 'live_chat', status: 'active', startedAt: '14:32', messages: 12, sentiment: 'positive' },
  { id: 'CS2', userId: 'user_002', userName: 'Emeka Nwankwo', channel: 'whatsapp', status: 'active', startedAt: '14:28', messages: 8, sentiment: 'neutral' },
  { id: 'CS3', userId: 'user_003', userName: 'Fatima Abubakar', channel: 'web_portal', status: 'active', startedAt: '14:15', messages: 23, sentiment: 'positive' },
  { id: 'CS4', userId: 'user_004', userName: 'Chidi Eze', channel: 'live_chat', status: 'completed', startedAt: '13:50', messages: 15, sentiment: 'resolved' },
  { id: 'CS5', userId: 'user_005', userName: 'Aisha Bello', channel: 'telegram', status: 'completed', startedAt: '13:42', messages: 6, sentiment: 'resolved' },
  { id: 'CS6', userId: 'user_006', userName: 'Tunde Akinola', channel: 'sms', status: 'active', startedAt: '14:40', messages: 3, sentiment: 'neutral' },
]

const SENTIMENT_COLORS: Record<string, string> = {
  positive: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  neutral: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  resolved: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  negative: 'bg-red-500/20 text-red-400 border-red-500/30',
}

export function AdminCompanion({ agents, organizations }: { agents: any[], organizations: any[] }) {
  const [filter, setFilter] = useState('all')

  const activeCount = SAMPLE_SESSIONS.filter((s) => s.status === 'active').length
  const completedCount = SAMPLE_SESSIONS.filter((s) => s.status === 'completed').length
  const totalMessages = SAMPLE_SESSIONS.reduce((sum, s) => sum + s.messages, 0)

  const filtered = filter === 'all' ? SAMPLE_SESSIONS : SAMPLE_SESSIONS.filter((s) => s.status === filter)

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black tracking-tight">Companion Agent</h2>
          <p className="text-sm text-slate-400 mt-1">Monitor active companion sessions and user interactions</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 border border-white/10 rounded-2xl p-5">
          <div className="text-3xl font-black">{activeCount}</div>
          <div className="text-sm text-slate-400 mt-1">Active Sessions</div>
        </div>
        <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/10 border border-white/10 rounded-2xl p-5">
          <div className="text-3xl font-black">{completedCount}</div>
          <div className="text-sm text-slate-400 mt-1">Completed Today</div>
        </div>
        <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/10 border border-white/10 rounded-2xl p-5">
          <div className="text-3xl font-black">{totalMessages}</div>
          <div className="text-sm text-slate-400 mt-1">Total Messages</div>
        </div>
      </div>

      <div className="flex gap-2">
        {['all', 'active', 'completed'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 ${
              filter === f
                ? 'bg-[#FF6B35] text-white'
                : 'bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.map((session) => (
          <div
            key={session.id}
            className="bg-white/5 border border-white/10 rounded-2xl p-4 hover:border-white/20 transition-all duration-200"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-2.5 h-2.5 rounded-full ${session.status === 'active' ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
                <div>
                  <div className="text-sm font-black text-white">{session.userName}</div>
                  <div className="text-[10px] text-slate-500">{session.channel} · Started {session.startedAt}</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-400">{session.messages} msgs</span>
                <div className={`px-2 py-0.5 rounded-lg text-[10px] font-black border ${SENTIMENT_COLORS[session.sentiment]}`}>
                  {session.sentiment}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {organizations.length > 0 && (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
          <h3 className="text-sm font-black text-slate-300 mb-3">Companion Usage by Organization</h3>
          <div className="space-y-2">
            {organizations.slice(0, 5).map((org: any) => (
              <div key={org._id} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                <span className="text-sm text-white">{org.name}</span>
                <span className="text-xs text-slate-400">{Math.floor(Math.random() * 30) + 5} sessions today</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
