import { useState } from 'react'

const sampleProfiles = [
  { userId: 'USR-001', name: 'Adebayo O.', sentiment: 'positive', retentionScore: 92, lastActive: '5 min ago', memories: 24, personality: 'Professional, detail-oriented' },
  { userId: 'USR-002', name: 'Chinelo K.', sentiment: 'neutral', retentionScore: 78, lastActive: '1 hour ago', memories: 18, personality: 'Friendly, curious' },
  { userId: 'USR-003', name: 'Musa B.', sentiment: 'positive', retentionScore: 95, lastActive: '2 hours ago', memories: 31, personality: 'Technical, efficient' },
]

const sentimentColors: Record<string, string> = {
  positive: 'bg-emerald-500/10 text-emerald-400',
  neutral: 'bg-amber-500/10 text-amber-400',
  negative: 'bg-red-500/10 text-red-400',
}

export function EmotionalAITab({ token }: { token: string }) {
  const [selectedProfile, setSelectedProfile] = useState<string | null>(null)

  const avgRetention = Math.round(sampleProfiles.reduce((s, p) => s + p.retentionScore, 0) / sampleProfiles.length)

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h2 className="text-2xl font-black tracking-tight">Emotional AI</h2>
        <p className="text-sm text-slate-400 mt-1">Memory, personality, retention — build lasting relationships</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="p-5 bg-white/5 border border-white/10 rounded-2xl text-center">
          <p className="text-3xl font-black text-pink-400">{sampleProfiles.length}</p>
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">Active Profiles</p>
        </div>
        <div className="p-5 bg-white/5 border border-white/10 rounded-2xl text-center">
          <p className="text-3xl font-black text-emerald-400">{avgRetention}%</p>
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">Avg Retention Score</p>
        </div>
        <div className="p-5 bg-white/5 border border-white/10 rounded-2xl text-center">
          <p className="text-3xl font-black text-blue-400">{sampleProfiles.reduce((s, p) => s + p.memories, 0)}</p>
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">Total Memories</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Profile List */}
        <div className="space-y-3">
          <h3 className="text-sm font-black uppercase tracking-widest text-slate-500">User Profiles</h3>
          {sampleProfiles.map((p) => (
            <div key={p.userId} onClick={() => setSelectedProfile(p.userId)}
              className={`p-4 rounded-xl border cursor-pointer transition-all ${
                selectedProfile === p.userId ? 'bg-pink-500/10 border-pink-500/30' : 'bg-white/5 border-white/5 hover:bg-white/10'
              }`}>
              <div className="flex items-center justify-between mb-2">
                <p className="font-black text-sm">{p.name}</p>
                <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${sentimentColors[p.sentiment]}`}>
                  {p.sentiment}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>❤️ {p.retentionScore}%</span>
                <span>🧠 {p.memories} memories</span>
              </div>
            </div>
          ))}
        </div>

        {/* Profile Detail */}
        <div className="lg:col-span-2">
          {selectedProfile ? (
            (() => {
              const p = sampleProfiles.find(pr => pr.userId === selectedProfile)!
              return (
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-6">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-pink-500/20 rounded-2xl flex items-center justify-center text-2xl font-black text-pink-400">
                      {p.name[0]}
                    </div>
                    <div>
                      <h3 className="text-xl font-black">{p.name}</h3>
                      <p className="text-sm text-slate-400">{p.personality}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-white/5 rounded-xl">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Retention Score</p>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-3 bg-white/5 rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-pink-500 to-rose-500 rounded-full" style={{ width: `${p.retentionScore}%` }} />
                        </div>
                        <span className="text-sm font-black text-pink-400">{p.retentionScore}%</span>
                      </div>
                    </div>
                    <div className="p-4 bg-white/5 rounded-xl">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Last Active</p>
                      <p className="text-lg font-black">{p.lastActive}</p>
                    </div>
                  </div>

                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3">Stored Memories</p>
                    <div className="space-y-2">
                      {['Prefers formal communication', 'Interested in Q4 financial reports', 'Previous issue resolved on March 15'].map((m, i) => (
                        <div key={i} className="flex items-center gap-3 p-3 bg-white/5 rounded-xl">
                          <span className="text-sm">💭</span>
                          <span className="text-sm text-slate-300">{m}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )
            })()
          ) : (
            <div className="h-full flex items-center justify-center bg-white/5 border border-white/10 rounded-2xl p-12 text-center">
              <div>
                <p className="text-4xl mb-4">💜</p>
                <p className="text-slate-500 font-bold">Select a profile to view details</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
