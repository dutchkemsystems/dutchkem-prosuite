import { useState } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'

export function MarketingAutomationDashboard({ adminToken }: { adminToken: string }) {
  const [activeTab, setActiveTab] = useState<'overview' | 'leads' | 'campaigns' | 'conversion'>('overview')

  const dashboard: any = useQuery(api.marketing_automation.getRevenueDashboard)
  const leads: any = useQuery(api.marketing_automation.getLeads, {})
  const campaigns: any = useQuery(api.marketing_automation.getAutomatedSequences)
  const leaderboard: any = useQuery(api.marketing_automation.getLeadLeaderboard)

  if (!dashboard || !leads || !campaigns) {
    return (
      <div className="space-y-6">
        <h2 className="text-xl font-black">📈 Marketing Automation</h2>
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  const tabs = [
    { id: 'overview' as const, label: 'Overview', icon: '📊' },
    { id: 'leads' as const, label: 'Leads', icon: '👥' },
    { id: 'campaigns' as const, label: 'Campaigns', icon: '📧' },
    { id: 'conversion' as const, label: 'Conversion', icon: '🎯' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-black">📈 Marketing Automation</h2>
        <p className="text-xs text-slate-400 mt-1">Lead capture, nurturing, conversion, and revenue tracking</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <KPICard label="Total Leads" value={dashboard.totalLeads} icon="👥" color="blue" />
        <KPICard label="Monthly Leads" value={dashboard.monthlyLeads} icon="📈" color="emerald" />
        <KPICard label="Conversion Rate" value={`${dashboard.conversionRate}%`} icon="🎯" color="amber" />
        <KPICard label="Active Campaigns" value={dashboard.activeCampaigns} icon="📧" color="purple" />
        <KPICard label="Avg Lead Score" value={dashboard.avgLeadScore} icon="⭐" color="cyan" />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-800 rounded-xl p-1">
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === tab.id ? 'bg-orange-500 text-white' : 'text-slate-400 hover:text-white'
            }`}>
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Lead Sources */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <h3 className="text-sm font-bold mb-4">Lead Sources</h3>
            <div className="space-y-3">
              {Object.entries(dashboard.sourceDistribution || {}).map(([source, count]: [string, any]) => (
                <div key={source} className="flex items-center gap-3">
                  <span className="text-lg">{getSourceIcon(source)}</span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold capitalize">{source}</span>
                      <span className="text-[10px] text-slate-500">{count} leads</span>
                    </div>
                    <div className="w-full h-2 bg-slate-800 rounded-full mt-1">
                      <div className="h-full bg-orange-500 rounded-full" style={{
                        width: `${dashboard.totalLeads > 0 ? (count / dashboard.totalLeads) * 100 : 0}%`
                      }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Lead Status */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <h3 className="text-sm font-bold mb-4">Lead Status</h3>
            <div className="space-y-3">
              {Object.entries(dashboard.statusDistribution || {}).map(([status, count]: [string, any]) => (
                <div key={status} className="flex items-center justify-between bg-slate-800 rounded-xl p-3">
                  <span className="text-xs font-bold capitalize">{status}</span>
                  <span className="text-xs text-slate-500">{count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Leads Tab */}
      {activeTab === 'leads' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <h3 className="text-sm font-bold mb-4">Recent Leads ({leads.length})</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-slate-500 border-b border-slate-800">
                  <th className="pb-2 font-bold">Name</th>
                  <th className="pb-2 font-bold">Email</th>
                  <th className="pb-2 font-bold">Source</th>
                  <th className="pb-2 font-bold">Status</th>
                  <th className="pb-2 font-bold">Date</th>
                </tr>
              </thead>
              <tbody>
                {leads.slice(0, 20).map((lead: any) => (
                  <tr key={lead._id} className="border-b border-slate-800/50">
                    <td className="py-2 font-bold">{lead.name || 'Anonymous'}</td>
                    <td className="py-2 text-slate-400">{lead.email || '-'}</td>
                    <td className="py-2">
                      <span className="px-2 py-0.5 bg-slate-800 rounded text-slate-300">{lead.source}</span>
                    </td>
                    <td className="py-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        lead.status === 'converted' ? 'bg-emerald-500/20 text-emerald-400' :
                        lead.status === 'qualified' ? 'bg-blue-500/20 text-blue-400' :
                        'bg-slate-800 text-slate-400'
                      }`}>
                        {lead.status}
                      </span>
                    </td>
                    <td className="py-2 text-slate-500">{new Date(lead.receivedAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Campaigns Tab */}
      {activeTab === 'campaigns' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <h3 className="text-sm font-bold mb-4">Automated Campaigns ({campaigns.length})</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {campaigns.map((campaign: any) => (
              <div key={campaign._id} className="bg-slate-800 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold">{campaign.name}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                    campaign.status === 'active' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700 text-slate-400'
                  }`}>
                    {campaign.status}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-[10px] text-slate-500">
                  <span>{campaign.type}</span>
                  <span>{campaign.stepCount} steps</span>
                  <span>{campaign.sentCount || 0} sent</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Conversion Tab */}
      {activeTab === 'conversion' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <h3 className="text-sm font-bold mb-4">Conversion Funnel</h3>
            <div className="space-y-3">
              <FunnelStep label="Total Leads" value={dashboard.totalLeads} color="blue" />
              <FunnelStep label="Contacted" value={dashboard.statusDistribution?.contacted || 0} color="cyan" />
              <FunnelStep label="Qualified" value={dashboard.statusDistribution?.qualified || 0} color="amber" />
              <FunnelStep label="Converted" value={dashboard.statusDistribution?.converted || 0} color="emerald" />
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <h3 className="text-sm font-bold mb-4">Top Leads by Score</h3>
            <div className="space-y-2">
              {leaderboard?.slice(0, 10).map((entry: any, i: number) => (
                <div key={entry._id} className="flex items-center gap-3 bg-slate-800 rounded-xl p-3">
                  <span className="text-sm font-bold text-slate-500">#{i + 1}</span>
                  <div className="flex-1">
                    <span className="text-xs font-bold">{entry.userId}</span>
                  </div>
                  <span className="text-xs font-bold text-orange-400">{entry.score}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function KPICard({ label, value, icon, color }: { label: string; value: string | number; icon: string; color: string }) {
  const colorMap: Record<string, string> = {
    emerald: 'text-emerald-400', amber: 'text-amber-400', blue: 'text-blue-400',
    purple: 'text-purple-400', cyan: 'text-cyan-400', slate: 'text-slate-400',
  }
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">{icon}</span>
        <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">{label}</span>
      </div>
      <p className={`text-2xl font-black ${colorMap[color] || 'text-white'}`}>{value}</p>
    </div>
  )
}

function FunnelStep({ label, value, color }: { label: string; value: number; color: string }) {
  const colorMap: Record<string, string> = {
    blue: 'bg-blue-500', cyan: 'bg-cyan-500', amber: 'bg-amber-500', emerald: 'bg-emerald-500',
  }
  return (
    <div className="bg-slate-800 rounded-xl p-3">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-bold">{label}</span>
        <span className="text-xs text-slate-400">{value}</span>
      </div>
      <div className="w-full h-2 bg-slate-700 rounded-full">
        <div className={`h-full rounded-full ${colorMap[color]}`} style={{ width: '100%' }} />
      </div>
    </div>
  )
}

function getSourceIcon(source: string): string {
  const icons: Record<string, string> = {
    facebook: '📘', instagram: '📸', linkedin: '💼', twitter: '🐦',
    web: '🌐', referral: '🤝', whatsapp: '📱', email: '📧',
  }
  return icons[source] || '📋'
}
