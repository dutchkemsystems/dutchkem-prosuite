import { useState } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../../convex/_generated/api'
import { COMPANY_TYPES } from './portal-company-types';


export function PortalCompanyManagement({ adminToken, organizations }: { adminToken: string, organizations: any[] }) {
  const [selectedType, setSelectedType] = useState(COMPANY_TYPES[0])
  const [showCreate, setShowCreate] = useState(false)
  const [selectedOrg, setSelectedOrg] = useState(organizations[0]?._id || '')
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [form, setForm] = useState({ companyName: '', contactEmail: '', contactPhone: '', address: '' })

  const companies = useQuery(api.enterprise_companies.listAllCompanies, { adminToken })
  const companyList = companies || []

  const createCompany = useMutation(api.enterprise_companies.createCompany)
  const updateStatus = useMutation(api.enterprise_companies.updateCompanyStatus)
  const deleteCompany = useMutation(api.enterprise_companies.deleteCompany)

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  const handleCreate = async () => {
    if (!selectedOrg) { showToast('Select an organization first', 'error'); return }
    if (!form.companyName || !form.contactEmail) { showToast('Fill required fields', 'error'); return }
    try {
      const result: any = await createCompany({
        orgId: selectedOrg as any,
        companyType: selectedType.id,
        companyName: form.companyName,
        contactEmail: form.contactEmail,
        contactPhone: form.contactPhone || undefined,
        address: form.address || undefined,
        adminToken,
      })
      if (result?.error) { showToast(result.error, 'error'); return }
      showToast(`${form.companyName} created! Login: ${result.loginUrl}`, 'success')
      setShowCreate(false)
      setForm({ companyName: '', contactEmail: '', contactPhone: '', address: '' })
    } catch (e: any) { showToast(e.message || 'Failed', 'error') }
  }

  const handleStatusChange = async (companyId: string, status: 'active' | 'suspended' | 'pending') => {
    try {
      await updateStatus({ companyId, status, adminToken })
      showToast('Status updated', 'success')
    } catch (e: any) { showToast(e.message || 'Failed', 'error') }
  }

  const handleDelete = async (companyId: string) => {
    try {
      await deleteCompany({ companyId, adminToken })
      showToast('Company deleted', 'success')
    } catch (e: any) { showToast(e.message || 'Failed', 'error') }
  }

  const totalRevenue = companyList.reduce((sum: number, c: any) => sum + c.monthlyPrice, 0)

  return (
    <div className="space-y-6 ">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl text-sm font-black ${toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-emerald-600 text-white'}`}>
          {toast.message}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black tracking-tight">Company Management</h2>
          <p className="text-sm text-slate-400 mt-1">Create companies from 120 types — S1-S5 (Small), M1-M5 (Enterprise), H1-H10 (Hyper-Scale) + 100 Industry Types</p>
        </div>
        <div className="flex items-center gap-3">
          <select value={selectedOrg} onChange={(e) => setSelectedOrg(e.target.value)} className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-[#FF6B35]/50">
            <option value="" className="bg-[#0a0a0f]">Select organization...</option>
            {organizations.map((o: any) => <option key={o._id} value={o._id} className="bg-[#0a0a0f]">{o.name}</option>)}
          </select>
          <button onClick={() => setShowCreate(true)} className="px-4 py-2 bg-[#FF6B35] hover:bg-[#FF8255] text-white rounded-xl text-xs font-black transition-all duration-200">
            + Create Company
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-gradient-to-br from-orange-500/20 to-orange-600/10 border border-white/10 rounded-2xl p-4">
          <div className="text-2xl font-black">{companyList.length}</div>
          <div className="text-xs text-slate-400">Total Companies</div>
        </div>
        <div className="bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 border border-white/10 rounded-2xl p-4">
          <div className="text-2xl font-black text-emerald-400">{companyList.filter((c: any) => c.status === 'active').length}</div>
          <div className="text-xs text-slate-400">Active</div>
        </div>
        <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/10 border border-white/10 rounded-2xl p-4">
          <div className="text-2xl font-black text-blue-400">{companyList.filter((c: any) => c.size === 'small').length}</div>
          <div className="text-xs text-slate-400">Small (S1-S5)</div>
        </div>
        <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/10 border border-white/10 rounded-2xl p-4">
          <div className="text-2xl font-black text-purple-400">{COMPANY_TYPES.length}</div>
          <div className="text-xs text-slate-400">Total Types Available</div>
        </div>
        <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/10 border border-white/10 rounded-2xl p-4">
          <div className="text-2xl font-black text-purple-400">{companyList.filter((c: any) => c.size === 'enterprise').length}</div>
          <div className="text-xs text-slate-400">Enterprise (M1-M5)</div>
        </div>
        <div className="bg-gradient-to-br from-amber-500/20 to-amber-600/10 border border-white/10 rounded-2xl p-4">
          <div className="text-2xl font-black text-amber-400">{companyList.filter((c: any) => c.size === 'hyper-scale').length}</div>
          <div className="text-xs text-slate-400">Hyper-Scale (H1-H10)</div>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-black text-slate-300 mb-3">Company Types ({COMPANY_TYPES.length} total)</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {COMPANY_TYPES.map((type) => {
            const count = companyList.filter((c: any) => c.companyType === type.id).length
            return (
              <div
                key={type.id}
                onClick={() => { setSelectedType(type); setShowCreate(true) }}
                className={`bg-gradient-to-br ${type.color} border ${type.border} rounded-2xl p-4 cursor-pointer transition-all duration-300 hover:scale-[1.02]`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-2xl">{type.icon}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-black ${type.size === 'small' ? 'bg-emerald-500/20 text-emerald-400' : type.size === 'hyper-scale' ? 'bg-amber-500/20 text-amber-400' : 'bg-purple-500/20 text-purple-400'}`}>
                    {type.size.toUpperCase()}
                  </span>
                </div>
                <h4 className="text-xs font-black text-white mb-1">{type.name}</h4>
                <p className="text-[10px] text-slate-400 mb-2">{type.description}</p>
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-[#FF6B35] font-black">${type.price}/mo</span>
                  <span className="text-slate-500">{type.employees} emp</span>
                </div>
                <div className="text-[9px] text-slate-500 mt-1">{type.agents} agents · {count} created</div>
              </div>
            )
          })}
        </div>
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-[#0a0a0f] border border-white/10 rounded-2xl p-6 w-full max-w-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-black">Create {selectedType.name}</h3>
              <button onClick={() => setShowCreate(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <div className="flex items-center gap-3 mb-4 p-3 bg-white/5 rounded-xl">
              <span className="text-2xl">{selectedType.icon}</span>
              <div>
                <div className="text-sm font-black">{selectedType.name}</div>
                <div className="text-[10px] text-slate-400">${selectedType.price}/mo · {selectedType.employees} employees · {selectedType.agents} agents</div>
              </div>
            </div>
            <div className="space-y-3">
              <input placeholder="Company Name *" value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-[#FF6B35]/50" />
              <input type="email" placeholder="Contact Email *" value={form.contactEmail} onChange={(e) => setForm({ ...form, contactEmail: e.target.value })} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-[#FF6B35]/50" />
              <input placeholder="Contact Phone" value={form.contactPhone} onChange={(e) => setForm({ ...form, contactPhone: e.target.value })} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-[#FF6B35]/50" />
              <input placeholder="Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-[#FF6B35]/50" />
              <div className="text-[10px] text-slate-500">Login URL: https://{selectedType.subdomain}.enterprise.dutchkem.com/login</div>
              <div className="flex gap-2">
                <button onClick={handleCreate} className="flex-1 px-4 py-2.5 bg-[#FF6B35] hover:bg-[#FF8255] text-white rounded-xl text-xs font-black transition-all">Create & Sync to Hub</button>
                <button onClick={() => setShowCreate(false)} className="px-4 py-2.5 bg-white/5 border border-white/10 text-slate-400 rounded-xl text-xs font-black hover:text-white">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
        <h3 className="text-sm font-black text-slate-300 mb-3">Created Companies</h3>
        {companyList.length === 0 ? (
          <div className="text-center py-8 text-slate-500 text-sm">No companies created yet. Click a company type above or "Create Company" to start.</div>
        ) : (
          <div className="space-y-2">
            {companyList.map((company: any) => (
              <div key={company._id} className="flex items-center justify-between py-3 border-b border-white/5 last:border-0">
                <div className="flex items-center gap-4">
                  <span className="text-xl">{COMPANY_TYPES.find(t => t.id === company.companyType)?.icon || '🏢'}</span>
                  <div>
                    <div className="text-sm font-black text-white">{company.companyName}</div>
                    <div className="text-[10px] text-slate-400">{company.typeName} · {company.contactEmail}</div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-[10px] text-[#FF6B35] font-black">${company.monthlyPrice}/mo</div>
                    <div className="text-[9px] text-slate-500">{company.employeeRange} employees</div>
                  </div>
                  <code className="px-2 py-1 bg-white/5 border border-white/10 rounded text-[9px] text-slate-400">{company.subdomain}.enterprise.dutchkem.com</code>
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${company.status === 'active' ? 'bg-emerald-500/20 text-emerald-400' : company.status === 'suspended' ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'}`}>
                    {company.status}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${company.syncStatus === 'synced' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                    {company.syncStatus}
                  </span>
                  <div className="flex gap-1">
                    {company.status === 'active' ? (
                      <button onClick={() => handleStatusChange(company.companyId, 'suspended')} className="px-2 py-1 bg-red-500/20 border border-red-500/30 rounded-lg text-[9px] font-bold text-red-400 hover:bg-red-500/30">Suspend</button>
                    ) : (
                      <button onClick={() => handleStatusChange(company.companyId, 'active')} className="px-2 py-1 bg-emerald-500/20 border border-emerald-500/30 rounded-lg text-[9px] font-bold text-emerald-400 hover:bg-emerald-500/30">Activate</button>
                    )}
                    <button onClick={() => handleDelete(company.companyId)} className="px-2 py-1 bg-red-500/20 border border-red-500/30 rounded-lg text-[9px] font-bold text-red-400 hover:bg-red-500/30">Delete</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
