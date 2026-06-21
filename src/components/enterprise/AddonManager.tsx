import { useState } from 'react'
import { useQuery, useAction } from 'convex/react'
import { api } from '../../../convex/_generated/api'

function formatNgN(amount: number): string {
  return `₦${amount.toLocaleString()}`
}

export function AddonManager({ orgId, token, email }: { orgId: string; token: string; email?: string }) {
  const addons = useQuery(api.revenue_growth.getEnterpriseAddons)
  const initiateAddonPurchase = useAction(api.kora_checkout.initiateEnterpriseAddonPurchase)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState<string | null>(null)

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

  const handleSubscribe = async (addonId: string, addonName: string) => {
    if (!email) {
      setToast('Email required for payment')
      setTimeout(() => setToast(null), 3000)
      return
    }
    setIsProcessing(addonId)
    try {
      const result = await initiateAddonPurchase({ orgId, addonId, email })
      if (result.success && result.checkoutUrl) {
        window.open(result.checkoutUrl, '_blank')
        setToast(`Payment window opened for ${addonName}. Complete payment to activate.`)
        setTimeout(() => setToast(null), 5000)
      } else {
        setToast(result.error || 'Payment failed')
        setTimeout(() => setToast(null), 5000)
      }
    } catch (err: any) {
      setToast(err.message || 'Payment failed')
      setTimeout(() => setToast(null), 5000)
    }
    setIsProcessing(null)
  }

  return (
    <div className="space-y-6">
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-emerald-500/90 text-white px-5 py-3 rounded-xl shadow-lg text-sm font-medium">
          ✓ {toast}
        </div>
      )}

      <div>
        <h2 className="text-2xl font-black text-white">Enterprise Add-ons</h2>
        <p className="text-sm text-slate-400 mt-1">Enhance your enterprise plan with powerful add-ons</p>
      </div>

      {/* Category Filter */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setSelectedCategory(null)}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
            !selectedCategory ? 'bg-orange-500 text-white' : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
          }`}
        >
          All
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(selectedCategory === cat.id ? null : cat.id)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              selectedCategory === cat.id ? 'bg-orange-500 text-white' : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
            }`}
          >
            {cat.icon} {cat.label}
          </button>
        ))}
      </div>

      {/* Add-ons Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {(filteredAddons ?? []).map((addon: any) => (
          <div
            key={addon._id}
            className={`bg-gradient-to-br ${categoryColors[addon.category] ?? 'from-slate-500/20 to-slate-600/10 border-slate-500/30'} border rounded-2xl p-6 transition-all hover:scale-[1.02]`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-white/10 text-white capitalize">
                {addon.billingCycle.replace('_', ' ')}
              </span>
              <span className="text-xs text-slate-400">
                {categories.find((c) => c.id === addon.category)?.icon ?? '📦'}
              </span>
            </div>

            <h4 className="text-xl font-bold text-white mb-2">{addon.name}</h4>
            <p className="text-sm text-slate-400 mb-4">{addon.description}</p>

            <div className="text-orange-400 font-black text-3xl mb-4">
              {formatNgN(addon.priceNgn)}
              {addon.billingCycle === 'monthly' && <span className="text-xs text-slate-400 font-normal">/mo</span>}
            </div>

            <div className="space-y-1 mb-6">
              {(addon.features ?? []).map((f: string, i: number) => (
                <div key={i} className="flex items-center gap-2 text-xs text-slate-300">
                  <span className="text-emerald-400">✓</span>
                  <span>{f}</span>
                </div>
              ))}
            </div>

            <button
              onClick={() => handleSubscribe(addon.addonId, addon.name)}
              disabled={isProcessing === addon.addonId}
              className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold text-sm transition-all disabled:opacity-50"
            >
              {isProcessing === addon.addonId ? 'Processing...' : 'Subscribe'}
            </button>
          </div>
        ))}
        {(!filteredAddons || filteredAddons.length === 0) && (
          <div className="col-span-3 text-center py-12 text-slate-500">No add-ons available in this category</div>
        )}
      </div>
    </div>
  )
}
