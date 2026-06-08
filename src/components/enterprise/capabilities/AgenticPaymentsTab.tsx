import { useState } from 'react'

const sampleTransactions = [
  { id: 'TXN-001', from: 'Research Agent', to: 'Data Agent', amount: 2500, status: 'completed' as const, time: '2 min ago', ref: 'REF-8823' },
  { id: 'TXN-002', from: 'Writing Agent', to: 'Review Agent', amount: 1800, status: 'completed' as const, time: '15 min ago', ref: 'REF-8824' },
  { id: 'TXN-003', from: 'Analytics Agent', to: 'Report Agent', amount: 3200, status: 'pending' as const, time: '1 hour ago', ref: 'REF-8825' },
  { id: 'TXN-004', from: 'Support Agent', to: 'Translation Agent', amount: 900, status: 'completed' as const, time: '3 hours ago', ref: 'REF-8826' },
]

export function AgenticPaymentsTab({ token }: { token: string }) {
  const [limit, setLimit] = useState(50000)
  const [showSettings, setShowSettings] = useState(false)

  const totalVolume = sampleTransactions.reduce((sum, t) => sum + t.amount, 0)

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black tracking-tight">Agentic Payments</h2>
          <p className="text-sm text-slate-400 mt-1">Autonomous agent-to-agent commerce</p>
        </div>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="px-6 py-3 bg-white/5 border border-white/10 text-white font-black text-sm rounded-xl hover:bg-white/10 transition-all"
        >
          ⚙️ Settings
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="p-5 bg-white/5 border border-white/10 rounded-2xl">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Total Volume (Today)</p>
          <p className="text-3xl font-black text-amber-400">₦{totalVolume.toLocaleString()}</p>
        </div>
        <div className="p-5 bg-white/5 border border-white/10 rounded-2xl">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Transactions</p>
          <p className="text-3xl font-black text-emerald-400">{sampleTransactions.length}</p>
        </div>
        <div className="p-5 bg-white/5 border border-white/10 rounded-2xl">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Spending Limit</p>
          <p className="text-3xl font-black text-blue-400">₦{limit.toLocaleString()}</p>
        </div>
      </div>

      {showSettings && (
        <div className="p-6 bg-white/5 border border-white/10 rounded-2xl space-y-4">
          <h3 className="font-black">Payment Settings</h3>
          <div className="flex items-center gap-4">
            <label className="text-sm text-slate-400">Daily Spending Limit (₦):</label>
            <input
              type="number"
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white font-medium w-40"
            />
          </div>
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 text-sm text-slate-400">
              <input type="checkbox" defaultChecked className="accent-amber-500" /> Real-time notifications
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-400">
              <input type="checkbox" defaultChecked className="accent-amber-500" /> Require approval above ₦10,000
            </label>
          </div>
        </div>
      )}

      <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-white/5">
          <h3 className="font-black">Transaction History</h3>
        </div>
        <div className="divide-y divide-white/5">
          {sampleTransactions.map((txn) => (
            <div key={txn.id} className="flex items-center justify-between p-5 hover:bg-white/5 transition-colors">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center text-lg">💳</div>
                <div>
                  <p className="font-black text-sm">{txn.from} → {txn.to}</p>
                  <p className="text-xs text-slate-500">{txn.ref} · {txn.time}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-black text-amber-400">₦{txn.amount.toLocaleString()}</p>
                <span className={`text-[10px] font-black uppercase tracking-wider ${
                  txn.status === 'completed' ? 'text-emerald-400' : 'text-orange-400'
                }`}>{txn.status}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
