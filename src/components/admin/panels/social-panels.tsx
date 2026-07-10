import { useState, useEffect, useCallback } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { convexQuery } from "@convex-dev/react-query";
import { api } from "../../../../convex/_generated/api";
import { MetricCard } from "./shared";

export function SocialEnginePanel({ adminToken }: { adminToken: string }) {
  const { data: stats } = useSuspenseQuery(convexQuery(api.social.getSocialStats, {})) as { data: any };
  const { data: analytics } = useSuspenseQuery(convexQuery(api.social.getPlatformAnalytics, {})) as { data: any };
  const getConnectedPlatformsAction = useAction(api.social.getConnectedPlatforms);
  const generateOAuthUrl = useAction(api.social.generateOAuthUrl);
  const startComposioOAuth = useAction(api.social.startComposioOAuth);
  const handleComposioCallback = useAction(api.social.handleComposioCallback);
  const connectTelegramBot = useAction(api.social.connectTelegramBot);
  const connectBluesky = useAction(api.social.connectBluesky);
  const startTryPostOAuth = useAction(api.social.startTryPostOAuth);
  const syncFromTryPost = useAction(api.social.syncFromTryPost);
  const { data: providerStatus } = useSuspenseQuery(convexQuery(api.social.getOAuthProviderStatus, {}));
  const disconnectPlatform = useMutation(api.social.disconnectPlatform);
  const disconnectAllPlatforms = useMutation(api.social.disconnectAllPlatforms);
  const updatePostingSettings = useMutation(api.social.updatePostingSettings);
  const manualPost = useAction(api.social.postToPlatform);

  const [platforms, setPlatforms] = useState<Array<any>>([]);
  const [platformsLoading, setPlatformsLoading] = useState(true);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<"platforms" | "analytics" | "posts">("platforms");
  const [postingMode, setPostingMode] = useState<Record<string, string>>({});
  const [manualPostContent, setManualPostContent] = useState<Record<string, string>>({});
  const [postingStatus, setPostingStatus] = useState<{ platformId: string; status: string; error?: string } | null>(null);
  const [toast, setToast] = useState<{ message: string; type: string } | null>(null);
  const [composioPoll, setComposioPoll] = useState<{ connectionId: string; platformId: string; startedAt: number } | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{ message: string; onConfirm: () => void } | null>(null);
  const [telegramModal, setTelegramModal] = useState(false);
  const [telegramToken, setTelegramToken] = useState("");
  const [blueskyModal, setBlueskyModal] = useState(false);
  const [blueskyHandle, setBlueskyHandle] = useState("");
  const [blueskyPassword, setBlueskyPassword] = useState("");

  const fetchPlatforms = useCallback(async () => {
    try {
      const result = await getConnectedPlatformsAction({ adminToken });
      const platformsData = result.platforms || [];
      const availablePlatforms = result.availablePlatforms || [];
      const merged = availablePlatforms.map((ap: any) => {
        const conn = platformsData.find((p: any) => p.id === ap.id || p.platformId === ap.id);
        return {
          ...ap,
          isConnected: conn?.isConnected === true,
          connectedAt: conn?.connectedAt,
          lastSyncAt: conn?.lastSyncAt,
          postsCount: conn?.postsCount || 0,
          followersCount: conn?.followersCount || 0,
          postingMode: conn?.autoPostEnabled ? "auto" : "manual",
          username: conn?.platformUsername || conn?.username,
          integrationId: conn?.integrationId,
        };
      });
      setPlatforms(merged);
      setPlatformsLoading(false);
    } catch (err) {
      console.error("Failed to load platforms", err);
      setPlatformsLoading(false);
    }
  }, [getConnectedPlatformsAction]);

  useEffect(() => { fetchPlatforms(); }, [fetchPlatforms]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const connectedPlatform = params.get("connected");
    if (connectedPlatform) {
      const platformName = connectedPlatform.charAt(0).toUpperCase() + connectedPlatform.slice(1);
      setToast({ message: `Connected to ${platformName}!`, type: "success" });
      setConnecting(null);
      fetchPlatforms();
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [fetchPlatforms]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === "social_connection_success") {
        const platformName = event.data.platformId?.charAt(0).toUpperCase() + event.data.platformId?.slice(1);
        setToast({ message: `Connected to ${platformName}!`, type: "success" });
        setConnecting(null);
        fetchPlatforms();
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [fetchPlatforms]);

  useEffect(() => {
    const checkLocalStorage = () => {
      try {
        const raw = localStorage.getItem("oauth_result");
        if (raw) {
          localStorage.removeItem("oauth_result");
          const data = JSON.parse(raw);
          if (data?.type === "social_connection_success") {
            const platformName = data.platformId?.charAt(0).toUpperCase() + data.platformId?.slice(1);
            setToast({ message: `Connected to ${platformName}!`, type: "success" });
            setConnecting(null);
            fetchPlatforms();
          }
        }
        const composioRaw = localStorage.getItem("composio_result");
        if (composioRaw) {
          localStorage.removeItem("composio_result");
          const composioData = JSON.parse(composioRaw);
          if (composioData?.type === "composio_connection_complete" && composioData?.connectedAccountId) {
            setComposioPoll({ connectionId: composioData.connectedAccountId, platformId: composioData.platformId || "unknown", startedAt: Date.now() });
          }
        }
      } catch (e) { console.error("Failed to read localStorage:", e); }
    };
    const onStorage = (e: StorageEvent) => { if (e.key === "oauth_result" || e.key === "composio_result") checkLocalStorage(); };
    window.addEventListener("storage", onStorage);
    const interval = setInterval(checkLocalStorage, 1500);
    return () => { clearInterval(interval); window.removeEventListener("storage", onStorage); };
  }, [fetchPlatforms]);

  useEffect(() => {
    const handleComposioMessage = (event: MessageEvent) => {
      const data: any = event.data;
      if (data?.type === "composio_connection_complete" && data?.connectedAccountId) {
        setComposioPoll({ connectionId: data.connectedAccountId, platformId: data.platformId || "unknown", startedAt: Date.now() });
      }
    };
    window.addEventListener("message", handleComposioMessage);
    return () => window.removeEventListener("message", handleComposioMessage);
  }, []);

  useEffect(() => {
    const checkPending = () => {
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key?.startsWith("composio_pending_")) {
            const platformId = key.replace("composio_pending_", "");
            const raw = localStorage.getItem(key);
            if (raw) {
              const data = JSON.parse(raw);
              localStorage.removeItem(key);
              if (data?.connectionId && !composioPoll) {
                setComposioPoll({ connectionId: data.connectionId, platformId, startedAt: data.startedAt || Date.now() });
              }
            }
          }
        }
      } catch (e) { console.error("Failed to check pending composio connections:", e); }
    };
    const interval = setInterval(checkPending, 2000);
    checkPending();
    return () => clearInterval(interval);
  }, [composioPoll]);

  useEffect(() => {
    if (!composioPoll) return;
    let cancelled = false;
    const tick = async () => {
      if (cancelled) return;
      const result: any = await handleComposioCallback({ platform: composioPoll.platformId, connectionId: composioPoll.connectionId, adminToken });
      if (cancelled) return;
      if (result?.success) {
        setToast({ message: `Connected to ${result.platformName} via Composio${result.username ? ` (@${result.username})` : ""}`, type: "success" });
        setConnecting(null); setComposioPoll(null); fetchPlatforms(); return;
      }
      if (result?.error && /not active/i.test(result.error)) return;
      if (result?.error) { setToast({ message: `Composio: ${result.error}`, type: "error" }); setConnecting(null); setComposioPoll(null); }
    };
    const interval = setInterval(tick, 2500);
    tick();
    const timeout = setTimeout(() => { if (!cancelled) { setToast({ message: "Composio connection timed out (90s).", type: "error" }); setConnecting(null); setComposioPoll(null); } }, 90_000);
    return () => { cancelled = true; clearInterval(interval); clearTimeout(timeout); };
  }, [composioPoll, handleComposioCallback, fetchPlatforms]);

  const showToast = (message: string, type: string) => { setToast({ message, type }); setTimeout(() => setToast(null), 5000); };

  const handleConnect = async (platformId: string) => {
    setConnecting(platformId);
    try {
      if (platformId === "telegram") { setTelegramModal(true); setConnecting(null); return; }
      if (platformId === "bluesky") { setBlueskyModal(true); setConnecting(null); return; }
      let authUrl: string | null = null;
      let usingProvider: "composio" | "trypost" | "direct" = "direct";
      let composioConnectionId: string | undefined = undefined;
      const composioAvailable = providerStatus?.composioEnabled === true && providerStatus?.composioPlatforms?.includes(platformId);
      const trypostAvailable = providerStatus?.trypostEnabled === true && providerStatus?.trypostPlatforms?.includes(platformId);
      if (composioAvailable) {
        const composioResult = await startComposioOAuth({ platform: platformId, adminToken });
        if (composioResult?.success && composioResult.redirectUrl) { authUrl = composioResult.redirectUrl; usingProvider = "composio"; composioConnectionId = composioResult.connectionId; }
      }
      if (!authUrl && trypostAvailable) {
        const trypostResult = await startTryPostOAuth({ platform: platformId, adminToken });
        if (trypostResult?.success && trypostResult.redirectUrl) { authUrl = trypostResult.redirectUrl; usingProvider = "trypost"; }
      }
      if (!authUrl) {
        const directResult = await generateOAuthUrl({ platform: platformId, adminToken });
        if (directResult?.error) {
          if (directResult.error.startsWith("TRYPST:") && directResult.authUrl) { authUrl = directResult.authUrl; usingProvider = "trypost"; }
          else { showToast(directResult.error, "error"); setConnecting(null); return; }
        } else { authUrl = directResult.authUrl || null; usingProvider = "direct"; }
      }
      if (authUrl) {
        const popup = window.open(authUrl, `connect-${platformId}`, `width=600,height=700,left=${(window.screen.width/2)-300},top=${(window.screen.height/2)-350},resizable=yes`);
        if (!popup) { showToast("Popup blocked.", "error"); setConnecting(null); return; }
        const popupCheck = setInterval(() => {
          if (popup.closed) {
            clearInterval(popupCheck); setConnecting(null);
            if (usingProvider === "composio" && composioConnectionId) { setComposioPoll({ connectionId: composioConnectionId, platformId, startedAt: Date.now() }); }
            else if (usingProvider === "trypost") { syncFromTryPost({ platform: platformId, adminToken }).then(() => fetchPlatforms()).catch(() => fetchPlatforms()); }
            else { fetchPlatforms(); }
          }
        }, 500);
      }
    } catch (err: any) { showToast(err?.message || "Failed to initiate connection", "error"); setConnecting(null); }
  };

  const handleDisconnect = async (platformId: string, platformName: string) => {
    setConfirmDialog({ message: `Disconnect from ${platformName}?`, onConfirm: async () => {
      try { await disconnectPlatform({ platformId, adminToken }); showToast(`Disconnected from ${platformName}`, "success"); fetchPlatforms(); } catch { showToast(`Failed to disconnect`, "error"); }
    }});
  };

  const handleConnectAll = async () => {
    const unconnected = platforms.filter((p) => !p.isConnected);
    if (unconnected.length === 0) { showToast("All platforms connected!", "success"); return; }
    setConfirmDialog({ message: `Connect all ${unconnected.length} platforms?`, onConfirm: async () => {
      showToast(`Opening ${unconnected.length} connections...`, "success");
      for (const p of unconnected) {
        try {
          let authUrl: string | null = null;
          const composioAvailable = providerStatus?.composioEnabled === true && providerStatus?.composioPlatforms?.includes(p.id);
          if (composioAvailable) { const cr = await startComposioOAuth({ platform: p.id, adminToken }); if (cr?.success && cr?.redirectUrl) { authUrl = cr.redirectUrl; if (cr.connectionId) localStorage.setItem(`composio_pending_${p.id}`, JSON.stringify({ connectionId: cr.connectionId, startedAt: Date.now() })); } }
          if (!authUrl) { const dr = await generateOAuthUrl({ platform: p.id, adminToken }); if (dr?.authUrl) authUrl = dr.authUrl; }
          if (authUrl) { window.open(authUrl, `connect-${p.id}`, `width=600,height=700`); await new Promise((r) => setTimeout(r, 1500)); }
        } catch (err: any) { showToast(`${p.name}: ${err.message}`, "error"); }
      }
    }});
  };

  const handleDisconnectAll = async () => {
    const connectedCount = platforms.filter((p) => p.isConnected).length;
    if (connectedCount === 0) { showToast("No platforms connected!", "error"); return; }
    setConfirmDialog({ message: `Disconnect ALL ${connectedCount} platforms?`, onConfirm: async () => {
      try { await disconnectAllPlatforms({ adminToken }); showToast(`Disconnected all`, "success"); fetchPlatforms(); } catch { showToast("Failed", "error"); }
    }});
  };

  const handleModeChange = async (platformId: string, mode: "auto" | "manual" | "paused") => {
    setPostingMode((prev) => ({ ...prev, [platformId]: mode }));
    const result = await updatePostingSettings({ platformId, mode, adminToken });
    if (result?.success) showToast(`${platformId.toUpperCase()} posting: ${mode.toUpperCase()}`, "success");
  };

  const handleManualPost = async (platformId: string) => {
    const content = manualPostContent[platformId] || "";
    if (!content.trim()) { showToast("Enter content", "error"); return; }
    setPostingStatus({ platformId, status: "posting" });
    const result = await manualPost({ platform: platformId, content, adminToken });
    if (result?.success) { setPostingStatus({ platformId, status: "success" }); setManualPostContent(prev => ({ ...prev, [platformId]: "" })); showToast(`Posted to ${platformId}!`, "success"); setTimeout(() => setPostingStatus(null), 3000); fetchPlatforms(); }
    else { setPostingStatus({ platformId, status: "error", error: result?.error || "Failed" }); showToast(result?.error || "Failed", "error"); }
  };

  const handleTelegramConnect = async () => {
    if (!telegramToken.trim()) return;
    setConnecting("telegram");
    try { const result = await connectTelegramBot({ botToken: telegramToken, adminToken }); if (result?.error) showToast(result.error, "error"); else { showToast(`Connected to Telegram`, "success"); fetchPlatforms(); } } catch (err: any) { showToast(err?.message || "Failed", "error"); }
    setConnecting(null); setTelegramModal(false); setTelegramToken("");
  };

  const handleBlueskyConnect = async () => {
    if (!blueskyHandle.trim() || !blueskyPassword.trim()) return;
    setConnecting("bluesky");
    try { const result = await connectBluesky({ identifier: blueskyHandle, appPassword: blueskyPassword, adminToken }); if (result?.error) showToast(result.error, "error"); else { showToast(`Connected to Bluesky`, "success"); fetchPlatforms(); } } catch (err: any) { showToast(err?.message || "Failed", "error"); }
    setConnecting(null); setBlueskyModal(false); setBlueskyHandle(""); setBlueskyPassword("");
  };

  if (platformsLoading) {
    return (<div className="flex items-center justify-center h-[60vh]"><div className="text-center space-y-4"><div className="w-10 h-10 border-3 border-slate-700 border-t-orange-500 rounded-full animate-spin mx-auto"></div><p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Loading platforms...</p></div></div>);
  }

  return (
    <div className="space-y-10 relative">
      {toast && (<div className={`fixed top-6 right-6 z-50 px-6 py-4 rounded-2xl shadow-2xl font-semibold text-sm ${toast.type === "success" ? "bg-emerald-600 text-white" : toast.type === "error" ? "bg-red-600 text-white" : "bg-slate-800 text-white border border-white/10"}`}>{toast.message}</div>)}
      <div className="bg-slate-900 border border-slate-800 rounded-[3.5rem] p-12 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-orange-600/5 blur-[80px]"></div>
        <div className="relative z-10 space-y-10">
          <div className="flex justify-between items-center flex-wrap gap-4">
            <div><h2 className="text-3xl font-black uppercase tracking-tighter text-white">Automated Social Engine</h2><p className="text-sm font-black text-orange-500 uppercase tracking-widest mt-1">Direct OAuth + API Integration</p></div>
            <div className="flex gap-3 flex-wrap">
              <button onClick={handleConnectAll} disabled={connecting !== null} className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl shadow-emerald-600/20 disabled:opacity-50">Connect All</button>
              <button onClick={handleDisconnectAll} disabled={connecting !== null} className="px-6 py-3 bg-red-600/20 hover:bg-red-600/40 text-red-400 border border-red-500/30 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-50">Disconnect All</button>
              <button onClick={() => { fetchPlatforms(); showToast("Refreshing...", "success"); }} className="px-8 py-4 bg-orange-600 hover:bg-orange-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl shadow-orange-600/20">Refresh</button>
              {providerStatus?.trypostEnabled && (<button onClick={async () => { const result = await syncFromTryPost({ adminToken }); if (result?.synced > 0) showToast(`Synced ${result.synced} accounts`, "success"); else showToast(result?.error || "No new accounts", "info"); fetchPlatforms(); }} className="px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl shadow-purple-600/20">Sync from TryPost</button>)}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <MetricCard label="Total Generated" value={stats?.total || 0} icon="📝" color="blue" />
            <MetricCard label="Live Posts" value={stats?.posted || 0} icon="🌐" color="emerald" />
            <MetricCard label="Scheduled" value={stats?.scheduled || 0} icon="📅" color="indigo" />
            <MetricCard label="Failed" value={stats?.failed || 0} icon="⚠️" color="red" />
          </div>
          <div className="flex gap-2 bg-slate-950 p-2 rounded-2xl border border-white/5">
            {(["platforms", "analytics", "posts"] as const).map((tab) => (<button key={tab} onClick={() => setActiveSubTab(tab)} className={`flex-1 py-3 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeSubTab === tab ? "bg-orange-600 text-white" : "text-slate-500 hover:bg-slate-800"}`}>{tab === "platforms" ? "Connected Platforms" : tab === "analytics" ? "Platform Analytics" : "Post History"}</button>))}
          </div>
          {activeSubTab === "platforms" && (<div className="space-y-6">
            <div className={`p-5 rounded-2xl border ${providerStatus?.composioEnabled ? "bg-emerald-500/5 border-emerald-500/20" : "bg-amber-500/5 border-amber-500/20"}`}>
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${providerStatus?.composioEnabled ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/20 text-amber-400"}`}>{providerStatus?.composioEnabled ? "✓" : "⚠"}</div>
                  <div><p className="text-xs font-black text-white uppercase tracking-widest">OAuth Provider: {providerStatus?.composioEnabled ? "Composio (Primary)" : "Direct Platform OAuth"}</p><p className="text-[10px] text-slate-400 mt-0.5">{providerStatus?.composioEnabled ? `Composio manages ${providerStatus.composioPlatforms?.length || 0} platforms` : "Set COMPOSIO_API_KEY to enable Composio"}</p></div>
                </div>
              </div>
            </div>
            <div className="bg-slate-950 p-10 rounded-[2.5rem] border border-white/5">
              <h3 className="text-lg font-black text-white uppercase tracking-tighter mb-8">Connect via OAuth</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {platforms?.map((p: any) => (
                  <div key={p.id} className={`p-6 rounded-2xl border transition-all ${p.isConnected ? "bg-emerald-500/5 border-emerald-500/20" : "bg-slate-900 border-white/5 hover:border-slate-700"}`}>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg text-white" style={{ backgroundColor: p.color || "#333" }}>{p.icon}</div>
                        <div><p className="text-sm font-black text-white">{p.name}</p><p className="text-[9px] font-bold uppercase tracking-widest">{p.isConnected ? <span className="text-emerald-500">Connected{p.username ? ` @${p.username}` : ""}</span> : <span className="text-slate-500">Not Connected</span>}</p></div>
                      </div>
                      <span className={`w-3 h-3 rounded-full ${p.isConnected ? "bg-emerald-500 animate-pulse" : "bg-slate-600"}`}></span>
                    </div>
                    {p.isConnected ? (
                      <div className="space-y-3">
                        <div className="flex justify-between text-[9px] font-bold"><span className="text-slate-500 uppercase">Posts</span><span className="text-white">{p.postsCount}</span></div>
                        <div className="flex justify-between text-[9px] font-bold"><span className="text-slate-500 uppercase">Followers</span><span className="text-white">{p.followersCount.toLocaleString()}</span></div>
                        <div className="flex gap-1 mt-3">{(["auto", "manual", "paused"] as const).map((mode) => (<button key={mode} onClick={() => handleModeChange(p.id, mode)} className={`flex-1 py-1.5 rounded-lg text-[8px] font-black uppercase transition-all ${(postingMode[p.id] || p.postingMode) === mode ? (mode === "auto" ? "bg-emerald-600 text-white" : mode === "manual" ? "bg-blue-600 text-white" : "bg-amber-600 text-white") : "bg-slate-800 text-slate-500 hover:bg-slate-700"}`}>{mode === "auto" ? "Auto" : mode === "manual" ? "Manual" : "Pause"}</button>))}</div>
                        {(postingMode[p.id] || p.postingMode) === "manual" && (<div className="mt-3 space-y-2"><textarea placeholder="Write your post..." value={manualPostContent[p.id] || ""} onChange={(e) => setManualPostContent(prev => ({ ...prev, [p.id]: e.target.value }))} className="w-full bg-slate-950 border border-white/10 rounded-xl p-3 text-white text-xs resize-none" rows={2} /><button onClick={() => handleManualPost(p.id)} disabled={postingStatus?.status === "posting"} className="w-full py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all disabled:opacity-50">{postingStatus?.status === "posting" && postingStatus?.platformId === p.id ? "Posting..." : "Post Now"}</button></div>)}
                        <button onClick={() => handleDisconnect(p.id, p.name)} className="w-full mt-2 py-2 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-red-500/20 transition-all">Disconnect</button>
                      </div>
                    ) : (
                      <button onClick={() => handleConnect(p.id)} disabled={connecting === p.id} className="w-full py-3 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-orange-600/20 disabled:opacity-50">{connecting === p.id ? "Connecting..." : `Connect ${p.name}`}</button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>)}
          {activeSubTab === "analytics" && (<div className="space-y-6"><div className="bg-slate-950 p-10 rounded-[2.5rem] border border-white/5"><h3 className="text-lg font-black text-white uppercase tracking-tighter mb-8">Platform Performance</h3><div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8"><MetricCard label="Total Leads" value={analytics?.totalLeads || 0} icon="📊" color="blue" /><MetricCard label="Total Users" value={analytics?.totalUsers || 0} icon="👥" color="emerald" /><MetricCard label="Total Revenue" value={`₦${(analytics?.totalRevenue || 0).toLocaleString()}`} icon="💰" color="amber" /></div></div></div>)}
          {activeSubTab === "posts" && (<div className="bg-slate-950 p-10 rounded-[2.5rem] border border-white/5"><h3 className="text-lg font-black text-white uppercase tracking-tighter mb-8">Post History</h3><div className="space-y-4">{stats?.history?.map((p: any) => (<div key={p._id} className="flex flex-col md:flex-row justify-between items-start md:items-center p-6 bg-slate-900 rounded-3xl border border-white/5 gap-4"><div className="flex items-center gap-4"><div className="w-12 h-12 bg-slate-950 rounded-2xl flex items-center justify-center text-xl">{p.platform === "x" ? "🐦" : p.platform === "linkedin" ? "💼" : "📱"}</div><div><p className="text-sm font-bold text-white line-clamp-1 max-w-md">{p.content}</p><p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-1">{p.agentId} - {new Date(p.scheduledFor).toLocaleString()}</p></div></div><span className={`px-4 py-1.5 rounded-full text-[8px] font-black uppercase tracking-widest border ${p.status === "posted" ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : p.status === "failed" ? "bg-red-500/10 text-red-500 border-red-500/20" : "bg-indigo-500/10 text-indigo-500 border-indigo-500/20"}`}>{p.status}</span></div>))}</div></div>)}
        </div>
      </div>
      {confirmDialog && (<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setConfirmDialog(null)}><div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 w-full max-w-md shadow-2xl" onClick={(e) => e.stopPropagation()}><h3 className="text-lg font-black text-white mb-4">Confirm Action</h3><p className="text-sm text-slate-400 mb-6">{confirmDialog.message}</p><div className="flex gap-3"><button onClick={() => setConfirmDialog(null)} className="flex-1 py-3 bg-slate-800 text-slate-400 rounded-xl font-bold text-sm">Cancel</button><button onClick={() => { confirmDialog.onConfirm(); setConfirmDialog(null); }} className="flex-1 py-3 bg-orange-600 hover:bg-orange-500 text-white rounded-xl font-bold text-sm">Confirm</button></div></div></div>)}
      {telegramModal && (<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => { setTelegramModal(false); setTelegramToken(""); }}><div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 w-full max-w-md shadow-2xl" onClick={(e) => e.stopPropagation()}><h3 className="text-lg font-black text-white mb-2">Connect Telegram Bot</h3><p className="text-sm text-slate-400 mb-6">Enter your Bot Token from @BotFather</p><input type="text" value={telegramToken} onChange={(e) => setTelegramToken(e.target.value)} placeholder="123456789:ABCdef..." className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-white font-mono text-sm mb-4" /><div className="flex gap-3"><button onClick={() => { setTelegramModal(false); setTelegramToken(""); }} className="flex-1 py-3 bg-slate-800 text-slate-400 rounded-xl font-bold text-sm">Cancel</button><button onClick={handleTelegramConnect} disabled={!telegramToken.trim() || connecting === "telegram"} className="flex-1 py-3 bg-orange-600 hover:bg-orange-500 text-white rounded-xl font-bold text-sm disabled:opacity-50">{connecting === "telegram" ? "Connecting..." : "Connect"}</button></div></div></div>)}
      {blueskyModal && (<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => { setBlueskyModal(false); setBlueskyHandle(""); setBlueskyPassword(""); }}><div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 w-full max-w-md shadow-2xl" onClick={(e) => e.stopPropagation()}><h3 className="text-lg font-black text-white mb-2">Connect Bluesky</h3><p className="text-sm text-slate-400 mb-6">Enter AT Protocol credentials</p><div className="space-y-3 mb-4"><input type="text" value={blueskyHandle} onChange={(e) => setBlueskyHandle(e.target.value)} placeholder="alice.bsky.social" className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-white text-sm" /><input type="password" value={blueskyPassword} onChange={(e) => setBlueskyPassword(e.target.value)} placeholder="App Password" className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-white text-sm" /></div><div className="flex gap-3"><button onClick={() => { setBlueskyModal(false); setBlueskyHandle(""); setBlueskyPassword(""); }} className="flex-1 py-3 bg-slate-800 text-slate-400 rounded-xl font-bold text-sm">Cancel</button><button onClick={handleBlueskyConnect} disabled={!blueskyHandle.trim() || !blueskyPassword.trim() || connecting === "bluesky"} className="flex-1 py-3 bg-orange-600 hover:bg-orange-500 text-white rounded-xl font-bold text-sm disabled:opacity-50">{connecting === "bluesky" ? "Connecting..." : "Connect"}</button></div></div></div>)}
    </div>
  );
}

export function GuardianWatchPanel() {
  const { data: logs } = useSuspenseQuery(convexQuery(api.guardian_watch.getGuardianLogs, {})) as { data: any[] };
  const { data: dashboard } = useSuspenseQuery(convexQuery(api.guardian_watch.getGuardianDashboard, {})) as { data: any };
  const runDiagnosis = useAction(api.guardian_watch.runFullDiagnosis);
  const [running, setRunning] = useState(false);
  const handleRun = async () => { setRunning(true); await runDiagnosis({}); setRunning(false); };
  const dash = dashboard ?? {};
  return (
    <div className="space-y-10">
      <div className="bg-slate-900 border border-slate-800 rounded-[3.5rem] p-12 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-teal-600/5 blur-[80px]"></div>
        <div className="relative z-10 space-y-10">
          <div className="flex justify-between items-center">
            <div><h2 className="text-3xl font-black uppercase tracking-tighter text-white">Guardian Watch v4.0</h2><p className="text-sm font-black text-teal-500 uppercase tracking-widest mt-1">Self-Testing & Auto-Healing</p></div>
            <button onClick={handleRun} disabled={running} className="px-8 py-4 bg-teal-600 hover:bg-teal-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl shadow-teal-600/20 disabled:opacity-50">{running ? "Diagnosing..." : "Run Full System Audit"}</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <MetricCard label="System Status" value={dash.status === 'optimal' ? 'OPTIMAL' : 'ATTENTION'} icon="🛡️" color={dash.status === 'optimal' ? 'emerald' : 'amber'} />
            <MetricCard label="Users" value={dash.userCount ?? 0} icon="👥" color="blue" />
            <MetricCard label="Total Tests" value={dash.totalTests ?? logs.length} icon="🧪" color="indigo" />
            <MetricCard label="Healed Issues" value={dash.healedCount ?? logs.filter((l: any) => l.status === 'healed').length} icon="🏥" color="teal" />
          </div>
          <div className="bg-slate-950 p-10 rounded-[2.5rem] border border-white/5">
            <h3 className="text-lg font-black text-white uppercase tracking-tighter mb-8">Sentinel Logs</h3>
            <div className="space-y-4">
              {logs.map((l: any) => (<div key={l._id} className="flex flex-col md:flex-row justify-between items-start md:items-center p-6 bg-slate-900 rounded-3xl border border-white/5 gap-4"><div className="flex items-center gap-4"><div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-lg ${l.status === 'pass' ? 'bg-emerald-500/10 text-emerald-500' : l.status === 'fail' ? 'bg-red-500/10 text-red-500' : 'bg-teal-500/10 text-teal-500'}`}>{l.status === 'pass' ? '✓' : l.status === 'fail' ? '✗' : '✚'}</div><div><p className="text-sm font-bold text-white">{l.testName}</p><p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-1">{l.category} - {new Date(l.timestamp).toLocaleTimeString()} {l.latency ? `- ${l.latency}ms` : ''}</p></div></div><span className={`px-4 py-1.5 rounded-full text-[8px] font-black uppercase tracking-widest border ${l.status === 'pass' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : l.status === 'fail' ? 'bg-red-500/10 text-red-500 border-red-500/20' : 'bg-teal-500/10 text-teal-500 border-teal-500/20'}`}>{l.status}</span></div>))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
