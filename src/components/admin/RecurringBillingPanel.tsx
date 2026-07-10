import { useState } from 'react'
import { useQuery, useAction } from 'convex/react'
import { api } from '../../../convex/_generated/api'

interface RecurringBillingPanelProps {
  adminToken: string
}

export function RecurringBillingPanel({ adminToken }: RecurringBillingPanelProps) {
  const [checking, setChecking] = useState(false)
  const [toast, setToast] = useState<{ type: string; message: string } | null>(null)

  const renewals = useQuery(api.recurring_billing.getRenewalHistory, { limit: 50, adminToken })
  const checkExpiring = useAction(api.recurring_billing.checkExpiringSubscriptions)

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(amount)
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-NG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-emerald-500/20 text-emerald-400'
      case 'pending': return 'bg-amber-500/20 text-amber-400'
      case 'failed': return 'bg-red-500/20 text-red-400'
      default: return 'bg-slate-500/20 text-slate-400'
    }
  }

  const handleCheckExpiring = async () => {
    setChecking(true)
    try {
      const result = await checkExpiring({})
      setToast({
        type: 'success',
        message: `Checked ${result.checked} subscriptions. Sent ${result.remindersSent} reminders, initiated ${result.autoRenewed} renewals.`
      })
    } catch (e: any) {
      setToast({ type: 'error', message: `Error: ${e.message}` })
    } finally {
      setChecking(false)
    }
  }

  // Group renewals by status
  const completedRenewals = renewals?.filter((r: any) => r.status === 'completed') || []
  const failedRenewals = renewals?.filter((r: any) => r.status === 'failed') || []
  const pendingRenewals = renewals?.filter((r: any) => r.status === 'pending') || []

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-2 rounded-lg shadow-lg ${
          toast.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'
        }`}>
          {toast.message}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black">Recurring Billing</h2>
          <p className="text-xs text-slate-400 mt-1">Automated subscription renewals and reminders</p>
        </div>
        <button
          onClick={handleCheckExpiring}
          disabled={checking}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:cursor-not-allowed rounded-lg text-sm font-medium transition-colors"
        >
          {checking ? 'Checking...' : 'Check Expiring'}
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <p className="text-2xl font-black text-emerald-400">{completedRenewals.length}</p>
          <p className="text-[10px] text-slate-500 uppercase">Completed</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <p className="text-2xl font-black text-amber-400">{pendingRenewals.length}</p>
          <p className="text-[10px] text-slate-500 uppercase">Pending</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <p className="text-2xl font-black text-red-400">{failedRenewals.length}</p>
          <p className="text-[10px] text-slate-500 uppercase">Failed</p>
        </div>
      </div>

      {/* Renewal History */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-slate-800">
          <h3 className="text-sm font-bold">Renewal History</h3>
        </div>
        <div className="overflow-x-auto max-h-96 overflow-y-auto">
          <table className="w-full">
            <thead className="sticky top-0 bg-slate-900">
              <tr className="text-left text-[10px] text-slate-500 uppercase">
                <th className="px-4 py-2">Subscription ID</th>
                <th className="px-4 py-2">Service</th>
                <th className="px-4 py-2">Plan</th>
                <th className="px-4 py-2">Amount</th>
                <th className="px-4 py-2">Reference</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Date</th>
              </tr>
            </thead>
            <tbody>
              {renewals?.map((renewal: any) => (
                <tr key={renewal.id} className="border-t border-slate-800 hover:bg-slate-800/50">
                  <td className="px-4 py-2 text-xs font-mono">{renewal.subscriptionId || '-'}</td>
                  <td className="px-4 py-2 text-xs text-slate-400 capitalize">{renewal.service || '-'}</td>
                  <td className="px-4 py-2 text-xs text-slate-400 capitalize">{renewal.plan || '-'}</td>
                  <td className="px-4 py-2 text-xs font-medium">{renewal.amount ? formatAmount(renewal.amount) : '-'}</td>
                  <td className="px-4 py-2 text-xs font-mono">{renewal.reference || '-'}</td>
                  <td className="px-4 py-2">
                    <span className={`px-2 py-0.5 text-[10px] rounded-full ${getStatusColor(renewal.status)}`}>
                      {renewal.status}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-xs text-slate-400">
                    {renewal.completedAt ? formatDate(renewal.completedAt) : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {(!renewals || renewals.length === 0) && (
            <div className="p-8 text-center text-sm text-slate-500">No renewals found</div>
          )}
        </div>
      </div>
    </div>
  )
}
