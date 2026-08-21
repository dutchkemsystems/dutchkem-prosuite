import { useState, useCallback } from 'react'
import { useMutation } from 'convex/react'
import { useSuspenseQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { api } from '../../../../convex/_generated/api'
import { Toast, StatCard, formatNgN } from './shared'

// ─── SUBSCRIPTION PLANS TAB ────────────────────────────────────

export function SubscriptionsTab({ adminToken }: { adminToken: string }) {
  const { data: plans } = useSuspenseQuery(convexQuery(api.revenue_growth.getSubscriptionPlans))
  const { data: stats } = useSuspenseQuery(convexQuery(api.revenue_growth.getSubscriptionChangeStats, adminToken ? { adminToken } : 'skip'))
  const { data: creditExpiry } = useSuspenseQuery(convexQuery(api.revenue_growth.getCreditExpiryConfig))
  const updatePlan = useMutation(api.revenue_growth.updateSubscriptionPlan)
  const updateExpiry = useMutation(api.revenue_growth.updateCreditExpiryConfig)
  const [editingPlan, setEditingPlan] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ monthlyPriceNgn: 0, annualPriceNgn: 0, annualDiscountPercent: 0, creditsIncluded: 0, messageLimitMonthly: 0 })
  const [toast, setToast] = useState<string | null>(null)

  const showToast = useCallback((msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }, [])

  const handleEdit = (plan: any) => {
    setEditingPlan(plan.planId)
    setEditForm({
      monthlyPriceNgn: plan.monthlyPriceNgn,
      annualPriceNgn: plan.annualPriceNgn,
      annualDiscountPercent: plan.annualDiscountPercent,
      creditsIncluded: plan.creditsIncluded,
      messageLimitMonthly: plan.messageLimitMonthly,
    })
  }

  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSave = async () => {
    if (!editingPlan) return
    setIsSubmitting(true)
    try {
      await updatePlan({ planId: editingPlan, ...editForm, adminToken })
      setEditingPlan(null)
      showToast('Plan updated')
    } catch (err) {
      console.error('[SubscriptionsTab] Failed to update plan:', err)
      showToast('Failed to update plan', 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleToggleExpiry = async () => {
    try {
      await updateExpiry({
        enabled: !creditExpiry?.enabled,
        expiryDays: creditExpiry?.expiryDays ?? 30,
        warningDays: creditExpiry?.warningDays ?? 7,
        adminToken,
      })
      showToast(creditExpiry?.enabled ? 'Credit expiry disabled' : 'Credit expiry enabled')
    } catch (err) {
      console.error('[SubscriptionsTab] Failed to toggle credit expiry:', err)
      showToast('Failed to toggle credit expiry', 'error')
    }
  }

  return (
    <div className="space-y-6">
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon="📦" value={(plans ?? []).length} label="Active Plans" color="from-blue-500/20 to-blue-600/10" />
        <StatCard icon="⬆️" value={stats?.upgrades ?? 0} label="Upgrades (30d)" color="from-emerald-500/20 to-emerald-600/10" />
        <StatCard icon="⬇️" value={stats?.downgrades ?? 0} label="Downgrades (30d)" color="from-orange-500/20 to-orange-600/10" />
        <StatCard icon="💰" value={formatNgN(stats?.upgradeRevenue ?? 0)} label="Upgrade Revenue" color="from-purple-500/20 to-purple-600/10" />
      </div>

      {/* Credit Expiry Toggle */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-5 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-white">Credit Expiration</h3>
          <p className="text-sm text-slate-400 mt-1">Credits expire after {creditExpiry?.expiryDays ?? 30} days (warning at {creditExpiry?.warningDays ?? 7} days)</p>
        </div>
        <button
          onClick={handleToggleExpiry}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${creditExpiry?.enabled ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-white/5 text-slate-400 border border-white/10'}`}
        >
          {creditExpiry?.enabled ? '✓ Enabled' : '○ Disabled'}
        </button>
      </div>

      {/* Plans */}
      <div>
        <h3 className="text-lg font-bold text-white mb-3">Subscription Plans</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {(plans ?? []).map((plan: any) => (
            <div key={plan.planId} className={`bg-white/5 border rounded-2xl p-6 transition-all ${editingPlan === plan.planId ? 'border-[#FF6B35]/50' : 'border-white/10 hover:border-white/20'}`}>
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-xl font-bold text-white">{plan.name}</h4>
                <button onClick={() => editingPlan === plan.planId ? setEditingPlan(null) : handleEdit(plan)} className="text-sm text-slate-400 hover:text-white transition-colors">
                  {editingPlan === plan.planId ? '✕' : '✏️'}
                </button>
              </div>

              {editingPlan === plan.planId ? (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-slate-400">Monthly Price (₦)</label>
                    <input type="number" value={editForm.monthlyPriceNgn} onChange={(e) => setEditForm({ ...editForm, monthlyPriceNgn: Number(e.target.value) })} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm mt-1" />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400">Annual Price (₦)</label>
                    <input type="number" value={editForm.annualPriceNgn} onChange={(e) => setEditForm({ ...editForm, annualPriceNgn: Number(e.target.value) })} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm mt-1" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs text-slate-400">Discount %</label>
                      <input type="number" value={editForm.annualDiscountPercent} onChange={(e) => setEditForm({ ...editForm, annualDiscountPercent: Number(e.target.value) })} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm mt-1" />
                    </div>
                    <div>
                      <label className="text-xs text-slate-400">Credits</label>
                      <input type="number" value={editForm.creditsIncluded} onChange={(e) => setEditForm({ ...editForm, creditsIncluded: Number(e.target.value) })} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm mt-1" />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-slate-400">Messages/Month (-1=unlimited)</label>
                    <input type="number" value={editForm.messageLimitMonthly} onChange={(e) => setEditForm({ ...editForm, messageLimitMonthly: Number(e.target.value) })} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm mt-1" />
                  </div>
                  <button onClick={handleSave} disabled={isSubmitting} className="w-full bg-[#FF6B35] hover:bg-[#FF8255] text-white px-4 py-2 rounded-xl text-sm font-medium transition-all disabled:opacity-50">{isSubmitting ? 'Saving...' : 'Save Changes'}</button>
                </div>
              ) : (
                <>
                  <div className="mb-4">
                    <div className="text-[#FF6B35] font-black text-3xl">{formatNgN(plan.monthlyPriceNgn)}</div>
                    <div className="text-xs text-slate-400 mt-1">/month</div>
                  </div>
                  <div className="bg-white/5 rounded-xl p-3 mb-4">
                    <div className="text-sm text-white font-medium">Annual: {formatNgN(plan.annualPriceNgn)}</div>
                    <div className="text-xs text-emerald-400 mt-1">Save {plan.annualDiscountPercent}% with annual billing</div>
                  </div>
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-400">Credits</span>
                      <span className="text-white font-bold">{plan.creditsIncluded.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-400">Messages/Month</span>
                      <span className="text-white font-bold">{plan.messageLimitMonthly === -1 ? 'Unlimited' : plan.messageLimitMonthly}</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    {(plan.features ?? []).map((f: string, i: number) => (
                      <div key={i} className="flex items-center gap-2 text-xs text-slate-300">
                        <span className="text-emerald-400">✓</span>
                        <span>{f}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          ))}
          {(!plans || plans.length === 0) && (
            <div className="col-span-3 text-center py-12 text-slate-500">No subscription plans configured. Call bulkSeedAllRevenueGrowth to seed.</div>
          )}
        </div>
      </div>

      {/* Change Stats */}
      {stats && stats.totalChanges > 0 && (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
          <h3 className="text-lg font-bold text-white mb-3">Subscription Changes (30 days)</h3>
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-black text-emerald-400">{stats.upgrades}</div>
              <div className="text-xs text-slate-400">Upgrades</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-black text-orange-400">{stats.downgrades}</div>
              <div className="text-xs text-slate-400">Downgrades</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-black text-red-400">{stats.cancellations}</div>
              <div className="text-xs text-slate-400">Cancellations</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-black text-[#FF6B35]">{formatNgN(stats.netRevenueImpact)}</div>
              <div className="text-xs text-slate-400">Net Impact</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
