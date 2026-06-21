import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'

export function UsageTracker({ userId }: { userId: string }) {
  const usage = useQuery(api.revenue_growth.getUsageTracking, userId ? { userId } : 'skip')
  const expiryConfig = useQuery(api.revenue_growth.getCreditExpiryConfig)
  const expiringCredits = useQuery(api.revenue_growth.getExpiringCredits, userId ? { userId } : 'skip')

  const period = new Date().toISOString().slice(0, 7)

  const usageItems = [
    { key: 'agentMessagesUsed', label: 'Agent Messages', icon: '💬', limit: '100-500/mo' },
    { key: 'documentUploadsUsed', label: 'Document Uploads', icon: '📄', limit: 'Varies' },
    { key: 'voiceMinutesUsed', label: 'Voice Minutes', icon: '🎙️', limit: 'Varies' },
    { key: 'flyerGenerationsUsed', label: 'Flyer Generations', icon: '🎨', limit: 'Varies' },
    { key: 'socialPostsUsed', label: 'Social Posts', icon: '📱', limit: 'Varies' },
    { key: 'researchTasksUsed', label: 'Research Tasks', icon: '🔬', limit: 'Varies' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-black text-white">Usage This Month</h2>
        <p className="text-sm text-slate-400 mt-1">{period} — Track your resource consumption</p>
      </div>

      {/* Expiry Warning */}
      {expiryConfig?.enabled && (expiringCredits?.totalExpiring ?? 0) > 0 && (
        <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl">
          <div className="flex items-center gap-4">
            <span className="text-3xl">⏰</span>
            <div>
              <p className="text-amber-400 font-bold">Credit Expiration Alert</p>
              <p className="text-amber-300/70 text-sm mt-1">
                {expiringCredits!.totalExpiring.toLocaleString()} credits expire in {expiryConfig.warningDays} days. 
                Use them before they expire!
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Usage Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {usageItems.map((item) => {
          const used = (usage as any)?.[item.key] ?? 0
          const percentage = Math.min(100, (used / 100) * 100) // Assume 100 as baseline

          return (
            <div key={item.key} className="bg-white/5 border border-white/10 rounded-2xl p-5 hover:border-white/20 transition-all">
              <div className="flex items-center justify-between mb-3">
                <span className="text-2xl">{item.icon}</span>
                <span className="text-xs text-slate-400">{item.limit}</span>
              </div>
              <h3 className="text-white font-bold text-sm mb-1">{item.label}</h3>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-black text-white">{used}</span>
                <span className="text-sm text-slate-400">used</span>
              </div>
              {/* Progress Bar */}
              <div className="mt-3 h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    percentage > 80 ? 'bg-red-500' : percentage > 50 ? 'bg-amber-500' : 'bg-orange-500'
                  }`}
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>

      {/* Overage Info */}
      {(usage?.overageCharges ?? 0) > 0 && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl">
          <div className="flex items-center gap-4">
            <span className="text-3xl">💸</span>
            <div>
              <p className="text-red-400 font-bold">Overage Charges</p>
              <p className="text-red-300/70 text-sm mt-1">
                You've exceeded your plan limits. Overage charges: ₦{(usage!.overageCharges).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
