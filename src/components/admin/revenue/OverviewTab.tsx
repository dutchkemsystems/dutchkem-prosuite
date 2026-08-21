import { useSuspenseQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { api } from '../../../../convex/_generated/api'
import { StatCard, formatNgN } from './shared'

// ─── OVERVIEW TAB ─────────────────────────────────────────────

export function OverviewTab({ adminToken }: { adminToken: string }) {
  const { data: creditStats } = useSuspenseQuery(convexQuery(api.revenue_credits.getCreditStats, adminToken ? { adminToken } : 'skip'))
  const { data: socialStats } = useSuspenseQuery(convexQuery(api.revenue_social.getConversationStats, adminToken ? { adminToken } : 'skip'))
  const { data: listingStats } = useSuspenseQuery(convexQuery(api.revenue_marketplace.getListingStats, adminToken ? { adminToken } : 'skip'))
  const { data: outcomeStats } = useSuspenseQuery(convexQuery(api.revenue_outcomes.getOutcomeStats, adminToken ? { adminToken } : 'skip'))
  const { data: whiteLabelStats } = useSuspenseQuery(convexQuery(api.revenue_outcomes.getWhiteLabelStats, adminToken ? { adminToken } : 'skip'))
  const { data: analyticsOverview } = useSuspenseQuery(convexQuery(api.revenue_outcomes.getAnalyticsOverview, adminToken ? { adminToken } : 'skip'))
  const { data: consultingStats } = useSuspenseQuery(convexQuery(api.revenue_outcomes.getConsultingStats, adminToken ? { adminToken } : 'skip'))
  const { data: apiKeys } = useSuspenseQuery(convexQuery(api.revenue_outcomes.getApiKeys, adminToken ? { adminToken } : 'skip'))

  const creditSales = creditStats?.recentPurchases ?? 0
  const marketplaceSales = listingStats?.totalRevenue ?? 0
  const whiteLabelClients = whiteLabelStats?.activeClients ?? 0
  const consultingRevenue = consultingStats?.totalRevenue ?? 0
  const apiUsers = (apiKeys ?? []).length
  const socialRevenue = socialStats?.totalRevenue ?? 0

  const totalMRR = (marketplaceSales + consultingRevenue + socialRevenue + (whiteLabelStats?.totalMonthlyRevenue ?? 0))

  const statCards = [
    { icon: '💰', value: formatNgN(creditSales), label: 'Credit Sales', color: 'from-orange-500/20 to-orange-600/10' },
    { icon: '🏪', value: formatNgN(marketplaceSales), label: 'Marketplace Sales', color: 'from-blue-500/20 to-blue-600/10' },
    { icon: '🏷️', value: whiteLabelClients, label: 'White Label Clients', color: 'from-purple-500/20 to-purple-600/10' },
    { icon: '👨‍💼', value: formatNgN(consultingRevenue), label: 'Consulting Revenue', color: 'from-emerald-500/20 to-emerald-600/10' },
    { icon: '🔑', value: apiUsers, label: 'API Users', color: 'from-cyan-500/20 to-cyan-600/10' },
    { icon: '📱', value: formatNgN(socialRevenue), label: 'Social Commerce Revenue', color: 'from-pink-500/20 to-pink-600/10' },
  ]

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-br from-[#FF6B35]/20 to-[#FF6B35]/5 border border-[#FF6B35]/30 rounded-2xl p-6">
        <div className="text-sm text-slate-400 mb-1">Total Monthly Recurring Revenue</div>
        <div className="text-4xl font-black text-[#FF6B35]">{formatNgN(totalMRR)}</div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {statCards.map((card) => (
          <StatCard key={card.label} icon={card.icon} value={card.value} label={card.label} color={card.color} />
        ))}
      </div>
    </div>
  )
}
