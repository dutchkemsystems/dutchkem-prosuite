import { useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'

// ═══════════════════════════════════════════════════════════════════
// FLASH SALES & PROMO CODES ADMIN PANEL
// ═══════════════════════════════════════════════════════════════════

export function FlashSalesPanel({ adminToken }: { adminToken: string }) {
  const [tab, setTab] = useState<'sales' | 'promos'>('sales')
  const [showCreateSale, setShowCreateSale] = useState(false)
  const [showCreatePromo, setShowCreatePromo] = useState(false)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black uppercase tracking-tighter text-white flex items-center gap-2">
            ⚡ Flash Sales & Promo Codes
          </h2>
          <p className="text-slate-400 text-sm mt-1">Manage time-limited offers and discount codes</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setTab('sales')}
          className={`px-4 py-2 rounded-xl font-bold text-sm transition-all ${tab === 'sales' ? 'bg-orange-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
        >
          ⚡ Flash Sales
        </button>
        <button
          onClick={() => setTab('promos')}
          className={`px-4 py-2 rounded-xl font-bold text-sm transition-all ${tab === 'promos' ? 'bg-orange-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
        >
          🏷️ Promo Codes
        </button>
      </div>

      {tab === 'sales' ? (
        <FlashSalesTab adminToken={adminToken} showCreate={showCreateSale} setShowCreate={setShowCreateSale} />
      ) : (
        <PromoCodesTab adminToken={adminToken} showCreate={showCreatePromo} setShowCreate={setShowCreatePromo} />
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════
// FLASH SALES TAB
// ═══════════════════════════════════════════════════════════════════

function FlashSalesTab({ adminToken, showCreate, setShowCreate }: { adminToken: string; showCreate: boolean; setShowCreate: (v: boolean) => void }) {
  const sales = useQuery(api.flashSales.getAllFlashSales)
  const createSale = useMutation(api.flashSales.createFlashSale)
  const deactivateSale = useMutation(api.flashSales.deactivateFlashSale)

  const [form, setForm] = useState({
    name: '',
    discountPercent: 20,
    startDate: '',
    endDate: '',
    maxUses: '',
    plans: 'starter,pro,business',
  })

  const handleCreate = async () => {
    if (!form.name || !form.startDate || !form.endDate) return
    try {
      await createSale({
        name: form.name,
        discountPercent: form.discountPercent,
        startsAt: new Date(form.startDate).getTime(),
        endsAt: new Date(form.endDate).getTime(),
        maxUses: form.maxUses ? parseInt(form.maxUses) : undefined,
        applicablePlans: form.plans.split(',').map(p => p.trim()),
      })
      setShowCreate(false)
      setForm({ name: '', discountPercent: 20, startDate: '', endDate: '', maxUses: '', plans: 'starter,pro,business' })
    } catch (err: any) {
      alert(err.message)
    }
  }

  const now = Date.now()

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-xl font-bold text-sm"
        >
          {showCreate ? 'Cancel' : '+ Create Flash Sale'}
        </button>
      </div>

      {showCreate && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <h3 className="text-lg font-bold text-white">Create Flash Sale</h3>
          <div className="grid grid-cols-2 gap-4">
            <input
              placeholder="Sale name"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              className="bg-slate-950 border border-slate-800 rounded-xl p-3 text-white text-sm"
            />
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Discount %</label>
              <input
                type="number"
                min={1}
                max={90}
                value={form.discountPercent}
                onChange={e => setForm({ ...form, discountPercent: parseInt(e.target.value) || 0 })}
                className="bg-slate-950 border border-slate-800 rounded-xl p-3 text-white text-sm w-full"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Start Date</label>
              <input
                type="datetime-local"
                value={form.startDate}
                onChange={e => setForm({ ...form, startDate: e.target.value })}
                className="bg-slate-950 border border-slate-800 rounded-xl p-3 text-white text-sm w-full"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">End Date</label>
              <input
                type="datetime-local"
                value={form.endDate}
                onChange={e => setForm({ ...form, endDate: e.target.value })}
                className="bg-slate-950 border border-slate-800 rounded-xl p-3 text-white text-sm w-full"
              />
            </div>
            <input
              placeholder="Max uses (optional)"
              value={form.maxUses}
              onChange={e => setForm({ ...form, maxUses: e.target.value })}
              className="bg-slate-950 border border-slate-800 rounded-xl p-3 text-white text-sm"
            />
            <input
              placeholder="Plans: starter,pro,business"
              value={form.plans}
              onChange={e => setForm({ ...form, plans: e.target.value })}
              className="bg-slate-950 border border-slate-800 rounded-xl p-3 text-white text-sm"
            />
          </div>
          <button
            onClick={handleCreate}
            className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-sm"
          >
            Create Sale
          </button>
        </div>
      )}

      {/* Sales List */}
      <div className="space-y-3">
        {!sales ? (
          <div className="text-center py-8 text-slate-500">Loading...</div>
        ) : sales.length === 0 ? (
          <div className="text-center py-8 text-slate-500">No flash sales yet. Create one to get started.</div>
        ) : (
          sales.map((sale: any) => {
            const isLive = sale.isActive && sale.startsAt <= now && sale.endsAt > now
            const isUpcoming = sale.startsAt > now
            const isEnded = sale.endsAt <= now
            const usagePercent = sale.maxUses ? (sale.currentUses / sale.maxUses) * 100 : 0

            return (
              <div key={sale._id} className={`bg-slate-900 border rounded-2xl p-5 ${isLive ? 'border-emerald-500/50' : 'border-slate-800'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${isLive ? 'bg-emerald-500 animate-pulse' : isUpcoming ? 'bg-yellow-500' : 'bg-slate-600'}`} />
                    <div>
                      <h4 className="text-white font-bold">{sale.name}</h4>
                      <p className="text-slate-400 text-xs">
                        {isLive ? 'LIVE' : isUpcoming ? 'Upcoming' : 'Ended'} · {sale.discountPercent}% off
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-white font-bold text-lg">{sale.discountPercent}%</p>
                      <p className="text-slate-400 text-xs">
                        {sale.currentUses}{sale.maxUses ? `/${sale.maxUses}` : ''} uses
                      </p>
                    </div>
                    {sale.isActive && (
                      <button
                        onClick={() => deactivateSale({ saleId: sale._id })}
                        className="px-3 py-1.5 bg-red-600/20 text-red-400 rounded-lg text-xs font-bold hover:bg-red-600/30"
                      >
                        Deactivate
                      </button>
                    )}
                  </div>
                </div>
                {sale.maxUses && (
                  <div className="mt-3">
                    <div className="w-full bg-slate-800 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${usagePercent > 80 ? 'bg-red-500' : 'bg-emerald-500'}`}
                        style={{ width: `${Math.min(usagePercent, 100)}%` }}
                      />
                    </div>
                  </div>
                )}
                <div className="mt-2 flex gap-2 flex-wrap">
                  {sale.applicablePlans?.map((plan: string) => (
                    <span key={plan} className="px-2 py-0.5 bg-slate-800 text-slate-400 rounded text-xs">{plan}</span>
                  ))}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════
// PROMO CODES TAB
// ═══════════════════════════════════════════════════════════════════

function PromoCodesTab({ adminToken, showCreate, setShowCreate }: { adminToken: string; showCreate: boolean; setShowCreate: (v: boolean) => void }) {
  const promos = useQuery(api.flashSales.getAllPromoCodes)
  const createPromo = useMutation(api.flashSales.createPromoCode)
  const deactivatePromo = useMutation(api.flashSales.deactivatePromoCode)

  const [form, setForm] = useState({
    code: '',
    discountPercent: 10,
    maxUses: '100',
    expiryDate: '',
  })

  const handleCreate = async () => {
    if (!form.code || !form.expiryDate) return
    try {
      await createPromo({
        code: form.code,
        discountPercent: form.discountPercent,
        maxUses: parseInt(form.maxUses) || 100,
        expiresAt: new Date(form.expiryDate).getTime(),
      })
      setShowCreate(false)
      setForm({ code: '', discountPercent: 10, maxUses: '100', expiryDate: '' })
    } catch (err: any) {
      alert(err.message)
    }
  }

  const now = Date.now()

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-xl font-bold text-sm"
        >
          {showCreate ? 'Cancel' : '+ Create Promo Code'}
        </button>
      </div>

      {showCreate && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <h3 className="text-lg font-bold text-white">Create Promo Code</h3>
          <div className="grid grid-cols-2 gap-4">
            <input
              placeholder="Code (e.g. SUMMER20)"
              value={form.code}
              onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })}
              className="bg-slate-950 border border-slate-800 rounded-xl p-3 text-white text-sm font-mono uppercase"
            />
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Discount %</label>
              <input
                type="number"
                min={1}
                max={90}
                value={form.discountPercent}
                onChange={e => setForm({ ...form, discountPercent: parseInt(e.target.value) || 0 })}
                className="bg-slate-950 border border-slate-800 rounded-xl p-3 text-white text-sm w-full"
              />
            </div>
            <input
              placeholder="Max uses"
              value={form.maxUses}
              onChange={e => setForm({ ...form, maxUses: e.target.value })}
              className="bg-slate-950 border border-slate-800 rounded-xl p-3 text-white text-sm"
            />
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Expires</label>
              <input
                type="datetime-local"
                value={form.expiryDate}
                onChange={e => setForm({ ...form, expiryDate: e.target.value })}
                className="bg-slate-950 border border-slate-800 rounded-xl p-3 text-white text-sm w-full"
              />
            </div>
          </div>
          <button
            onClick={handleCreate}
            className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-sm"
          >
            Create Code
          </button>
        </div>
      )}

      {/* Promo Codes List */}
      <div className="space-y-3">
        {!promos ? (
          <div className="text-center py-8 text-slate-500">Loading...</div>
        ) : promos.length === 0 ? (
          <div className="text-center py-8 text-slate-500">No promo codes yet. Create one to get started.</div>
        ) : (
          promos.map((promo: any) => {
            const isExpired = promo.expiresAt <= now
            const isUsedUp = promo.maxUses && promo.currentUses >= promo.maxUses
            const usagePercent = promo.maxUses ? (promo.currentUses / promo.maxUses) * 100 : 0

            return (
              <div key={promo._id} className={`bg-slate-900 border rounded-2xl p-5 ${!promo.isActive || isExpired || isUsedUp ? 'border-slate-700 opacity-60' : 'border-slate-800'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${promo.isActive && !isExpired && !isUsedUp ? 'bg-emerald-500' : 'bg-slate-600'}`} />
                    <div>
                      <h4 className="text-white font-bold font-mono text-lg">{promo.code}</h4>
                      <p className="text-slate-400 text-xs">
                        {promo.discountPercent}% off · {isExpired ? 'Expired' : isUsedUp ? 'Used up' : promo.isActive ? 'Active' : 'Inactive'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-white font-bold text-lg">{promo.discountPercent}%</p>
                      <p className="text-slate-400 text-xs">
                        {promo.currentUses}/{promo.maxUses || '∞'} uses
                      </p>
                    </div>
                    {promo.isActive && (
                      <button
                        onClick={() => deactivatePromo({ promoId: promo._id })}
                        className="px-3 py-1.5 bg-red-600/20 text-red-400 rounded-lg text-xs font-bold hover:bg-red-600/30"
                      >
                        Deactivate
                      </button>
                    )}
                  </div>
                </div>
                {promo.maxUses && (
                  <div className="mt-3">
                    <div className="w-full bg-slate-800 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${usagePercent > 80 ? 'bg-red-500' : 'bg-emerald-500'}`}
                        style={{ width: `${Math.min(usagePercent, 100)}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
