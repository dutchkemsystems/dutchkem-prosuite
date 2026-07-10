import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'

export function PredictiveAnalyticsPanel() {
  const churn: any = useQuery(api.predictive_analytics.predictChurnRisk, { days: 30 })
  const revenue: any = useQuery(api.predictive_analytics.predictRevenue, { months: 6 })
  const summary: any = useQuery(api.predictive_analytics.getAnalyticsSummary)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-black">🔮 Predictive Analytics</h2>
        <p className="text-xs text-slate-400 mt-1">ML-powered predictions for churn, revenue, and behavior — $350K/year potential</p>
      </div>

      {/* Summary */}
      {summary && (
        <div className="grid grid-cols-4 gap-3">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
            <p className="text-2xl font-black text-orange-400">{summary.totalInteractions}</p>
            <p className="text-[10px] text-slate-500 uppercase">Interactions</p>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
            <p className="text-2xl font-black text-red-400">{summary.totalEscalations}</p>
            <p className="text-[10px] text-slate-500 uppercase">Escalations</p>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
            <p className="text-2xl font-black text-blue-400">{summary.avgResponseTime}ms</p>
            <p className="text-[10px] text-slate-500 uppercase">Avg Response</p>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
            <p className="text-2xl font-black text-emerald-400">{summary.confidenceCounts.high}</p>
            <p className="text-[10px] text-slate-500 uppercase">High Confidence</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Churn Risk */}
        {churn && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <h3 className="text-sm font-black text-white mb-3">⚠️ Churn Risk</h3>
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="bg-red-500/10 rounded-xl p-3 text-center">
                <p className="text-lg font-black text-red-400">{churn.summary.highRisk}</p>
                <p className="text-[9px] text-slate-500">High Risk</p>
              </div>
              <div className="bg-yellow-500/10 rounded-xl p-3 text-center">
                <p className="text-lg font-black text-yellow-400">{churn.summary.mediumRisk}</p>
                <p className="text-[9px] text-slate-500">Medium Risk</p>
              </div>
              <div className="bg-emerald-500/10 rounded-xl p-3 text-center">
                <p className="text-lg font-black text-emerald-400">{churn.summary.lowRisk}</p>
                <p className="text-[9px] text-slate-500">Low Risk</p>
              </div>
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {churn.predictions.slice(0, 10).map((p: any) => (
                <div key={p.userId} className="flex items-center justify-between bg-slate-800 rounded-lg px-3 py-2">
                  <span className="text-[10px] text-slate-400">{p.userId.slice(0, 12)}...</span>
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{
                        width: `${p.riskScore}%`,
                        backgroundColor: p.riskLevel === 'high' ? '#ef4444' : p.riskLevel === 'medium' ? '#f59e0b' : '#10b981',
                      }} />
                    </div>
                    <span className="text-[10px] font-bold text-white w-8 text-right">{p.riskScore}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Revenue Forecast */}
        {revenue && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <h3 className="text-sm font-black text-white mb-3">📈 Revenue Forecast</h3>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-slate-800 rounded-xl p-3 text-center">
                <p className="text-lg font-black text-emerald-400">₦{(revenue.currentMRR || 0).toLocaleString()}</p>
                <p className="text-[9px] text-slate-500">Current MRR</p>
              </div>
              <div className="bg-slate-800 rounded-xl p-3 text-center">
                <p className="text-lg font-black text-blue-400">{revenue.growthRate || 0}%</p>
                <p className="text-[9px] text-slate-500">Growth Rate</p>
              </div>
            </div>
            <div className="space-y-2">
              {(revenue.forecast || []).map((f: any) => (
                <div key={f.month} className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-400">Month {f.month}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full"
                        style={{ width: `${Math.min((f.projected / ((revenue.forecast || [{}])[5]?.projected || 1)) * 100, 100)}%` }} />
                    </div>
                    <span className="text-[10px] font-bold text-white w-20 text-right">₦{f.projected.toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
