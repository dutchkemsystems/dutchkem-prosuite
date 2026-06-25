import { useState } from "react";
import { useAction, useMutation } from "convex/react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { convexQuery } from "@convex-dev/react-query";
import { api } from '../../../convex/_generated/api';

export function RapidAPIFallbackDashboard({ adminToken }: { adminToken: string }) {
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const { data } = useSuspenseQuery(convexQuery(api.rapidapi.getRapidAPIStatus, { adminToken }));
  const { data: postingConfig } = useSuspenseQuery(convexQuery(api.rapidapi.getPostingConfig, { adminToken }));
  const testConn = useAction(api.rapidapi.testConnection);
  const postToAll = useAction(api.rapidapi.postToAllPlatforms);
  const setConfig = useMutation(api.rapidapi.setPostingConfig);

  if (!data || !postingConfig) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
        <span className="ml-3 text-orange-400 font-black uppercase tracking-widest text-xs">Loading RapidAPI...</span>
      </div>
    );
  }

  if ("authError" in data) {
    return <div className="text-center py-20 text-red-400">Authentication required</div>;
  }

  const { platforms, stats, recentLogs, recentFailures } = data;
  const { postingMode, autoPostEnabled, autoPostPlatforms } = postingConfig;

  const handleTest = async (platformId: string) => {
    try {
      const result = await testConn({ platform: platformId, adminToken });
      setToast({ msg: result.message, type: result.success ? "success" : "error" });
      setTimeout(() => setToast(null), 3000);
    } catch (e: any) {
      setToast({ msg: e?.message || "Test failed", type: "error" });
      setTimeout(() => setToast(null), 3000);
    }
  };

  const handlePostNow = async () => {
    try {
      const result = await postToAll({ content: "Dutchkem Ventures Prosuite NG+ — Your autonomous business platform. #Prosuite #BusinessGrowth", adminToken });
      const successCount = result.results.filter((r: any) => r.success).length;
      const failCount = result.results.filter((r: any) => !r.success).length;
      setToast({
        msg: `Posted to ${successCount} platforms${failCount > 0 ? `, ${failCount} failed` : ""}`,
        type: successCount > 0 ? "success" : "error",
      });
      setTimeout(() => setToast(null), 5000);
    } catch (e: any) {
      setToast({ msg: e?.message || "Post failed", type: "error" });
      setTimeout(() => setToast(null), 3000);
    }
  };

  const handleSetMode = async (mode: string) => {
    await setConfig({ key: "posting_mode", value: mode, adminToken });
    setToast({ msg: `Posting mode set to ${mode}`, type: "success" });
    setTimeout(() => setToast(null), 2000);
  };

  const handleToggleAutoPost = async () => {
    await setConfig({ key: "auto_post_enabled", value: !autoPostEnabled, adminToken });
    setToast({ msg: autoPostEnabled ? "Auto-post disabled" : "Auto-post enabled", type: "success" });
    setTimeout(() => setToast(null), 2000);
  };

  const handleTogglePlatform = async (platformId: string) => {
    const newPlatforms = autoPostPlatforms.includes(platformId)
      ? autoPostPlatforms.filter((p: string) => p !== platformId)
      : [...autoPostPlatforms, platformId];
    await setConfig({ key: "auto_post_platforms", value: newPlatforms, adminToken });
  };

  const compFallbacks = platforms.filter((p: any) => p.type === "composio_fallback");
  const exclusives = platforms.filter((p: any) => p.type === "exclusive");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-500/10 to-red-500/10 border border-orange-500/20 rounded-2xl p-6">
        <h2 className="text-2xl font-black text-white mb-2">🔄 RapidAPI Fallback Engine</h2>
        <p className="text-gray-400 text-sm">Backup social posting when Composio fails + Additional platforms not in Composio</p>
        <div className="mt-3 bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-3 text-yellow-400 text-xs font-bold">
          ⚠️ RapidAPI acts as FALLBACK only. Composio remains the primary engine.
        </div>
      </div>

      {/* Posting Mode Controls */}
      <div className="bg-gray-900/50 border border-gray-700/50 rounded-2xl p-6">
        <h3 className="text-white font-black text-sm uppercase tracking-widest mb-4">🎯 Posting Mode</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          {[
            { id: "composio", label: "Composio Only", desc: "Primary engine only", icon: "🔗" },
            { id: "rapidapi", label: "RapidAPI Only", desc: "Fallback engine only", icon: "⚡" },
            { id: "both", label: "Both (Recommended)", desc: "Composio first, RapidAPI fallback", icon: "🔄" },
          ].map((mode) => (
            <button
              key={mode.id}
              onClick={() => handleSetMode(mode.id)}
              className={`p-4 rounded-xl border-2 text-left transition-all ${
                postingMode === mode.id
                  ? "border-orange-500 bg-orange-500/10"
                  : "border-gray-700/50 bg-gray-800/50 hover:border-gray-600"
              }`}
            >
              <div className="text-lg mb-1">{mode.icon}</div>
              <div className="text-white font-bold text-sm">{mode.label}</div>
              <div className="text-gray-400 text-xs">{mode.desc}</div>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-4 mt-4">
          <button
            onClick={handleToggleAutoPost}
            className={`px-6 py-3 rounded-xl font-bold text-sm transition-all ${
              autoPostEnabled
                ? "bg-emerald-600 hover:bg-emerald-500 text-white"
                : "bg-gray-700 hover:bg-gray-600 text-gray-300"
            }`}
          >
            {autoPostEnabled ? "🟢 Auto-Post ON" : "🔴 Auto-Post OFF"}
          </button>
          <button
            onClick={handlePostNow}
            className="px-6 py-3 bg-orange-600 hover:bg-orange-500 text-white rounded-xl font-bold text-sm transition-all"
          >
            🚀 Post Now (All Platforms)
          </button>
        </div>

        {/* Platform Selection for Auto-Post */}
        <div className="mt-4">
          <div className="text-gray-400 text-xs uppercase tracking-wider mb-2">Auto-Post Platforms:</div>
          <div className="flex flex-wrap gap-2">
            {platforms.map((p: any) => (
              <button
                key={p.id}
                onClick={() => handleTogglePlatform(p.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  autoPostPlatforms.includes(p.id)
                    ? "bg-orange-600 text-white"
                    : "bg-gray-800 text-gray-500 hover:bg-gray-700"
                }`}
              >
                {p.icon} {p.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: "Total Platforms", value: stats.totalPlatforms, color: "text-blue-400" },
          { label: "Full Posting", value: stats.postingSupported || 0, color: "text-green-400" },
          { label: "Read-Only", value: stats.readOnly || 0, color: "text-yellow-400" },
          { label: "Fallback Used", value: stats.fallbackTriggered, color: "text-orange-400" },
          { label: "Success Rate", value: `${stats.fallbackSuccessRate}%`, color: "text-purple-400" },
        ].map((s, i) => (
          <div key={i} className="bg-gray-900/50 border border-gray-700/50 rounded-xl p-4 text-center">
            <div className={`text-2xl font-black ${s.color}`}>{s.value}</div>
            <div className="text-gray-500 text-xs mt-1 uppercase tracking-wider">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Composio Fallback Platforms */}
      <div>
        <h3 className="text-white font-black text-sm uppercase tracking-widest mb-4">🔄 Composio Fallback (When Composio Fails)</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {compFallbacks.map((p: any) => (
            <div key={p.id} className="bg-gray-900/50 border border-yellow-500/20 rounded-xl p-4 flex items-center gap-4">
              <div className="text-3xl">{p.icon}</div>
              <div className="flex-1">
                <div className="text-white font-bold text-sm">{p.name}</div>
                <div className="text-yellow-400 text-xs">🟡 Fallback Ready</div>
                <div className="text-gray-500 text-xs">{p.usageCount} posts • {p.errorCount} errors</div>
              </div>
              <button
                onClick={() => handleTest(p.id)}
                className="px-3 py-1.5 bg-orange-600 hover:bg-orange-500 text-white rounded-lg text-xs font-bold transition-all"
              >
                Test
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* RapidAPI Exclusive Platforms */}
      <div>
        <h3 className="text-white font-black text-sm uppercase tracking-widest mb-4">✨ Exclusive Platforms (RapidAPI Only)</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {exclusives.map((p: any) => {
            const supportColor = p.postingSupport === "full" ? "text-green-400" : p.postingSupport === "read_only" ? "text-yellow-400" : "text-gray-400";
            const supportLabel = p.postingSupport === "full" ? "✅ Full Posting" : p.postingSupport === "read_only" ? "👁️ Read-Only" : "🔗 Webhook/Hook";
            return (
              <div key={p.id} className="bg-gray-900/50 border border-purple-500/20 rounded-xl p-4">
                <div className="flex items-center gap-4 mb-2">
                  <div className="text-3xl">{p.icon}</div>
                  <div className="flex-1">
                    <div className="text-white font-bold text-sm">{p.name}</div>
                    <div className={`${supportColor} text-xs font-bold`}>{supportLabel}</div>
                    <div className="text-gray-500 text-xs">{p.usageCount} posts • {p.errorCount} errors</div>
                  </div>
                  <button
                    onClick={() => handleTest(p.id)}
                    className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-bold transition-all"
                  >
                    Test
                  </button>
                </div>
                {p.notes && (
                  <div className="text-gray-500 text-[10px] mt-1 border-t border-gray-800 pt-2">{p.notes}</div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Composio Failure Logs */}
      <div className="bg-gray-900/50 border border-gray-700/50 rounded-2xl p-6">
        <h3 className="text-white font-black text-sm uppercase tracking-widest mb-4">📋 Composio Failure Logs</h3>
        {recentFailures.length === 0 ? (
          <div className="text-center py-8 text-gray-500 text-sm">No Composio failures recorded. Fallback not triggered.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-500 text-xs uppercase border-b border-gray-700/50">
                  <th className="text-left py-2 px-3">Time</th>
                  <th className="text-left py-2 px-3">Platform</th>
                  <th className="text-left py-2 px-3">Error</th>
                  <th className="text-left py-2 px-3">Fallback</th>
                </tr>
              </thead>
              <tbody>
                {recentFailures.map((f: any) => (
                  <tr key={f._id} className="border-b border-gray-800/50">
                    <td className="py-2 px-3 text-gray-400 text-xs">{new Date(f.createdAt).toLocaleString()}</td>
                    <td className="py-2 px-3 text-white">{f.platformId}</td>
                    <td className="py-2 px-3 text-red-400 text-xs max-w-[200px] truncate">{f.errorMessage}</td>
                    <td className="py-2 px-3">
                      <span className={`text-xs font-bold ${f.fallbackSuccess ? "text-green-400" : f.fallbackUsed ? "text-yellow-400" : "text-gray-500"}`}>
                        {f.fallbackSuccess ? "✅ Success" : f.fallbackUsed ? "⚠️ Attempted" : "❌ No"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recent RapidAPI Logs */}
      <div className="bg-gray-900/50 border border-gray-700/50 rounded-2xl p-6">
        <h3 className="text-white font-black text-sm uppercase tracking-widest mb-4">📊 Recent RapidAPI Posts</h3>
        {recentLogs.length === 0 ? (
          <div className="text-center py-8 text-gray-500 text-sm">No RapidAPI posts logged yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-500 text-xs uppercase border-b border-gray-700/50">
                  <th className="text-left py-2 px-3">Time</th>
                  <th className="text-left py-2 px-3">Platform</th>
                  <th className="text-left py-2 px-3">Status</th>
                  <th className="text-left py-2 px-3">Fallback</th>
                  <th className="text-left py-2 px-3">Content</th>
                </tr>
              </thead>
              <tbody>
                {recentLogs.map((l: any) => (
                  <tr key={l._id} className="border-b border-gray-800/50">
                    <td className="py-2 px-3 text-gray-400 text-xs">{new Date(l.createdAt).toLocaleString()}</td>
                    <td className="py-2 px-3 text-white">{l.platformId}</td>
                    <td className="py-2 px-3">
                      <span className={`text-xs font-bold ${l.status === "success" ? "text-green-400" : l.status === "rate_limited" ? "text-yellow-400" : "text-red-400"}`}>
                        {l.status === "success" ? "✅" : l.status === "rate_limited" ? "⚠️" : "❌"} {l.status}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-xs text-gray-400">{l.fallbackTriggered ? "Yes" : "No"}</td>
                    <td className="py-2 px-3 text-gray-400 text-xs max-w-[150px] truncate">{l.content}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 px-6 py-3 rounded-2xl text-white font-bold text-sm shadow-2xl z-50 ${toast.type === "success" ? "bg-emerald-600" : "bg-red-600"}`}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}
