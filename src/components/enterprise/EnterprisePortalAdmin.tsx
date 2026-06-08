import { useQuery, useMutation } from 'convex/react'
import { useState } from 'react'
import { api } from '../../../convex/_generated/api'

export function EnterprisePortalAdmin({ adminToken }: { adminToken: string }) {
  const [filter, setFilter] = useState('all')
  const [showCreateOrg, setShowCreateOrg] = useState(false)
  const [showCreateAdmin, setShowCreateAdmin] = useState<string | null>(null)
  const [expandedOrg, setExpandedOrg] = useState<string | null>(null)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [orgForm, setOrgForm] = useState({ name: '', email: '', industry: '', size: '', phone: '', website: '', plan: 'trial' })
  const [adminForm, setAdminForm] = useState({ name: '', email: '' })

  const orgs = useQuery(api.admin_enterprise.listOrganizations, { adminToken })
  const createOrganization = useMutation(api.admin_enterprise.createOrganization)
  const createOrgAdminUser = useMutation(api.admin_enterprise.createOrgAdminUser)
  const resetOrgUserPassword = useMutation(api.admin_enterprise.resetOrgUserPassword)
  const toggleOrgUserStatus = useMutation(api.admin_enterprise.toggleOrgUserStatus)
  const deleteOrganization = useMutation(api.admin_enterprise.deleteOrganization)
  const adminUpdateOrg = useMutation(api.enterprise_auth.adminUpdateOrg)

  const orgUsers = useQuery(
    api.admin_enterprise.listOrgUsers,
    expandedOrg ? { adminToken, orgId: expandedOrg as any } : 'skip'
  )

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  if (!orgs) {
    return <div className="p-12 text-center text-slate-500">Loading enterprise organizations...</div>
  }

  const data = orgs.data || []
  const filtered = filter === 'all' ? data : data.filter((o: any) => o.status === filter)

  const stats = {
    total: data.length,
    active: data.filter((o: any) => o.status === 'active').length,
    trial: data.filter((o: any) => o.status === 'trial').length,
    suspended: data.filter((o: any) => o.status === 'suspended').length,
    totalUsers: data.reduce((sum: number, o: any) => sum + (o.userCount || 0), 0),
  }

  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const result = await createOrganization({ adminToken, ...orgForm, plan: orgForm.plan as any })
      setShowCreateOrg(false)
      setOrgForm({ name: '', email: '', industry: '', size: '', phone: '', website: '', plan: 'trial' })
      showToast(`Organization created. Temp password: ${result.tempPassword}`, 'success')
    } catch (err: any) {
      showToast(err.message || 'Failed to create organization', 'error')
    }
  }

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!showCreateAdmin) return
    try {
      const result = await createOrgAdminUser({ adminToken, orgId: showCreateAdmin as any, ...adminForm })
      setShowCreateAdmin(null)
      setAdminForm({ name: '', email: '' })
      showToast(`Admin user created. Temp password: ${result.tempPassword}`, 'success')
    } catch (err: any) {
      showToast(err.message || 'Failed to create admin user', 'error')
    }
  }

  const handleUpgrade = async (orgId: string) => {
    try {
      await adminUpdateOrg({ adminToken, orgId: orgId as any, status: 'active', plan: 'growth' })
      showToast('Organization upgraded', 'success')
    } catch (err: any) {
      showToast(err.message || 'Failed to upgrade', 'error')
    }
  }

  const handleSuspend = async (orgId: string) => {
    try {
      await adminUpdateOrg({ adminToken, orgId: orgId as any, status: 'suspended' })
      showToast('Organization suspended', 'success')
    } catch (err: any) {
      showToast(err.message || 'Failed to suspend', 'error')
    }
  }

  const handleReinstate = async (orgId: string) => {
    try {
      await adminUpdateOrg({ adminToken, orgId: orgId as any, status: 'active' })
      showToast('Organization reinstated', 'success')
    } catch (err: any) {
      showToast(err.message || 'Failed to reinstate', 'error')
    }
  }

  const handleDelete = async (orgId: string) => {
    if (!confirm('Are you sure you want to delete this organization?')) return
    try {
      await deleteOrganization({ adminToken, orgId: orgId as any })
      showToast('Organization deleted', 'success')
    } catch (err: any) {
      showToast(err.message || 'Failed to delete', 'error')
    }
  }

  const handleResetPassword = async (userId: string) => {
    try {
      const result = await resetOrgUserPassword({ adminToken, userId: userId as any })
      showToast(`Password reset. New password: ${result.tempPassword}`, 'success')
    } catch (err: any) {
      showToast(err.message || 'Failed to reset password', 'error')
    }
  }

  const handleToggleUserStatus = async (userId: string, currentStatus: string) => {
    try {
      await toggleOrgUserStatus({ adminToken, userId: userId as any, status: currentStatus === 'active' ? 'suspended' : 'active' })
      showToast('User status updated', 'success')
    } catch (err: any) {
      showToast(err.message || 'Failed to update user status', 'error')
    }
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl text-sm font-black ${toast.type === 'success' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'}`}>
          {toast.message}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black tracking-tight">Enterprise Portal Management</h2>
          <p className="text-sm text-slate-400 mt-1">Manage enterprise organizations, trials, and subscriptions</p>
        </div>
        <button onClick={() => setShowCreateOrg(true)} className="px-5 py-2.5 bg-orange-600 text-white rounded-xl text-xs font-black uppercase tracking-wider hover:bg-orange-700 transition-all">
          Create Organization
        </button>
      </div>

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
          <div className="p-12 text-center text-slate-500">No organizations found</div>
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
                  ) : orgUsers.data?.length === 0 ? (
                    <div className="p-4 ml-8 text-slate-500 text-sm">No users found</div>
                  ) : (
                    orgUsers.data?.map((user: any) => (
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

      {showCreateOrg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-900 border border-white/10 rounded-2xl p-8 w-full max-w-lg">
            <h3 className="text-lg font-black mb-6">Create Organization</h3>
            <form onSubmit={handleCreateOrg} className="space-y-4">
              <input type="text" placeholder="Name" required value={orgForm.name} onChange={e => setOrgForm({ ...orgForm, name: e.target.value })} className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-500" />
              <input type="email" placeholder="Email" required value={orgForm.email} onChange={e => setOrgForm({ ...orgForm, email: e.target.value })} className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-500" />
              <div className="grid grid-cols-2 gap-4">
                <input type="text" placeholder="Industry" value={orgForm.industry} onChange={e => setOrgForm({ ...orgForm, industry: e.target.value })} className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-500" />
                <input type="text" placeholder="Size" value={orgForm.size} onChange={e => setOrgForm({ ...orgForm, size: e.target.value })} className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-500" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <input type="text" placeholder="Phone" value={orgForm.phone} onChange={e => setOrgForm({ ...orgForm, phone: e.target.value })} className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-500" />
                <input type="text" placeholder="Website" value={orgForm.website} onChange={e => setOrgForm({ ...orgForm, website: e.target.value })} className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-500" />
              </div>
              <select value={orgForm.plan} onChange={e => setOrgForm({ ...orgForm, plan: e.target.value })} className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-orange-500">
                <option value="trial">Trial</option>
                <option value="growth">Growth</option>
                <option value="enterprise">Enterprise</option>
                <option value="scale">Scale</option>
              </select>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowCreateOrg(false)} className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm font-black hover:bg-white/10 transition-all">
                  Cancel
                </button>
                <button type="submit" className="flex-1 px-4 py-3 bg-orange-600 text-white rounded-xl text-sm font-black hover:bg-orange-700 transition-all">
                  Create
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
    </div>
  )
}
