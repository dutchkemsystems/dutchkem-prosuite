import { useState } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../../convex/_generated/api'

export function PortalClientManagement({ adminToken, organizations }: { adminToken: string, organizations: any[] }) {
  const [selectedOrg, setSelectedOrg] = useState(organizations[0]?._id || '')
  const [selectedCompany, setSelectedCompany] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [form, setForm] = useState({ name: '', email: '', phone: '', company: '', clientType: 'individual' })

  const companies = useQuery(api.enterprise_companies.listAllCompanies, adminToken ? { adminToken } : "skip")
  const clients = useQuery(api.enterprise_clients.listAllClients, adminToken ? { adminToken } : "skip")
  const subadmins = useQuery(api.enterprise_subadmins.listAllSubAdmins, adminToken ? { adminToken } : "skip")

  const companyList = companies || []
  const clientList = clients || []
  const subadminList = subadmins || []
  const filtered = selectedCompany ? clientList.filter((c: any) => c.companyId === selectedCompany) : clientList

  const createClient = useMutation(api.enterprise_clients.createClient)
  const updateStatus = useMutation(api.enterprise_clients.updateClientStatus)
  const deleteClient = useMutation(api.enterprise_clients.deleteClient)

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  const handleCreate = async () => {
    if (!selectedCompany) { showToast('Select a company first', 'error'); return }
    if (!form.name || !form.email) { showToast('Fill required fields', 'error'); return }
    try {
      const company = companyList.find((c: any) => c.companyId === selectedCompany)
      const result: any = await createClient({
        companyId: selectedCompany,
        orgId: company?.orgId || selectedOrg as any,
        name: form.name,
        email: form.email,
        phone: form.phone || undefined,
        company: form.company || undefined,
        clientType: form.clientType || undefined,
        adminToken,
      })
      if (result?.error) { showToast(result.error, 'error'); return }
      showToast(`${form.name} added as client`, 'success')
      setShowCreate(false)
      setForm({ name: '', email: '', phone: '', company: '', clientType: 'individual' })
    } catch (e: any) { showToast(e.message || 'Failed', 'error') }
  }

  const handleStatusChange = async (clientId: string, status: 'active' | 'inactive' | 'suspended') => {
    try {
      await updateStatus({ clientId: clientId as any, status, adminToken })
      showToast('Status updated', 'success')
    } catch (e: any) { showToast(e.message || 'Failed', 'error') }
  }

  const handleDelete = async (clientId: string) => {
    try {
      await deleteClient({ clientId: clientId as any, adminToken })
      showToast('Client deleted', 'success')
    } catch (e: any) { showToast(e.message || 'Failed', 'error') }
  }

  const totalRevenue = filtered.reduce((sum: number, c: any) => sum + (c.totalSpent || 0), 0)

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl text-sm font-black ${toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-emerald-600 text-white'}`}>
          {toast.message}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black tracking-tight">Client Management</h2>
          <p className="text-sm text-slate-400 mt-1">Manage end-users under each company — data completely isolated</p>
        </div>
        <div className="flex items-center gap-3">
          <select value={selectedCompany} onChange={(e) => setSelectedCompany(e.target.value)} className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-[#FF6B35]/50">
            <option value="" className="bg-[#0a0a0f]">All Companies</option>
            {companyList.map((c: any) => <option key={c.companyId} value={c.companyId} className="bg-[#0a0a0f]">{c.companyName}</option>)}
          </select>
          <button onClick={() => setShowCreate(true)} className="px-4 py-2 bg-[#FF6B35] hover:bg-[#FF8255] text-white rounded-xl text-xs font-black transition-all duration-200">
            + Add Client
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-gradient-to-br from-cyan-500/20 to-cyan-600/10 border border-white/10 rounded-2xl p-4">
          <div className="text-2xl font-black">{filtered.length}</div>
          <div className="text-xs text-slate-400">Total Clients</div>
        </div>
        <div className="bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 border border-white/10 rounded-2xl p-4">
          <div className="text-2xl font-black text-emerald-400">{filtered.filter((c: any) => c.status === 'active').length}</div>
          <div className="text-xs text-slate-400">Active</div>
        </div>
        <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/10 border border-white/10 rounded-2xl p-4">
          <div className="text-2xl font-black text-purple-400">{filtered.filter((c: any) => c.status === 'suspended').length}</div>
          <div className="text-xs text-slate-400">Suspended</div>
        </div>
        <div className="bg-gradient-to-br from-amber-500/20 to-amber-600/10 border border-white/10 rounded-2xl p-4">
          <div className="text-2xl font-black text-amber-400">₦{totalRevenue.toLocaleString()}</div>
          <div className="text-xs text-slate-400">Total Spent</div>
        </div>
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-[#0a0a0f] border border-white/10 rounded-2xl p-6 w-full max-w-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-black">Add Client</h3>
              <button onClick={() => setShowCreate(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <div className="space-y-3">
              <select value={selectedCompany} onChange={(e) => setSelectedCompany(e.target.value)} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-[#FF6B35]/50">
                <option value="" className="bg-[#0a0a0f]">Select Company *</option>
                {companyList.map((c: any) => <option key={c.companyId} value={c.companyId} className="bg-[#0a0a0f]">{c.companyName} ({c.typeName})</option>)}
              </select>
              <input placeholder="Client Name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-[#FF6B35]/50" />
              <input type="email" placeholder="Client Email *" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-[#FF6B35]/50" />
              <input placeholder="Phone (optional)" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-[#FF6B35]/50" />
              <input placeholder="Company Name (optional)" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-[#FF6B35]/50" />
              <select value={form.clientType} onChange={(e) => setForm({ ...form, clientType: e.target.value })} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-[#FF6B35]/50">
                <option value="individual" className="bg-[#0a0a0f]">Individual</option>
                <option value="business" className="bg-[#0a0a0f]">Business</option>
                <option value="enterprise" className="bg-[#0a0a0f]">Enterprise</option>
                <option value="government" className="bg-[#0a0a0f]">Government</option>
              </select>
              <div className="flex gap-2">
                <button onClick={handleCreate} className="flex-1 px-4 py-2.5 bg-[#FF6B35] hover:bg-[#FF8255] text-white rounded-xl text-xs font-black transition-all">Add Client</button>
                <button onClick={() => setShowCreate(false)} className="px-4 py-2.5 bg-white/5 border border-white/10 text-slate-400 rounded-xl text-xs font-black hover:text-white">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
        <h3 className="text-sm font-black text-slate-300 mb-3">Clients ({filtered.length})</h3>
        {filtered.length === 0 ? (
          <div className="text-center py-8 text-slate-500 text-sm">No clients added yet.</div>
        ) : (
          <div className="space-y-2">
            {filtered.map((client: any) => {
              const company = companyList.find((c: any) => c.companyId === client.companyId)
              return (
                <div key={client._id} className="flex items-center justify-between py-3 border-b border-white/5 last:border-0">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center text-sm font-black">{client.name.charAt(0)}</div>
                    <div>
                      <div className="text-sm font-black text-white">{client.name}</div>
                      <div className="text-[10px] text-slate-400">{client.email} · {company?.companyName || 'Unknown'}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-[10px] text-amber-400 font-black">₦{(client.totalSpent || 0).toLocaleString()}</div>
                      <div className="text-[9px] text-slate-500">{client.clientType || 'individual'}</div>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${client.status === 'active' ? 'bg-emerald-500/20 text-emerald-400' : client.status === 'suspended' ? 'bg-red-500/20 text-red-400' : 'bg-slate-500/20 text-slate-400'}`}>{client.status}</span>
                    <div className="flex gap-1">
                      <button onClick={() => handleStatusChange(client._id, client.status === 'active' ? 'suspended' : 'active')} className={`px-2 py-1 rounded-lg text-[9px] font-bold ${client.status === 'active' ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                        {client.status === 'active' ? 'Suspend' : 'Activate'}
                      </button>
                      <button onClick={() => handleDelete(client._id)} className="px-2 py-1 bg-red-500/20 border border-red-500/30 rounded-lg text-[9px] font-bold text-red-400">Delete</button>
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
