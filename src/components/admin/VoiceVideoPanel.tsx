import { useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'

const AGENT_NAMES: Record<string, string> = {
  A1: 'Academic Pro', A2: 'Business Pro', A3: 'Content Pro', A4: 'Career Pro',
  A5: 'Personal Shopper', A6: 'Exam Pro', A7: 'Finance Pro', A8: 'MediaStudio Pro',
  A9: 'Health Pro', A10: 'Home Services Pro', A11: 'Language Tutor', A12: 'Travel Planner',
  A13: 'ServiceMart NG', A14: 'Translation Hub', A15: 'Event Planner',
}

export function VoiceVideoPanel() {
  const [selectedAgent, setSelectedAgent] = useState('A1')
  const [avatar, setAvatar] = useState('professional')
  const [voice, setVoice] = useState('nigerian_female')
  const [saved, setSaved] = useState(false)

  const avatars: any = useQuery(api.voice_video_config.getAvatarPresets)
  const voices: any = useQuery(api.voice_video_config.getVoicePresets)
  const configs: any = useQuery(api.voice_video_config.getAllAgentMediaConfigs)
  const saveConfig = useMutation(api.voice_video_config.saveAgentMediaConfig)

  const handleSave = async () => {
    await saveConfig({ agentId: selectedAgent, avatarPreset: avatar, voicePreset: voice, lipSync: true })
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-black">🎬 Voice & Video AI</h2>
        <p className="text-xs text-slate-400 mt-1">Configure avatars, voices, and real-time interaction — $2.1M/year potential</p>
      </div>

      {saved && (
        <div className="p-3 rounded-xl text-center text-xs font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
          Configuration saved!
        </div>
      )}

      {/* Agent Selector */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
        <label className="text-[10px] text-slate-500 uppercase font-bold block mb-2">Select Agent</label>
        <div className="flex flex-wrap gap-2">
          {Object.entries(AGENT_NAMES).map(([id, name]) => (
            <button key={id} onClick={() => setSelectedAgent(id)}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                selectedAgent === id ? 'bg-orange-500 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}>{name}</button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Avatar Selection */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <h3 className="text-sm font-black text-white mb-3">🎭 Avatar</h3>
          <div className="grid grid-cols-2 gap-3">
            {(avatars || []).map((a: any) => (
              <button key={a.id} onClick={() => setAvatar(a.id)}
                className={`p-3 rounded-xl border text-left transition-all ${
                  avatar === a.id ? 'border-orange-500 bg-orange-500/10' : 'border-slate-700 bg-slate-800 hover:border-slate-600'
                }`}>
                <p className="text-xs font-bold text-white">{a.name}</p>
                <p className="text-[10px] text-slate-500 mt-1">{a.style}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Voice Selection */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <h3 className="text-sm font-black text-white mb-3">🎤 Voice</h3>
          <div className="grid grid-cols-2 gap-3">
            {(voices || []).map((v: any) => (
              <button key={v.id} onClick={() => setVoice(v.id)}
                className={`p-3 rounded-xl border text-left transition-all ${
                  voice === v.id ? 'border-orange-500 bg-orange-500/10' : 'border-slate-700 bg-slate-800 hover:border-slate-600'
                }`}>
                <p className="text-xs font-bold text-white">{v.name}</p>
                <p className="text-[10px] text-slate-500 mt-1">{v.accent}</p>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Save */}
      <button onClick={handleSave}
        className="px-6 py-3 bg-orange-600 hover:bg-orange-700 rounded-xl text-xs font-black text-white transition-all">
        Save Configuration for {AGENT_NAMES[selectedAgent]}
      </button>

      {/* Current Configs */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <h3 className="text-sm font-black text-white mb-3">Current Configurations</h3>
        <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
          {Object.entries(AGENT_NAMES).map(([id, name]) => {
            const cfg = configs?.[id]
            return (
              <div key={id} className="bg-slate-800 rounded-xl p-3 text-center">
                <p className="text-[10px] font-bold text-white">{name}</p>
                <p className="text-[9px] text-slate-500 mt-1">
                  {cfg ? `${cfg.avatarPreset} • ${cfg.voicePreset}` : 'Not configured'}
                </p>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
