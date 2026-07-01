import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useConvex, useMutation } from 'convex/react'
import { useState, useEffect } from 'react'
import { api } from '../../../convex/_generated/api'
import { CompanyLogo } from '~/components/CompanyLogo'
import { WorkflowViewerTab } from '~/components/enterprise/capabilities/WorkflowViewerTab'
import { MarketplaceTab } from '~/components/enterprise/capabilities/MarketplaceTab'
import { KnowledgeGraphTab } from '~/components/enterprise/capabilities/KnowledgeGraphTab'
import { CompanionAgentTab } from '~/components/enterprise/capabilities/CompanionAgentTab'
import { AgenticPaymentsTab } from '~/components/enterprise/capabilities/AgenticPaymentsTab'
import { EmotionalAITab } from '~/components/enterprise/capabilities/EmotionalAITab'
import ClientWalletDashboard from '~/components/admin/enterprise/ClientWalletDashboard'
import { AddonManager } from '~/components/enterprise/AddonManager'
import { ApiAccessManager } from '~/components/enterprise/ApiAccessManager'
import { EnterpriseUsageDashboard } from '~/components/enterprise/EnterpriseUsageDashboard'
import { SubscriptionRenewal } from '~/components/enterprise/SubscriptionRenewal'
import { ClientPaymentsTab } from '~/components/enterprise/capabilities/ClientPaymentsTab'
import { OrdersTab, CustomersTab, ReportingTab, QRCodesTab, InvoicesTab, ReceiptsTab, AppointmentsTab, BusinessHoursTab, MarketingTab, TestimonialsTab, SurveysTab, LandingPagesTab, WhatsAppCommerceTab, ClientPortalTab } from '~/components/enterprise/EnterpriseFeatures'

export const Route = createFileRoute('/enterprise/dashboard')({
  component: EnterpriseDashboard,
})

// Feature tab map — must match IDs in enterprise_features.ts
const FEATURE_TABS: Record<string, { id: string; icon: string; label: string; component: any }> = {
  orders: { id: 'orders', icon: '📦', label: 'Orders', component: OrdersTab },
  customers: { id: 'customers', icon: '👥', label: 'Customers', component: CustomersTab },
  reports: { id: 'reports', icon: '📊', label: 'Analytics', component: ReportingTab },
  invoices: { id: 'invoices', icon: '📄', label: 'Invoices', component: InvoicesTab },
  receipts: { id: 'receipts', icon: '🧾', label: 'Receipts', component: ReceiptsTab },
  qrcodes: { id: 'qrcodes', icon: '📱', label: 'QR Codes', component: QRCodesTab },
  appointments: { id: 'appointments', icon: '📅', label: 'Appointments', component: AppointmentsTab },
  marketing: { id: 'marketing', icon: '📣', label: 'SMS Marketing', component: MarketingTab },
  email_marketing: { id: 'email_marketing', icon: '✉️', label: 'Email Marketing', component: MarketingTab },
  business_hours: { id: 'business_hours', icon: '🕐', label: 'Business Hours', component: BusinessHoursTab },
  ecommerce: { id: 'ecommerce', icon: '🛒', label: 'E-commerce', component: null },
  whatsapp: { id: 'whatsapp', icon: '💬', label: 'WhatsApp Store', component: WhatsAppCommerceTab },
  telegram: { id: 'telegram', icon: '🤖', label: 'Telegram Commerce', component: null },
  landing_pages: { id: 'landing_pages', icon: '🌐', label: 'Landing Pages', component: LandingPagesTab },
  surveys: { id: 'surveys', icon: '📋', label: 'Surveys', component: SurveysTab },
  testimonials: { id: 'testimonials', icon: '⭐', label: 'Testimonials', component: TestimonialsTab },
  client_portal: { id: 'client_portal', icon: '🔐', label: 'Client Portal', component: ClientPortalTab },
}

function EnterpriseDashboard() {
  const navigate = useNavigate()
  const [token, setToken] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('overview')
  const logout = useMutation(api.enterprise_auth.logout)
  const convex = useConvex()
  const [org, setOrg] = useState<any>(undefined)
  const [featureConfig, setFeatureConfig] = useState<any>(undefined)

  useEffect(() => {
    const t = localStorage.getItem('enterprise_token')
    if (!t) { navigate({ to: '/enterprise/login' }); return }
    setToken(t)
  }, [navigate])

  useEffect(() => {
    if (!token) return
    convex.query(api.enterprise_auth.getOrgDetails, { token }).then(setOrg).catch(() => {})
  }, [token])

  useEffect(() => {
    if (!org?._id) return
    convex.query(api.enterprise_features.getConfig, { orgId: org._id }).then(setFeatureConfig).catch(() => {})
  }, [org?._id])

  const handleLogout = async () => {
    if (token) await logout({ token })
    localStorage.removeItem('enterprise_token')
    navigate({ to: '/enterprise/login' })
  }

  if (!token || !org) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const trialDaysLeft = org.trialEndsAt
    ? Math.max(0, Math.ceil((org.trialEndsAt - Date.now()) / (1000 * 60 * 60 * 24)))
    : null

  // Get enabled feature IDs from admin config
  const enabledFeatures: string[] = featureConfig?.features || []

  // Build sidebar tabs — always show core tabs, then add enabled feature tabs
  const coreTabs = [
    { id: 'overview', icon: '📊', label: 'Overview' },
    { id: 'subscription', icon: '💳', label: 'Subscription' },
    { id: 'addons', icon: '🧩', label: 'Add-ons' },
    { id: 'api_access', icon: '🔑', label: 'API Access' },
    { id: 'usage', icon: '📈', label: 'Usage & Billing' },
    { id: 'workflow', icon: '🔄', label: 'Workflows' },
    { id: 'marketplace', icon: '🛒', label: 'Agent Marketplace' },
    { id: 'knowledge', icon: '🧠', label: 'Knowledge Graph' },
    { id: 'companion', icon: '🤝', label: 'Companion Agent' },
    { id: 'payments', icon: '💳', label: 'Agentic Payments' },
    { id: 'emotional', icon: '💖', label: 'Emotional AI' },
    { id: 'wallet', icon: '💰', label: 'My Wallet' },
    { id: 'client_payments', icon: '💳', label: 'Client Payments' },
  ]

  // Add feature tabs that admin has deployed
  const featureTabs = enabledFeatures
    .filter((f) => FEATURE_TABS[f])
    .map((f) => ({
      id: `feat_${f}`,
      icon: FEATURE_TABS[f].icon,
      label: FEATURE_TABS[f].label,
      featureId: f,
    }))

  const allTabs = [...coreTabs, ...featureTabs]

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col md:flex-row">
      <aside className="w-full md:w-72 bg-slate-900 border-r border-slate-800 flex flex-col">
        <div className="p-6 border-b border-slate-800">
          <div className="flex items-center gap-3 mb-4">
            <CompanyLogo className="w-10 h-10" />
            <div>
              <p className="font-black text-sm tracking-tight">{org.name}</p>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest">{org.plan} Plan</p>
            </div>
          </div>
          {org.status === 'trial' && trialDaysLeft !== null && (
            <div className={`p-3 rounded-xl text-xs font-bold ${trialDaysLeft <= 3 ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-orange-500/10 text-orange-400 border border-orange-500/20'}`}>
              ⏳ {trialDaysLeft} days left in trial
            </div>
          )}
          {featureTabs.length > 0 && (
            <div className="mt-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <p className="text-[10px] text-emerald-400 font-bold">🚀 {featureTabs.length} business features deployed</p>
            </div>
          )}
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {allTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                activeTab === tab.id
                  ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <span className="text-lg">{tab.icon}</span>
              <span>{tab.label}</span>
              {'featureId' in tab && (
                <span className="ml-auto w-1.5 h-1.5 bg-emerald-400 rounded-full" />
              )}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-800 space-y-2">
          <button onClick={() => navigate({ to: '/' })} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-slate-400 hover:bg-slate-800 hover:text-white transition-all">
            <span>🏠</span><span>Back to Home</span>
          </button>
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-red-400 hover:bg-red-500/10 transition-all">
            <span>🚪</span><span>Sign Out</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <header className="sticky top-0 z-10 bg-slate-950/80 backdrop-blur-xl border-b border-slate-800 px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-black tracking-tight">
              {allTabs.find(t => t.id === activeTab)?.icon} {allTabs.find(t => t.id === activeTab)?.label}
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              {org.industry ? `${org.industry} · ` : ''}{org.email}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
              org.status === 'active' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
              org.status === 'trial' ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' :
              'bg-red-500/10 text-red-400 border border-red-500/20'
            }`}>
              {org.status}
            </div>
          </div>
        </header>

        <div className="p-6">
          {/* Core tabs */}
          {activeTab === 'overview' && <OverviewTab org={org} token={token} onNavigateTab={setActiveTab} enabledFeatures={enabledFeatures} />}
          {activeTab === 'subscription' && <SubscriptionRenewal org={org} token={token} />}
          {activeTab === 'addons' && <AddonManager orgId={org._id} token={token} email={org.email} />}
          {activeTab === 'api_access' && <ApiAccessManager orgId={org._id} token={token} />}
          {activeTab === 'usage' && <EnterpriseUsageDashboard orgId={org._id} token={token} />}
          {activeTab === 'workflow' && <WorkflowViewerTab token={token} />}
          {activeTab === 'marketplace' && <MarketplaceTab token={token} />}
          {activeTab === 'knowledge' && <KnowledgeGraphTab token={token} />}
          {activeTab === 'companion' && <CompanionAgentTab token={token} />}
          {activeTab === 'payments' && <AgenticPaymentsTab token={token} />}
          {activeTab === 'emotional' && <EmotionalAITab token={token} />}
          {activeTab === 'wallet' && <ClientWalletDashboard />}
          {activeTab === 'client_payments' && <ClientPaymentsTab token={token} />}

          {/* Dynamic feature tabs — rendered from admin-configured feature list */}
          {featureTabs.map((tab) => {
            if (tab.id !== activeTab) return null
            const featureData = FEATURE_TABS[tab.featureId]
            if (!featureData?.component) {
              return (
                <div key={tab.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center">
                  <span className="text-4xl">{featureData.icon}</span>
                  <p className="text-sm font-bold mt-4">{featureData.label}</p>
                  <p className="text-xs text-slate-400 mt-1">Feature module — contact admin for setup</p>
                </div>
              )
            }
            const Component = featureData.component
            return <Component key={tab.id} token={token} />
          })}
        </div>
      </main>
    </div>
  )
}

function OverviewTab({ org, token, onNavigateTab, enabledFeatures }: { org: any; token: string; onNavigateTab: (tab: string) => void; enabledFeatures: string[] }) {
  const convex = useConvex()
  const [companies, setCompanies] = useState<any>(undefined)

  useEffect(() => {
    convex.query(api.enterprise_features.getSeededCompanies, {}).then(setCompanies).catch(() => {})
  }, [])

  const capabilities = [
    { icon: '🧩', name: 'Add-ons', desc: 'Subscribe to premium add-ons', tab: 'addons', color: 'from-orange-500 to-red-600' },
    { icon: '🔑', name: 'API Access', desc: 'Manage API keys and access', tab: 'api_access', color: 'from-blue-500 to-cyan-600' },
    { icon: '📈', name: 'Usage & Billing', desc: 'Monitor usage and transactions', tab: 'usage', color: 'from-emerald-500 to-teal-600' },
  ]

  // Show enabled feature cards in overview
  const featureCards = enabledFeatures.map((f) => {
    const ft = FEATURE_TABS[f]
    if (!ft) return null
    return { icon: ft.icon, name: ft.label, desc: 'Deployed feature', tab: `feat_${f}`, color: 'from-orange-500 to-amber-600' }
  }).filter(Boolean)

  const daysLeft = org.subscriptionEndsAt
    ? Math.max(0, Math.ceil((org.subscriptionEndsAt - Date.now()) / (1000 * 60 * 60 * 24)))
    : null
  const isExpired = daysLeft !== null && daysLeft === 0

  return (
    <div className="space-y-8">
      {(isExpired) && (
        <button onClick={() => onNavigateTab('subscription')} className="w-full p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-center hover:bg-red-500/20 transition-all">
          <p className="text-red-400 font-black text-sm">⚠️ Your subscription has expired</p>
          <p className="text-red-400 text-xs mt-1">Click to renew →</p>
        </button>
      )}

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-orange-500/20 to-orange-600/10 rounded-2xl p-5 border border-orange-500/20">
          <p className="text-3xl font-black text-orange-400">{enabledFeatures.length}</p>
          <p className="text-xs text-slate-400 mt-1">Business Features</p>
        </div>
        <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/10 rounded-2xl p-5 border border-blue-500/20">
          <p className="text-3xl font-black text-blue-400">{org.plan}</p>
          <p className="text-xs text-slate-400 mt-1">Current Plan</p>
        </div>
        <div className="bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 rounded-2xl p-5 border border-emerald-500/20">
          <p className="text-3xl font-black text-emerald-400">{companies?.length || 300}</p>
          <p className="text-xs text-slate-400 mt-1">Company Types</p>
        </div>
      </div>

      {featureCards.length > 0 && (
        <div>
          <h3 className="text-sm font-black mb-3">🚀 Deployed Business Features</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {featureCards.map((card, i) => (
              <button key={i} onClick={() => onNavigateTab(card!.tab)} className={`bg-gradient-to-br ${card!.color} rounded-2xl p-5 text-left hover:scale-[1.02] transition-all border border-white/10`}>
                <span className="text-2xl">{card!.icon}</span>
                <p className="text-white font-black text-sm mt-3">{card!.name}</p>
                <p className="text-white/60 text-xs mt-1">{card!.desc}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        <h3 className="text-sm font-black mb-3">Core Platform</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {capabilities.map((cap, i) => (
            <button key={i} onClick={() => onNavigateTab(cap.tab)} className={`bg-gradient-to-br ${cap.color} rounded-2xl p-5 text-left hover:scale-[1.02] transition-all border border-white/10`}>
              <span className="text-2xl">{cap.icon}</span>
              <p className="text-white font-black text-sm mt-3">{cap.name}</p>
              <p className="text-white/60 text-xs mt-1">{cap.desc}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
