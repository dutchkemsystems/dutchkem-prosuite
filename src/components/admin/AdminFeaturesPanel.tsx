import { useState } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'

// ═══════════════════════════════════════════════════════════════════
// ENTERPRISE PORTAL — Features Deployment Panel
// Deploy/revoke features per company from Enterprise Portal
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

const COMPANY_SEARCHABLE: Record<string, string> = {
  S1: "Local Service Business", S2: "E-commerce Store", S3: "Marketing Agency", S4: "Real Estate Agency", S5: "SaaS Startup",
  M1: "Manufacturing Corp", M2: "Healthcare Provider", M3: "Financial Services", M4: "Logistics & Supply Chain", M5: "Enterprise Tech",
  H1: "Global Banking", H2: "Int'l Manufacturing", H3: "Worldwide E-commerce", H4: "Global Healthcare", H5: "Multi-National Telecom",
  H6: "Global Logistics", H7: "Int'l Energy Corp", H8: "Worldwide Retail", H9: "Global Tech", H10: "Mega Government",
}

export function AdminFeaturesPanel({ adminToken }: { adminToken: string }) {
  const [selectedCompany, setSelectedCompany] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [activeFeature, setActiveFeature] = useState<string | null>(null)

  const seededCompanies = useQuery(api.enterprise_features.getSeededCompanies, {})
  const featureConfig = useQuery(
    api.enterprise_features.getConfig,
    selectedCompany ? { orgId: selectedCompany } : 'skip'
  )
  const saveConfig = useMutation(api.enterprise_features.saveConfig)

  const enabledFeatures = featureConfig?.features || []

  const filteredCompanies = (seededCompanies || []).filter((c: any) => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return c.id.toLowerCase().includes(q) ||
           (COMPANY_SEARCHABLE[c.id] || '').toLowerCase().includes(q)
  })

  const handleToggle = async (featureId: string) => {
    if (!selectedCompany) return
    const updated = enabledFeatures.includes(featureId)
      ? enabledFeatures.filter((f: string) => f !== featureId)
      : [...enabledFeatures, featureId]
    await saveConfig({ orgId: selectedCompany, features: updated, adminToken })
  }

  const handleEnableAll = async () => {
    if (!selectedCompany) return
    await saveConfig({ orgId: selectedCompany, features: ALL_FEATURES.map(f => f.id), adminToken })
  }

  const handleDisableAll = async () => {
    if (!selectedCompany) return
    await saveConfig({ orgId: selectedCompany, features: [], adminToken })
  }

  const activeFeatureData = ALL_FEATURES.find(f => f.id === activeFeature)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black">🚀 Feature Deployment</h2>
          <p className="text-xs text-slate-400 mt-1">Deploy, grant, revoke features to any enterprise client</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500">{seededCompanies?.length || 0} companies</span>
          <span className="text-xs text-slate-500">•</span>
          <span className="text-xs text-slate-500">{ALL_FEATURES.length} features available</span>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Company List */}
        <div className="w-80 shrink-0">
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search 300 company types..."
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 mb-3"
          />
          <div className="space-y-1 max-h-[500px] overflow-y-auto pr-2">
            {filteredCompanies.map((c: any) => (
              <button
                key={c.id}
                onClick={() => setSelectedCompany(c.id)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-left transition-all ${
                  selectedCompany === c.id
                    ? 'bg-orange-500/10 border border-orange-500/30 text-orange-400'
                    : 'bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300'
                }`}
              >
                <div className="min-w-0">
                  <p className="text-xs font-bold truncate">{COMPANY_SEARCHABLE[c.id] || c.id}</p>
                  <p className="text-[10px] text-slate-500">{c.id} • {c.featureCount}/{ALL_FEATURES.length}</p>
                </div>
                <div className="w-8 h-1.5 bg-slate-700 rounded-full overflow-hidden shrink-0">
                  <div className="h-full bg-orange-500 rounded-full" style={{ width: `${(c.featureCount / ALL_FEATURES.length) * 100}%` }} />
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Feature Panel */}
        <div className="flex-1">
          {!selectedCompany ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center">
              <p className="text-5xl mb-4">🏢</p>
              <p className="text-sm font-bold text-slate-400">Select a company from the list to manage its features</p>
              <p className="text-xs text-slate-500 mt-2">300 company types across 30 industries</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Company Header */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex items-center justify-between">
                <div>
                  <h3 className="font-black text-lg">{COMPANY_SEARCHABLE[selectedCompany] || selectedCompany}</h3>
                  <p className="text-xs text-slate-400">ID: {selectedCompany} • {enabledFeatures.length}/{ALL_FEATURES.length} features enabled</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={handleEnableAll} className="px-4 py-2 bg-emerald-500/10 text-emerald-400 rounded-xl text-xs font-bold hover:bg-emerald-500/20 transition-all">Enable All</button>
                  <button onClick={handleDisableAll} className="px-4 py-2 bg-red-500/10 text-red-400 rounded-xl text-xs font-bold hover:bg-red-500/20 transition-all">Disable All</button>
                </div>
              </div>

              <div className="flex gap-6">
                {/* Feature List */}
                <div className="flex-1 space-y-1.5">
                  {ALL_FEATURES.map(f => {
                    const isEnabled = enabledFeatures.includes(f.id)
                    return (
                      <div
                        key={f.id}
                        onClick={() => setActiveFeature(f.id)}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-all ${
                          activeFeature === f.id
                            ? 'bg-orange-500/10 border border-orange-500/30'
                            : 'bg-slate-900 border border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <span className="text-lg">{f.icon}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold">{f.name}</p>
                          <p className="text-[10px] text-slate-500 truncate">{f.desc}</p>
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleToggle(f.id) }}
                          className={`w-10 h-5 rounded-full transition-all relative shrink-0 ${isEnabled ? 'bg-orange-500' : 'bg-slate-700'}`}
                        >
                          <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${isEnabled ? 'left-5' : 'left-0.5'}`} />
                        </button>
                      </div>
                    )
                  })}
                </div>

                {/* Feature Detail */}
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
                    <button
                      onClick={() => handleToggle(activeFeatureData.id)}
                      className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all ${
                        enabledFeatures.includes(activeFeatureData.id)
                          ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20'
                          : 'bg-orange-500 text-white hover:bg-orange-600'
                      }`}
                    >
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
