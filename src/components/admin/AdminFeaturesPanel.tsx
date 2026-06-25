import { useState } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'

// ═══════════════════════════════════════════════════════════════════
// ENTERPRISE PORTAL — Feature Deployment Panel
// Shows ALL companies (seeded 300 + real orgs) and deploys features
// ═══════════════════════════════════════════════════════════════════

const ALL_FEATURES = [
  { id: 'orders', name: 'Order Management', icon: '📦', desc: 'Full order lifecycle from creation to delivery', module: 'order_management' },
  { id: 'customers', name: 'Customer Database', icon: '👥', desc: 'CRM with tags, loyalty points, import', module: 'customer_database' },
  { id: 'reports', name: 'Analytics & Reports', icon: '📊', desc: 'Sales, customers, inventory, dashboard', module: 'reporting' },
  { id: 'invoices', name: 'Invoices', icon: '📄', desc: 'Professional HTML invoices + recurring', module: 'invoice_generator' },
  { id: 'receipts', name: 'Receipts', icon: '🧾', desc: 'Payment receipts for transactions', module: 'receipt_generator' },
  { id: 'qrcodes', name: 'QR Codes', icon: '📱', desc: 'Payment links, business cards, products', module: 'qr_generator' },
  { id: 'appointments', name: 'Appointments', icon: '📅', desc: 'Booking slots, scheduling, reminders', module: 'appointment_booking' },
  { id: 'marketing', name: 'SMS Marketing', icon: '📣', desc: 'Bulk campaigns + AI message generation', module: 'sms_marketing' },
  { id: 'email_marketing', name: 'Email Marketing', icon: '✉️', desc: 'Newsletters, drip sequences, autoresponders', module: 'sms_marketing' },
  { id: 'business_hours', name: 'Business Hours', icon: '🕐', desc: 'Auto-reply outside hours, timezone support', module: 'business_hours' },
  { id: 'ecommerce', name: 'E-commerce Store', icon: '🛒', desc: 'Product listings, storefront, orders', module: 'ecommerce' },
  { id: 'whatsapp', name: 'WhatsApp Commerce', icon: '💬', desc: 'Buy/sell through WhatsApp bot', module: 'whatsapp_commerce' },
  { id: 'telegram', name: 'Telegram Commerce', icon: '🤖', desc: 'Buy/sell through Telegram bot', module: 'telegram_commerce' },
  { id: 'landing_pages', name: 'Landing Pages', icon: '🌐', desc: 'Generate landing pages from config', module: 'landing_page' },
  { id: 'surveys', name: 'Surveys & Feedback', icon: '📋', desc: 'NPS, CSAT, satisfaction surveys', module: 'survey_commerce' },
  { id: 'testimonials', name: 'Testimonials', icon: '⭐', desc: 'Collect and display reviews', module: 'social_proof' },
  { id: 'client_portal', name: 'Client Portal', icon: '🔐', desc: 'White-label client access', module: 'client_portal' },
]

export function AdminFeaturesPanel({ adminToken }: { adminToken: string }) {
  const [selectedId, setSelectedId] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [activeFeature, setActiveFeature] = useState<string | null>(null)
  const [view, setView] = useState<'seeded' | 'real'>('seeded')

  // Both data sources
  const seededCompanies = useQuery(api.enterprise_features.getSeededCompanies, {})
  const realOrgs = useQuery(api.admin_enterprise.listOrganizations, { adminToken })

  // Feature config for selected entity
  const featureConfig = useQuery(
    api.enterprise_features.getConfig,
    selectedId ? { orgId: selectedId } : 'skip'
  )
  const saveConfig = useMutation(api.enterprise_features.saveConfig)

  const enabledFeatures = featureConfig?.features || []

  // Build combined list
  const companyList = view === 'seeded'
    ? (seededCompanies || []).map((c: any) => ({
        id: c.id, name: c.id, featureCount: c.featureCount, type: 'seeded' as const,
      }))
    : (realOrgs || []).map((o: any) => ({
        id: o._id, name: o.name, featureCount: 0, type: 'real' as const,
        industry: o.industry, plan: o.plan, status: o.status,
      }))

  const filtered = companyList.filter((c) => {
    if (!searchQuery) return true
    return c.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
           c.name.toLowerCase().includes(searchQuery.toLowerCase())
  })

  const handleToggle = async (featureId: string) => {
    if (!selectedId) return
    const updated = enabledFeatures.includes(featureId)
      ? enabledFeatures.filter((f: string) => f !== featureId)
      : [...enabledFeatures, featureId]
    await saveConfig({ orgId: selectedId, features: updated, adminToken })
  }

  const handleEnableAll = async () => {
    if (!selectedId) return
    await saveConfig({ orgId: selectedId, features: ALL_FEATURES.map(f => f.id), adminToken })
  }

  const handleDisableAll = async () => {
    if (!selectedId) return
    await saveConfig({ orgId: selectedId, features: [], adminToken })
  }

  const activeFeatureData = ALL_FEATURES.find(f => f.id === activeFeature)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black">🚀 Feature Deployment</h2>
          <p className="text-xs text-slate-400 mt-1">Deploy, grant, revoke features to enterprise clients</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500">{seededCompanies?.length || 0} company types</span>
          <span className="text-xs text-slate-500">•</span>
          <span className="text-xs text-slate-500">{realOrgs?.length || 0} live orgs</span>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Left: Company List */}
        <div className="w-80 shrink-0 space-y-3">
          {/* Toggle between seeded / real */}
          <div className="flex gap-1 bg-slate-800 rounded-xl p-1">
            <button onClick={() => { setView('seeded'); setSelectedId(''); setActiveFeature(null) }}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${view === 'seeded' ? 'bg-orange-500 text-white' : 'text-slate-400 hover:text-white'}`}>
              Company Types ({seededCompanies?.length || 0})
            </button>
            <button onClick={() => { setView('real'); setSelectedId(''); setActiveFeature(null) }}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${view === 'real' ? 'bg-orange-500 text-white' : 'text-slate-400 hover:text-white'}`}>
              Live Orgs ({realOrgs?.length || 0})
            </button>
          </div>

          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder={view === 'seeded' ? "Search 300 company types..." : "Search organizations..."}
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500"
          />

          <div className="space-y-1 max-h-[500px] overflow-y-auto pr-2">
            {filtered.map((c) => (
              <button
                key={c.id}
                onClick={() => { setSelectedId(c.id); setActiveFeature(null) }}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-left transition-all ${
                  selectedId === c.id
                    ? 'bg-orange-500/10 border border-orange-500/30 text-orange-400'
                    : 'bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300'
                }`}
              >
                <div className="min-w-0">
                  <p className="text-xs font-bold truncate">{c.name}</p>
                  <p className="text-[10px] text-slate-500">{c.id} • {c.featureCount || enabledFeatures.length}/{ALL_FEATURES.length}</p>
                </div>
                <div className="w-8 h-1.5 bg-slate-700 rounded-full overflow-hidden shrink-0">
                  <div className="h-full bg-orange-500 rounded-full" style={{ width: `${(c.featureCount / ALL_FEATURES.length) * 100}%` }} />
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Right: Feature Panel */}
        <div className="flex-1">
          {!selectedId ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center">
              <p className="text-5xl mb-4">🚀</p>
              <p className="text-sm font-bold text-slate-400">
                {view === 'seeded'
                  ? 'Select a company type to deploy features'
                  : 'Select an organization to deploy features'}
              </p>
              <p className="text-xs text-slate-500 mt-2">
                {view === 'seeded'
                  ? 'Features deployed here appear in the client dashboard for matching company types'
                  : 'Features deployed here appear in the client dashboard for this organization'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex items-center justify-between">
                <div>
                  <h3 className="font-black text-lg">{selectedId}</h3>
                  <p className="text-xs text-slate-400">{enabledFeatures.length}/{ALL_FEATURES.length} features enabled • orgId: {selectedId}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={handleEnableAll} className="px-4 py-2 bg-emerald-500/10 text-emerald-400 rounded-xl text-xs font-bold hover:bg-emerald-500/20 transition-all">Enable All</button>
                  <button onClick={handleDisableAll} className="px-4 py-2 bg-red-500/10 text-red-400 rounded-xl text-xs font-bold hover:bg-red-500/20 transition-all">Disable All</button>
                </div>
              </div>

              <div className="flex gap-6">
                <div className="flex-1 space-y-1.5">
                  {ALL_FEATURES.map(f => {
                    const isEnabled = enabledFeatures.includes(f.id)
                    return (
                      <div key={f.id} onClick={() => setActiveFeature(f.id)}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-all ${
                          activeFeature === f.id ? 'bg-orange-500/10 border border-orange-500/30'
                          : 'bg-slate-900 border border-slate-800 hover:border-slate-700'
                        }`}>
                        <span className="text-lg">{f.icon}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold">{f.name}</p>
                          <p className="text-[10px] text-slate-500 truncate">{f.desc}</p>
                        </div>
                        <button onClick={(e) => { e.stopPropagation(); handleToggle(f.id) }}
                          className={`w-10 h-5 rounded-full transition-all relative shrink-0 ${isEnabled ? 'bg-orange-500' : 'bg-slate-700'}`}>
                          <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${isEnabled ? 'left-5' : 'left-0.5'}`} />
                        </button>
                      </div>
                    )
                  })}
                </div>

                {activeFeatureData && (
                  <div className="w-72 shrink-0 bg-slate-900 border border-slate-800 rounded-2xl p-5">
                    <div className="text-center mb-4">
                      <span className="text-4xl">{activeFeatureData.icon}</span>
                      <h4 className="font-black mt-2">{activeFeatureData.name}</h4>
                      <p className="text-[10px] text-slate-400 mt-1">{activeFeatureData.desc}</p>
                    </div>
                    <div className="bg-slate-800 rounded-xl p-3 mb-3">
                      <p className="text-[10px] text-slate-500">Backend Module</p>
                      <code className="text-[11px] text-orange-400">convex/{activeFeatureData.module}.ts</code>
                    </div>
                    <div className="bg-slate-800 rounded-xl p-3 mb-4">
                      <p className="text-[10px] text-slate-500">Status</p>
                      <p className={`text-xs font-bold ${enabledFeatures.includes(activeFeatureData.id) ? 'text-emerald-400' : 'text-slate-500'}`}>
                        {enabledFeatures.includes(activeFeatureData.id) ? '✅ Deployed' : '❌ Not Deployed'}
                      </p>
                    </div>
                    <button onClick={() => handleToggle(activeFeatureData.id)}
                      className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all ${
                        enabledFeatures.includes(activeFeatureData.id)
                          ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20'
                          : 'bg-orange-500 text-white hover:bg-orange-600'
                      }`}>
                      {enabledFeatures.includes(activeFeatureData.id) ? 'Revoke Feature' : 'Deploy Feature'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
