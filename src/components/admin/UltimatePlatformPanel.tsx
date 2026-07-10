import { useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'

// ═══════════════════════════════════════════════════════════════════
// ULTIMATE PLATFORM - All 8 revenue features in one tab
// ═══════════════════════════════════════════════════════════════════

const FEATURES = [
  { id: 'sales', icon: '💰', name: 'AI Sales Agent', revenue: '$5.04M/yr', color: 'emerald' },
  { id: 'whitelabel', icon: '🏷️', name: 'White-Label AI', revenue: '$4.2M/yr', color: 'blue' },
  { id: 'marketplace', icon: '🏪', name: 'Agent Marketplace', revenue: '$3.9M/yr', color: 'purple' },
  { id: 'marketing', icon: '📧', name: 'Marketing Funnel', revenue: '$2.4M/yr', color: 'orange' },
  { id: 'voice', icon: '🎬', name: 'Voice & Video', revenue: '$2.1M/yr', color: 'pink' },
  { id: 'pricing', icon: '💲', name: 'Dynamic Pricing', revenue: '$540K/yr', color: 'amber' },
  { id: 'blockchain', icon: '⛓️', name: 'Blockchain', revenue: '$500K/yr', color: 'cyan' },
  { id: 'predictive', icon: '🔮', name: 'Predictive Analytics', revenue: '$350K/yr', color: 'indigo' },
]

export function UltimatePlatformPanel() {
  const [activeFeature, setActiveFeature] = useState('sales')

  // Sales Agent
  const pipeline: any = useQuery(api.ai_sales_agent.getSalesPipeline)
  const salesAnalytics: any = useQuery(api.ai_sales_agent.getSalesAnalytics, { days: 30 })
  const createLead = useMutation(api.ai_sales_agent.createLead)
  const [leadForm, setLeadForm] = useState({ name: '', email: '', interest: '', source: 'website' })

  // White-Label
  const wlCustomers: any = useQuery(api.revenue_outcomes.getWhiteLabelCustomers, { adminToken: 'admin' })
  const addWL = useMutation(api.revenue_outcomes.insertWhiteLabelCustomer)
  const [wlForm, setWlForm] = useState({ companyName: '', primaryColor: '#FF6B35' })

  // Marketing
  const campaigns: any = useQuery(api.marketing_funnel.getCampaigns)
  const campaignAnalytics: any = useQuery(api.marketing_funnel.getCampaignAnalytics)
  const createCampaign = useMutation(api.marketing_funnel.createCampaign)
  const activateCampaign = useMutation(api.marketing_funnel.activateCampaign)
  const pauseCampaign = useMutation(api.marketing_funnel.pauseCampaign)

  // Voice & Video
  const avatarPresets: any = useQuery(api.voice_video_config.getAvatarPresets)
  const voicePresets: any = useQuery(api.voice_video_config.getVoicePresets)
  const agentConfigs: any = useQuery(api.voice_video_config.getAllAgentMediaConfigs)
  const saveMediaConfig = useMutation(api.voice_video_config.saveAgentMediaConfig)
  const [selectedAgent, setSelectedAgent] = useState('A1')
  const [selAvatar, setSelAvatar] = useState('professional')
  const [selVoice, setSelVoice] = useState('nigerian_female')

  // Dynamic Pricing
  const pricingRules: any = useQuery(api.dynamic_pricing.getPricingRules)
  const pricingStates: any = useQuery(api.dynamic_pricing.getEnabledRules)
  const pricingAnalytics: any = useQuery(api.dynamic_pricing.getPricingAnalytics)
  const togglePricingRule = useMutation(api.dynamic_pricing.togglePricingRule)

  // Blockchain
  const verifications: any = useQuery(api.blockchain_verification.getVerifications, { limit: 20 })
  const verifyStats: any = useQuery(api.blockchain_verification.getVerificationStats)
  const createVerification = useMutation(api.blockchain_verification.createVerification)
  const [verifyData, setVerifyData] = useState({ type: 'transaction', data: '' })

  // Predictive
  const churn: any = useQuery(api.predictive_analytics.predictChurnRisk, { days: 30 })
  const revenueForecast: any = useQuery(api.predictive_analytics.predictRevenue, { months: 6 })
  const analyticsSummary: any = useQuery(api.predictive_analytics.getAnalyticsSummary)

  const handleCreateLead = async () => {
    if (!leadForm.interest) return
    await createLead({ ...leadForm, name: leadForm.name || undefined, email: leadForm.email || undefined })
    setLeadForm({ name: '', email: '', interest: '', source: 'website' })
  }

  const handleAddWL = async () => {
    if (!wlForm.companyName) return
    await addWL({ adminToken: 'admin', companyName: wlForm.companyName, primaryColor: wlForm.primaryColor, secondaryColor: '#1E1E1E', customDomain: '' })
    setWlForm({ companyName: '', primaryColor: '#FF6B35' })
  }

  const handleVerify = async () => {
    if (!verifyData.data) return
    await createVerification(verifyData)
    setVerifyData({ type: 'transaction', data: '' })
  }

  const AGENT_NAMES: Record<string, string> = {
    A1: 'Academic Pro', A2: 'Business Pro', A3: 'Content Pro', A4: 'Career Pro',
    A5: 'Personal Shopper', A6: 'Exam Pro', A7: 'Finance Pro', A8: 'MediaStudio Pro',
    A9: 'Health Pro', A10: 'Home Services', A11: 'Language Tutor', A12: 'Travel Planner',
    A13: 'ServiceMart NG', A14: 'Translation Hub', A15: 'Event Planner',
  }

  const statusColors: Record<string, string> = {
    draft: 'bg-slate-500/10 text-slate-400', active: 'bg-emerald-500/10 text-emerald-400',
    paused: 'bg-yellow-500/10 text-yellow-400',
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-black">🚀 Ultimate Platform</h2>
        <p className="text-xs text-slate-400 mt-1">8 revenue features — $19.1M/year combined potential</p>
      </div>

      {/* Revenue Summary Bar */}
      <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
        {FEATURES.map(f => (
          <button key={f.id} onClick={() => setActiveFeature(f.id)}
            className={`p-3 rounded-xl border text-center transition-all ${
              activeFeature === f.id
                ? `border-${f.color}-500 bg-${f.color}-500/10`
                : 'border-slate-800 bg-slate-900 hover:border-slate-700'
            }`}>
            <span className="text-lg">{f.icon}</span>
            <p className="text-[9px] text-slate-400 mt-1 font-bold">{f.name.split(' ')[0]}</p>
            <p className="text-[8px] text-slate-600">{f.revenue}</p>
          </button>
        ))}
      </div>

      {/* ── SALES AGENT ── */}
      {activeFeature === 'sales' && (
        <div className="space-y-4">
          <div className="grid grid-cols-4 gap-3">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-center">
              <p className="text-xl font-black text-emerald-400">{pipeline?.totalLeads || 0}</p>
              <p className="text-[9px] text-slate-500">Leads</p>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-center">
              <p className="text-xl font-black text-blue-400">₦{(pipeline?.totalValue || 0).toLocaleString()}</p>
              <p className="text-[9px] text-slate-500">Closed</p>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-center">
              <p className="text-xl font-black text-amber-400">₦{(pipeline?.pipelineValue || 0).toLocaleString()}</p>
              <p className="text-[9px] text-slate-500">Pipeline</p>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-center">
              <p className="text-xl font-black text-purple-400">{pipeline?.conversionRate || 0}%</p>
              <p className="text-[9px] text-slate-500">Win Rate</p>
            </div>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <h4 className="text-xs font-black text-white mb-3">Quick Add Lead</h4>
            <div className="flex gap-2">
              <input placeholder="Name" value={leadForm.name} onChange={e => setLeadForm(p => ({ ...p, name: e.target.value }))}
                className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500" />
              <input placeholder="Email" value={leadForm.email} onChange={e => setLeadForm(p => ({ ...p, email: e.target.value }))}
                className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500" />
              <input placeholder="Interest" value={leadForm.interest} onChange={e => setLeadForm(p => ({ ...p, interest: e.target.value }))}
                className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500" />
              <button onClick={handleCreateLead} className="px-4 py-2 bg-emerald-600 rounded-lg text-xs font-bold text-white">Add</button>
            </div>
          </div>
          {/* Pipeline */}
          <div className="grid grid-cols-4 gap-3">
            {Object.entries(pipeline?.pipeline || {}).map(([stage, leads]: [string, any]) => (
              <div key={stage} className="bg-slate-900 border border-slate-800 rounded-xl p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold text-slate-400 capitalize">{stage.replace('_', ' ')}</span>
                  <span className="text-xs font-bold text-white">{leads.length}</span>
                </div>
                {leads.slice(0, 2).map((l: any) => (
                  <p key={l._id} className="text-[9px] text-slate-500 truncate">{l.name || l.interest}</p>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── WHITE-LABEL ── */}
      {activeFeature === 'whitelabel' && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            {[{ p: 'Basic', price: '$500', agents: '1 agent' }, { p: 'Pro', price: '$2,000', agents: '5 agents' }, { p: 'Enterprise', price: '$10,000', agents: 'Unlimited' }].map(pl => (
              <div key={pl.p} className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-center">
                <p className="text-sm font-black text-white">{pl.p}</p>
                <p className="text-lg font-black text-orange-400 mt-1">{pl.price}<span className="text-[10px] text-slate-500">/mo</span></p>
                <p className="text-[9px] text-slate-500">{pl.agents}</p>
              </div>
            ))}
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <h4 className="text-xs font-black text-white mb-3">Add Client</h4>
            <div className="flex gap-2">
              <input placeholder="Company Name" value={wlForm.companyName} onChange={e => setWlForm(p => ({ ...p, companyName: e.target.value }))}
                className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500" />
              <input type="color" value={wlForm.primaryColor} onChange={e => setWlForm(p => ({ ...p, primaryColor: e.target.value }))}
                className="w-10 h-10 bg-slate-800 border border-slate-700 rounded-lg cursor-pointer" />
              <button onClick={handleAddWL} className="px-4 py-2 bg-blue-600 rounded-lg text-xs font-bold text-white">Add</button>
            </div>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            <table className="w-full text-xs"><thead><tr className="border-b border-slate-800">
              <th className="text-left px-3 py-2 text-slate-500">Company</th>
              <th className="text-left px-3 py-2 text-slate-500">Domain</th>
              <th className="text-left px-3 py-2 text-slate-500">Branding</th>
            </tr></thead><tbody>
              {(wlCustomers?.data || []).map((c: any) => (
                <tr key={c._id} className="border-b border-slate-800/50">
                  <td className="px-3 py-2 font-bold text-white">{c.companyName}</td>
                  <td className="px-3 py-2 text-slate-400">{c.customDomain || '—'}</td>
                  <td className="px-3 py-2"><div className="w-4 h-4 rounded" style={{ backgroundColor: c.primaryColor }} /></td>
                </tr>
              ))}
              {(wlCustomers?.data || []).length === 0 && (
                <tr><td colSpan={3} className="px-3 py-6 text-center text-slate-500">No clients yet</td></tr>
              )}
            </tbody></table>
          </div>
        </div>
      )}

      {/* ── MARKETING FUNNEL ── */}
      {activeFeature === 'marketing' && (
        <div className="space-y-4">
          {campaignAnalytics && (
            <div className="grid grid-cols-4 gap-3">
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-center">
                <p className="text-xl font-black text-orange-400">{campaignAnalytics.totalCampaigns}</p>
                <p className="text-[9px] text-slate-500">Campaigns</p>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-center">
                <p className="text-xl font-black text-emerald-400">{campaignAnalytics.activeCount}</p>
                <p className="text-[9px] text-slate-500">Active</p>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-center">
                <p className="text-xl font-black text-blue-400">{campaignAnalytics.totalSent}</p>
                <p className="text-[9px] text-slate-500">Sent</p>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-center">
                <p className="text-xl font-black text-purple-400">{campaignAnalytics.avgOpenRate}%</p>
                <p className="text-[9px] text-slate-500">Open Rate</p>
              </div>
            </div>
          )}
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            <table className="w-full text-xs"><thead><tr className="border-b border-slate-800">
              <th className="text-left px-3 py-2 text-slate-500">Campaign</th>
              <th className="text-left px-3 py-2 text-slate-500">Type</th>
              <th className="text-left px-3 py-2 text-slate-500">Steps</th>
              <th className="text-left px-3 py-2 text-slate-500">Status</th>
              <th className="text-right px-3 py-2 text-slate-500">Action</th>
            </tr></thead><tbody>
              {(campaigns || []).map((c: any) => (
                <tr key={c._id} className="border-b border-slate-800/50">
                  <td className="px-3 py-2 font-bold text-white">{c.name}</td>
                  <td className="px-3 py-2 text-slate-400 capitalize">{c.type}</td>
                  <td className="px-3 py-2 text-slate-400">{c.steps?.length || 0}</td>
                  <td className="px-3 py-2"><span className={`px-2 py-0.5 rounded text-[10px] font-bold ${statusColors[c.status] || ''}`}>{c.status}</span></td>
                  <td className="px-3 py-2 text-right">
                    {c.status === 'draft' && <button onClick={() => activateCampaign({ campaignId: c._id })} className="px-2 py-1 bg-emerald-600 rounded text-[10px] text-white">Go</button>}
                    {c.status === 'active' && <button onClick={() => pauseCampaign({ campaignId: c._id })} className="px-2 py-1 bg-yellow-600 rounded text-[10px] text-white">Pause</button>}
                  </td>
                </tr>
              ))}
              {(campaigns || []).length === 0 && (
                <tr><td colSpan={5} className="px-3 py-6 text-center text-slate-500">No campaigns</td></tr>
              )}
            </tbody></table>
          </div>
        </div>
      )}

      {/* ── VOICE & VIDEO ── */}
      {activeFeature === 'voice' && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <h4 className="text-xs font-black text-white mb-3">Agent Media Config</h4>
            <div className="flex flex-wrap gap-2 mb-4">
              {Object.entries(AGENT_NAMES).map(([id, name]) => (
                <button key={id} onClick={() => setSelectedAgent(id)}
                  className={`px-2 py-1 rounded text-[10px] font-bold ${selectedAgent === id ? 'bg-orange-500 text-white' : 'bg-slate-800 text-slate-400'}`}>{name.split(' ')[0]}</button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] text-slate-500 font-bold mb-2">Avatar</p>
                <div className="grid grid-cols-2 gap-2">
                  {(avatarPresets || []).map((a: any) => (
                    <button key={a.id} onClick={() => setSelAvatar(a.id)}
                      className={`p-2 rounded-lg border text-left text-[10px] ${selAvatar === a.id ? 'border-orange-500 bg-orange-500/10' : 'border-slate-700 bg-slate-800'}`}>
                      <span className="font-bold text-white">{a.name}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-[10px] text-slate-500 font-bold mb-2">Voice</p>
                <div className="grid grid-cols-2 gap-2">
                  {(voicePresets || []).map((v: any) => (
                    <button key={v.id} onClick={() => setSelVoice(v.id)}
                      className={`p-2 rounded-lg border text-left text-[10px] ${selVoice === v.id ? 'border-orange-500 bg-orange-500/10' : 'border-slate-700 bg-slate-800'}`}>
                      <span className="font-bold text-white">{v.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <button onClick={() => saveMediaConfig({ agentId: selectedAgent, avatarPreset: selAvatar, voicePreset: selVoice, lipSync: true })}
              className="mt-3 px-4 py-2 bg-orange-600 rounded-lg text-xs font-bold text-white">Save for {AGENT_NAMES[selectedAgent]}</button>
          </div>
          <div className="grid grid-cols-5 gap-2">
            {Object.entries(AGENT_NAMES).map(([id, name]) => {
              const cfg = agentConfigs?.[id]
              return (
                <div key={id} className="bg-slate-900 border border-slate-800 rounded-lg p-2 text-center">
                  <p className="text-[9px] font-bold text-white">{name.split(' ')[0]}</p>
                  <p className="text-[8px] text-slate-500">{cfg ? `${cfg.avatarPreset}/${cfg.voicePreset.split('_')[0]}` : '—'}</p>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── DYNAMIC PRICING ── */}
      {activeFeature === 'pricing' && (
        <div className="space-y-4">
          {pricingAnalytics && (
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-center">
                <p className="text-xl font-black text-orange-400">{pricingAnalytics.activeRules}</p>
                <p className="text-[9px] text-slate-500">Active Rules</p>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-center">
                <p className="text-xl font-black text-emerald-400">₦{(pricingAnalytics.avgDailyRevenue || 0).toLocaleString()}</p>
                <p className="text-[9px] text-slate-500">Avg Revenue</p>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-center">
                <p className="text-xl font-black text-blue-400">₦{(pricingAnalytics.potentialUplift || 0).toLocaleString()}</p>
                <p className="text-[9px] text-slate-500">Potential Uplift</p>
              </div>
            </div>
          )}
          <div className="space-y-2">
            {(pricingRules || []).map((rule: any) => {
              const enabled = pricingStates?.[rule.id] !== false
              return (
                <div key={rule.id} className={`flex items-center justify-between p-3 rounded-xl border ${enabled ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-slate-700 bg-slate-800/50'}`}>
                  <div>
                    <p className="text-xs font-bold text-white">{rule.name}</p>
                    <p className="text-[9px] text-slate-500">{rule.description}</p>
                  </div>
                  <button onClick={() => togglePricingRule({ ruleId: rule.id, enabled: !enabled })}
                    className={`w-10 h-5 rounded-full transition-all relative ${enabled ? 'bg-emerald-500' : 'bg-slate-700'}`}>
                    <div className={`w-4 h-4 bg-white rounded-full absolute top-0.5 transition-all ${enabled ? 'left-5' : 'left-0.5'}`} />
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── BLOCKCHAIN ── */}
      {activeFeature === 'blockchain' && (
        <div className="space-y-4">
          {verifyStats && (
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-center">
                <p className="text-xl font-black text-orange-400">{verifyStats.totalRecords}</p>
                <p className="text-[9px] text-slate-500">Records</p>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-center">
                <p className="text-xl font-black text-emerald-400">{Object.keys(verifyStats.byType || {}).length}</p>
                <p className="text-[9px] text-slate-500">Types</p>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-center">
                <p className="text-xl font-black text-blue-400">{verifyStats.lastRecord ? new Date(verifyStats.lastRecord).toLocaleDateString() : '—'}</p>
                <p className="text-[9px] text-slate-500">Last Record</p>
              </div>
            </div>
          )}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <div className="flex gap-2">
              <select value={verifyData.type} onChange={e => setVerifyData(p => ({ ...p, type: e.target.value }))}
                className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-2 text-xs text-white">
                <option value="transaction">Transaction</option><option value="contract">Contract</option>
                <option value="audit">Audit</option><option value="identity">Identity</option>
              </select>
              <input value={verifyData.data} onChange={e => setVerifyData(p => ({ ...p, data: e.target.value }))}
                placeholder="Data to verify..." className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500" />
              <button onClick={handleVerify} className="px-4 py-2 bg-orange-600 rounded-lg text-xs font-bold text-white">Verify</button>
            </div>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden max-h-64 overflow-y-auto">
            <table className="w-full text-xs"><thead><tr className="border-b border-slate-800">
              <th className="text-left px-3 py-2 text-slate-500">Type</th>
              <th className="text-left px-3 py-2 text-slate-500">Hash</th>
              <th className="text-left px-3 py-2 text-slate-500">Time</th>
            </tr></thead><tbody>
              {(verifications || []).map((r: any) => (
                <tr key={r._id} className="border-b border-slate-800/50">
                  <td className="px-3 py-2"><span className="px-2 py-0.5 bg-orange-500/10 text-orange-400 rounded text-[10px] font-bold capitalize">{r.type}</span></td>
                  <td className="px-3 py-2 text-slate-500 font-mono text-[10px]">{r.hash}</td>
                  <td className="px-3 py-2 text-slate-400">{new Date(r.timestamp).toLocaleString()}</td>
                </tr>
              ))}
            </tbody></table>
          </div>
        </div>
      )}

      {/* ── PREDICTIVE ANALYTICS ── */}
      {activeFeature === 'predictive' && (
        <div className="space-y-4">
          {analyticsSummary && (
            <div className="grid grid-cols-4 gap-3">
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-center">
                <p className="text-xl font-black text-orange-400">{analyticsSummary.totalInteractions}</p>
                <p className="text-[9px] text-slate-500">Interactions</p>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-center">
                <p className="text-xl font-black text-red-400">{analyticsSummary.totalEscalations}</p>
                <p className="text-[9px] text-slate-500">Escalations</p>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-center">
                <p className="text-xl font-black text-blue-400">{analyticsSummary.avgResponseTime}ms</p>
                <p className="text-[9px] text-slate-500">Avg Response</p>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-center">
                <p className="text-xl font-black text-emerald-400">{analyticsSummary.confidenceCounts.high}</p>
                <p className="text-[9px] text-slate-500">High Confidence</p>
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            {churn && (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                <h4 className="text-xs font-black text-white mb-3">Churn Risk</h4>
                <div className="grid grid-cols-3 gap-2 mb-3">
                  <div className="bg-red-500/10 rounded-lg p-2 text-center"><p className="text-sm font-black text-red-400">{churn.summary.highRisk}</p><p className="text-[8px] text-slate-500">High</p></div>
                  <div className="bg-yellow-500/10 rounded-lg p-2 text-center"><p className="text-sm font-black text-yellow-400">{churn.summary.mediumRisk}</p><p className="text-[8px] text-slate-500">Medium</p></div>
                  <div className="bg-emerald-500/10 rounded-lg p-2 text-center"><p className="text-sm font-black text-emerald-400">{churn.summary.lowRisk}</p><p className="text-[8px] text-slate-500">Low</p></div>
                </div>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {churn.predictions.slice(0, 5).map((p: any) => (
                    <div key={p.userId} className="flex items-center justify-between bg-slate-800 rounded px-2 py-1">
                      <span className="text-[9px] text-slate-400">{p.userId.slice(0, 10)}...</span>
                      <div className="flex items-center gap-1">
                        <div className="w-12 h-1 bg-slate-700 rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${p.riskScore}%`, backgroundColor: p.riskLevel === 'high' ? '#ef4444' : p.riskLevel === 'medium' ? '#f59e0b' : '#10b981' }} />
                        </div>
                        <span className="text-[9px] font-bold text-white">{p.riskScore}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {revenueForecast && (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                <h4 className="text-xs font-black text-white mb-3">Revenue Forecast</h4>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div className="bg-slate-800 rounded-lg p-2 text-center"><p className="text-sm font-black text-emerald-400">₦{(revenueForecast.currentMRR || 0).toLocaleString()}</p><p className="text-[8px] text-slate-500">MRR</p></div>
                  <div className="bg-slate-800 rounded-lg p-2 text-center"><p className="text-sm font-black text-blue-400">{revenueForecast.growthRate || 0}%</p><p className="text-[8px] text-slate-500">Growth</p></div>
                </div>
                <div className="space-y-1">
                  {(revenueForecast.forecast || []).slice(0, 4).map((f: any) => (
                    <div key={f.month} className="flex items-center justify-between">
                      <span className="text-[9px] text-slate-400">M{f.month}</span>
                      <span className="text-[9px] font-bold text-white">₦{f.projected.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
