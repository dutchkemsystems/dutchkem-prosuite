import { useState } from 'react'
import { useQuery, useMutation, useAction } from 'convex/react'
import { api } from '../../../convex/_generated/api'

// ═══════════════════════════════════════════════════════════════════
// ADMIN FEATURES PANEL
// Admin deploys/assigns features to enterprise clients
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

type FeatureTab = typeof ALL_FEATURES[number]['id']

export function AdminFeaturesPanel({ adminToken }: { adminToken: string }) {
  const [activeFeature, setActiveFeature] = useState<FeatureTab | null>(null)
  const [selectedOrg, setSelectedOrg] = useState<string>('')
  const orgs = useQuery(api.admin_enterprise.listOrganizations, { adminToken })
  const featureConfig = useQuery(
    api.enterprise_features.getConfig,
    selectedOrg ? { orgId: selectedOrg } : 'skip'
  )
  const saveConfig = useMutation(api.enterprise_features.saveConfig)

  const handleToggleFeature = async (featureId: string) => {
    if (!selectedOrg) return
    const current = featureConfig?.features || []
    const updated = current.includes(featureId)
      ? current.filter((f: string) => f !== featureId)
      : [...current, featureId]
    await saveConfig({ orgId: selectedOrg, features: updated, adminToken })
  }

  const handleEnableAll = async () => {
    if (!selectedOrg) return
    await saveConfig({ orgId: selectedOrg, features: ALL_FEATURES.map(f => f.id), adminToken })
  }

  const handleDisableAll = async () => {
    if (!selectedOrg) return
    await saveConfig({ orgId: selectedOrg, features: [], adminToken })
  }

  const enabledFeatures = featureConfig?.features || []
  const activeFeatureData = ALL_FEATURES.find(f => f.id === activeFeature)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black">Enterprise Feature Deployment</h2>
          <p className="text-xs text-slate-400 mt-1">Assign and manage features for each enterprise client</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500">{enabledFeatures.length}/{ALL_FEATURES.length} features enabled</span>
          <div className="w-32 h-2 bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full bg-orange-500 rounded-full transition-all" style={{ width: `${(enabledFeatures.length / ALL_FEATURES.length) * 100}%` }} />
          </div>
        </div>
      </div>

      {/* Org Selector */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <label className="text-xs font-bold text-slate-400 mb-2 block">Select Enterprise Client</label>
        <select
          value={selectedOrg}
          onChange={e => { setSelectedOrg(e.target.value); setActiveFeature(null) }}
          className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white"
        >
          <option value="">— Select a company —</option>
          {(orgs || []).map((org: any) => (
            <option key={org._id} value={org._id}>{org.name} ({org.plan})</option>
          ))}
        </select>
      </div>

      {!selectedOrg && (
        <div className="text-center py-16 text-slate-500">
          <p className="text-4xl mb-3">🏢</p>
          <p className="text-sm font-bold">Select an enterprise client above to manage their features</p>
        </div>
      )}

      {selectedOrg && (
        <div className="flex gap-6">
          {/* Feature List */}
          <div className="w-80 shrink-0 space-y-2">
            <div className="flex gap-2 mb-3">
              <button onClick={handleEnableAll} className="px-3 py-1.5 bg-emerald-500/10 text-emerald-400 rounded-lg text-[11px] font-bold hover:bg-emerald-500/20">Enable All</button>
              <button onClick={handleDisableAll} className="px-3 py-1.5 bg-red-500/10 text-red-400 rounded-lg text-[11px] font-bold hover:bg-red-500/20">Disable All</button>
            </div>
            {ALL_FEATURES.map(f => {
              const isEnabled = enabledFeatures.includes(f.id)
              return (
                <div
                  key={f.id}
                  className={`bg-slate-900 border rounded-xl p-4 cursor-pointer transition-all flex items-center gap-3 ${
                    activeFeature === f.id ? 'border-orange-500 bg-orange-500/5' : 'border-slate-800 hover:border-slate-700'
                  }`}
                  onClick={() => setActiveFeature(f.id)}
                >
                  <span className="text-xl">{f.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold truncate">{f.name}</p>
                    <p className="text-[10px] text-slate-500 truncate">{f.desc}</p>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleToggleFeature(f.id) }}
                    className={`w-10 h-5 rounded-full transition-all relative ${isEnabled ? 'bg-orange-500' : 'bg-slate-700'}`}
                  >
                    <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${isEnabled ? 'left-5' : 'left-0.5'}`} />
                  </button>
                </div>
              )
            })}
          </div>

          {/* Feature Detail / Preview */}
          <div className="flex-1">
            {activeFeatureData ? (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-3xl">{activeFeatureData.icon}</span>
                  <div>
                    <h3 className="font-black">{activeFeatureData.name}</h3>
                    <p className="text-xs text-slate-400">{activeFeatureData.desc}</p>
                  </div>
                  <span className={`ml-auto px-3 py-1 rounded-full text-[10px] font-bold ${
                    enabledFeatures.includes(activeFeatureData.id) ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-700 text-slate-400'
                  }`}>
                    {enabledFeatures.includes(activeFeatureData.id) ? 'ENABLED' : 'DISABLED'}
                  </span>
                </div>
                <div className="bg-slate-800 rounded-xl p-4 mb-4">
                  <p className="text-xs text-slate-400 mb-2">Backend Module</p>
                  <code className="text-xs text-orange-400">convex/{activeFeatureData.module}.ts</code>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-800 rounded-xl p-4">
                    <p className="text-[10px] text-slate-500 uppercase">Status</p>
                    <p className={`text-sm font-bold ${enabledFeatures.includes(activeFeatureData.id) ? 'text-emerald-400' : 'text-slate-400'}`}>
                      {enabledFeatures.includes(activeFeatureData.id) ? 'Deployed' : 'Not Deployed'}
                    </p>
                  </div>
                  <div className="bg-slate-800 rounded-xl p-4">
                    <p className="text-[10px] text-slate-500 uppercase">Module</p>
                    <p className="text-sm font-bold text-blue-400">{activeFeatureData.module}</p>
                  </div>
                </div>
                <button
                  onClick={() => handleToggleFeature(activeFeatureData.id)}
                  className={`w-full mt-4 py-3 rounded-xl text-sm font-bold transition-all ${
                    enabledFeatures.includes(activeFeatureData.id)
                      ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20'
                      : 'bg-orange-500 text-white hover:bg-orange-600'
                  }`}
                >
                  {enabledFeatures.includes(activeFeatureData.id) ? 'Remove from Client' : 'Deploy to Client'}
                </button>
              </div>
            ) : (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                <p className="text-sm font-bold mb-4">Enabled Features ({enabledFeatures.length})</p>
                <div className="grid grid-cols-2 gap-2">
                  {ALL_FEATURES.filter(f => enabledFeatures.includes(f.id)).map(f => (
                    <div key={f.id} className="bg-slate-800 rounded-xl p-3 flex items-center gap-2">
                      <span>{f.icon}</span>
                      <span className="text-xs font-bold">{f.name}</span>
                    </div>
                  ))}
                  {enabledFeatures.length === 0 && (
                    <p className="text-xs text-slate-500 col-span-2 py-4 text-center">No features enabled for this client</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
