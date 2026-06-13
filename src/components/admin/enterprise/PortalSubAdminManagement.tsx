import { useState } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../../convex/_generated/api'

const ROLES = [
  { id: 'company_admin', label: 'Company Admin', desc: 'Full access to company settings', color: 'bg-red-500/20 text-red-400' },
  { id: 'department_manager', label: 'Department Manager', desc: 'Manage department workflows & agents', color: 'bg-blue-500/20 text-blue-400' },
  { id: 'team_lead', label: 'Team Lead', desc: 'View team data, assign tasks', color: 'bg-emerald-500/20 text-emerald-400' },
  { id: 'viewer', label: 'Viewer', desc: 'Read-only access to dashboards', color: 'bg-slate-500/20 text-slate-400' },
]

export function PortalSubAdminManagement({ adminToken, organizations }: { adminToken: string, organizations: any[] }) {
  const [selectedOrg, setSelectedOrg] = useState(organizations[0]?._id || '')
  const [selectedCompany, setSelectedCompany] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [form, setForm] = useState({ name: '', email: '', role: 'company_admin' as string, department: '', password: '' })

  const companies = useQuery(api.enterprise_companies.listAllCompanies, adminToken ? { adminToken } : "skip")
  const subadmins = useQuery(api.enterprise_subadmins.listAllSubAdmins, adminToken ? { adminToken } : "skip")

  const createSubAdmin = useMutation(api.enterprise_subadmins.createSubAdmin)
  const updateRole = useMutation(api.enterprise_subadmins.updateSubAdminRole)
  const toggleStatus = useMutation(api.enterprise_subadmins.toggleSubAdminStatus)
  const deleteSubAdmin = useMutation(api.enterprise_subadmins.deleteSubAdmin)

  const companyList = companies || []
  const subadminList = subadmins || []
  const filtered = selectedCompany ? subadminList.filter((s: any) => s.companyId === selectedCompany) : subadminList

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  const handleCreate = async () => {
    if (!selectedCompany) { showToast('Select a company first', 'error'); return }
    if (!form.name || !form.email || !form.password) { showToast('Fill required fields', 'error'); return }
    try {
      const company = companyList.find((c: any) => c.companyId === selectedCompany)
      const result: any = await createSubAdmin({
        companyId: selectedCompany,
        orgId: company?.orgId || selectedOrg as any,
        name: form.name,
        email: form.email,
        passwordHash: form.password,
        role: form.role as any,
        department: form.department || undefined,
        adminToken,
      })
      if (result?.error) { showToast(result.error, 'error'); return }
      showToast(`${form.name} created as ${form.role}`, 'success')
      setShowCreate(false)
      setForm({ name: '', email: '', role: 'company_admin', department: '', password: '' })
    } catch (e: any) { showToast(e.message || 'Failed', 'error') }
  }

  const handleRoleChange = async (subAdminId: string, role: string) => {
    try {
      await updateRole({ subAdminId: subAdminId as any, role: role as any, adminToken })
      showToast('Role updated', 'success')
    } catch (e: any) { showToast(e.message || 'Failed', 'error') }
  }

  const handleStatusToggle = async (subAdminId: string, currentStatus: string) => {
    try {
      await toggleStatus({ subAdminId: subAdminId as any, status: currentStatus === 'active' ? 'suspended' : 'active', adminToken })
      showToast('Status updated', 'success')
    } catch (e: any) { showToast(e.message || 'Failed', 'error') }
  }

  const handleDelete = async (subAdminId: string) => {
    try {
      await deleteSubAdmin({ subAdminId: subAdminId as any, adminToken })
      showToast('Sub-admin deleted', 'success')
    } catch (e: any) { showToast(e.message || 'Failed', 'error') }
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
          <h2 className="text-2xl font-black tracking-tight">Sub-Admin Management</h2>
          <p className="text-sm text-slate-400 mt-1">Create and manage sub-admins with role-based access</p>
        </div>
        <div className="flex items-center gap-3">
          <select value={selectedCompany} onChange={(e) => setSelectedCompany(e.target.value)} className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-[#FF6B35]/50">
            <option value="" className="bg-[#0a0a0f]">All Companies</option>
            {companyList.map((c: any) => <option key={c.companyId} value={c.companyId} className="bg-[#0a0a0f]">{c.companyName}</option>)}
          </select>
          <button onClick={() => setShowCreate(true)} className="px-4 py-2 bg-[#FF6B35] hover:bg-[#FF8255] text-white rounded-xl text-xs font-black transition-all duration-200">
            + Create Sub-Admin
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {ROLES.map((role) => (
          <div key={role.id} className="bg-white/5 border border-white/10 rounded-xl p-3">
            <div className={`px-2 py-0.5 rounded-full text-[9px] font-black ${role.color} w-fit mb-2`}>{role.label}</div>
            <div className="text-xl font-black">{subadminList.filter((s: any) => s.role === role.id).length}</div>
            <div className="text-[10px] text-slate-400">{role.desc}</div>
          </div>
        ))}
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-[#0a0a0f] border border-white/10 rounded-2xl p-6 w-full max-w-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-black">Create Sub-Admin</h3>
              <button onClick={() => setShowCreate(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <div className="space-y-3">
              <select value={selectedCompany} onChange={(e) => setSelectedCompany(e.target.value)} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-[#FF6B35]/50">
                <option value="" className="bg-[#0a0a0f]">Select Company *</option>
                {companyList.map((c: any) => <option key={c.companyId} value={c.companyId} className="bg-[#0a0a0f]">{c.companyName} ({c.typeName})</option>)}
              </select>
              <input placeholder="Full Name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-[#FF6B35]/50" />
              <input type="email" placeholder="Email *" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-[#FF6B35]/50" />
              <input type="password" placeholder="Temporary Password *" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-[#FF6B35]/50" />
              <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-[#FF6B35]/50">
                {ROLES.map((r) => <option key={r.id} value={r.id} className="bg-[#0a0a0f]">{r.label} — {r.desc}</option>)}
              </select>
              <input placeholder="Department (optional)" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-[#FF6B35]/50" />
              <div className="flex gap-2">
                <button onClick={handleCreate} className="flex-1 px-4 py-2.5 bg-[#FF6B35] hover:bg-[#FF8255] text-white rounded-xl text-xs font-black transition-all">Create Sub-Admin</button>
                <button onClick={() => setShowCreate(false)} className="px-4 py-2.5 bg-white/5 border border-white/10 text-slate-400 rounded-xl text-xs font-black hover:text-white">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
        <h3 className="text-sm font-black text-slate-300 mb-3">Sub-Admins ({filtered.length})</h3>
        {filtered.length === 0 ? (
          <div className="text-center py-8 text-slate-500 text-sm">No sub-admins created yet.</div>
        ) : (
          <div className="space-y-2">
            {filtered.map((sa: any) => {
              const role = ROLES.find(r => r.id === sa.role)
              const company = companyList.find((c: any) => c.companyId === sa.companyId)
              return (
                <div key={sa._id} className="flex items-center justify-between py-3 border-b border-white/5 last:border-0">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center text-sm font-black">{sa.name.charAt(0)}</div>
                    <div>
                      <div className="text-sm font-black text-white">{sa.name}</div>
                      <div className="text-[10px] text-slate-400">{sa.email} · {company?.companyName || 'Unknown'}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${role?.color || 'bg-slate-500/20 text-slate-400'}`}>{role?.label || sa.role}</span>
                    {sa.department && <span className="text-[10px] text-slate-500">{sa.department}</span>}
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${sa.status === 'active' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>{sa.status}</span>
                    <div className="flex gap-1">
                      <select value={sa.role} onChange={(e) => handleRoleChange(sa._id, e.target.value)} className="px-2 py-1 bg-white/5 border border-white/10 rounded-lg text-[9px] text-white">
                        {ROLES.map((r) => <option key={r.id} value={r.id} className="bg-[#0a0a0f]">{r.label}</option>)}
                      </select>
                      <button onClick={() => handleStatusToggle(sa._id, sa.status)} className={`px-2 py-1 rounded-lg text-[9px] font-bold ${sa.status === 'active' ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                        {sa.status === 'active' ? 'Suspend' : 'Activate'}
                      </button>
                      <button onClick={() => handleDelete(sa._id)} className="px-2 py-1 bg-red-500/20 border border-red-500/30 rounded-lg text-[9px] font-bold text-red-400">Delete</button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
