import { useState, useCallback } from 'react'
import { useMutation } from 'convex/react'
import { useSuspenseQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { api } from '../../../../convex/_generated/api'
import { Toast, StatCard, formatNgN } from './shared'

// ─── MARKETPLACE TAB ──────────────────────────────────────────

export function MarketplaceTab({ adminToken }: { adminToken: string }) {
  const { data: stats } = useSuspenseQuery(convexQuery(api.revenue_marketplace.getListingStats, adminToken ? { adminToken } : 'skip'))
  const { data: listings } = useSuspenseQuery(convexQuery(api.revenue_marketplace.getListings, adminToken ? { adminToken } : 'skip'))
  const createListing = useMutation(api.revenue_marketplace.createListing)

  const [showForm, setShowForm] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', description: '', category: '', priceNgN: 0, agentId: '', pricingModel: 'one_time' as 'free' | 'one_time' | 'subscription' })

  const showToast = useCallback((msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }, [])

  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleCreate = async () => {
    if (!form.name || !form.category || !form.agentId) return
    setIsSubmitting(true)
    try {
      await createListing({ ...form, adminToken })
      setForm({ name: '', description: '', category: '', priceNgN: 0, agentId: '', pricingModel: 'one_time' })
      setShowForm(false)
      showToast('Listing created')
    } catch (err) {
      console.error('[MarketplaceTab] Failed to create listing:', err)
      showToast('Failed to create listing', 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon="📦" value={stats?.totalListings ?? 0} label="Total Listings" color="from-blue-500/20 to-blue-600/10" />
        <StatCard icon="⬇️" value={stats?.totalDownloads ?? 0} label="Downloads" color="from-orange-500/20 to-orange-600/10" />
        <StatCard icon="💰" value={formatNgN(stats?.totalRevenue ?? 0)} label="Revenue" color="from-emerald-500/20 to-emerald-600/10" />
        <StatCard icon="⭐" value={stats?.avgRating ?? 0} label="Avg Rating" color="from-purple-500/20 to-purple-600/10" />
      </div>

      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-white">Listings</h3>
        <button onClick={() => setShowForm(!showForm)} className="bg-[#FF6B35] hover:bg-[#FF8255] text-white px-4 py-2 rounded-xl text-sm font-medium transition-all">
          + Create Listing
        </button>
      </div>

      {showForm && (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-slate-400 mb-1 block">Name</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#FF6B35]/50" />
            </div>
            <div>
              <label className="text-sm text-slate-400 mb-1 block">Category</label>
              <input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#FF6B35]/50" />
            </div>
            <div>
              <label className="text-sm text-slate-400 mb-1 block">Agent ID</label>
              <input value={form.agentId} onChange={(e) => setForm({ ...form, agentId: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#FF6B35]/50" />
            </div>
            <div>
              <label className="text-sm text-slate-400 mb-1 block">Price (₦)</label>
              <input type="number" value={form.priceNgN} onChange={(e) => setForm({ ...form, priceNgN: Number(e.target.value) })} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#FF6B35]/50" />
            </div>
          </div>
          <div>
            <label className="text-sm text-slate-400 mb-1 block">Description</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#FF6B35]/50 resize-none" />
          </div>
          <div className="flex gap-2">
            <button onClick={handleCreate} disabled={isSubmitting} className="bg-[#FF6B35] hover:bg-[#FF8255] text-white px-4 py-2 rounded-xl text-sm font-medium transition-all disabled:opacity-50">{isSubmitting ? 'Creating...' : 'Create'}</button>
            <button onClick={() => setShowForm(false)} className="bg-white/5 hover:bg-white/10 text-slate-300 px-4 py-2 rounded-xl text-sm font-medium transition-all">Cancel</button>
          </div>
        </div>
      )}

      <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
        <div className="grid grid-cols-[1fr_auto_auto_auto_auto] px-5 py-3 border-b border-white/5 text-sm text-slate-400 font-medium">
          <div>Name</div>
          <div>Category</div>
          <div>Price</div>
          <div>Downloads</div>
          <div>Rating</div>
        </div>
        {(listings ?? []).slice(0, 30).map((l: any) => (
          <div key={l._id} className="grid grid-cols-[1fr_auto_auto_auto_auto] px-5 py-3 border-b border-white/5 hover:bg-white/5 transition-colors text-sm">
            <div className="text-white truncate max-w-[200px]">{l.name}</div>
            <div className="text-slate-300">{l.category}</div>
            <div className="text-[#FF6B35] font-bold">{formatNgN(l.priceNgN)}</div>
            <div className="text-slate-300">{l.downloadsCount}</div>
            <div className="text-yellow-400">⭐ {l.rating}</div>
          </div>
        ))}
        {(!listings || listings.length === 0) && (
          <div className="px-5 py-8 text-center text-slate-500 text-sm">No listings yet</div>
        )}
      </div>
    </div>
  )
}
