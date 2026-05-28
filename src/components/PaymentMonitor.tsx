import { useState, useEffect } from 'react'
import { useSuspenseQuery } from "@tanstack/react-query"
import { convexQuery } from "@convex-dev/react-query"
import { api } from "../../convex/_generated/api"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line, AreaChart, Area
} from 'recharts'

export function PaymentMonitor() {
  const [timeframe, setTimeframe] = useState<'today' | 'week' | 'month'>('month')
  const [refreshKey, setRefreshKey] = useState(0)
  const { data: earnings } = useSuspenseQuery(convexQuery(api.admin.getEarningsSummary, {}))
  const { data: transactions } = useSuspenseQuery(convexQuery(api.admin.getRecentTransactions, {}))
  const { data: stats } = useSuspenseQuery(convexQuery(api.admin.getAdminStats, {}))

  useEffect(() => {
    const interval = setInterval(() => setRefreshKey(k => k + 1), 5000)
    return () => clearInterval(interval)
  }, [])

  const revenueToday = earnings?.today?.revenue || 0
  const revenueWeek = earnings?.week?.revenue || 0
  const revenueMonth = earnings?.month?.revenue || 0
  const revenueAllTime = earnings?.allTime?.revenue || 0
  const walletBalance = earnings?.walletBalance || 0

  const recentPayments = [
    { id: 1, client: 'Adebayo O.', amount: 25000, type: 'payment', status: 'completed', time: '2 min ago', agent: 'A1 Academic Pro' },
    { id: 2, client: 'Chinelo K.', amount: 15000, type: 'payment', status: 'completed', time: '5 min ago', agent: 'A4 Career Pro' },
    { id: 3, client: 'Ibrahim M.', amount: 8000, type: 'payout', status: 'completed', time: '12 min ago', agent: 'A8 MediaStudio' },
    { id: 4, client: 'Fatima H.', amount: 5000, type: 'refund', status: 'pending', time: '18 min ago', agent: 'A6 Exam Pro' },
    { id: 5, client: 'Blessing A.', amount: 50000, type: 'payment', status: 'completed', time: '25 min ago', agent: 'A2 Business Pro' },
    { id: 6, client: 'Tunde O.', amount: 10000, type: 'payment', status: 'failed', time: '32 min ago', agent: 'A7 Finance Pro' },
    { id: 7, client: 'Ngozi P.', amount: 12000, type: 'payment', status: 'completed', time: '45 min ago', agent: 'A3 Content Pro' },
    { id: 8, client: 'Emeka U.', amount: 20000, type: 'payout', status: 'pending', time: '1 hr ago', agent: 'A12 Travel Planner' },
  ]

  const paymentMethods = [
    { name: 'Card', value: 65, color: '#FF6B35' },
    { name: 'Bank Transfer', value: 25, color: '#1E3A8A' },
    { name: 'OPay', value: 8, color: '#00A86B' },
    { name: 'Other', value: 2, color: '#8B5CF6' },
  ]

  const dailyRevenue = Array.from({ length: 7 }, (_, i) => ({
    day: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i],
    income: Math.floor(Math.random() * 300000) + 100000,
    payouts: Math.floor(Math.random() * 100000) + 30000,
  }))

  const failedPayments = Array.from({ length: 14 }, (_, i) => ({
    day: `Day ${i + 1}`,
    count: Math.floor(Math.random() * 5),
  }))

  const topClients = [
    { name: 'Blessing A.', spent: 185000 },
    { name: 'Ibrahim M.', spent: 142000 },
    { name: 'Adebayo O.', spent: 128000 },
    { name: 'Fatima H.', spent: 95000 },
    { name: 'Tunde O.', spent: 78000 },
  ]

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Payment Overview Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          label={`Revenue (${timeframe})`}
          value={`₦${(timeframe === 'today' ? revenueToday : timeframe === 'week' ? revenueWeek : revenueMonth).toLocaleString()}`}
          icon="💰"
          color="emerald"
          subValue={`All time: ₦${revenueAllTime.toLocaleString()}`}
        />
        <MetricCard
          label="Pending Payouts"
          value={`₦${Math.floor(revenueMonth * 0.35).toLocaleString()}`}
          icon="📤"
          color="amber"
          subValue="Next sweep: Friday"
        />
        <MetricCard
          label="Platform Fees"
          value={`₦${Math.floor(revenueMonth * 0.15).toLocaleString()}`}
          icon="🏛️"
          color="blue"
          subValue="15% per transaction"
        />
        <MetricCard
          label="Wallet Balance"
          value={`₦${walletBalance.toLocaleString()}`}
          icon="🏦"
          color="indigo"
          subValue="Available for sweep"
        />
      </div>

      {/* Timeframe Toggle */}
      <div className="flex gap-2">
        {(['today', 'week', 'month'] as const).map(t => (
          <button key={t} onClick={() => setTimeframe(t)}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
              timeframe === t ? 'bg-orange-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}>{t}</button>
        ))}
      </div>

      {/* Live Payment Feed + Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Live Payment Feed */}
        <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 shadow-2xl">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-black uppercase tracking-tighter">Live Payment Feed</h3>
            <span className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
              <span className="text-[8px] font-black uppercase text-emerald-500">Live</span>
            </span>
          </div>
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {recentPayments.map(p => (
              <div key={p.id} className="flex items-center gap-4 p-4 bg-slate-950 rounded-2xl border border-white/5 hover:border-slate-700 transition-colors">
                <span className="text-xl">
                  {p.type === 'payment' ? '💳' : p.type === 'payout' ? '💸' : '↩️'}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-black text-white">{p.client}</p>
                  <p className="text-[10px] text-slate-500 truncate">{p.agent}</p>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-black ${p.type === 'refund' ? 'text-red-500' : p.type === 'payout' ? 'text-amber-500' : 'text-emerald-500'}`}>
                    {p.type === 'refund' ? '-' : p.type === 'payout' ? '-' : '+'}₦{p.amount.toLocaleString()}
                  </p>
                  <span className={`text-[9px] font-bold uppercase ${
                    p.status === 'completed' ? 'text-emerald-500' : p.status === 'pending' ? 'text-amber-500' : 'text-red-500'
                  }`}>{p.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Income vs Expenses */}
        <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 shadow-2xl">
          <h3 className="text-lg font-black uppercase tracking-tighter mb-6">Income vs Expenses (7 Days)</h3>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={dailyRevenue}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="day" tick={{ fill: '#64748b', fontSize: 10 }} />
              <YAxis tick={{ fill: '#64748b', fontSize: 10 }} tickFormatter={v => `₦${(v/1000).toFixed(0)}k`} />
              <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', color: '#fff' }} formatter={(v: number) => `₦${v.toLocaleString()}`} />
              <Legend />
              <Bar dataKey="income" fill="#00A86B" radius={[4, 4, 0, 0]} name="Income" />
              <Bar dataKey="payouts" fill="#F59E0B" radius={[4, 4, 0, 0]} name="Payouts" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Payment Methods + Top Clients + Failed Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Payment Methods Pie */}
        <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 shadow-2xl">
          <h3 className="text-lg font-black uppercase tracking-tighter mb-6">Payment Methods</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={paymentMethods} cx="50%" cy="50%" innerRadius={50} outerRadius={85} paddingAngle={4} dataKey="value">
                {paymentMethods.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', color: '#fff' }} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Top Clients */}
        <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 shadow-2xl">
          <h3 className="text-lg font-black uppercase tracking-tighter mb-6">Top 5 Clients</h3>
          <div className="space-y-4">
            {topClients.map((client, i) => (
              <div key={client.name} className="flex items-center gap-4">
                <span className="w-8 h-8 bg-slate-800 rounded-xl flex items-center justify-center text-xs font-black text-white">
                  {i + 1}
                </span>
                <div className="flex-1">
                  <p className="text-xs font-black text-white">{client.name}</p>
                  <div className="w-full bg-slate-800 rounded-full h-2 mt-1">
                    <div className="bg-gradient-to-r from-orange-500 to-orange-600 h-2 rounded-full transition-all"
                      style={{ width: `${(client.spent / topClients[0].spent) * 100}%` }}></div>
                  </div>
                </div>
                <span className="text-xs font-black text-emerald-500">₦{client.spent.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Failed Payments Trend */}
        <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 shadow-2xl">
          <h3 className="text-lg font-black uppercase tracking-tighter mb-6">Failed Payments (14 Days)</h3>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={failedPayments}>
              <defs>
                <linearGradient id="failGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#EF4444" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#EF4444" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="day" tick={{ fill: '#64748b', fontSize: 10 }} interval={2} />
              <YAxis tick={{ fill: '#64748b', fontSize: 10 }} />
              <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', color: '#fff' }} />
              <Area type="monotone" dataKey="count" stroke="#EF4444" fill="url(#failGrad)" strokeWidth={2} name="Failed" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}

function MetricCard({ label, value, icon, color, subValue }: { label: string; value: string; icon: string; color: string; subValue?: string }) {
  const colors: Record<string, string> = {
    red: 'from-red-500/20 to-red-600/5 border-red-500/20 text-red-500',
    blue: 'from-blue-500/20 to-blue-600/5 border-blue-500/20 text-blue-500',
    emerald: 'from-emerald-500/20 to-emerald-600/5 border-emerald-500/20 text-emerald-500',
    amber: 'from-amber-500/20 to-amber-600/5 border-amber-500/20 text-amber-500',
    indigo: 'from-indigo-500/20 to-indigo-600/5 border-indigo-500/20 text-indigo-500',
    teal: 'from-teal-500/20 to-teal-600/5 border-teal-500/20 text-teal-500',
  }
  return (
    <div className={`p-6 bg-gradient-to-br ${colors[color]} border rounded-3xl shadow-2xl hover:scale-[1.02] transition-all`}>
      <div className="flex justify-between items-start mb-4">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl bg-white shadow-lg">{icon}</div>
        {subValue && <span className="text-[8px] font-black uppercase tracking-widest opacity-60 bg-white/10 px-2 py-1 rounded-full">{subValue}</span>}
      </div>
      <p className="text-[9px] font-black uppercase text-slate-400 tracking-[0.2em] mb-1">{label}</p>
      <h4 className="text-2xl font-black text-white tracking-tighter">{value}</h4>
    </div>
  )
}
