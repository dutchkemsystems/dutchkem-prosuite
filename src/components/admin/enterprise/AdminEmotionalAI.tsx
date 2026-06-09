import { useState } from 'react'

const SAMPLE_PROFILES = [
  { id: 'EP1', userName: 'Adaeze Okonkwo', dominantEmotion: 'joy', confidence: 0.87, tone: 'enthusiastic', interactions: 42, lastActive: '5m ago' },
  { id: 'EP2', userName: 'Emeka Nwankwo', dominantEmotion: 'neutral', confidence: 0.72, tone: 'professional', interactions: 28, lastActive: '12m ago' },
  { id: 'EP3', userName: 'Fatima Abubakar', dominantEmotion: 'frustration', confidence: 0.65, tone: 'assertive', interactions: 15, lastActive: '25m ago' },
  { id: 'EP4', userName: 'Chidi Eze', dominantEmotion: 'satisfaction', confidence: 0.91, tone: 'warm', interactions: 56, lastActive: '1h ago' },
  { id: 'EP5', userName: 'Aisha Bello', dominantEmotion: 'anxiety', confidence: 0.58, tone: 'cautious', interactions: 19, lastActive: '2h ago' },
  { id: 'EP6', userName: 'Tunde Akinola', dominantEmotion: 'joy', confidence: 0.83, tone: 'friendly', interactions: 37, lastActive: '3h ago' },
  { id: 'EP7', userName: 'Ngozi Okafor', dominantEmotion: 'trust', confidence: 0.79, tone: 'reassuring', interactions: 31, lastActive: '4h ago' },
  { id: 'EP8', userName: 'Yusuf Danjuma', dominantEmotion: 'neutral', confidence: 0.68, tone: 'formal', interactions: 12, lastActive: '5h ago' },
]

const EMOTION_COLORS: Record<string, string> = {
  joy: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  neutral: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
  frustration: 'bg-red-500/20 text-red-400 border-red-500/30',
  satisfaction: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  anxiety: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  trust: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
}

export function AdminEmotionalAI({ agents, organizations }: { agents: any[], organizations: any[] }) {
  const [filter, setFilter] = useState('all')

  const totalInteractions = SAMPLE_PROFILES.reduce((sum, p) => sum + p.interactions, 0)
  const avgConfidence = SAMPLE_PROFILES.reduce((sum, p) => sum + p.confidence, 0) / SAMPLE_PROFILES.length
  const emotions = [...new Set(SAMPLE_PROFILES.map((p) => p.dominantEmotion))]

  const filtered = filter === 'all' ? SAMPLE_PROFILES : SAMPLE_PROFILES.filter((p) => p.dominantEmotion === filter)

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black tracking-tight">Emotional AI</h2>
          <p className="text-sm text-slate-400 mt-1">Monitor emotional profiles and sentiment analysis across users</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-rose-500/20 to-rose-600/10 border border-white/10 rounded-2xl p-5">
          <div className="text-3xl font-black">{SAMPLE_PROFILES.length}</div>
          <div className="text-sm text-slate-400 mt-1">Active Profiles</div>
        </div>
        <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/10 border border-white/10 rounded-2xl p-5">
          <div className="text-3xl font-black">{totalInteractions}</div>
          <div className="text-sm text-slate-400 mt-1">Total Interactions</div>
        </div>
        <div className="bg-gradient-to-br from-cyan-500/20 to-cyan-600/10 border border-white/10 rounded-2xl p-5">
          <div className="text-3xl font-black">{(avgConfidence * 100).toFixed(0)}%</div>
          <div className="text-sm text-slate-400 mt-1">Avg Confidence</div>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {['all', ...emotions].map((e) => (
          <button
            key={e}
            onClick={() => setFilter(e)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 ${
              filter === e
                ? 'bg-[#FF6B35] text-white'
                : 'bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10'
            }`}
          >
            {e}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.map((profile) => (
          <div
            key={profile.id}
            className="bg-white/5 border border-white/10 rounded-2xl p-4 hover:border-white/20 transition-all duration-200"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center text-sm font-black text-white">
                  {profile.userName.split(' ').map((n) => n[0]).join('')}
                </div>
                <div>
                  <div className="text-sm font-black text-white">{profile.userName}</div>
                  <div className="text-[10px] text-slate-500">Last active {profile.lastActive}</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-xs text-slate-400">Confidence</div>
                  <div className="text-sm font-black text-white">{(profile.confidence * 100).toFixed(0)}%</div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-slate-400">Interactions</div>
                  <div className="text-sm font-black text-white">{profile.interactions}</div>
                </div>
                <div className={`px-2.5 py-1 rounded-lg text-[10px] font-black border ${EMOTION_COLORS[profile.dominantEmotion] || EMOTION_COLORS.neutral}`}>
                  {profile.dominantEmotion}
                </div>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2 text-[10px] text-slate-500">
              <span>Tone: <span className="text-slate-300 font-bold">{profile.tone}</span></span>
            </div>
          </div>
        ))}
      </div>

      {organizations.length > 0 && (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
          <h3 className="text-sm font-black text-slate-300 mb-3">Emotional AI Usage by Organization</h3>
          <div className="space-y-2">
            {organizations.slice(0, 5).map((org: any) => (
              <div key={org._id} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                <span className="text-sm text-white">{org.name}</span>
                <span className="text-xs text-rose-400 font-black">{Math.floor(Math.random() * 100) + 20} profiles</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
