import { useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { api } from '../../../../convex/_generated/api'

export function AgenticPaymentsTab({ token }: { token: string }) {
  const transactions = useQuery(api.enterprise_payments.listTransactions, { token }) || []
  const stats = useQuery(api.enterprise_payments.getStats, { token }) || { totalVolume: 0, transactionCount: 0, completedCount: 0, pendingCount: 0, avgAmount: 0 }
  const createTransaction = useMutation(api.enterprise_payments.createTransaction)
  const simulatePayment = useMutation(api.enterprise_payments.simulatePayment)

  const [showPay, setShowPay] = useState(false)
  const [payFrom, setPayFrom] = useState('')
  const [payTo, setPayTo] = useState('')
  const [payAmount, setPayAmount] = useState('')
  const [paying, setPaying] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [limit, setLimit] = useState(50000)
  const [requireApproval, setRequireApproval] = useState(true)
  const [realTimeNotif, setRealTimeNotif] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showSubPay, setShowSubPay] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null)

  const SUBSCRIPTION_PLANS = [
    { id: 'growth', name: 'Growth Plan', price: 50000, period: 'month', features: ['5 Users', '10 Workflows', 'Basic Support'] },
    { id: 'enterprise', name: 'Enterprise Plan', price: 150000, period: 'month', features: ['25 Users', 'Unlimited Workflows', 'Priority Support', 'Custom Integrations'] },
    { id: 'scale', name: 'Scale Plan', price: 500000, period: 'month', features: ['Unlimited Users', 'Unlimited Workflows', '24/7 Support', 'Custom Integrations', 'Dedicated Account Manager'] },
  ]

  const showToast = (msg: string, isError = false) => {
    if (isError) setError(msg)
    else setSuccess(msg)
    setTimeout(() => { setError(''); setSuccess('') }, 3000)
  }

  const handlePay = async () => {
    if (!payFrom || !payTo || !payAmount) { showToast('All fields required', true); return }
    const amount = Number(payAmount)
    if (amount <= 0) { showToast('Amount must be positive', true); return }
    setPaying(true)
    try {
      const result = await createTransaction({ token, fromAgent: payFrom, toAgent: payTo, amount })
      if (result.error) { showToast(result.error, true); return }
      showToast(`Payment of ₦${amount.toLocaleString()} completed! Ref: ${result.reference}`)
      setShowPay(false)
      setPayFrom(''); setPayTo(''); setPayAmount('')
    } catch (e: any) { showToast(e.message || 'Payment failed', true) }
    finally { setPaying(false) }
  }

  const handleSubscribe = async (planId: string) => {
    setSelectedPlan(planId)
    const plan = SUBSCRIPTION_PLANS.find(p => p.id === planId)
    if (!plan) return
    setPaying(true)
    try {
      const result = await createTransaction({
        token,
        fromAgent: 'Organization',
        toAgent: 'Dutchkem Ventures',
        amount: plan.price,
      })
      if (result.error) { showToast(result.error, true); return }
      showToast(`Subscription to ${plan.name} activated! Ref: ${result.reference}`)
      setShowSubPay(false)
      setSelectedPlan(null)
    } catch (e: any) { showToast(e.message || 'Payment failed', true) }
    finally { setPaying(false) }
  }

  const handleSimulate = async () => {
    if (!payFrom || !payTo || !payAmount) { showToast('All fields required', true); return }
    const amount = Number(payAmount)
    if (amount <= 0) { showToast('Amount must be positive', true); return }
    setPaying(true)
    try {
      const result = await simulatePayment({ token, fromAgent: payFrom, toAgent: payTo, amount })
      if (result.error) { showToast(result.error, true); return }
      showToast(`Agent payment completed! Ref: ${result.reference}`)
      setShowPay(false)
      setPayFrom(''); setPayTo(''); setPayAmount('')
    } catch (e: any) { showToast(e.message || 'Payment failed', true) }
    finally { setPaying(false) }
  }

  const statusColors: Record<string, string> = {
    completed: 'text-emerald-400',
    pending: 'text-orange-400',
    failed: 'text-red-400',
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {(error || success) && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl text-sm font-black ${error ? 'bg-red-600 text-white' : 'bg-emerald-600 text-white'}`}>
          {error || success}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black tracking-tight">Agentic Payments</h2>
          <p className="text-sm text-slate-400 mt-1">Autonomous agent-to-agent commerce & subscriptions</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => { setShowPay(!showPay); setShowSubPay(false) }}
            className="px-5 py-3 bg-gradient-to-r from-amber-500 to-yellow-600 text-white font-black text-sm rounded-xl hover:scale-105 transition-all">
            💸 Send Payment
          </button>
          <button onClick={() => { setShowSubPay(!showSubPay); setShowPay(false) }}
            className="px-5 py-3 bg-gradient-to-r from-emerald-500 to-green-600 text-white font-black text-sm rounded-xl hover:scale-105 transition-all">
            🔄 Subscribe
          </button>
          <button onClick={() => setShowSettings(!showSettings)}
            className="px-5 py-3 bg-white/5 border border-white/10 text-white font-black text-sm rounded-xl hover:bg-white/10 transition-all">
            ⚙️ Settings
          </button>
        </div>
      </div>

      {error && <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm font-bold">{error}</div>}
      {success && <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-sm font-bold">{success}</div>}

      {/* Send Payment Form */}
      {showPay && (
        <div className="p-6 bg-white/5 border border-white/10 rounded-2xl space-y-4">
          <h3 className="font-black">Send Agent Payment</h3>
          <div className="grid grid-cols-3 gap-4">
            <input value={payFrom} onChange={e => setPayFrom(e.target.value)} placeholder="From Agent (e.g. Research Agent)"
              className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-500/50 font-medium" />
            <input value={payTo} onChange={e => setPayTo(e.target.value)} placeholder="To Agent (e.g. Data Agent)"
              className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-500/50 font-medium" />
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-400">₦</span>
              <input type="number" value={payAmount} onChange={e => setPayAmount(e.target.value)} placeholder="Amount"
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-500/50 font-medium" />
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={handlePay} disabled={paying}
              className="px-6 py-3 bg-amber-600 text-white font-black text-sm rounded-xl hover:bg-amber-700 transition-all disabled:opacity-50">
              {paying ? 'Processing...' : 'Send Payment'}
            </button>
            <button onClick={handleSimulate} disabled={paying}
              className="px-6 py-3 bg-white/5 border border-white/10 text-white font-black text-sm rounded-xl hover:bg-white/10 transition-all disabled:opacity-50">
              {paying ? 'Processing...' : 'Simulate (Demo)'}
            </button>
          </div>
        </div>
      )}

      {/* Subscription Plans */}
      {showSubPay && (
        <div className="p-6 bg-white/5 border border-white/10 rounded-2xl space-y-4">
          <h3 className="font-black">Enterprise Subscription Plans</h3>
          <div className="grid grid-cols-3 gap-4">
            {SUBSCRIPTION_PLANS.map(plan => (
              <div key={plan.id} className={`p-5 rounded-xl border transition-all ${selectedPlan === plan.id ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}>
                <h4 className="font-black text-lg">{plan.name}</h4>
                <p className="text-2xl font-black text-emerald-400 mt-2">₦{plan.price.toLocaleString()}<span className="text-xs text-slate-500">/{plan.period}</span></p>
                <ul className="mt-3 space-y-1">
                  {plan.features.map((f, i) => (
                    <li key={i} className="text-xs text-slate-400 flex items-center gap-2"><span className="text-emerald-400">✓</span>{f}</li>
                  ))}
                </ul>
                <button onClick={() => handleSubscribe(plan.id)} disabled={paying && selectedPlan === plan.id}
                  className="w-full mt-4 py-2 bg-emerald-600 text-white font-black text-sm rounded-xl hover:bg-emerald-700 transition-all disabled:opacity-50">
                  {paying && selectedPlan === plan.id ? 'Processing...' : 'Subscribe Now'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Settings */}
      {showSettings && (
        <div className="p-6 bg-white/5 border border-white/10 rounded-2xl space-y-4">
          <h3 className="font-black">Payment Settings</h3>
          <div className="flex items-center gap-4">
            <label className="text-sm text-slate-400">Daily Spending Limit (₦):</label>
            <input type="number" value={limit} onChange={(e) => setLimit(Number(e.target.value))}
              className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white font-medium w-40" />
          </div>
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 text-sm text-slate-400 cursor-pointer">
              <input type="checkbox" checked={realTimeNotif} onChange={e => setRealTimeNotif(e.target.checked)} className="accent-amber-500" />
              Real-time notifications
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-400 cursor-pointer">
              <input type="checkbox" checked={requireApproval} onChange={e => setRequireApproval(e.target.checked)} className="accent-amber-500" />
              Require approval above ₦10,000
            </label>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="p-5 bg-white/5 border border-white/10 rounded-2xl">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Total Volume</p>
          <p className="text-3xl font-black text-amber-400">₦{stats.totalVolume.toLocaleString()}</p>
        </div>
        <div className="p-5 bg-white/5 border border-white/10 rounded-2xl">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Transactions</p>
          <p className="text-3xl font-black text-emerald-400">{stats.transactionCount}</p>
        </div>
        <div className="p-5 bg-white/5 border border-white/10 rounded-2xl">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Completed</p>
          <p className="text-3xl font-black text-blue-400">{stats.completedCount}</p>
        </div>
        <div className="p-5 bg-white/5 border border-white/10 rounded-2xl">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Spending Limit</p>
          <p className="text-3xl font-black text-violet-400">₦{limit.toLocaleString()}</p>
        </div>
      </div>

      {/* Transaction History */}
      <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-white/5">
          <h3 className="font-black">Transaction History</h3>
        </div>
        <div className="divide-y divide-white/5">
          {transactions.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-4xl mb-4">💳</p>
              <p className="text-slate-500 font-bold">No transactions yet. Send a payment or subscribe to get started.</p>
            </div>
          ) : transactions.map((txn: any) => (
            <div key={txn._id} className="flex items-center justify-between p-5 hover:bg-white/5 transition-colors">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center text-lg">💳</div>
                <div>
                  <p className="font-black text-sm">{txn.fromAgent} → {txn.toAgent}</p>
                  <p className="text-xs text-slate-500">{txn.reference} · {new Date(txn.createdAt).toLocaleString()}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-black text-amber-400">₦{txn.amount.toLocaleString()}</p>
                <span className={`text-[10px] font-black uppercase tracking-wider ${statusColors[txn.status] || 'text-slate-400'}`}>{txn.status}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
