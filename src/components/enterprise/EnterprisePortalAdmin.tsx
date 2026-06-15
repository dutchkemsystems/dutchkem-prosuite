import { useQuery, useMutation } from 'convex/react'
import { useState, useEffect } from 'react'
import { api } from '../../../convex/_generated/api'
import { PortalCompanyManagement } from '~/components/admin/enterprise/PortalCompanyManagement'
import { PortalSubAdminManagement } from '~/components/admin/enterprise/PortalSubAdminManagement'
import { PortalClientManagement } from '~/components/admin/enterprise/PortalClientManagement'

const PORTAL_TABS = [
  { id: 'overview', label: 'Organizations', icon: '🏢' },
  { id: 'companies', label: 'Company Types', icon: '🏭' },
  { id: 'subadmins', label: 'Sub-Admins', icon: '👥' },
  { id: 'clients', label: 'Clients', icon: '👤' },
] as const

type PortalTabId = typeof PORTAL_TABS[number]['id']

export function EnterprisePortalAdmin({ adminToken }: { adminToken: string }) {
  const [activeTab, setActiveTab] = useState<PortalTabId>('overview')
  const [filter, setFilter] = useState('all')
  const [showCreateOrg, setShowCreateOrg] = useState(false)
  const [showCreateAdmin, setShowCreateAdmin] = useState<string | null>(null)
  const [expandedOrg, setExpandedOrg] = useState<string | null>(null)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [orgForm, setOrgForm] = useState({ name: '', email: '', industry: '', size: '', phone: '', website: '', subdomain: '', address: '', city: '', country: '', billingEmail: '', taxId: '', plan: 'trial', adminEmail: '', adminPassword: '', confirmPassword: '' })
  const [adminForm, setAdminForm] = useState({ name: '', email: '' })
  const [creating, setCreating] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [showPasswords, setShowPasswords] = useState<string | null>(null)
  const [showEditOrg, setShowEditOrg] = useState<string | null>(null)
  const [editOrgForm, setEditOrgForm] = useState({ name: '', email: '', industry: '', size: '', phone: '', website: '', subdomain: '', address: '', city: '', country: '', billingEmail: '', taxId: '' })

  const effectiveToken = adminToken || ''
  const orgs = useQuery(api.admin_enterprise.listOrganizations, effectiveToken ? { adminToken: effectiveToken } : 'skip')
  const createOrganization = useMutation(api.admin_enterprise.createOrganization)
  const createOrgAdminUser = useMutation(api.admin_enterprise.createOrgAdminUser)
  const resetOrgUserPassword = useMutation(api.admin_enterprise.resetOrgUserPassword)
  const toggleOrgUserStatus = useMutation(api.admin_enterprise.toggleOrgUserStatus)
  const deleteOrganization = useMutation(api.admin_enterprise.deleteOrganization)
  const adminUpdateOrg = useMutation(api.enterprise_auth.adminUpdateOrg)
  const getOrganizationPasswords = useQuery(api.enterprise_management.getOrganizationPasswords, showPasswords ? { orgId: showPasswords as any, adminToken: effectiveToken } : 'skip')
  const updateCompanyInfo = useMutation(api.enterprise_management.updateCompanyInfo)

  const orgUsers = useQuery(
    api.admin_enterprise.listOrgUsers,
    expandedOrg ? { adminToken: effectiveToken, orgId: expandedOrg as any } : 'skip'
  )

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 6000)
  }

  if (!effectiveToken) {
    return <div className="p-12 text-center text-red-400">Admin session expired. Please refresh the page.</div>
  }

  const data = Array.isArray(orgs) ? orgs : []
  const filtered = filter === 'all' ? data : data.filter((o: any) => o.status === filter)

  const organizations = data

  const stats = {
    total: data.length,
    active: data.filter((o: any) => o.status === 'active').length,
    trial: data.filter((o: any) => o.status === 'trial').length,
    suspended: data.filter((o: any) => o.status === 'suspended').length,
    totalUsers: data.reduce((sum: number, o: any) => sum + (o.userCount || 0), 0),
  }

  const renderTab = () => {
    switch (activeTab) {
      case 'companies':
        return <PortalCompanyManagement adminToken={effectiveToken} organizations={organizations} />
      case 'subadmins':
        return <PortalSubAdminManagement adminToken={effectiveToken} organizations={organizations} />
      case 'clients':
        return <PortalClientManagement adminToken={effectiveToken} organizations={organizations} />
      default:
        return null
    }
  }

  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault()
    if (orgForm.adminPassword !== orgForm.confirmPassword) {
      return
    }
    setCreating(true)
    try {
      const result = await createOrganization({
        adminToken: effectiveToken,
        name: orgForm.name,
        email: orgForm.email,
        industry: orgForm.industry,
        size: orgForm.size,
        phone: orgForm.phone,
        website: orgForm.website,
        subdomain: orgForm.subdomain,
        address: orgForm.address,
        city: orgForm.city,
        country: orgForm.country,
        billingEmail: orgForm.billingEmail,
        taxId: orgForm.taxId,
        plan: orgForm.plan as any,
        adminName: orgForm.name,
        adminEmail: orgForm.adminEmail || orgForm.email,
        adminPassword: orgForm.adminPassword || undefined,
      })
      if (result?.error) {
        showToast(result.error, 'error')
        setCreating(false)
        return
      }
      setShowCreateOrg(false)
      setOrgForm({ name: '', email: '', industry: '', size: '', phone: '', website: '', subdomain: '', address: '', city: '', country: '', billingEmail: '', taxId: '', plan: 'trial', adminEmail: '', adminPassword: '', confirmPassword: '' })
      showToast(`Organization created! Admin: ${result.adminEmail} | Temp password: ${result.tempPassword}`, 'success')
      setRefreshKey(k => k + 1)
    } catch (err: any) {
      showToast(err.message || 'Failed to create organization', 'error')
    }
    setCreating(false)
  }

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!showCreateAdmin) return
    try {
      const result = await createOrgAdminUser({ adminToken: effectiveToken, orgId: showCreateAdmin as any, name: adminForm.name, email: adminForm.email })
      if (result?.error) { showToast(result.error, 'error'); return }
      setShowCreateAdmin(null)
      setAdminForm({ name: '', email: '' })
      showToast(`Admin created! Temp password: ${result.tempPassword}`, 'success')
    } catch (err: any) {
      showToast(err.message || 'Failed to create admin user', 'error')
    }
  }

  const handleUpgrade = async (orgId: string) => {
    try {
      await adminUpdateOrg({ adminToken: effectiveToken, orgId: orgId as any, status: 'active', plan: 'growth' })
      showToast('Organization upgraded', 'success')
    } catch (err: any) {
      showToast(err.message || 'Failed to upgrade', 'error')
    }
  }

  const handleSuspend = async (orgId: string) => {
    try {
      await adminUpdateOrg({ adminToken: effectiveToken, orgId: orgId as any, status: 'suspended' })
      showToast('Organization suspended', 'success')
    } catch (err: any) {
      showToast(err.message || 'Failed to suspend', 'error')
    }
  }

  const handleReinstate = async (orgId: string) => {
    try {
      await adminUpdateOrg({ adminToken: effectiveToken, orgId: orgId as any, status: 'active' })
      showToast('Organization reinstated', 'success')
    } catch (err: any) {
      showToast(err.message || 'Failed to reinstate', 'error')
    }
  }

  const handleDelete = async (orgId: string) => {
    if (!confirm('Are you sure you want to delete this organization?')) return
    try {
      await deleteOrganization({ adminToken: effectiveToken, orgId: orgId as any })
      showToast('Organization deleted', 'success')
    } catch (err: any) {
      showToast(err.message || 'Failed to delete', 'error')
    }
  }

  const handleResetPassword = async (userId: string) => {
    try {
      const result = await resetOrgUserPassword({ adminToken: effectiveToken, userId: userId as any })
      if (result?.error) { showToast(result.error, 'error'); return }
      showToast(`Password reset. New temp password: ${result.tempPassword}`, 'success')
    } catch (err: any) {
      showToast(err.message || 'Failed to reset password', 'error')
    }
  }

  const handleToggleUserStatus = async (userId: string, currentStatus: string) => {
    try {
      await toggleOrgUserStatus({ adminToken: effectiveToken, userId: userId as any, status: currentStatus === 'active' ? 'suspended' : 'active' })
      showToast('User status updated', 'success')
    } catch (err: any) {
      showToast(err.message || 'Failed to update user status', 'error')
    }
  }

  const handleViewPasswords = (orgId: string) => {
    setShowPasswords(orgId)
  }

  const handleEditOrg = (org: any) => {
    setEditOrgForm({
      name: org.name || '',
      email: org.email || '',
      industry: org.industry || '',
      size: org.size || '',
      phone: org.phone || '',
      website: org.website || '',
      subdomain: org.subdomain || '',
      address: org.address || '',
      city: org.city || '',
      country: org.country || '',
      billingEmail: org.billingEmail || '',
      taxId: org.taxId || '',
    })
    setShowEditOrg(org._id)
  }

  const handleSaveEditOrg = async () => {
    if (!showEditOrg) return
    try {
      await updateCompanyInfo({
        orgId: showEditOrg as any,
        adminToken: effectiveToken,
        ...editOrgForm,
      })
      showToast('Company information updated', 'success')
      setShowEditOrg(null)
      setRefreshKey(k => k + 1)
    } catch (err: any) {
      showToast(err.message || 'Failed to update company info', 'error')
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl text-sm font-black max-w-md ${toast.type === 'success' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'}`}>
          {toast.message}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black tracking-tight">Enterprise Portal</h2>
          <p className="text-sm text-slate-400 mt-1">Manage organizations, companies, sub-admins, and clients</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setRefreshKey(k => k + 1)} className="px-4 py-2 bg-white/5 border border-white/10 text-slate-400 rounded-xl text-xs font-black hover:bg-white/10 transition-all">
            🔄 Refresh
          </button>
          <button onClick={() => setShowCreateOrg(true)} className="px-5 py-2.5 bg-orange-600 text-white rounded-xl text-xs font-black uppercase tracking-wider hover:bg-orange-700 transition-all">
            Create Organization
          </button>
        </div>
      </div>

      <div className="flex gap-1 bg-white/5 border border-white/10 rounded-2xl p-1 overflow-x-auto">
        {PORTAL_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-[#FF6B35] text-white shadow-lg shadow-[#FF6B35]/20'
                : 'text-slate-400 hover:text-white hover:bg-white/10'
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-8">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="p-5 bg-white/5 border border-white/10 rounded-2xl text-center">
              <p className="text-3xl font-black text-white">{stats.total}</p>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">Total Orgs</p>
            </div>
            <div className="p-5 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-center">
              <p className="text-3xl font-black text-emerald-400">{stats.active}</p>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">Active</p>
            </div>
            <div className="p-5 bg-orange-500/10 border border-orange-500/20 rounded-2xl text-center">
              <p className="text-3xl font-black text-orange-400">{stats.trial}</p>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">Trial</p>
            </div>
            <div className="p-5 bg-red-500/10 border border-red-500/20 rounded-2xl text-center">
              <p className="text-3xl font-black text-red-400">{stats.suspended}</p>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">Suspended</p>
            </div>
            <div className="p-5 bg-blue-500/10 border border-blue-500/20 rounded-2xl text-center">
              <p className="text-3xl font-black text-blue-400">{stats.totalUsers}</p>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">Total Users</p>
            </div>
          </div>

          <div className="flex gap-2">
            {['all', 'trial', 'active', 'suspended', 'expired'].map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${filter === f ? 'bg-orange-500 text-white' : 'bg-white/5 text-slate-400 hover:bg-white/10'}`}>
                {f}
              </button>
            ))}
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
            <div className="grid grid-cols-9 gap-4 p-4 border-b border-white/5 text-[10px] font-black uppercase tracking-widest text-slate-500">
              <div>Name</div>
              <div>Email</div>
              <div>Status</div>
              <div>Plan</div>
              <div>Users</div>
              <div>Workflows</div>
              <div>Transactions</div>
              <div>Created</div>
              <div>Actions</div>
            </div>
            {filtered.length === 0 ? (
              <div className="p-12 text-center text-slate-500">
                <div className="text-4xl mb-4">🏢</div>
                <div className="text-lg font-black text-white mb-2">No organizations yet</div>
                <div className="text-sm text-slate-400 mb-4">Click "Create Organization" to get started</div>
                <button onClick={() => setShowCreateOrg(true)} className="px-6 py-3 bg-orange-600 text-white rounded-xl text-sm font-black hover:bg-orange-700 transition-all">
                  Create First Organization
                </button>
              </div>
            ) : (
              filtered.map((org: any) => (
                <div key={org._id}>
                  <div className="grid grid-cols-9 gap-4 p-4 border-b border-white/5 items-center hover:bg-white/5 transition-colors">
                    <div className="font-black text-sm">{org.name}</div>
                    <div className="text-sm text-slate-400">{org.email}</div>
                    <div>
                      <span className={`px-2 py-1 rounded text-[10px] font-black uppercase ${org.status === 'active' ? 'bg-emerald-500/10 text-emerald-400' : org.status === 'trial' ? 'bg-orange-500/10 text-orange-400' : org.status === 'suspended' ? 'bg-red-500/10 text-red-400' : 'bg-amber-500/10 text-amber-400'}`}>
                        {org.status}
                      </span>
                    </div>
                    <div className="text-sm font-bold capitalize">{org.plan}</div>
                    <div className="text-sm font-bold">{org.userCount || 0}</div>
                    <div className="text-sm font-bold">{org.workflowCount || 0}</div>
                    <div className="text-sm font-bold">{org.transactionCount || 0}</div>
                    <div className="text-xs text-slate-500">{new Date(org.createdAt).toLocaleDateString()}</div>
                    <div className="flex gap-1.5 flex-wrap">
                      {org.status === 'trial' && (
                        <button onClick={() => handleUpgrade(org._id)} className="px-2.5 py-1 bg-emerald-600 text-white rounded-lg text-[10px] font-black hover:bg-emerald-700 transition-all">
                          Upgrade
                        </button>
                      )}
                      {org.status !== 'suspended' ? (
                        <button onClick={() => handleSuspend(org._id)} className="px-2.5 py-1 bg-red-600/20 text-red-400 rounded-lg text-[10px] font-black hover:bg-red-600/30 transition-all">
                          Suspend
                        </button>
                      ) : (
                        <button onClick={() => handleReinstate(org._id)} className="px-2.5 py-1 bg-emerald-600/20 text-emerald-400 rounded-lg text-[10px] font-black hover:bg-emerald-600/30 transition-all">
                          Reinstate
                        </button>
                      )}
                      <button onClick={() => handleViewPasswords(org._id)} className="px-2.5 py-1 bg-amber-600/20 text-amber-400 rounded-lg text-[10px] font-black hover:bg-amber-600/30 transition-all">
                        🔑 Passwords
                      </button>
                      <button onClick={() => handleEditOrg(org)} className="px-2.5 py-1 bg-cyan-600/20 text-cyan-400 rounded-lg text-[10px] font-black hover:bg-cyan-600/30 transition-all">
                        ✏️ Edit
                      </button>
                      <button onClick={() => setExpandedOrg(expandedOrg === org._id ? null : org._id)} className="px-2.5 py-1 bg-blue-600/20 text-blue-400 rounded-lg text-[10px] font-black hover:bg-blue-600/30 transition-all">
                        View Users
                      </button>
                      <button onClick={() => setShowCreateAdmin(org._id)} className="px-2.5 py-1 bg-purple-600/20 text-purple-400 rounded-lg text-[10px] font-black hover:bg-purple-600/30 transition-all">
                        Create Admin
                      </button>
                      <button onClick={() => handleDelete(org._id)} className="px-2.5 py-1 bg-red-800/40 text-red-400 rounded-lg text-[10px] font-black hover:bg-red-800/60 transition-all">
                        Delete
                      </button>
                    </div>
                  </div>
                  {expandedOrg === org._id && (
                    <div className="bg-white/3 border-b border-white/5">
                      <div className="grid grid-cols-6 gap-4 p-4 ml-8 text-[10px] font-black uppercase tracking-widest text-slate-600">
                        <div>Name</div>
                        <div>Email</div>
                        <div>Role</div>
                        <div>Status</div>
                        <div>Must Change Pw</div>
                        <div>Actions</div>
                      </div>
                      {!orgUsers ? (
                        <div className="p-4 ml-8 text-slate-500 text-sm">Loading users...</div>
                      ) : (Array.isArray(orgUsers) ? orgUsers : []).length === 0 ? (
                        <div className="p-4 ml-8 text-slate-500 text-sm">No users found</div>
                      ) : (
                        (Array.isArray(orgUsers) ? orgUsers : []).map((user: any) => (
                          <div key={user._id} className="grid grid-cols-6 gap-4 p-4 ml-8 border-t border-white/5 items-center hover:bg-white/3 transition-colors">
                            <div className="text-sm">{user.name}</div>
                            <div className="text-sm text-slate-400">{user.email}</div>
                            <div className="text-sm font-bold capitalize">{user.role}</div>
                            <div>
                              <span className={`px-2 py-1 rounded text-[10px] font-black uppercase ${user.status === 'active' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                                {user.status}
                              </span>
                            </div>
                            <div className="text-sm">{user.mustChangePassword ? 'Yes' : 'No'}</div>
                            <div className="flex gap-1.5">
                              <button onClick={() => handleResetPassword(user._id)} className="px-2.5 py-1 bg-amber-600/20 text-amber-400 rounded-lg text-[10px] font-black hover:bg-amber-600/30 transition-all">
                                Reset Pw
                              </button>
                              <button onClick={() => handleToggleUserStatus(user._id, user.status)} className={`px-2.5 py-1 rounded-lg text-[10px] font-black transition-all ${user.status === 'active' ? 'bg-red-600/20 text-red-400 hover:bg-red-600/30' : 'bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30'}`}>
                                {user.status === 'active' ? 'Suspend' : 'Activate'}
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {activeTab !== 'overview' && renderTab()}

      {showCreateOrg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-900 border border-white/10 rounded-2xl p-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-black mb-6">Create Organization</h3>
            <form onSubmit={handleCreateOrg} className="space-y-4">
              <div className="border-t border-white/10 pt-4">
                <h4 className="text-xs font-black text-orange-400 uppercase tracking-wider mb-3">Basic Information</h4>
                <input type="text" placeholder="Organization Name" required value={orgForm.name} onChange={e => setOrgForm({ ...orgForm, name: e.target.value })} className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 mb-3" />
                <input type="email" placeholder="Organization Email" required value={orgForm.email} onChange={e => setOrgForm({ ...orgForm, email: e.target.value })} className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 mb-3" />
                <input type="text" placeholder="Subdomain (e.g. acme.dutchkem.com)" value={orgForm.subdomain} onChange={e => setOrgForm({ ...orgForm, subdomain: e.target.value })} className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 mb-3" />
                <div className="grid grid-cols-2 gap-4">
                  <input type="text" placeholder="Industry" value={orgForm.industry} onChange={e => setOrgForm({ ...orgForm, industry: e.target.value })} className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-500" />
                  <input type="text" placeholder="Number of Employees" value={orgForm.size} onChange={e => setOrgForm({ ...orgForm, size: e.target.value })} className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-500" />
                </div>
              </div>

              <div className="border-t border-white/10 pt-4">
                <h4 className="text-xs font-black text-orange-400 uppercase tracking-wider mb-3">Admin Account Credentials</h4>
                <input type="email" placeholder="Admin Email Address *" required value={orgForm.adminEmail} onChange={e => setOrgForm({ ...orgForm, adminEmail: e.target.value })} className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 mb-3" />
                <div className="relative">
                  <input type="text" placeholder="Temporary Password *" required value={orgForm.adminPassword} onChange={e => setOrgForm({ ...orgForm, adminPassword: e.target.value })} className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-500" />
                  <button type="button" onClick={() => {
                    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%&*'
                    let pw = 'Ent'
                    for (let i = 0; i < 10; i++) pw += chars[Math.floor(Math.random() * chars.length)]
                    pw += '!'
                    setOrgForm({ ...orgForm, adminPassword: pw, confirmPassword: pw })
                  }} className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 bg-orange-600/20 text-orange-400 rounded-lg text-[10px] font-black hover:bg-orange-600/30 transition-all">
                    Generate
                  </button>
                </div>
                <input type="password" placeholder="Confirm Password *" required value={orgForm.confirmPassword} onChange={e => setOrgForm({ ...orgForm, confirmPassword: e.target.value })} className={`w-full px-4 py-3 bg-white/5 border rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none mt-3 ${orgForm.confirmPassword && orgForm.adminPassword !== orgForm.confirmPassword ? 'border-red-500 focus:border-red-500' : 'border-white/10 focus:border-orange-500'}`} />
                {orgForm.confirmPassword && orgForm.adminPassword !== orgForm.confirmPassword && (
                  <p className="text-red-400 text-xs mt-1">Passwords do not match</p>
                )}
              </div>

              <div className="border-t border-white/10 pt-4">
                <h4 className="text-xs font-black text-orange-400 uppercase tracking-wider mb-3">Contact Information</h4>
                <div className="grid grid-cols-2 gap-4 mb-3">
                  <input type="text" placeholder="Phone Number" value={orgForm.phone} onChange={e => setOrgForm({ ...orgForm, phone: e.target.value })} className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-500" />
                  <input type="text" placeholder="Website" value={orgForm.website} onChange={e => setOrgForm({ ...orgForm, website: e.target.value })} className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-500" />
                </div>
                <input type="text" placeholder="Address" value={orgForm.address} onChange={e => setOrgForm({ ...orgForm, address: e.target.value })} className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 mb-3" />
                <div className="grid grid-cols-2 gap-4">
                  <input type="text" placeholder="City" value={orgForm.city} onChange={e => setOrgForm({ ...orgForm, city: e.target.value })} className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-500" />
                  <input type="text" placeholder="Country" value={orgForm.country} onChange={e => setOrgForm({ ...orgForm, country: e.target.value })} className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-500" />
                </div>
              </div>

              <div className="border-t border-white/10 pt-4">
                <h4 className="text-xs font-black text-orange-400 uppercase tracking-wider mb-3">Subscription & Billing</h4>
                <select value={orgForm.plan} onChange={e => setOrgForm({ ...orgForm, plan: e.target.value })} className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-orange-500 mb-3">
                  <option value="trial">Trial (14 days free)</option>
                  <option value="growth">Growth ($499/month)</option>
                  <option value="enterprise">Enterprise ($1,999/month)</option>
                  <option value="scale">Scale ($4,999/month)</option>
                </select>
                <div className="grid grid-cols-2 gap-4">
                  <input type="email" placeholder="Billing Email" value={orgForm.billingEmail} onChange={e => setOrgForm({ ...orgForm, billingEmail: e.target.value })} className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-500" />
                  <input type="text" placeholder="Tax ID / VAT Number" value={orgForm.taxId} onChange={e => setOrgForm({ ...orgForm, taxId: e.target.value })} className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-500" />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowCreateOrg(false)} className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm font-black hover:bg-white/10 transition-all">
                  Cancel
                </button>
                <button type="submit" disabled={creating} className="flex-1 px-4 py-3 bg-orange-600 text-white rounded-xl text-sm font-black hover:bg-orange-700 transition-all disabled:opacity-50">
                  {creating ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showCreateAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-900 border border-white/10 rounded-2xl p-8 w-full max-w-md">
            <h3 className="text-lg font-black mb-6">Create Admin User</h3>
            <form onSubmit={handleCreateAdmin} className="space-y-4">
              <input type="text" placeholder="Name" required value={adminForm.name} onChange={e => setAdminForm({ ...adminForm, name: e.target.value })} className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-500" />
              <input type="email" placeholder="Email" required value={adminForm.email} onChange={e => setAdminForm({ ...adminForm, email: e.target.value })} className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-500" />
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setShowCreateAdmin(null); setAdminForm({ name: '', email: '' }) }} className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm font-black hover:bg-white/10 transition-all">
                  Cancel
                </button>
                <button type="submit" className="flex-1 px-4 py-3 bg-purple-600 text-white rounded-xl text-sm font-black hover:bg-purple-700 transition-all">
                  Create Admin
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Passwords Modal */}
      {showPasswords && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-900 border border-white/10 rounded-2xl p-8 w-full max-w-lg max-h-[80vh] overflow-y-auto">
            <h3 className="text-lg font-black mb-6">🔑 Organization Passwords</h3>
            {getOrganizationPasswords ? (
              <div className="space-y-4">
                <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                  <p className="text-xs text-slate-500 mb-1">Organization Password</p>
                  <p className="text-sm font-mono text-white bg-black/30 p-2 rounded">{getOrganizationPasswords.orgPassword}</p>
                </div>
                <div className="text-xs text-slate-500 font-black uppercase tracking-wider">User Passwords</div>
                {getOrganizationPasswords.users.map((user: any) => (
                  <div key={user._id} className="bg-white/5 border border-white/10 rounded-xl p-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-bold text-white">{user.name}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-black ${user.status === 'active' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                        {user.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mb-1">{user.email}</p>
                    <p className="text-xs text-slate-500 mb-1">Role: {user.role}</p>
                    <p className="text-sm font-mono text-white bg-black/30 p-2 rounded">{user.password}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-slate-500 py-8">Loading passwords...</div>
            )}
            <div className="flex gap-3 pt-6">
              <button onClick={() => setShowPasswords(null)} className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm font-black hover:bg-white/10 transition-all">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Organization Modal */}
      {showEditOrg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-900 border border-white/10 rounded-2xl p-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-black mb-6">Edit Company Information</h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Organization Name</label>
                <input type="text" value={editOrgForm.name} onChange={e => setEditOrgForm({ ...editOrgForm, name: e.target.value })} className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-500" />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Email</label>
                <input type="email" value={editOrgForm.email} onChange={e => setEditOrgForm({ ...editOrgForm, email: e.target.value })} className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-500" />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Subdomain</label>
                <input type="text" value={editOrgForm.subdomain} onChange={e => setEditOrgForm({ ...editOrgForm, subdomain: e.target.value })} className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-500" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Industry</label>
                  <input type="text" value={editOrgForm.industry} onChange={e => setEditOrgForm({ ...editOrgForm, industry: e.target.value })} className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-500" />
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Size</label>
                  <input type="text" value={editOrgForm.size} onChange={e => setEditOrgForm({ ...editOrgForm, size: e.target.value })} className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-500" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Phone</label>
                  <input type="text" value={editOrgForm.phone} onChange={e => setEditOrgForm({ ...editOrgForm, phone: e.target.value })} className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-500" />
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Website</label>
                  <input type="text" value={editOrgForm.website} onChange={e => setEditOrgForm({ ...editOrgForm, website: e.target.value })} className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-500" />
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Address</label>
                <input type="text" value={editOrgForm.address} onChange={e => setEditOrgForm({ ...editOrgForm, address: e.target.value })} className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-500" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">City</label>
                  <input type="text" value={editOrgForm.city} onChange={e => setEditOrgForm({ ...editOrgForm, city: e.target.value })} className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-500" />
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Country</label>
                  <input type="text" value={editOrgForm.country} onChange={e => setEditOrgForm({ ...editOrgForm, country: e.target.value })} className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-500" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Billing Email</label>
                  <input type="email" value={editOrgForm.billingEmail} onChange={e => setEditOrgForm({ ...editOrgForm, billingEmail: e.target.value })} className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-500" />
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Tax ID / VAT</label>
                  <input type="text" value={editOrgForm.taxId} onChange={e => setEditOrgForm({ ...editOrgForm, taxId: e.target.value })} className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-500" />
                </div>
              </div>
            </div>
            <div className="flex gap-3 pt-6">
              <button onClick={() => setShowEditOrg(null)} className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm font-black hover:bg-white/10 transition-all">
                Cancel
              </button>
              <button onClick={handleSaveEditOrg} className="flex-1 px-4 py-3 bg-orange-600 text-white rounded-xl text-sm font-black hover:bg-orange-700 transition-all">
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
