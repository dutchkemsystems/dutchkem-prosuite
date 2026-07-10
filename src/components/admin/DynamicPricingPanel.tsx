import { useMutation, useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'

export function DynamicPricingPanel() {
  const rules: any = useQuery(api.dynamic_pricing.getPricingRules)
  const states: any = useQuery(api.dynamic_pricing.getEnabledRules)
  const analytics: any = useQuery(api.dynamic_pricing.getPricingAnalytics)
  const toggleRule = useMutation(api.dynamic_pricing.togglePricingRule)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-black">💲 Dynamic Pricing</h2>
        <p className="text-xs text-slate-400 mt-1">AI-powered price optimization — $540K/year potential</p>
      </div>

      {analytics && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
            <p className="text-2xl font-black text-orange-400">{analytics.activeRules}</p>
            <p className="text-[10px] text-slate-500 uppercase">Active Rules</p>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
            <p className="text-2xl font-black text-emerald-400">₦{(analytics.avgDailyRevenue || 0).toLocaleString()}</p>
            <p className="text-[10px] text-slate-500 uppercase">Avg Daily Revenue</p>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
            <p className="text-2xl font-black text-blue-400">₦{(analytics.potentialUplift || 0).toLocaleString()}</p>
            <p className="text-[10px] text-slate-500 uppercase">Potential Uplift</p>
          </div>
        </div>
      )}

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <h3 className="text-sm font-black text-white mb-4">Pricing Rules</h3>
        <div className="space-y-3">
          {(rules || []).map((rule: any) => {
            const enabled = states?.[rule.id] !== false
            return (
              <div key={rule.id} className={`flex items-center justify-between p-4 rounded-xl border ${
                enabled ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-slate-700 bg-slate-800/50'
              }`}>
                <div>
                  <p className="text-sm font-bold text-white">{rule.name}</p>
                  <p className="text-[10px] text-slate-500 mt-1">{rule.description}</p>
                  <p className="text-[10px] text-slate-600 mt-0.5">Adjustment: {rule.adjustment > 1 ? '+' : ''}{Math.round((rule.adjustment - 1) * 100)}%</p>
                </div>
                <button onClick={() => toggleRule({ ruleId: rule.id, enabled: !enabled })}
                  className={`w-12 h-6 rounded-full transition-all relative ${
                    enabled ? 'bg-emerald-500' : 'bg-slate-700'
                  }`}>
                  <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all ${
                    enabled ? 'left-6' : 'left-0.5'
                  }`} />
                </button>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
