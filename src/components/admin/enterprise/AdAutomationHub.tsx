import { useState, useMemo } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../../convex/_generated/api'

const PLATFORMS = [
  { id: 'linkedin', name: 'LinkedIn', icon: '💼', color: '#0077B5' },
  { id: 'facebook', name: 'Facebook', icon: '📘', color: '#1877F2' },
  { id: 'instagram', name: 'Instagram', icon: '📸', color: '#E4405F' },
  { id: 'youtube', name: 'YouTube', icon: '🎬', color: '#FF0000' },
  { id: 'reddit', name: 'Reddit', icon: '🤖', color: '#FF4500' },
  { id: 'threads', name: 'Threads', icon: '🧵', color: '#000000' },
  { id: 'telegram', name: 'Telegram', icon: '✈️', color: '#26A5E4' },
  { id: 'discord', name: 'Discord', icon: '🎮', color: '#5865F2' },
]

const TABS = [
  { id: 'overview', label: '📊 Overview', },
  { id: 'orchestrator', label: '🎯 Unified Orchestrator', },
  { id: 'campaigns', label: '🚀 AI Campaigns', },
  { id: 'budget', label: '💰 Budget Optimizer', },
  { id: 'abtest', label: '🧪 A/B Testing', },
  { id: 'compliance', label: '🛡️ Compliance', },
  { id: 'accounts', label: '🔗 Ad Accounts', },
  { id: 'analytics', label: '📈 Analytics', },
  { id: 'monetization', label: '💎 Revenue', },
]

const PLAN_TIERS = [
  { name: 'Basic', fee: '₦150,000', successFee: '10%', platforms: 2, color: 'bg-blue-500' },
  { name: 'Pro', fee: '₦400,000', successFee: '5%', platforms: 5, color: 'bg-purple-500' },
  { name: 'Enterprise', fee: '₦1,250,000', successFee: '3%', platforms: 8, color: 'bg-amber-500' },
]

export default function AdAutomationHub({ adminToken }: { adminToken: string }) {
  const [activeTab, setActiveTab] = useState('overview')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Ad Automation Engine</h2>
          <p className="text-gray-400 text-sm">AI-powered campaigns, budget optimization & monetization</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.id ? 'bg-blue-600 text-white shadow-lg' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && <OverviewTab adminToken={adminToken} />}
      {activeTab === 'orchestrator' && <OrchestratorTab adminToken={adminToken} />}
      {activeTab === 'campaigns' && <CampaignsTab adminToken={adminToken} />}
      {activeTab === 'budget' && <BudgetTab adminToken={adminToken} />}
      {activeTab === 'abtest' && <ABTestTab adminToken={adminToken} />}
      {activeTab === 'compliance' && <ComplianceTab adminToken={adminToken} />}
      {activeTab === 'accounts' && <AccountsTab adminToken={adminToken} />}
      {activeTab === 'analytics' && <AnalyticsTab adminToken={adminToken} />}
      {activeTab === 'monetization' && <MonetizationTab adminToken={adminToken} />}
    </div>
  )
}

function OrchestratorTab({ adminToken }: { adminToken: string }) {
  const status = useQuery(api.unifiedOrchestrator.getOrchestratorStatus)
  const toggleOrchestrator = useMutation(api.unifiedOrchestrator.toggleOrchestrator)
  const togglePlatform = useMutation(api.unifiedOrchestrator.togglePlatform)
  const [toast, setToast] = useState<string | null>(null)

  const handleToggle = async (enabled: boolean) => {
    await toggleOrchestrator({ enabled, autoGenerate: true, autoPost: true, adminToken })
    setToast(enabled ? 'Orchestrator enabled!' : 'Orchestrator disabled!')
    setTimeout(() => setToast(null), 3000)
  }

  const handlePlatformToggle = async (platformId: string, enabled: boolean) => {
    await togglePlatform({ platformId, enabled, adminToken })
    setToast(`${platformId} ${enabled ? 'enabled' : 'disabled'}!`)
    setTimeout(() => setToast(null), 3000)
  }

  const platforms = [
    { id: 'twitter', name: 'Twitter/X', icon: '🐦', times: '8AM, 12PM, 6PM' },
    { id: 'linkedin', name: 'LinkedIn', icon: '💼', times: '8AM, 12PM, 5PM' },
    { id: 'facebook', name: 'Facebook', icon: '📘', times: '9AM, 1PM, 7PM' },
    { id: 'instagram', name: 'Instagram', icon: '📸', times: '11AM, 2PM, 7PM' },
    { id: 'threads', name: 'Threads', icon: '🧵', times: '8AM, 12PM, 6PM' },
    { id: 'tiktok', name: 'TikTok', icon: '🎵', times: '10AM, 3PM, 8PM' },
    { id: 'youtube', name: 'YouTube', icon: '📺', times: '2PM, 6PM, 9PM' },
    { id: 'pinterest', name: 'Pinterest', icon: '📌', times: '9AM, 2PM, 8PM' },
    { id: 'reddit', name: 'Reddit', icon: '🤖', times: '8AM, 12PM, 6PM' },
    { id: 'bluesky', name: 'Bluesky', icon: '🦋', times: '8AM, 12PM, 6PM' },
    { id: 'telegram', name: 'Telegram', icon: '✈️', times: '9AM, 1PM, 7PM' },
    { id: 'discord', name: 'Discord', icon: '🎮', times: '10AM, 3PM, 8PM' },
  ]

  return (
    <div className="space-y-6">
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-emerald-500/90 text-white px-5 py-3 rounded-xl shadow-lg text-sm font-medium">
          ✓ {toast}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">🎯 Unified Advert Orchestrator</h2>
          <p className="text-gray-400 text-sm">Automated posting across all platforms on schedule</p>
        </div>
        <div className="flex items-center gap-4">
          <span className={`text-sm font-medium ${status?.enabled ? 'text-green-400' : 'text-gray-400'}`}>
            {status?.enabled ? '✓ Active' : '○ Inactive'}
          </span>
          <button
            onClick={() => handleToggle(!status?.enabled)}
            className={`px-6 py-3 rounded-xl font-bold text-sm transition-all ${
              status?.enabled
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-green-600 hover:bg-green-700 text-white'
            }`}
          >
            {status?.enabled ? 'Disable Orchestrator' : 'Enable Orchestrator'}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/10 border border-blue-500/30 rounded-xl p-4">
          <div className="text-2xl mb-1">📤</div>
          <div className="text-2xl font-bold text-white">{status?.totalPosted || 0}</div>
          <div className="text-xs text-gray-400">Total Posted</div>
        </div>
        <div className="bg-gradient-to-br from-green-500/20 to-green-600/10 border border-green-500/30 rounded-xl p-4">
          <div className="text-2xl mb-1">📅</div>
          <div className="text-2xl font-bold text-white">{status?.totalGenerated || 0}</div>
          <div className="text-xs text-gray-400">Content Generated</div>
        </div>
        <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/10 border border-purple-500/30 rounded-xl p-4">
          <div className="text-2xl mb-1">🔗</div>
          <div className="text-2xl font-bold text-white">{status?.platforms?.filter((p: any) => p.enabled).length || 0}</div>
          <div className="text-xs text-gray-400">Active Platforms</div>
        </div>
        <div className="bg-gradient-to-br from-amber-500/20 to-amber-600/10 border border-amber-500/30 rounded-xl p-4">
          <div className="text-2xl mb-1">⏰</div>
          <div className="text-2xl font-bold text-white">3x/day</div>
          <div className="text-xs text-gray-400">Posting Frequency</div>
        </div>
      </div>

      {/* Platform Grid */}
      <div>
        <h3 className="text-lg font-bold text-white mb-3">Connected Platforms</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {platforms.map((platform) => {
            const isEnabled = status?.platforms?.find((p: any) => p.id === platform.id)?.enabled ?? false
            return (
              <div
                key={platform.id}
                className={`p-4 rounded-xl border transition-all ${
                  isEnabled
                    ? 'bg-white/5 border-green-500/30'
                    : 'bg-gray-900 border-gray-700 opacity-60'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{platform.icon}</span>
                    <span className="text-white font-medium text-sm">{platform.name}</span>
                  </div>
                  <button
                    onClick={() => handlePlatformToggle(platform.id, !isEnabled)}
                    className={`w-10 h-6 rounded-full transition-all ${
                      isEnabled ? 'bg-green-500' : 'bg-gray-600'
                    }`}
                  >
                    <div className={`w-4 h-4 bg-white rounded-full transition-transform ml-1 ${
                      isEnabled ? 'translate-x-4' : 'translate-x-0'
                    }`} />
                  </button>
                </div>
                <div className="text-xs text-gray-400">
                  <span className="text-gray-500">Schedule:</span> {platform.times}
                </div>
                <div className={`text-xs mt-2 font-medium ${isEnabled ? 'text-green-400' : 'text-gray-500'}`}>
                  {isEnabled ? '✓ Active' : '○ Disabled'}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* How It Works */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
        <h3 className="text-lg font-bold text-white mb-4">How It Works</h3>
        <div className="grid grid-cols-5 gap-4">
          {[
            { step: '1', icon: '🤖', label: 'AI Generates Content', desc: 'Headlines, descriptions, CTAs' },
            { step: '2', icon: '🎨', label: 'Flyer Engine Creates Visuals', desc: 'Eye-catching graphics' },
            { step: '3', icon: '📅', label: 'TryPost Schedules', desc: 'Optimal posting times' },
            { step: '4', icon: '📤', label: 'Posts to Platforms', desc: '12 platforms simultaneously' },
            { step: '5', icon: '📈', label: 'Track Analytics', desc: 'Impressions, clicks, engagement' },
          ].map((item) => (
            <div key={item.step} className="text-center p-4 bg-white/5 rounded-xl">
              <div className="text-3xl mb-2">{item.icon}</div>
              <div className="text-white font-bold text-sm mb-1">{item.label}</div>
              <div className="text-xs text-gray-400">{item.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Revenue Projection */}
      <div className="bg-gradient-to-br from-green-500/10 to-green-600/5 border border-green-500/20 rounded-2xl p-6">
        <h3 className="text-lg font-bold text-white mb-4">💰 Revenue Projection</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-3xl font-bold text-green-400">₦2,936</div>
            <div className="text-xs text-gray-400">Daily Ad Revenue</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-green-400">₦88,080</div>
            <div className="text-xs text-gray-400">Monthly Ad Revenue</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-green-400">₦1,056,960</div>
            <div className="text-xs text-gray-400">Annual Ad Revenue</div>
          </div>
        </div>
      </div>
    </div>
  )
}

function OverviewTab({ adminToken }: { adminToken: string }) {
  const stats = useQuery(api.ad_analytics_agg.getOverallStats, { adminToken })
  const campaigns = useQuery(api.ad_campaign_ai.listAICampaigns, { adminToken })
  const plans = useQuery(api.ad_monetization.listPlans)
  const revenue = useQuery(api.ad_monetization.getRevenueStats, { adminToken })

  if (!stats) return <div className="text-gray-400 p-8 text-center">Loading...</div>

  const statCards = [
    { label: 'Total Campaigns', value: stats.campaigns || 0, icon: '🚀', color: 'from-blue-500 to-blue-700' },
    { label: 'Active Campaigns', value: stats.activeCampaigns || 0, icon: '✅', color: 'from-green-500 to-green-700' },
    { label: 'Total Impressions', value: (stats.impressions || 0).toLocaleString(), icon: '👁️', color: 'from-purple-500 to-purple-700' },
    { label: 'Total Clicks', value: (stats.clicks || 0).toLocaleString(), icon: '👆', color: 'from-amber-500 to-amber-700' },
    { label: 'CTR', value: `${stats.ctr || 0}%`, icon: '📈', color: 'from-cyan-500 to-cyan-700' },
    { label: 'Total Spend', value: `₦${(stats.spend || 0).toLocaleString()}`, icon: '💰', color: 'from-red-500 to-red-700' },
  ]

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {statCards.map((s) => (
          <div key={s.label} className={`bg-gradient-to-br ${s.color} rounded-xl p-4 text-white`}>
            <div className="text-2xl mb-1">{s.icon}</div>
            <div className="text-2xl font-bold">{s.value}</div>
            <div className="text-xs opacity-80">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
          <h3 className="text-lg font-semibold text-white mb-4">Recent Campaigns</h3>
          {(!campaigns || campaigns.length === 0) ? (
            <p className="text-gray-500">No campaigns yet. Create your first AI campaign!</p>
          ) : (
            <div className="space-y-3">
              {campaigns.slice(0, 5).map((c: any) => (
                <div key={c._id} className="flex items-center justify-between bg-gray-800 rounded-lg p-3">
                  <div>
                    <div className="text-white font-medium">{c.name}</div>
                    <div className="text-gray-400 text-xs">{c.platform} • ₦{(c.budget || 0).toLocaleString()}</div>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    c.status === 'active' ? 'bg-green-900 text-green-300' :
                    c.status === 'paused' ? 'bg-yellow-900 text-yellow-300' :
                    c.status === 'completed' ? 'bg-blue-900 text-blue-300' :
                    'bg-gray-700 text-gray-300'
                  }`}>
                    {c.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
          <h3 className="text-lg font-semibold text-white mb-4">Revenue Summary</h3>
          {revenue ? (
            <div className="space-y-3">
              <div className="flex justify-between"><span className="text-gray-400">Total Revenue</span><span className="text-white font-bold">₦{revenue.totalRevenue.toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">Paid</span><span className="text-green-400">₦{revenue.paidRevenue.toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">Pending</span><span className="text-yellow-400">₦{revenue.pendingRevenue.toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">Overdue</span><span className="text-red-400">₦{revenue.overdueRevenue.toLocaleString()}</span></div>
              <div className="flex justify-between border-t border-gray-700 pt-2"><span className="text-gray-400">Invoices</span><span className="text-white">{revenue.paidInvoices}/{revenue.totalInvoices} paid</span></div>
            </div>
          ) : <p className="text-gray-500">Loading...</p>}
        </div>
      </div>

      <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
        <h3 className="text-lg font-semibold text-white mb-4">Pricing Plans</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {PLAN_TIERS.map((plan) => (
            <div key={plan.name} className="bg-gray-800 rounded-xl p-5 border border-gray-700">
              <div className={`${plan.color} text-white text-center py-2 rounded-lg font-bold mb-3`}>{plan.name}</div>
              <div className="text-center mb-3">
                <div className="text-2xl font-bold text-white">{plan.fee}<span className="text-sm text-gray-400">/mo</span></div>
                <div className="text-sm text-gray-400">+ {plan.successFee} success fee</div>
              </div>
              <div className="text-sm text-gray-300">Up to {plan.platforms} platforms</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function CampaignsTab({ adminToken }: { adminToken: string }) {
  const [showWizard, setShowWizard] = useState(false)
  const [industry, setIndustry] = useState('')
  const [budget, setBudget] = useState('')
  const [audience, setAudience] = useState('')
  const [goal, setGoal] = useState('')
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(['linkedin', 'facebook'])
  const [generating, setGenerating] = useState(false)
  const [result, setResult] = useState<any>(null)

  const generateCampaign = useMutation(api.ad_campaign_ai.generateAdCampaign)
  const saveCampaign = useMutation(api.ad_campaign_ai.saveCampaignFromAI)
  const campaigns = useQuery(api.ad_campaign_ai.listAICampaigns, { adminToken })

  const handleGenerate = async () => {
    if (!industry || !budget || !audience) return
    setGenerating(true)
    try {
      const r = await generateCampaign({
        adminToken, industry, budgetNgn: parseInt(budget),
        targetAudience: audience, platforms: selectedPlatforms,
        campaignGoal: goal || 'Brand awareness and lead generation',
      })
      setResult(r)
    } catch (e: any) { setResult({ error: e.message }) }
    setGenerating(false)
  }

  const handleSave = async () => {
    if (!result?.campaign) return
    try {
      await saveCampaign({
        adminToken, campaignData: result.campaign, industry,
        budgetNgn: parseInt(budget), targetAudience: audience, platforms: selectedPlatforms,
      })
      setShowWizard(false)
      setResult(null)
    } catch (e: any) { alert(e.message) }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">AI Campaign Generator</h3>
        <button onClick={() => setShowWizard(!showWizard)} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          {showWizard ? '✕ Close' : '+ New AI Campaign'}
        </button>
      </div>

      {showWizard && (
        <div className="bg-gray-900 rounded-xl p-6 border border-gray-800 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Industry</label>
              <input value={industry} onChange={(e) => setIndustry(e.target.value)} placeholder="e.g., Fintech, Healthcare, E-commerce" className="w-full bg-gray-800 text-white rounded-lg px-4 py-2 border border-gray-700" />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Monthly Budget (₦)</label>
              <input value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="e.g., 500000" type="number" className="w-full bg-gray-800 text-white rounded-lg px-4 py-2 border border-gray-700" />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Target Audience</label>
              <input value={audience} onChange={(e) => setAudience(e.target.value)} placeholder="e.g., Tech-savvy professionals 25-45" className="w-full bg-gray-800 text-white rounded-lg px-4 py-2 border border-gray-700" />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Campaign Goal</label>
              <input value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="e.g., Lead generation, Brand awareness" className="w-full bg-gray-800 text-white rounded-lg px-4 py-2 border border-gray-700" />
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">Platforms</label>
            <div className="flex flex-wrap gap-2">
              {PLATFORMS.map((p) => (
                <button key={p.id} onClick={() => setSelectedPlatforms((prev) => prev.includes(p.id) ? prev.filter((x) => x !== p.id) : [...prev, p.id])}
                  className={`px-3 py-1.5 rounded-lg text-sm border transition-all ${selectedPlatforms.includes(p.id) ? 'border-blue-500 bg-blue-900/30 text-blue-300' : 'border-gray-700 bg-gray-800 text-gray-400'}`}>
                  {p.icon} {p.name}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={handleGenerate} disabled={generating || !industry || !budget} className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50">
              {generating ? '⏳ Generating...' : '🤖 Generate with AI'}
            </button>
          </div>

          {result && (
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              {result.error ? (
                <div className="text-red-400">Error: {result.error}</div>
              ) : result.campaign ? (
                <div className="space-y-3">
                  <div className="text-white font-semibold">{result.campaign.campaignName}</div>
                  <div className="text-gray-300 text-sm">{result.campaign.campaignDescription}</div>
                  {result.campaign.platformStrategies && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                      {Object.entries(result.campaign.platformStrategies).map(([platform, strategy]: [string, any]) => (
                        <div key={platform} className="bg-gray-900 rounded-lg p-3 border border-gray-700">
                          <div className="text-blue-400 font-medium capitalize">{platform}</div>
                          <div className="text-sm text-gray-300 mt-1">{strategy.adCopy?.headline}</div>
                          <div className="text-xs text-gray-400 mt-1">{strategy.adCopy?.description}</div>
                          <div className="text-xs text-green-400 mt-1">Budget: {strategy.budgetPercent}%</div>
                        </div>
                      ))}
                    </div>
                  )}
                  <button onClick={handleSave} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">💾 Save Campaign</button>
                </div>
              ) : null}
            </div>
          )}
        </div>
      )}

      <div className="space-y-3">
        {(!campaigns || campaigns.length === 0) ? (
          <div className="bg-gray-900 rounded-xl p-8 text-center border border-gray-800">
            <div className="text-4xl mb-3">🚀</div>
            <div className="text-gray-400">No campaigns yet. Click "New AI Campaign" to get started!</div>
          </div>
        ) : (
          campaigns.map((c: any) => (
            <div key={c._id} className="bg-gray-900 rounded-xl p-4 border border-gray-800 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="text-2xl">{PLATFORMS.find((p) => p.id === c.platform)?.icon || '📢'}</div>
                <div>
                  <div className="text-white font-medium">{c.name}</div>
                  <div className="text-gray-400 text-sm">{c.platform} • ₦{(c.budget || 0).toLocaleString()}/mo • {c.targetAudience || 'All audiences'}</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  c.status === 'active' ? 'bg-green-900 text-green-300' :
                  c.status === 'paused' ? 'bg-yellow-900 text-yellow-300' :
                  c.status === 'completed' ? 'bg-blue-900 text-blue-300' :
                  'bg-gray-700 text-gray-300'
                }`}>{c.status}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

function BudgetTab({ adminToken }: { adminToken: string }) {
  const [campaignId, setCampaignId] = useState('')
  const campaigns = useQuery(api.ad_campaign_ai.listAICampaigns, { adminToken })
  const budgetRules = useQuery(api.ad_budget.getBudgetRules, adminToken && campaignId ? { adminToken, campaignId: campaignId as any } : 'skip')
  const optimize = useMutation(api.ad_budget.optimizeBudgets)
  const [optimizing, setOptimizing] = useState(false)
  const [lastResult, setLastResult] = useState<any>(null)

  const activeCampaigns = campaigns?.filter((c: any) => c.status === 'active' || c.status === 'paused') || []

  const handleOptimize = async () => {
    if (!campaignId) return
    setOptimizing(true)
    try {
      const r = await optimize({ adminToken, campaignId: campaignId as any })
      setLastResult(r)
    } catch (e: any) { setLastResult({ error: e.message }) }
    setOptimizing(false)
  }

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-white">Cross-Platform Budget Optimizer</h3>

      <div className="flex items-center gap-4">
        <select value={campaignId} onChange={(e) => setCampaignId(e.target.value)} className="bg-gray-800 text-white rounded-lg px-4 py-2 border border-gray-700 min-w-[300px]">
          <option value="">Select campaign...</option>
          {activeCampaigns.map((c: any) => <option key={c._id} value={c._id}>{c.name} ({c.platform})</option>)}
        </select>
        <button onClick={handleOptimize} disabled={!campaignId || optimizing} className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50">
          {optimizing ? '⏳ Optimizing...' : '⚡ Auto-Optimize'}
        </button>
      </div>

      {lastResult && (
        <div className={`rounded-xl p-4 border ${lastResult.error ? 'bg-red-900/20 border-red-800' : 'bg-green-900/20 border-green-800'}`}>
          {lastResult.error ? <div className="text-red-400">{lastResult.error}</div> : (
            <div>
              <div className="text-green-400 font-medium mb-2">✅ Optimization Complete</div>
              {lastResult.updates?.map((u: any, i: number) => (
                <div key={i} className="text-sm text-gray-300">
                  {u.platform}: ₦{u.oldBudget.toLocaleString()} → ₦{u.newBudget.toLocaleString()} ({u.change > 0 ? '+' : ''}{u.change.toLocaleString()})
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {budgetRules && budgetRules.length > 0 && (
        <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
          <h4 className="text-white font-medium mb-4">Current Budget Allocation</h4>
          <div className="space-y-3">
            {budgetRules.map((rule: any) => {
              const totalBudget = budgetRules.reduce((s: number, r: any) => s + r.currentDailyBudget, 0)
              const percent = totalBudget > 0 ? Math.round(rule.currentDailyBudget / totalBudget * 100) : 0
              const p = PLATFORMS.find((pp) => pp.id === rule.platform)
              return (
                <div key={rule._id} className="flex items-center gap-4">
                  <span className="text-xl w-8">{p?.icon || '📢'}</span>
                  <div className="flex-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-white">{rule.platform}</span>
                      <span className="text-gray-400">₦{rule.currentDailyBudget.toLocaleString()}/day ({percent}%)</span>
                    </div>
                    <div className="w-full bg-gray-800 rounded-full h-2 mt-1">
                      <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${percent}%` }} />
                    </div>
                    <div className="text-xs text-gray-500 mt-1">Min: ₦{rule.minDailyBudget.toLocaleString()} | Max: ₦{rule.maxDailyBudget.toLocaleString()} | Auto: {rule.autoOptimize ? '✅' : '❌'}</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

function ABTestTab({ adminToken }: { adminToken: string }) {
  const [showCreate, setShowCreate] = useState(false)
  const [testName, setTestName] = useState('')
  const [testType, setTestType] = useState<any>('creative')
  const [campaignId, setCampaignId] = useState('')
  const [variants, setVariants] = useState([
    { name: 'Variant A', adCopy: '', headline: '', cta: 'Learn More', budgetPercent: 50 },
    { name: 'Variant B', adCopy: '', headline: '', cta: 'Get Started', budgetPercent: 50 },
  ])

  const campaigns = useQuery(api.ad_campaign_ai.listAICampaigns, { adminToken })
  const tests = useQuery(api.ad_abtest.listABTests, { adminToken, campaignId: campaignId || undefined })
  const createTest = useMutation(api.ad_abtest.createABTest)
  const pauseTest = useMutation(api.ad_abtest.pauseABTest)
  const resumeTest = useMutation(api.ad_abtest.resumeABTest)

  const handleCreate = async () => {
    if (!campaignId || !testName || variants.length < 2) return
    try {
      await createTest({ adminToken, campaignId: campaignId as any, name: testName, testType, variants })
      setShowCreate(false)
      setTestName('')
    } catch (e: any) { alert(e.message) }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">A/B Testing Engine</h3>
        <button onClick={() => setShowCreate(!showCreate)} className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
          {showCreate ? '✕ Close' : '+ New Test'}
        </button>
      </div>

      {showCreate && (
        <div className="bg-gray-900 rounded-xl p-6 border border-gray-800 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Test Name</label>
              <input value={testName} onChange={(e) => setTestName(e.target.value)} className="w-full bg-gray-800 text-white rounded-lg px-4 py-2 border border-gray-700" />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Campaign</label>
              <select value={campaignId} onChange={(e) => setCampaignId(e.target.value)} className="w-full bg-gray-800 text-white rounded-lg px-4 py-2 border border-gray-700">
                <option value="">Select...</option>
                {campaigns?.map((c: any) => <option key={c._id} value={c._id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Test Type</label>
              <select value={testType} onChange={(e) => setTestType(e.target.value)} className="w-full bg-gray-800 text-white rounded-lg px-4 py-2 border border-gray-700">
                {['creative', 'headline', 'cta', 'audience', 'budget_split'].map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>

          <div className="space-y-3">
            <label className="block text-sm text-gray-400">Variants</label>
            {variants.map((v, i) => (
              <div key={i} className="bg-gray-800 rounded-lg p-3 flex gap-3 items-center">
                <input value={v.name} onChange={(e) => { const nv = [...variants]; nv[i].name = e.target.value; setVariants(nv) }} className="bg-gray-700 text-white rounded px-3 py-1 text-sm w-32" />
                <input value={v.headline} onChange={(e) => { const nv = [...variants]; nv[i].headline = e.target.value; setVariants(nv) }} placeholder="Headline" className="bg-gray-700 text-white rounded px-3 py-1 text-sm flex-1" />
                <input value={v.cta} onChange={(e) => { const nv = [...variants]; nv[i].cta = e.target.value; setVariants(nv) }} placeholder="CTA" className="bg-gray-700 text-white rounded px-3 py-1 text-sm w-32" />
                <input value={v.budgetPercent} onChange={(e) => { const nv = [...variants]; nv[i].budgetPercent = parseInt(e.target.value) || 0; setVariants(nv) }} type="number" className="bg-gray-700 text-white rounded px-3 py-1 text-sm w-20" />
                <span className="text-gray-400 text-sm">%</span>
              </div>
            ))}
            <button onClick={() => setVariants([...variants, { name: `Variant ${String.fromCharCode(65 + variants.length)}`, adCopy: '', headline: '', cta: '', budgetPercent: 0 }])} className="text-blue-400 text-sm hover:text-blue-300">+ Add Variant</button>
          </div>

          <button onClick={handleCreate} className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">🚀 Create Test</button>
        </div>
      )}

      <div className="space-y-3">
        {(!tests || tests.length === 0) ? (
          <div className="bg-gray-900 rounded-xl p-8 text-center border border-gray-800">
            <div className="text-4xl mb-3">🧪</div>
            <div className="text-gray-400">No A/B tests yet</div>
          </div>
        ) : (
          tests.map((t: any) => (
            <div key={t._id} className="bg-gray-900 rounded-xl p-4 border border-gray-800">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-white font-medium">{t.name}</div>
                  <div className="text-gray-400 text-sm">{t.testType} • Confidence: {t.confidenceLevel}%</div>
                </div>
                <div className="flex gap-2">
                  <span className={`px-3 py-1 rounded-full text-xs ${t.status === 'running' ? 'bg-green-900 text-green-300' : t.status === 'completed' ? 'bg-blue-900 text-blue-300' : 'bg-gray-700 text-gray-300'}`}>{t.status}</span>
                  {t.status === 'running' && <button onClick={() => pauseTest({ adminToken, testId: t._id })} className="text-yellow-400 text-sm">⏸</button>}
                  {t.status === 'paused' && <button onClick={() => resumeTest({ adminToken, testId: t._id })} className="text-green-400 text-sm">▶️</button>}
                </div>
              </div>
              {t.winnerVariantId && <div className="mt-2 text-green-400 text-sm">🏆 Winner: {t.winnerVariantId}</div>}
            </div>
          ))
        )}
      </div>
    </div>
  )
}

function ComplianceTab({ adminToken }: { adminToken: string }) {
  const [adCopy, setAdCopy] = useState('')
  const [headline, setHeadline] = useState('')
  const [platform, setPlatform] = useState('all')
  const [checkResult, setCheckResult] = useState<any>(null)
  const [checking, setChecking] = useState(false)

  const seedRules = useMutation(api.ad_compliance.seedDefaultRules)
  const checkCompliance = useMutation(api.ad_compliance.checkCompliance)

  const handleCheck = async () => {
    if (!adCopy) return
    setChecking(true)
    try {
      const r = await checkCompliance({ adminToken, adCopy, headline, platform })
      setCheckResult(r)
    } catch (e: any) { setCheckResult({ error: e.message }) }
    setChecking(false)
  }

  const handleSeed = async () => {
    try { await seedRules({ adminToken }); alert('Default rules seeded!') } catch (e: any) { alert(e.message) }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Compliance & Safety Filter</h3>
        <button onClick={handleSeed} className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 text-sm">📋 Seed Default Rules</button>
      </div>

      <div className="bg-gray-900 rounded-xl p-6 border border-gray-800 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Headline</label>
            <input value={headline} onChange={(e) => setHeadline(e.target.value)} className="w-full bg-gray-800 text-white rounded-lg px-4 py-2 border border-gray-700" />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Platform</label>
            <select value={platform} onChange={(e) => setPlatform(e.target.value)} className="w-full bg-gray-800 text-white rounded-lg px-4 py-2 border border-gray-700">
              <option value="all">All Platforms</option>
              {PLATFORMS.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Ad Copy</label>
          <textarea value={adCopy} onChange={(e) => setAdCopy(e.target.value)} rows={4} className="w-full bg-gray-800 text-white rounded-lg px-4 py-2 border border-gray-700" placeholder="Enter your ad copy to check compliance..." />
        </div>
        <button onClick={handleCheck} disabled={!adCopy || checking} className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50">
          {checking ? '⏳ Checking...' : '🛡️ Check Compliance'}
        </button>
      </div>

      {checkResult && (
        <div className={`rounded-xl p-6 border ${checkResult.passed ? 'bg-green-900/20 border-green-800' : 'bg-red-900/20 border-red-800'}`}>
          <div className="flex items-center gap-3 mb-3">
            <span className="text-3xl">{checkResult.passed ? '✅' : '❌'}</span>
            <div>
              <div className={`text-lg font-bold ${checkResult.passed ? 'text-green-400' : 'text-red-400'}`}>
                Score: {checkResult.score}/100
              </div>
              <div className="text-gray-400 text-sm">
                {checkResult.blockedCount} blocks, {checkResult.warningCount} warnings
              </div>
            </div>
          </div>
          {checkResult.violations?.length > 0 && (
            <div className="space-y-2 mt-4">
              {checkResult.violations.map((v: any, i: number) => (
                <div key={i} className={`rounded-lg p-3 text-sm ${v.severity === 'block' ? 'bg-red-900/30 text-red-300' : 'bg-yellow-900/30 text-yellow-300'}`}>
                  <div className="font-medium">{v.ruleName} ({v.severity})</div>
                  <div className="text-xs opacity-80">{v.message}</div>
                  {v.suggestion && <div className="text-xs mt-1 opacity-70">💡 {v.suggestion}</div>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function AccountsTab({ adminToken }: { adminToken: string }) {
  const adAccounts = [
    { platform: 'Meta Business Manager', icon: '📘', fields: ['Business Manager ID', 'Access Token'], status: 'disconnected' },
    { platform: 'Google Ads', icon: '🔍', fields: ['Customer ID', 'Developer Token'], status: 'disconnected' },
    { platform: 'TikTok Ads', icon: '🎵', fields: ['Advertiser ID', 'Access Token'], status: 'disconnected' },
    { platform: 'LinkedIn Campaign Manager', icon: '💼', fields: ['Account ID', 'Access Token'], status: 'disconnected' },
    { platform: 'Twitter Ads', icon: '🐦', fields: ['Account ID', 'Access Token'], status: 'disconnected' },
    { platform: 'Pinterest Ads', icon: '📌', fields: ['Ad Account ID', 'Access Token'], status: 'disconnected' },
    { platform: 'Snapchat Ads', icon: '👻', fields: ['Ad Account ID', 'Access Token'], status: 'disconnected' },
    { platform: 'YouTube Ads', icon: '🎬', fields: ['Google Ads Customer ID'], status: 'disconnected' },
  ]

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-white">Ad Account Connections</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {adAccounts.map((acc) => (
          <div key={acc.platform} className="bg-gray-900 rounded-xl p-5 border border-gray-800">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{acc.icon}</span>
                <div className="text-white font-medium">{acc.platform}</div>
              </div>
              <span className="px-2 py-1 rounded text-xs bg-gray-700 text-gray-400">{acc.status}</span>
            </div>
            <div className="space-y-2">
              {acc.fields.map((f) => (
                <input key={f} placeholder={f} className="w-full bg-gray-800 text-white rounded px-3 py-1.5 text-sm border border-gray-700" />
              ))}
            </div>
            <button className="mt-3 w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">🔗 Connect</button>
          </div>
        ))}
      </div>
    </div>
  )
}

function AnalyticsTab({ adminToken }: { adminToken: string }) {
  const [campaignId, setCampaignId] = useState('')
  const campaigns = useQuery(api.ad_campaign_ai.listAICampaigns, { adminToken })
  const analytics = useQuery(api.ad_analytics_agg.getCampaignAnalytics, campaignId ? { campaignId: campaignId as any, days: 30 } : 'skip')
  const snapshots = useQuery(api.ad_analytics_agg.getSnapshots, campaignId ? { campaignId: campaignId as any, days: 7 } : 'skip')
  const genRecs = useMutation(api.ad_analytics_agg.generateRecommendations)
  const recs = useQuery(api.ad_analytics_agg.getRecommendations, campaignId ? { campaignId: campaignId as any } : 'skip')

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-white">Campaign Analytics</h3>

      <div className="flex items-center gap-4">
        <select value={campaignId} onChange={(e) => setCampaignId(e.target.value)} className="bg-gray-800 text-white rounded-lg px-4 py-2 border border-gray-700 min-w-[300px]">
          <option value="">Select campaign...</option>
          {campaigns?.map((c: any) => <option key={c._id} value={c._id}>{c.name}</option>)}
        </select>
        {campaignId && <button onClick={() => genRecs({ adminToken, campaignId: campaignId as any })} className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm">🤖 Generate Insights</button>}
      </div>

      {analytics && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {[
            { label: 'Impressions', value: analytics.totals.impressions.toLocaleString(), icon: '👁️' },
            { label: 'Clicks', value: analytics.totals.clicks.toLocaleString(), icon: '👆' },
            { label: 'CTR', value: `${analytics.totals.ctr}%`, icon: '📈' },
            { label: 'CPC', value: `₦${analytics.totals.cpc}`, icon: '💰' },
            { label: 'CPA', value: `₦${analytics.totals.cpa}`, icon: '🎯' },
            { label: 'Conversions', value: analytics.totals.conversions.toLocaleString(), icon: '✅' },
            { label: 'Spend', value: `₦${analytics.totals.spend.toLocaleString()}`, icon: '💳' },
          ].map((s) => (
            <div key={s.label} className="bg-gray-900 rounded-xl p-4 border border-gray-800 text-center">
              <div className="text-xl mb-1">{s.icon}</div>
              <div className="text-white font-bold">{s.value}</div>
              <div className="text-gray-400 text-xs">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {recs && recs.length > 0 && (
        <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
          <h4 className="text-white font-medium mb-3">AI Recommendations</h4>
          <div className="space-y-2">
            {recs.map((r: any) => (
              <div key={r._id} className={`rounded-lg p-3 border ${r.applied ? 'bg-green-900/10 border-green-800' : 'bg-gray-800 border-gray-700'}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <span className={`text-xs px-2 py-0.5 rounded ${r.impact === 'high' ? 'bg-red-900 text-red-300' : r.impact === 'medium' ? 'bg-yellow-900 text-yellow-300' : 'bg-gray-700 text-gray-300'}`}>{r.impact}</span>
                    <span className="text-white font-medium ml-2">{r.title}</span>
                  </div>
                  {r.applied && <span className="text-green-400 text-xs">✅ Applied</span>}
                </div>
                <div className="text-gray-400 text-sm mt-1">{r.description}</div>
                {r.estimatedImprovement && <div className="text-blue-400 text-xs mt-1">📈 {r.estimatedImprovement}</div>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function MonetizationTab({ adminToken }: { adminToken: string }) {
  const plans = useQuery(api.ad_monetization.listPlans)
  const revenue = useQuery(api.ad_monetization.getRevenueStats, { adminToken })
  const invoices = useQuery(api.ad_monetization.getInvoices, { limit: 20 })
  const seedPlans = useMutation(api.ad_monetization.seedPlans)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Ad Monetization & Billing</h3>
        <button onClick={() => seedPlans({ adminToken })} className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 text-sm">📋 Seed Plans</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {PLAN_TIERS.map((tier) => (
          <div key={tier.name} className="bg-gray-900 rounded-xl p-5 border border-gray-800">
            <div className={`${tier.color} text-white text-center py-2 rounded-lg font-bold mb-3`}>{tier.name}</div>
            <div className="text-center mb-3">
              <div className="text-2xl font-bold text-white">{tier.fee}<span className="text-sm text-gray-400">/mo</span></div>
              <div className="text-sm text-gray-400">+ {tier.successFee} success fee</div>
            </div>
            <div className="text-sm text-gray-300 text-center">Up to {tier.platforms} platforms</div>
          </div>
        ))}
      </div>

      {revenue && (
        <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
          <h4 className="text-white font-medium mb-4">Revenue Summary</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center"><div className="text-2xl font-bold text-green-400">₦{revenue.paidRevenue.toLocaleString()}</div><div className="text-xs text-gray-400">Collected</div></div>
            <div className="text-center"><div className="text-2xl font-bold text-yellow-400">₦{revenue.pendingRevenue.toLocaleString()}</div><div className="text-xs text-gray-400">Pending</div></div>
            <div className="text-center"><div className="text-2xl font-bold text-red-400">₦{revenue.overdueRevenue.toLocaleString()}</div><div className="text-xs text-gray-400">Overdue</div></div>
            <div className="text-center"><div className="text-2xl font-bold text-white">₦{revenue.totalRevenue.toLocaleString()}</div><div className="text-xs text-gray-400">Total</div></div>
          </div>
        </div>
      )}

      {invoices && invoices.length > 0 && (
        <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
          <h4 className="text-white font-medium mb-4">Recent Invoices</h4>
          <div className="space-y-2">
            {invoices.map((inv: any) => (
              <div key={inv._id} className="flex items-center justify-between bg-gray-800 rounded-lg p-3">
                <div>
                  <div className="text-white text-sm">{inv.companyId} • {inv.period}</div>
                  <div className="text-gray-400 text-xs">{inv.planName} • Flat: ₦{inv.flatFeeNgn.toLocaleString()} + Success: ₦{inv.successFeeNgn.toLocaleString()}</div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-white font-bold">₦{inv.totalNgn.toLocaleString()}</span>
                  <span className={`px-2 py-1 rounded text-xs ${inv.status === 'paid' ? 'bg-green-900 text-green-300' : inv.status === 'overdue' ? 'bg-red-900 text-red-300' : 'bg-yellow-900 text-yellow-300'}`}>{inv.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
