import { useState } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../../convex/_generated/api'

type ClientRow = { name: string; email: string; phone: string; company: string; clientType: string; assignedSubAdmin: string }

export function PortalClientManagement({ adminToken, organizations }: { adminToken: string, organizations: any[] }) {
  const [selectedOrg, setSelectedOrg] = useState(organizations[0]?._id || '')
  const [selectedCompany, setSelectedCompany] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [showBulk, setShowBulk] = useState(false)
  const [showAssign, setShowAssign] = useState<string | null>(null)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [form, setForm] = useState({ name: '', email: '', phone: '', company: '', clientType: 'individual' })
  const [bulkRows, setBulkRows] = useState<ClientRow[]>([
    { name: '', email: '', phone: '', company: '', clientType: 'individual', assignedSubAdmin: '' },
    { name: '', email: '', phone: '', company: '', clientType: 'individual', assignedSubAdmin: '' },
    { name: '', email: '', phone: '', company: '', clientType: 'individual', assignedSubAdmin: '' },
  ])
  const [bulkProcessing, setBulkProcessing] = useState(false)
  const [bulkResult, setBulkResult] = useState<any>(null)

  // Filters
  const [filterType, setFilterType] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterSubAdmin, setFilterSubAdmin] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')

  const companies = useQuery(api.enterprise_companies.listAllCompanies, adminToken ? { adminToken } : "skip")
  const clients = useQuery(api.enterprise_clients.listAllClients, adminToken ? { adminToken } : "skip")
  const subadmins = useQuery(api.enterprise_subadmins.listAllSubAdmins, adminToken ? { adminToken } : "skip")

  const companyList = companies || []
  const clientList = clients || []
  const subadminList = subadmins || []

  // Apply filters
  const filtered = clientList.filter((c: any) => {
    if (selectedCompany && c.companyId !== selectedCompany) return false
    if (filterType !== 'all' && c.clientType !== filterType) return false
    if (filterStatus !== 'all' && c.status !== filterStatus) return false
    if (filterSubAdmin !== 'all' && c.assignedSubAdmin !== filterSubAdmin) return false
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      return c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q)
    }
    return true
  })

  const createClient = useMutation(api.enterprise_clients.createClient)
  const createBulkClients = useMutation(api.enterprise_clients.createBulkClients)
  const updateStatus = useMutation(api.enterprise_clients.updateClientStatus)
  const deleteClient = useMutation(api.enterprise_clients.deleteClient)
  const assignSubAdminMut = useMutation(api.enterprise_clients.assignSubAdmin)

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 4000)
  }

  // ─── Single Create ───
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

  // ─── Bulk Create ───
  const handleBulkCreate = async () => {
    if (!selectedCompany) { showToast('Select a company first', 'error'); return }
    const validRows = bulkRows.filter(r => r.name.trim() && r.email.trim())
    if (validRows.length === 0) { showToast('Add at least one client with name and email', 'error'); return }

    setBulkProcessing(true)
    setBulkResult(null)
    try {
      const company = companyList.find((c: any) => c.companyId === selectedCompany)
      const result: any = await createBulkClients({
        companyId: selectedCompany,
        orgId: company?.orgId || selectedOrg as any,
        clients: validRows.map(r => ({
          name: r.name.trim(),
          email: r.email.trim(),
          phone: r.phone.trim() || undefined,
          company: r.company.trim() || undefined,
          clientType: r.clientType || undefined,
          assignedSubAdmin: r.assignedSubAdmin || undefined,
        })),
        adminToken,
      })
      if (result?.error) { showToast(result.error, 'error'); return }
      setBulkResult(result)
      showToast(`✅ ${result.created} clients added${result.skipped > 0 ? `, ${result.skipped} skipped` : ''}`, 'success')
      if (result.created > 0) {
        setBulkRows([
          { name: '', email: '', phone: '', company: '', clientType: 'individual', assignedSubAdmin: '' },
          { name: '', email: '', phone: '', company: '', clientType: 'individual', assignedSubAdmin: '' },
          { name: '', email: '', phone: '', company: '', clientType: 'individual', assignedSubAdmin: '' },
        ])
      }
    } catch (e: any) { showToast(e.message || 'Failed', 'error') }
    finally { setBulkProcessing(false) }
  }

  const updateBulkRow = (index: number, field: keyof ClientRow, value: string) => {
    const next = [...bulkRows]
    next[index] = { ...next[index], [field]: value }
    setBulkRows(next)
  }

  const addBulkRow = () => { if (bulkRows.length < 100) setBulkRows([...bulkRows, { name: '', email: '', phone: '', company: '', clientType: 'individual', assignedSubAdmin: '' }]) }
  const removeBulkRow = (index: number) => { if (bulkRows.length > 1) setBulkRows(bulkRows.filter((_, i) => i !== index)) }

  const handlePasteBulk = (text: string) => {
    const lines = text.split('\n').filter(l => l.trim())
    const newRows: ClientRow[] = lines.map(line => {
      const parts = line.split(/[,\t]/).map(p => p.trim())
      return { name: parts[0] || '', email: parts[1] || '', phone: parts[2] || '', company: parts[3] || '', clientType: parts[4] || 'individual', assignedSubAdmin: parts[5] || '' }
    }).filter(r => r.name || r.email)
    if (newRows.length > 0) {
      setBulkRows(newRows.length > 100 ? newRows.slice(0, 100) : newRows)
      showToast(`Loaded ${newRows.length} clients from paste`, 'success')
    }
  }

  // ─── Status / Delete / Assign ───
  const handleStatusChange = async (clientId: string, status: 'active' | 'inactive' | 'suspended') => {
    try { await updateStatus({ clientId: clientId as any, status, adminToken }); showToast('Status updated', 'success') }
    catch (e: any) { showToast(e.message || 'Failed', 'error') }
  }

  const handleDelete = async (clientId: string) => {
    try { await deleteClient({ clientId: clientId as any, adminToken }); showToast('Client deleted', 'success') }
    catch (e: any) { showToast(e.message || 'Failed', 'error') }
  }

  const handleAssign = async (clientIds: string[], subAdminId: string, subAdminName: string) => {
    try {
      await assignSubAdminMut({ clientIds: clientIds as any, subAdminId, subAdminName, adminToken })
      showToast(`${clientIds.length} client(s) assigned to ${subAdminName}`, 'success')
      setShowAssign(null)
    } catch (e: any) { showToast(e.message || 'Failed', 'error') }
  }

  const totalRevenue = filtered.reduce((sum: number, c: any) => sum + (c.totalSpent || 0), 0)
  const validBulkCount = bulkRows.filter(r => r.name.trim() && r.email.trim()).length
  const [selectedClients, setSelectedClients] = useState<Set<string>>(new Set())

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl text-sm font-black z-[100] ${toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-emerald-600 text-white'}`}>
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-black tracking-tight">Client Management</h2>
          <p className="text-sm text-slate-400 mt-1">Manage end-users under each company — assign to sub-admins</p>
        </div>
        <div className="flex items-center gap-2">
          <select value={selectedCompany} onChange={(e) => setSelectedCompany(e.target.value)} className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-[#FF6B35]/50">
            <option value="" className="bg-[#0a0a0f]">All Companies</option>
            {companyList.map((c: any) => <option key={c.companyId} value={c.companyId} className="bg-[#0a0a0f]">{c.companyName}</option>)}
          </select>
          <button onClick={() => setShowCreate(true)} className="px-3 py-2 bg-white/10 hover:bg-white/15 text-white rounded-xl text-xs font-black transition-all border border-white/10">+ Single</button>
          <button onClick={() => { setShowBulk(true); setBulkResult(null) }} className="px-3 py-2 bg-[#FF6B35] hover:bg-[#FF8255] text-white rounded-xl text-xs font-black transition-all">+ Bulk Add</button>
        </div>
      </div>

      {/* Stats */}
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

      {/* ═══════════ FILTERS ═══════════ */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Filters:</span>
          <input
            placeholder="Search name/email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-[#FF6B35]/50 w-48"
          />
          <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs text-white focus:outline-none">
            <option value="all" className="bg-[#0a0a0f]">All Types</option>
            <option value="individual" className="bg-[#0a0a0f]">Individual</option>
            <option value="business" className="bg-[#0a0a0f]">Business</option>
            <option value="enterprise" className="bg-[#0a0a0f]">Enterprise</option>
            <option value="government" className="bg-[#0a0a0f]">Government</option>
          </select>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs text-white focus:outline-none">
            <option value="all" className="bg-[#0a0a0f]">All Status</option>
            <option value="active" className="bg-[#0a0a0f]">Active</option>
            <option value="inactive" className="bg-[#0a0a0f]">Inactive</option>
            <option value="suspended" className="bg-[#0a0a0f]">Suspended</option>
          </select>
          <select value={filterSubAdmin} onChange={(e) => setFilterSubAdmin(e.target.value)} className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs text-white focus:outline-none">
            <option value="all" className="bg-[#0a0a0f]">All Sub-Admins</option>
            <option value="" className="bg-[#0a0a0f]">Unassigned</option>
            {subadminList.map((s: any) => <option key={s._id} value={s._id} className="bg-[#0a0a0f]">{s.name}</option>)}
          </select>
          {(filterType !== 'all' || filterStatus !== 'all' || filterSubAdmin !== 'all' || searchQuery) && (
            <button onClick={() => { setFilterType('all'); setFilterStatus('all'); setFilterSubAdmin('all'); setSearchQuery('') }} className="px-2 py-1 text-[10px] text-[#FF6B35] font-black">Clear</button>
          )}
          <span className="text-[10px] text-slate-500 ml-auto">{filtered.length} results</span>
        </div>
      </div>

      {/* ═══════════ SINGLE ADD MODAL ═══════════ */}
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

      {/* ═══════════ BULK ADD MODAL ═══════════ */}
      {showBulk && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-[#0a0a0f] border border-white/10 rounded-2xl p-6 w-full max-w-5xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-black">Bulk Add Clients</h3>
                <p className="text-xs text-slate-400 mt-1">Paste CSV/TSV or fill the table. Assign clients to sub-admins during creation.</p>
              </div>
              <button onClick={() => setShowBulk(false)} className="text-slate-400 hover:text-white text-lg">✕</button>
            </div>
            <div className="space-y-4">
              <select value={selectedCompany} onChange={(e) => setSelectedCompany(e.target.value)} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-[#FF6B35]/50">
                <option value="" className="bg-[#0a0a0f]">Select Company *</option>
                {companyList.map((c: any) => <option key={c.companyId} value={c.companyId} className="bg-[#0a0a0f]">{c.companyName} ({c.typeName})</option>)}
              </select>
              <div className="bg-white/5 border border-white/10 rounded-xl p-3">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 block">Quick Paste (CSV: name, email, phone, company, type, subAdminId)</label>
                <textarea
                  placeholder={"John Doe, john@example.com, +2348012345678, Acme Corp, individual\nJane Smith, jane@example.com, +2348098765432, Acme Corp, business"}
                  className="w-full h-20 px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-[#FF6B35]/50 resize-none"
                  onBlur={(e) => handlePasteBulk(e.target.value)}
                />
              </div>
              {/* Table */}
              <div className="border border-white/10 rounded-xl overflow-hidden">
                <div className="grid grid-cols-12 gap-px bg-white/5 text-[10px] font-black uppercase tracking-widest text-slate-400">
                  <div className="col-span-1 bg-[#0a0a0f] px-2 py-2">#</div>
                  <div className="col-span-2 bg-[#0a0a0f] px-2 py-2">Name *</div>
                  <div className="col-span-3 bg-[#0a0a0f] px-2 py-2">Email *</div>
                  <div className="col-span-2 bg-[#0a0a0f] px-2 py-2">Phone</div>
                  <div className="col-span-1 bg-[#0a0a0f] px-2 py-2">Company</div>
                  <div className="col-span-1 bg-[#0a0a0f] px-2 py-2">Type</div>
                  <div className="col-span-1 bg-[#0a0a0f] px-2 py-2">Sub-Admin</div>
                  <div className="col-span-1 bg-[#0a0a0f] px-2 py-2"></div>
                </div>
                {bulkRows.map((row, i) => (
                  <div key={i} className="grid grid-cols-12 gap-px bg-white/5">
                    <div className="col-span-1 bg-[#0a0a0f] px-2 py-1 text-xs text-slate-500 flex items-center">{i + 1}</div>
                    <div className="col-span-2 bg-[#0a0a0f] px-1 py-1"><input value={row.name} onChange={(e) => updateBulkRow(i, 'name', e.target.value)} placeholder="Name" className="w-full px-2 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-[#FF6B35]/50" /></div>
                    <div className="col-span-3 bg-[#0a0a0f] px-1 py-1"><input value={row.email} onChange={(e) => updateBulkRow(i, 'email', e.target.value)} placeholder="Email" className="w-full px-2 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-[#FF6B35]/50" /></div>
                    <div className="col-span-2 bg-[#0a0a0f] px-1 py-1"><input value={row.phone} onChange={(e) => updateBulkRow(i, 'phone', e.target.value)} placeholder="Phone" className="w-full px-2 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-[#FF6B35]/50" /></div>
                    <div className="col-span-1 bg-[#0a0a0f] px-1 py-1"><input value={row.company} onChange={(e) => updateBulkRow(i, 'company', e.target.value)} placeholder="Company" className="w-full px-2 py-1.5 bg-white/5 border border-white/10 rounded-lg text-[10px] text-white focus:outline-none" /></div>
                    <div className="col-span-1 bg-[#0a0a0f] px-1 py-1">
                      <select value={row.clientType} onChange={(e) => updateBulkRow(i, 'clientType', e.target.value)} className="w-full px-1 py-1.5 bg-white/5 border border-white/10 rounded-lg text-[10px] text-white focus:outline-none">
                        <option value="individual" className="bg-[#0a0a0f]">Individual</option>
                        <option value="business" className="bg-[#0a0a0f]">Business</option>
                        <option value="enterprise" className="bg-[#0a0a0f]">Enterprise</option>
                        <option value="government" className="bg-[#0a0a0f]">Govt</option>
                      </select>
                    </div>
                    <div className="col-span-1 bg-[#0a0a0f] px-1 py-1">
                      <select value={row.assignedSubAdmin} onChange={(e) => updateBulkRow(i, 'assignedSubAdmin', e.target.value)} className="w-full px-1 py-1.5 bg-white/5 border border-white/10 rounded-lg text-[10px] text-white focus:outline-none">
                        <option value="" className="bg-[#0a0a0f]">None</option>
                        {subadminList.map((s: any) => <option key={s._id} value={s._id} className="bg-[#0a0a0f]">{s.name}</option>)}
                      </select>
                    </div>
                    <div className="col-span-1 bg-[#0a0a0f] px-1 py-1 flex items-center justify-center">
                      <button onClick={() => removeBulkRow(i)} className="text-red-400 hover:text-red-300 text-xs">✕</button>
                    </div>
                  </div>
                ))}
              </div>
              <button onClick={addBulkRow} className="w-full py-2 border border-dashed border-white/10 rounded-xl text-xs text-slate-400 hover:text-white hover:border-[#FF6B35]/50 transition-all">+ Add Row ({bulkRows.length}/100)</button>
              {bulkResult && (
                <div className={`p-4 rounded-xl border ${bulkResult.created > 0 ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
                  <div className="text-sm font-black mb-2">
                    {bulkResult.created > 0 && <span className="text-emerald-400">✅ {bulkResult.created} clients created</span>}
                    {bulkResult.skipped > 0 && <span className="text-amber-400 ml-3">⚠️ {bulkResult.skipped} skipped</span>}
                  </div>
                  {bulkResult.skippedDetails?.length > 0 && (
                    <div className="text-xs text-slate-400 space-y-1">{bulkResult.skippedDetails.map((s: any, i: number) => <div key={i}>• {s.email}: {s.reason}</div>)}</div>
                  )}
                </div>
              )}
              <div className="flex gap-2 pt-2">
                <button onClick={handleBulkCreate} disabled={bulkProcessing || validBulkCount === 0} className="flex-1 px-4 py-3 bg-[#FF6B35] hover:bg-[#FF8255] text-white rounded-xl text-xs font-black transition-all disabled:opacity-50">
                  {bulkProcessing ? 'Processing...' : `Add ${validBulkCount} Client${validBulkCount !== 1 ? 's' : ''}`}
                </button>
                <button onClick={() => setShowBulk(false)} className="px-4 py-3 bg-white/5 border border-white/10 text-slate-400 rounded-xl text-xs font-black hover:text-white">Close</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════ ASSIGN SUB-ADMIN MODAL ═══════════ */}
      {showAssign && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-[#0a0a0f] border border-white/10 rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-black">Assign to Sub-Admin</h3>
              <button onClick={() => setShowAssign(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <p className="text-xs text-slate-400 mb-4">Select a sub-admin to manage {selectedClients.size} selected client(s).</p>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {subadminList.map((s: any) => (
                <button
                  key={s._id}
                  onClick={() => handleAssign(Array.from(selectedClients), s._id, s.name)}
                  className="w-full text-left p-3 bg-white/5 border border-white/10 rounded-xl hover:border-[#FF6B35]/50 transition-all"
                >
                  <div className="text-sm font-black text-white">{s.name}</div>
                  <div className="text-[10px] text-slate-400">{s.email} · {s.role}</div>
                </button>
              ))}
              {subadminList.length === 0 && <div className="text-center text-slate-500 text-sm py-4">No sub-admins found. Create one first.</div>}
            </div>
            <button onClick={() => setShowAssign(null)} className="w-full mt-4 px-4 py-2.5 bg-white/5 border border-white/10 text-slate-400 rounded-xl text-xs font-black hover:text-white">Cancel</button>
          </div>
        </div>
      )}

      {/* ═══════════ CLIENT LIST ═══════════ */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-black text-slate-300">Clients ({filtered.length})</h3>
          {selectedClients.size > 0 && (
            <button onClick={() => setShowAssign('bulk')} className="px-3 py-1.5 bg-purple-500/20 border border-purple-500/30 rounded-lg text-[10px] font-black text-purple-400">
              Assign {selectedClients.size} to Sub-Admin
            </button>
          )}
        </div>
        {filtered.length === 0 ? (
          <div className="text-center py-8 text-slate-500 text-sm">No clients found.</div>
        ) : (
          <div className="space-y-2">
            {filtered.map((client: any) => {
              const company = companyList.find((c: any) => c.companyId === client.companyId)
              const assignedSA = subadminList.find((s: any) => s._id === client.assignedSubAdmin)
              return (
                <div key={client._id} className={`flex items-center justify-between py-3 border-b border-white/5 last:border-0 ${selectedClients.has(client._id) ? 'bg-[#FF6B35]/5 -mx-4 px-4 rounded-xl' : ''}`}>
                  <div className="flex items-center gap-4">
                    <input
                      type="checkbox"
                      checked={selectedClients.has(client._id)}
                      onChange={(e) => {
                        const next = new Set(selectedClients)
                        if (e.target.checked) next.add(client._id); else next.delete(client._id)
                        setSelectedClients(next)
                      }}
                      className="w-4 h-4 accent-[#FF6B35]"
                    />
                    <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center text-sm font-black">{client.name.charAt(0)}</div>
                    <div>
                      <div className="text-sm font-black text-white">{client.name}</div>
                      <div className="text-[10px] text-slate-400">{client.email} · {company?.companyName || 'Unknown'}</div>
                      {assignedSA && <div className="text-[9px] text-purple-400 mt-0.5">👤 {assignedSA.name}</div>}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${client.clientType === 'enterprise' ? 'bg-purple-500/20 text-purple-400' : client.clientType === 'business' ? 'bg-blue-500/20 text-blue-400' : client.clientType === 'government' ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-500/20 text-slate-400'}`}>{client.clientType || 'individual'}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${client.status === 'active' ? 'bg-emerald-500/20 text-emerald-400' : client.status === 'suspended' ? 'bg-red-500/20 text-red-400' : 'bg-slate-500/20 text-slate-400'}`}>{client.status}</span>
                    <div className="flex gap-1">
                      <button onClick={() => handleStatusChange(client._id, client.status === 'active' ? 'suspended' : 'active')} className={`px-2 py-1 rounded-lg text-[9px] font-bold ${client.status === 'active' ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'}`}>{client.status === 'active' ? 'Suspend' : 'Activate'}</button>
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
