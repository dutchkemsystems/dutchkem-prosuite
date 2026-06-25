import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'

export function EnterprisePaymentsReadOnly({ adminToken }: { adminToken: string }) {
  const payments = useQuery(
    api.enterprise_client_payments.adminListAllEnterprisePayments,
    adminToken ? { adminToken, limit: 100 } : 'skip'
  ) || []

  const statusColors: Record<string, string> = {
    completed: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    pending: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
    failed: 'text-red-400 bg-red-500/10 border-red-500/20',
    refunded: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
  }

  const totalCollected = payments.filter((p: any) => p.status === 'completed').reduce((sum: number, p: any) => sum + p.amount, 0)
  const totalPending = payments.filter((p: any) => p.status === 'pending').reduce((sum: number, p: any) => sum + p.amount, 0)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-black tracking-tight">Enterprise Client Payments</h2>
        <p className="text-sm text-slate-400 mt-1">Read-only view of all enterprise payment transactions</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 bg-white/5 border border-white/10 rounded-2xl">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Total Collected</p>
          <p className="text-2xl font-black text-emerald-400 mt-1">₦{totalCollected.toLocaleString()}</p>
        </div>
        <div className="p-4 bg-white/5 border border-white/10 rounded-2xl">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Pending</p>
          <p className="text-2xl font-black text-orange-400 mt-1">₦{totalPending.toLocaleString()}</p>
        </div>
        <div className="p-4 bg-white/5 border border-white/10 rounded-2xl">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Total Transactions</p>
          <p className="text-2xl font-black text-white mt-1">{payments.length}</p>
        </div>
      </div>

      <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl text-blue-400 text-sm font-bold">
        🔒 Read-only mode — You can view enterprise transactions but cannot modify them
      </div>

      {payments.length === 0 ? (
        <div className="p-8 text-center text-slate-500">
          <p className="text-4xl mb-2">📊</p>
          <p className="font-bold">No enterprise payments yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {payments.map((p: any) => (
            <div key={p._id} className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-xl">
              <div className="flex-1">
                <p className="font-bold">{p.orgName}</p>
                <p className="text-xs text-slate-400">{p.customerName} • {p.customerEmail}</p>
                <p className="text-xs text-slate-500 mt-1">{p.invoiceNumber} • {p.gateway} • {new Date(p.createdAt).toLocaleDateString()}</p>
              </div>
              <div className="text-right">
                <p className="font-black text-lg">₦{p.amount.toLocaleString()}</p>
                <span className={`text-[10px] font-black uppercase px-2 py-1 rounded border ${statusColors[p.status] || ''}`}>
                  {p.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
