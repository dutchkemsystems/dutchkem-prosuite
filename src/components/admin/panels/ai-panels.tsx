// AI & analytics panels extracted from admin/dashboard.tsx
import { useState } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { convexQuery } from "@convex-dev/react-query";
import { useAction, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { MetricCard } from "./shared";

// PlatformAnalyticsPanel (lines 2837-3007)
export function PlatformAnalyticsPanel() {
  const [timeRange, setTimeRange] = useState<"day" | "week" | "month" | "year">("month");
  const { data: analytics } = useSuspenseQuery(convexQuery(api.platform_analytics.getPlatformAnalyticsSummary, { timeRange })) as { data: any };
  const { data: dailyMetrics } = useSuspenseQuery(convexQuery(api.platform_analytics.getDailyPlatformMetrics, { days: timeRange === "day" ? 1 : timeRange === "week" ? 7 : timeRange === "month" ? 30 : 365 })) as { data: any };

  const totals = analytics?.totals || {};
  const platforms = analytics?.platforms || [];
  const revenueTotal = totals.revenue || 1;

  return (
    <div className="space-y-8">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard label="Total Visits" value={(totals.visits || 0).toLocaleString()} icon="👁️" color="blue" />
        <MetricCard label="Registrations" value={(totals.registrations || 0).toLocaleString()} icon="👥" color="emerald" />
        <MetricCard label="Subscriptions" value={(totals.subscriptions || 0).toLocaleString()} icon="💳" color="amber" />
        <MetricCard label="Revenue" value={`₦${(totals.revenue || 0).toLocaleString()}`} icon="💰" color="indigo" />
      </div>

      {/* Time Range Selector */}
      <div className="flex gap-2">
        {(["day", "week", "month", "year"] as const).map((range) => (
          <button
            key={range}
            onClick={() => setTimeRange(range)}
            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
              timeRange === range
                ? "bg-orange-600 text-white"
                : "bg-slate-800 text-slate-500 hover:bg-slate-700"
            }`}
          >
            {range}
          </button>
        ))}
      </div>

      {/* Daily Trend + Revenue Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Daily Trend Chart */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <h3 className="text-sm font-black uppercase tracking-tight text-white mb-4">Daily Trend</h3>
          {dailyMetrics && dailyMetrics.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dailyMetrics}>
                  <defs>
                    <linearGradient id="visitsGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#64748b' }} tickFormatter={(v: string) => v.slice(5)} />
                  <YAxis tick={{ fontSize: 10, fill: '#64748b' }} />
                  <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 12, fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Area type="monotone" dataKey="visits" stroke="#3b82f6" fill="url(#visitsGrad)" strokeWidth={2} name="Visits" />
                  <Area type="monotone" dataKey="registrations" stroke="#f59e0b" fill="transparent" strokeWidth={2} name="Registrations" strokeDasharray="5 5" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-slate-500 text-xs">No daily data available</div>
          )}
        </div>

        {/* Revenue by Platform Pie */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <h3 className="text-sm font-black uppercase tracking-tight text-white mb-4">Revenue Split</h3>
          {platforms.some((p: any) => p.revenue > 0) ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={platforms.filter((p: any) => p.revenue > 0)}
                    dataKey="revenue"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {platforms.filter((p: any) => p.revenue > 0).map((_: any, i: number) => (
                      <Cell key={i} fill={['#FF6B35', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'][i % 8]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => `₦${v.toLocaleString()}`} contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 12, fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-slate-500 text-xs">No revenue data yet</div>
          )}
        </div>
      </div>

      {/* Conversion Funnel */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <h3 className="text-sm font-black uppercase tracking-tight text-white mb-6">Conversion Funnel</h3>
        <div className="flex items-center justify-between gap-2">
          {[
            { label: 'Visits', value: totals.visits || 0, color: 'bg-blue-500' },
            { label: 'Registrations', value: totals.registrations || 0, color: 'bg-emerald-500' },
            { label: 'Subscriptions', value: totals.subscriptions || 0, color: 'bg-amber-500' },
            { label: 'Revenue', value: totals.revenue || 0, color: 'bg-indigo-500', isCurrency: true },
          ].map((step, i, arr) => {
            const maxWidth = arr[0].value || 1;
            const widthPct = Math.max((step.value / maxWidth) * 100, 8);
            return (
              <div key={step.label} className="flex-1 flex flex-col items-center gap-2">
                <div className="w-full relative">
                  <div className={`${step.color} rounded-xl h-12 flex items-center justify-center transition-all`} style={{ width: `${widthPct}%`, margin: '0 auto', minWidth: 48 }}>
                    <span className="text-xs font-black text-white">{step.isCurrency ? `₦${step.value.toLocaleString()}` : step.value.toLocaleString()}</span>
                  </div>
                </div>
                <span className="text-[10px] text-slate-400 font-bold uppercase">{step.label}</span>
                {i < arr.length - 1 && arr[i + 1].value > 0 && (
                  <span className="text-[9px] text-slate-600">{((arr[i + 1].value / Math.max(step.value, 1)) * 100).toFixed(1)}%</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Platform Performance Cards */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <h3 className="text-sm font-black uppercase tracking-tight text-white mb-6">Platform Performance</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {platforms.map((platform: any) => (
            <div key={platform.id} className="bg-slate-950 border border-white/5 rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className="text-xl">{platform.icon}</span>
                  <div>
                    <p className="text-sm font-bold text-white">{platform.name}</p>
                    <p className="text-[9px] text-slate-500">{platform.conversionRate}% conversion</p>
                  </div>
                </div>
                <span className="text-sm font-black text-emerald-400">₦{platform.revenue.toLocaleString()}</span>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-slate-500">Visits</span>
                  <span className="text-slate-300 font-bold">{platform.visits.toLocaleString()}</span>
                </div>
                <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full" style={{ width: `${totals.visits ? (platform.visits / totals.visits) * 100 : 0}%` }} />
                </div>
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-slate-500">Registrations</span>
                  <span className="text-slate-300 font-bold">{platform.registrations.toLocaleString()}</span>
                </div>
                <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${totals.registrations ? (platform.registrations / totals.registrations) * 100 : 0}%` }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}


// UserManagementPanel (lines 3008-3245)
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

  const roleColors: Record<string, string> = {
    admin: "bg-red-500/10 text-red-400",
    freelancer: "bg-blue-500/10 text-blue-400",
    user: "bg-emerald-500/10 text-emerald-400",
  };

  const subStatusColors: Record<string, string> = {
    active: "bg-emerald-500/10 text-emerald-400",
    pending: "bg-amber-500/10 text-amber-400",
    canceled: "bg-slate-500/10 text-slate-400",
    expired: "bg-red-500/10 text-red-400",
    suspended: "bg-orange-500/10 text-orange-400",
  };

  return (
    <div className="space-y-6">
      {statusMsg && (
        <div className={`p-4 rounded-2xl text-center text-sm font-black ${
          statusMsg.type === "success" ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" : "bg-red-500/10 text-red-500 border border-red-500/20"
        }`}>{statusMsg.message}</div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard label="Total Users" value={users.length} icon="👥" color="blue" />
        <MetricCard label="Active Subs" value={subStats?.active || 0} icon="💳" color="emerald" />
        <MetricCard label="Pending" value={subStats?.pending || 0} icon="⏳" color="amber" />
        <MetricCard label="MRR" value={`₦${((subStats?.mrr || 0) / 1000).toFixed(1)}K`} icon="💰" color="indigo" />
      </div>

      {/* Search & Filters */}
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

      {/* User Table */}
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

      {/* User Detail Slide-over */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setSelectedUser(null)} />
          <div className="relative w-full max-w-lg bg-slate-900 border-l border-slate-800 overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-slate-900 border-b border-slate-800 px-6 py-4 flex items-center justify-between z-10">
              <h3 className="font-black text-white">User Details</h3>
              <button onClick={() => setSelectedUser(null)} className="text-slate-400 hover:text-white text-lg">&times;</button>
            </div>
            <div className="p-6 space-y-6">
              {/* Profile */}
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

              {/* Subscription */}
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


// UnifiedAnalyticsPanel (lines 3246-3456)
export function UnifiedAnalyticsPanel() {
  const [activeSubTab, setActiveSubTab] = useState<"overview" | "platform" | "ai" | "users" | "support">("overview");

  // Cross-domain queries for overview
  const { data: platformData } = useSuspenseQuery(convexQuery(api.platform_analytics.getPlatformAnalyticsSummary, { timeRange: "month" })) as { data: any };
  const aiOverview: any = useQuery(api.model_analytics.getOverview, {});
  const supportAnalytics: any = useQuery(api.support_orchestrator.getSupportAnalytics, { days: 30 });

  const platformTotals = platformData?.totals || {};
  const aiTotal = aiOverview?.total || 0;
  const aiSuccessRate = aiOverview?.successRate || "0";
  const supportInteractions = supportAnalytics?.totalInteractions || 0;
  const pendingEscalations = supportAnalytics?.pendingEscalations || 0;

  const subTabs = [
    { id: "overview" as const, label: "Overview", icon: "📊" },
    { id: "platform" as const, label: "Platform", icon: "🌐" },
    { id: "ai" as const, label: "AI Models", icon: "🤖" },
    { id: "users" as const, label: "Users", icon: "👥" },
    { id: "support" as const, label: "Support", icon: "🎧" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-black">Unified Analytics</h2>
        <p className="text-xs text-slate-400 mt-1">Cross-domain insights across platform, AI, users, and support</p>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-1 bg-slate-800 rounded-xl p-1">
        {subTabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveSubTab(tab.id)}
            className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all ${
              activeSubTab === tab.id ? 'bg-orange-500 text-white' : 'text-slate-400 hover:text-white'
            }`}>
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeSubTab === "overview" && (
        <div className="space-y-6">
          {/* KPI Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
              <p className="text-2xl font-black text-blue-400">{(platformTotals.visits || 0).toLocaleString()}</p>
              <p className="text-[10px] text-slate-500 uppercase mt-1">Total Visits</p>
              <p className="text-[9px] text-slate-600 mt-0.5">Platform</p>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
              <p className="text-2xl font-black text-emerald-400">{(platformTotals.registrations || 0).toLocaleString()}</p>
              <p className="text-[10px] text-slate-500 uppercase mt-1">Registrations</p>
              <p className="text-[9px] text-slate-600 mt-0.5">Platform</p>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
              <p className="text-2xl font-black text-amber-400">{(platformTotals.subscriptions || 0).toLocaleString()}</p>
              <p className="text-[10px] text-slate-500 uppercase mt-1">Subscriptions</p>
              <p className="text-[9px] text-slate-600 mt-0.5">Platform</p>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
              <p className="text-2xl font-black text-indigo-400">₦{(platformTotals.revenue || 0).toLocaleString()}</p>
              <p className="text-[10px] text-slate-500 uppercase mt-1">Revenue</p>
              <p className="text-[9px] text-slate-600 mt-0.5">Platform</p>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
              <p className="text-2xl font-black text-purple-400">{aiTotal.toLocaleString()}</p>
              <p className="text-[10px] text-slate-500 uppercase mt-1">AI Requests</p>
              <p className="text-[9px] text-slate-600 mt-0.5">All Models</p>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
              <p className={`text-2xl font-black ${parseFloat(aiSuccessRate) >= 90 ? 'text-emerald-400' : 'text-amber-400'}`}>{aiSuccessRate}%</p>
              <p className="text-[10px] text-slate-500 uppercase mt-1">AI Success Rate</p>
              <p className="text-[9px] text-slate-600 mt-0.5">All Models</p>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
              <p className="text-2xl font-black text-cyan-400">{supportInteractions.toLocaleString()}</p>
              <p className="text-[10px] text-slate-500 uppercase mt-1">Support Interactions</p>
              <p className="text-[9px] text-slate-600 mt-0.5">Last 30 days</p>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
              <p className={`text-2xl font-black ${pendingEscalations > 0 ? 'text-red-400' : 'text-emerald-400'}`}>{pendingEscalations}</p>
              <p className="text-[10px] text-slate-500 uppercase mt-1">Pending Escalations</p>
              <p className="text-[9px] text-slate-600 mt-0.5">Support</p>
            </div>
          </div>

          {/* Domain Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Platform Summary */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-lg">🌐</span>
                <h3 className="text-sm font-black text-white">Platform Performance</h3>
              </div>
              <div className="space-y-3">
                {platformData?.platforms?.slice(0, 5).map((p: any) => (
                  <div key={p.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span>{p.icon}</span>
                      <span className="text-xs text-slate-300">{p.name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] text-slate-500">{p.visits} visits</span>
                      <span className="text-xs font-bold text-emerald-400">₦{p.revenue.toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* AI Model Summary */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-lg">🤖</span>
                <h3 className="text-sm font-black text-white">AI Model Usage</h3>
              </div>
              <div className="space-y-3">
                {Object.entries(aiOverview?.byModel || {}).slice(0, 5).map(([model, data]: [string, any]) => (
                  <div key={model} className="flex items-center justify-between">
                    <span className="text-xs text-slate-300 font-bold">{model}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] text-slate-500">{data.count} req</span>
                      <span className={`text-[10px] font-bold ${parseFloat(data.avgTime) < 2000 ? 'text-emerald-400' : 'text-amber-400'}`}>
                        {Math.round(data.avgTime / 100) / 10}s avg
                      </span>
                    </div>
                  </div>
                ))}
                {Object.keys(aiOverview?.byModel || {}).length === 0 && (
                  <p className="text-xs text-slate-500 text-center py-4">No AI usage data yet</p>
                )}
              </div>
            </div>

            {/* Support Summary */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-lg">🎧</span>
                <h3 className="text-sm font-black text-white">Support Overview</h3>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-950 rounded-xl p-3 text-center">
                  <p className="text-lg font-black text-orange-400">{supportAnalytics?.totalInteractions || 0}</p>
                  <p className="text-[9px] text-slate-500">Total</p>
                </div>
                <div className="bg-slate-950 rounded-xl p-3 text-center">
                  <p className="text-lg font-black text-emerald-400">{supportAnalytics?.routedCount || 0}</p>
                  <p className="text-[9px] text-slate-500">Routed</p>
                </div>
                <div className="bg-slate-950 rounded-xl p-3 text-center">
                  <p className="text-lg font-black text-blue-400">{supportAnalytics?.avgResponseMs || 0}ms</p>
                  <p className="text-[9px] text-slate-500">Avg Response</p>
                </div>
                <div className="bg-slate-950 rounded-xl p-3 text-center">
                  <p className={`text-lg font-black ${pendingEscalations > 0 ? 'text-red-400' : 'text-emerald-400'}`}>{pendingEscalations}</p>
                  <p className="text-[9px] text-slate-500">Pending</p>
                </div>
              </div>
            </div>

            {/* Confidence Distribution */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-lg">🎯</span>
                <h3 className="text-sm font-black text-white">Support Confidence</h3>
              </div>
              <div className="space-y-3">
                {Object.entries(supportAnalytics?.confidenceCounts || {}).map(([level, count]: [string, any]) => {
                  const total = supportAnalytics?.totalInteractions || 1;
                  const pct = Math.round((count / total) * 100);
                  return (
                    <div key={level}>
                      <div className="flex items-center justify-between text-[10px] mb-1">
                        <span className="text-slate-400 capitalize">{level}</span>
                        <span className="text-slate-300 font-bold">{count} ({pct}%)</span>
                      </div>
                      <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{
                          width: `${pct}%`,
                          backgroundColor: level === 'high' ? '#10b981' : level === 'medium' ? '#f59e0b' : '#ef4444',
                        }} />
                      </div>
                    </div>
                  );
                })}
                {Object.keys(supportAnalytics?.confidenceCounts || {}).length === 0 && (
                  <p className="text-xs text-slate-500 text-center py-4">No support data yet</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Platform Tab */}
      {activeSubTab === "platform" && <PlatformAnalyticsPanel />}

      {/* AI Models Tab */}
      {activeSubTab === "ai" && <ModelAnalyticsPanel adminToken="" />}

      {/* Users Tab */}
      {activeSubTab === "users" && <ClientAnalyticsDashboard />}

      {/* Support Tab */}
      {activeSubTab === "support" && <SupportDashboard />}
    </div>
  );
}


// SyntheticIntelPanel (lines 3457-3769)
export function SyntheticIntelPanel() {
  const { data: agents } = useSuspenseQuery(convexQuery(api.synthetic_intelligence.getAgentsWithStatus, {})) as { data: any };
  const { data: backups } = useSuspenseQuery(convexQuery(api.agent_backups.getBackups, {})) as { data: any };
  const { data: perfSummary } = useSuspenseQuery(convexQuery(api.synthetic_intelligence.getPerformanceSummary, {})) as { data: any };
  const { data: recentLogs } = useSuspenseQuery(convexQuery(api.synthetic_intelligence.getPerformanceLogs, { limit: 20 })) as { data: any };
  
  const toggleAgent = useMutation(api.synthetic_intelligence.toggleSyntheticAgent);
  const updateSettings = useMutation(api.synthetic_intelligence.updateAgentSettings);
  const enableAll = useMutation(api.synthetic_intelligence.enableAllAgents);
  const disableAll = useMutation(api.synthetic_intelligence.disableAllAgents);
  const createBackup = useMutation(api.agent_backups.createBackup);
  const restoreBackup = useMutation(api.agent_backups.restoreBackup);
  const generateResponse = useAction(api.synthetic_intelligence.generateSyntheticResponse);
  
  const [status, setStatus] = useState<{ message: string; type: string } | null>(null);
  const [backupName, setBackupName] = useState("");
  const [testPrompt, setTestPrompt] = useState("");
  const [testAgentId, setTestAgentId] = useState("A1");
  const [testResult, setTestResult] = useState<any>(null);
  const [testing, setTesting] = useState(false);
  const [showLivePanel, setShowLivePanel] = useState(false);

  const handleToggle = async (agentId: string, enabled: boolean) => {
    await toggleAgent({ agentId, enabled });
    setStatus({ message: `${agentId} ${enabled ? "enabled" : "disabled"}`, type: "success" });
    setTimeout(() => setStatus(null), 3000);
  };

  const handleEnableAll = async () => {
    await enableAll({});
    setStatus({ message: "All agents enabled", type: "success" });
    setTimeout(() => setStatus(null), 3000);
  };

  const handleDisableAll = async () => {
    await disableAll({});
    setStatus({ message: "All agents disabled", type: "success" });
    setTimeout(() => setStatus(null), 3000);
  };

  const handleCreateBackup = async () => {
    if (!backupName.trim()) {
      setStatus({ message: "Please enter backup name", type: "error" });
      return;
    }
    await createBackup({ name: backupName });
    setBackupName("");
    setStatus({ message: "Backup created successfully", type: "success" });
    setTimeout(() => setStatus(null), 3000);
  };

  const handleRestore = async (backupId: string) => {
    if (!confirm("Restore this backup? Current settings will be overwritten.")) return;
    await restoreBackup({ backupId: backupId as any });
    setStatus({ message: "Backup restored successfully", type: "success" });
    setTimeout(() => setStatus(null), 3000);
  };

  const handleTestAgent = async () => {
    if (!testPrompt.trim()) {
      setStatus({ message: "Enter a test prompt", type: "error" });
      return;
    }
    setTesting(true);
    setTestResult(null);
    try {
      const result = await generateResponse({
        agentId: testAgentId,
        prompt: testPrompt,
      });
      setTestResult(result);
      setStatus({ message: result.success ? "Generation successful!" : "Generation failed", type: result.success ? "success" : "error" });
    } catch (error: any) {
      setTestResult({ success: false, error: error.message });
      setStatus({ message: error.message, type: "error" });
    } finally {
      setTesting(false);
      setTimeout(() => setStatus(null), 5000);
    }
  };

  const enabledCount = agents?.filter((a: any) => a.syntheticEnabled).length || 0;

  return (
    <div className="space-y-10 ">
      {/* Status Banner */}
      {status && (
        <div className={`p-4 rounded-2xl text-center text-sm font-black ${
          status.type === "success" ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" :
          status.type === "error" ? "bg-red-500/10 text-red-500 border border-red-500/20" :
          "bg-blue-500/10 text-blue-500 border border-blue-500/20"
        }`}>
          {status.message}
        </div>
      )}

      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-[3.5rem] p-12 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-purple-600/5 blur-[80px]"></div>
        <div className="relative z-10 space-y-8">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-3xl font-black uppercase tracking-tighter text-white">Synthetic Intelligence</h2>
              <p className="text-sm font-black text-purple-500 uppercase tracking-widest mt-1">Agentic AI for 15 Agents • Live NVIDIA NIM Integration</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleEnableAll}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl"
              >
                Enable All
              </button>
              <button
                onClick={handleDisableAll}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-xl"
              >
                Disable All
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <MetricCard label="Total Agents" value={agents?.length || 0} icon="🤖" color="blue" />
            <MetricCard label="Enabled" value={enabledCount} icon="✅" color="emerald" />
            <MetricCard label="Disabled" value={(agents?.length || 0) - enabledCount} icon="⭕" color="red" />
            <MetricCard label="Backups" value={backups?.length || 0} icon="💾" color="amber" />
          </div>

          {/* Live Performance Stats */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
            <MetricCard label="Total Requests" value={perfSummary?.totals?.requests || 0} icon="📊" color="blue" />
            <MetricCard label="Success Rate" value={`${perfSummary?.totals?.requests ? Math.round((perfSummary.totals.success / perfSummary.totals.requests) * 100) : 0}%`} icon="✅" color="emerald" />
            <MetricCard label="Avg Latency" value={`${perfSummary?.totals?.avgLatency || 0}ms`} icon="⚡" color="amber" />
            <MetricCard label="Total Tokens" value={(perfSummary?.totals?.tokens || 0).toLocaleString()} icon="🔤" color="purple" />
            <MetricCard label="Errors" value={perfSummary?.totals?.failed || 0} icon="❌" color="red" />
          </div>
        </div>
      </div>

      {/* Agent Grid */}
      <div className="bg-slate-900 border border-slate-800 rounded-[3.5rem] p-12 shadow-2xl">
        <h3 className="text-xl font-black uppercase tracking-tighter text-white mb-8">Agent Synthetic Controls</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {agents?.map((agent: any) => (
            <div key={agent.id} className={`p-6 rounded-2xl border transition-all ${
              agent.syntheticEnabled 
                ? "bg-emerald-500/5 border-emerald-500/20" 
                : "bg-slate-950 border-white/5"
            }`}>
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{agent.icon}</span>
                  <div>
                    <p className="text-sm font-bold text-white">{agent.name}</p>
                    <p className="text-[9px] text-slate-500">{agent.id}</p>
                  </div>
                </div>
                <button
                  onClick={() => handleToggle(agent.id, !agent.syntheticEnabled)}
                  className={`w-12 h-6 rounded-full relative transition-all ${
                    agent.syntheticEnabled ? "bg-emerald-600" : "bg-slate-700"
                  }`}
                >
                  <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${
                    agent.syntheticEnabled ? "right-1" : "left-1"
                  }`}></div>
                </button>
              </div>
              <p className="text-[9px] text-slate-500 mb-3">{agent.description}</p>
              <div className="flex flex-wrap gap-1">
                {agent.capabilities?.map((cap: string) => (
                  <span key={cap} className="px-2 py-0.5 bg-slate-800 text-slate-400 text-[8px] rounded">
                    {cap}
                  </span>
                ))}
              </div>
              <div className="mt-3 pt-3 border-t border-white/5 text-[9px] text-slate-500">
                <p>Model: {agent.syntheticModel}</p>
                <p>Requests: {agent.totalRequests || 0}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Live Test Panel */}
      <div className="bg-slate-900 border border-slate-800 rounded-[3.5rem] p-12 shadow-2xl">
        <div className="flex justify-between items-center mb-8">
          <h3 className="text-xl font-black uppercase tracking-tighter text-white">Live AI Test</h3>
          <button
            onClick={() => setShowLivePanel(!showLivePanel)}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl"
          >
            {showLivePanel ? "Hide" : "Show"} Live Logs
          </button>
        </div>
        
        <div className="flex gap-4 mb-6">
          <select
            value={testAgentId}
            onChange={(e) => setTestAgentId(e.target.value)}
            className="bg-slate-950 border border-white/10 rounded-xl p-4 text-white text-sm w-48"
          >
            {agents?.map((agent: any) => (
              <option key={agent.id} value={agent.id}>{agent.icon} {agent.name}</option>
            ))}
          </select>
          <input
            value={testPrompt}
            onChange={(e) => setTestPrompt(e.target.value)}
            placeholder="Enter a prompt to test..."
            className="flex-1 bg-slate-950 border border-white/10 rounded-xl p-4 text-white text-sm"
            onKeyDown={(e) => e.key === "Enter" && handleTestAgent()}
          />
          <button
            onClick={handleTestAgent}
            disabled={testing}
            className="px-6 py-4 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 text-white text-xs font-bold rounded-xl"
          >
            {testing ? "⏳ Generating..." : "🚀 Test"}
          </button>
        </div>

        {testResult && (
          <div className={`p-6 rounded-2xl border ${testResult.success ? "bg-emerald-500/5 border-emerald-500/20" : "bg-red-500/5 border-red-500/20"}`}>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">{testResult.success ? "✅" : "❌"}</span>
              <span className="text-sm font-bold text-white">{testResult.agent || "Unknown Agent"}</span>
              {testResult.latencyMs && (
                <span className="text-[9px] text-slate-500 ml-auto">⚡ {testResult.latencyMs}ms • 🔤 {testResult.tokensUsed} tokens</span>
              )}
            </div>
            <p className="text-sm text-slate-300 whitespace-pre-wrap">{testResult.response || testResult.error}</p>
          </div>
        )}

        {/* Live Performance Logs */}
        {showLivePanel && recentLogs && (
          <div className="mt-8 space-y-2">
            <h4 className="text-sm font-bold text-white mb-4">Recent Activity</h4>
            {recentLogs.length === 0 ? (
              <p className="text-slate-500 text-xs text-center py-4">No activity yet. Test an agent to see logs.</p>
            ) : (
              recentLogs.map((log: any) => (
                <div key={log._id} className="flex items-center justify-between p-4 bg-slate-950 rounded-xl border border-white/5 text-[9px]">
                  <div className="flex items-center gap-3">
                    <span className={log.success ? "text-emerald-500" : "text-red-500"}>
                      {log.success ? "✅" : "❌"}
                    </span>
                    <span className="text-white font-bold">{log.agentId}</span>
                    <span className="text-slate-500 truncate max-w-[300px]">{log.prompt}</span>
                  </div>
                  <div className="flex items-center gap-4 text-slate-500">
                    <span>{log.latencyMs}ms</span>
                    <span>{log.tokensUsed}t</span>
                    <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Backup Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-[3.5rem] p-12 shadow-2xl">
        <h3 className="text-xl font-black uppercase tracking-tighter text-white mb-8">Cloud Backups</h3>
        
        {/* Create Backup */}
        <div className="flex gap-4 mb-8">
          <input
            value={backupName}
            onChange={(e) => setBackupName(e.target.value)}
            placeholder="Backup name (e.g., Pre-upgrade snapshot)"
            className="flex-1 bg-slate-950 border border-white/10 rounded-xl p-4 text-white text-sm"
          />
          <button
            onClick={handleCreateBackup}
            className="px-6 py-4 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl"
          >
            💾 Create Backup
          </button>
        </div>

        {/* Backup List */}
        <div className="space-y-4">
          {backups?.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-10">No backups yet. Create one to protect your settings.</p>
          ) : (
            backups?.map((backup: any) => (
              <div key={backup.id} className="flex justify-between items-center p-6 bg-slate-950 rounded-2xl border border-white/5">
                <div>
                  <p className="text-sm font-bold text-white">{backup.name}</p>
                  <p className="text-[9px] text-slate-500">
                    {new Date(backup.timestamp).toLocaleString()} • {backup.stats?.totalConfigs || 0} configs
                  </p>
                </div>
                <button
                  onClick={() => handleRestore(backup.id)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl"
                >
                  ↩️ Restore
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}


// AdEnginePanel (lines 3770-end)
export function AdEnginePanel() {
  const { data: engineStatus } = useSuspenseQuery(convexQuery(api.adEngine.getAdEngineStatus, {})) as { data: any };
  const { data: campaigns } = useSuspenseQuery(convexQuery(api.adEngine.getCampaigns, {})) as { data: any };
  const { data: analytics } = useSuspenseQuery(convexQuery(api.adEngine.getAdAnalytics, {})) as { data: any };
  const { data: agents } = useSuspenseQuery(convexQuery(api.synthetic_intelligence.getAgentsWithStatus, {})) as { data: any };

  const adAdminToken = typeof window !== "undefined" ? localStorage.getItem("admin_session_token") || "" : "";

  const toggleEngine = useMutation(api.adEngine.toggleAdEngine);
  const toggleAutoPost = useMutation(api.adEngine.toggleAutoPost);
  const createCampaign = useMutation(api.adEngine.createCampaign);
  const updateCampaign = useMutation(api.adEngine.updateCampaign);
  const deleteCampaign = useMutation(api.adEngine.deleteCampaign);
  const generateFlyer = useAction(api.adEngine.generateFlyer);
  const executeAdPost = useAction(api.adEngine.executeAdPost);
  const createAd = useMutation(api.adEngine.createAd);

  const [status, setStatus] = useState<{ message: string; type: string } | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newCampaign, setNewCampaign] = useState({
    name: "",
    description: "",
    platform: "x",
    budget: 0,
    dailyBudget: 0,
    goals: "",
  });
  const [selectedCampaign, setSelectedCampaign] = useState<string | null>(null);
  const [adContent, setAdContent] = useState("");
  const [flyerPrompt, setFlyerPrompt] = useState("");

  const handleToggleEngine = async (enabled: boolean) => {
    try {
      await toggleEngine({ enabled, adminToken: adAdminToken });
      setStatus({ message: `Ad engine ${enabled ? "enabled" : "disabled"}`, type: "success" });
    } catch (err: any) {
      setStatus({ message: err?.message || "Failed to toggle engine", type: "error" });
    }
  };

  const handleToggleAutoPost = async (enabled: boolean) => {
    try {
      await toggleAutoPost({ enabled, adminToken: adAdminToken });
      setStatus({ message: `Auto-posting ${enabled ? "enabled" : "disabled"}`, type: "success" });
    } catch (err: any) {
      setStatus({ message: err?.message || "Failed to toggle auto-post", type: "error" });
    }
  };

  const handleCreateCampaign = async () => {
    if (!newCampaign.name.trim()) {
      setStatus({ message: "Campaign name is required", type: "error" });
      return;
    }
    try {
      const result: any = await createCampaign({
        name: newCampaign.name,
        description: newCampaign.description || undefined,
        platform: newCampaign.platform,
        budget: newCampaign.budget || undefined,
        dailyBudget: newCampaign.dailyBudget || undefined,
        startDate: Date.now(),
        goals: newCampaign.goals || undefined,
        adminToken: adAdminToken,
      });
      setStatus({ message: `Campaign created successfully`, type: "success" });
      setShowCreateForm(false);
      setNewCampaign({ name: "", description: "", platform: "x", budget: 0, dailyBudget: 0, goals: "" });
    } catch (err: any) {
      setStatus({ message: err?.message || "Failed to create campaign", type: "error" });
    }
  };

  const handleDeleteCampaign = async (campaignId: string) => {
    if (!confirm("Delete this campaign and all its ads?")) return;
    try {
      await deleteCampaign({ campaignId: campaignId as any, adminToken: adAdminToken });
      setStatus({ message: "Campaign deleted", type: "success" });
    } catch (err: any) {
      setStatus({ message: err?.message || "Failed to delete", type: "error" });
    }
  };

  const handleGenerateFlyer = async () => {
    if (!flyerPrompt.trim()) {
      setStatus({ message: "Flyer prompt is required", type: "error" });
      return;
    }
    try {
      const result: any = await generateFlyer({ prompt: flyerPrompt, adminToken: adAdminToken });
      setAdContent(`${result.headline}\n\n${result.body}\n\n${result.cta}`);
      setStatus({ message: `Flyer generated: "${result.headline}"`, type: "success" });
    } catch (err: any) {
      setStatus({ message: err?.message || "Failed to generate flyer", type: "error" });
    }
  };

  const handlePostAd = async (campaignId: string, platform: string) => {
    if (!adContent.trim()) {
      setStatus({ message: "Ad content is required", type: "error" });
      return;
    }
    try {
      const adResult: any = await createAd({
        campaignId: campaignId as any,
        title: `${platform} ad - ${new Date().toLocaleDateString()}`,
        content: adContent,
        adminToken: adAdminToken,
      });
      if (adResult?.adId) {
        const result: any = await executeAdPost({ adId: adResult.adId, adminToken: adAdminToken });
        if (result.success) {
          setStatus({ message: `✅ Posted to ${platform} successfully`, type: "success" });
          setAdContent("");
        } else {
          setStatus({ message: `Failed: ${result.error}`, type: "error" });
        }
      }
    } catch (err: any) {
      setStatus({ message: err?.message || "Failed to post ad", type: "error" });
    }
  };

  const platformNames: Record<string, string> = {
    x: "X (Twitter)",
    linkedin: "LinkedIn",
    facebook: "Facebook",
    instagram: "Instagram",
    tiktok: "TikTok",
    youtube: "YouTube",
    pinterest: "Pinterest",
    reddit: "Reddit",
    threads: "Threads",
    discord: "Discord",
    bluesky: "Bluesky",
  };

  return (
    <div className="space-y-6  duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black uppercase tracking-tighter text-white">📢 Ad Engine</h2>
          <p className="text-slate-400 text-sm mt-1">AI-powered ad campaigns using your connected social accounts</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => handleToggleEngine(!engineStatus?.enabled)}
            className={`px-4 py-2 rounded-xl font-bold text-xs uppercase tracking-wider transition-all ${
              engineStatus?.enabled ? "bg-emerald-600 hover:bg-emerald-700" : "bg-slate-700 hover:bg-slate-600"
            } text-white`}
          >
            {engineStatus?.enabled ? "Engine ON" : "Engine OFF"}
          </button>
          <button
            onClick={() => handleToggleAutoPost(!engineStatus?.autoPost)}
            disabled={!engineStatus?.enabled}
            className={`px-4 py-2 rounded-xl font-bold text-xs uppercase tracking-wider transition-all ${
              engineStatus?.autoPost ? "bg-cyan-600 hover:bg-cyan-700" : "bg-slate-700 hover:bg-slate-600"
            } text-white disabled:opacity-50`}
          >
            {engineStatus?.autoPost ? "Auto-Post ON" : "Auto-Post OFF"}
          </button>
        </div>
      </div>

      {status && (
        <div className={`p-3 rounded-xl ${status.type === "success" ? "bg-emerald-500/20 text-emerald-300" : "bg-red-500/20 text-red-300"} text-sm font-medium`}>
          {status.message}
        </div>
      )}

      {/* Analytics Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-indigo-900/40 to-slate-900/40 border border-indigo-500/30 rounded-2xl p-4">
          <p className="text-xs text-slate-400 uppercase tracking-wider">Total Ads</p>
          <p className="text-3xl font-black text-white mt-1">{analytics?.totalAds || 0}</p>
        </div>
        <div className="bg-gradient-to-br from-emerald-900/40 to-slate-900/40 border border-emerald-500/30 rounded-2xl p-4">
          <p className="text-xs text-slate-400 uppercase tracking-wider">Posted</p>
          <p className="text-3xl font-black text-emerald-400 mt-1">{analytics?.postedAds || 0}</p>
        </div>
        <div className="bg-gradient-to-br from-amber-900/40 to-slate-900/40 border border-amber-500/30 rounded-2xl p-4">
          <p className="text-xs text-slate-400 uppercase tracking-wider">Impressions</p>
          <p className="text-3xl font-black text-amber-400 mt-1">{(analytics?.totalImpressions || 0).toLocaleString()}</p>
        </div>
        <div className="bg-gradient-to-br from-pink-900/40 to-slate-900/40 border border-pink-500/30 rounded-2xl p-4">
          <p className="text-xs text-slate-400 uppercase tracking-wider">CTR</p>
          <p className="text-3xl font-black text-pink-400 mt-1">{analytics?.ctr || "0.00"}%</p>
        </div>
      </div>

      {/* Campaigns */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-white">Campaigns</h3>
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-bold text-xs uppercase tracking-wider"
          >
            {showCreateForm ? "Cancel" : "+ New Campaign"}
          </button>
        </div>

        {showCreateForm && (
          <div className="bg-slate-950/50 border border-slate-700 rounded-xl p-4 mb-4 space-y-3">
            <input
              type="text"
              placeholder="Campaign name"
              value={newCampaign.name}
              onChange={(e) => setNewCampaign({ ...newCampaign, name: e.target.value })}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm"
            />
            <textarea
              placeholder="Description (optional)"
              value={newCampaign.description}
              onChange={(e) => setNewCampaign({ ...newCampaign, description: e.target.value })}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm"
              rows={2}
            />
            <select
              value={newCampaign.platform}
              onChange={(e) => setNewCampaign({ ...newCampaign, platform: e.target.value })}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm"
            >
              {Object.entries(platformNames).map(([id, name]) => (
                <option key={id} value={id}>{name}</option>
              ))}
            </select>
            <input
              type="text"
              placeholder="Goals (optional)"
              value={newCampaign.goals}
              onChange={(e) => setNewCampaign({ ...newCampaign, goals: e.target.value })}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm"
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                placeholder="Total budget"
                value={newCampaign.budget || ""}
                onChange={(e) => setNewCampaign({ ...newCampaign, budget: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm"
              />
              <input
                type="number"
                placeholder="Daily budget"
                value={newCampaign.dailyBudget || ""}
                onChange={(e) => setNewCampaign({ ...newCampaign, dailyBudget: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm"
              />
            </div>
            <button
              onClick={handleCreateCampaign}
              className="w-full px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-sm"
            >
              Create Campaign
            </button>
          </div>
        )}

        <div className="space-y-2">
          {!campaigns || campaigns.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-8">No campaigns yet. Create one to get started.</p>
          ) : (
            campaigns.map((c: any) => (
              <div key={c._id} className={`bg-slate-950/50 border rounded-xl p-4 ${selectedCampaign === c._id ? "border-orange-500" : "border-slate-800"}`}>
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-white font-bold">{c.name}</h4>
                      <span className="text-xs px-2 py-0.5 bg-slate-800 text-slate-300 rounded-full">{platformNames[c.platform] || c.platform}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        c.status === "active" ? "bg-emerald-500/20 text-emerald-400" :
                        c.status === "paused" ? "bg-amber-500/20 text-amber-400" :
                        c.status === "completed" ? "bg-blue-500/20 text-blue-400" :
                        "bg-slate-700 text-slate-300"
                      }`}>
                        {c.status}
                      </span>
                    </div>
                    {c.description && <p className="text-xs text-slate-400 mt-1">{c.description}</p>}
                    {c.goals && <p className="text-xs text-slate-500 mt-1">Goal: {c.goals}</p>}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSelectedCampaign(selectedCampaign === c._id ? null : c._id)}
                      className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg text-xs font-bold"
                    >
                      {selectedCampaign === c._id ? "Hide" : "Post Ad"}
                    </button>
                    <button
                      onClick={() => handleDeleteCampaign(c._id)}
                      className="px-3 py-1.5 bg-red-600/20 hover:bg-red-600/40 text-red-400 rounded-lg text-xs font-bold"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                {selectedCampaign === c._id && (
                  <div className="mt-4 pt-4 border-t border-slate-800 space-y-3">
                    <div>
                      <label className="text-xs text-slate-400 uppercase tracking-wider mb-1 block">Flyer Prompt</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Describe your ad (e.g. '50% off Finance Agent this week')"
                          value={flyerPrompt}
                          onChange={(e) => setFlyerPrompt(e.target.value)}
                          className="flex-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm"
                        />
                        <button
                          onClick={handleGenerateFlyer}
                          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold text-xs uppercase"
                        >
                          🤖 Generate
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 uppercase tracking-wider mb-1 block">Ad Content</label>
                      <textarea
                        placeholder="Write or generate your ad content..."
                        value={adContent}
                        onChange={(e) => setAdContent(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm"
                        rows={3}
                      />
                    </div>
                    <button
                      onClick={() => handlePostAd(c._id, c.platform)}
                      disabled={!adContent.trim()}
                      className="w-full px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white rounded-lg font-bold text-sm"
                    >
                      📤 Post to {platformNames[c.platform] || c.platform}
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
