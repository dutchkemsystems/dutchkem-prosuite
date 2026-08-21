import { useSuspenseQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { api } from '../../../../convex/_generated/api'
import { StatCard, formatNgN, formatDate } from './shared'

// ─── CREDITS TAB ──────────────────────────────────────────────

export function CreditsTab({ adminToken }: { adminToken: string }) {
  const { data: stats } = useSuspenseQuery(convexQuery(api.revenue_credits.getCreditStats, adminToken ? { adminToken } : 'skip'))
  const { data: plans } = useSuspenseQuery(convexQuery(api.revenue_credits.getCreditPlans))
  const { data: costs } = useSuspenseQuery(convexQuery(api.revenue_credits.getCreditCosts))
  const { data: purchases } = useSuspenseQuery(convexQuery(api.revenue_credits.getAllPurchases, adminToken ? { adminToken } : 'skip'))

  const planList = [
    { id: 'starter', name: 'Starter', price: '₦5,000', credits: '500 credits', bonus: '+0 bonus', icon: '🚀' },
    { id: 'pro', name: 'Pro', price: '₦20,000', credits: '2,500 credits', bonus: '+400 bonus', icon: '⚡' },
    { id: 'business', name: 'Business', price: '₦50,000', credits: '7,000 credits', bonus: '+1,500 bonus', icon: '💼' },
    { id: 'enterprise', name: 'Enterprise', price: '₦120,000', credits: '20,000 credits', bonus: '+5,000 bonus', icon: '🏢' },
  ]

  const costEntries = costs ? Object.entries(costs as Record<string, number>) : []

  const actionLabels: Record<string, string> = {
    agent_message: 'Agent Message',
    document_upload: 'Document Upload',
    voice_call_minute: 'Voice Call (min)',
    flyer_generation: 'Flyer Generation',
    social_post: 'Social Post',
    research_task: 'Research Task',
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon="👥" value={stats?.totalUsers ?? 0} label="Total Users" color="from-orange-500/20 to-orange-600/10" />
        <StatCard icon="💰" value={stats?.totalPurchased ?? 0} label="Total Purchased" color="from-blue-500/20 to-blue-600/10" />
        <StatCard icon="📉" value={stats?.totalUsed ?? 0} label="Total Used" color="from-emerald-500/20 to-emerald-600/10" />
        <StatCard icon="🔄" value={formatNgN(stats?.recentPurchases ?? 0)} label="30-Day Spend" color="from-purple-500/20 to-purple-600/10" />
      </div>

      <div>
        <h3 className="text-lg font-bold text-white mb-3">Credit Plans</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {planList.map((plan) => (
            <div key={plan.id} className="bg-white/5 border border-white/10 rounded-2xl p-5 hover:border-white/20 transition-all">
              <span className="text-2xl">{plan.icon}</span>
              <div className="text-xl font-bold text-white mt-3">{plan.name}</div>
              <div className="text-[#FF6B35] font-black text-lg mt-1">{plan.price}</div>
              <div className="text-sm text-slate-400 mt-1">{plan.credits}</div>
              <div className="text-xs text-emerald-400 mt-1">{plan.bonus}</div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-lg font-bold text-white mb-3">Credit Costs</h3>
        <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
          <div className="grid grid-cols-[1fr_auto] px-5 py-3 border-b border-white/5 text-sm text-slate-400 font-medium">
            <div>Action</div>
            <div>Credits</div>
          </div>
          {costEntries.map(([action, credits]: [string, number]) => (
            <div key={action} className="grid grid-cols-[1fr_auto] px-5 py-3 border-b border-white/5 hover:bg-white/5 transition-colors">
              <div className="text-white text-sm">{actionLabels[action] ?? action}</div>
              <div className="text-[#FF6B35] font-bold text-sm">{credits}</div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-lg font-bold text-white mb-3">Recent Purchases</h3>
        <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
          <div className="grid grid-cols-[1fr_auto_auto_auto] px-5 py-3 border-b border-white/5 text-sm text-slate-400 font-medium">
            <div>User</div>
            <div>Plan</div>
            <div>Credits</div>
            <div>Date</div>
          </div>
          {(purchases ?? []).slice(0, 20).map((p: any, i: number) => (
            <div key={p._id ?? i} className="grid grid-cols-[1fr_auto_auto_auto] px-5 py-3 border-b border-white/5 hover:bg-white/5 transition-colors text-sm">
              <div className="text-white truncate max-w-[160px]">{p.userId}</div>
              <div className="text-slate-300">{p.priceNgN ? formatNgN(p.priceNgN) : '—'}</div>
              <div className="text-[#FF6B35] font-bold">{p.amount ?? '—'}</div>
              <div className="text-slate-400">{p.createdAt ? formatDate(p.createdAt) : '—'}</div>
            </div>
          ))}
          {(!purchases || purchases.length === 0) && (
            <div className="px-5 py-8 text-center text-slate-500 text-sm">No purchases yet</div>
          )}
        </div>
      </div>
    </div>
  )
}
