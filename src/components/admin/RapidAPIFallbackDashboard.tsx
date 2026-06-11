import { useState } from "react";
import { useQuery, useAction } from "convex/react";
import { api } from '../../../convex/_generated/api';

export function RapidAPIFallbackDashboard({ adminToken }: { adminToken: string }) {
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const data = useQuery(api.rapidapi.getRapidAPIStatus, { adminToken });
  const testConn = useAction(api.rapidapi.testConnection);

  if (!data) {
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

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: "Total Platforms", value: stats.totalPlatforms, color: "text-blue-400" },
          { label: "Composio Fallback", value: stats.composioFallback, color: "text-emerald-400" },
          { label: "RapidAPI Exclusive", value: stats.exclusive, color: "text-purple-400" },
          { label: "Fallback Used", value: stats.fallbackTriggered, color: "text-orange-400" },
          { label: "Success Rate", value: `${stats.fallbackSuccessRate}%`, color: "text-green-400" },
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {exclusives.map((p: any) => (
            <div key={p.id} className="bg-gray-900/50 border border-purple-500/20 rounded-xl p-4 flex items-center gap-4">
              <div className="text-3xl">{p.icon}</div>
              <div className="flex-1">
                <div className="text-white font-bold text-sm">{p.name}</div>
                <div className="text-purple-400 text-xs">🟢 Exclusive to RapidAPI</div>
                <div className="text-gray-500 text-xs">{p.usageCount} posts • {p.errorCount} errors</div>
              </div>
              <button
                onClick={() => handleTest(p.id)}
                className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-bold transition-all"
              >
                Test
              </button>
            </div>
          ))}
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
