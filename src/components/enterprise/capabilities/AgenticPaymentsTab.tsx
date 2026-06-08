import { useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { api } from '../../../../convex/_generated/api'

export function AgenticPaymentsTab({ token }: { token: string }) {
  const transactions = useQuery(api.enterprise_payments.listTransactions, { token }) || []
  const stats = useQuery(api.enterprise_payments.getStats, { token }) || { totalVolume: 0, transactionCount: 0, completedCount: 0, pendingCount: 0, avgAmount: 0 }
  const simulatePayment = useMutation(api.enterprise_payments.simulatePayment)
  const createTransaction = useMutation(api.enterprise_payments.createTransaction)

  const [showSettings, setShowSettings] = useState(false)
  const [limit, setLimit] = useState(50000)
  const [requireApproval, setRequireApproval] = useState(true)
  const [realTimeNotif, setRealTimeNotif] = useState(true)
  const [showSimulate, setShowSimulate] = useState(false)
  const [simFrom, setSimFrom] = useState('')
  const [simTo, setSimTo] = useState('')
  const [simAmount, setSimAmount] = useState('')
  const [simulating, setSimulating] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const showToast = (msg: string, isError = false) => {
    if (isError) setError(msg)
    else setSuccess(msg)
    setTimeout(() => { setError(''); setSuccess('') }, 3000)
  }

  const handleSimulate = async () => {
    if (!simFrom || !simTo || !simAmount) { showToast('All fields required', true); return }
    const amount = Number(simAmount)
    if (amount <= 0 || amount > limit) { showToast(`Amount must be between 1 and ${limit.toLocaleString()}`, true); return }
    setSimulating(true)
    try {
      const result = await simulatePayment({ token, fromAgent: simFrom, toAgent: simTo, amount })
      if (result.error) { showToast(result.error, true); return }
      showToast(`Payment simulated! Reference: ${result.reference}`)
      setShowSimulate(false)
      setSimFrom(''); setSimTo(''); setSimAmount('')
    } catch (e: any) { showToast(e.message || 'Failed', true) }
    finally { setSimulating(false) }
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
          <p className="text-sm text-slate-400 mt-1">Autonomous agent-to-agent commerce</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setShowSimulate(!showSimulate)}
            className="px-5 py-3 bg-gradient-to-r from-amber-500 to-yellow-600 text-white font-black text-sm rounded-xl hover:scale-105 transition-all">
            💸 Simulate Payment
          </button>
          <button onClick={() => setShowSettings(!showSettings)}
            className="px-6 py-3 bg-white/5 border border-white/10 text-white font-black text-sm rounded-xl hover:bg-white/10 transition-all">
            ⚙️ Settings
          </button>
        </div>
      </div>

      {error && <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm font-bold">{error}</div>}
      {success && <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-sm font-bold">{success}</div>}

      {/* Simulate Form */}
      {showSimulate && (
        <div className="p-6 bg-white/5 border border-white/10 rounded-2xl space-y-4">
          <h3 className="font-black">Simulate Agent Payment</h3>
          <div className="grid grid-cols-3 gap-4">
            <input value={simFrom} onChange={e => setSimFrom(e.target.value)}
              placeholder="From Agent" className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-500/50 font-medium" />
            <input value={simTo} onChange={e => setSimTo(e.target.value)}
              placeholder="To Agent" className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-500/50 font-medium" />
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-400">₦</span>
              <input type="number" value={simAmount} onChange={e => setSimAmount(e.target.value)}
                placeholder="Amount" className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-500/50 font-medium" />
            </div>
          </div>
          <button onClick={handleSimulate} disabled={simulating}
            className="px-6 py-3 bg-amber-600 text-white font-black text-sm rounded-xl hover:bg-amber-700 transition-all disabled:opacity-50">
            {simulating ? 'Processing...' : 'Run Simulation'}
          </button>
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
              <p className="text-slate-500 font-bold">No transactions yet. Simulate a payment to get started.</p>
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
                <span className={`text-[10px] font-black uppercase tracking-wider ${statusColors[txn.status] || 'text-slate-400'}`}>
                  {txn.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
