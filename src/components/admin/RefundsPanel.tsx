import { useState } from 'react'
import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'

interface RefundsPanelProps {
  adminToken: string
}

export function RefundsPanel({ adminToken }: RefundsPanelProps) {
  const [period, setPeriod] = useState(30)

  const summary = useQuery(api.kora_refunds.getRefundSummary, { days: period, adminToken })
  const history = useQuery(api.kora_refunds.getRefundHistory, { limit: 50, adminToken })

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(amount)
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-NG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-emerald-500/20 text-emerald-400'
      case 'processing': return 'bg-amber-500/20 text-amber-400'
      case 'failed': return 'bg-red-500/20 text-red-400'
      default: return 'bg-slate-500/20 text-slate-400'
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black">Refund Management</h2>
          <p className="text-xs text-slate-400 mt-1">Process and track refunds</p>
        </div>
        <select
          value={period}
          onChange={(e) => setPeriod(Number(e.target.value))}
          className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm"
        >
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
        </select>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
            <p className="text-2xl font-black text-white">{summary.totalRefunds}</p>
            <p className="text-[10px] text-slate-500 uppercase">Total Refunds</p>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
            <p className="text-2xl font-black text-emerald-400">{formatAmount(summary.totalRefunded)}</p>
            <p className="text-[10px] text-slate-500 uppercase">Total Refunded</p>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
            <p className="text-2xl font-black text-amber-400">{summary.pendingRefunds}</p>
            <p className="text-[10px] text-slate-500 uppercase">Pending</p>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
            <p className="text-2xl font-black text-blue-400">{formatAmount(summary.averageRefund)}</p>
            <p className="text-[10px] text-slate-500 uppercase">Avg Refund</p>
          </div>
        </div>
      )}

      {/* Refund History */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-slate-800">
          <h3 className="text-sm font-bold">Refund History</h3>
        </div>
        <div className="overflow-x-auto max-h-96 overflow-y-auto">
          <table className="w-full">
            <thead className="sticky top-0 bg-slate-900">
              <tr className="text-left text-[10px] text-slate-500 uppercase">
                <th className="px-4 py-2">Refund ID</th>
                <th className="px-4 py-2">Original Ref</th>
                <th className="px-4 py-2">Amount</th>
                <th className="px-4 py-2">Reason</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Date</th>
              </tr>
            </thead>
            <tbody>
              {history?.map((refund: any) => (
                <tr key={refund.id} className="border-t border-slate-800 hover:bg-slate-800/50">
                  <td className="px-4 py-2 text-xs font-mono">{refund.refundId}</td>
                  <td className="px-4 py-2 text-xs font-mono">{refund.originalReference}</td>
                  <td className="px-4 py-2 text-xs font-medium">{formatAmount(refund.amount)}</td>
                  <td className="px-4 py-2 text-xs text-slate-400">{refund.reason}</td>
                  <td className="px-4 py-2">
                    <span className={`px-2 py-0.5 text-[10px] rounded-full ${getStatusColor(refund.status)}`}>
                      {refund.status}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-xs text-slate-400">{formatDate(refund.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {(!history || history.length === 0) && (
            <div className="p-8 text-center text-sm text-slate-500">No refunds found</div>
          )}
        </div>
      </div>
    </div>
  )
}
