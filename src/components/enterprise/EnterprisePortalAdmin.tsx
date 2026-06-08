import { useQuery, useMutation } from 'convex/react'
import { useState } from 'react'
import { api } from '../../../convex/_generated/api'

export function EnterprisePortalAdmin({ adminToken }: { adminToken: string }) {
  const orgs = useQuery(api.enterprise_auth.adminListOrganizations, { adminToken })
  const updateOrg = useMutation(api.enterprise_auth.adminUpdateOrg)
  const [filter, setFilter] = useState('all')

  if (!orgs || orgs.authError) {
    return <div className="p-12 text-center text-slate-500">Loading enterprise organizations...</div>
  }

  const data = orgs.data || []
  const filtered = filter === 'all' ? data : data.filter((o: any) => o.status === filter)

  const stats = {
    total: data.length,
    trial: data.filter((o: any) => o.status === 'trial').length,
    active: data.filter((o: any) => o.status === 'active').length,
    expired: data.filter((o: any) => o.status === 'expired').length,
    suspended: data.filter((o: any) => o.status === 'suspended').length,
  }

  const handleUpdate = async (orgId: string, status?: string, plan?: string) => {
    await updateOrg({
      adminToken,
      orgId: orgId as any,
      status: status as any,
      plan: plan as any,
    })
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h2 className="text-2xl font-black tracking-tight">Enterprise Portal Management</h2>
        <p className="text-sm text-slate-400 mt-1">Manage enterprise organizations, trials, and subscriptions</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="p-5 bg-white/5 border border-white/10 rounded-2xl text-center">
          <p className="text-3xl font-black text-white">{stats.total}</p>
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">Total Orgs</p>
        </div>
        <div className="p-5 bg-orange-500/10 border border-orange-500/20 rounded-2xl text-center">
          <p className="text-3xl font-black text-orange-400">{stats.trial}</p>
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">Trial</p>
        </div>
        <div className="p-5 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-center">
          <p className="text-3xl font-black text-emerald-400">{stats.active}</p>
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">Active</p>
        </div>
        <div className="p-5 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-center">
          <p className="text-3xl font-black text-amber-400">{stats.expired}</p>
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">Expired</p>
        </div>
        <div className="p-5 bg-red-500/10 border border-red-500/20 rounded-2xl text-center">
          <p className="text-3xl font-black text-red-400">{stats.suspended}</p>
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">Suspended</p>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        {['all', 'trial', 'active', 'expired', 'suspended'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
              filter === f ? 'bg-orange-500 text-white' : 'bg-white/5 text-slate-400 hover:bg-white/10'
            }`}>{f}</button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
        <div className="grid grid-cols-6 gap-4 p-4 border-b border-white/5 text-[10px] font-black uppercase tracking-widest text-slate-500">
          <div>Organization</div>
          <div>Email</div>
          <div>Status</div>
          <div>Plan</div>
          <div>Created</div>
          <div>Actions</div>
        </div>
        {filtered.length === 0 ? (
          <div className="p-12 text-center text-slate-500">No organizations found</div>
        ) : (
          filtered.map((org: any) => (
            <div key={org._id} className="grid grid-cols-6 gap-4 p-4 border-b border-white/5 items-center hover:bg-white/5 transition-colors">
              <div className="font-black text-sm">{org.name}</div>
              <div className="text-sm text-slate-400">{org.email}</div>
              <div>
                <span className={`px-2 py-1 rounded text-[10px] font-black uppercase ${
                  org.status === 'active' ? 'bg-emerald-500/10 text-emerald-400' :
                  org.status === 'trial' ? 'bg-orange-500/10 text-orange-400' :
                  org.status === 'expired' ? 'bg-amber-500/10 text-amber-400' :
                  'bg-red-500/10 text-red-400'
                }`}>{org.status}</span>
              </div>
              <div className="text-sm font-bold capitalize">{org.plan}</div>
              <div className="text-xs text-slate-500">{new Date(org.createdAt).toLocaleDateString()}</div>
              <div className="flex gap-2">
                {org.status === 'trial' && (
                  <button onClick={() => handleUpdate(org._id, 'active', 'growth')}
                    className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-[10px] font-black hover:bg-emerald-700 transition-all">
                    Upgrade
                  </button>
                )}
                {org.status !== 'suspended' && (
                  <button onClick={() => handleUpdate(org._id, 'suspended')}
                    className="px-3 py-1.5 bg-red-600/20 text-red-400 rounded-lg text-[10px] font-black hover:bg-red-600/30 transition-all">
                    Suspend
                  </button>
                )}
                {org.status === 'suspended' && (
                  <button onClick={() => handleUpdate(org._id, 'active')}
                    className="px-3 py-1.5 bg-emerald-600/20 text-emerald-400 rounded-lg text-[10px] font-black hover:bg-emerald-600/30 transition-all">
                    Reinstate
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
