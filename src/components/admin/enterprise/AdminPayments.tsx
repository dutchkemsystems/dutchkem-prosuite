import { useState } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../../convex/_generated/api'

const STATUS_COLORS: Record<string, string> = {
  completed: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  pending: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  failed: 'bg-red-500/20 text-red-400 border-red-500/30',
}

export function AdminPayments({ adminToken, organizations }: { adminToken: string, agents: any[], organizations: any[] }) {
  const [filter, setFilter] = useState('all')
  const [selectedOrg, setSelectedOrg] = useState(organizations[0]?._id || '')
  const [simFrom, setSimFrom] = useState('A1')
  const [simTo, setSimTo] = useState('A2')
  const [simAmount, setSimAmount] = useState('5000')
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const transactions = useQuery(api.enterprise_payments.listTransactions, { orgId: selectedOrg as any, adminToken }, { enabled: !!selectedOrg })
  const stats = useQuery(api.enterprise_payments.getStats, { orgId: selectedOrg as any, adminToken }, { enabled: !!selectedOrg })
  const spendingLimit = useQuery(api.enterprise_payments.getSpendingLimit, { orgId: selectedOrg as any, adminToken }, { enabled: !!selectedOrg })
  const simulatePayment = useMutation(api.enterprise_payments.simulatePayment)

  const txnList = transactions || []
  const filtered = filter === 'all' ? txnList : txnList.filter((t: any) => t.status === filter)

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  const handleSimulate = async () => {
    if (!selectedOrg) { showToast('Select an organization first', 'error'); return }
    try {
      const result: any = await simulatePayment({
        orgId: selectedOrg as any,
        fromAgent: simFrom,
        toAgent: simTo,
        amount: Number(simAmount),
        currency: 'NGN',
        adminToken,
      })
      if (result?.error) { showToast(result.error, 'error'); return }
      showToast('Payment simulated successfully!', 'success')
    } catch (e: any) { showToast(e.message || 'Failed', 'error') }
  }

  const AGENT_IDS = ['A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7', 'A8', 'A9', 'A10', 'A11', 'A12', 'A13', 'A14', 'A15']
  const AGENT_NAMES: Record<string, string> = { A1: 'Academic Pro', A2: 'Business Pro', A3: 'Content Pro', A4: 'Career Pro', A5: 'Personal Shopper', A6: 'Exam Pro', A7: 'Finance Pro', A8: 'MediaStudio Pro', A9: 'Wellness Pro', A10: 'Home Services', A11: 'Language Tutor', A12: 'Travel Planner', A13: 'ServiceMart NG', A14: 'Translation Hub', A15: 'Event Planner' }

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
          <p className="text-sm text-slate-400 mt-1">Monitor agent-to-agent transactions and payment flows</p>
        </div>
        <select value={selectedOrg} onChange={(e) => setSelectedOrg(e.target.value)} className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-[#FF6B35]/50">
          <option value="" className="bg-[#0a0a0f]">Select organization...</option>
          {organizations.map((o: any) => <option key={o._id} value={o._id} className="bg-[#0a0a0f]">{o.name}</option>)}
        </select>
      </div>

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

      {spendingLimit && (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <span className="text-sm text-slate-400">Spending Limit: </span>
            <span className="text-sm font-black text-amber-400">₦{(spendingLimit.spendingLimit || 0).toLocaleString()}</span>
          </div>
          <div>
            <span className="text-sm text-slate-400">Plan: </span>
            <span className="text-sm font-black text-white uppercase">{spendingLimit.plan || 'free'}</span>
          </div>
        </div>
      )}

      <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
        <h3 className="text-sm font-black text-slate-300 mb-3">Simulate Payment</h3>
        <div className="grid grid-cols-4 gap-3 items-end">
          <div>
            <label className="text-[10px] text-slate-500 mb-1 block">From Agent</label>
            <select value={simFrom} onChange={(e) => setSimFrom(e.target.value)} className="w-full px-2 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs text-white focus:outline-none">
              {AGENT_IDS.map(id => <option key={id} value={id} className="bg-[#0a0a0f]">{id} - {AGENT_NAMES[id]}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] text-slate-500 mb-1 block">To Agent</label>
            <select value={simTo} onChange={(e) => setSimTo(e.target.value)} className="w-full px-2 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs text-white focus:outline-none">
              {AGENT_IDS.map(id => <option key={id} value={id} className="bg-[#0a0a0f]">{id} - {AGENT_NAMES[id]}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] text-slate-500 mb-1 block">Amount (₦)</label>
            <input type="number" value={simAmount} onChange={(e) => setSimAmount(e.target.value)} className="w-full px-2 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs text-white focus:outline-none" />
          </div>
          <button onClick={handleSimulate} className="px-4 py-1.5 bg-[#FF6B35] hover:bg-[#FF8255] text-white rounded-lg text-xs font-black transition-all duration-200">
            Simulate
          </button>
        </div>
      </div>

      <div className="flex gap-2">
        {['all', 'completed', 'pending', 'failed'].map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 ${filter === f ? 'bg-[#FF6B35] text-white' : 'bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10'}`}>
            {f}
          </button>
        ))}
      </div>

      <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
        <div className="grid grid-cols-5 gap-4 px-4 py-3 border-b border-white/10 text-[10px] font-black text-slate-500 uppercase tracking-wider">
          <div>From</div>
          <div>To</div>
          <div>Amount</div>
          <div>Reference</div>
          <div>Status</div>
        </div>
        {filtered.length === 0 && (
          <div className="px-4 py-8 text-center text-slate-600 text-sm">No transactions yet. Use simulate to test.</div>
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
