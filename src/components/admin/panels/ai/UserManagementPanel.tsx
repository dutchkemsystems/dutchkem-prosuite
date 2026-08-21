import { useState } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { convexQuery } from "@convex-dev/react-query";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { MetricCard, roleColors, subStatusColors } from "./shared";

export function UserManagementPanel({ adminToken }: { adminToken: string }) {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | "user" | "admin" | "freelancer">("all");
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [extendDays, setExtendDays] = useState(30);
  const [statusMsg, setStatusMsg] = useState<{ message: string; type: string } | null>(null);

  const users: any[] = useQuery(api.admin.listAllUsers, { adminToken }) ?? [];
  const { data: subsData } = useSuspenseQuery(convexQuery(api.admin.listSubscriptions, { adminToken })) as { data: any };
  const { data: subStats } = useSuspenseQuery(convexQuery(api.admin.getSubscriptionStats, {})) as { data: any };

  const updateSub = useMutation(api.admin.updateSubscription);
  const cancelSub = useMutation(api.admin.cancelSubscription);
  const extendSub = useMutation(api.admin.extendSubscription);

  const subscriptions = subsData?.data || [];

  const userSubMap: Record<string, any> = {};
  subscriptions.forEach((s: any) => { userSubMap[s.userId] = s; });

  const filtered = users.filter((u: any) => {
    const matchesSearch = !search || (u.name || "").toLowerCase().includes(search.toLowerCase()) || (u.email || "").toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === "all" || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const showStatus = (message: string, type: string) => {
    setStatusMsg({ message, type });
    setTimeout(() => setStatusMsg(null), 3000);
  };

  const handleUpdateStatus = async (subId: string, newStatus: string) => {
    await updateSub({ adminToken, subscriptionId: subId, status: newStatus as any });
    showStatus(`Subscription ${newStatus}`, "success");
    setSelectedUser(null);
  };

  const handleCancel = async (subId: string) => {
    await cancelSub({ adminToken, subscriptionId: subId });
    showStatus("Subscription canceled", "success");
    setSelectedUser(null);
  };

  const handleExtend = async (subId: string) => {
    await extendSub({ adminToken, subscriptionId: subId, days: extendDays });
    showStatus(`Extended by ${extendDays} days`, "success");
    setSelectedUser(null);
  };

  return (
    <div className="space-y-6">
      {statusMsg && (
        <div className={`p-4 rounded-2xl text-center text-sm font-black ${
          statusMsg.type === "success" ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" : "bg-red-500/10 text-red-500 border border-red-500/20"
        }`}>{statusMsg.message}</div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard label="Total Users" value={users.length} icon="👥" color="blue" />
        <MetricCard label="Active Subs" value={subStats?.active || 0} icon="💳" color="emerald" />
        <MetricCard label="Pending" value={subStats?.pending || 0} icon="⏳" color="amber" />
        <MetricCard label="MRR" value={`₦${((subStats?.mrr || 0) / 1000).toFixed(1)}K`} icon="💰" color="indigo" />
      </div>

      <div className="flex flex-col md:flex-row gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or email..."
          className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
        />
        <div className="flex gap-1 bg-slate-800 rounded-xl p-1">
          {(["all", "user", "admin", "freelancer"] as const).map((r) => (
            <button key={r} onClick={() => setRoleFilter(r)}
              className={`px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                roleFilter === r ? "bg-orange-500 text-white" : "text-slate-400 hover:text-white"
              }`}>{r}</button>
          ))}
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-800">
                <th className="text-left px-4 py-3 text-slate-500 font-bold">User</th>
                <th className="text-left px-4 py-3 text-slate-500 font-bold">Role</th>
                <th className="text-left px-4 py-3 text-slate-500 font-bold">Balance</th>
                <th className="text-left px-4 py-3 text-slate-500 font-bold">Subscription</th>
                <th className="text-left px-4 py-3 text-slate-500 font-bold">Joined</th>
                <th className="text-right px-4 py-3 text-slate-500 font-bold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-slate-500">No users found</td></tr>
              ) : (
                filtered.map((u: any) => {
                  const sub = userSubMap[u._id];
                  return (
                    <tr key={u._id} className="border-b border-slate-800/50 hover:bg-slate-800/30 cursor-pointer" onClick={() => setSelectedUser(u)}>
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-bold text-white">{u.name || "Unnamed"}</p>
                          <p className="text-[10px] text-slate-500">{u.email || "No email"}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${roleColors[u.role] || "bg-slate-500/10 text-slate-400"}`}>
                          {u.role || "user"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-300 font-bold">₦{(u.balance || 0).toLocaleString()}</td>
                      <td className="px-4 py-3">
                        {sub ? (
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${subStatusColors[sub.status] || ""}`}>
                            {sub.plan} ({sub.status})
                          </span>
                        ) : (
                          <span className="text-slate-600 text-[10px]">None</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-400">{new Date(u._creationTime).toLocaleDateString()}</td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={(e) => { e.stopPropagation(); setSelectedUser(u); }}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-[10px] font-bold text-slate-300">View</button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        {filtered.length > 0 && (
          <div className="px-4 py-3 border-t border-slate-800 text-[10px] text-slate-500">
            Showing {filtered.length} of {users.length} users
          </div>
        )}
      </div>

      {selectedUser && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setSelectedUser(null)} />
          <div className="relative w-full max-w-lg bg-slate-900 border-l border-slate-800 overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-slate-900 border-b border-slate-800 px-6 py-4 flex items-center justify-between z-10">
              <h3 className="font-black text-white">User Details</h3>
              <button onClick={() => setSelectedUser(null)} className="text-slate-400 hover:text-white text-lg">&times;</button>
            </div>
            <div className="p-6 space-y-6">
              <div className="bg-slate-950 rounded-xl p-5 border border-white/5">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 bg-orange-500/20 rounded-full flex items-center justify-center text-xl">
                    {(selectedUser.name || "U")[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="font-black text-white">{selectedUser.name || "Unnamed"}</p>
                    <p className="text-[10px] text-slate-500">{selectedUser.email || "No email"}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 text-[10px]">
                  <div><span className="text-slate-500">Role:</span> <span className={`font-bold ${roleColors[selectedUser.role] || ""}`}>{selectedUser.role || "user"}</span></div>
                  <div><span className="text-slate-500">Balance:</span> <span className="font-bold text-emerald-400">₦{(selectedUser.balance || 0).toLocaleString()}</span></div>
                  <div><span className="text-slate-500">Phone:</span> <span className="font-bold text-slate-300">{selectedUser.phone || "—"}</span></div>
                  <div><span className="text-slate-500">Referral:</span> <span className="font-bold text-slate-300">{selectedUser.referralCode || "—"}</span></div>
                  <div className="col-span-2"><span className="text-slate-500">Joined:</span> <span className="font-bold text-slate-300">{new Date(selectedUser._creationTime).toLocaleString()}</span></div>
                </div>
                {selectedUser.bankAccount && (
                  <div className="mt-3 pt-3 border-t border-white/5 text-[10px]">
                    <span className="text-slate-500">Bank:</span> <span className="font-bold text-slate-300">{selectedUser.bankAccount.bankName} — {selectedUser.bankAccount.accountNumber}</span>
                  </div>
                )}
              </div>

              {(() => {
                const sub = userSubMap[selectedUser._id];
                if (!sub) return (
                  <div className="bg-slate-950 rounded-xl p-5 border border-white/5 text-center text-slate-500 text-xs">No active subscription</div>
                );
                return (
                  <div className="bg-slate-950 rounded-xl p-5 border border-white/5 space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-black text-white text-sm">Subscription</h4>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${subStatusColors[sub.status] || ""}`}>{sub.status}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-[10px]">
                      <div><span className="text-slate-500">Plan:</span> <span className="font-bold text-white">{sub.plan}</span></div>
                      <div><span className="text-slate-500">Auto-Renew:</span> <span className="font-bold text-white">{sub.autoRenew ? "Yes" : "No"}</span></div>
                      <div><span className="text-slate-500">Expires:</span> <span className="font-bold text-white">{new Date(sub.endsAt).toLocaleDateString()}</span></div>
                      <div><span className="text-slate-500">Failures:</span> <span className="font-bold text-white">{sub.failureCount}</span></div>
                    </div>
                    <div className="flex flex-wrap gap-2 pt-2 border-t border-white/5">
                      {sub.status !== "active" && (
                        <button onClick={() => handleUpdateStatus(sub._id, "active")} className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 rounded-lg text-[10px] font-bold text-white">Activate</button>
                      )}
                      {sub.status === "active" && (
                        <button onClick={() => handleUpdateStatus(sub._id, "suspended")} className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 rounded-lg text-[10px] font-bold text-white">Suspend</button>
                      )}
                      <div className="flex items-center gap-1">
                        <input type="number" value={extendDays} onChange={(e) => setExtendDays(Number(e.target.value))}
                          className="w-16 bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-[10px] text-white text-center" />
                        <button onClick={() => handleExtend(sub._id)} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 rounded-lg text-[10px] font-bold text-white">Extend</button>
                      </div>
                      <button onClick={() => handleCancel(sub._id)} className="px-3 py-1.5 bg-red-600 hover:bg-red-700 rounded-lg text-[10px] font-bold text-white">Cancel</button>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
