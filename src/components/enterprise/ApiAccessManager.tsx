import { useState } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'

export function ApiAccessManager({ orgId, token }: { orgId: string; token: string }) {
  const apiKeys = useQuery(api.revenue_outcomes.getApiKeys, token ? { token } : 'skip')
  const createKey = useMutation(api.revenue_outcomes.createApiKey)
  const revokeKey = useMutation(api.revenue_outcomes.revokeApiKey)

  const [showForm, setShowForm] = useState(false)
  const [userId, setUserId] = useState('')
  const [tier, setTier] = useState<'developer' | 'professional' | 'business' | 'enterprise'>('developer')
  const [newKeyResult, setNewKeyResult] = useState<{ apiKey: string; apiSecret: string } | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const tiers = [
    { id: 'developer', name: 'Developer', price: '₦10,000', calls: '1,000/mo', icon: '👨‍💻' },
    { id: 'professional', name: 'Professional', price: '₦50,000', calls: '10,000/mo', icon: '💼' },
    { id: 'business', name: 'Business', price: '₦200,000', calls: '100,000/mo', icon: '🏢' },
    { id: 'enterprise', name: 'Enterprise', price: 'Custom', calls: '1,000,000/mo', icon: '🏛️' },
  ] as const

  const tierColor: Record<string, string> = {
    developer: 'from-blue-500/20 to-blue-600/10 border-blue-500/30',
    professional: 'from-orange-500/20 to-orange-600/10 border-orange-500/30',
    business: 'from-emerald-500/20 to-emerald-600/10 border-emerald-500/30',
    enterprise: 'from-purple-500/20 to-purple-600/10 border-purple-500/30',
  }

  const handleCreate = async () => {
    if (!userId) return
    try {
      const result = await createKey({ userId, tier, token })
      if (result) {
        setNewKeyResult({ apiKey: result.apiKey, apiSecret: result.apiSecret })
        setToast('API key generated successfully')
        setTimeout(() => setToast(null), 3000)
      }
      setUserId('')
      setShowForm(false)
    } catch (err) {
      setToast('Failed to generate API key')
      setTimeout(() => setToast(null), 3000)
    }
  }

  const handleRevoke = async (keyId: string) => {
    if (!confirm('Are you sure you want to revoke this API key?')) return
    try {
      await revokeKey({ keyId, token })
      setToast('API key revoked')
      setTimeout(() => setToast(null), 3000)
    } catch (err) {
      setToast('Failed to revoke API key')
      setTimeout(() => setToast(null), 3000)
    }
  }

  return (
    <div className="space-y-6">
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-emerald-500/90 text-white px-5 py-3 rounded-xl shadow-lg text-sm font-medium">
          ✓ {toast}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-white">API Access</h2>
          <p className="text-sm text-slate-400 mt-1">Manage your API keys and access</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold text-sm transition-all"
        >
          + Generate Key
        </button>
      </div>

      {/* API Tiers */}
      <div>
        <h3 className="text-lg font-bold text-white mb-3">API Tiers</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {tiers.map((t) => (
            <div
              key={t.id}
              className={`bg-gradient-to-br ${tierColor[t.id]} border rounded-2xl p-5 hover:border-white/20 transition-all`}
            >
              <span className="text-2xl">{t.icon}</span>
              <div className="text-white font-bold mt-3">{t.name}</div>
              <div className="text-orange-400 font-black mt-1">{t.price}</div>
              <div className="text-xs text-slate-400 mt-1">{t.calls}</div>
            </div>
          ))}
        </div>
      </div>

      {/* New Key Result */}
      {newKeyResult && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-emerald-400 font-bold text-sm">New API Key Generated</h4>
            <button onClick={() => setNewKeyResult(null)} className="text-emerald-400/70 hover:text-emerald-400 text-sm">✕</button>
          </div>
          <div className="space-y-2">
            <div>
              <span className="text-xs text-slate-400">API Key: </span>
              <span className="text-white font-mono text-sm">{newKeyResult.apiKey}</span>
            </div>
            <div>
              <span className="text-xs text-slate-400">API Secret: </span>
              <span className="text-white font-mono text-sm">{newKeyResult.apiSecret}</span>
            </div>
          </div>
          <p className="text-xs text-amber-400 mt-3">⚠️ Save these credentials securely. The secret will not be shown again.</p>
        </div>
      )}

      {/* Create Form */}
      {showForm && (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-slate-400 mb-1 block">User ID</label>
              <input
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-orange-500/50"
              />
            </div>
            <div>
              <label className="text-sm text-slate-400 mb-1 block">Tier</label>
              <select
                value={tier}
                onChange={(e) => setTier(e.target.value as any)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-orange-500/50"
              >
                <option value="developer">Developer (₦10K)</option>
                <option value="professional">Professional (₦50K)</option>
                <option value="business">Business (₦200K)</option>
                <option value="enterprise">Enterprise (Custom)</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleCreate} className="px-6 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm font-medium transition-all">Generate</button>
            <button onClick={() => setShowForm(false)} className="px-6 py-2 bg-white/5 hover:bg-white/10 text-slate-300 rounded-xl text-sm font-medium transition-all">Cancel</button>
          </div>
        </div>
      )}

      {/* Active API Keys */}
      <div>
        <h3 className="text-lg font-bold text-white mb-3">Active API Keys</h3>
        <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
          <div className="grid grid-cols-[1fr_auto_auto_auto_auto] px-5 py-3 border-b border-white/5 text-sm text-slate-400 font-medium">
            <div>Key</div>
            <div>Tier</div>
            <div>Usage</div>
            <div>Status</div>
            <div>Action</div>
          </div>
          {(apiKeys ?? []).map((k: any) => (
            <div key={k._id} className="grid grid-cols-[1fr_auto_auto_auto_auto] px-5 py-3 border-b border-white/5 hover:bg-white/5 transition-colors text-sm">
              <div className="text-white font-mono truncate max-w-[200px]">{k.apiKey}</div>
              <div className="text-slate-300 capitalize">{k.tier}</div>
              <div className="text-orange-400 font-bold">{k.callsUsed ?? 0} / {k.monthlyCallLimit ?? 0}</div>
              <div className={`text-xs font-medium px-2.5 py-1 rounded-full ${k.isActive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                {k.isActive ? 'Active' : 'Revoked'}
              </div>
              <div>
                {k.isActive && (
                  <button onClick={() => handleRevoke(k._id)} className="text-red-400 hover:text-red-300 text-xs">Revoke</button>
                )}
              </div>
            </div>
          ))}
          {(!apiKeys || apiKeys.length === 0) && (
            <div className="px-5 py-8 text-center text-slate-500 text-sm">No API keys yet</div>
          )}
        </div>
      </div>
    </div>
  )
}
