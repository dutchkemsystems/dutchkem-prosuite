import { useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'

export function MarketingFunnelPanel() {
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ name: '', type: 'email' as 'email' | 'whatsapp' | 'sms', trigger: 'signup' })
  const [steps, setSteps] = useState([{ delay: 0, content: '', channel: 'email' }])

  const campaigns: any = useQuery(api.marketing_funnel.getCampaigns)
  const analytics: any = useQuery(api.marketing_funnel.getCampaignAnalytics)
  const createCampaign = useMutation(api.marketing_funnel.createCampaign)
  const activateCampaign = useMutation(api.marketing_funnel.activateCampaign)
  const pauseCampaign = useMutation(api.marketing_funnel.pauseCampaign)

  const handleCreate = async () => {
    if (!form.name || steps.length === 0) return
    await createCampaign({ ...form, steps: steps.map(s => ({ ...s, channel: form.type })) })
    setForm({ name: '', type: 'email', trigger: 'signup' })
    setSteps([{ delay: 0, content: '', channel: 'email' }])
    setShowCreate(false)
  }

  const statusColors: Record<string, string> = {
    draft: 'bg-slate-500/10 text-slate-400', active: 'bg-emerald-500/10 text-emerald-400',
    paused: 'bg-yellow-500/10 text-yellow-400', completed: 'bg-blue-500/10 text-blue-400',
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black">📧 Marketing Funnel</h2>
          <p className="text-xs text-slate-400 mt-1">Automated drip campaigns — $2.4M/year potential</p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="px-4 py-2 bg-orange-600 hover:bg-orange-700 rounded-xl text-xs font-bold text-white">
          + New Campaign
        </button>
      </div>

      {/* Analytics */}
      {analytics && (
        <div className="grid grid-cols-4 gap-3">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
            <p className="text-2xl font-black text-orange-400">{analytics.totalCampaigns}</p>
            <p className="text-[10px] text-slate-500 uppercase">Campaigns</p>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
            <p className="text-2xl font-black text-emerald-400">{analytics.activeCount}</p>
            <p className="text-[10px] text-slate-500 uppercase">Active</p>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
            <p className="text-2xl font-black text-blue-400">{analytics.totalSent}</p>
            <p className="text-[10px] text-slate-500 uppercase">Messages Sent</p>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
            <p className="text-2xl font-black text-purple-400">{analytics.avgOpenRate}%</p>
            <p className="text-[10px] text-slate-500 uppercase">Avg Open Rate</p>
          </div>
        </div>
      )}

      {/* Campaign List */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <table className="w-full text-xs">
          <thead><tr className="border-b border-slate-800">
            <th className="text-left px-4 py-3 text-slate-500 font-bold">Campaign</th>
            <th className="text-left px-4 py-3 text-slate-500 font-bold">Type</th>
            <th className="text-left px-4 py-3 text-slate-500 font-bold">Steps</th>
            <th className="text-left px-4 py-3 text-slate-500 font-bold">Status</th>
            <th className="text-right px-4 py-3 text-slate-500 font-bold">Actions</th>
          </tr></thead>
          <tbody>
            {(campaigns || []).length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-500">No campaigns yet</td></tr>
            ) : (campaigns || []).map((c: any) => (
              <tr key={c._id} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                <td className="px-4 py-3 font-bold text-white">{c.name}</td>
                <td className="px-4 py-3 text-slate-400 capitalize">{c.type}</td>
                <td className="px-4 py-3 text-slate-400">{c.steps?.length || 0} steps</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${statusColors[c.status] || ''}`}>{c.status}</span>
                </td>
                <td className="px-4 py-3 text-right">
                  {c.status === 'draft' && (
                    <button onClick={() => activateCampaign({ campaignId: c._id })}
                      className="px-2 py-1 bg-emerald-600 rounded text-[10px] font-bold text-white">Activate</button>
                  )}
                  {c.status === 'active' && (
                    <button onClick={() => pauseCampaign({ campaignId: c._id })}
                      className="px-2 py-1 bg-yellow-600 rounded text-[10px] font-bold text-white">Pause</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-lg">
            <h3 className="text-sm font-black text-white mb-4">Create Drip Campaign</h3>
            <div className="space-y-3">
              <input placeholder="Campaign Name" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500" />
              <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value as any }))}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white">
                <option value="email">Email</option><option value="whatsapp">WhatsApp</option><option value="sms">SMS</option>
              </select>
              <select value={form.trigger} onChange={e => setForm(p => ({ ...p, trigger: e.target.value }))}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white">
                <option value="signup">On Signup</option><option value="purchase">On Purchase</option><option value="inactive">User Inactive</option><option value="manual">Manual</option>
              </select>
              <div className="space-y-2">
                <label className="text-[10px] text-slate-500 uppercase font-bold">Drip Steps</label>
                {steps.map((step, i) => (
                  <div key={i} className="flex gap-2">
                    <input type="number" value={step.delay} onChange={e => { const s = [...steps]; s[i].delay = Number(e.target.value); setSteps(s) }}
                      placeholder="Days" className="w-16 bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white text-center" />
                    <input value={step.content} onChange={e => { const s = [...steps]; s[i].content = e.target.value; setSteps(s) }}
                      placeholder="Message content..." className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500" />
                  </div>
                ))}
                <button onClick={() => setSteps([...steps, { delay: steps.length * 1, content: '', channel: form.type }])}
                  className="text-[10px] text-orange-400 font-bold">+ Add Step</button>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={() => setShowCreate(false)} className="flex-1 px-4 py-2.5 bg-slate-800 rounded-xl text-xs font-bold text-slate-400">Cancel</button>
              <button onClick={handleCreate} className="flex-1 px-4 py-2.5 bg-orange-600 hover:bg-orange-700 rounded-xl text-xs font-bold text-white">Create</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
