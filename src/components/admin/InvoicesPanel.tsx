import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'

interface InvoicesPanelProps {
  adminToken: string
}

export function InvoicesPanel({ adminToken }: InvoicesPanelProps) {
  const invoices = useQuery(api.invoices.getInvoices, { limit: 50, adminToken })

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
      case 'generated': return 'bg-blue-500/20 text-blue-400'
      case 'sent': return 'bg-emerald-500/20 text-emerald-400'
      case 'viewed': return 'bg-amber-500/20 text-amber-400'
      default: return 'bg-slate-500/20 text-slate-400'
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black">Invoice Management</h2>
          <p className="text-xs text-slate-400 mt-1">View and manage invoices</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <p className="text-2xl font-black text-white">{invoices?.length || 0}</p>
          <p className="text-[10px] text-slate-500 uppercase">Total Invoices</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <p className="text-2xl font-black text-blue-400">
            {invoices?.filter((i: any) => i.status === 'generated').length || 0}
          </p>
          <p className="text-[10px] text-slate-500 uppercase">Generated</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <p className="text-2xl font-black text-emerald-400">
            {invoices?.filter((i: any) => i.status === 'sent').length || 0}
          </p>
          <p className="text-[10px] text-slate-500 uppercase">Sent</p>
        </div>
      </div>

      {/* Invoice List */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-slate-800">
          <h3 className="text-sm font-bold">Invoices</h3>
        </div>
        <div className="overflow-x-auto max-h-96 overflow-y-auto">
          <table className="w-full">
            <thead className="sticky top-0 bg-slate-900">
              <tr className="text-left text-[10px] text-slate-500 uppercase">
                <th className="px-4 py-2">Invoice ID</th>
                <th className="px-4 py-2">Reference</th>
                <th className="px-4 py-2">Email</th>
                <th className="px-4 py-2">Amount</th>
                <th className="px-4 py-2">Type</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Date</th>
              </tr>
            </thead>
            <tbody>
              {invoices?.map((invoice: any) => (
                <tr key={invoice.id} className="border-t border-slate-800 hover:bg-slate-800/50">
                  <td className="px-4 py-2 text-xs font-mono">{invoice.invoiceId}</td>
                  <td className="px-4 py-2 text-xs font-mono">{invoice.reference}</td>
                  <td className="px-4 py-2 text-xs text-slate-400">{invoice.email}</td>
                  <td className="px-4 py-2 text-xs font-medium">{formatAmount(invoice.amount)}</td>
                  <td className="px-4 py-2 text-xs text-slate-400 capitalize">{invoice.type.replace(/_/g, ' ')}</td>
                  <td className="px-4 py-2">
                    <span className={`px-2 py-0.5 text-[10px] rounded-full ${getStatusColor(invoice.status)}`}>
                      {invoice.status}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-xs text-slate-400">{formatDate(invoice.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {(!invoices || invoices.length === 0) && (
            <div className="p-8 text-center text-sm text-slate-500">No invoices found</div>
          )}
        </div>
      </div>
    </div>
  )
}
