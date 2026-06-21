import { useState } from 'react'
import { useQuery } from 'convex/react'
import { api } from '../../../../convex/_generated/api'

const EMOTION_COLORS: Record<string, string> = {
  joy: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  neutral: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
  frustration: 'bg-red-500/20 text-red-400 border-red-500/30',
  satisfaction: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  anxiety: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  trust: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
}

export function AdminEmotionalAI({ adminToken, organizations }: { adminToken: string, agents: any[], organizations: any[] }) {
  const [filter, setFilter] = useState('all')
  const [selectedOrg, setSelectedOrg] = useState(organizations[0]?._id || '')

  const profiles = useQuery(api.enterprise_emotional.listProfiles, selectedOrg ? { orgId: selectedOrg as any, adminToken } : "skip")
  const stats = useQuery(api.enterprise_emotional.getStats, selectedOrg ? { orgId: selectedOrg as any, adminToken } : "skip")

  const profileList = profiles || []
  const filtered = filter === 'all' ? profileList : profileList.filter((p: any) => p.personality?.dominantEmotion === filter)
  const emotions = [...new Set(profileList.map((p: any) => p.personality?.dominantEmotion || 'neutral'))] as string[];

  return (
    <div className="space-y-6 ">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black tracking-tight">Emotional AI</h2>
          <p className="text-sm text-slate-400 mt-1">Monitor emotional profiles and sentiment analysis across users</p>
        </div>
        <select value={selectedOrg} onChange={(e) => setSelectedOrg(e.target.value)} className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-[#FF6B35]/50">
          <option value="" className="bg-[#0a0a0f]">Select organization...</option>
          {organizations.map((o: any) => <option key={o._id} value={o._id} className="bg-[#0a0a0f]">{o.name}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-rose-500/20 to-rose-600/10 border border-white/10 rounded-2xl p-5">
          <div className="text-3xl font-black">{stats?.totalProfiles ?? profileList.length}</div>
          <div className="text-sm text-slate-400 mt-1">Active Profiles</div>
        </div>
        <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/10 border border-white/10 rounded-2xl p-5">
          <div className="text-3xl font-black">{stats?.totalMemories ?? 0}</div>
          <div className="text-sm text-slate-400 mt-1">Total Memories</div>
        </div>
        <div className="bg-gradient-to-br from-cyan-500/20 to-cyan-600/10 border border-white/10 rounded-2xl p-5">
          <div className="text-3xl font-black">{((stats?.avgRetentionScore || 0)).toFixed(0)}%</div>
          <div className="text-sm text-slate-400 mt-1">Avg Retention</div>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {['all', ...emotions].map((e: string) => (
          <button key={e} onClick={() => setFilter(e)} className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 ${filter === e ? 'bg-[#FF6B35] text-white' : 'bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10'}`}>
            {String(e)}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.length === 0 && (
          <div className="text-center py-12 text-slate-600 text-sm">
            {selectedOrg ? 'No emotional profiles yet. Profiles are created as users interact with companion agents.' : 'Select an organization to view emotional profiles.'}
          </div>
        )}
        {filtered.map((profile: any) => {
          const emotion = profile.personality?.dominantEmotion || 'neutral'
          const tone = profile.personality?.tone || 'unknown'
          const initials = profile.userId?.substring(0, 2).toUpperCase() || '??'
          return (
            <div key={profile._id} className="bg-white/5 border border-white/10 rounded-2xl p-4 hover:border-white/20 transition-all duration-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center text-sm font-black text-white">
                    {initials}
                  </div>
                  <div>
                    <div className="text-sm font-black text-white">User {profile.userId}</div>
                    <div className="text-[10px] text-slate-500">Last interaction {new Date(profile.lastInteraction).toLocaleDateString()}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-xs text-slate-400">Retention</div>
                    <div className="text-sm font-black text-white">{(profile.retentionScore * 100).toFixed(0)}%</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-slate-400">Memories</div>
                    <div className="text-sm font-black text-white">{profile.memories?.length || 0}</div>
                  </div>
                  <div className={`px-2.5 py-1 rounded-lg text-[10px] font-black border ${EMOTION_COLORS[emotion] || EMOTION_COLORS.neutral}`}>
                    {emotion}
                  </div>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2 text-[10px] text-slate-500">
                <span>Tone: <span className="text-slate-300 font-bold">{tone}</span></span>
                {profile.sentimentHistory?.length > 0 && (
                  <span className="ml-2">Sentiment trend: <span className="text-slate-300 font-bold">{profile.sentimentHistory.length} data points</span></span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
