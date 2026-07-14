import { useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'

// ═══════════════════════════════════════════════════════════════════
// AI SALES AGENT PANEL - Conversion engine dashboard
// ═══════════════════════════════════════════════════════════════════

const STAGE_COLORS: Record<string, string> = {
  new: 'bg-blue-500/10 text-blue-400',
  contacted: 'bg-yellow-500/10 text-yellow-400',
  qualified: 'bg-purple-500/10 text-purple-400',
  proposal: 'bg-orange-500/10 text-orange-400',
  negotiation: 'bg-amber-500/10 text-amber-400',
  closed_won: 'bg-emerald-500/10 text-emerald-400',
  closed_lost: 'bg-red-500/10 text-red-400',
}

interface SalesAgentPanelProps {
  adminToken?: string
  token?: string
}

export function SalesAgentPanel({ adminToken, token }: SalesAgentPanelProps) {
  const [activeTab, setActiveTab] = useState<'pipeline' | 'analytics' | 'leads'>('pipeline')
  const [showAddLead, setShowAddLead] = useState(false)
  const [newLead, setNewLead] = useState({ name: '', email: '', phone: '', interest: '', source: 'website' })

  const pipeline: any = useQuery(api.ai_sales_agent.getSalesPipeline)
  const analytics: any = useQuery(api.ai_sales_agent.getSalesAnalytics, { days: 30 })
  const createLead = useMutation(api.ai_sales_agent.createLead)

  const handleAddLead = async () => {
    if (!newLead.interest) return
    await createLead({
      ...newLead,
      name: newLead.name || undefined,
      email: newLead.email || undefined,
      phone: newLead.phone || undefined,
    })
    setNewLead({ name: '', email: '', phone: '', interest: '', source: 'website' })
    setShowAddLead(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black">💰 AI Sales Agent</h2>
          <p className="text-xs text-slate-400 mt-1">Proactive conversion engine — $5M/year revenue potential</p>
        </div>
        <button onClick={() => setShowAddLead(true)}
          className="px-4 py-2 bg-orange-600 hover:bg-orange-700 rounded-xl text-xs font-bold text-white">
          + Add Lead
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-800 rounded-xl p-1">
        {(['pipeline', 'analytics', 'leads'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === tab ? 'bg-orange-500 text-white' : 'text-slate-400 hover:text-white'
            }`}>
            {tab === 'pipeline' ? '📊 Pipeline' : tab === 'analytics' ? '📈 Analytics' : '👥 Leads'}
          </button>
        ))}
      </div>

      {/* Pipeline View */}
      {activeTab === 'pipeline' && pipeline && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
              <p className="text-2xl font-black text-blue-400">{pipeline.totalLeads}</p>
              <p className="text-[10px] text-slate-500 uppercase">Total Leads</p>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
              <p className="text-2xl font-black text-emerald-400">₦{(pipeline.totalValue || 0).toLocaleString()}</p>
              <p className="text-[10px] text-slate-500 uppercase">Closed Revenue</p>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
              <p className="text-2xl font-black text-amber-400">₦{(pipeline.pipelineValue || 0).toLocaleString()}</p>
              <p className="text-[10px] text-slate-500 uppercase">Pipeline Value</p>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
              <p className="text-2xl font-black text-purple-400">{pipeline.conversionRate || 0}%</p>
              <p className="text-[10px] text-slate-500 uppercase">Conversion Rate</p>
            </div>
          </div>

          {/* Pipeline Stages */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Object.entries(pipeline.pipeline || {}).map(([stage, leads]: [string, any]) => (
              <div key={stage} className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${STAGE_COLORS[stage] || ''}`}>
                    {stage.replace('_', ' ')}
                  </span>
                  <span className="text-xs font-bold text-white">{leads.length}</span>
                </div>
                <div className="space-y-1">
                  {leads.slice(0, 3).map((lead: any) => (
                    <p key={lead._id} className="text-[10px] text-slate-400 truncate">
                      {lead.name || lead.email || lead.interest}
                    </p>
                  ))}
                  {leads.length > 3 && (
                    <p className="text-[10px] text-slate-500">+{leads.length - 3} more</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Analytics View */}
      {activeTab === 'analytics' && analytics && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
              <p className="text-2xl font-black text-orange-400">{analytics.totalLeads}</p>
              <p className="text-[10px] text-slate-500 uppercase">Leads (30d)</p>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
              <p className="text-2xl font-black text-emerald-400">₦{(analytics.totalRevenue || 0).toLocaleString()}</p>
              <p className="text-[10px] text-slate-500 uppercase">Revenue</p>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
              <p className="text-2xl font-black text-blue-400">₦{(analytics.avgDealSize || 0).toLocaleString()}</p>
              <p className="text-[10px] text-slate-500 uppercase">Avg Deal</p>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
              <p className="text-2xl font-black text-purple-400">{analytics.conversionRate || 0}%</p>
              <p className="text-[10px] text-slate-500 uppercase">Win Rate</p>
            </div>
          </div>

          {/* Lead Sources */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <h3 className="text-sm font-black text-white mb-3">Lead Sources</h3>
            <div className="space-y-2">
              {Object.entries(analytics.bySource || {}).map(([source, count]: [string, any]) => (
                <div key={source} className="flex items-center justify-between">
                  <span className="text-xs text-slate-400 capitalize">{source}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-orange-500 rounded-full"
                        style={{ width: `${analytics.totalLeads ? (count / analytics.totalLeads) * 100 : 0}%` }} />
                    </div>
                    <span className="text-xs font-bold text-white w-8 text-right">{count}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Leads View */}
      {activeTab === 'leads' && pipeline && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-800">
                <th className="text-left px-4 py-3 text-slate-500 font-bold">Lead</th>
                <th className="text-left px-4 py-3 text-slate-500 font-bold">Status</th>
                <th className="text-left px-4 py-3 text-slate-500 font-bold">Score</th>
                <th className="text-left px-4 py-3 text-slate-500 font-bold">Source</th>
              </tr>
            </thead>
            <tbody>
              {Object.values(pipeline.pipeline || {}).flat().map((lead: any) => (
                <tr key={lead._id} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                  <td className="px-4 py-3">
                    <p className="font-bold text-white">{lead.name || 'Anonymous'}</p>
                    <p className="text-[10px] text-slate-500">{lead.email || lead.interest}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${STAGE_COLORS[lead.status] || ''}`}>
                      {lead.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-2 bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-orange-500 rounded-full"
                          style={{ width: `${lead.score}%` }} />
                      </div>
                      <span className="text-[10px] font-bold text-white">{lead.score}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-400 capitalize">{lead.source}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Lead Modal */}
      {showAddLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-sm font-black text-white mb-4">Add Sales Lead</h3>
            <div className="space-y-3">
              <input type="text" placeholder="Name" value={newLead.name} onChange={(e) => setNewLead(p => ({ ...p, name: e.target.value }))}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500" />
              <input type="email" placeholder="Email" value={newLead.email} onChange={(e) => setNewLead(p => ({ ...p, email: e.target.value }))}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500" />
              <input type="tel" placeholder="Phone" value={newLead.phone} onChange={(e) => setNewLead(p => ({ ...p, phone: e.target.value }))}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500" />
              <input type="text" placeholder="Interest (e.g., enterprise plan)" value={newLead.interest} onChange={(e) => setNewLead(p => ({ ...p, interest: e.target.value }))}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500" />
              <select value={newLead.source} onChange={(e) => setNewLead(p => ({ ...p, source: e.target.value }))}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white">
                <option value="website">Website</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="referral">Referral</option>
                <option value="social">Social Media</option>
                <option value="cold_outreach">Cold Outreach</option>
              </select>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={() => setShowAddLead(false)}
                className="flex-1 px-4 py-2.5 bg-slate-800 rounded-xl text-xs font-bold text-slate-400">Cancel</button>
              <button onClick={handleAddLead}
                className="flex-1 px-4 py-2.5 bg-orange-600 hover:bg-orange-700 rounded-xl text-xs font-bold text-white">Add Lead</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
