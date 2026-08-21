import { useState, useCallback } from 'react'
import { useMutation } from 'convex/react'
import { useSuspenseQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { api } from '../../../../convex/_generated/api'
import { Toast, formatNgN } from './shared'

// ─── API ACCESS TAB ───────────────────────────────────────────

export function ApiAccessTab({ adminToken }: { adminToken: string }) {
  const { data: apiKeys } = useSuspenseQuery(convexQuery(api.revenue_outcomes.getApiKeys, adminToken ? { adminToken } : 'skip'))
  const createKey = useMutation(api.revenue_outcomes.createApiKey)

  const [toast, setToast] = useState<string | null>(null)
  const [userId, setUserId] = useState('')
  const [tier, setTier] = useState<'developer' | 'professional' | 'business' | 'enterprise'>('developer')
  const [showForm, setShowForm] = useState(false)
  const [newKeyResult, setNewKeyResult] = useState<{ apiKey: string; apiSecret: string } | null>(null)

  const showToast = useCallback((msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }, [])

  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleCreate = async () => {
    if (!userId) return
    setIsSubmitting(true)
    try {
      const result = await createKey({ userId, tier, adminToken })
      if (result) {
        setNewKeyResult({ apiKey: result.apiKey, apiSecret: result.apiSecret })
      }
      setUserId('')
      setShowForm(false)
      showToast('API key generated')
    } catch (err) {
      console.error('[ApiAccessTab] Failed to generate API key:', err)
      showToast('Failed to generate API key', 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  const tiers = [
    { id: 'developer', name: 'Developer', price: formatNgN(10000), calls: '1,000/mo', icon: '👨‍💻' },
    { id: 'professional', name: 'Professional', price: formatNgN(50000), calls: '10,000/mo', icon: '💼' },
    { id: 'business', name: 'Business', price: formatNgN(200000), calls: '100,000/mo', icon: '🏢' },
    { id: 'enterprise', name: 'Enterprise', price: 'Custom', calls: '1,000,000/mo', icon: '🏛️' },
  ] as const

  const tierColor: Record<string, string> = {
    developer: 'from-blue-500/20 to-blue-600/10',
    professional: 'from-orange-500/20 to-orange-600/10',
    business: 'from-emerald-500/20 to-emerald-600/10',
    enterprise: 'from-purple-500/20 to-purple-600/10',
  }

  return (
    <div className="space-y-6">
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}

      <div>
        <h3 className="text-lg font-bold text-white mb-3">API Tiers</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {tiers.map((t) => (
            <div key={t.id} className={`bg-gradient-to-br ${tierColor[t.id]} border border-white/10 rounded-2xl p-5 hover:border-white/20 transition-all`}>
              <span className="text-2xl">{t.icon}</span>
              <div className="text-white font-bold mt-3">{t.name}</div>
              <div className="text-[#FF6B35] font-black mt-1">{t.price}</div>
              <div className="text-xs text-slate-400 mt-1">{t.calls}</div>
            </div>
          ))}
        </div>
      </div>

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
        </div>
      )}

      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-white">Active API Keys</h3>
        <button onClick={() => setShowForm(!showForm)} className="bg-[#FF6B35] hover:bg-[#FF8255] text-white px-4 py-2 rounded-xl text-sm font-medium transition-all">
          + Generate Key
        </button>
      </div>

      {showForm && (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-slate-400 mb-1 block">User ID</label>
              <input value={userId} onChange={(e) => setUserId(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#FF6B35]/50" />
            </div>
            <div>
              <label className="text-sm text-slate-400 mb-1 block">Tier</label>
              <select value={tier} onChange={(e) => setTier(e.target.value as any)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#FF6B35]/50">
                <option value="developer">Developer (₦10K)</option>
                <option value="professional">Professional (₦50K)</option>
                <option value="business">Business (₦200K)</option>
                <option value="enterprise">Enterprise (Custom)</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2">
          <button onClick={handleCreate} disabled={isSubmitting} className="bg-[#FF6B35] hover:bg-[#FF8255] text-white px-4 py-2 rounded-xl text-sm font-medium transition-all disabled:opacity-50">{isSubmitting ? 'Generating...' : 'Generate'}</button>
          <button onClick={() => setShowForm(false)} className="bg-white/5 hover:bg-white/10 text-slate-300 px-4 py-2 rounded-xl text-sm font-medium transition-all">Cancel</button>
          </div>
        </div>
      )}

      <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
        <div className="grid grid-cols-[1fr_auto_auto_auto] px-5 py-3 border-b border-white/5 text-sm text-slate-400 font-medium">
          <div>User</div>
          <div>Tier</div>
          <div>Usage</div>
          <div>Status</div>
        </div>
        {(apiKeys ?? []).map((k: any) => (
          <div key={k._id} className="grid grid-cols-[1fr_auto_auto_auto] px-5 py-3 border-b border-white/5 hover:bg-white/5 transition-colors text-sm">
            <div className="text-white truncate max-w-[160px]">{k.userId}</div>
            <div className="text-slate-300 capitalize">{k.tier}</div>
            <div className="text-[#FF6B35] font-bold">{k.callsUsed ?? 0} / {k.monthlyCallLimit ?? 0}</div>
            <div className={`text-xs font-medium px-2.5 py-1 rounded-full ${k.isActive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
              {k.isActive ? 'Active' : 'Revoked'}
            </div>
          </div>
        ))}
        {(!apiKeys || apiKeys.length === 0) && (
          <div className="px-5 py-8 text-center text-slate-500 text-sm">No API keys yet</div>
        )}
      </div>
    </div>
  )
}
