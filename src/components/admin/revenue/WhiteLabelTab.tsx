import { useState, useCallback } from 'react'
import { useMutation } from 'convex/react'
import { useSuspenseQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { api } from '../../../../convex/_generated/api'
import { Toast, StatCard, formatNgN } from './shared'

// ─── WHITE LABEL TAB ──────────────────────────────────────────

export function WhiteLabelTab({ adminToken }: { adminToken: string }) {
  const { data: stats } = useSuspenseQuery(convexQuery(api.revenue_outcomes.getWhiteLabelStats, adminToken ? { adminToken } : 'skip'))
  const { data: customers } = useSuspenseQuery(convexQuery(api.revenue_outcomes.getWhiteLabelCustomers, adminToken ? { adminToken } : 'skip'))
  const createCustomer = useMutation(api.revenue_outcomes.createWhiteLabelCustomer)

  const [showForm, setShowForm] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [form, setForm] = useState({ companyName: '', customDomain: '', primaryColor: '#FF6B35', secondaryColor: '#000000', setupFeePaid: 0, monthlyFee: 0 })

  const showToast = useCallback((msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }, [])

  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleCreate = async () => {
    if (!form.companyName) return
    setIsSubmitting(true)
    try {
      await createCustomer({ ...form, adminToken })
      setForm({ companyName: '', customDomain: '', primaryColor: '#FF6B35', secondaryColor: '#000000', setupFeePaid: 0, monthlyFee: 0 })
      setShowForm(false)
      showToast('Client added')
    } catch (err) {
      console.error('[WhiteLabelTab] Failed to create client:', err)
      showToast('Failed to create client', 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon="👥" value={stats?.totalClients ?? 0} label="Total Clients" color="from-purple-500/20 to-purple-600/10" />
        <StatCard icon="✅" value={stats?.activeClients ?? 0} label="Active" color="from-emerald-500/20 to-emerald-600/10" />
        <StatCard icon="💵" value={formatNgN(stats?.totalSetupFees ?? 0)} label="Setup Fees" color="from-blue-500/20 to-blue-600/10" />
        <StatCard icon="📈" value={formatNgN(stats?.totalMonthlyRevenue ?? 0)} label="Monthly Revenue" color="from-orange-500/20 to-orange-600/10" />
      </div>

      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-white">Clients</h3>
        <button onClick={() => setShowForm(!showForm)} className="bg-[#FF6B35] hover:bg-[#FF8255] text-white px-4 py-2 rounded-xl text-sm font-medium transition-all">
          + New Client
        </button>
      </div>

      {showForm && (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-slate-400 mb-1 block">Company Name</label>
              <input value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#FF6B35]/50" />
            </div>
            <div>
              <label className="text-sm text-slate-400 mb-1 block">Custom Domain</label>
              <input value={form.customDomain} onChange={(e) => setForm({ ...form, customDomain: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#FF6B35]/50" />
            </div>
            <div>
              <label className="text-sm text-slate-400 mb-1 block">Setup Fee (₦)</label>
              <input type="number" value={form.setupFeePaid} onChange={(e) => setForm({ ...form, setupFeePaid: Number(e.target.value) })} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#FF6B35]/50" />
            </div>
            <div>
              <label className="text-sm text-slate-400 mb-1 block">Monthly Fee (₦)</label>
              <input type="number" value={form.monthlyFee} onChange={(e) => setForm({ ...form, monthlyFee: Number(e.target.value) })} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#FF6B35]/50" />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleCreate} disabled={isSubmitting} className="bg-[#FF6B35] hover:bg-[#FF8255] text-white px-4 py-2 rounded-xl text-sm font-medium transition-all disabled:opacity-50">{isSubmitting ? 'Creating...' : 'Create'}</button>
            <button onClick={() => setShowForm(false)} className="bg-white/5 hover:bg-white/10 text-slate-300 px-4 py-2 rounded-xl text-sm font-medium transition-all">Cancel</button>
          </div>
        </div>
      )}

      <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
        <div className="grid grid-cols-[1fr_1fr_auto_auto] px-5 py-3 border-b border-white/5 text-sm text-slate-400 font-medium">
          <div>Company</div>
          <div>Domain</div>
          <div>Monthly Fee</div>
          <div>Status</div>
        </div>
        {(customers ?? []).map((c: any) => (
          <div key={c._id} className="grid grid-cols-[1fr_1fr_auto_auto] px-5 py-3 border-b border-white/5 hover:bg-white/5 transition-colors text-sm">
            <div className="text-white truncate max-w-[200px]">{c.companyName}</div>
            <div className="text-slate-300 truncate max-w-[160px]">{c.customDomain ?? '—'}</div>
            <div className="text-[#FF6B35] font-bold">{formatNgN(c.monthlyFee)}</div>
            <div className={`text-xs font-medium px-2.5 py-1 rounded-full ${c.status === 'active' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-500/20 text-slate-400'}`}>
              {c.status}
            </div>
          </div>
        ))}
        {(!customers || customers.length === 0) && (
          <div className="px-5 py-8 text-center text-slate-500 text-sm">No clients yet</div>
        )}
      </div>
    </div>
  )
}
