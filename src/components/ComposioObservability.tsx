import { useState } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

type AdminPanelProps = {
  adminToken: string;
};

const PERIOD_OPTIONS = [
  { value: "24h", label: "24 Hours" },
  { value: "7d", label: "7 Days" },
  { value: "30d", label: "30 Days" },
];

export function ComposioObservability({ adminToken }: AdminPanelProps) {
  const [period, setPeriod] = useState<"24h" | "7d" | "30d">("24h");
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [activeSection, setActiveSection] = useState<"overview" | "triggers" | "webhooks" | "tools">("overview");
  const [showCustomToolModal, setShowCustomToolModal] = useState(false);
  const [customToolForm, setCustomToolForm] = useState({
    toolName: "",
    toolkit: "github",
    description: "",
    handler: "",
  });

  const showToast = (type: "success" | "error", msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  };

  const stats = useQuery(api.composioEnhanced.getToolCatalogStats, { adminToken });
  const observability = useQuery(api.composioEnhanced.getObservability, { adminToken, period });
  const toolkits = useQuery(api.composioEnhanced.getPopularToolkits, {});
  const triggers = useQuery(api.composioEnhanced.listTriggers, { adminToken });
  const triggerEvents = useQuery(api.composioEnhanced.getTriggerEvents, { adminToken, limit: 20 });
  const webhooks = useQuery(api.composioEnhanced.listWebhooks, { adminToken });
  const customTools = useQuery(api.composioEnhanced.listCustomTools, { adminToken });
  const sessions = useQuery(api.composioEnhanced.listSessions, { adminToken });
  const toolkitDetails = useQuery(api.composioEnhanced.getToolkitDetails, { adminToken });
  const executeTool = useAction(api.composioEnhanced.executeToolByName);

  const toggleTrigger = useMutation(api.composioEnhanced.toggleTrigger);
  const deleteTrigger = useMutation(api.composioEnhanced.deleteTrigger);
  const createTrigger = useMutation(api.composioEnhanced.createTrigger);
  const toggleWebhook = useMutation(api.composioEnhanced.toggleWebhook);
  const createWebhook = useMutation(api.composioEnhanced.createWebhook);
  const createCustomTool = useMutation(api.composioEnhanced.createCustomTool);
  const toggleCustomTool = useMutation(api.composioEnhanced.toggleCustomTool);
  const deleteCustomTool = useMutation(api.composioEnhanced.deleteCustomTool);

  const [selectedToolkit, setSelectedToolkit] = useState<{ toolkit: string; name: string; icon: string; description: string; tools: any[] } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [executingTool, setExecutingTool] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-2xl shadow-2xl font-bold text-sm ${
            toast.type === "success" ? "bg-emerald-500 text-white" : "bg-rose-500 text-white"
          }`}
        >
          {toast.msg}
        </div>
      )}

      <div className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 rounded-3xl p-6">
        <h2 className="text-2xl font-black text-white mb-2">🔌 Composio Hub — Max Capacity</h2>
        <p className="text-sm text-slate-300">
          10,000+ tools across 250+ toolkits • Triggers, Webhooks, Custom Tool Builder • Real-time Observability
        </p>
        {stats && !stats.authError && (
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <span className="px-3 py-1 bg-indigo-500/20 text-indigo-300 rounded-full font-bold">
              {stats.totalToolkits} toolkits
            </span>
            <span className="px-3 py-1 bg-purple-500/20 text-purple-300 rounded-full font-bold">
              {stats.totalTools.toLocaleString()} tools
            </span>
            <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 rounded-full font-bold">
              {stats.totalConnectedAccounts} connections
            </span>
            <span className="px-3 py-1 bg-amber-500/20 text-amber-300 rounded-full font-bold">
              {stats.totalActiveTriggers} active triggers
            </span>
            <span className="px-3 py-1 bg-rose-500/20 text-rose-300 rounded-full font-bold">
              {stats.totalCustomTools} custom tools
            </span>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {[
          { key: "overview" as const, label: "📊 Overview", color: "indigo" },
          { key: "triggers" as const, label: "⚡ Triggers", color: "amber" },
          { key: "webhooks" as const, label: "🔗 Webhooks", color: "blue" },
          { key: "tools" as const, label: "🛠️ Custom Tools", color: "purple" },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveSection(t.key)}
            className={`px-4 py-2 rounded-2xl font-bold text-sm transition ${
              activeSection === t.key
                ? `bg-${t.color}-500 text-white shadow-lg`
                : "bg-slate-800 text-slate-300 hover:bg-slate-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeSection === "overview" && (
        <OverviewSection
          stats={stats}
          observability={observability}
          toolkits={toolkits}
          toolkitDetails={toolkitDetails?.toolkits ?? []}
          period={period}
          setPeriod={setPeriod}
          onToolkitClick={(tk) => setSelectedToolkit(tk)}
        />
      )}
      {activeSection === "triggers" && (
        <TriggersSection
          triggers={triggers?.triggers ?? []}
          events={triggerEvents?.events ?? []}
          toggleTrigger={toggleTrigger}
          deleteTrigger={deleteTrigger}
          createTrigger={createTrigger}
          adminToken={adminToken}
          showToast={showToast}
        />
      )}
      {activeSection === "webhooks" && (
        <WebhooksSection
          webhooks={webhooks?.webhooks ?? []}
          toggleWebhook={toggleWebhook}
          createWebhook={createWebhook}
          adminToken={adminToken}
          showToast={showToast}
        />
      )}
      {activeSection === "tools" && (
        <CustomToolsSection
          customTools={customTools?.tools ?? []}
          sessions={sessions?.sessions ?? []}
          toggleCustomTool={toggleCustomTool}
          deleteCustomTool={deleteCustomTool}
          createCustomTool={createCustomTool}
          adminToken={adminToken}
          showToast={showToast}
          showCustomToolModal={showCustomToolModal}
          setShowCustomToolModal={setShowCustomToolModal}
          customToolForm={customToolForm}
          setCustomToolForm={setCustomToolForm}
        />
      )}

      {selectedToolkit && (
        <ToolkitDetailModal
          toolkit={selectedToolkit}
          onClose={() => { setSelectedToolkit(null); setSearchQuery(""); }}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          executeTool={executeTool}
          executingTool={executingTool}
          setExecutingTool={setExecutingTool}
          adminToken={adminToken}
          showToast={showToast}
        />
      )}
    </div>
  );
}

function OverviewSection({
  stats,
  observability,
  toolkits,
  toolkitDetails,
  period,
  setPeriod,
  onToolkitClick,
}: {
  stats: any;
  observability: any;
  toolkits: any;
  toolkitDetails: any[];
  period: string;
  setPeriod: (p: "24h" | "7d" | "30d") => void;
  onToolkitClick: (tk: { toolkit: string; name: string; icon: string; description: string; tools: any[] }) => void;
}) {
  return (
    <>
      <div className="flex flex-wrap gap-2">
        {PERIOD_OPTIONS.map((o) => (
          <button
            key={o.value}
            onClick={() => setPeriod(o.value as any)}
            className={`px-3 py-1 rounded-xl text-xs font-bold ${
              period === o.value ? "bg-indigo-500 text-white" : "bg-slate-800 text-slate-300"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Invocations" value={observability?.summary?.totalInvocations ?? 0} icon="📊" color="indigo" />
        <StatCard label="Success Rate" value={`${(observability?.summary?.successRate ?? 100).toFixed(1)}%`} icon="✅" color="emerald" />
        <StatCard label="Failed" value={observability?.summary?.failedCount ?? 0} icon="❌" color="rose" />
        <StatCard label="Platforms" value={observability?.summary?.uniquePlatforms ?? 0} icon="🌐" color="blue" />
      </div>

      {observability?.hourlyBuckets && observability.hourlyBuckets.length > 0 && (
        <div className="bg-slate-900/50 border border-slate-700 rounded-3xl p-6">
          <h3 className="text-lg font-bold text-white mb-4">📈 Hourly Activity (24h)</h3>
          <div className="flex items-end gap-1 h-32">
            {observability.hourlyBuckets.map((b: any, i: number) => {
              const max = Math.max(...observability.hourlyBuckets.map((x: any) => x.total), 1);
              const heightPct = (b.total / max) * 100;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1 group">
                  <div
                    className="w-full bg-gradient-to-t from-indigo-500 to-purple-400 rounded-t"
                    style={{ height: `${heightPct}%`, minHeight: "2px" }}
                    title={`${b.hour}: ${b.total} calls`}
                  />
                  <span className="text-[8px] text-slate-500 hidden group-hover:inline">{b.hour}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {observability?.byPlatform && Object.keys(observability.byPlatform).length > 0 && (
        <div className="bg-slate-900/50 border border-slate-700 rounded-3xl p-6">
          <h3 className="text-lg font-bold text-white mb-4">🌐 By Platform</h3>
          <div className="space-y-2">
            {Object.entries(observability.byPlatform)
              .sort(([, a]: any, [, b]: any) => b.total - a.total)
              .slice(0, 10)
              .map(([platform, data]: any) => (
                <div key={platform} className="flex items-center gap-3">
                  <div className="w-32 text-sm text-slate-300 font-bold">{platform}</div>
                  <div className="flex-1 bg-slate-800 rounded-full h-4 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 to-emerald-300"
                      style={{ width: `${(data.success / Math.max(data.total, 1)) * 100}%` }}
                    />
                  </div>
                  <div className="text-xs text-slate-400 font-mono w-24 text-right">
                    {data.success}/{data.total}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {observability?.topTools && observability.topTools.length > 0 && (
        <div className="bg-slate-900/50 border border-slate-700 rounded-3xl p-6">
          <h3 className="text-lg font-bold text-white mb-4">🏆 Top Tools</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {observability.topTools.map((t: any, i: number) => (
              <div key={i} className="flex items-center justify-between bg-slate-800/50 rounded-xl px-3 py-2">
                <span className="text-sm text-slate-200 font-mono truncate">{t.action}</span>
                <span className="text-xs text-indigo-300 font-bold">{t.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {toolkits && toolkits.length > 0 && (
        <div className="bg-slate-900/50 border border-slate-700 rounded-3xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-white">🧰 Toolkit Catalog — Click to explore</h3>
            <span className="text-xs text-slate-400">{toolkits.length} toolkits · 10,000+ tools</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 max-h-96 overflow-y-auto">
            {toolkits.map((t: any) => {
              const detail = toolkitDetails.find((d: any) => d.toolkit === t.toolkit);
              const toolCount = detail?.toolCount ?? t.tools;
              return (
                <button
                  key={t.toolkit}
                  onClick={() => onToolkitClick({
                    toolkit: t.toolkit,
                    name: t.name,
                    icon: t.icon,
                    description: detail?.description ?? `${t.name} integration via Composio`,
                    tools: detail?.tools ?? [],
                  })}
                  className="bg-slate-800/50 hover:bg-indigo-500/20 hover:border-indigo-500/50 border border-slate-700 rounded-xl px-3 py-2 transition text-left"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{t.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-white font-bold truncate">{t.name}</div>
                      <div className="text-[10px] text-slate-400">{toolCount} tools · {t.category}</div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}

function ToolkitDetailModal({
  toolkit,
  onClose,
  searchQuery,
  setSearchQuery,
  executeTool,
  executingTool,
  setExecutingTool,
  adminToken,
  showToast,
}: {
  toolkit: { toolkit: string; name: string; icon: string; description: string; tools: any[] };
  onClose: () => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  executeTool: any;
  executingTool: string | null;
  setExecutingTool: (s: string | null) => void;
  adminToken: string;
  showToast: (t: "success" | "error", m: string) => void;
}) {
  const [paramsJson, setParamsJson] = useState("{}");
  const [selectedTool, setSelectedTool] = useState<any | null>(null);

  const filteredTools = toolkit.tools.filter((t: any) =>
    !searchQuery ||
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleExecute = async () => {
    if (!selectedTool) return;
    let params: any = {};
    try {
      params = JSON.parse(paramsJson);
    } catch {
      showToast("error", "Invalid JSON in parameters");
      return;
    }
    setExecutingTool(selectedTool.name);
    try {
      const result = await executeTool({
        adminToken,
        toolkit: toolkit.toolkit,
        toolName: selectedTool.name,
        params,
      });
      if (result?.success) {
        showToast("success", `✓ ${selectedTool.name} executed (${result.durationMs}ms)`);
      } else {
        showToast("error", `✗ ${result?.error ?? "Tool execution failed"}`);
      }
    } catch (e: any) {
      showToast("error", e?.message ?? "Execution failed");
    } finally {
      setExecutingTool(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-indigo-500/30 rounded-3xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-slate-700 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black text-white flex items-center gap-2">
              <span className="text-3xl">{toolkit.icon}</span>
              {toolkit.name}
            </h2>
            <p className="text-sm text-slate-400 mt-1">{toolkit.description}</p>
            <p className="text-xs text-indigo-300 mt-1">{toolkit.tools.length} tools available</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-2xl font-bold w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-800"
          >
            ×
          </button>
        </div>

        <div className="p-4 border-b border-slate-700">
          <input
            type="text"
            placeholder="Search tools by name or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-800 text-white rounded-xl px-4 py-2 text-sm border border-slate-700 focus:border-indigo-500 outline-none"
          />
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {filteredTools.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <div className="text-4xl mb-2">🔍</div>
              <div>No tools match "{searchQuery}"</div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {filteredTools.map((tool: any) => (
                <div
                  key={tool.name}
                  className={`bg-slate-800/50 border rounded-xl p-3 transition ${
                    selectedTool?.name === tool.name ? "border-indigo-500 bg-indigo-500/10" : "border-slate-700"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-mono font-bold text-white">{tool.name}</span>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase ${
                          tool.category === "write" ? "bg-amber-500/20 text-amber-300" :
                          tool.category === "read" ? "bg-blue-500/20 text-blue-300" :
                          tool.category === "execute" ? "bg-rose-500/20 text-rose-300" :
                          "bg-emerald-500/20 text-emerald-300"
                        }`}>{tool.category}</span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">{tool.description}</p>
                      {tool.parameters && tool.parameters.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {tool.parameters.slice(0, 4).map((p: any) => (
                            <span key={p.name} className="text-[9px] px-1.5 py-0.5 bg-slate-700/50 text-slate-300 rounded font-mono">
                              {p.name}{p.required ? "*" : ""}
                            </span>
                          ))}
                          {tool.parameters.length > 4 && (
                            <span className="text-[9px] px-1.5 py-0.5 bg-slate-700/50 text-slate-400 rounded">
                              +{tool.parameters.length - 4} more
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => setSelectedTool(selectedTool?.name === tool.name ? null : tool)}
                      className="px-3 py-1.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg text-xs font-bold whitespace-nowrap"
                    >
                      {selectedTool?.name === tool.name ? "Close" : "Use"}
                    </button>
                  </div>

                  {selectedTool?.name === tool.name && (
                    <div className="mt-3 pt-3 border-t border-slate-700 space-y-2">
                      <div className="text-[10px] font-bold text-slate-400 uppercase">Parameters (JSON)</div>
                      <textarea
                        value={paramsJson}
                        onChange={(e) => setParamsJson(e.target.value)}
                        rows={4}
                        className="w-full bg-slate-900 text-emerald-300 rounded-lg px-3 py-2 text-xs font-mono border border-slate-700 outline-none focus:border-indigo-500"
                        placeholder='{"key": "value"}'
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={handleExecute}
                          disabled={executingTool === tool.name}
                          className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white rounded-lg text-xs font-bold"
                        >
                          {executingTool === tool.name ? "Running..." : "▶ Execute"}
                        </button>
                        <button
                          onClick={() => { setParamsJson("{}"); setSelectedTool(null); }}
                          className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-xs font-bold"
                        >
                          Reset
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TriggersSection({
  triggers,
  events,
  toggleTrigger,
  deleteTrigger,
  createTrigger,
  adminToken,
  showToast,
}: {
  triggers: any[];
  events: any[];
  toggleTrigger: any;
  deleteTrigger: any;
  createTrigger: any;
  adminToken: string;
  showToast: (t: "success" | "error", m: string) => void;
}) {
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    triggerId: "",
    toolkit: "github",
    triggerName: "",
    description: "",
    agentId: "default",
  });

  const handleCreate = async () => {
    if (!form.triggerId || !form.triggerName) {
      showToast("error", "Trigger ID and Name are required");
      return;
    }
    try {
      await createTrigger({ adminToken, ...form });
      showToast("success", `Trigger "${form.triggerName}" created`);
      setShowCreate(false);
      setForm({ triggerId: "", toolkit: "github", triggerName: "", description: "", agentId: "default" });
    } catch (e: any) {
      showToast("error", e?.message ?? "Failed to create trigger");
    }
  };

  return (
    <>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-white">⚡ Active Triggers ({triggers.length})</h3>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-2xl font-bold text-sm"
        >
          {showCreate ? "Cancel" : "+ New Trigger"}
        </button>
      </div>

      {showCreate && (
        <div className="bg-slate-900/50 border border-amber-500/20 rounded-3xl p-6 space-y-3">
          <input
            placeholder="Trigger ID (e.g., github_star_event)"
            value={form.triggerId}
            onChange={(e) => setForm({ ...form, triggerId: e.target.value })}
            className="w-full bg-slate-800 text-white rounded-xl px-3 py-2 text-sm"
          />
          <input
            placeholder="Trigger Name (e.g., Watch for new stars)"
            value={form.triggerName}
            onChange={(e) => setForm({ ...form, triggerName: e.target.value })}
            className="w-full bg-slate-800 text-white rounded-xl px-3 py-2 text-sm"
          />
          <select
            value={form.toolkit}
            onChange={(e) => setForm({ ...form, toolkit: e.target.value })}
            className="w-full bg-slate-800 text-white rounded-xl px-3 py-2 text-sm"
          >
            <option value="github">GitHub</option>
            <option value="slack">Slack</option>
            <option value="gmail">Gmail</option>
            <option value="stripe">Stripe</option>
            <option value="hubspot">HubSpot</option>
          </select>
          <textarea
            placeholder="Description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="w-full bg-slate-800 text-white rounded-xl px-3 py-2 text-sm"
            rows={2}
          />
          <input
            placeholder="Agent ID (default = system)"
            value={form.agentId}
            onChange={(e) => setForm({ ...form, agentId: e.target.value })}
            className="w-full bg-slate-800 text-white rounded-xl px-3 py-2 text-sm"
          />
          <button
            onClick={handleCreate}
            className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-2 rounded-xl"
          >
            Create Trigger
          </button>
        </div>
      )}

      {triggers.length === 0 ? (
        <div className="bg-slate-900/30 border border-slate-700 rounded-3xl p-8 text-center text-slate-400">
          No triggers configured yet. Create one above.
        </div>
      ) : (
        <div className="bg-slate-900/50 border border-slate-700 rounded-3xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-800/50">
              <tr>
                <th className="text-left p-3 text-slate-300">Trigger</th>
                <th className="text-left p-3 text-slate-300">Toolkit</th>
                <th className="text-left p-3 text-slate-300">Agent</th>
                <th className="text-right p-3 text-slate-300">Fired</th>
                <th className="text-center p-3 text-slate-300">Enabled</th>
                <th className="text-right p-3 text-slate-300">Actions</th>
              </tr>
            </thead>
            <tbody>
              {triggers.map((t) => (
                <tr key={t._id} className="border-t border-slate-800">
                  <td className="p-3 text-white font-bold">{t.triggerName}</td>
                  <td className="p-3 text-slate-300">{t.toolkit}</td>
                  <td className="p-3 text-slate-400 text-xs">{t.agentId}</td>
                  <td className="p-3 text-right text-amber-300 font-mono">{t.fireCount}</td>
                  <td className="p-3 text-center">
                    <button
                      onClick={() => toggleTrigger({ adminToken, triggerDocId: t._id, enabled: !t.enabled })}
                      className={`px-2 py-1 rounded text-xs font-bold ${
                        t.enabled ? "bg-emerald-500 text-white" : "bg-slate-700 text-slate-400"
                      }`}
                    >
                      {t.enabled ? "ON" : "OFF"}
                    </button>
                  </td>
                  <td className="p-3 text-right">
                    <button
                      onClick={() => deleteTrigger({ adminToken, triggerDocId: t._id })}
                      className="text-rose-400 hover:text-rose-300 text-xs"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {events.length > 0 && (
        <div className="bg-slate-900/50 border border-slate-700 rounded-3xl p-6">
          <h3 className="text-lg font-bold text-white mb-4">📜 Recent Trigger Events</h3>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {events.map((e: any) => (
              <div key={e._id} className="bg-slate-800/30 rounded-xl p-3 text-xs">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 rounded font-bold">
                    {e.eventType}
                  </span>
                  <span className="text-slate-400">{e.toolkit}</span>
                  <span className="text-slate-500 ml-auto">{new Date(e.receivedAt).toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

function WebhooksSection({
  webhooks,
  toggleWebhook,
  createWebhook,
  adminToken,
  showToast,
}: {
  webhooks: any[];
  toggleWebhook: any;
  createWebhook: any;
  adminToken: string;
  showToast: (t: "success" | "error", m: string) => void;
}) {
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ url: "", events: "*", secret: "" });

  const handleCreate = async () => {
    if (!form.url) {
      showToast("error", "URL is required");
      return;
    }
    try {
      const events = form.events === "*" ? ["*"] : form.events.split(",").map((e) => e.trim());
      const secret = form.secret || `whksec_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
      await createWebhook({ adminToken, url: form.url, events, secret });
      showToast("success", "Webhook created");
      setShowCreate(false);
      setForm({ url: "", events: "*", secret: "" });
    } catch (e: any) {
      showToast("error", e?.message ?? "Failed to create webhook");
    }
  };

  return (
    <>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-white">🔗 Webhook Endpoints ({webhooks.length})</h3>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-2xl font-bold text-sm"
        >
          {showCreate ? "Cancel" : "+ New Webhook"}
        </button>
      </div>

      {showCreate && (
        <div className="bg-slate-900/50 border border-blue-500/20 rounded-3xl p-6 space-y-3">
          <input
            placeholder="https://yourdomain.com/webhook"
            value={form.url}
            onChange={(e) => setForm({ ...form, url: e.target.value })}
            className="w-full bg-slate-800 text-white rounded-xl px-3 py-2 text-sm"
          />
          <input
            placeholder="Events (comma-separated, or *)"
            value={form.events}
            onChange={(e) => setForm({ ...form, events: e.target.value })}
            className="w-full bg-slate-800 text-white rounded-xl px-3 py-2 text-sm"
          />
          <input
            placeholder="Secret (auto-generated if blank)"
            value={form.secret}
            onChange={(e) => setForm({ ...form, secret: e.target.value })}
            className="w-full bg-slate-800 text-white rounded-xl px-3 py-2 text-sm"
          />
          <button
            onClick={handleCreate}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 rounded-xl"
          >
            Create Webhook
          </button>
        </div>
      )}

      {webhooks.length === 0 ? (
        <div className="bg-slate-900/30 border border-slate-700 rounded-3xl p-8 text-center text-slate-400">
          No webhooks configured.
        </div>
      ) : (
        <div className="space-y-2">
          {webhooks.map((w) => (
            <div key={w._id} className="bg-slate-900/50 border border-slate-700 rounded-2xl p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-white font-mono truncate">{w.url}</div>
                  <div className="text-xs text-slate-400 mt-1">
                    Events: {w.events.join(", ")} • Delivered: {w.deliveryCount} • Failed: {w.failureCount}
                  </div>
                </div>
                <button
                  onClick={() => toggleWebhook({ adminToken, webhookDocId: w._id, enabled: !w.enabled })}
                  className={`px-3 py-1 rounded text-xs font-bold ml-2 ${
                    w.enabled ? "bg-emerald-500 text-white" : "bg-slate-700 text-slate-400"
                  }`}
                >
                  {w.enabled ? "ON" : "OFF"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function CustomToolsSection({
  customTools,
  sessions,
  toggleCustomTool,
  deleteCustomTool,
  createCustomTool,
  adminToken,
  showToast,
  showCustomToolModal,
  setShowCustomToolModal,
  customToolForm,
  setCustomToolForm,
}: {
  customTools: any[];
  sessions: any[];
  toggleCustomTool: any;
  deleteCustomTool: any;
  createCustomTool: any;
  adminToken: string;
  showToast: (t: "success" | "error", m: string) => void;
  showCustomToolModal: boolean;
  setShowCustomToolModal: (b: boolean) => void;
  customToolForm: any;
  setCustomToolForm: (f: any) => void;
}) {
  const handleCreate = async () => {
    if (!customToolForm.toolName || !customToolForm.handler) {
      showToast("error", "Tool name and handler are required");
      return;
    }
    try {
      await createCustomTool({
        adminToken,
        toolName: customToolForm.toolName,
        toolkit: customToolForm.toolkit,
        description: customToolForm.description,
        inputSchema: { type: "object", properties: {} },
        handler: customToolForm.handler,
      });
      showToast("success", `Custom tool "${customToolForm.toolName}" created`);
      setShowCustomToolModal(false);
      setCustomToolForm({ toolName: "", toolkit: "github", description: "", handler: "" });
    } catch (e: any) {
      showToast("error", e?.message ?? "Failed to create tool");
    }
  };

  return (
    <>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-white">🛠️ Custom Tools ({customTools.length})</h3>
        <button
          onClick={() => setShowCustomToolModal(!showCustomToolModal)}
          className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-2xl font-bold text-sm"
        >
          {showCustomToolModal ? "Cancel" : "+ New Custom Tool"}
        </button>
      </div>

      {showCustomToolModal && (
        <div className="bg-slate-900/50 border border-purple-500/20 rounded-3xl p-6 space-y-3">
          <input
            placeholder="Tool Name (e.g., dutchkem_wallet_balance)"
            value={customToolForm.toolName}
            onChange={(e) => setCustomToolForm({ ...customToolForm, toolName: e.target.value })}
            className="w-full bg-slate-800 text-white rounded-xl px-3 py-2 text-sm"
          />
          <select
            value={customToolForm.toolkit}
            onChange={(e) => setCustomToolForm({ ...customToolForm, toolkit: e.target.value })}
            className="w-full bg-slate-800 text-white rounded-xl px-3 py-2 text-sm"
          >
            <option value="github">GitHub</option>
            <option value="slack">Slack</option>
            <option value="custom">Custom</option>
          </select>
          <textarea
            placeholder="Description"
            value={customToolForm.description}
            onChange={(e) => setCustomToolForm({ ...customToolForm, description: e.target.value })}
            className="w-full bg-slate-800 text-white rounded-xl px-3 py-2 text-sm"
            rows={2}
          />
          <input
            placeholder="Handler function (e.g., internal.wallet.getBalance)"
            value={customToolForm.handler}
            onChange={(e) => setCustomToolForm({ ...customToolForm, handler: e.target.value })}
            className="w-full bg-slate-800 text-white rounded-xl px-3 py-2 text-sm"
          />
          <button
            onClick={handleCreate}
            className="w-full bg-purple-500 hover:bg-purple-600 text-white font-bold py-2 rounded-xl"
          >
            Create Custom Tool
          </button>
        </div>
      )}

      {customTools.length === 0 ? (
        <div className="bg-slate-900/30 border border-slate-700 rounded-3xl p-8 text-center text-slate-400">
          No custom tools yet. Build one to extend Composio's reach.
        </div>
      ) : (
        <div className="space-y-2">
          {customTools.map((t) => (
            <div key={t._id} className="bg-slate-900/50 border border-slate-700 rounded-2xl p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="text-sm text-white font-bold">{t.toolName}</div>
                  <div className="text-xs text-slate-400 mt-1">
                    {t.toolkit} • {t.usageCount} uses
                  </div>
                </div>
                <button
                  onClick={() => toggleCustomTool({ adminToken, toolDocId: t._id, enabled: !t.enabled })}
                  className={`px-3 py-1 rounded text-xs font-bold ${
                    t.enabled ? "bg-emerald-500 text-white" : "bg-slate-700 text-slate-400"
                  }`}
                >
                  {t.enabled ? "ON" : "OFF"}
                </button>
                <button
                  onClick={() => deleteCustomTool({ adminToken, toolDocId: t._id })}
                  className="text-rose-400 hover:text-rose-300 text-xs ml-2"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {sessions.length > 0 && (
        <div className="bg-slate-900/50 border border-slate-700 rounded-3xl p-6">
          <h3 className="text-lg font-bold text-white mb-4">🧭 Tool Router Sessions</h3>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {sessions.map((s: any) => (
              <div key={s._id} className="bg-slate-800/30 rounded-xl p-3 text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-white font-mono">{s.sessionId.slice(0, 20)}...</span>
                  <span className="text-slate-400">{s.toolkits.length} toolkits</span>
                  <span className="text-slate-500 ml-auto">{s.toolCallCount} calls</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

function StatCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: string | number;
  icon: string;
  color: "indigo" | "emerald" | "rose" | "blue" | "amber" | "purple";
}) {
  return (
    <div className={`bg-gradient-to-br from-${color}-500/10 to-${color}-600/5 border border-${color}-500/20 rounded-2xl p-4`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-slate-400 uppercase font-bold">{label}</span>
        <span className="text-xl">{icon}</span>
      </div>
      <div className={`text-2xl font-black text-${color}-300`}>{value}</div>
    </div>
  );
}
