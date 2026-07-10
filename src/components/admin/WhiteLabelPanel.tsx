import { useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'

// ═══════════════════════════════════════════════════════════════════
// WHITE-LABEL AI - Enterprise branding customization
// ═══════════════════════════════════════════════════════════════════

const PLAN_FEATURES = {
  basic: { price: 500, agents: 1, queries: '10K', label: 'Basic' },
  pro: { price: 2000, agents: 5, queries: '50K', label: 'Pro' },
  enterprise: { price: 10000, agents: -1, queries: 'Unlimited', label: 'Enterprise' },
}

interface WhiteLabelPanelProps {
  adminToken: string
}

export function WhiteLabelPanel({ adminToken }: WhiteLabelPanelProps) {
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({
    companyName: '', customDomain: '', primaryColor: '#FF6B35', secondaryColor: '#1E1E1E',
    plan: 'basic' as 'basic' | 'pro' | 'enterprise',
  })

  const customers: any = useQuery(api.revenue_outcomes.getWhiteLabelCustomers, adminToken ? { adminToken } : 'skip')
  const addCustomer = useMutation(api.revenue_outcomes.insertWhiteLabelCustomer)

  const handleAdd = async () => {
    if (!form.companyName) return
    await addCustomer({
      adminToken,
      companyName: form.companyName,
      customDomain: form.customDomain,
      primaryColor: form.primaryColor,
      secondaryColor: form.secondaryColor,
    })
    setForm({ companyName: '', customDomain: '', primaryColor: '#FF6B35', secondaryColor: '#1E1E1E', plan: 'basic' })
    setShowAdd(false)
  }

  const list = customers?.data || []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black">🏷️ White-Label AI</h2>
          <p className="text-xs text-slate-400 mt-1">Enterprise-branded AI assistants — $4.2M/year potential</p>
        </div>
        <button onClick={() => setShowAdd(true)}
          className="px-4 py-2 bg-orange-600 hover:bg-orange-700 rounded-xl text-xs font-bold text-white">
          + Add Client
        </button>
      </div>

      {/* Plans */}
      <div className="grid grid-cols-3 gap-4">
        {Object.entries(PLAN_FEATURES).map(([key, plan]) => (
          <div key={key} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 text-center">
            <p className="text-lg font-black text-white">{plan.label}</p>
            <p className="text-2xl font-black text-orange-400 mt-2">${plan.price.toLocaleString()}<span className="text-xs text-slate-500">/mo</span></p>
            <p className="text-[10px] text-slate-500 mt-1">{plan.agents === -1 ? 'Unlimited' : plan.agents} agents • {plan.queries} queries</p>
          </div>
        ))}
      </div>

      {/* Client List */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <table className="w-full text-xs">
          <thead><tr className="border-b border-slate-800">
            <th className="text-left px-4 py-3 text-slate-500 font-bold">Company</th>
            <th className="text-left px-4 py-3 text-slate-500 font-bold">Domain</th>
            <th className="text-left px-4 py-3 text-slate-500 font-bold">Branding</th>
            <th className="text-left px-4 py-3 text-slate-500 font-bold">Status</th>
          </tr></thead>
          <tbody>
            {list.length === 0 ? (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-500">No white-label clients yet</td></tr>
            ) : list.map((c: any) => (
              <tr key={c._id} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                <td className="px-4 py-3 font-bold text-white">{c.companyName}</td>
                <td className="px-4 py-3 text-slate-400">{c.customDomain || '—'}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    <div className="w-4 h-4 rounded" style={{ backgroundColor: c.primaryColor }} />
                    <div className="w-4 h-4 rounded" style={{ backgroundColor: c.secondaryColor }} />
                  </div>
                </td>
                <td className="px-4 py-3"><span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded-full text-[10px] font-bold">Active</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-sm font-black text-white mb-4">Add White-Label Client</h3>
            <div className="space-y-3">
              <input placeholder="Company Name" value={form.companyName} onChange={e => setForm(p => ({ ...p, companyName: e.target.value }))}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500" />
              <input placeholder="Custom Domain (e.g., ai.company.com)" value={form.customDomain} onChange={e => setForm(p => ({ ...p, customDomain: e.target.value }))}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500" />
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-[10px] text-slate-500 block mb-1">Primary Color</label>
                  <input type="color" value={form.primaryColor} onChange={e => setForm(p => ({ ...p, primaryColor: e.target.value }))}
                    className="w-full h-10 bg-slate-800 border border-slate-700 rounded-xl cursor-pointer" />
                </div>
                <div className="flex-1">
                  <label className="text-[10px] text-slate-500 block mb-1">Secondary Color</label>
                  <input type="color" value={form.secondaryColor} onChange={e => setForm(p => ({ ...p, secondaryColor: e.target.value }))}
                    className="w-full h-10 bg-slate-800 border border-slate-700 rounded-xl cursor-pointer" />
                </div>
              </div>
              <select value={form.plan} onChange={e => setForm(p => ({ ...p, plan: e.target.value as any }))}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white">
                <option value="basic">Basic — $500/mo</option>
                <option value="pro">Pro — $2,000/mo</option>
                <option value="enterprise">Enterprise — $10,000/mo</option>
              </select>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={() => setShowAdd(false)} className="flex-1 px-4 py-2.5 bg-slate-800 rounded-xl text-xs font-bold text-slate-400">Cancel</button>
              <button onClick={handleAdd} className="flex-1 px-4 py-2.5 bg-orange-600 hover:bg-orange-700 rounded-xl text-xs font-bold text-white">Add Client</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
