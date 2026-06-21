import { useState, useCallback } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'

type RevenueTab =
  | 'overview'
  | 'subscriptions'
  | 'agent_pricing'
  | 'enterprise_addons'
  | 'credits'
  | 'social'
  | 'marketplace'
  | 'outcomes'
  | 'whitelabel'
  | 'analytics'
  | 'commerce'
  | 'consulting'
  | 'api_access'
  | 'auto_engage'

const TABS: { id: RevenueTab; label: string; icon: string }[] = [
  { id: 'overview', label: 'Overview', icon: '📊' },
  { id: 'subscriptions', label: 'Subscriptions', icon: '💳' },
  { id: 'agent_pricing', label: 'Agent Pricing', icon: '🤖' },
  { id: 'enterprise_addons', label: 'Enterprise Add-ons', icon: '🏢' },
  { id: 'credits', label: 'Credits', icon: '💰' },
  { id: 'social', label: 'Social Commerce', icon: '📱' },
  { id: 'marketplace', label: 'Marketplace', icon: '🏪' },
  { id: 'outcomes', label: 'Outcome Pricing', icon: '🎯' },
  { id: 'whitelabel', label: 'White Label', icon: '🏷️' },
  { id: 'analytics', label: 'Analytics', icon: '📈' },
  { id: 'commerce', label: 'Commerce', icon: '🛒' },
  { id: 'consulting', label: 'Consulting', icon: '👨‍💼' },
  { id: 'api_access', label: 'API Access', icon: '🔑' },
  { id: 'auto_engage', label: 'Auto-Engage', icon: '🤖' },
]

function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  return (
    <div className="fixed top-4 right-4 z-50 bg-emerald-500/90 text-white px-5 py-3 rounded-xl shadow-lg shadow-emerald-500/20 text-sm font-medium backdrop-blur-sm animate-in slide-in-from-right">
      <div className="flex items-center gap-3">
        <span>✓</span>
        <span>{message}</span>
        <button onClick={onClose} className="ml-2 text-white/70 hover:text-white">✕</button>
      </div>
    </div>
  )
}

function StatCard({ icon, value, label, color = 'from-orange-500/20 to-orange-600/10' }: { icon: string; value: string | number; label: string; color?: string }) {
  return (
    <div className={`bg-gradient-to-br ${color} border border-white/10 rounded-2xl p-5 transition-all duration-300 hover:scale-[1.02] hover:border-white/20`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-2xl">{icon}</span>
      </div>
      <div className="text-3xl font-black">{value}</div>
      <div className="text-sm text-slate-400 mt-1">{label}</div>
    </div>
  )
}

function EmptyState({ icon, title, description }: { icon: string; title: string; description: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <span className="text-5xl mb-4">{icon}</span>
      <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
      <p className="text-slate-400 max-w-md">{description}</p>
    </div>
  )
}

function formatNgN(amount: number): string {
  return `₦${amount.toLocaleString()}`
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString('en-NG', { month: 'short', day: 'numeric', year: 'numeric' })
}

// ─── OVERVIEW TAB ─────────────────────────────────────────────

function OverviewTab({ adminToken }: { adminToken: string }) {
  const creditStats = useQuery(api.revenue_credits.getCreditStats, adminToken ? { adminToken } : 'skip')
  const socialStats = useQuery(api.revenue_social.getConversationStats, adminToken ? { adminToken } : 'skip')
  const listingStats = useQuery(api.revenue_marketplace.getListingStats, adminToken ? { adminToken } : 'skip')
  const outcomeStats = useQuery(api.revenue_outcomes.getOutcomeStats, adminToken ? { adminToken } : 'skip')
  const whiteLabelStats = useQuery(api.revenue_outcomes.getWhiteLabelStats, adminToken ? { adminToken } : 'skip')
  const analyticsOverview = useQuery(api.revenue_outcomes.getAnalyticsOverview, adminToken ? { adminToken } : 'skip')
  const consultingStats = useQuery(api.revenue_outcomes.getConsultingStats, adminToken ? { adminToken } : 'skip')
  const apiKeys = useQuery(api.revenue_outcomes.getApiKeys, adminToken ? { adminToken } : 'skip')

  const creditSales = creditStats?.recentPurchases ?? 0
  const marketplaceSales = listingStats?.totalRevenue ?? 0
  const whiteLabelClients = whiteLabelStats?.activeClients ?? 0
  const consultingRevenue = consultingStats?.totalRevenue ?? 0
  const apiUsers = (apiKeys ?? []).length
  const socialRevenue = socialStats?.totalRevenue ?? 0

  const totalMRR = (marketplaceSales + consultingRevenue + socialRevenue + (whiteLabelStats?.totalMonthlyRevenue ?? 0))

  const statCards = [
    { icon: '💰', value: formatNgN(creditSales), label: 'Credit Sales', color: 'from-orange-500/20 to-orange-600/10' },
    { icon: '🏪', value: formatNgN(marketplaceSales), label: 'Marketplace Sales', color: 'from-blue-500/20 to-blue-600/10' },
    { icon: '🏷️', value: whiteLabelClients, label: 'White Label Clients', color: 'from-purple-500/20 to-purple-600/10' },
    { icon: '👨‍💼', value: formatNgN(consultingRevenue), label: 'Consulting Revenue', color: 'from-emerald-500/20 to-emerald-600/10' },
    { icon: '🔑', value: apiUsers, label: 'API Users', color: 'from-cyan-500/20 to-cyan-600/10' },
    { icon: '📱', value: formatNgN(socialRevenue), label: 'Social Commerce Revenue', color: 'from-pink-500/20 to-pink-600/10' },
  ]

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-br from-[#FF6B35]/20 to-[#FF6B35]/5 border border-[#FF6B35]/30 rounded-2xl p-6">
        <div className="text-sm text-slate-400 mb-1">Total Monthly Recurring Revenue</div>
        <div className="text-4xl font-black text-[#FF6B35]">{formatNgN(totalMRR)}</div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {statCards.map((card) => (
          <StatCard key={card.label} icon={card.icon} value={card.value} label={card.label} color={card.color} />
        ))}
      </div>
    </div>
  )
}

// ─── CREDITS TAB ──────────────────────────────────────────────

function CreditsTab({ adminToken }: { adminToken: string }) {
  const stats = useQuery(api.revenue_credits.getCreditStats, adminToken ? { adminToken } : 'skip')
  const plans = useQuery(api.revenue_credits.getCreditPlans)
  const costs = useQuery(api.revenue_credits.getCreditCosts)
  const purchases = useQuery(api.revenue_credits.getAllPurchases, adminToken ? { adminToken } : 'skip')

  const planList = [
    { id: 'starter', name: 'Starter', price: '₦5,000', credits: '500 credits', bonus: '+0 bonus', icon: '🚀' },
    { id: 'pro', name: 'Pro', price: '₦20,000', credits: '2,500 credits', bonus: '+400 bonus', icon: '⚡' },
    { id: 'business', name: 'Business', price: '₦50,000', credits: '7,000 credits', bonus: '+1,500 bonus', icon: '💼' },
    { id: 'enterprise', name: 'Enterprise', price: '₦120,000', credits: '20,000 credits', bonus: '+5,000 bonus', icon: '🏢' },
  ]

  const costEntries = costs ? Object.entries(costs as Record<string, number>) : []

  const actionLabels: Record<string, string> = {
    agent_message: 'Agent Message',
    document_upload: 'Document Upload',
    voice_call_minute: 'Voice Call (min)',
    flyer_generation: 'Flyer Generation',
    social_post: 'Social Post',
    research_task: 'Research Task',
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon="👥" value={stats?.totalUsers ?? 0} label="Total Users" color="from-orange-500/20 to-orange-600/10" />
        <StatCard icon="💰" value={stats?.totalPurchased ?? 0} label="Total Purchased" color="from-blue-500/20 to-blue-600/10" />
        <StatCard icon="📉" value={stats?.totalUsed ?? 0} label="Total Used" color="from-emerald-500/20 to-emerald-600/10" />
        <StatCard icon="🔄" value={formatNgN(stats?.recentPurchases ?? 0)} label="30-Day Spend" color="from-purple-500/20 to-purple-600/10" />
      </div>

      <div>
        <h3 className="text-lg font-bold text-white mb-3">Credit Plans</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {planList.map((plan) => (
            <div key={plan.id} className="bg-white/5 border border-white/10 rounded-2xl p-5 hover:border-white/20 transition-all">
              <span className="text-2xl">{plan.icon}</span>
              <div className="text-xl font-bold text-white mt-3">{plan.name}</div>
              <div className="text-[#FF6B35] font-black text-lg mt-1">{plan.price}</div>
              <div className="text-sm text-slate-400 mt-1">{plan.credits}</div>
              <div className="text-xs text-emerald-400 mt-1">{plan.bonus}</div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-lg font-bold text-white mb-3">Credit Costs</h3>
        <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
          <div className="grid grid-cols-[1fr_auto] px-5 py-3 border-b border-white/5 text-sm text-slate-400 font-medium">
            <div>Action</div>
            <div>Credits</div>
          </div>
          {costEntries.map(([action, credits]: [string, number]) => (
            <div key={action} className="grid grid-cols-[1fr_auto] px-5 py-3 border-b border-white/5 hover:bg-white/5 transition-colors">
              <div className="text-white text-sm">{actionLabels[action] ?? action}</div>
              <div className="text-[#FF6B35] font-bold text-sm">{credits}</div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-lg font-bold text-white mb-3">Recent Purchases</h3>
        <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
          <div className="grid grid-cols-[1fr_auto_auto_auto] px-5 py-3 border-b border-white/5 text-sm text-slate-400 font-medium">
            <div>User</div>
            <div>Plan</div>
            <div>Credits</div>
            <div>Date</div>
          </div>
          {(purchases ?? []).slice(0, 20).map((p: any, i: number) => (
            <div key={p._id ?? i} className="grid grid-cols-[1fr_auto_auto_auto] px-5 py-3 border-b border-white/5 hover:bg-white/5 transition-colors text-sm">
              <div className="text-white truncate max-w-[160px]">{p.userId}</div>
              <div className="text-slate-300">{p.priceNgN ? formatNgN(p.priceNgN) : '—'}</div>
              <div className="text-[#FF6B35] font-bold">{p.amount ?? '—'}</div>
              <div className="text-slate-400">{p.createdAt ? formatDate(p.createdAt) : '—'}</div>
            </div>
          ))}
          {(!purchases || purchases.length === 0) && (
            <div className="px-5 py-8 text-center text-slate-500 text-sm">No purchases yet</div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── SOCIAL COMMERCE TAB ──────────────────────────────────────

function SocialTab({ adminToken }: { adminToken: string }) {
  const stats = useQuery(api.revenue_social.getConversationStats, adminToken ? { adminToken } : 'skip')
  const dmRules = useQuery(api.revenue_social.getDmRules, adminToken ? { adminToken } : 'skip')
  const conversations = useQuery(api.revenue_social.getConversations, adminToken ? { adminToken } : 'skip')
  const toggleDmRule = useMutation(api.revenue_social.toggleDmRule)
  const deleteDmRule = useMutation(api.revenue_social.deleteDmRule)
  const addDmRule = useMutation(api.revenue_social.addDmRule)

  const [showAddRule, setShowAddRule] = useState(false)
  const [newKeywords, setNewKeywords] = useState('')
  const [newResponse, setNewResponse] = useState('')
  const [toast, setToast] = useState<string | null>(null)

  const showToast = useCallback((msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }, [])

  const handleAddRule = async () => {
    if (!newKeywords.trim() || !newResponse.trim()) return
    const keywords = newKeywords.split(',').map((k) => k.trim()).filter(Boolean)
    await addDmRule({ triggerKeywords: keywords, responseTemplate: newResponse, adminToken })
    setNewKeywords('')
    setNewResponse('')
    setShowAddRule(false)
    showToast('DM rule added')
  }

  const handleToggle = async (ruleId: string, isActive: boolean) => {
    await toggleDmRule({ ruleId: ruleId as any, isActive: !isActive, adminToken })
    showToast(isActive ? 'Rule deactivated' : 'Rule activated')
  }

  const handleDelete = async (ruleId: string) => {
    await deleteDmRule({ ruleId: ruleId as any, adminToken })
    showToast('Rule deleted')
  }

  return (
    <div className="space-y-6">
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon="💬" value={stats?.totalConversations ?? 0} label="Conversations" color="from-blue-500/20 to-blue-600/10" />
        <StatCard icon="🎯" value={stats?.openConversations ?? 0} label="Intent Detected" color="from-orange-500/20 to-orange-600/10" />
        <StatCard icon="💰" value={formatNgN(stats?.totalRevenue ?? 0)} label="Revenue" color="from-emerald-500/20 to-emerald-600/10" />
        <StatCard icon="📈" value={`${stats?.conversionRate ?? 0}%`} label="Conversion Rate" color="from-purple-500/20 to-purple-600/10" />
      </div>

      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-white">DM Automation Rules</h3>
        <button
          onClick={() => setShowAddRule(!showAddRule)}
          className="bg-[#FF6B35] hover:bg-[#FF8255] text-white px-4 py-2 rounded-xl text-sm font-medium transition-all"
        >
          + Add Rule
        </button>
      </div>

      {showAddRule && (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4">
          <div>
            <label className="text-sm text-slate-400 mb-1 block">Trigger Keywords (comma-separated)</label>
            <input
              value={newKeywords}
              onChange={(e) => setNewKeywords(e.target.value)}
              placeholder="buy, price, how much"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#FF6B35]/50"
            />
          </div>
          <div>
            <label className="text-sm text-slate-400 mb-1 block">Response Template</label>
            <textarea
              value={newResponse}
              onChange={(e) => setNewResponse(e.target.value)}
              placeholder="Thanks for your interest! Check out..."
              rows={3}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#FF6B35]/50 resize-none"
            />
          </div>
          <div className="flex gap-2">
            <button onClick={handleAddRule} className="bg-[#FF6B35] hover:bg-[#FF8255] text-white px-4 py-2 rounded-xl text-sm font-medium transition-all">Save Rule</button>
            <button onClick={() => setShowAddRule(false)} className="bg-white/5 hover:bg-white/10 text-slate-300 px-4 py-2 rounded-xl text-sm font-medium transition-all">Cancel</button>
          </div>
        </div>
      )}

      <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
        <div className="grid grid-cols-[1fr_auto_auto_auto] px-5 py-3 border-b border-white/5 text-sm text-slate-400 font-medium">
          <div>Keywords</div>
          <div>Status</div>
          <div>Toggle</div>
          <div>Delete</div>
        </div>
        {(dmRules ?? []).map((rule: any) => (
          <div key={rule._id} className="grid grid-cols-[1fr_auto_auto_auto] px-5 py-3 border-b border-white/5 hover:bg-white/5 transition-colors items-center">
            <div className="text-white text-sm truncate max-w-[300px]">{rule.triggerKeywords?.join(', ') ?? '—'}</div>
            <div className={`text-xs font-medium px-2.5 py-1 rounded-full ${rule.isActive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-500/20 text-slate-400'}`}>
              {rule.isActive ? 'Active' : 'Inactive'}
            </div>
            <button onClick={() => handleToggle(rule._id, rule.isActive)} className="text-sm text-slate-400 hover:text-white transition-colors px-3">
              {rule.isActive ? '⏸' : '▶'}
            </button>
            <button onClick={() => handleDelete(rule._id)} className="text-sm text-red-400 hover:text-red-300 transition-colors px-3">🗑</button>
          </div>
        ))}
        {(!dmRules || dmRules.length === 0) && (
          <div className="px-5 py-8 text-center text-slate-500 text-sm">No DM rules configured</div>
        )}
      </div>

      <div>
        <h3 className="text-lg font-bold text-white mb-3">Recent Conversations</h3>
        <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
          <div className="grid grid-cols-[1fr_auto_auto_auto] px-5 py-3 border-b border-white/5 text-sm text-slate-400 font-medium">
            <div>Customer</div>
            <div>Platform</div>
            <div>Intent</div>
            <div>Status</div>
          </div>
          {(conversations ?? []).slice(0, 15).map((c: any) => (
            <div key={c._id} className="grid grid-cols-[1fr_auto_auto_auto] px-5 py-3 border-b border-white/5 hover:bg-white/5 transition-colors text-sm">
              <div className="text-white truncate max-w-[160px]">{c.customerHandle ?? '—'}</div>
              <div className="text-slate-300">{c.platform ?? '—'}</div>
              <div className="text-[#FF6B35] font-bold">{c.buyingIntentScore ?? 0}</div>
              <div className={`text-xs font-medium px-2.5 py-1 rounded-full ${c.status === 'converted' ? 'bg-emerald-500/20 text-emerald-400' : c.status === 'open' ? 'bg-blue-500/20 text-blue-400' : 'bg-slate-500/20 text-slate-400'}`}>
                {c.status ?? '—'}
              </div>
            </div>
          ))}
          {(!conversations || conversations.length === 0) && (
            <div className="px-5 py-8 text-center text-slate-500 text-sm">No conversations yet</div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── MARKETPLACE TAB ──────────────────────────────────────────

function MarketplaceTab({ adminToken }: { adminToken: string }) {
  const stats = useQuery(api.revenue_marketplace.getListingStats, adminToken ? { adminToken } : 'skip')
  const listings = useQuery(api.revenue_marketplace.getListings, adminToken ? { adminToken } : 'skip')
  const createListing = useMutation(api.revenue_marketplace.createListing)

  const [showForm, setShowForm] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', description: '', category: '', priceNgN: 0, agentId: '', pricingModel: 'one_time' as 'free' | 'one_time' | 'subscription' })

  const showToast = useCallback((msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }, [])

  const handleCreate = async () => {
    if (!form.name || !form.category || !form.agentId) return
    await createListing({ ...form, adminToken })
    setForm({ name: '', description: '', category: '', priceNgN: 0, agentId: '', pricingModel: 'one_time' })
    setShowForm(false)
    showToast('Listing created')
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
            <button onClick={handleCreate} className="bg-[#FF6B35] hover:bg-[#FF8255] text-white px-4 py-2 rounded-xl text-sm font-medium transition-all">Create</button>
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

// ─── OUTCOME PRICING TAB ──────────────────────────────────────

function OutcomesTab({ adminToken }: { adminToken: string }) {
  const rules = useQuery(api.revenue_outcomes.getOutcomeRules, adminToken ? { adminToken } : 'skip')
  const stats = useQuery(api.revenue_outcomes.getOutcomeStats, adminToken ? { adminToken } : 'skip')
  const updateRule = useMutation(api.revenue_outcomes.updateOutcomeRule)
  const [toast, setToast] = useState<string | null>(null)

  const showToast = useCallback((msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }, [])

  const handleToggle = async (ruleId: string, isActive: boolean) => {
    await updateRule({ ruleId: ruleId as any, isActive: !isActive, adminToken })
    showToast(isActive ? 'Rule deactivated' : 'Rule activated')
  }

  return (
    <div className="space-y-6">
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}

      <div className="grid grid-cols-3 gap-4">
        <StatCard icon="🎯" value={stats?.totalEvents ?? 0} label="Total Events" color="from-orange-500/20 to-orange-600/10" />
        <StatCard icon="💰" value={formatNgN(stats?.totalRevenue ?? 0)} label="Revenue" color="from-emerald-500/20 to-emerald-600/10" />
        <StatCard icon="⏳" value={stats?.pendingSettlements ?? 0} label="Pending Settlements" color="from-blue-500/20 to-blue-600/10" />
      </div>

      <div>
        <h3 className="text-lg font-bold text-white mb-3">Pricing Rules</h3>
        <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
          <div className="grid grid-cols-[1fr_1fr_auto_auto] px-5 py-3 border-b border-white/5 text-sm text-slate-400 font-medium">
            <div>Outcome Type</div>
            <div>Price</div>
            <div>Status</div>
            <div>Toggle</div>
          </div>
          {(rules ?? []).map((rule: any) => (
            <div key={rule._id} className="grid grid-cols-[1fr_1fr_auto_auto] px-5 py-3 border-b border-white/5 hover:bg-white/5 transition-colors text-sm items-center">
              <div className="text-white">{rule.outcomeType}</div>
              <div className="text-[#FF6B35] font-bold">{formatNgN(rule.priceNgN)}</div>
              <div className={`text-xs font-medium px-2.5 py-1 rounded-full ${rule.isActive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-500/20 text-slate-400'}`}>
                {rule.isActive ? 'Active' : 'Inactive'}
              </div>
              <button onClick={() => handleToggle(rule._id, rule.isActive)} className="text-sm text-slate-400 hover:text-white transition-colors px-3">
                {rule.isActive ? '⏸' : '▶'}
              </button>
            </div>
          ))}
          {(!rules || rules.length === 0) && (
            <div className="px-5 py-8 text-center text-slate-500 text-sm">No pricing rules configured</div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── WHITE LABEL TAB ──────────────────────────────────────────

function WhiteLabelTab({ adminToken }: { adminToken: string }) {
  const stats = useQuery(api.revenue_outcomes.getWhiteLabelStats, adminToken ? { adminToken } : 'skip')
  const customers = useQuery(api.revenue_outcomes.getWhiteLabelCustomers, adminToken ? { adminToken } : 'skip')
  const createCustomer = useMutation(api.revenue_outcomes.createWhiteLabelCustomer)

  const [showForm, setShowForm] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [form, setForm] = useState({ companyName: '', customDomain: '', primaryColor: '#FF6B35', secondaryColor: '#000000', setupFeePaid: 0, monthlyFee: 0 })

  const showToast = useCallback((msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }, [])

  const handleCreate = async () => {
    if (!form.companyName) return
    await createCustomer({ ...form, adminToken })
    setForm({ companyName: '', customDomain: '', primaryColor: '#FF6B35', secondaryColor: '#000000', setupFeePaid: 0, monthlyFee: 0 })
    setShowForm(false)
    showToast('Client added')
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
            <button onClick={handleCreate} className="bg-[#FF6B35] hover:bg-[#FF8255] text-white px-4 py-2 rounded-xl text-sm font-medium transition-all">Create</button>
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

// ─── ANALYTICS TAB ────────────────────────────────────────────

function AnalyticsTab({ adminToken }: { adminToken: string }) {
  const overview = useQuery(api.revenue_outcomes.getAnalyticsOverview, adminToken ? { adminToken } : 'skip')
  const metrics = useQuery(api.revenue_outcomes.getAllAgentMetrics, adminToken ? { adminToken } : 'skip')

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon="🤖" value={overview?.totalAgents ?? 0} label="Total Agents" color="from-blue-500/20 to-blue-600/10" />
        <StatCard icon="🔍" value={overview?.totalQueries ?? 0} label="Total Queries" color="from-orange-500/20 to-orange-600/10" />
        <StatCard icon="💰" value={formatNgN(overview?.totalRevenue ?? 0)} label="Revenue" color="from-emerald-500/20 to-emerald-600/10" />
        <StatCard icon="😊" value={(overview?.avgSatisfaction ?? 0).toFixed(1)} label="Avg Satisfaction" color="from-purple-500/20 to-purple-600/10" />
      </div>

      <div>
        <h3 className="text-lg font-bold text-white mb-3">Per-Agent Metrics</h3>
        <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
          <div className="grid grid-cols-[auto_1fr_1fr_1fr_1fr] px-5 py-3 border-b border-white/5 text-sm text-slate-400 font-medium">
            <div>Agent</div>
            <div>Queries</div>
            <div>Resolution</div>
            <div>Revenue</div>
            <div>Satisfaction</div>
          </div>
          {(metrics ?? []).map((m: any) => (
            <div key={m._id} className="grid grid-cols-[auto_1fr_1fr_1fr_1fr] px-5 py-3 border-b border-white/5 hover:bg-white/5 transition-colors text-sm">
              <div className="text-white font-medium">{m.agentId}</div>
              <div className="text-slate-300">{m.totalQueries ?? 0}</div>
              <div className="text-slate-300">{m.successfulResolutions ?? 0}</div>
              <div className="text-[#FF6B35] font-bold">{formatNgN(m.revenueGenerated ?? 0)}</div>
              <div className="text-emerald-400">{(m.userSatisfaction ?? 0).toFixed(1)}</div>
            </div>
          ))}
          {(!metrics || metrics.length === 0) && (
            <div className="px-5 py-8 text-center text-slate-500 text-sm">No agent metrics recorded yet</div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── COMMERCE TAB ─────────────────────────────────────────────

function CommerceTab() {
  return (
    <div className="space-y-6">
      <div className="bg-white/5 border border-white/10 rounded-2xl p-8">
        <div className="flex items-center gap-4 mb-6">
          <span className="text-4xl">🛒</span>
          <div>
            <h3 className="text-xl font-bold text-white">Conversational Commerce Orchestration</h3>
            <p className="text-sm text-slate-400 mt-1">Multi-channel commerce automation engine</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
            <div className="text-2xl font-black text-white">🟢</div>
            <div className="text-sm text-slate-400 mt-1">System Status</div>
            <div className="text-xs text-emerald-400 mt-1">Operational</div>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
            <div className="text-2xl font-black text-[#FF6B35]">Active</div>
            <div className="text-sm text-slate-400 mt-1">Channels</div>
            <div className="text-xs text-slate-500 mt-1">WhatsApp, Instagram, X</div>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
            <div className="text-2xl font-black text-white">24/7</div>
            <div className="text-sm text-slate-400 mt-1">Availability</div>
            <div className="text-xs text-slate-500 mt-1">Always-on commerce</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon="🛒" value="—" label="Orders Processed" color="from-blue-500/20 to-blue-600/10" />
        <StatCard icon="💬" value="—" label="Conversations" color="from-orange-500/20 to-orange-600/10" />
        <StatCard icon="💰" value="—" label="Revenue" color="from-emerald-500/20 to-emerald-600/10" />
        <StatCard icon="📈" value="—" label="Conversion Rate" color="from-purple-500/20 to-purple-600/10" />
      </div>

      <EmptyState icon="🛒" title="Commerce Pipeline" description="Conversational commerce orchestration data will appear here as orders flow through the system." />
    </div>
  )
}

// ─── CONSULTING TAB ───────────────────────────────────────────

function ConsultingTab({ adminToken }: { adminToken: string }) {
  const stats = useQuery(api.revenue_outcomes.getConsultingStats, adminToken ? { adminToken } : 'skip')
  const bookings = useQuery(api.revenue_outcomes.getConsultingBookings, adminToken ? { adminToken } : 'skip')

  const services = [
    { name: 'Setup & Configuration', price: formatNgN(200000), icon: '⚙️' },
    { name: 'Custom Agent Development', price: formatNgN(500000), icon: '🤖' },
    { name: 'Team Training', price: formatNgN(100000), icon: '📚' },
    { name: 'Monthly Retainer', price: formatNgN(300000), icon: '📅' },
    { name: 'Strategy Consulting', price: formatNgN(500000), icon: '🎯' },
  ]

  const statusColor: Record<string, string> = {
    pending: 'bg-yellow-500/20 text-yellow-400',
    completed: 'bg-emerald-500/20 text-emerald-400',
    cancelled: 'bg-red-500/20 text-red-400',
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon="📋" value={stats?.totalBookings ?? 0} label="Total Bookings" color="from-blue-500/20 to-blue-600/10" />
        <StatCard icon="⏳" value={stats?.pendingBookings ?? 0} label="Pending" color="from-yellow-500/20 to-yellow-600/10" />
        <StatCard icon="✅" value={stats?.completedBookings ?? 0} label="Completed" color="from-emerald-500/20 to-emerald-600/10" />
        <StatCard icon="💰" value={formatNgN(stats?.totalRevenue ?? 0)} label="Revenue" color="from-orange-500/20 to-orange-600/10" />
      </div>

      <div>
        <h3 className="text-lg font-bold text-white mb-3">Service Types</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {services.map((s) => (
            <div key={s.name} className="bg-white/5 border border-white/10 rounded-2xl p-5 hover:border-white/20 transition-all">
              <span className="text-2xl">{s.icon}</span>
              <div className="text-white font-bold mt-3">{s.name}</div>
              <div className="text-[#FF6B35] font-black mt-1">{s.price}</div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-lg font-bold text-white mb-3">Bookings</h3>
        <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
          <div className="grid grid-cols-[1fr_auto_auto_auto] px-5 py-3 border-b border-white/5 text-sm text-slate-400 font-medium">
            <div>Client</div>
            <div>Service</div>
            <div>Amount</div>
            <div>Status</div>
          </div>
          {(bookings ?? []).map((b: any) => (
            <div key={b._id} className="grid grid-cols-[1fr_auto_auto_auto] px-5 py-3 border-b border-white/5 hover:bg-white/5 transition-colors text-sm">
              <div className="text-white truncate max-w-[160px]">{b.clientId}</div>
              <div className="text-slate-300">{b.serviceType?.replace(/_/g, ' ')}</div>
              <div className="text-[#FF6B35] font-bold">{formatNgN(b.priceNgN ?? 0)}</div>
              <div className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusColor[b.status] ?? 'bg-slate-500/20 text-slate-400'}`}>{b.status}</div>
            </div>
          ))}
          {(!bookings || bookings.length === 0) && (
            <div className="px-5 py-8 text-center text-slate-500 text-sm">No bookings yet</div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── API ACCESS TAB ───────────────────────────────────────────

function ApiAccessTab({ adminToken }: { adminToken: string }) {
  const apiKeys = useQuery(api.revenue_outcomes.getApiKeys, adminToken ? { adminToken } : 'skip')
  const createKey = useMutation(api.revenue_outcomes.createApiKey)

  const [toast, setToast] = useState<string | null>(null)
  const [userId, setUserId] = useState('')
  const [tier, setTier] = useState<'developer' | 'professional' | 'business' | 'enterprise'>('developer')
  const [showForm, setShowForm] = useState(false)
  const [newKeyResult, setNewKeyResult] = useState<{ apiKey: string; apiSecret: string } | null>(null)

  const showToast = useCallback((msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }, [])

  const handleCreate = async () => {
    if (!userId) return
    const result = await createKey({ userId, tier, adminToken })
    if (result) {
      setNewKeyResult({ apiKey: result.apiKey, apiSecret: result.apiSecret })
    }
    setUserId('')
    setShowForm(false)
    showToast('API key generated')
  }

  const tiers = [
    { id: 'developer', name: 'Developer', price: formatNgN(10000), calls: '1,000/mo', icon: '👨‍💻' },
    { id: 'professional', name: 'Professional', price: formatNgN(50000), calls: '10,000/mo', icon: '💼' },
    { id: 'business', name: 'Business', price: formatNgN(200000), calls: '100,000/mo', icon: '🏢' },
    { id: 'enterprise', name: 'Enterprise', price: 'Custom', calls: '1,000,000/mo', icon: '🏛️' },
  ] as const

  const tierColor: Record<string, string> = {
    developer: 'from-blue-500/20 to-blue-600/10',
    professional: 'from-orange-500/20 to-orange-600/10',
    business: 'from-emerald-500/20 to-emerald-600/10',
    enterprise: 'from-purple-500/20 to-purple-600/10',
  }

  return (
    <div className="space-y-6">
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}

      <div>
        <h3 className="text-lg font-bold text-white mb-3">API Tiers</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {tiers.map((t) => (
            <div key={t.id} className={`bg-gradient-to-br ${tierColor[t.id]} border border-white/10 rounded-2xl p-5 hover:border-white/20 transition-all`}>
              <span className="text-2xl">{t.icon}</span>
              <div className="text-white font-bold mt-3">{t.name}</div>
              <div className="text-[#FF6B35] font-black mt-1">{t.price}</div>
              <div className="text-xs text-slate-400 mt-1">{t.calls}</div>
            </div>
          ))}
        </div>
      </div>

      {newKeyResult && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-emerald-400 font-bold text-sm">New API Key Generated</h4>
            <button onClick={() => setNewKeyResult(null)} className="text-emerald-400/70 hover:text-emerald-400 text-sm">✕</button>
          </div>
          <div className="space-y-2">
            <div>
              <span className="text-xs text-slate-400">API Key: </span>
              <span className="text-white font-mono text-sm">{newKeyResult.apiKey}</span>
            </div>
            <div>
              <span className="text-xs text-slate-400">API Secret: </span>
              <span className="text-white font-mono text-sm">{newKeyResult.apiSecret}</span>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-white">Active API Keys</h3>
        <button onClick={() => setShowForm(!showForm)} className="bg-[#FF6B35] hover:bg-[#FF8255] text-white px-4 py-2 rounded-xl text-sm font-medium transition-all">
          + Generate Key
        </button>
      </div>

      {showForm && (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-slate-400 mb-1 block">User ID</label>
              <input value={userId} onChange={(e) => setUserId(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#FF6B35]/50" />
            </div>
            <div>
              <label className="text-sm text-slate-400 mb-1 block">Tier</label>
              <select value={tier} onChange={(e) => setTier(e.target.value as any)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#FF6B35]/50">
                <option value="developer">Developer (₦10K)</option>
                <option value="professional">Professional (₦50K)</option>
                <option value="business">Business (₦200K)</option>
                <option value="enterprise">Enterprise (Custom)</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleCreate} className="bg-[#FF6B35] hover:bg-[#FF8255] text-white px-4 py-2 rounded-xl text-sm font-medium transition-all">Generate</button>
            <button onClick={() => setShowForm(false)} className="bg-white/5 hover:bg-white/10 text-slate-300 px-4 py-2 rounded-xl text-sm font-medium transition-all">Cancel</button>
          </div>
        </div>
      )}

      <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
        <div className="grid grid-cols-[1fr_auto_auto_auto] px-5 py-3 border-b border-white/5 text-sm text-slate-400 font-medium">
          <div>User</div>
          <div>Tier</div>
          <div>Usage</div>
          <div>Status</div>
        </div>
        {(apiKeys ?? []).map((k: any) => (
          <div key={k._id} className="grid grid-cols-[1fr_auto_auto_auto] px-5 py-3 border-b border-white/5 hover:bg-white/5 transition-colors text-sm">
            <div className="text-white truncate max-w-[160px]">{k.userId}</div>
            <div className="text-slate-300 capitalize">{k.tier}</div>
            <div className="text-[#FF6B35] font-bold">{k.callsUsed ?? 0} / {k.monthlyCallLimit ?? 0}</div>
            <div className={`text-xs font-medium px-2.5 py-1 rounded-full ${k.isActive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
              {k.isActive ? 'Active' : 'Revoked'}
            </div>
          </div>
        ))}
        {(!apiKeys || apiKeys.length === 0) && (
          <div className="px-5 py-8 text-center text-slate-500 text-sm">No API keys yet</div>
        )}
      </div>
    </div>
  )
}

// ─── AUTO-ENGAGE TAB ──────────────────────────────────────────

function AutoEngageTab({ adminToken }: { adminToken: string }) {
  const logs = useQuery(api.revenue_social.getEngagementLogs, adminToken ? { adminToken, limit: 100 } : 'skip')

  const totalEngagements = (logs ?? []).length
  const buyingIntent = (logs ?? []).filter((l: any) => (l.buyingIntent ?? 0) >= 40).length
  const autoReplied = (logs ?? []).filter((l: any) => l.autoReplied).length
  const converted = (logs ?? []).filter((l: any) => l.converted).length

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon="🤖" value={totalEngagements} label="Total Engagements" color="from-blue-500/20 to-blue-600/10" />
        <StatCard icon="🎯" value={buyingIntent} label="Buying Intent" color="from-orange-500/20 to-orange-600/10" />
        <StatCard icon="💬" value={autoReplied} label="Auto-Replied" color="from-emerald-500/20 to-emerald-600/10" />
        <StatCard icon="💰" value={converted} label="Converted" color="from-purple-500/20 to-purple-600/10" />
      </div>

      <div>
        <h3 className="text-lg font-bold text-white mb-3">Engagement Logs</h3>
        <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
          <div className="grid grid-cols-[auto_1fr_1fr_auto_auto_auto] px-5 py-3 border-b border-white/5 text-sm text-slate-400 font-medium">
            <div>Platform</div>
            <div>Comment</div>
            <div>Reply</div>
            <div>Intent</div>
            <div>Auto</div>
            <div>Converted</div>
          </div>
          {(logs ?? []).slice(0, 50).map((log: any) => (
            <div key={log._id} className="grid grid-cols-[auto_1fr_1fr_auto_auto_auto] px-5 py-3 border-b border-white/5 hover:bg-white/5 transition-colors text-sm">
              <div className="text-white">{log.platform}</div>
              <div className="text-slate-300 truncate max-w-[200px]">{log.commentText ?? '—'}</div>
              <div className="text-slate-400 truncate max-w-[200px]">{log.replyText ?? '—'}</div>
              <div className={`font-bold ${log.buyingIntent >= 40 ? 'text-[#FF6B35]' : 'text-slate-400'}`}>{log.buyingIntent ?? 0}</div>
              <div>{log.autoReplied ? '✅' : '—'}</div>
              <div>{log.converted ? '✅' : '—'}</div>
            </div>
          ))}
          {(!logs || logs.length === 0) && (
            <div className="px-5 py-8 text-center text-slate-500 text-sm">No engagement logs yet</div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── SUBSCRIPTION PLANS TAB ────────────────────────────────────

function SubscriptionsTab({ adminToken }: { adminToken: string }) {
  const plans = useQuery(api.revenue_growth.getSubscriptionPlans)
  const stats = useQuery(api.revenue_growth.getSubscriptionChangeStats, adminToken ? { adminToken } : 'skip')
  const creditExpiry = useQuery(api.revenue_growth.getCreditExpiryConfig)
  const updatePlan = useMutation(api.revenue_growth.updateSubscriptionPlan)
  const updateExpiry = useMutation(api.revenue_growth.updateCreditExpiryConfig)
  const [editingPlan, setEditingPlan] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ monthlyPriceNgn: 0, annualPriceNgn: 0, annualDiscountPercent: 0, creditsIncluded: 0, messageLimitMonthly: 0 })
  const [toast, setToast] = useState<string | null>(null)

  const showToast = useCallback((msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }, [])

  const handleEdit = (plan: any) => {
    setEditingPlan(plan.planId)
    setEditForm({
      monthlyPriceNgn: plan.monthlyPriceNgn,
      annualPriceNgn: plan.annualPriceNgn,
      annualDiscountPercent: plan.annualDiscountPercent,
      creditsIncluded: plan.creditsIncluded,
      messageLimitMonthly: plan.messageLimitMonthly,
    })
  }

  const handleSave = async () => {
    if (!editingPlan) return
    await updatePlan({ planId: editingPlan, ...editForm, adminToken })
    setEditingPlan(null)
    showToast('Plan updated')
  }

  const handleToggleExpiry = async () => {
    await updateExpiry({
      enabled: !creditExpiry?.enabled,
      expiryDays: creditExpiry?.expiryDays ?? 30,
      warningDays: creditExpiry?.warningDays ?? 7,
      adminToken,
    })
    showToast(creditExpiry?.enabled ? 'Credit expiry disabled' : 'Credit expiry enabled')
  }

  return (
    <div className="space-y-6">
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon="📦" value={(plans ?? []).length} label="Active Plans" color="from-blue-500/20 to-blue-600/10" />
        <StatCard icon="⬆️" value={stats?.upgrades ?? 0} label="Upgrades (30d)" color="from-emerald-500/20 to-emerald-600/10" />
        <StatCard icon="⬇️" value={stats?.downgrades ?? 0} label="Downgrades (30d)" color="from-orange-500/20 to-orange-600/10" />
        <StatCard icon="💰" value={formatNgN(stats?.upgradeRevenue ?? 0)} label="Upgrade Revenue" color="from-purple-500/20 to-purple-600/10" />
      </div>

      {/* Credit Expiry Toggle */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-5 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-white">Credit Expiration</h3>
          <p className="text-sm text-slate-400 mt-1">Credits expire after {creditExpiry?.expiryDays ?? 30} days (warning at {creditExpiry?.warningDays ?? 7} days)</p>
        </div>
        <button
          onClick={handleToggleExpiry}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${creditExpiry?.enabled ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-white/5 text-slate-400 border border-white/10'}`}
        >
          {creditExpiry?.enabled ? '✓ Enabled' : '○ Disabled'}
        </button>
      </div>

      {/* Plans */}
      <div>
        <h3 className="text-lg font-bold text-white mb-3">Subscription Plans</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {(plans ?? []).map((plan: any) => (
            <div key={plan.planId} className={`bg-white/5 border rounded-2xl p-6 transition-all ${editingPlan === plan.planId ? 'border-[#FF6B35]/50' : 'border-white/10 hover:border-white/20'}`}>
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-xl font-bold text-white">{plan.name}</h4>
                <button onClick={() => editingPlan === plan.planId ? setEditingPlan(null) : handleEdit(plan)} className="text-sm text-slate-400 hover:text-white transition-colors">
                  {editingPlan === plan.planId ? '✕' : '✏️'}
                </button>
              </div>

              {editingPlan === plan.planId ? (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-slate-400">Monthly Price (₦)</label>
                    <input type="number" value={editForm.monthlyPriceNgn} onChange={(e) => setEditForm({ ...editForm, monthlyPriceNgn: Number(e.target.value) })} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm mt-1" />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400">Annual Price (₦)</label>
                    <input type="number" value={editForm.annualPriceNgn} onChange={(e) => setEditForm({ ...editForm, annualPriceNgn: Number(e.target.value) })} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm mt-1" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs text-slate-400">Discount %</label>
                      <input type="number" value={editForm.annualDiscountPercent} onChange={(e) => setEditForm({ ...editForm, annualDiscountPercent: Number(e.target.value) })} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm mt-1" />
                    </div>
                    <div>
                      <label className="text-xs text-slate-400">Credits</label>
                      <input type="number" value={editForm.creditsIncluded} onChange={(e) => setEditForm({ ...editForm, creditsIncluded: Number(e.target.value) })} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm mt-1" />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-slate-400">Messages/Month (-1=unlimited)</label>
                    <input type="number" value={editForm.messageLimitMonthly} onChange={(e) => setEditForm({ ...editForm, messageLimitMonthly: Number(e.target.value) })} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm mt-1" />
                  </div>
                  <button onClick={handleSave} className="w-full bg-[#FF6B35] hover:bg-[#FF8255] text-white px-4 py-2 rounded-xl text-sm font-medium transition-all">Save Changes</button>
                </div>
              ) : (
                <>
                  <div className="mb-4">
                    <div className="text-[#FF6B35] font-black text-3xl">{formatNgN(plan.monthlyPriceNgn)}</div>
                    <div className="text-xs text-slate-400 mt-1">/month</div>
                  </div>
                  <div className="bg-white/5 rounded-xl p-3 mb-4">
                    <div className="text-sm text-white font-medium">Annual: {formatNgN(plan.annualPriceNgn)}</div>
                    <div className="text-xs text-emerald-400 mt-1">Save {plan.annualDiscountPercent}% with annual billing</div>
                  </div>
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-400">Credits</span>
                      <span className="text-white font-bold">{plan.creditsIncluded.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-400">Messages/Month</span>
                      <span className="text-white font-bold">{plan.messageLimitMonthly === -1 ? 'Unlimited' : plan.messageLimitMonthly}</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    {(plan.features ?? []).map((f: string, i: number) => (
                      <div key={i} className="flex items-center gap-2 text-xs text-slate-300">
                        <span className="text-emerald-400">✓</span>
                        <span>{f}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          ))}
          {(!plans || plans.length === 0) && (
            <div className="col-span-3 text-center py-12 text-slate-500">No subscription plans configured. Call bulkSeedAllRevenueGrowth to seed.</div>
          )}
        </div>
      </div>

      {/* Change Stats */}
      {stats && stats.totalChanges > 0 && (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
          <h3 className="text-lg font-bold text-white mb-3">Subscription Changes (30 days)</h3>
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-black text-emerald-400">{stats.upgrades}</div>
              <div className="text-xs text-slate-400">Upgrades</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-black text-orange-400">{stats.downgrades}</div>
              <div className="text-xs text-slate-400">Downgrades</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-black text-red-400">{stats.cancellations}</div>
              <div className="text-xs text-slate-400">Cancellations</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-black text-[#FF6B35]">{formatNgN(stats.netRevenueImpact)}</div>
              <div className="text-xs text-slate-400">Net Impact</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── AGENT PRICING TAB ────────────────────────────────────────

function AgentPricingTab({ adminToken }: { adminToken: string }) {
  const tiers = useQuery(api.revenue_growth.getAgentPricingTiers)
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null)

  const agents = ['A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7', 'A8', 'A9', 'A10', 'A11', 'A12', 'A13', 'A14', 'A15']
  const agentNames: Record<string, string> = {
    A1: 'Academic Writer', A2: 'Business Advisor', A3: 'Content Strategist',
    A4: 'Career Coach', A5: 'Personal Shopper', A6: 'Exam Specialist',
    A7: 'Finance Advisor', A8: 'MediaStudio Pro', A9: 'Wellness Coach',
    A10: 'Home Specialist', A11: 'Language Coach', A12: 'Travel Planner',
    A13: 'Exam Success', A14: 'Translation Hub', A15: 'Event Planner',
  }

  const getAgentTiers = (agentId: string) => {
    return (tiers ?? []).filter((t: any) => t.agentId === agentId)
  }

  const tierColors: Record<string, string> = {
    standard: 'from-blue-500/20 to-blue-600/10 border-blue-500/30',
    premium: 'from-orange-500/20 to-orange-600/10 border-orange-500/30',
    enterprise: 'from-purple-500/20 to-purple-600/10 border-purple-500/30',
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon="🤖" value={agents.length} label="Total Agents" color="from-blue-500/20 to-blue-600/10" />
        <StatCard icon="📊" value={(tiers ?? []).length} label="Pricing Tiers" color="from-orange-500/20 to-orange-600/10" />
        <StatCard icon="⭐" value={(tiers ?? []).filter((t: any) => t.tier === 'premium').length} label="Premium Tiers" color="from-emerald-500/20 to-emerald-600/10" />
        <StatCard icon="🏢" value={(tiers ?? []).filter((t: any) => t.tier === 'enterprise').length} label="Enterprise Tiers" color="from-purple-500/20 to-purple-600/10" />
      </div>

      <div>
        <h3 className="text-lg font-bold text-white mb-3">Select Agent</h3>
        <div className="flex flex-wrap gap-2">
          {agents.map((agentId) => (
            <button
              key={agentId}
              onClick={() => setSelectedAgent(selectedAgent === agentId ? null : agentId)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${selectedAgent === agentId ? 'bg-[#FF6B35] text-white' : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'}`}
            >
              {agentId}: {agentNames[agentId]}
            </button>
          ))}
        </div>
      </div>

      {/* Agent Pricing Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {(selectedAgent ? getAgentTiers(selectedAgent) : (tiers ?? []).slice(0, 12)).map((tier: any) => (
          <div key={tier._id} className={`bg-gradient-to-br ${tierColors[tier.tier]} border rounded-2xl p-5 transition-all hover:scale-[1.02]`}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-white/10 text-white uppercase">{tier.tier}</span>
              <span className="text-xs text-slate-400">{tier.agentId}</span>
            </div>
            <h4 className="text-lg font-bold text-white mb-2">{tier.agentName}</h4>
            <div className="text-[#FF6B35] font-black text-2xl mb-3">{formatNgN(tier.monthlyPriceNgn)}<span className="text-xs text-slate-400 font-normal">/mo</span></div>
            <div className="text-sm text-slate-400 mb-3">{tier.creditsPerMessage} credit{tier.creditsPerMessage > 1 ? 's' : ''} per message</div>
            <div className="space-y-1">
              {(tier.features ?? []).map((f: string, i: number) => (
                <div key={i} className="flex items-center gap-2 text-xs text-slate-300">
                  <span className="text-emerald-400">✓</span>
                  <span>{f}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
        {(!tiers || tiers.length === 0) && (
          <div className="col-span-3 text-center py-12 text-slate-500">No agent pricing tiers configured. Call bulkSeedAllRevenueGrowth to seed.</div>
        )}
      </div>

      {/* Pricing Summary Table */}
      {tiers && tiers.length > 0 && (
        <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
          <div className="px-5 py-3 border-b border-white/5 text-sm text-slate-400 font-medium">
            <h3 className="font-bold text-white">Pricing Summary</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="text-left px-5 py-3 text-slate-400 font-medium">Agent</th>
                  <th className="text-right px-5 py-3 text-slate-400 font-medium">Standard</th>
                  <th className="text-right px-5 py-3 text-slate-400 font-medium">Premium</th>
                  <th className="text-right px-5 py-3 text-slate-400 font-medium">Enterprise</th>
                </tr>
              </thead>
              <tbody>
                {agents.map((agentId) => {
                  const agentTiers = getAgentTiers(agentId)
                  const standard = agentTiers.find((t: any) => t.tier === 'standard')
                  const premium = agentTiers.find((t: any) => t.tier === 'premium')
                  const enterprise = agentTiers.find((t: any) => t.tier === 'enterprise')
                  return (
                    <tr key={agentId} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                      <td className="px-5 py-3 text-white">{agentId}: {agentNames[agentId]}</td>
                      <td className="px-5 py-3 text-right text-blue-400 font-bold">{standard ? formatNgN(standard.monthlyPriceNgn) : '—'}</td>
                      <td className="px-5 py-3 text-right text-orange-400 font-bold">{premium ? formatNgN(premium.monthlyPriceNgn) : '—'}</td>
                      <td className="px-5 py-3 text-right text-purple-400 font-bold">{enterprise ? formatNgN(enterprise.monthlyPriceNgn) : '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── ENTERPRISE ADD-ONS TAB ───────────────────────────────────

function EnterpriseAddonsTab({ adminToken }: { adminToken: string }) {
  const addons = useQuery(api.revenue_growth.getEnterpriseAddons)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

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

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon="🏢" value={(addons ?? []).length} label="Available Add-ons" color="from-blue-500/20 to-blue-600/10" />
        <StatCard icon="💰" value={formatNgN((addons ?? []).reduce((sum: number, a: any) => sum + (a.priceNgn ?? 0), 0))} label="Total Add-on Value" color="from-emerald-500/20 to-emerald-600/10" />
        <StatCard icon="📅" value={(addons ?? []).filter((a: any) => a.billingCycle === 'monthly').length} label="Monthly Add-ons" color="from-orange-500/20 to-orange-600/10" />
        <StatCard icon="🎯" value={(addons ?? []).filter((a: any) => a.billingCycle === 'one_time').length} label="One-time Add-ons" color="from-purple-500/20 to-purple-600/10" />
      </div>

      <div>
        <h3 className="text-lg font-bold text-white mb-3">Filter by Category</h3>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${!selectedCategory ? 'bg-[#FF6B35] text-white' : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'}`}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(selectedCategory === cat.id ? null : cat.id)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${selectedCategory === cat.id ? 'bg-[#FF6B35] text-white' : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'}`}
            >
              {cat.icon} {cat.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {(filteredAddons ?? []).map((addon: any) => (
          <div key={addon._id} className={`bg-gradient-to-br ${categoryColors[addon.category] ?? 'from-slate-500/20 to-slate-600/10 border-slate-500/30'} border rounded-2xl p-6 transition-all hover:scale-[1.02]`}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-white/10 text-white capitalize">{addon.billingCycle.replace('_', ' ')}</span>
              <span className="text-xs text-slate-400">{categories.find((c) => c.id === addon.category)?.icon ?? '📦'}</span>
            </div>
            <h4 className="text-xl font-bold text-white mb-2">{addon.name}</h4>
            <p className="text-sm text-slate-400 mb-4">{addon.description}</p>
            <div className="text-[#FF6B35] font-black text-3xl mb-4">
              {formatNgN(addon.priceNgn)}
              {addon.billingCycle === 'monthly' && <span className="text-xs text-slate-400 font-normal">/mo</span>}
            </div>
            <div className="space-y-1">
              {(addon.features ?? []).map((f: string, i: number) => (
                <div key={i} className="flex items-center gap-2 text-xs text-slate-300">
                  <span className="text-emerald-400">✓</span>
                  <span>{f}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
        {(!filteredAddons || filteredAddons.length === 0) && (
          <div className="col-span-3 text-center py-12 text-slate-500">No enterprise add-ons configured. Call bulkSeedAllRevenueGrowth to seed.</div>
        )}
      </div>
    </div>
  )
}

// ─── MAIN COMPONENT ───────────────────────────────────────────

export function RevenueHub({ adminToken }: { adminToken: string }) {
  const [activeTab, setActiveTab] = useState<RevenueTab>('overview')

  const renderTab = () => {
    switch (activeTab) {
      case 'overview':
        return <OverviewTab adminToken={adminToken} />
      case 'subscriptions':
        return <SubscriptionsTab adminToken={adminToken} />
      case 'agent_pricing':
        return <AgentPricingTab adminToken={adminToken} />
      case 'enterprise_addons':
        return <EnterpriseAddonsTab adminToken={adminToken} />
      case 'credits':
        return <CreditsTab adminToken={adminToken} />
      case 'social':
        return <SocialTab adminToken={adminToken} />
      case 'marketplace':
        return <MarketplaceTab adminToken={adminToken} />
      case 'outcomes':
        return <OutcomesTab adminToken={adminToken} />
      case 'whitelabel':
        return <WhiteLabelTab adminToken={adminToken} />
      case 'analytics':
        return <AnalyticsTab adminToken={adminToken} />
      case 'commerce':
        return <CommerceTab />
      case 'consulting':
        return <ConsultingTab adminToken={adminToken} />
      case 'api_access':
        return <ApiAccessTab adminToken={adminToken} />
      case 'auto_engage':
        return <AutoEngageTab adminToken={adminToken} />
      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Revenue Hub</h1>
          <p className="text-sm text-slate-400 mt-1">All {TABS.length - 1} revenue streams — Prosuite NG+</p>
        </div>
        <div className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-slate-300">
          {TABS.length - 1} Revenue Features
        </div>
      </div>

      <div className="flex gap-1 bg-white/5 border border-white/10 rounded-2xl p-1 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-[#FF6B35] text-white shadow-lg shadow-[#FF6B35]/20'
                : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      <div className="min-h-[60vh]">
        {renderTab()}
      </div>
    </div>
  )
}
