import { useState, useCallback } from 'react'
import { useMutation } from 'convex/react'
import { useSuspenseQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { api } from '../../../../convex/_generated/api'
import { Toast, StatCard, formatNgN } from './shared'

// ─── SOCIAL COMMERCE TAB ──────────────────────────────────────

export function SocialTab({ adminToken }: { adminToken: string }) {
  const { data: stats } = useSuspenseQuery(convexQuery(api.revenue_social.getConversationStats, adminToken ? { adminToken } : 'skip'))
  const { data: dmRules } = useSuspenseQuery(convexQuery(api.revenue_social.getDmRules, adminToken ? { adminToken } : 'skip'))
  const { data: conversations } = useSuspenseQuery(convexQuery(api.revenue_social.getConversations, adminToken ? { adminToken } : 'skip'))
  const toggleDmRule = useMutation(api.revenue_social.toggleDmRule)
  const deleteDmRule = useMutation(api.revenue_social.deleteDmRule)
  const addDmRule = useMutation(api.revenue_social.addDmRule)

  const [showAddRule, setShowAddRule] = useState(false)
  const [newKeywords, setNewKeywords] = useState('')
  const [newResponse, setNewResponse] = useState('')
  const [toast, setToast] = useState<string | null>(null)

  const showToast = useCallback((msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }, [])

  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleAddRule = async () => {
    if (!newKeywords.trim() || !newResponse.trim()) return
    setIsSubmitting(true)
    try {
      const keywords = newKeywords.split(',').map((k) => k.trim()).filter(Boolean)
      await addDmRule({ triggerKeywords: keywords, responseTemplate: newResponse, adminToken })
      setNewKeywords('')
      setNewResponse('')
      setShowAddRule(false)
      showToast('DM rule added')
    } catch (err) {
      console.error('[SocialTab] Failed to add DM rule:', err)
      showToast('Failed to add DM rule', 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleToggle = async (ruleId: string, isActive: boolean) => {
    try {
      await toggleDmRule({ ruleId: ruleId as any, isActive: !isActive, adminToken })
      showToast(isActive ? 'Rule deactivated' : 'Rule activated')
    } catch (err) {
      console.error('[SocialTab] Failed to toggle DM rule:', err)
      showToast('Failed to toggle rule', 'error')
    }
  }

  const handleDelete = async (ruleId: string) => {
    try {
      await deleteDmRule({ ruleId: ruleId as any, adminToken })
      showToast('Rule deleted')
    } catch (err) {
      console.error('[SocialTab] Failed to delete DM rule:', err)
      showToast('Failed to delete rule', 'error')
    }
  }

  return (
    <div className="space-y-6">
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon="💬" value={stats?.totalConversations ?? 0} label="Conversations" color="from-blue-500/20 to-blue-600/10" />
        <StatCard icon="🎯" value={stats?.openConversations ?? 0} label="Intent Detected" color="from-orange-500/20 to-orange-600/10" />
        <StatCard icon="💰" value={formatNgN(stats?.totalRevenue ?? 0)} label="Revenue" color="from-emerald-500/20 to-emerald-600/10" />
        <StatCard icon="📈" value={`${stats?.conversionRate ?? 0}%`} label="Conversion Rate" color="from-purple-500/20 to-purple-600/10" />
      </div>

      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-white">DM Automation Rules</h3>
        <button
          onClick={() => setShowAddRule(!showAddRule)}
          className="bg-[#FF6B35] hover:bg-[#FF8255] text-white px-4 py-2 rounded-xl text-sm font-medium transition-all"
        >
          + Add Rule
        </button>
      </div>

      {showAddRule && (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4">
          <div>
            <label className="text-sm text-slate-400 mb-1 block">Trigger Keywords (comma-separated)</label>
            <input
              value={newKeywords}
              onChange={(e) => setNewKeywords(e.target.value)}
              placeholder="buy, price, how much"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#FF6B35]/50"
            />
          </div>
          <div>
            <label className="text-sm text-slate-400 mb-1 block">Response Template</label>
            <textarea
              value={newResponse}
              onChange={(e) => setNewResponse(e.target.value)}
              placeholder="Thanks for your interest! Check out..."
              rows={3}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#FF6B35]/50 resize-none"
            />
          </div>
          <div className="flex gap-2">
            <button onClick={handleAddRule} disabled={isSubmitting} className="bg-[#FF6B35] hover:bg-[#FF8255] text-white px-4 py-2 rounded-xl text-sm font-medium transition-all disabled:opacity-50">{isSubmitting ? 'Saving...' : 'Save Rule'}</button>
            <button onClick={() => setShowAddRule(false)} className="bg-white/5 hover:bg-white/10 text-slate-300 px-4 py-2 rounded-xl text-sm font-medium transition-all">Cancel</button>
          </div>
        </div>
      )}

      <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
        <div className="grid grid-cols-[1fr_auto_auto_auto] px-5 py-3 border-b border-white/5 text-sm text-slate-400 font-medium">
          <div>Keywords</div>
          <div>Status</div>
          <div>Toggle</div>
          <div>Delete</div>
        </div>
        {(dmRules ?? []).map((rule: any) => (
          <div key={rule._id} className="grid grid-cols-[1fr_auto_auto_auto] px-5 py-3 border-b border-white/5 hover:bg-white/5 transition-colors items-center">
            <div className="text-white text-sm truncate max-w-[300px]">{rule.triggerKeywords?.join(', ') ?? '—'}</div>
            <div className={`text-xs font-medium px-2.5 py-1 rounded-full ${rule.isActive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-500/20 text-slate-400'}`}>
              {rule.isActive ? 'Active' : 'Inactive'}
            </div>
            <button onClick={() => handleToggle(rule._id, rule.isActive)} className="text-sm text-slate-400 hover:text-white transition-colors px-3">
              {rule.isActive ? '⏸' : '▶'}
            </button>
            <button onClick={() => handleDelete(rule._id)} disabled={isSubmitting} className="text-sm text-red-400 hover:text-red-300 transition-colors px-3 disabled:opacity-50">🗑</button>
          </div>
        ))}
        {(!dmRules || dmRules.length === 0) && (
          <div className="px-5 py-8 text-center text-slate-500 text-sm">No DM rules configured</div>
        )}
      </div>

      <div>
        <h3 className="text-lg font-bold text-white mb-3">Recent Conversations</h3>
        <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
          <div className="grid grid-cols-[1fr_auto_auto_auto] px-5 py-3 border-b border-white/5 text-sm text-slate-400 font-medium">
            <div>Customer</div>
            <div>Platform</div>
            <div>Intent</div>
            <div>Status</div>
          </div>
          {(conversations ?? []).slice(0, 15).map((c: any) => (
            <div key={c._id} className="grid grid-cols-[1fr_auto_auto_auto] px-5 py-3 border-b border-white/5 hover:bg-white/5 transition-colors text-sm">
              <div className="text-white truncate max-w-[160px]">{c.customerHandle ?? '—'}</div>
              <div className="text-slate-300">{c.platform ?? '—'}</div>
              <div className="text-[#FF6B35] font-bold">{c.buyingIntentScore ?? 0}</div>
              <div className={`text-xs font-medium px-2.5 py-1 rounded-full ${c.status === 'converted' ? 'bg-emerald-500/20 text-emerald-400' : c.status === 'open' ? 'bg-blue-500/20 text-blue-400' : 'bg-slate-500/20 text-slate-400'}`}>
                {c.status ?? '—'}
              </div>
            </div>
          ))}
          {(!conversations || conversations.length === 0) && (
            <div className="px-5 py-8 text-center text-slate-500 text-sm">No conversations yet</div>
          )}
        </div>
      </div>
    </div>
  )
}
