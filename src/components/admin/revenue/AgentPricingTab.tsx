import { useState } from 'react'
import { useSuspenseQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { api } from '../../../../convex/_generated/api'
import { StatCard, formatNgN } from './shared'

// ─── AGENT PRICING TAB ────────────────────────────────────────

export function AgentPricingTab({ adminToken }: { adminToken: string }) {
  const { data: tiers } = useSuspenseQuery(convexQuery(api.revenue_growth.getAgentPricingTiers))
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null)

  const agents = ['A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7', 'A8', 'A9', 'A10', 'A11', 'A12', 'A13', 'A14', 'A15']
  const agentNames: Record<string, string> = {
    A1: 'Academic Writer', A2: 'Business Advisor', A3: 'Content Strategist',
    A4: 'Career Coach', A5: 'Personal Shopper', A6: 'Exam Specialist',
    A7: 'Finance Advisor', A8: 'MediaStudio Pro', A9: 'Wellness Coach',
    A10: 'Home Specialist', A11: 'Language Coach', A12: 'Travel Planner',
    A13: 'Exam Success', A14: 'Translation Hub', A15: 'Event Planner',
  }

  const getAgentTiers = (agentId: string) => {
    return (tiers ?? []).filter((t: any) => t.agentId === agentId)
  }

  const tierColors: Record<string, string> = {
    standard: 'from-blue-500/20 to-blue-600/10 border-blue-500/30',
    premium: 'from-orange-500/20 to-orange-600/10 border-orange-500/30',
    enterprise: 'from-purple-500/20 to-purple-600/10 border-purple-500/30',
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon="🤖" value={agents.length} label="Total Agents" color="from-blue-500/20 to-blue-600/10" />
        <StatCard icon="📊" value={(tiers ?? []).length} label="Pricing Tiers" color="from-orange-500/20 to-orange-600/10" />
        <StatCard icon="⭐" value={(tiers ?? []).filter((t: any) => t.tier === 'premium').length} label="Premium Tiers" color="from-emerald-500/20 to-emerald-600/10" />
        <StatCard icon="🏢" value={(tiers ?? []).filter((t: any) => t.tier === 'enterprise').length} label="Enterprise Tiers" color="from-purple-500/20 to-purple-600/10" />
      </div>

      <div>
        <h3 className="text-lg font-bold text-white mb-3">Select Agent</h3>
        <div className="flex flex-wrap gap-2">
          {agents.map((agentId) => (
            <button
              key={agentId}
              onClick={() => setSelectedAgent(selectedAgent === agentId ? null : agentId)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${selectedAgent === agentId ? 'bg-[#FF6B35] text-white' : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'}`}
            >
              {agentId}: {agentNames[agentId]}
            </button>
          ))}
        </div>
      </div>

      {/* Agent Pricing Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {(selectedAgent ? getAgentTiers(selectedAgent) : (tiers ?? []).slice(0, 12)).map((tier: any) => (
          <div key={tier._id} className={`bg-gradient-to-br ${tierColors[tier.tier]} border rounded-2xl p-5 transition-all hover:scale-[1.02]`}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-white/10 text-white uppercase">{tier.tier}</span>
              <span className="text-xs text-slate-400">{tier.agentId}</span>
            </div>
            <h4 className="text-lg font-bold text-white mb-2">{tier.agentName}</h4>
            <div className="text-[#FF6B35] font-black text-2xl mb-3">{formatNgN(tier.monthlyPriceNgn)}<span className="text-xs text-slate-400 font-normal">/mo</span></div>
            <div className="text-sm text-slate-400 mb-3">{tier.creditsPerMessage} credit{tier.creditsPerMessage > 1 ? 's' : ''} per message</div>
            <div className="space-y-1">
              {(tier.features ?? []).map((f: string, i: number) => (
                <div key={i} className="flex items-center gap-2 text-xs text-slate-300">
                  <span className="text-emerald-400">✓</span>
                  <span>{f}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
        {(!tiers || tiers.length === 0) && (
          <div className="col-span-3 text-center py-12 text-slate-500">No agent pricing tiers configured. Call bulkSeedAllRevenueGrowth to seed.</div>
        )}
      </div>

      {/* Pricing Summary Table */}
      {tiers && tiers.length > 0 && (
        <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
          <div className="px-5 py-3 border-b border-white/5 text-sm text-slate-400 font-medium">
            <h3 className="font-bold text-white">Pricing Summary</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="text-left px-5 py-3 text-slate-400 font-medium">Agent</th>
                  <th className="text-right px-5 py-3 text-slate-400 font-medium">Standard</th>
                  <th className="text-right px-5 py-3 text-slate-400 font-medium">Premium</th>
                  <th className="text-right px-5 py-3 text-slate-400 font-medium">Enterprise</th>
                </tr>
              </thead>
              <tbody>
                {agents.map((agentId) => {
                  const agentTiers = getAgentTiers(agentId)
                  const standard = agentTiers.find((t: any) => t.tier === 'standard')
                  const premium = agentTiers.find((t: any) => t.tier === 'premium')
                  const enterprise = agentTiers.find((t: any) => t.tier === 'enterprise')
                  return (
                    <tr key={agentId} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                      <td className="px-5 py-3 text-white">{agentId}: {agentNames[agentId]}</td>
                      <td className="px-5 py-3 text-right text-blue-400 font-bold">{standard ? formatNgN(standard.monthlyPriceNgn) : '—'}</td>
                      <td className="px-5 py-3 text-right text-orange-400 font-bold">{premium ? formatNgN(premium.monthlyPriceNgn) : '—'}</td>
                      <td className="px-5 py-3 text-right text-purple-400 font-bold">{enterprise ? formatNgN(enterprise.monthlyPriceNgn) : '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
