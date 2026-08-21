import { useState } from 'react'
import { useSuspenseQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { api } from '../../../../convex/_generated/api'
import { StatCard, formatNgN } from './shared'

// ─── ENTERPRISE ADD-ONS TAB ───────────────────────────────────

export function EnterpriseAddonsTab({ adminToken }: { adminToken: string }) {
  const { data: addons } = useSuspenseQuery(convexQuery(api.revenue_growth.getEnterpriseAddons))
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  const categories = [
    { id: 'api_access', label: 'API Access', icon: '🔑' },
    { id: 'custom_training', label: 'Custom Training', icon: '📚' },
    { id: 'white_label', label: 'White Label', icon: '🏷️' },
    { id: 'dedicated_support', label: 'Dedicated Support', icon: '👨‍💼' },
    { id: 'custom_integration', label: 'Custom Integration', icon: '🔗' },
  ]

  const filteredAddons = selectedCategory
    ? (addons ?? []).filter((a: any) => a.category === selectedCategory)
    : addons

  const categoryColors: Record<string, string> = {
    api_access: 'from-blue-500/20 to-blue-600/10 border-blue-500/30',
    custom_training: 'from-emerald-500/20 to-emerald-600/10 border-emerald-500/30',
    white_label: 'from-purple-500/20 to-purple-600/10 border-purple-500/30',
    dedicated_support: 'from-orange-500/20 to-orange-600/10 border-orange-500/30',
    custom_integration: 'from-cyan-500/20 to-cyan-600/10 border-cyan-500/30',
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon="🏢" value={(addons ?? []).length} label="Available Add-ons" color="from-blue-500/20 to-blue-600/10" />
        <StatCard icon="💰" value={formatNgN((addons ?? []).reduce((sum: number, a: any) => sum + (a.priceNgn ?? 0), 0))} label="Total Add-on Value" color="from-emerald-500/20 to-emerald-600/10" />
        <StatCard icon="📅" value={(addons ?? []).filter((a: any) => a.billingCycle === 'monthly').length} label="Monthly Add-ons" color="from-orange-500/20 to-orange-600/10" />
        <StatCard icon="🎯" value={(addons ?? []).filter((a: any) => a.billingCycle === 'one_time').length} label="One-time Add-ons" color="from-purple-500/20 to-purple-600/10" />
      </div>

      <div>
        <h3 className="text-lg font-bold text-white mb-3">Filter by Category</h3>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${!selectedCategory ? 'bg-[#FF6B35] text-white' : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'}`}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(selectedCategory === cat.id ? null : cat.id)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${selectedCategory === cat.id ? 'bg-[#FF6B35] text-white' : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'}`}
            >
              {cat.icon} {cat.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {(filteredAddons ?? []).map((addon: any) => (
          <div key={addon._id} className={`bg-gradient-to-br ${categoryColors[addon.category] ?? 'from-slate-500/20 to-slate-600/10 border-slate-500/30'} border rounded-2xl p-6 transition-all hover:scale-[1.02]`}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-white/10 text-white capitalize">{addon.billingCycle.replace('_', ' ')}</span>
              <span className="text-xs text-slate-400">{categories.find((c) => c.id === addon.category)?.icon ?? '📦'}</span>
            </div>
            <h4 className="text-xl font-bold text-white mb-2">{addon.name}</h4>
            <p className="text-sm text-slate-400 mb-4">{addon.description}</p>
            <div className="text-[#FF6B35] font-black text-3xl mb-4">
              {formatNgN(addon.priceNgn)}
              {addon.billingCycle === 'monthly' && <span className="text-xs text-slate-400 font-normal">/mo</span>}
            </div>
            <div className="space-y-1">
              {(addon.features ?? []).map((f: string, i: number) => (
                <div key={i} className="flex items-center gap-2 text-xs text-slate-300">
                  <span className="text-emerald-400">✓</span>
                  <span>{f}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
        {(!filteredAddons || filteredAddons.length === 0) && (
          <div className="col-span-3 text-center py-12 text-slate-500">No enterprise add-ons configured. Call bulkSeedAllRevenueGrowth to seed.</div>
        )}
      </div>
    </div>
  )
}
