import { useState, useCallback } from 'react'
import { useMutation } from 'convex/react'
import { useSuspenseQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { api } from '../../../../convex/_generated/api'
import { Toast, StatCard, formatNgN } from './shared'

// ─── OUTCOME PRICING TAB ──────────────────────────────────────

export function OutcomesTab({ adminToken }: { adminToken: string }) {
  const { data: rules } = useSuspenseQuery(convexQuery(api.revenue_outcomes.getOutcomeRules, adminToken ? { adminToken } : 'skip'))
  const { data: stats } = useSuspenseQuery(convexQuery(api.revenue_outcomes.getOutcomeStats, adminToken ? { adminToken } : 'skip'))
  const updateRule = useMutation(api.revenue_outcomes.updateOutcomeRule)
  const [toast, setToast] = useState<string | null>(null)

  const showToast = useCallback((msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }, [])

  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleToggle = async (ruleId: string, isActive: boolean) => {
    setIsSubmitting(true)
    try {
      await updateRule({ ruleId: ruleId as any, isActive: !isActive, adminToken })
      showToast(isActive ? 'Rule deactivated' : 'Rule activated')
    } catch (err) {
      console.error('[OutcomesTab] Failed to toggle rule:', err)
      showToast('Failed to toggle rule', 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}

      <div className="grid grid-cols-3 gap-4">
        <StatCard icon="🎯" value={stats?.totalEvents ?? 0} label="Total Events" color="from-orange-500/20 to-orange-600/10" />
        <StatCard icon="💰" value={formatNgN(stats?.totalRevenue ?? 0)} label="Revenue" color="from-emerald-500/20 to-emerald-600/10" />
        <StatCard icon="⏳" value={stats?.pendingSettlements ?? 0} label="Pending Settlements" color="from-blue-500/20 to-blue-600/10" />
      </div>

      <div>
        <h3 className="text-lg font-bold text-white mb-3">Pricing Rules</h3>
        <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
          <div className="grid grid-cols-[1fr_1fr_auto_auto] px-5 py-3 border-b border-white/5 text-sm text-slate-400 font-medium">
            <div>Outcome Type</div>
            <div>Price</div>
            <div>Status</div>
            <div>Toggle</div>
          </div>
          {(rules ?? []).map((rule: any) => (
            <div key={rule._id} className="grid grid-cols-[1fr_1fr_auto_auto] px-5 py-3 border-b border-white/5 hover:bg-white/5 transition-colors text-sm items-center">
              <div className="text-white">{rule.outcomeType}</div>
              <div className="text-[#FF6B35] font-bold">{formatNgN(rule.priceNgN)}</div>
              <div className={`text-xs font-medium px-2.5 py-1 rounded-full ${rule.isActive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-500/20 text-slate-400'}`}>
                {rule.isActive ? 'Active' : 'Inactive'}
              </div>
              <button onClick={() => handleToggle(rule._id, rule.isActive)} className="text-sm text-slate-400 hover:text-white transition-colors px-3">
                {rule.isActive ? '⏸' : '▶'}
              </button>
            </div>
          ))}
          {(!rules || rules.length === 0) && (
            <div className="px-5 py-8 text-center text-slate-500 text-sm">No pricing rules configured</div>
          )}
        </div>
      </div>
    </div>
  )
}
