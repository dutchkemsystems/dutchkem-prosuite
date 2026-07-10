import { useState, useEffect } from 'react'
import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'

interface PaymentAnalyticsPanelProps {
  adminToken: string
}

export function PaymentAnalyticsPanel({ adminToken }: PaymentAnalyticsPanelProps) {
  const [period, setPeriod] = useState(30)
  const [activeTab, setActiveTab] = useState<'overview' | 'transactions' | 'customers' | 'trends'>('overview')

  const revenue = useQuery(api.payment_analytics.getRevenueSummary, { days: period, adminToken })
  const transactions = useQuery(api.payment_analytics.getTransactionHistory, { limit: 50, adminToken })
  const trends = useQuery(api.payment_analytics.getPaymentTrends, { days: period, adminToken })
  const topCustomers = useQuery(api.payment_analytics.getTopCustomers, { limit: 10, adminToken })
  const conversion = useQuery(api.payment_analytics.getConversionRate, { days: period, adminToken })

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
      case 'pending': return 'bg-amber-500/20 text-amber-400'
      case 'failed': return 'bg-red-500/20 text-red-400'
      default: return 'bg-slate-500/20 text-slate-400'
    }
  }

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'transactions', label: 'Transactions' },
    { id: 'customers', label: 'Top Customers' },
    { id: 'trends', label: 'Trends' },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black">Payment Analytics</h2>
          <p className="text-xs text-slate-400 mt-1">Revenue tracking and transaction insights</p>
        </div>
        <select
          value={period}
          onChange={(e) => setPeriod(Number(e.target.value))}
          className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm"
        >
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
          <option value={365}>Last year</option>
        </select>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-800 pb-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              activeTab === tab.id
                ? 'bg-blue-600 text-white'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && revenue && (
        <div className="space-y-6">
          {/* Revenue Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
              <p className="text-2xl font-black text-emerald-400">{formatAmount(revenue.totalRevenue)}</p>
              <p className="text-[10px] text-slate-500 uppercase">Total Revenue</p>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
              <p className="text-2xl font-black text-white">{revenue.successfulPayments}</p>
              <p className="text-[10px] text-slate-500 uppercase">Successful Payments</p>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
              <p className="text-2xl font-black text-amber-400">{revenue.pendingPayments}</p>
              <p className="text-[10px] text-slate-500 uppercase">Pending</p>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
              <p className="text-2xl font-black text-red-400">{revenue.failedPayments}</p>
              <p className="text-[10px] text-slate-500 uppercase">Failed</p>
            </div>
          </div>

          {/* Success Rate & Conversion */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
              <p className="text-3xl font-black text-emerald-400">{revenue.successRate}%</p>
              <p className="text-[10px] text-slate-500 uppercase">Success Rate</p>
              <div className="mt-2 h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full"
                  style={{ width: `${revenue.successRate}%` }}
                />
              </div>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
              <p className="text-3xl font-black text-blue-400">{conversion?.overall || 0}%</p>
              <p className="text-[10px] text-slate-500 uppercase">Conversion Rate</p>
              <div className="mt-2 h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full"
                  style={{ width: `${conversion?.overall || 0}%` }}
                />
              </div>
            </div>
          </div>

          {/* Revenue by Type */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
            <h3 className="text-sm font-bold mb-3">Revenue by Type</h3>
            <div className="space-y-3">
              {Object.entries(revenue.revenueByType).map(([type, amount]) => (
                <div key={type} className="flex items-center justify-between">
                  <span className="text-xs text-slate-400 capitalize">{type.replace(/_/g, ' ')}</span>
                  <span className="text-sm font-medium">{formatAmount(amount as number)}</span>
                </div>
              ))}
              {Object.keys(revenue.revenueByType).length === 0 && (
                <p className="text-xs text-slate-500">No revenue data yet</p>
              )}
            </div>
          </div>

          {/* Average Transaction */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
            <p className="text-sm text-slate-400">Average Transaction Value</p>
            <p className="text-2xl font-black text-white mt-1">{formatAmount(revenue.averageTransactionValue)}</p>
          </div>
        </div>
      )}

      {/* Transactions Tab */}
      {activeTab === 'transactions' && transactions && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto max-h-96 overflow-y-auto">
            <table className="w-full">
              <thead className="sticky top-0 bg-slate-900">
                <tr className="text-left text-[10px] text-slate-500 uppercase">
                  <th className="px-4 py-2">Reference</th>
                  <th className="px-4 py-2">Type</th>
                  <th className="px-4 py-2">Amount</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2">Email</th>
                  <th className="px-4 py-2">Date</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx: any) => (
                  <tr key={tx.id} className="border-t border-slate-800 hover:bg-slate-800/50">
                    <td className="px-4 py-2 text-xs font-mono">{tx.reference}</td>
                    <td className="px-4 py-2 text-xs text-slate-400 capitalize">{tx.type.replace(/_/g, ' ')}</td>
                    <td className="px-4 py-2 text-xs font-medium">{formatAmount(tx.amount)}</td>
                    <td className="px-4 py-2">
                      <span className={`px-2 py-0.5 text-[10px] rounded-full ${getStatusColor(tx.status)}`}>
                        {tx.status}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-xs text-slate-400">{tx.email || '-'}</td>
                    <td className="px-4 py-2 text-xs text-slate-400">{formatDate(tx.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {transactions.length === 0 && (
              <div className="p-8 text-center text-sm text-slate-500">No transactions found</div>
            )}
          </div>
        </div>
      )}

      {/* Top Customers Tab */}
      {activeTab === 'customers' && topCustomers && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-slate-800">
            <h3 className="text-sm font-bold">Top Customers by Revenue</h3>
          </div>
          <div className="divide-y divide-slate-800">
            {topCustomers.map((customer: any, idx: number) => (
              <div key={customer.email} className="px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-slate-500">#{idx + 1}</span>
                  <div>
                    <p className="text-sm font-medium">{customer.email}</p>
                    <p className="text-[10px] text-slate-500">{customer.transactionCount} transactions</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-emerald-400">{formatAmount(customer.totalSpent)}</p>
                  <p className="text-[10px] text-slate-500">Last: {formatDate(customer.lastPurchase)}</p>
                </div>
              </div>
            ))}
            {topCustomers.length === 0 && (
              <div className="p-8 text-center text-sm text-slate-500">No customer data yet</div>
            )}
          </div>
        </div>
      )}

      {/* Trends Tab */}
      {activeTab === 'trends' && trends && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <h3 className="text-sm font-bold mb-4">Daily Revenue Trend</h3>
          <div className="h-64 flex items-end gap-1">
            {trends.map((day: any) => {
              const maxRevenue = Math.max(...trends.map((d: any) => d.revenue));
              const height = maxRevenue > 0 ? (day.revenue / maxRevenue) * 100 : 0;
              return (
                <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full bg-blue-500/20 rounded-t" style={{ height: `${Math.max(height, 2)}%` }}>
                    <div className="w-full bg-blue-500 rounded-t" style={{ height: `${height}%` }} />
                  </div>
                  <span className="text-[8px] text-slate-500 rotate-45">{day.date.slice(5)}</span>
                </div>
              )
            })}
          </div>
          <div className="mt-4 grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-lg font-bold">{trends.reduce((sum: number, d: any) => sum + d.count, 0)}</p>
              <p className="text-[10px] text-slate-500">Total Transactions</p>
            </div>
            <div>
              <p className="text-lg font-bold text-emerald-400">{formatAmount(trends.reduce((sum: number, d: any) => sum + d.revenue, 0))}</p>
              <p className="text-[10px] text-slate-500">Total Revenue</p>
            </div>
            <div>
              <p className="text-lg font-bold">{Math.round(trends.reduce((sum: number, d: any) => sum + d.count, 0) / trends.length)}</p>
              <p className="text-[10px] text-slate-500">Avg Daily Txns</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
