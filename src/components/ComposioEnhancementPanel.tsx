import { useState } from "react";
import { useMutation } from "convex/react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { convexQuery } from "@convex-dev/react-query";
import { api } from "../../convex/_generated/api";

type AdminPanelProps = {
  adminToken: string;
};

export function ComposioEnhancementPanel({ adminToken }: AdminPanelProps) {
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [confirmAction, setConfirmAction] = useState<"enableAll" | "disableAll" | "autoConfigure" | null>(null);

  const showToast = (type: "success" | "error", msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  };

  const { data: agentSettings } = useSuspenseQuery(convexQuery(api.composioEnhancement.getAllAgentSettings, { adminToken }));
  const { data: logs } = useSuspenseQuery(convexQuery(api.composioEnhancement.getEnhancementLogs, { adminToken, limit: 30 }));

  const toggleAgent = useMutation(api.composioEnhancement.toggleAgent);
  const enableAll = useMutation(api.composioEnhancement.enableAllAgents);
  const disableAll = useMutation(api.composioEnhancement.disableAllAgents);
  const autoConfigure = useMutation(api.composioEnhancement.autoConfigureAgents);

  const handleToggle = async (agentId: string, currentEnabled: boolean) => {
    try {
      const res = await toggleAgent({ adminToken, agentId, enabled: !currentEnabled });
      if (res?.authError) { showToast("error", "Auth failed"); return; }
      if (res?.success) {
        showToast("success", `${agentId} ${!currentEnabled ? "enabled" : "disabled"}`);
      }
    } catch (e: any) {
      showToast("error", e?.message ?? "Failed");
    }
  };

  const handleBulk = async (action: "enableAll" | "disableAll" | "autoConfigure") => {
    try {
      let res: any;
      if (action === "enableAll") res = await enableAll({ adminToken });
      else if (action === "disableAll") res = await disableAll({ adminToken });
      else res = await autoConfigure({ adminToken });
      if (res?.authError) { showToast("error", "Auth failed"); return; }
      if (res?.success) {
        const count = res.enabled ?? res.disabled ?? res.configured ?? 0;
        showToast("success", `${action === "enableAll" ? "Enabled" : action === "disableAll" ? "Disabled" : "Auto-configured"} ${count} agents`);
      }
    } catch (e: any) {
      showToast("error", e?.message ?? "Failed");
    }
    setConfirmAction(null);
  };

  const agents = agentSettings?.agents ?? [];
  const enabledCount = agentSettings?.enabledCount ?? 0;
  const disabledCount = agentSettings?.disabledCount ?? 0;
  const totalCount = agentSettings?.totalAgents ?? 15;

  return (
    <div className="space-y-6">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-2xl shadow-2xl font-bold text-sm ${
          toast.type === "success" ? "bg-emerald-500 text-white" : "bg-rose-500 text-white"
        }`}>
          {toast.msg}
        </div>
      )}

      {confirmAction && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-amber-500/30 rounded-3xl p-6 max-w-md w-full">
            <h3 className="text-lg font-black text-white mb-2">
              {confirmAction === "enableAll" ? "🟢 Enable All Agents?" :
               confirmAction === "disableAll" ? "🔴 Disable All Agents?" :
               "⚡ Auto-Configure Agents?"}
            </h3>
            <p className="text-sm text-slate-400 mb-4">
              {confirmAction === "enableAll" && "This will enable Composio enhancements for ALL 15 agents. Each agent receives its unique toolkit. Existing enabled agents remain unchanged."}
              {confirmAction === "disableAll" && "This will disable Composio enhancements for ALL 15 agents. Agents will return to standard behavior. This does NOT delete settings."}
              {confirmAction === "autoConfigure" && "This will intelligently enable only the currently disabled agents. Already-enabled agents remain unchanged."}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => handleBulk(confirmAction)}
                className={`flex-1 py-2 rounded-xl font-bold text-sm ${
                  confirmAction === "enableAll" ? "bg-emerald-500 hover:bg-emerald-600 text-white" :
                  confirmAction === "disableAll" ? "bg-rose-500 hover:bg-rose-600 text-white" :
                  "bg-blue-500 hover:bg-blue-600 text-white"
                }`}
              >
                Confirm
              </button>
              <button
                onClick={() => setConfirmAction(null)}
                className="flex-1 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-bold text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/20 rounded-3xl p-6">
        <h2 className="text-2xl font-black text-white mb-2">🔧 Composio Enhancement Toggle</h2>
        <p className="text-sm text-slate-300">
          Enable unique Composio tools for each of the 15 AI agents • Individual toggles • Bulk operations • Auto-configure
        </p>
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 rounded-full font-bold">
            {enabledCount} enabled
          </span>
          <span className="px-3 py-1 bg-rose-500/20 text-rose-300 rounded-full font-bold">
            {disabledCount} disabled
          </span>
          <span className="px-3 py-1 bg-blue-500/20 text-blue-300 rounded-full font-bold">
            {totalCount} total agents
          </span>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setConfirmAction("enableAll")}
          className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-bold text-sm"
        >
          🟢 Enable All Agents
        </button>
        <button
          onClick={() => setConfirmAction("disableAll")}
          className="px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-2xl font-bold text-sm"
        >
          🔴 Disable All Agents
        </button>
        <button
          onClick={() => setConfirmAction("autoConfigure")}
          className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-2xl font-bold text-sm"
        >
          ⚡ Auto-Configure
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {agents.map((agent: any) => (
          <div
            key={agent.agentId}
            className={`bg-slate-900/50 border rounded-3xl p-4 transition ${
              agent.enabled
                ? "border-emerald-500/30 bg-emerald-500/5"
                : "border-slate-700"
            }`}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{agent.agentIcon}</span>
                <div>
                  <div className="text-sm font-black text-white">{agent.agentId} {agent.agentName}</div>
                  <div className="text-[10px] text-slate-400">{agent.description}</div>
                </div>
              </div>
              <div className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                agent.enabled ? "bg-emerald-500/20 text-emerald-300" : "bg-slate-700 text-slate-400"
              }`}>
                {agent.enabled ? "ACTIVE" : "OFF"}
              </div>
            </div>

            <div className="mb-3">
              <div className="text-[10px] text-slate-400 font-bold mb-1">Assigned Toolkits</div>
              <div className="flex flex-wrap gap-1">
                {(agent.enabled ? agent.tools : agent.defaultToolkits).map((tk: string, i: number) => (
                  <span key={i} className={`px-1.5 py-0.5 rounded text-[9px] font-mono ${
                    agent.enabled ? "bg-emerald-500/20 text-emerald-300" : "bg-slate-700/50 text-slate-500"
                  }`}>
                    {tk}
                  </span>
                ))}
              </div>
              <div className="text-[9px] text-slate-500 mt-1">
                {agent.enabled ? agent.toolCount : agent.defaultToolCount} tools available
              </div>
            </div>

            {agent.enabled && agent.enabledBy && (
              <div className="text-[9px] text-slate-500 mb-2">
                Enabled by {agent.enabledBy} {agent.enabledAt ? `on ${new Date(agent.enabledAt).toLocaleDateString()}` : ""}
              </div>
            )}

            <button
              onClick={() => handleToggle(agent.agentId, agent.enabled)}
              className={`w-full py-2 rounded-xl font-bold text-xs transition ${
                agent.enabled
                  ? "bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30"
                  : "bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30"
              }`}
            >
              {agent.enabled ? "🔴 Disable" : "🟢 Enable"}
            </button>
          </div>
        ))}
      </div>

      {logs && logs.logs && logs.logs.length > 0 && (
        <div className="bg-slate-900/50 border border-slate-700 rounded-3xl p-6">
          <h3 className="text-lg font-bold text-white mb-4">📋 Enhancement Audit Log</h3>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {logs.logs.map((log: any) => (
              <div key={log._id} className="flex items-center gap-3 bg-slate-800/50 rounded-xl px-3 py-2">
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  log.newState ? "bg-emerald-500 text-white" : "bg-rose-500 text-white"
                }`}>
                  {log.newState ? "✓" : "✕"}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-white font-bold">
                    {log.action === "enable-all" ? "🟢 Bulk Enable" :
                     log.action === "disable-all" ? "🔴 Bulk Disable" :
                     log.action === "auto-configure" ? "⚡ Auto-Configure" :
                     log.newState ? "🟢 Enabled" : "🔴 Disabled"}{" "}
                    <span className="text-slate-300">{log.agentId} {log.agentName}</span>
                  </div>
                  <div className="text-[9px] text-slate-500">
                    {log.bulkOperation ? "bulk" : "individual"} • by {log.adminId} • {new Date(log.timestamp).toLocaleString()}
                  </div>
                </div>
                <div className="text-[9px] text-slate-400 font-mono">
                  {log.toolCount} tools
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
