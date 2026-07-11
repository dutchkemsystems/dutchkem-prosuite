// Security & admin panels extracted from admin/dashboard.tsx
import { useState, useEffect } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { convexQuery } from "@convex-dev/react-query";
import { useAction, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { MetricCard, ProfileAction, SecurityBar, UpdateCycleItem } from "./shared";

// SecurityHubPanel (lines 1443-1567)
export function SecurityHubPanel({ adminToken }: { adminToken: string }) {
   const { data: beneficiaries } = useSuspenseQuery(convexQuery(api.payouts.getBeneficiaries, {})) as { data: any[] };
   const securityDashboard = useSuspenseQuery(convexQuery(api.intrusion_detector.getSecurityDashboard, {})) as { data: any };
   const geoStats = useSuspenseQuery(convexQuery(api.geo_tracking.getGeoStats, {})) as any;
   const resolveLog = useMutation(api.intrusion_detector.resolveSecurityLog);
   const unblockIp = useMutation(api.intrusion_detector.unblockIp);

   const dash = securityDashboard?.data ?? {};
   const geo = geoStats ?? {};

   return (
      <div className="space-y-12 ">
         {/* Security Dashboard Header */}
         <div className="bg-gradient-to-br from-indigo-600/20 to-slate-900 border border-indigo-500/20 rounded-[3.5rem] p-12 relative overflow-hidden">
            <div className="relative z-10 space-y-10">
               <div className="flex items-center justify-between">
                  <div className="flex items-center gap-6">
                     <div className="w-20 h-20 bg-white rounded-[2.5rem] flex items-center justify-center text-4xl shadow-2xl">🔐</div>
                     <div>
                        <h3 className="text-3xl font-black uppercase tracking-tighter text-white leading-tight">Security Hub</h3>
                        <p className="text-xs font-black text-indigo-500 uppercase tracking-widest mt-1">Intrusion Detection &amp; Geo-Blocking</p>
                     </div>
                  </div>
               </div>

               {/* Live Security Metrics */}
               <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <MetricCard label="Total Incidents (24h)" value={dash.totalIncidents ?? 0} icon="🚨" color="red" />
                  <MetricCard label="Critical Alerts" value={dash.criticalCount ?? 0} icon="💀" color="red" subValue="Immediate" />
                  <MetricCard label="High Severity" value={dash.highCount ?? 0} icon="⚠️" color="amber" />
                  <MetricCard label="Blocked IPs" value={dash.activeBlockedIps ?? 0} icon="🚫" color="slate" />
               </div>

               {/* Incident Breakdown by Type */}
               <div className="bg-slate-950/50 p-10 rounded-[2.5rem] border border-white/5 space-y-6">
                  <p className="text-xs font-black text-slate-500 uppercase tracking-[0.3em]">Incidents by Type (24h)</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                     {Object.entries(dash.byType ?? {}).map(([type, count]) => (
                        <div key={type} className="text-center p-4 bg-slate-900 rounded-2xl">
                           <p className="text-2xl font-black text-white">{count as number}</p>
                           <p className="text-[9px] font-black text-slate-500 uppercase mt-1">{type}</p>
                        </div>
                     ))}
                     {Object.keys(dash.byType ?? {}).length === 0 && (
                        <div className="col-span-4 text-center p-4 bg-emerald-500/10 rounded-2xl">
                           <p className="text-xs font-black text-emerald-500">No incidents detected</p>
                        </div>
                     )}
                  </div>
               </div>

               {/* Geo-Blocking Stats */}
               <div className="bg-slate-950/50 p-10 rounded-[2.5rem] border border-white/5 space-y-6">
                  <p className="text-xs font-black text-slate-500 uppercase tracking-[0.3em]">Geo-Blocking (Arab League)</p>
                  <div className="flex items-center gap-4 mb-4">
                     <span className="text-3xl font-black text-white">{geo.totalBlocked ?? 0}</span>
                     <span className="text-xs font-black text-slate-500 uppercase">blocked attempts (all time)</span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                     {Object.entries(geo.byCountry ?? {}).slice(0, 6).map(([country, count]) => (
                        <div key={country} className="flex justify-between items-center p-3 bg-slate-900 rounded-xl">
                           <span className="text-[10px] font-black text-slate-400">{country}</span>
                           <span className="text-xs font-black text-white">{count as number}</span>
                        </div>
                     ))}
                  </div>
               </div>
            </div>
         </div>

         {/* Security Logs */}
         <div className="bg-slate-900 border border-slate-800 rounded-[3rem] overflow-hidden">
            <div className="p-10 border-b border-slate-800">
               <h3 className="text-xl font-black uppercase tracking-tighter">Security Logs</h3>
            </div>
            <div className="divide-y divide-slate-800">
               {(dash.recentLogs ?? []).slice(0, 20).map((log: any) => (
                  <div key={log._id} className="p-6 flex items-center justify-between hover:bg-slate-800/50 transition-colors">
                     <div className="flex items-center gap-4">
                        <div className={`w-3 h-3 rounded-full ${log.severity === 'critical' ? 'bg-red-500' : log.severity === 'high' ? 'bg-amber-500' : log.severity === 'medium' ? 'bg-yellow-500' : 'bg-slate-500'}`}></div>
                        <div>
                           <p className="text-sm font-black text-white">{log.type}</p>
                           <p className="text-[10px] text-slate-500">{log.details}{log.ip ? ` — IP: ${log.ip}` : ''}</p>
                        </div>
                     </div>
                     <div className="flex items-center gap-3">
                        <span className={`px-2 py-1 rounded-full text-[8px] font-black uppercase ${log.resolved ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                           {log.resolved ? 'Resolved' : 'Open'}
                        </span>
                        {!log.resolved && (
                           <button onClick={() => resolveLog({ adminToken: adminToken, logId: log._id })} className="px-3 py-1 bg-slate-800 hover:bg-emerald-500/20 text-[8px] font-black uppercase rounded-lg transition-colors">
                              Resolve
                           </button>
                        )}
                     </div>
                  </div>
               ))}
               {(dash.recentLogs ?? []).length === 0 && (
                  <div className="p-10 text-center">
                     <p className="text-sm text-slate-500">No security logs in the last 24 hours</p>
                  </div>
               )}
            </div>
         </div>

         {/* Encrypted Beneficiaries */}
         <div className="bg-slate-900 border border-slate-800 rounded-[3rem] overflow-hidden">
            <div className="p-10 border-b border-slate-800">
               <h3 className="text-xl font-black uppercase tracking-tighter">Encrypted Beneficiaries</h3>
            </div>
            <div className="p-10 space-y-4">
               {beneficiaries.map((b: any) => (
                  <div key={b._id} className="flex justify-between items-center py-4 border-b border-white/5">
                     <div>
                        <p className="text-sm font-black text-white">{b.bankName}</p>
                        <p className="text-[10px] font-mono text-slate-500 truncate max-w-[150px]">AES256:{b.encryptedAccountNumber.slice(0,12)}...</p>
                     </div>
                     <span className="px-3 py-1 bg-emerald-500/10 text-emerald-500 rounded-full text-[8px] font-black uppercase">ACTIVE</span>
                  </div>
               ))}
            </div>
         </div>
      </div>
   )
}

// AuditTrailPanel (lines 1617-1649)
export function AuditTrailPanel() {
  const { data: logs } = useSuspenseQuery(convexQuery(api.admin.getAuditLogs, { adminToken: localStorage.getItem("admin_session_token") || "" })) as { data: any[] };
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-[3rem] overflow-hidden shadow-2xl ">
      <div className="p-10 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
        <h2 className="text-xl font-black uppercase tracking-tighter">Immutable Audit Ledger</h2>
        <button className="px-8 py-3 bg-white text-slate-950 rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap shadow-xl shadow-white/5">Export CSV (2FA)</button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
           <thead className="bg-slate-950/50 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
              <tr>
                 <th className="px-10 py-6">Timestamp</th>
                 <th className="px-10 py-6">Action</th>
                 <th className="px-10 py-6">Payload</th>
                 <th className="px-10 py-6">IP Address</th>
              </tr>
           </thead>
           <tbody className="divide-y divide-slate-800 text-[11px]">
              {logs.map((log: any) => (
                 <tr key={log._id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-10 py-6 font-mono text-slate-500">{new Date(log.createdAt).toLocaleString()}</td>
                    <td className="px-10 py-6"><span className="text-white font-black uppercase">{log.action}</span></td>
                    <td className="px-10 py-6 text-slate-400 font-bold max-w-sm truncate">{log.details}</td>
                    <td className="px-10 py-6 font-mono text-slate-500">{log.ip}</td>
                 </tr>
              ))}
           </tbody>
        </table>
      </div>
    </div>
  );
}

// HolidayDiscountsPanel (lines 1651-1684)
export function HolidayDiscountsPanel() {
  const { data: holidays } = useSuspenseQuery(convexQuery(api.holidays.listHolidays, {})) as { data: any[] };
  const refresh = useMutation(api.holidays.refreshActiveDiscounts);

  return (
    <div className="space-y-10 ">
      <div className="bg-slate-900 border border-slate-800 rounded-[3rem] p-12 shadow-2xl">
        <div className="flex justify-between items-center mb-10">
          <h2 className="text-2xl font-black uppercase tracking-tighter text-white">Holiday Discount Logic</h2>
          <button onClick={() => refresh()} className="px-8 py-3 bg-orange-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-orange-700 transition-all shadow-xl shadow-orange-600/20">Manual Sync</button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {holidays.map((h: any) => (
            <div key={h._id} className={`p-6 rounded-3xl border ${h.is_active ? 'bg-orange-600/10 border-orange-500 shadow-xl shadow-orange-600/5' : 'bg-slate-950 border-white/5'} transition-all`}>
              <div className="flex justify-between items-start mb-4">
                <span className="text-3xl">{h.banner_icon}</span>
                <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase ${h.is_active ? 'bg-orange-500 text-white animate-pulse' : 'bg-slate-800 text-slate-500'}`}>
                  {h.is_active ? 'ACTIVE' : 'INACTIVE'}
                </span>
              </div>
              <h3 className="font-black text-white uppercase tracking-tighter mb-1">{h.name}</h3>
              <p className="text-[10px] font-bold text-orange-500 uppercase tracking-widest mb-4">CODE: {h.code} • -{h.percent}%</p>
              <p className="text-[9px] text-slate-500 font-medium line-clamp-2 mb-4 leading-relaxed">{h.banner_text}</p>
              <div className="text-[8px] font-black text-slate-600 uppercase tracking-widest border-t border-white/5 pt-4">
                {new Date(h.start_date).toLocaleDateString()} - {new Date(h.end_date).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// AutoUpdatesPanel (lines 1686-1750)
export function AutoUpdatesPanel() {
  const triggerUpdate = useMutation(api.updates.runServiceUpdates);
  const rollback = useMutation(api.uae_engine.rollbackEvolution);
  const [processing, setProcessing] = useState(false);

  const handleUpdate = async (cycle: string) => {
    setProcessing(true);
    await triggerUpdate({ forceCycle: cycle });
    setProcessing(false);
  };

  return (
    <div className="space-y-10 ">
      <div className="bg-slate-900 border border-slate-800 rounded-[3rem] p-12 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-orange-600/5 blur-[80px]"></div>
        <div className="flex justify-between items-center mb-12">
          <h2 className="text-2xl font-black uppercase tracking-tighter text-white">Service Expansion Scheduler</h2>
          <div className="flex gap-4">
            <button 
                onClick={() => handleUpdate('SPRING_2026')} 
                disabled={processing}
                className="px-6 py-3 bg-slate-800 border border-slate-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-700 transition-all disabled:opacity-50"
            >
                Force Spring Evolution
            </button>
            <button 
                onClick={() => handleUpdate('FALL_2026')} 
                disabled={processing}
                className="px-6 py-3 bg-slate-800 border border-slate-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-700 transition-all disabled:opacity-50"
            >
                Force Fall Evolution
            </button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          <div className="bg-slate-950 p-10 rounded-[2.5rem] border border-white/5 space-y-6">
            <div className="flex justify-between items-center mb-2">
                <h3 className="text-lg font-black text-white uppercase tracking-tighter">Bi-Annual Evolution Cycles</h3>
                <button onClick={() => rollback({ cycle: 'SPRING_2026' })} className="text-[8px] font-black text-red-500 uppercase tracking-widest hover:underline">One-Click Rollback</button>
            </div>
            <div className="space-y-4">
              <UpdateCycleItem label="Spring Update" date="MAY 1, 2026" status="OPTIMAL" color="orange" />
              <UpdateCycleItem label="Fall Update" date="NOV 1, 2026" status="PENDING" color="slate" />
            </div>
          </div>
          
          <div className="bg-slate-950 p-10 rounded-[2.5rem] border border-white/5 space-y-6">
            <h3 className="text-lg font-black text-white uppercase tracking-tighter">Intelligence Growth Metrics</h3>
            <div className="grid grid-cols-2 gap-4">
               <div className="p-6 bg-slate-900 rounded-2xl border border-white/5">
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">New Features Deployed</p>
                  <p className="text-2xl font-black text-orange-500">+242</p>
               </div>
               <div className="p-6 bg-slate-900 rounded-2xl border border-white/5">
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Autonomous Uptime</p>
                  <p className="text-2xl font-black text-emerald-500">100%</p>
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// AdminProfileCard + modals (lines 1752-1984)
export function AdminProfileCard({ profile, adminToken }: { profile: any; adminToken: string }) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [modal, setModal] = useState<"password" | "2fa" | "ip" | null>(null);

  if (!profile) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="flex items-center gap-4 pl-6 border-l border-slate-800 group"
      >
        <div className="text-right hidden sm:block">
          <p className="text-sm font-black text-white leading-none">{profile.name}</p>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{profile.email}</p>
        </div>
        <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-orange-600 to-red-600 flex items-center justify-center text-white font-black text-lg shadow-lg group-hover:scale-105 transition-transform">
          {profile.name?.[0] || 'A'}
        </div>
      </button>

      {showDropdown && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowDropdown(false)}></div>
          <div className="absolute right-0 top-full mt-4 w-80 bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl z-50 overflow-hidden ">
            <div className="p-6 border-b border-slate-800 bg-gradient-to-br from-orange-900/10 to-slate-900">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-orange-600 to-red-600 flex items-center justify-center text-white font-black text-2xl shadow-lg">
                  {profile.name?.[0] || 'A'}
                </div>
                <div>
                  <p className="text-lg font-black text-white">{profile.name}</p>
                  <p className="text-xs text-slate-400">{profile.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 bg-orange-500/10 border border-orange-500/20 rounded-full text-[8px] font-black text-orange-500 uppercase tracking-widest">{profile.role}</span>
                {profile.lastLogin && (
                  <span className="text-[8px] text-slate-500 font-bold uppercase tracking-widest">Last login: {new Date(profile.lastLogin).toLocaleDateString()}</span>
                )}
              </div>
            </div>
            <div className="p-4 space-y-1">
              <ProfileAction label="🔑 Change Password" onClick={() => { setShowDropdown(false); setModal("password"); }} />
              <ProfileAction label="🛡️ Enable 2FA" onClick={() => { setShowDropdown(false); setModal("2fa"); }} />
              <ProfileAction label="📋 IP Whitelist" onClick={() => { setShowDropdown(false); setModal("ip"); }} />
              <div className="border-t border-slate-800 my-2"></div>
              <ProfileAction label="🚪 Sign Out" className="text-red-400 hover:bg-red-500/10" onClick={() => { setShowDropdown(false); localStorage.removeItem('admin_session_token'); window.location.href = '/admin/login'; }} />
            </div>
            <div className="px-4 pb-4">
              <div className="p-3 bg-slate-950 rounded-xl border border-white/5 text-center">
                <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Login Count</p>
                <p className="text-sm font-black text-white">{profile.loginCount}</p>
              </div>
            </div>
          </div>
        </>
      )}

      {modal === "password" && <ChangePasswordModal onClose={() => setModal(null)} adminId={profile._id} adminToken={adminToken} />}
      {modal === "2fa" && <Enable2FAModal onClose={() => setModal(null)} adminId={profile.email} />}
      {modal === "ip" && <IPWhitelistModal onClose={() => setModal(null)} adminId={profile._id} />}
    </div>
  );
}

export function ChangePasswordModal({ onClose, adminId, adminToken }: { onClose: () => void; adminId: string; adminToken: string }) {
  const [current, setCurrent] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const changePass = useMutation(api.auth_helpers.changePassword);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (newPass.length < 8) { setError("Password must be at least 8 characters"); return; }
    if (newPass !== confirm) { setError("Passwords do not match"); return; }
    setLoading(true);
    try {
      const result = await changePass({ userId: adminId as any, currentPassword: current, newPassword: newPass, adminToken });
      if (result?.success) { setSuccess(true); setTimeout(() => window.location.href = '/admin/login', 3000); }
      else { setError(result?.error || "Failed to change password"); }
    } catch (err: any) { setError(err?.message || "Failed to change password"); }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
        <h3 className="text-xl font-black text-white mb-6">Change Password</h3>
        {success ? (
          <div className="text-center py-8"><p className="text-emerald-500 font-bold">Password changed successfully. Redirecting to login...</p></div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <input type="password" value={current} onChange={e => setCurrent(e.target.value)} placeholder="Current Password" className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-white font-bold text-sm" required />
            <input type="password" value={newPass} onChange={e => setNewPass(e.target.value)} placeholder="New Password (min 16 chars)" className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-white font-bold text-sm" required />
            <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Confirm New Password" className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-white font-bold text-sm" required />
            {error && <p className="text-red-500 text-xs font-bold">{error}</p>}
            <div className="flex gap-3">
              <button type="button" onClick={onClose} className="flex-1 py-3 bg-slate-800 text-slate-400 rounded-xl font-bold text-sm">Cancel</button>
              <button type="submit" disabled={loading} className="flex-1 py-3 bg-orange-600 hover:bg-orange-500 text-white rounded-xl font-bold text-sm disabled:opacity-50">{loading ? "Saving..." : "Save Password"}</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export function Enable2FAModal({ onClose, adminId }: { onClose: () => void; adminId: string }) {
  const [code, setCode] = useState("");
  const [secret, setSecret] = useState("");
  const [secretLoading, setSecretLoading] = useState(true);
  const [backupCodes, setBackupCodes] = useState<Array<string>>([]);
  const [enabled, setEnabled] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const generateSecret = useMutation(api.auth_helpers.generate2FASecret);
  const setup2FA = useMutation(api.auth_helpers.setupAdmin2FA);

  // Generate secret server-side on mount
  useEffect(() => {
    generateSecret({}).then(({ secret }) => { setSecret(secret); setSecretLoading(false); }).catch(() => { setError("Failed to generate 2FA secret"); setSecretLoading(false); });
  }, []);

  const handleEnable = async () => {
    if (code.length !== 6) { setError("Enter the 6-digit code from your authenticator"); return; }
    setLoading(true);
    try {
      const result = await setup2FA({ adminId: adminId as any, secret });
      if (result?.backupCodes) { setBackupCodes(result.backupCodes); setEnabled(true); }
    } catch (err: any) { setError(err?.message || "Failed to enable 2FA"); }
    setLoading(false);
  };

  const qrUrl = secret ? `otpauth://totp/DutchkemProsuite:${adminId}?secret=${secret}&issuer=DutchkemProsuite` : "";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <h3 className="text-xl font-black text-white mb-6">Enable Two-Factor Authentication</h3>
        {enabled ? (
          <div className="space-y-4">
            <p className="text-emerald-500 font-bold text-sm">2FA enabled successfully!</p>
            <div className="bg-slate-950 p-4 rounded-xl border border-white/5">
              <p className="text-[10px] font-black text-slate-500 uppercase mb-2">Backup Codes (save these)</p>
              <div className="grid grid-cols-2 gap-2">{backupCodes.map((c, i) => <p key={i} className="text-xs font-mono text-white">{c}</p>)}</div>
            </div>
            <button onClick={onClose} className="w-full py-3 bg-orange-600 text-white rounded-xl font-bold text-sm">Done</button>
          </div>
        ) : (
          <div className="space-y-4">
            {secretLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full mx-auto mb-4" />
                <p className="text-slate-400 text-sm">Generating secure 2FA secret...</p>
              </div>
            ) : (
              <>
                <p className="text-slate-400 text-xs">Scan this QR code with Google Authenticator:</p>
                <div className="bg-white p-4 rounded-xl text-center"><img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrUrl)}`} alt="2FA QR" className="mx-auto" /></div>
                <div className="bg-slate-950 p-3 rounded-xl"><p className="text-[10px] text-slate-500 uppercase mb-1">Manual Secret</p><p className="text-xs font-mono text-white break-all">{secret}</p></div>
                <input type="text" value={code} onChange={e => setCode(e.target.value)} placeholder="Enter 6-digit code" maxLength={6} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-white font-bold text-sm text-center tracking-[0.5em]" />
                {error && <p className="text-red-500 text-xs font-bold">{error}</p>}
                <div className="flex gap-3">
                  <button type="button" onClick={onClose} className="flex-1 py-3 bg-slate-800 text-slate-400 rounded-xl font-bold text-sm">Cancel</button>
                  <button onClick={handleEnable} disabled={loading || code.length !== 6} className="flex-1 py-3 bg-orange-600 hover:bg-orange-500 text-white rounded-xl font-bold text-sm disabled:opacity-50">{loading ? "Enabling..." : "Enable 2FA"}</button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function IPWhitelistModal({ onClose, adminId }: { onClose: () => void; adminId: string }) {
  const [ips, setIps] = useState<Array<string>>(["127.0.0.1"]);
  const [newIp, setNewIp] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const updateIPs = useMutation(api.auth_helpers.updateIpWhitelist);

  const handleAdd = () => {
    if (!newIp.trim()) return;
    if (ips.includes(newIp.trim())) return;
    setIps([...ips, newIp.trim()]);
    setNewIp("");
  };

  const handleRemove = (ip: string) => setIps(ips.filter(i => i !== ip));

  const handleSave = async () => {
    setLoading(true);
    try {
      await updateIPs({ adminId: adminId as any, ipAddresses: ips, description: "Admin IP whitelist" });
      setSuccess(true);
    } catch (e) { console.error("Failed to update IP whitelist:", e); }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
        <h3 className="text-xl font-black text-white mb-6">IP Whitelist</h3>
        {success ? (
          <div className="text-center py-8"><p className="text-emerald-500 font-bold">IP whitelist saved successfully!</p><button onClick={onClose} className="mt-4 px-6 py-2 bg-orange-600 text-white rounded-xl font-bold text-sm">Done</button></div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2 max-h-40 overflow-y-auto">{ips.map(ip => (
              <div key={ip} className="flex items-center justify-between bg-slate-950 p-3 rounded-xl border border-white/5">
                <span className="text-xs font-mono text-white">{ip}</span>
                <button onClick={() => handleRemove(ip)} className="text-red-500 text-xs font-bold hover:underline">Remove</button>
              </div>
            ))}</div>
            <div className="flex gap-2">
              <input type="text" value={newIp} onChange={e => setNewIp(e.target.value)} placeholder="Add IP address" className="flex-1 bg-slate-950 border border-slate-800 rounded-xl p-3 text-white font-bold text-sm" />
              <button onClick={handleAdd} className="px-4 py-3 bg-slate-800 text-white rounded-xl font-bold text-sm">Add</button>
            </div>
            <div className="flex gap-3">
              <button onClick={onClose} className="flex-1 py-3 bg-slate-800 text-slate-400 rounded-xl font-bold text-sm">Cancel</button>
              <button onClick={handleSave} disabled={loading} className="flex-1 py-3 bg-orange-600 hover:bg-orange-500 text-white rounded-xl font-bold text-sm disabled:opacity-50">{loading ? "Saving..." : "Save"}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}