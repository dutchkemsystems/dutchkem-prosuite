import { useState } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../../convex/_generated/api'

const TIER_COLORS: Record<string, string> = {
  standard: 'from-gray-500/20 to-gray-600/10 border-gray-500/30',
  premium: 'from-blue-500/20 to-blue-600/10 border-blue-500/30',
  enterprise: 'from-purple-500/20 to-purple-600/10 border-purple-500/30',
  global: 'from-amber-500/20 to-amber-600/10 border-amber-500/30',
}

const COMPLIANCE_COLORS: Record<string, string> = {
  GDPR: 'from-blue-500/20 to-blue-600/10 border-blue-500/30',
  SOC2: 'from-emerald-500/20 to-emerald-600/10 border-emerald-500/30',
  ISO27001: 'from-purple-500/20 to-purple-600/10 border-purple-500/30',
  HIPAA: 'from-rose-500/20 to-rose-600/10 border-rose-500/30',
  PCI_DSS: 'from-amber-500/20 to-amber-600/10 border-amber-500/30',
}

export function SLAComplianceDashboard({ adminToken }: { adminToken: string }) {
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const dashboard = useQuery(api.enterprise_sla.getSLADashboard, { adminToken })
  const allSLAs = useQuery(api.enterprise_sla.listAllSLAs, { adminToken })
  const allCompliance = useQuery(api.enterprise_sla.listAllComplianceDocs, { adminToken })

  const data = dashboard || {}
  const slas = allSLAs || []
  const compliance = allCompliance || []

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  const slaTiers = data.slaTiers || {
    standard: { uptime: 99.9, credit: 10, price: 0, responseTime: 60, resolutionTime: 24 },
    premium: { uptime: 99.99, credit: 25, price: 999, responseTime: 30, resolutionTime: 8 },
    enterprise: { uptime: 99.999, credit: 50, price: 4999, responseTime: 15, resolutionTime: 4 },
    global: { uptime: 99.9999, credit: 100, price: 9999, responseTime: 5, resolutionTime: 1 },
  }

  const complianceStandards = data.complianceStandards || [
    { standard: "GDPR", description: "EU General Data Protection Regulation", controls: ["data_processing", "data_subject_rights", "consent_management", "data_breach_notification", "data_protection_impact"] },
    { standard: "SOC2", description: "SOC 2 Type II Security Compliance", controls: ["security", "availability", "processing_integrity", "confidentiality", "privacy"] },
    { standard: "ISO27001", description: "ISO/IEC 27001 Information Security", controls: ["risk_management", "access_control", "cryptography", "physical_security", "operations_security"] },
    { standard: "HIPAA", description: "Health Insurance Portability and Accountability", controls: ["privacy_rule", "security_rule", "breach_notification", "business_associate", "minimum_necessary"] },
    { standard: "PCI_DSS", description: "Payment Card Industry Data Security Standard", controls: ["network_security", "data_protection", "vulnerability_management", "access_control", "monitoring"] },
  ]

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl text-sm font-black ${toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-emerald-600 text-white'}`}>
          {toast.message}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black tracking-tight">SLA & Compliance</h2>
          <p className="text-sm text-slate-400 mt-1">99.999% uptime SLA management + GDPR/SOC2 compliance documentation</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 border border-white/10 rounded-2xl p-4">
          <div className="text-2xl font-black text-emerald-400">{data.activeSLAs ?? 0}</div>
          <div className="text-xs text-slate-400">Active SLAs</div>
        </div>
        <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/10 border border-white/10 rounded-2xl p-4">
          <div className="text-2xl font-black text-blue-400">{data.openIncidents ?? 0}</div>
          <div className="text-xs text-slate-400">Open Incidents</div>
        </div>
        <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/10 border border-white/10 rounded-2xl p-4">
          <div className="text-2xl font-black text-purple-400">{data.compliantDocs ?? 0}</div>
          <div className="text-xs text-slate-400">Compliant Standards</div>
        </div>
        <div className="bg-gradient-to-br from-amber-500/20 to-amber-600/10 border border-white/10 rounded-2xl p-4">
          <div className="text-2xl font-black text-amber-400">99.999%</div>
          <div className="text-xs text-slate-400">SLA Target</div>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-black text-slate-300 mb-3">SLA Tiers</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Object.entries(slaTiers).map(([tier, config]: [string, any]) => {
            const count = slas.filter((s: any) => s.tier === tier).length
            return (
              <div key={tier} className={`bg-gradient-to-br ${TIER_COLORS[tier]} border rounded-2xl p-4`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-black text-white uppercase">{tier}</span>
                  <span className="text-[10px] text-slate-400">{count} active</span>
                </div>
                <div className="text-2xl font-black text-white">{config.uptime}%</div>
                <div className="text-[10px] text-slate-400 mt-1">Uptime Guarantee</div>
                <div className="mt-3 space-y-1 text-[10px]">
                  <div className="flex justify-between"><span className="text-slate-400">Credit</span><span className="text-white font-bold">{config.credit}%</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">Response</span><span className="text-white font-bold">&lt; {config.responseTime}min</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">Resolution</span><span className="text-white font-bold">&lt; {config.resolutionTime}h</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">Price</span><span className="text-[#FF6B35] font-black">${config.price.toLocaleString()}/mo</span></div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-black text-slate-300 mb-3">Active SLA Agreements ({slas.length})</h3>
        {slas.length === 0 ? (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center text-slate-500 text-sm">No SLA agreements created yet.</div>
        ) : (
          <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
            <div className="grid grid-cols-6 gap-4 p-3 border-b border-white/5 text-[10px] font-black uppercase tracking-widest text-slate-500">
              <div>Company</div><div>Tier</div><div>Uptime</div><div>Response</div><div>Status</div><div>Expiry</div>
            </div>
            {slas.map((sla: any) => (
              <div key={sla._id} className="grid grid-cols-6 gap-4 p-3 border-b border-white/5 items-center hover:bg-white/5">
                <div className="text-xs font-bold text-white">{sla.companyId}</div>
                <div className={`px-2 py-0.5 rounded-full text-[9px] font-black ${sla.tier === 'enterprise' ? 'bg-purple-500/20 text-purple-400' : sla.tier === 'global' ? 'bg-amber-500/20 text-amber-400' : 'bg-blue-500/20 text-blue-400'}`}>{sla.tier}</div>
                <div className="text-xs text-white">{sla.uptimeGuarantee}%</div>
                <div className="text-xs text-slate-400">&lt; {sla.responseTimeMinutes}min</div>
                <div className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${sla.status === 'active' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-500/20 text-slate-400'}`}>{sla.status}</div>
                <div className="text-[10px] text-slate-500">{sla.expiryDate ? new Date(sla.expiryDate).toLocaleDateString() : 'N/A'}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <h3 className="text-sm font-black text-slate-300 mb-3">Compliance Documentation</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {complianceStandards.map((std: any) => {
            const doc = compliance.find((c: any) => c.standard === std.standard)
            const colors = COMPLIANCE_COLORS[std.standard] || 'from-slate-500/20 to-slate-600/10 border-slate-500/30'
            return (
              <div key={std.standard} className={`bg-gradient-to-br ${colors} border rounded-2xl p-4`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-black text-white">{std.standard}</span>
                  {doc ? (
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/20 text-emerald-400">CERTIFIED</span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-slate-500/20 text-slate-400">NOT STARTED</span>
                  )}
                </div>
                <p className="text-[10px] text-slate-400 mb-3">{std.description}</p>
                <div className="space-y-1">
                  {std.controls.map((ctrl: string) => (
                    <div key={ctrl} className="flex items-center gap-2 text-[10px]">
                      <span className={doc?.controls?.[ctrl] ? 'text-emerald-400' : 'text-slate-500'}>
                        {doc?.controls?.[ctrl] ? '✅' : '⬜'}
                      </span>
                      <span className="text-slate-300 capitalize">{ctrl.replace(/_/g, ' ')}</span>
                    </div>
                  ))}
                </div>
                {doc && (
                  <div className="mt-3 pt-3 border-t border-white/10 text-[9px] text-slate-500">
                    Last audit: {new Date(doc.lastAuditDate).toLocaleDateString()} · Next: {new Date(doc.nextAuditDate).toLocaleDateString()}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
