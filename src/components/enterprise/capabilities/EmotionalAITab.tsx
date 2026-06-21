import { useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { api } from '../../../../convex/_generated/api'

export function EmotionalAITab({ token }: { token: string }) {
  const org = useQuery(api.enterprise_auth.getOrgDetails, token ? { token } : 'skip')
  const orgId = org?._id

  const profiles = useQuery(api.enterprise_emotional.listProfiles, orgId ? { orgId, token } : 'skip') || []
  const stats = useQuery(api.enterprise_emotional.getStats, orgId ? { orgId, token } : 'skip') || { totalProfiles: 0, avgRetentionScore: 0, totalMemories: 0 }
  const upsertProfile = useMutation(api.enterprise_emotional.upsertProfile)
  const addMemory = useMutation(api.enterprise_emotional.addMemory)

  const [selectedProfile, setSelectedProfile] = useState<any>(null)
  const [showAddProfile, setShowAddProfile] = useState(false)
  const [newUserId, setNewUserId] = useState('')
  const [newPersonality, setNewPersonality] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [adding, setAdding] = useState(false)
  const [newMemory, setNewMemory] = useState('')
  const [addingMemory, setAddingMemory] = useState(false)
  const [expandedProfile, setExpandedProfile] = useState<any>(null)

  const showToast = (msg: string, isError = false) => {
    if (isError) setError(msg)
    else setSuccess(msg)
    setTimeout(() => { setError(''); setSuccess('') }, 3000)
  }

  const handleAddProfile = async () => {
    if (!newUserId.trim()) { showToast('User ID is required', true); return }
    setAdding(true)
    try {
      const result = await upsertProfile({
        orgId: orgId!,
        token,
        userId: newUserId,
        personality: newPersonality ? { description: newPersonality } : undefined,
      })
      if (result.error) { showToast(result.error, true); return }
      showToast('Profile updated!')
      setShowAddProfile(false)
      setNewUserId('')
      setNewPersonality('')
    } catch (e: any) { showToast(e.message || 'Failed', true) }
    finally { setAdding(false) }
  }

  const handleAddMemory = async () => {
    if (!expandedProfile || !newMemory.trim()) return
    setAddingMemory(true)
    try {
      const result = await addMemory({ profileId: expandedProfile._id, token, memory: newMemory, sentiment: 'neutral' })
      if (result.error) { showToast(result.error, true); return }
      showToast('Memory added!')
      setNewMemory('')
    } catch (e: any) { showToast(e.message || 'Failed', true) }
    finally { setAddingMemory(false) }
  }

  const sentimentColors: Record<string, string> = {
    positive: 'bg-emerald-500/10 text-emerald-400',
    neutral: 'bg-amber-500/10 text-amber-400',
    negative: 'bg-red-500/10 text-red-400',
  }

  const sentimentIcons: Record<string, string> = {
    positive: '😊',
    neutral: '😐',
    negative: '😟',
  }

  const getRetentionColor = (score: number) => {
    if (score >= 90) return 'from-emerald-500 to-green-500'
    if (score >= 70) return 'from-blue-500 to-cyan-500'
    if (score >= 50) return 'from-amber-500 to-yellow-500'
    return 'from-red-500 to-rose-500'
  }

  return (
    <div className="space-y-6 ">
      {(error || success) && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl text-sm font-black ${error ? 'bg-red-600 text-white' : 'bg-emerald-600 text-white'}`}>
          {error || success}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black tracking-tight">Emotional AI</h2>
          <p className="text-sm text-slate-400 mt-1">Memory, personality, retention — build lasting relationships</p>
        </div>
        <button onClick={() => setShowAddProfile(!showAddProfile)}
          className="px-6 py-3 bg-gradient-to-r from-pink-500 to-rose-600 text-white font-black text-sm rounded-xl hover:scale-105 transition-all">
          {showAddProfile ? '← Back' : '+ Add Profile'}
        </button>
      </div>

      {error && <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm font-bold">{error}</div>}
      {success && <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-sm font-bold">{success}</div>}

      {/* Add Profile Form */}
      {showAddProfile && (
        <div className="p-6 bg-white/5 border border-white/10 rounded-2xl space-y-4">
          <h3 className="font-black">Add User Profile</h3>
          <div className="grid grid-cols-2 gap-4">
            <input value={newUserId} onChange={e => setNewUserId(e.target.value)}
              placeholder="User ID (e.g. USR-004)" className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-pink-500/50 font-medium" />
            <input value={newPersonality} onChange={e => setNewPersonality(e.target.value)}
              placeholder="Personality traits (e.g. Technical, efficient)" className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-pink-500/50 font-medium" />
          </div>
          <button onClick={handleAddProfile} disabled={adding}
            className="px-6 py-3 bg-pink-600 text-white font-black text-sm rounded-xl hover:bg-pink-700 transition-all disabled:opacity-50">
            {adding ? 'Creating...' : 'Create Profile'}
          </button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="p-5 bg-white/5 border border-white/10 rounded-2xl text-center">
          <p className="text-3xl font-black text-pink-400">{stats.totalProfiles}</p>
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">Active Profiles</p>
        </div>
        <div className="p-5 bg-white/5 border border-white/10 rounded-2xl text-center">
          <p className="text-3xl font-black text-emerald-400">{stats.avgRetentionScore.toFixed(0)}%</p>
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">Avg Retention Score</p>
        </div>
        <div className="p-5 bg-white/5 border border-white/10 rounded-2xl text-center">
          <p className="text-3xl font-black text-blue-400">{stats.totalMemories}</p>
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">Total Memories</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Profile List */}
        <div className="space-y-3">
          <h3 className="text-sm font-black uppercase tracking-widest text-slate-500">User Profiles</h3>
          {profiles.length === 0 ? (
            <div className="text-center py-8 bg-white/5 border border-white/10 rounded-2xl">
              <p className="text-4xl mb-4">💜</p>
              <p className="text-slate-500 font-bold text-sm">No profiles yet</p>
            </div>
          ) : profiles.map((p: any) => (
            <div key={p._id} onClick={() => { setSelectedProfile(p); setExpandedProfile(p) }}
              className={`p-4 rounded-xl border cursor-pointer transition-all ${
                selectedProfile?._id === p._id ? 'bg-pink-500/10 border-pink-500/30' : 'bg-white/5 border-white/5 hover:bg-white/10'
              }`}>
              <div className="flex items-center justify-between mb-2">
                <p className="font-black text-sm">{p.userId}</p>
                <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${sentimentColors[p.sentiment || 'neutral']}`}>
                  {sentimentIcons[p.sentiment || 'neutral']} {p.sentiment || 'neutral'}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>❤️ {p.retentionScore}%</span>
                <span>🧠 {p.memoryCount || p.memories?.length || 0} memories</span>
              </div>
              <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden mt-2">
                <div className={`h-full bg-gradient-to-r ${getRetentionColor(p.retentionScore)} rounded-full`}
                  style={{ width: `${p.retentionScore}%` }} />
              </div>
            </div>
          ))}
        </div>

        {/* Profile Detail */}
        <div className="lg:col-span-2">
          {expandedProfile ? (
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-pink-500/20 rounded-2xl flex items-center justify-center text-2xl font-black text-pink-400">
                  {expandedProfile.userId[0]}
                </div>
                <div>
                  <h3 className="text-xl font-black">{expandedProfile.userId}</h3>
                  <p className="text-sm text-slate-400">{expandedProfile.personality?.description || 'No personality set'}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-white/5 rounded-xl">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Retention Score</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-3 bg-white/5 rounded-full overflow-hidden">
                      <div className={`h-full bg-gradient-to-r ${getRetentionColor(expandedProfile.retentionScore)} rounded-full`}
                        style={{ width: `${expandedProfile.retentionScore}%` }} />
                    </div>
                    <span className="text-sm font-black text-pink-400">{expandedProfile.retentionScore}%</span>
                  </div>
                </div>
                <div className="p-4 bg-white/5 rounded-xl">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Last Active</p>
                  <p className="text-lg font-black">{new Date(expandedProfile.lastInteraction).toLocaleString()}</p>
                </div>
              </div>

              {/* Add Memory */}
              <div className="flex gap-3">
                <input value={newMemory} onChange={e => setNewMemory(e.target.value)}
                  placeholder="Add a memory about this user..."
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-pink-500/50 font-medium" />
                <button onClick={handleAddMemory} disabled={addingMemory || !newMemory.trim()}
                  className="px-6 py-3 bg-pink-600 text-white font-black text-sm rounded-xl hover:bg-pink-700 transition-all disabled:opacity-50">
                  {addingMemory ? '...' : 'Add'}
                </button>
              </div>

              {/* Memories */}
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3">Stored Memories</p>
                <div className="space-y-2">
                  {expandedProfile.memories?.length > 0 ? expandedProfile.memories.map((m: any, i: number) => (
                    <div key={i} className="flex items-center gap-3 p-3 bg-white/5 rounded-xl">
                      <span className="text-sm">💭</span>
                      <span className="text-sm text-slate-300">{m.text}</span>
                      <span className="text-[10px] text-slate-600 ml-auto">{new Date(m.createdAt || m.timestamp).toLocaleDateString()}</span>
                    </div>
                  )) : (
                    <p className="text-sm text-slate-600 italic">No memories stored yet</p>
                  )}
                </div>
              </div>

              {/* Sentiment History */}
              {expandedProfile.sentimentHistory?.length > 0 && (
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3">Sentiment History</p>
                  <div className="flex gap-2 flex-wrap">
                    {expandedProfile.sentimentHistory.slice(-10).map((s: any, i: number) => (
                      <span key={i} className={`px-2 py-1 rounded text-[9px] font-black uppercase ${sentimentColors[s.sentiment]}`}>
                        {sentimentIcons[s.sentiment]} {s.sentiment}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
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
