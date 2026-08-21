import { useState } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { convexQuery } from "@convex-dev/react-query";
import { useAction, useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { MetricCard } from "./shared";

export function SyntheticIntelPanel() {
  const { data: agents } = useSuspenseQuery(convexQuery(api.synthetic_intelligence.getAgentsWithStatus, {})) as { data: any };
  const { data: backups } = useSuspenseQuery(convexQuery(api.agent_backups.getBackups, {})) as { data: any };
  const { data: perfSummary } = useSuspenseQuery(convexQuery(api.synthetic_intelligence.getPerformanceSummary, {})) as { data: any };
  const { data: recentLogs } = useSuspenseQuery(convexQuery(api.synthetic_intelligence.getPerformanceLogs, { limit: 20 })) as { data: any };

  const toggleAgent = useMutation(api.synthetic_intelligence.toggleSyntheticAgent);
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
      {status && (
        <div className={`p-4 rounded-2xl text-center text-sm font-black ${
          status.type === "success" ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" :
          status.type === "error" ? "bg-red-500/10 text-red-500 border border-red-500/20" :
          "bg-blue-500/10 text-blue-500 border border-blue-500/20"
        }`}>
          {status.message}
        </div>
      )}

      <div className="bg-slate-900 border border-slate-800 rounded-[3.5rem] p-12 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-purple-600/5 blur-[80px]"></div>
        <div className="relative z-10 space-y-8">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-3xl font-black uppercase tracking-tighter text-white">Synthetic Intelligence</h2>
              <p className="text-sm font-black text-purple-500 uppercase tracking-widest mt-1">Agentic AI for 15 Agents • Live NVIDIA NIM Integration</p>
            </div>
            <div className="flex gap-2">
              <button onClick={handleEnableAll} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl">Enable All</button>
              <button onClick={handleDisableAll} className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-xl">Disable All</button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <MetricCard label="Total Agents" value={agents?.length || 0} icon="🤖" color="blue" />
            <MetricCard label="Enabled" value={enabledCount} icon="✅" color="emerald" />
            <MetricCard label="Disabled" value={(agents?.length || 0) - enabledCount} icon="⭕" color="red" />
            <MetricCard label="Backups" value={backups?.length || 0} icon="💾" color="amber" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
            <MetricCard label="Total Requests" value={perfSummary?.totals?.requests || 0} icon="📊" color="blue" />
            <MetricCard label="Success Rate" value={`${perfSummary?.totals?.requests ? Math.round((perfSummary.totals.success / perfSummary.totals.requests) * 100) : 0}%`} icon="✅" color="emerald" />
            <MetricCard label="Avg Latency" value={`${perfSummary?.totals?.avgLatency || 0}ms`} icon="⚡" color="amber" />
            <MetricCard label="Total Tokens" value={(perfSummary?.totals?.tokens || 0).toLocaleString()} icon="🔤" color="purple" />
            <MetricCard label="Errors" value={perfSummary?.totals?.failed || 0} icon="❌" color="red" />
          </div>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-[3.5rem] p-12 shadow-2xl">
        <h3 className="text-xl font-black uppercase tracking-tighter text-white mb-8">Agent Synthetic Controls</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {agents?.map((agent: any) => (
            <div key={agent.id} className={`p-6 rounded-2xl border transition-all ${
              agent.syntheticEnabled ? "bg-emerald-500/5 border-emerald-500/20" : "bg-slate-950 border-white/5"
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
                  className={`w-12 h-6 rounded-full relative transition-all ${agent.syntheticEnabled ? "bg-emerald-600" : "bg-slate-700"}`}
                >
                  <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${agent.syntheticEnabled ? "right-1" : "left-1"}`}></div>
                </button>
              </div>
              <p className="text-[9px] text-slate-500 mb-3">{agent.description}</p>
              <div className="flex flex-wrap gap-1">
                {agent.capabilities?.map((cap: string) => (
                  <span key={cap} className="px-2 py-0.5 bg-slate-800 text-slate-400 text-[8px] rounded">{cap}</span>
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

      <div className="bg-slate-900 border border-slate-800 rounded-[3.5rem] p-12 shadow-2xl">
        <div className="flex justify-between items-center mb-8">
          <h3 className="text-xl font-black uppercase tracking-tighter text-white">Live AI Test</h3>
          <button onClick={() => setShowLivePanel(!showLivePanel)} className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl">
            {showLivePanel ? "Hide" : "Show"} Live Logs
          </button>
        </div>

        <div className="flex gap-4 mb-6">
          <select value={testAgentId} onChange={(e) => setTestAgentId(e.target.value)} className="bg-slate-950 border border-white/10 rounded-xl p-4 text-white text-sm w-48">
            {agents?.map((agent: any) => (
              <option key={agent.id} value={agent.id}>{agent.icon} {agent.name}</option>
            ))}
          </select>
          <input value={testPrompt} onChange={(e) => setTestPrompt(e.target.value)} placeholder="Enter a prompt to test..."
            className="flex-1 bg-slate-950 border border-white/10 rounded-xl p-4 text-white text-sm" onKeyDown={(e) => e.key === "Enter" && handleTestAgent()} />
          <button onClick={handleTestAgent} disabled={testing}
            className="px-6 py-4 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 text-white text-xs font-bold rounded-xl">
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

        {showLivePanel && recentLogs && (
          <div className="mt-8 space-y-2">
            <h4 className="text-sm font-bold text-white mb-4">Recent Activity</h4>
            {recentLogs.length === 0 ? (
              <p className="text-slate-500 text-xs text-center py-4">No activity yet. Test an agent to see logs.</p>
            ) : (
              recentLogs.map((log: any) => (
                <div key={log._id} className="flex items-center justify-between p-4 bg-slate-950 rounded-xl border border-white/5 text-[9px]">
                  <div className="flex items-center gap-3">
                    <span className={log.success ? "text-emerald-500" : "text-red-500"}>{log.success ? "✅" : "❌"}</span>
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

      <div className="bg-slate-900 border border-slate-800 rounded-[3.5rem] p-12 shadow-2xl">
        <h3 className="text-xl font-black uppercase tracking-tighter text-white mb-8">Cloud Backups</h3>

        <div className="flex gap-4 mb-8">
          <input value={backupName} onChange={(e) => setBackupName(e.target.value)} placeholder="Backup name (e.g., Pre-upgrade snapshot)"
            className="flex-1 bg-slate-950 border border-white/10 rounded-xl p-4 text-white text-sm" />
          <button onClick={handleCreateBackup} className="px-6 py-4 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl">💾 Create Backup</button>
        </div>

        <div className="space-y-4">
          {backups?.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-10">No backups yet. Create one to protect your settings.</p>
          ) : (
            backups?.map((backup: any) => (
              <div key={backup.id} className="flex justify-between items-center p-6 bg-slate-950 rounded-2xl border border-white/5">
                <div>
                  <p className="text-sm font-bold text-white">{backup.name}</p>
                  <p className="text-[9px] text-slate-500">{new Date(backup.timestamp).toLocaleString()} • {backup.stats?.totalConfigs || 0} configs</p>
                </div>
                <button onClick={() => handleRestore(backup.id)} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl">↩️ Restore</button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
