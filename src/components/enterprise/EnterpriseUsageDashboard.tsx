import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'

function formatNgN(amount: number): string {
  return `₦${amount.toLocaleString()}`
}

export function EnterpriseUsageDashboard({ orgId, token }: { orgId: string; token: string }) {
  const stats = useQuery(api.revenue_outcomes.getApiUsageStats, token ? { token } : 'skip')
  const transactions = useQuery(api.enterprise_payments.listTransactions, token ? { token } : 'skip')

  const totalTransactions = stats?.totalTransactions ?? 0
  const totalVolume = stats?.totalVolume ?? 0
  const activeApiUsers = stats?.activeApiUsers ?? 0

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-black text-white">Enterprise Usage</h2>
        <p className="text-sm text-slate-400 mt-1">Monitor your organization's usage and spending</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/10 border border-blue-500/30 rounded-2xl p-5">
          <span className="text-2xl">📊</span>
          <div className="text-3xl font-black text-white mt-3">{totalTransactions}</div>
          <div className="text-sm text-slate-400 mt-1">Total Transactions</div>
        </div>
        <div className="bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 border border-emerald-500/30 rounded-2xl p-5">
          <span className="text-2xl">💰</span>
          <div className="text-3xl font-black text-white mt-3">{formatNgN(totalVolume)}</div>
          <div className="text-sm text-slate-400 mt-1">Total Volume</div>
        </div>
        <div className="bg-gradient-to-br from-orange-500/20 to-orange-600/10 border border-orange-500/30 rounded-2xl p-5">
          <span className="text-2xl">🔑</span>
          <div className="text-3xl font-black text-white mt-3">{activeApiUsers}</div>
          <div className="text-sm text-slate-400 mt-1">Active API Users</div>
        </div>
        <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/10 border border-purple-500/30 rounded-2xl p-5">
          <span className="text-2xl">📈</span>
          <div className="text-3xl font-black text-white mt-3">{stats?.successRate ?? 0}%</div>
          <div className="text-sm text-slate-400 mt-1">Success Rate</div>
        </div>
      </div>

      {/* Recent Transactions */}
      <div>
        <h3 className="text-lg font-bold text-white mb-3">Recent Transactions</h3>
        <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
          <div className="grid grid-cols-[1fr_auto_auto_auto_auto] px-5 py-3 border-b border-white/5 text-sm text-slate-400 font-medium">
            <div>Reference</div>
            <div>Amount</div>
            <div>Currency</div>
            <div>Status</div>
            <div>Date</div>
          </div>
          {(transactions ?? []).slice(0, 20).map((t: any) => (
            <div key={t._id} className="grid grid-cols-[1fr_auto_auto_auto_auto] px-5 py-3 border-b border-white/5 hover:bg-white/5 transition-colors text-sm">
              <div className="text-white font-mono truncate max-w-[160px]">{t.reference}</div>
              <div className="text-orange-400 font-bold">{formatNgN(t.amount)}</div>
              <div className="text-slate-300">{t.currency}</div>
              <div className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                t.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400' :
                t.status === 'pending' ? 'bg-amber-500/20 text-amber-400' :
                'bg-red-500/20 text-red-400'
              }`}>
                {t.status}
              </div>
              <div className="text-slate-400">{t.createdAt ? new Date(t.createdAt).toLocaleDateString() : '—'}</div>
            </div>
          ))}
          {(!transactions || transactions.length === 0) && (
            <div className="px-5 py-8 text-center text-slate-500 text-sm">No transactions yet</div>
          )}
        </div>
      </div>
    </div>
  )
}
