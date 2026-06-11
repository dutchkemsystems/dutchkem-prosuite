import { useState } from 'react'
import { useQuery, useAction } from 'convex/react'
import { api } from '../../../../convex/_generated/api'

const STATUS_COLORS: Record<string, string> = {
  completed: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  pending: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  failed: 'bg-red-500/20 text-red-400 border-red-500/30',
}

const PLANS = [
  { id: 'free', name: 'Free', price: 0, desc: 'Basic access', color: 'from-gray-500/20 to-gray-600/10' },
  { id: 'growth', name: 'Growth', price: 5000, desc: '15 agents + marketplace', color: 'from-emerald-500/20 to-emerald-600/10' },
  { id: 'professional', name: 'Professional', price: 15000, desc: 'All features + analytics', color: 'from-blue-500/20 to-blue-600/10' },
  { id: 'enterprise', name: 'Enterprise', price: 50000, desc: 'Unlimited + custom agents', color: 'from-purple-500/20 to-purple-600/10' },
]

export function AdminPayments({ adminToken, organizations }: { adminToken: string, agents: any[], organizations: any[] }) {
  const [filter, setFilter] = useState('all')
  const [selectedOrg, setSelectedOrg] = useState(organizations[0]?._id || '')
  const [selectedPlan, setSelectedPlan] = useState('growth')
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [paying, setPaying] = useState(false)

  const transactions = useQuery(api.enterprise_payments.listTransactions, selectedOrg ? { orgId: selectedOrg as any, adminToken } : "skip")
  const stats = useQuery(api.enterprise_payments.getStats, selectedOrg ? { orgId: selectedOrg as any, adminToken } : "skip")
  const spendingLimit = useQuery(api.enterprise_payments.getSpendingLimit, selectedOrg ? { orgId: selectedOrg as any, adminToken } : "skip")
  const initiatePayment = useAction(api.enterprise_payments.initiateSubscriptionPayment)

  const txnList = transactions || []
  const filtered = filter === 'all' ? txnList : txnList.filter((t: any) => t.status === filter)

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 5000)
  }

  const handlePay = async () => {
    if (!selectedOrg) { showToast('Select an organization first', 'error'); return }
    if (!selectedPlan) { showToast('Select a plan first', 'error'); return }

    setPaying(true)
    try {
      const result: any = await initiatePayment({
        orgId: selectedOrg as any,
        plan: selectedPlan as any,
        paymentMethod: 'kora_checkout',
        adminToken,
      })

      if (result?.error) {
        showToast(result.error, 'error')
        setPaying(false)
        return
      }

      if (result?.checkoutUrl) {
        showToast('Redirecting to Kora Pay checkout...', 'success')
        // Open Kora Pay checkout in new tab
        window.open(result.checkoutUrl, '_blank')
      } else if (result?.success && result?.plan === 'free') {
        showToast('Free plan activated!', 'success')
      }
    } catch (e: any) {
      showToast(e.message || 'Payment failed', 'error')
    } finally {
      setPaying(false)
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl text-sm font-black ${toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-emerald-600 text-white'}`}>
          {toast.message}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black tracking-tight">Agentic Payments</h2>
          <p className="text-sm text-slate-400 mt-1">Live payments via Kora Pay — funds go to admin wallet</p>
        </div>
        <select value={selectedOrg} onChange={(e) => setSelectedOrg(e.target.value)} className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-[#FF6B35]/50">
          <option value="" className="bg-[#0a0a0f]">Select organization...</option>
          {organizations.map((o: any) => <option key={o._id} value={o._id} className="bg-[#0a0a0f]">{o.name}</option>)}
        </select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-amber-500/20 to-amber-600/10 border border-white/10 rounded-2xl p-5">
          <div className="text-3xl font-black">₦{(stats?.totalVolume || 0).toLocaleString()}</div>
          <div className="text-sm text-slate-400 mt-1">Total Volume</div>
        </div>
        <div className="bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 border border-white/10 rounded-2xl p-5">
          <div className="text-3xl font-black">{stats?.totalTransactions || 0}</div>
          <div className="text-sm text-slate-400 mt-1">Transactions</div>
        </div>
        <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/10 border border-white/10 rounded-2xl p-5">
          <div className="text-3xl font-black">{stats?.pendingTransactions || 0}</div>
          <div className="text-sm text-slate-400 mt-1">Pending</div>
        </div>
        <div className="bg-gradient-to-br from-red-500/20 to-red-600/10 border border-white/10 rounded-2xl p-5">
          <div className="text-3xl font-black">{stats?.failedTransactions || 0}</div>
          <div className="text-sm text-slate-400 mt-1">Failed</div>
        </div>
      </div>

      {/* Spending Limit */}
      {spendingLimit && (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <span className="text-sm text-slate-400">Spending Limit: </span>
            <span className="text-sm font-black text-amber-400">₦{(spendingLimit.spendingLimit || 0).toLocaleString()}</span>
          </div>
          <div>
            <span className="text-sm text-slate-400">Current Plan: </span>
            <span className="text-sm font-black text-white uppercase">{spendingLimit.plan || 'free'}</span>
          </div>
        </div>
      )}

      {/* Plan Selection & Live Payment */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
        <h3 className="text-sm font-black text-slate-300 mb-4">💳 Pay via Kora Pay (Card or Transfer)</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          {PLANS.map((plan) => (
            <button
              key={plan.id}
              onClick={() => setSelectedPlan(plan.id)}
              className={`p-4 rounded-xl border-2 text-left transition-all ${
                selectedPlan === plan.id
                  ? 'border-[#FF6B35] bg-[#FF6B35]/10'
                  : 'border-white/10 bg-white/5 hover:border-white/20'
              }`}
            >
              <div className="text-white font-black text-sm">{plan.name}</div>
              <div className="text-amber-400 font-black text-lg mt-1">
                {plan.price === 0 ? 'Free' : `₦${plan.price.toLocaleString()}`}
              </div>
              <div className="text-slate-500 text-xs mt-1">{plan.desc}</div>
            </button>
          ))}
        </div>
        <button
          onClick={handlePay}
          disabled={paying || !selectedOrg || !selectedPlan}
          className={`px-6 py-3 rounded-xl font-black text-sm transition-all ${
            paying
              ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
              : 'bg-[#FF6B35] hover:bg-[#FF8255] text-white'
          }`}
        >
          {paying ? '⏳ Initializing...' : selectedPlan === 'free' ? '✅ Activate Free Plan' : '💳 Pay Now via Kora Pay'}
        </button>
        <div className="text-xs text-slate-500 mt-2">
          Payment goes to admin wallet → auto-sweep transfers to designated account at scheduled time
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        {['all', 'completed', 'pending', 'failed'].map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 ${filter === f ? 'bg-[#FF6B35] text-white' : 'bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10'}`}>
            {f}
          </button>
        ))}
      </div>

      {/* Transaction Table */}
      <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
        <div className="grid grid-cols-5 gap-4 px-4 py-3 border-b border-white/10 text-[10px] font-black text-slate-500 uppercase tracking-wider">
          <div>From</div>
          <div>To</div>
          <div>Amount</div>
          <div>Reference</div>
          <div>Status</div>
        </div>
        {filtered.length === 0 && (
          <div className="px-4 py-8 text-center text-slate-600 text-sm">No transactions yet. Select an org and make a payment.</div>
        )}
        {filtered.map((txn: any) => (
          <div key={txn._id} className="grid grid-cols-5 gap-4 px-4 py-3 border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors">
            <div className="text-sm font-bold text-white">{txn.fromAgent}</div>
            <div className="text-sm text-slate-300">{txn.toAgent}</div>
            <div className="text-sm font-black text-amber-400">₦{txn.amount.toLocaleString()}</div>
            <div className="text-[10px] text-slate-500 truncate">{txn.reference}</div>
            <div>
              <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black border ${STATUS_COLORS[txn.status]}`}>
                {txn.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
