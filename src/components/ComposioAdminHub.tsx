import { useState } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { convexQuery } from "@convex-dev/react-query";
import { useMutation } from "convex/react";
import { useNavigate } from "@tanstack/react-router";
import { api, internal } from "../../convex/_generated/api";

interface ComposioAdminHubProps {
  adminToken: string;
}

const EMPTY_STATUS = {
  composioEnabled: false,
  totalPlatforms: 0,
  connectedPlatforms: 0,
  enabledPlatforms: 0,
  platforms: [],
  agents: [],
  authConfigsCount: 0,
  last24h: { total: 0, success: 0, failed: 0 },
  authError: true,
};

const EMPTY_LOGS: Array<any> = [];
const EMPTY_STATS = {
  overview: { totalActions: 0, successRate: 0, avgDuration: 0 },
  periods: { last24h: { total: 0, success: 0, failed: 0 }, last7d: { total: 0, success: 0, failed: 0 }, last30d: { total: 0, success: 0, failed: 0 } },
  byPlatform: {},
  byAgent: {},
};

export function ComposioAdminHub({ adminToken }: ComposioAdminHubProps) {
  const [activeSubTab, setActiveSubTab] = useState<"overview" | "platforms" | "agents" | "logs" | "stats">("overview");
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);
  const [busyPlatform, setBusyPlatform] = useState<string | null>(null);
  const [busyAgent, setBusyAgent] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleReLogin = () => {
    localStorage.removeItem("admin_session_token");
    localStorage.removeItem("auth_access_token");
    localStorage.removeItem("auth_refresh_token");
    localStorage.removeItem("auth_token_type");
    localStorage.removeItem("auth_expires_at");
    window.location.href = "/admin/login";
  };

  const showToast = (message: string, type: "success" | "error" | "info") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const { data: statusQuery } = useSuspenseQuery(convexQuery(api.composioHub.getComposioStatus, { adminToken }));
  const { data: logsQuery } = useSuspenseQuery(convexQuery(api.composioHub.getComposioActionLogs, { adminToken, limit: 50 }));
  const { data: statsQuery } = useSuspenseQuery(convexQuery(api.composioHub.getComposioStats, { adminToken }));

  const status = (statusQuery as any) ?? EMPTY_STATUS;
  const logs = (logsQuery as Array<any>) ?? EMPTY_LOGS;
  const stats = (statsQuery as any) ?? EMPTY_STATS;

  const togglePlatform = useMutation(api.composioHub.togglePlatform);
  const setPlatformMode = useMutation(api.composioHub.setPlatformMode);
  const toggleAgentComposio = useMutation(api.composioHub.toggleAgentComposio);
  const setAgentPlatforms = useMutation(api.composioHub.setAgentPlatforms);

  const refetchAll = () => {
    window.location.reload();
  };

  const handleTogglePlatform = async (platformId: string, enabled: boolean) => {
    setBusyPlatform(platformId);
    try {
      await togglePlatform({ adminToken, platform: platformId, enabled });
      showToast(`${platformId} ${enabled ? "enabled" : "disabled"} — synced to Social Engine`, "success");
      statusQuery.refetch();
    } catch (e: any) {
      showToast(`Failed to toggle ${platformId}: ${e?.message || "unknown error"}`, "error");
    } finally {
      setBusyPlatform(null);
    }
  };

  const handleSetMode = async (platformId: string, mode: "auto" | "manual" | "paused") => {
    setBusyPlatform(platformId);
    try {
      await setPlatformMode({ adminToken, platform: platformId, postingMode: mode });
      showToast(`${platformId} mode → ${mode.toUpperCase()} — synced to Social Engine`, "success");
      statusQuery.refetch();
    } catch (e: any) {
      showToast(`Failed to set mode for ${platformId}: ${e?.message || "unknown error"}`, "error");
    } finally {
      setBusyPlatform(null);
    }
  };

  const handleToggleAgent = async (agentId: string, composioEnabled: boolean) => {
    setBusyAgent(agentId);
    try {
      await toggleAgentComposio({ adminToken, agentId, composioEnabled });
      showToast(`${agentId} Composio ${composioEnabled ? "enabled" : "disabled"}`, "success");
      statusQuery.refetch();
    } catch (e: any) {
      showToast(`Failed to toggle ${agentId}: ${e?.message || "unknown error"}`, "error");
    } finally {
      setBusyAgent(null);
    }
  };

  if (statusQuery.isError) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="bg-slate-900 border border-red-500/20 rounded-3xl p-10 text-center max-w-md">
          <p className="text-red-500 font-black text-sm uppercase tracking-widest mb-3">Connection Error</p>
          <p className="text-slate-400 text-sm mb-4">Failed to load Composio Hub. The server may be unreachable.</p>
          <button
            onClick={() => statusQuery.refetch()}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-black uppercase rounded-xl"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (statusQuery.isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-10 text-center max-w-md">
          <p className="text-purple-500 font-black text-sm uppercase tracking-widest mb-3">Loading...</p>
          <p className="text-slate-400 text-sm">Connecting to Composio Hub...</p>
        </div>
      </div>
    );
  }

  if (status?.authError && !statusQuery.isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="bg-slate-900 border border-amber-500/20 rounded-3xl p-10 text-center max-w-md space-y-5">
          <p className="text-amber-500 font-black text-sm uppercase tracking-widest">Session Expired</p>
          <p className="text-slate-400 text-sm">Your admin session has expired. Please log in again to continue managing the Composio Hub.</p>
          <button
            onClick={handleReLogin}
            className="px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all"
          >
            🔐 Login Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 ">
      {/* Toast notifications */}
      {toast && (
        <div
          className={`fixed top-6 right-6 z-50 px-6 py-4 rounded-2xl shadow-2xl font-semibold text-sm animate-in slide-in-from-top-2 ${
            toast.type === "success"
              ? "bg-emerald-600 text-white"
              : toast.type === "error"
                ? "bg-red-600 text-white"
                : "bg-slate-800 text-white border border-white/10"
          }`}
        >
          {toast.message}
        </div>
      )}
      {/* Header */}
      <div className="bg-gradient-to-br from-purple-600/20 to-slate-900 border border-purple-500/20 rounded-[3rem] p-10 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-purple-600/5 blur-[80px]" />
        <div className="relative z-10 flex justify-between items-center flex-wrap gap-4">
          <div>
            <h2 className="text-3xl font-black uppercase tracking-tighter text-white">Composio Integration Hub</h2>
            <p className="text-sm font-black text-purple-500 uppercase tracking-widest mt-1">
              {status.composioEnabled ? "✅ Composio Active" : "⚠️ Composio Inactive"}
              {" • "}{status.connectedPlatforms}/{status.totalPlatforms} Connected
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => {
                refetchAll();
                showToast("Refreshed from Convex + Social Engine", "info");
              }}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all"
              title="Reload all data from the backend (and the Social Engine)"
            >
              🔄 Sync from Social Engine
            </button>
            <button
              onClick={() => {
                window.dispatchEvent(new CustomEvent("admin:tab:change", { detail: "social" }));
                showToast("Switch to the Social Engine tab in the left sidebar.", "info");
              }}
              className="px-4 py-2 bg-orange-600/20 hover:bg-orange-600/40 text-orange-400 border border-orange-500/30 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all"
              title="Go to the Social Engine tab in the sidebar"
            >
              📣 Open Social Engine
            </button>
          </div>
          <div className="flex gap-3 text-center">
            <div className="bg-slate-950 p-4 rounded-2xl border border-white/5">
              <p className="text-2xl font-black text-white">{status.last24h.success}</p>
              <p className="text-[9px] text-emerald-500 font-bold uppercase">Success (24h)</p>
            </div>
            <div className="bg-slate-950 p-4 rounded-2xl border border-white/5">
              <p className="text-2xl font-black text-white">{status.last24h.failed}</p>
              <p className="text-[9px] text-red-500 font-bold uppercase">Failed (24h)</p>
            </div>
            <div className="bg-slate-950 p-4 rounded-2xl border border-white/5">
              <p className="text-2xl font-black text-white">{status.authConfigsCount}</p>
              <p className="text-[9px] text-purple-500 font-bold uppercase">Auth Configs</p>
            </div>
          </div>
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-2 bg-slate-950 p-2 rounded-2xl border border-white/5">
        {(["overview", "platforms", "agents", "logs", "stats"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveSubTab(tab)}
            className={`flex-1 py-3 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
              activeSubTab === tab ? "bg-purple-600 text-white" : "text-slate-500 hover:bg-slate-800"
            }`}
          >
            {tab === "overview" ? "Overview" : tab === "platforms" ? "Platforms" : tab === "agents" ? "Agents" : tab === "logs" ? "Action Logs" : "Statistics"}
          </button>
        ))}
      </div>

      {/* OVERVIEW TAB */}
      {activeSubTab === "overview" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {status.platforms?.map((p: any) => (
            <PlatformCard
              key={p.id}
              platform={p}
              onToggle={async (enabled: boolean) => {
                await handleTogglePlatform(p.id, enabled);
              }}
              onModeChange={async (mode: "auto" | "manual" | "paused") => {
                await handleSetMode(p.id, mode);
              }}
            />
          ))}
        </div>
      )}

      {/* PLATFORMS TAB */}
      {activeSubTab === "platforms" && (
        <div className="space-y-6">
          <div className="bg-slate-950 p-8 rounded-3xl border border-white/5">
            <h3 className="text-lg font-black text-white uppercase tracking-tighter mb-6">Platform Controls</h3>
            <div className="space-y-4">
              {status.platforms?.map((p: any) => (
                <div key={p.id} className="flex items-center justify-between p-4 bg-slate-900 rounded-2xl border border-white/5">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg" style={{ backgroundColor: p.color + "20" }}>
                      {p.icon}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">{p.name}</p>
                      <p className="text-[9px] text-slate-500 uppercase">
                        {p.isConnected ? "✅ Connected" : "❌ Not connected"} • {p.last24hSuccess} actions (24h)
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {/* Mode buttons */}
                    <div className="flex gap-1">
                      {(["auto", "manual", "paused"] as const).map((mode) => (
                        <button
                          key={mode}
                          onClick={() => handleSetMode(p.id, mode)}
                          disabled={busyPlatform === p.id}
                          className={`px-3 py-1.5 rounded-lg text-[8px] font-black uppercase transition-all disabled:opacity-50 ${
                            p.postingMode === mode
                              ? mode === "auto" ? "bg-emerald-600 text-white"
                                : mode === "manual" ? "bg-blue-600 text-white"
                                : "bg-amber-600 text-white"
                              : "bg-slate-800 text-slate-500 hover:bg-slate-700"
                          }`}
                        >
                          {mode === "auto" ? "🤖" : mode === "manual" ? "✍️" : "⏸️"}
                        </button>
                      ))}
                    </div>
                    {/* Enable/Disable toggle */}
                    <button
                      onClick={() => handleTogglePlatform(p.id, !p.enabled)}
                      disabled={busyPlatform === p.id}
                      className={`w-12 h-6 rounded-full relative transition-all disabled:opacity-50 ${
                        p.enabled ? "bg-emerald-600" : "bg-slate-700"
                      }`}
                    >
                      <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${
                        p.enabled ? "right-1" : "left-1"
                      }`} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* AGENTS TAB */}
      {activeSubTab === "agents" && (
        <div className="bg-slate-950 p-8 rounded-3xl border border-white/5">
          <h3 className="text-lg font-black text-white uppercase tracking-tighter mb-6">Agent Composio Control</h3>
          <p className="text-xs text-slate-500 mb-6">Enable/disable Composio integration per agent. When enabled, agents can use Composio actions in the background.</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {status.agents?.map((a: any) => (
              <div key={a.agentId} className={`p-5 rounded-2xl border transition-all ${
                a.composioEnabled ? "bg-purple-500/5 border-purple-500/20" : "bg-slate-900 border-white/5"
              }`}>
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="text-sm font-bold text-white">{a.agentId}</p>
                    <p className="text-[9px] text-slate-500 uppercase">
                      {a.composioEnabled ? "✅ Active" : "⭕ Disabled"}
                    </p>
                  </div>
                  <button
                    onClick={() => handleToggleAgent(a.agentId, !a.composioEnabled)}
                    disabled={busyAgent === a.agentId}
                    className={`w-12 h-6 rounded-full relative transition-all disabled:opacity-50 ${
                      a.composioEnabled ? "bg-emerald-600" : "bg-slate-700"
                    }`}
                  >
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${
                      a.composioEnabled ? "right-1" : "left-1"
                    }`} />
                  </button>
                </div>
                {a.enabledPlatforms?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {a.enabledPlatforms.map((p: string) => (
                      <span key={p} className="px-2 py-0.5 bg-purple-500/10 text-purple-400 text-[8px] rounded font-bold uppercase">
                        {p}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* LOGS TAB */}
      {activeSubTab === "logs" && (
        <div className="bg-slate-950 p-8 rounded-3xl border border-white/5">
          <h3 className="text-lg font-black text-white uppercase tracking-tighter mb-6">Action Logs</h3>
          <div className="space-y-3 max-h-[600px] overflow-y-auto">
            {logs?.map((log: any) => (
              <div key={log._id} className="flex items-center justify-between p-4 bg-slate-900 rounded-xl border border-white/5">
                <div className="flex items-center gap-4">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm ${
                    log.status === "success" ? "bg-emerald-500/10 text-emerald-500"
                    : log.status === "failed" ? "bg-red-500/10 text-red-500"
                    : "bg-amber-500/10 text-amber-500"
                  }`}>
                    {log.status === "success" ? "✓" : log.status === "failed" ? "✗" : "⏳"}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white">{log.action} on {log.platform}</p>
                    <p className="text-[9px] text-slate-500">
                      {log.agentId ? `${log.agentId} • ` : ""}{new Date(log.timestamp).toLocaleString()}
                      {log.durationMs ? ` • ${log.durationMs}ms` : ""}
                    </p>
                  </div>
                </div>
                <span className={`text-[8px] font-black uppercase px-2 py-1 rounded ${
                  log.status === "success" ? "bg-emerald-500/10 text-emerald-500"
                  : log.status === "failed" ? "bg-red-500/10 text-red-500"
                  : "bg-amber-500/10 text-amber-500"
                }`}>
                  {log.status}
                </span>
              </div>
            ))}
            {(!logs || logs.length === 0) && (
              <p className="text-center text-slate-500 text-sm py-10">No action logs yet</p>
            )}
          </div>
        </div>
      )}

      {/* STATS TAB */}
      {activeSubTab === "stats" && stats && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-slate-950 p-6 rounded-2xl border border-white/5">
              <p className="text-[9px] text-slate-500 uppercase font-bold">Last 24 Hours</p>
              <p className="text-3xl font-black text-white mt-1">{stats.periods?.last24h?.total || 0}</p>
              <p className="text-[9px] text-emerald-500 font-bold">
                {stats.periods?.last24h?.success || 0} success / {stats.periods?.last24h?.failed || 0} failed
              </p>
            </div>
            <div className="bg-slate-950 p-6 rounded-2xl border border-white/5">
              <p className="text-[9px] text-slate-500 uppercase font-bold">Last 7 Days</p>
              <p className="text-3xl font-black text-white mt-1">{stats.periods?.last7d?.total || 0}</p>
              <p className="text-[9px] text-emerald-500 font-bold">
                {stats.periods?.last7d?.success || 0} success / {stats.periods?.last7d?.failed || 0} failed
              </p>
            </div>
            <div className="bg-slate-950 p-6 rounded-2xl border border-white/5">
              <p className="text-[9px] text-slate-500 uppercase font-bold">Last 30 Days</p>
              <p className="text-3xl font-black text-white mt-1">{stats.periods?.last30d?.total || 0}</p>
              <p className="text-[9px] text-emerald-500 font-bold">
                {stats.overview?.successRate || 0}% success rate
              </p>
            </div>
          </div>

          {/* Platform breakdown */}
          <div className="bg-slate-950 p-8 rounded-3xl border border-white/5">
            <h3 className="text-lg font-black text-white uppercase tracking-tighter mb-6">By Platform</h3>
            <div className="space-y-3">
              {Object.entries(stats.byPlatform || {}).map(([platform, data]: [string, any]) => (
                <div key={platform} className="flex items-center justify-between p-4 bg-slate-900 rounded-xl border border-white/5">
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{getPlatformIcon(platform)}</span>
                    <span className="text-sm font-bold text-white capitalize">{platform}</span>
                  </div>
                  <div className="flex items-center gap-4 text-[10px]">
                    <span className="text-emerald-500 font-bold">{data.success} success</span>
                    <span className="text-red-500 font-bold">{data.failed} failed</span>
                    <span className="text-slate-500 font-bold">{data.total} total</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Agent breakdown */}
          <div className="bg-slate-950 p-8 rounded-3xl border border-white/5">
            <h3 className="text-lg font-black text-white uppercase tracking-tighter mb-6">By Agent</h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {Object.entries(stats.byAgent || {}).map(([agent, data]: [string, any]) => (
                <div key={agent} className="p-4 bg-slate-900 rounded-xl border border-white/5 text-center">
                  <p className="text-lg font-black text-white">{agent}</p>
                  <p className="text-[9px] text-emerald-500 font-bold">{data.success} success</p>
                  <p className="text-[9px] text-red-500 font-bold">{data.failed} failed</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── PLATFORM CARD ───

function PlatformCard({ platform, onToggle, onModeChange }: {
  platform: any;
  onToggle: (enabled: boolean) => void;
  onModeChange: (mode: "auto" | "manual" | "paused") => void;
}) {
  return (
    <div className={`p-6 rounded-3xl border transition-all ${
      platform.isConnected
        ? "bg-gradient-to-br from-purple-500/10 to-slate-900 border-purple-500/20"
        : "bg-slate-950 border-white/5"
    }`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg" style={{ backgroundColor: platform.color + "20" }}>
            {platform.icon}
          </div>
          <div>
            <p className="text-sm font-bold text-white">{platform.name}</p>
            <p className="text-[9px] text-slate-500 uppercase">
              {platform.isConnected ? "Connected" : "Not connected"}
            </p>
          </div>
        </div>
        <button
          onClick={() => onToggle(!platform.enabled)}
          className={`w-12 h-6 rounded-full relative transition-all ${
            platform.enabled ? "bg-emerald-600" : "bg-slate-700"
          }`}
        >
          <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${
            platform.enabled ? "right-1" : "left-1"
          }`} />
        </button>
      </div>

      <div className="flex gap-1">
        {(["auto", "manual", "paused"] as const).map((mode) => (
          <button
            key={mode}
            onClick={() => onModeChange(mode)}
            className={`flex-1 py-2 rounded-xl text-[9px] font-black uppercase transition-all ${
              platform.postingMode === mode
                ? mode === "auto" ? "bg-emerald-600 text-white"
                  : mode === "manual" ? "bg-blue-600 text-white"
                  : "bg-amber-600 text-white"
                : "bg-slate-800 text-slate-500 hover:bg-slate-700"
            }`}
          >
            {mode === "auto" ? "🤖 Auto" : mode === "manual" ? "✍️ Manual" : "⏸️ Pause"}
          </button>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 text-[9px]">
        <div className="bg-slate-900 p-2 rounded-lg">
          <p className="text-slate-500 uppercase">Posts Today</p>
          <p className="text-white font-bold">{platform.postsToday}/{platform.dailyPostLimit}</p>
        </div>
        <div className="bg-slate-900 p-2 rounded-lg">
          <p className="text-slate-500 uppercase">Success Rate</p>
          <p className="text-white font-bold">{platform.successRate}%</p>
        </div>
      </div>
    </div>
  );
}

function getPlatformIcon(platform: string): string {
  const icons: Record<string, string> = {
    twitter: "🐦", linkedin: "💼", facebook: "📘", youtube: "📺",
    reddit: "🤖", discord: "💬", instagram: "📸", tiktok: "🎵",
    pinterest: "📌", threads: "🧵", bluesky: "🦋", telegram: "✈️",
  };
  return icons[platform] ?? "📱";
}
