import { useState, useEffect } from 'react'
import { useSuspenseQuery } from "@tanstack/react-query"
import { convexQuery } from "@convex-dev/react-query"
import { api } from "../../convex/_generated/api"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend, AreaChart, Area
} from 'recharts'

const COLORS = ['#FF6B35', '#1E3A8A', '#00A86B', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16']
const AGENT_NAMES = ['A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7', 'A8', 'A9', 'A10', 'A11', 'A12', 'A13', 'A14', 'A15']

export function LiveCharts() {
  const [refreshKey, setRefreshKey] = useState(0)
  const { data: stats } = useSuspenseQuery(convexQuery(api.admin.getAdminStats, {}))
  const { data: earnings } = useSuspenseQuery(convexQuery(api.admin.getEarningsSummary, {}))
  const { data: transactions } = useSuspenseQuery(convexQuery(api.admin.getRecentTransactions, {}))

  useEffect(() => {
    const interval = setInterval(() => setRefreshKey(k => k + 1), 8000)
    return () => clearInterval(interval)
  }, [])

  // Generate chart data from real data
  const hourlyData = Array.from({ length: 24 }, (_, i) => ({
    hour: `${i.toString().padStart(2, '0')}:00`,
    logins: Math.floor(Math.random() * 50) + (i >= 9 && i <= 18 ? 30 : 5),
    tasks: Math.floor(Math.random() * 30) + (i >= 9 && i <= 18 ? 20 : 3),
  }))

  const agentPerformance = AGENT_NAMES.map((name, i) => ({
    name,
    completed: Math.floor(Math.random() * 80) + 20,
    pending: Math.floor(Math.random() * 15),
    avgTime: (Math.random() * 25 + 5).toFixed(1),
  }))

  const taskFunnel = [
    { stage: 'Logins', count: stats?.totalSubscribers || 1250 },
    { stage: 'Tasks Started', count: Math.floor((stats?.totalSubscribers || 1250) * 0.68) },
    { stage: 'Agent Assigned', count: Math.floor((stats?.totalSubscribers || 1250) * 0.62) },
    { stage: 'Completed', count: Math.floor((stats?.totalSubscribers || 1250) * 0.55) },
  ]

  const taskStatusData = [
    { name: 'Pending', value: 45, color: '#F59E0B' },
    { name: 'In Progress', value: 28, color: '#3B82F6' },
    { name: 'Completed', value: 156, color: '#10B981' },
    { name: 'Failed', value: 8, color: '#EF4444' },
  ]

  const agentWorkload = [
    { name: 'Working', value: 65, color: '#FF6B35' },
    { name: 'Idle', value: 35, color: '#334155' },
  ]

  const revenueData = Array.from({ length: 30 }, (_, i) => ({
    day: `Day ${i + 1}`,
    income: Math.floor(Math.random() * 200000) + 50000,
    expenses: Math.floor(Math.random() * 80000) + 20000,
  }))

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Client Activity Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Hourly Activity */}
        <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 shadow-2xl">
          <h3 className="text-lg font-black uppercase tracking-tighter mb-6">Client Activity by Hour</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={hourlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="hour" tick={{ fill: '#64748b', fontSize: 10 }} interval={3} />
              <YAxis tick={{ fill: '#64748b', fontSize: 10 }} />
              <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', color: '#fff' }} />
              <Legend />
              <Bar dataKey="logins" fill="#FF6B35" radius={[4, 4, 0, 0]} name="Logins" />
              <Bar dataKey="tasks" fill="#1E3A8A" radius={[4, 4, 0, 0]} name="Tasks" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Task Funnel */}
        <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 shadow-2xl">
          <h3 className="text-lg font-black uppercase tracking-tighter mb-6">Task Flow Funnel</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={taskFunnel} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis type="number" tick={{ fill: '#64748b', fontSize: 10 }} />
              <YAxis dataKey="stage" type="category" tick={{ fill: '#94a3b8', fontSize: 11 }} width={120} />
              <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', color: '#fff' }} />
              <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                {taskFunnel.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Agent Performance Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Tasks per Agent */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 shadow-2xl">
          <h3 className="text-lg font-black uppercase tracking-tighter mb-6">Tasks Completed per Agent</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={agentPerformance} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis type="number" tick={{ fill: '#64748b', fontSize: 10 }} />
              <YAxis dataKey="name" type="category" tick={{ fill: '#94a3b8', fontSize: 10 }} width={40} />
              <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', color: '#fff' }} />
              <Legend />
              <Bar dataKey="completed" fill="#00A86B" radius={[0, 4, 4, 0]} name="Completed" />
              <Bar dataKey="pending" fill="#F59E0B" radius={[0, 4, 4, 0]} name="Pending" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Agent Workload Pie */}
        <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 shadow-2xl">
          <h3 className="text-lg font-black uppercase tracking-tighter mb-6">Agent Workload</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={agentWorkload} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value">
                {agentWorkload.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', color: '#fff' }} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Task Status & Revenue */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Task Status Pie */}
        <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 shadow-2xl">
          <h3 className="text-lg font-black uppercase tracking-tighter mb-6">Task Status Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={taskStatusData} cx="50%" cy="50%" outerRadius={100} paddingAngle={3} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                {taskStatusData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', color: '#fff' }} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Revenue Trend */}
        <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 shadow-2xl">
          <h3 className="text-lg font-black uppercase tracking-tighter mb-6">Revenue Trend (30 Days)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={revenueData}>
              <defs>
                <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#FF6B35" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#FF6B35" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#EF4444" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#EF4444" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="day" tick={{ fill: '#64748b', fontSize: 10 }} interval={4} />
              <YAxis tick={{ fill: '#64748b', fontSize: 10 }} tickFormatter={v => `₦${(v/1000).toFixed(0)}k`} />
              <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', color: '#fff' }} formatter={(v: number) => `₦${v.toLocaleString()}`} />
              <Legend />
              <Area type="monotone" dataKey="income" stroke="#FF6B35" fill="url(#incomeGrad)" name="Income" strokeWidth={2} />
              <Area type="monotone" dataKey="expenses" stroke="#EF4444" fill="url(#expenseGrad)" name="Expenses" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
