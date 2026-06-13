import { useState } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../../convex/_generated/api'

const HYPERSCALE_TYPES = [
  { id: 'H1', name: 'Global Banking & Finance', employees: '500,000+', countries: '50+', price: 49999, agents: 25, icon: '🏦', color: 'from-blue-500/20 to-blue-600/10', border: 'border-blue-500/30', features: ['Fraud Detection', 'KYC Automation', 'Risk Management', 'Compliance Monitoring', 'Trading Algorithms'] },
  { id: 'H2', name: 'International Manufacturing', employees: '1,000,000+', countries: '40+', price: 59999, agents: 30, icon: '🏭', color: 'from-orange-500/20 to-orange-600/10', border: 'border-orange-500/30', features: ['Supply Chain Optimization', 'Predictive Maintenance', 'Quality Control', 'Inventory Management'] },
  { id: 'H3', name: 'Worldwide E-commerce', employees: '800,000+', countries: '60+', price: 69999, agents: 35, icon: '🛒', color: 'from-emerald-500/20 to-emerald-600/10', border: 'border-emerald-500/30', features: ['Personalization Engine', 'Fraud Detection', 'Logistics Optimization', 'Customer Service AI'] },
  { id: 'H4', name: 'Global Healthcare Network', employees: '600,000+', countries: '30+', price: 79999, agents: 28, icon: '🏥', color: 'from-rose-500/20 to-rose-600/10', border: 'border-rose-500/30', features: ['Patient Records', 'Telemedicine', 'Insurance Processing', 'Compliance (HIPAA)'] },
  { id: 'H5', name: 'Multi-National Telecom', employees: '700,000+', countries: '45+', price: 89999, agents: 32, icon: '📡', color: 'from-cyan-500/20 to-cyan-600/10', border: 'border-cyan-500/30', features: ['Network Optimization', 'Customer Churn Prediction', 'Billing Automation', 'Infrastructure Monitoring'] },
  { id: 'H6', name: 'Global Logistics & Shipping', employees: '500,000+', countries: '80+', price: 99999, agents: 40, icon: '🚚', color: 'from-amber-500/20 to-amber-600/10', border: 'border-amber-500/30', features: ['Route Optimization', 'Fleet Management', 'Warehouse Automation', 'Real-time Tracking'] },
  { id: 'H7', name: 'International Energy Corp', employees: '400,000+', countries: '35+', price: 119999, agents: 38, icon: '⚡', color: 'from-yellow-500/20 to-yellow-600/10', border: 'border-yellow-500/30', features: ['Grid Management', 'Predictive Analytics', 'Safety Monitoring', 'Compliance Reporting'] },
  { id: 'H8', name: 'Worldwide Retail Chain', employees: '900,000+', countries: '55+', price: 129999, agents: 45, icon: '🛍️', color: 'from-pink-500/20 to-pink-600/10', border: 'border-pink-500/30', features: ['Inventory Optimization', 'Price Optimization', 'Customer Insights', 'Store Operations'] },
  { id: 'H9', name: 'Global Tech Conglomerate', employees: '1,500,000+', countries: '70+', price: 149999, agents: 50, icon: '🖥️', color: 'from-violet-500/20 to-violet-600/10', border: 'border-violet-500/30', features: ['DevOps Automation', 'Security Monitoring', 'Employee Collaboration', 'Product Development'] },
  { id: 'H10', name: 'Mega Government Agency', employees: '2,000,000+', countries: '100+', price: 199999, agents: 60, icon: '🏛️', color: 'from-indigo-500/20 to-indigo-600/10', border: 'border-indigo-500/30', features: ['Citizen Services', 'Document Processing', 'Compliance Enforcement', 'Data Analytics'] },
]

const REGIONS = ['North America', 'Europe', 'Asia Pacific', 'Latin America', 'Middle East', 'Africa']

export function HyperScaleDashboard({ adminToken }: { adminToken: string }) {
  const [selectedType, setSelectedType] = useState(HYPERSCALE_TYPES[0])
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const allCompanies = useQuery(api.enterprise_companies.listAllCompanies, { adminToken })
  const companyList = allCompanies || []
  const hyperCompanies = companyList.filter((c: any) => c.companyType?.startsWith('H'))

  const totalRevenue = hyperCompanies.reduce((sum: number, c: any) => sum + (c.monthlyPrice || 0), 0)
  const totalAgents = hyperCompanies.reduce((sum: number, c: any) => sum + (c.agentsCount || 0), 0)

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl text-sm font-black ${toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-emerald-600 text-white'}`}>
          {toast.message}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black tracking-tight">Hyper-Scale Applications</h2>
          <p className="text-sm text-slate-400 mt-1">10 massive enterprise types for 500K+ employee companies across multiple countries</p>
        </div>
        <div className="px-4 py-2 bg-gradient-to-r from-purple-500/20 to-blue-500/20 border border-purple-500/30 rounded-xl text-sm text-purple-300 font-black">
          ${totalRevenue.toLocaleString()}/mo · {hyperCompanies.length} Deployed · {totalAgents} Agents
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: 'Hyper-Scale Types', value: '10', icon: '🌐', color: 'text-purple-400' },
          { label: 'Deployed', value: String(hyperCompanies.length), icon: '🚀', color: 'text-emerald-400' },
          { label: 'Total Revenue', value: `$${(totalRevenue / 1000).toFixed(0)}K`, icon: '💰', color: 'text-amber-400' },
          { label: 'Total Agents', value: String(totalAgents), icon: '🤖', color: 'text-blue-400' },
          { label: 'Max Countries', value: '100+', icon: '🌍', color: 'text-rose-400' },
        ].map((m) => (
          <div key={m.label} className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
            <div className="text-lg mb-1">{m.icon}</div>
            <div className={`text-xl font-black ${m.color}`}>{m.value}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">{m.label}</div>
          </div>
        ))}
      </div>

      <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20 rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-black text-slate-300">Revenue Potential</h3>
          <span className="text-[10px] text-slate-500">All 10 hyper-scale types</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          {HYPERSCALE_TYPES.map((t) => (
            <div key={t.id} className="bg-black/20 border border-white/5 rounded-xl p-2 text-center">
              <div className="text-xs font-black text-white">{t.id}</div>
              <div className="text-[10px] text-[#FF6B35] font-black">${(t.price / 1000).toFixed(0)}K/mo</div>
            </div>
          ))}
        </div>
        <div className="mt-3 text-center">
          <div className="text-3xl font-black text-white">$1,049,990<span className="text-sm text-slate-400">/month</span></div>
          <div className="text-xs text-slate-400">$12,599,880 Annual Recurring Revenue</div>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-black text-slate-300 mb-3">Hyper-Scale Company Types</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {HYPERSCALE_TYPES.map((type) => {
            const deployed = hyperCompanies.filter((c: any) => c.companyType === type.id)
            return (
              <div
                key={type.id}
                onClick={() => setSelectedType(type)}
                className={`bg-gradient-to-br ${type.color} border ${type.border} rounded-2xl p-4 cursor-pointer transition-all duration-300 hover:scale-[1.01] ${selectedType.id === type.id ? 'ring-1 ring-[#FF6B35]/30' : ''}`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{type.icon}</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-white">{type.id}</span>
                        <h4 className="text-sm font-black text-white">{type.name}</h4>
                      </div>
                      <div className="text-[10px] text-slate-400">{type.description}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-black text-[#FF6B35]">${type.price.toLocaleString()}/mo</div>
                    <div className="text-[9px] text-slate-500">{deployed.length} deployed</div>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-[10px] text-slate-400 mb-2">
                  <span>👥 {type.employees} employees</span>
                  <span>🌍 {type.countries} countries</span>
                  <span>🤖 {type.agents} agents</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {type.features.map((f) => (
                    <span key={f} className="px-1.5 py-0.5 bg-black/20 border border-white/5 rounded text-[8px] text-slate-400">{f}</span>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
        <h3 className="text-sm font-black text-slate-300 mb-3">Global Regions</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {REGIONS.map((region) => (
            <div key={region} className="bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 rounded-xl p-3 text-center">
              <div className="text-lg mb-1">🌍</div>
              <div className="text-xs font-black text-white">{region}</div>
              <div className="text-[10px] text-slate-500">Active</div>
            </div>
          ))}
        </div>
      </div>

      {selectedType && (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
          <h3 className="text-sm font-black text-slate-300 mb-3">{selectedType.icon} {selectedType.name} — Detailed View</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <div className="bg-black/20 border border-white/5 rounded-xl p-3 text-center">
              <div className="text-xl font-black text-[#FF6B35]">${selectedType.price.toLocaleString()}</div>
              <div className="text-[10px] text-slate-400">Monthly Price</div>
            </div>
            <div className="bg-black/20 border border-white/5 rounded-xl p-3 text-center">
              <div className="text-xl font-black text-white">{selectedType.employees}</div>
              <div className="text-[10px] text-slate-400">Employees</div>
            </div>
            <div className="bg-black/20 border border-white/5 rounded-xl p-3 text-center">
              <div className="text-xl font-black text-white">{selectedType.countries}</div>
              <div className="text-[10px] text-slate-400">Countries</div>
            </div>
            <div className="bg-black/20 border border-white/5 rounded-xl p-3 text-center">
              <div className="text-xl font-black text-blue-400">{selectedType.agents}</div>
              <div className="text-[10px] text-slate-400">AI Agents</div>
            </div>
          </div>
          <div>
            <div className="text-xs font-black text-slate-300 mb-2">AI Agent Capabilities</div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
              {selectedType.features.map((f) => (
                <div key={f} className="bg-black/20 border border-white/5 rounded-xl p-2 text-center">
                  <div className="text-[10px] text-white font-bold">{f}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-3 text-[10px] text-slate-500">Login: https://{HYPERSCALE_TYPES.find(t => t.id === selectedType.id)?.subdomain || selectedType.id.toLowerCase()}.enterprise.dutchkem.com/login</div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
          <h3 className="text-sm font-black text-slate-300 mb-3">Scaling Features (All Active)</h3>
          <div className="space-y-2">
            {[
              { label: 'Auto-Scaling', status: 'Active', detail: '2-50 instances', icon: '📈' },
              { label: 'Multi-Region DB', status: 'Active', detail: '4 regions', icon: '🌍' },
              { label: 'CDN Network', status: 'Active', detail: '8 edge locations', icon: '🌐' },
              { label: 'Redis Cache', status: 'Active', detail: '94% hit rate', icon: '⚡' },
              { label: 'Monitoring', status: 'Active', detail: 'Datadog + New Relic', icon: '📊' },
              { label: 'SLA 99.999%', status: 'Active', detail: '5.26 min/yr downtime', icon: '🛡️' },
              { label: 'Compliance', status: 'Active', detail: 'GDPR + SOC2 + ISO27001', icon: '📜' },
              { label: '24/7 Support', status: 'Active', detail: '< 15min response', icon: '🎧' },
            ].map((f) => (
              <div key={f.label} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                <div className="flex items-center gap-2">
                  <span>{f.icon}</span>
                  <span className="text-xs font-bold text-white">{f.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-400">{f.detail}</span>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/20 text-emerald-400">{f.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
          <h3 className="text-sm font-black text-slate-300 mb-3">Deployed Hyper-Scale Companies ({hyperCompanies.length})</h3>
          {hyperCompanies.length === 0 ? (
            <div className="text-center py-6 text-slate-500 text-sm">No hyper-scale companies deployed yet.</div>
          ) : (
            <div className="space-y-2">
              {hyperCompanies.map((company: any) => {
                const type = HYPERSCALE_TYPES.find(t => t.id === company.companyType)
                return (
                  <div key={company._id} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                    <div className="flex items-center gap-3">
                      <span className="text-lg">{type?.icon || '🏢'}</span>
                      <div>
                        <div className="text-xs font-black text-white">{company.companyName}</div>
                        <div className="text-[10px] text-slate-400">{company.typeName}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-[10px] text-[#FF6B35] font-black">${company.monthlyPrice?.toLocaleString()}/mo</div>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${company.status === 'active' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-500/20 text-slate-400'}`}>{company.status}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
