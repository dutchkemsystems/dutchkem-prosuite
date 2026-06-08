import { useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { api } from '../../../../convex/_generated/api'

export function AgenticPaymentsTab({ token }: { token: string }) {
  const transactions = useQuery(api.enterprise_payments.listTransactions, { token }) || []
  const stats = useQuery(api.enterprise_payments.getStats, { token }) || { totalVolume: 0, transactionCount: 0, completedCount: 0, pendingCount: 0, avgAmount: 0 }
  const spendingLimitData = useQuery(api.enterprise_payments.getSpendingLimit, { token }) || { limit: 500000 }
  const createTransaction = useMutation(api.enterprise_payments.createTransaction)
  const simulatePayment = useMutation(api.enterprise_payments.simulatePayment)
  const setSpendingLimitMut = useMutation(api.enterprise_payments.setSpendingLimit)
  const initiateSubPayment = useMutation(api.enterprise_payments.initiateSubscriptionPayment)
  const verifySubPayment = useMutation(api.enterprise_payments.verifySubscriptionPayment)

  const [showPay, setShowPay] = useState(false)
  const [payFrom, setPayFrom] = useState('')
  const [payTo, setPayTo] = useState('')
  const [payAmount, setPayAmount] = useState('')
  const [paying, setPaying] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [spendingLimit, setSpendingLimit] = useState(0)
  const [savingLimit, setSavingLimit] = useState(false)
  const [requireApproval, setRequireApproval] = useState(true)
  const [realTimeNotif, setRealTimeNotif] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showSubPay, setShowSubPay] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<'growth' | 'enterprise' | 'scale' | null>(null)

  const [subStep, setSubStep] = useState<'details' | 'passkey' | 'processing' | 'done'>('details')
  const [subAmount, setSubAmount] = useState('')
  const [subPasskey, setSubPasskey] = useState('')
  const [generatedPasskey, setGeneratedPasskey] = useState('')
  const [subReference, setSubReference] = useState('')
  const [subCompanyName] = useState('Dutchkem Ventures')

  const SUBSCRIPTION_PLANS = [
    { id: 'growth' as const, name: 'Growth Plan', price: 50000, period: 'month', features: ['5 Users', '10 Workflows', 'Basic Support'] },
    { id: 'enterprise' as const, name: 'Enterprise Plan', price: 150000, period: 'month', features: ['25 Users', 'Unlimited Workflows', 'Priority Support', 'Custom Integrations'] },
    { id: 'scale' as const, name: 'Scale Plan', price: 500000, period: 'month', features: ['Unlimited Users', 'Unlimited Workflows', '24/7 Support', 'Custom Integrations', 'Dedicated Account Manager'] },
  ]

  if (spendingLimitData.limit !== spendingLimit && spendingLimit === 0) {
    setSpendingLimit(spendingLimitData.limit)
  }

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

  const handleStartSubPayment = async (planId: 'growth' | 'enterprise' | 'scale') => {
    const plan = SUBSCRIPTION_PLANS.find(p => p.id === planId)
    if (!plan) return
    setSelectedPlan(planId)
    setSubAmount(String(plan.price))
    setSubStep('details')
    setSubPasskey('')
    setGeneratedPasskey('')
    setSubReference('')
    setShowSubPay(true)
    setShowPay(false)
  }

  const handleInitiateSubPayment = async () => {
    if (!selectedPlan) return
    const amount = Number(subAmount)
    if (amount < 1000) { showToast('Minimum payment is ₦1,000', true); return }
    setPaying(true)
    try {
      const result: any = await initiateSubPayment({ token, planId: selectedPlan, amount })
      if (result.error) { showToast(result.error, true); return }
      setGeneratedPasskey(result.passkey)
      setSubReference(result.reference)
      setSubStep('passkey')
    } catch (e: any) { showToast(e.message || 'Failed to initiate payment', true) }
    finally { setPaying(false) }
  }

  const handleVerifySubPayment = async () => {
    if (!subPasskey || subPasskey.length !== 6) { showToast('Enter the 6-digit passkey', true); return }
    setPaying(true)
    setSubStep('processing')
    try {
      const result = await verifySubPayment({ token, reference: subReference, passkey: subPasskey })
      if (result.error) { showToast(result.error, true); setSubStep('passkey'); return }
      showToast(`Subscription to ${SUBSCRIPTION_PLANS.find(p => p.id === result.plan)?.name} activated!`)
      setSubStep('done')
      setTimeout(() => { setShowSubPay(false); setSubStep('details') }, 3000)
    } catch (e: any) { showToast(e.message || 'Verification failed', true); setSubStep('passkey') }
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

  const handleSaveSpendingLimit = async () => {
    setSavingLimit(true)
    try {
      const result = await setSpendingLimitMut({ token, limit: spendingLimit })
      if (result.error) { showToast(result.error, true); return }
      showToast(`Spending limit set to ₦${spendingLimit.toLocaleString()}`)
    } catch (e: any) { showToast(e.message || 'Failed to save', true) }
    finally { setSavingLimit(false) }
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
            Send Payment
          </button>
          <button onClick={() => { handleStartSubPayment('growth') }}
            className="px-5 py-3 bg-gradient-to-r from-emerald-500 to-green-600 text-white font-black text-sm rounded-xl hover:scale-105 transition-all">
            Subscribe
          </button>
          <button onClick={() => setShowSettings(!showSettings)}
            className="px-5 py-3 bg-white/5 border border-white/10 text-white font-black text-sm rounded-xl hover:bg-white/10 transition-all">
            Settings
          </button>
        </div>
      </div>

      {error && <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm font-bold">{error}</div>}
      {success && <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-sm font-bold">{success}</div>}

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

      {/* Subscription Payment Modal */}
      {showSubPay && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-slate-900 border border-white/10 rounded-2xl w-[480px] max-w-[90%] shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-white/10">
              <h3 className="font-black text-lg">Enterprise Subscription Payment</h3>
              <button onClick={() => setShowSubPay(false)} className="text-slate-500 hover:text-white text-xl font-bold">&times;</button>
            </div>
            <div className="p-6 space-y-5">
              {/* Company Info */}
              <div className="bg-white/5 rounded-xl p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Paying to:</span>
                  <span className="font-black text-emerald-400">{subCompanyName}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Plan:</span>
                  <span className="font-black text-white">{SUBSCRIPTION_PLANS.find(p => p.id === selectedPlan)?.name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Amount:</span>
                  <span className="font-black text-amber-400">₦{Number(subAmount || 0).toLocaleString()}</span>
                </div>
              </div>

              {subStep === 'details' && (
                <>
                  <div>
                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest block mb-2">Payment Amount (₦)</label>
                    <input type="number" value={subAmount} onChange={e => setSubAmount(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-lg font-black placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50" />
                  </div>
                  <button onClick={handleInitiateSubPayment} disabled={paying}
                    className="w-full py-3 bg-emerald-600 text-white font-black rounded-xl hover:bg-emerald-700 transition-all disabled:opacity-50">
                    {paying ? 'Generating Passkey...' : 'Proceed to Payment'}
                  </button>
                </>
              )}

              {subStep === 'passkey' && (
                <>
                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 text-center space-y-2">
                    <p className="text-sm text-amber-400 font-bold">A 6-digit passkey has been generated for this transaction</p>
                    <div className="text-4xl font-black text-white tracking-[0.3em] font-mono bg-white/5 rounded-xl py-3">{generatedPasskey}</div>
                    <p className="text-xs text-slate-500">Enter this passkey below to complete payment (expires in 10 minutes)</p>
                  </div>
                  <div>
                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest block mb-2">Enter Passkey</label>
                    <input type="text" value={subPasskey} onChange={e => setSubPasskey(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="000000" maxLength={6}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-center text-2xl font-black tracking-[0.2em] placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 font-mono" />
                  </div>
                  <button onClick={handleVerifySubPayment} disabled={paying || subPasskey.length !== 6}
                    className="w-full py-3 bg-emerald-600 text-white font-black rounded-xl hover:bg-emerald-700 transition-all disabled:opacity-50">
                    {paying ? 'Verifying...' : 'Verify & Complete Payment'}
                  </button>
                </>
              )}

              {subStep === 'processing' && (
                <div className="text-center py-8 space-y-4">
                  <div className="w-12 h-12 border-4 border-white/10 border-t-emerald-500 rounded-full animate-spin mx-auto" />
                  <p className="text-slate-400 font-bold">Processing payment...</p>
                </div>
              )}

              {subStep === 'done' && (
                <div className="text-center py-8 space-y-4">
                  <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto text-3xl">✓</div>
                  <p className="text-emerald-400 font-black text-lg">Payment Successful!</p>
                  <p className="text-sm text-slate-400">Your subscription has been activated. Admin wallet has been updated.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Settings */}
      {showSettings && (
        <div className="p-6 bg-white/5 border border-white/10 rounded-2xl space-y-4">
          <h3 className="font-black">Payment Settings</h3>
          <div className="flex items-center gap-4">
            <label className="text-sm text-slate-400">Transaction Spending Limit (₦):</label>
            <input type="number" value={spendingLimit} onChange={(e) => setSpendingLimit(Number(e.target.value))}
              className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white font-medium w-40" />
            <button onClick={handleSaveSpendingLimit} disabled={savingLimit}
              className="px-4 py-2 bg-emerald-600 text-white font-black text-sm rounded-xl hover:bg-emerald-700 transition-all disabled:opacity-50">
              {savingLimit ? 'Saving...' : 'Save Limit'}
            </button>
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
          <p className="text-3xl font-black text-violet-400">₦{spendingLimitData.limit.toLocaleString()}</p>
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
