import { useSuspenseQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { api } from '../../../../convex/_generated/api'
import { StatCard, formatNgN } from './shared'

// ─── ANALYTICS TAB ────────────────────────────────────────────

export function AnalyticsTab({ adminToken }: { adminToken: string }) {
  const { data: overview } = useSuspenseQuery(convexQuery(api.revenue_outcomes.getAnalyticsOverview, adminToken ? { adminToken } : 'skip'))
  const { data: metrics } = useSuspenseQuery(convexQuery(api.revenue_outcomes.getAllAgentMetrics, adminToken ? { adminToken } : 'skip'))

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon="🤖" value={overview?.totalAgents ?? 0} label="Total Agents" color="from-blue-500/20 to-blue-600/10" />
        <StatCard icon="🔍" value={overview?.totalQueries ?? 0} label="Total Queries" color="from-orange-500/20 to-orange-600/10" />
        <StatCard icon="💰" value={formatNgN(overview?.totalRevenue ?? 0)} label="Revenue" color="from-emerald-500/20 to-emerald-600/10" />
        <StatCard icon="😊" value={(overview?.avgSatisfaction ?? 0).toFixed(1)} label="Avg Satisfaction" color="from-purple-500/20 to-purple-600/10" />
      </div>

      <div>
        <h3 className="text-lg font-bold text-white mb-3">Per-Agent Metrics</h3>
        <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
          <div className="grid grid-cols-[auto_1fr_1fr_1fr_1fr] px-5 py-3 border-b border-white/5 text-sm text-slate-400 font-medium">
            <div>Agent</div>
            <div>Queries</div>
            <div>Resolution</div>
            <div>Revenue</div>
            <div>Satisfaction</div>
          </div>
          {(metrics ?? []).map((m: any) => (
            <div key={m._id} className="grid grid-cols-[auto_1fr_1fr_1fr_1fr] px-5 py-3 border-b border-white/5 hover:bg-white/5 transition-colors text-sm">
              <div className="text-white font-medium">{m.agentId}</div>
              <div className="text-slate-300">{m.totalQueries ?? 0}</div>
              <div className="text-slate-300">{m.successfulResolutions ?? 0}</div>
              <div className="text-[#FF6B35] font-bold">{formatNgN(m.revenueGenerated ?? 0)}</div>
              <div className="text-emerald-400">{(m.userSatisfaction ?? 0).toFixed(1)}</div>
            </div>
          ))}
          {(!metrics || metrics.length === 0) && (
            <div className="px-5 py-8 text-center text-slate-500 text-sm">No agent metrics recorded yet</div>
          )}
        </div>
      </div>
    </div>
  )
}
