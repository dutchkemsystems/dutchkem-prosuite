import { useState } from 'react'

const SAMPLE_TXNS = [
  { id: 'TX1', from: 'Finance Pro', to: 'Content Pro', amount: 15000, status: 'completed', type: 'service_payment', date: '14:32' },
  { id: 'TX2', from: 'Academic Pro', to: 'Translation Hub', amount: 28000, status: 'completed', type: 'service_payment', date: '14:15' },
  { id: 'TX3', from: 'Business Pro', to: 'MediaStudio Pro', amount: 45000, status: 'pending', type: 'service_payment', date: '13:50' },
  { id: 'TX4', from: 'ServiceMart NG', to: 'Exam Pro', amount: 12000, status: 'completed', type: 'subscription', date: '13:42' },
  { id: 'TX5', from: 'Event Planner', to: 'Travel Planner', amount: 35000, status: 'completed', type: 'service_payment', date: '12:30' },
  { id: 'TX6', from: 'Wellness Pro', to: 'Personal Shopper', amount: 8500, status: 'failed', type: 'refund', date: '11:15' },
  { id: 'TX7', from: 'HR Onboarding Bot', to: 'Finance Assistant', amount: 22000, status: 'completed', type: 'service_payment', date: '10:45' },
  { id: 'TX8', from: 'Legal Document Review', to: 'Content Pro', amount: 50000, status: 'pending', type: 'service_payment', date: '09:30' },
]

const STATUS_COLORS: Record<string, string> = {
  completed: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  pending: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  failed: 'bg-red-500/20 text-red-400 border-red-500/30',
}

export function AdminPayments({ agents, organizations }: { agents: any[], organizations: any[] }) {
  const [filter, setFilter] = useState('all')

  const totalVolume = SAMPLE_TXNS.filter((t) => t.status === 'completed').reduce((sum, t) => sum + t.amount, 0)
  const completedCount = SAMPLE_TXNS.filter((t) => t.status === 'completed').length
  const pendingCount = SAMPLE_TXNS.filter((t) => t.status === 'pending').length
  const failedCount = SAMPLE_TXNS.filter((t) => t.status === 'failed').length

  const filtered = filter === 'all' ? SAMPLE_TXNS : SAMPLE_TXNS.filter((t) => t.status === filter)

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black tracking-tight">Agentic Payments</h2>
          <p className="text-sm text-slate-400 mt-1">Monitor agent-to-agent transactions and payment flows</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-amber-500/20 to-amber-600/10 border border-white/10 rounded-2xl p-5">
          <div className="text-3xl font-black">₦{totalVolume.toLocaleString()}</div>
          <div className="text-sm text-slate-400 mt-1">Total Volume</div>
        </div>
        <div className="bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 border border-white/10 rounded-2xl p-5">
          <div className="text-3xl font-black">{completedCount}</div>
          <div className="text-sm text-slate-400 mt-1">Completed</div>
        </div>
        <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/10 border border-white/10 rounded-2xl p-5">
          <div className="text-3xl font-black">{pendingCount}</div>
          <div className="text-sm text-slate-400 mt-1">Pending</div>
        </div>
        <div className="bg-gradient-to-br from-red-500/20 to-red-600/10 border border-white/10 rounded-2xl p-5">
          <div className="text-3xl font-black">{failedCount}</div>
          <div className="text-sm text-slate-400 mt-1">Failed</div>
        </div>
      </div>

      <div className="flex gap-2">
        {['all', 'completed', 'pending', 'failed'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 ${
              filter === f
                ? 'bg-[#FF6B35] text-white'
                : 'bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
        <div className="grid grid-cols-5 gap-4 px-4 py-3 border-b border-white/10 text-[10px] font-black text-slate-500 uppercase tracking-wider">
          <div>From</div>
          <div>To</div>
          <div>Amount</div>
          <div>Type</div>
          <div>Status</div>
        </div>
        {filtered.map((txn) => (
          <div
            key={txn.id}
            className="grid grid-cols-5 gap-4 px-4 py-3 border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors"
          >
            <div className="text-sm font-bold text-white">{txn.from}</div>
            <div className="text-sm text-slate-300">{txn.to}</div>
            <div className="text-sm font-black text-amber-400">₦{txn.amount.toLocaleString()}</div>
            <div className="text-xs text-slate-400">{txn.type}</div>
            <div>
              <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black border ${STATUS_COLORS[txn.status]}`}>
                {txn.status}
              </span>
            </div>
          </div>
        ))}
      </div>

      {organizations.length > 0 && (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
          <h3 className="text-sm font-black text-slate-300 mb-3">Transaction Volume by Organization</h3>
          <div className="space-y-2">
            {organizations.slice(0, 5).map((org: any) => (
              <div key={org._id} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                <span className="text-sm text-white">{org.name}</span>
                <span className="text-xs text-amber-400 font-black">₦{(org.totalVolume || 0).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
