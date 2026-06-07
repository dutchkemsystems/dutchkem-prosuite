import { useState } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

type AdminPanelProps = { adminToken: string };

export function EnterpriseHub({ adminToken }: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<"marketplace" | "knowledge" | "companion" | "payments" | "orchestration" | "emotional">("marketplace");
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const showToast = (type: "success" | "error", msg: string) => { setToast({ type, msg }); setTimeout(() => setToast(null), 4000); };

  return (
    <div className="space-y-6">
      {toast && <div className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-2xl shadow-2xl font-bold text-sm ${toast.type === "success" ? "bg-emerald-500 text-white" : "bg-red-500 text-white"}`}>{toast.msg}</div>}

      {/* Header */}
      <div className="bg-gradient-to-br from-violet-600/20 to-slate-900 border border-violet-500/20 rounded-[3rem] p-10">
        <h2 className="text-2xl font-black uppercase tracking-tighter text-white">Enterprise Hub</h2>
        <p className="text-xs font-black text-violet-500 uppercase tracking-widest mt-1">Agent Marketplace • Knowledge Graph • Companion AI • Agentic Payments • Orchestration • Emotional AI</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {(["marketplace", "knowledge", "companion", "payments", "orchestration", "emotional"] as const).map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab ? "bg-violet-500 text-white" : "bg-slate-800 text-slate-400 hover:bg-slate-700"}`}>
              {tab === "marketplace" ? "🏪 Marketplace" : tab === "knowledge" ? "🧠 Knowledge" : tab === "companion" ? "🤖 Companion" : tab === "payments" ? "💳 Payments" : tab === "orchestration" ? "⚡ Orchestration" : "💜 Emotional"}
            </button>
          ))}
        </div>
      </div>

      {activeTab === "marketplace" && <MarketplaceTab adminToken={adminToken} showToast={showToast} />}
      {activeTab === "knowledge" && <KnowledgeTab adminToken={adminToken} showToast={showToast} />}
      {activeTab === "companion" && <CompanionTab adminToken={adminToken} showToast={showToast} />}
      {activeTab === "payments" && <PaymentsTab adminToken={adminToken} showToast={showToast} />}
      {activeTab === "orchestration" && <OrchestrationTab adminToken={adminToken} showToast={showToast} />}
      {activeTab === "emotional" && <EmotionalTab adminToken={adminToken} showToast={showToast} />}
    </div>
  );
}

function MarketplaceTab({ adminToken, showToast }: any) {
  const templates = useQuery(api.agent_marketplace.listTemplates, {}) as any;
  const stats = useQuery(api.agent_marketplace.getMarketplaceStats, {}) as any;
  const createTemplate = useMutation(api.agent_marketplace.createTemplate);
  const installTemplate = useMutation(api.agent_marketplace.installTemplate);
  const bulkInstall = useMutation(api.agent_marketplace.bulkInstall);

  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", category: "productivity", priceNgn: "0", isFree: true, tags: "" });

  const handleCreate = async () => {
    try {
      const res = await createTemplate({ adminToken, name: form.name, description: form.description, category: form.category, priceNgn: parseInt(form.priceNgn) || 0, isFree: form.isFree, config: {}, tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean) });
      if (res?.authError) { showToast("error", "Auth failed"); return; }
      showToast("success", "Template created"); setShowCreate(false); setForm({ name: "", description: "", category: "productivity", priceNgn: "0", isFree: true, tags: "" });
    } catch (e: any) { showToast("error", e?.message ?? "Failed"); }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MC label="Templates" value={stats?.totalTemplates ?? 0} icon="📦" color="violet" />
        <MC label="Published" value={stats?.publishedTemplates ?? 0} icon="✅" color="emerald" />
        <MC label="Installations" value={stats?.totalInstalls ?? 0} icon="📥" color="blue" />
        <MC label="Active" value={stats?.activeInstalls ?? 0} icon="🟢" color="emerald" />
      </div>

      <div className="flex justify-between items-center">
        <h3 className="text-lg font-black text-white uppercase">Templates</h3>
        <button onClick={() => setShowCreate(!showCreate)} className="px-4 py-2 bg-violet-500 hover:bg-violet-400 text-white rounded-xl text-[10px] font-black uppercase">{showCreate ? "Cancel" : "+ New Template"}</button>
      </div>

      {showCreate && (
        <div className="bg-slate-900 border border-violet-500/20 rounded-3xl p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Template Name" className="bg-slate-800 text-white rounded-xl px-4 py-3 text-sm" />
            <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Description" className="bg-slate-800 text-white rounded-xl px-4 py-3 text-sm" />
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="bg-slate-800 text-white rounded-xl px-4 py-3 text-sm">
              <option value="productivity">Productivity</option><option value="marketing">Marketing</option><option value="finance">Finance</option><option value="support">Support</option><option value="analytics">Analytics</option>
            </select>
            <input value={form.priceNgn} onChange={(e) => setForm({ ...form, priceNgn: e.target.value })} placeholder="Price (₦)" type="number" className="bg-slate-800 text-white rounded-xl px-4 py-3 text-sm" />
            <input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="Tags (comma-separated)" className="bg-slate-800 text-white rounded-xl px-4 py-3 text-sm" />
            <label className="flex items-center gap-2 text-white text-sm"><input type="checkbox" checked={form.isFree} onChange={(e) => setForm({ ...form, isFree: e.target.checked })} /> Free Template</label>
          </div>
          <button onClick={handleCreate} className="px-6 py-3 bg-violet-500 text-white rounded-xl font-black text-sm">Create Template</button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {(templates ?? []).map((tpl: any) => (
          <div key={tpl._id} className="bg-slate-900 border border-white/5 rounded-3xl p-6 space-y-3">
            <div className="flex justify-between items-start">
              <div>
                <h4 className="text-sm font-black text-white">{tpl.name}</h4>
                <p className="text-[10px] text-slate-500">{tpl.category} • v{tpl.version} • by {tpl.author}</p>
              </div>
              <span className="px-2 py-1 bg-violet-500/10 text-violet-500 rounded-full text-[8px] font-black">{tpl.isFree ? "FREE" : `₦${tpl.priceNgn.toLocaleString()}`}</span>
            </div>
            <p className="text-xs text-slate-400">{tpl.description}</p>
            <div className="flex justify-between items-center">
              <div className="flex gap-2">
                <span className="text-[10px] text-slate-500">⭐ {tpl.rating}</span>
                <span className="text-[10px] text-slate-500">📥 {tpl.installCount}</span>
              </div>
              <button onClick={() => { installTemplate({ adminToken, templateId: tpl.templateId, agentId: `agent-${Date.now()}` }); showToast("success", "Installed!"); }} className="px-3 py-1 bg-violet-500/20 text-violet-500 rounded-lg text-[8px] font-black">Install</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function KnowledgeTab({ adminToken, showToast }: any) {
  const nodes = useQuery(api.knowledge_graph.getAllNodes, {}) as any;
  const stats = useQuery(api.knowledge_graph.getKnowledgeGraphStats, {}) as any;
  const createNode = useMutation(api.knowledge_graph.createNode);
  const createEdge = useMutation(api.knowledge_graph.createEdge);
  const queryGraph = useMutation(api.knowledge_graph.queryGraph);
  const [queryText, setQueryText] = useState("");
  const [queryResult, setQueryResult] = useState<any>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [nodeForm, setNodeForm] = useState({ nodeType: "concept", label: "", description: "" });

  const handleQuery = async () => {
    const result = await queryGraph({ adminToken, queryText });
    if (result?.nodes) setQueryResult(result);
    else showToast("error", "Query failed");
  };

  const handleCreateNode = async () => {
    await createNode({ adminToken, nodeType: nodeForm.nodeType, label: nodeForm.label, description: nodeForm.description, metadata: {} });
    showToast("success", "Node created"); setShowCreate(false); setNodeForm({ nodeType: "concept", label: "", description: "" });
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <MC label="Nodes" value={stats?.totalNodes ?? 0} icon="🔵" color="violet" />
        <MC label="Edges" value={stats?.totalEdges ?? 0} icon="🔗" color="blue" />
        <MC label="Node Types" value={Object.keys(stats?.nodeTypes ?? {}).length} icon="📊" color="emerald" />
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
        <h3 className="text-sm font-black text-white uppercase mb-3">Query Knowledge Graph</h3>
        <div className="flex gap-3">
          <input value={queryText} onChange={(e) => setQueryText(e.target.value)} placeholder="Search query..." className="flex-1 bg-slate-800 text-white rounded-xl px-4 py-3 text-sm" />
          <button onClick={handleQuery} className="px-6 py-3 bg-violet-500 text-white rounded-xl font-black text-sm">Query</button>
        </div>
        {queryResult && (
          <div className="mt-4 p-4 bg-slate-800 rounded-2xl">
            <p className="text-xs text-slate-400 mb-2">{queryResult.nodeCount} nodes, {queryResult.edgeCount} edges, {queryResult.executionMs}ms</p>
            <div className="flex flex-wrap gap-2">
              {queryResult.nodes?.slice(0, 10).map((n: any) => <span key={n._id} className="px-2 py-1 bg-violet-500/10 text-violet-500 rounded-lg text-[10px]">{n.label}</span>)}
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-between items-center">
        <h3 className="text-lg font-black text-white uppercase">Nodes</h3>
        <button onClick={() => setShowCreate(!showCreate)} className="px-4 py-2 bg-violet-500 text-white rounded-xl text-[10px] font-black uppercase">{showCreate ? "Cancel" : "+ Node"}</button>
      </div>

      {showCreate && (
        <div className="bg-slate-900 border border-violet-500/20 rounded-3xl p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <select value={nodeForm.nodeType} onChange={(e) => setNodeForm({ ...nodeForm, nodeType: e.target.value })} className="bg-slate-800 text-white rounded-xl px-4 py-3 text-sm">
              <option value="concept">Concept</option><option value="agent">Agent</option><option value="skill">Skill</option><option value="tool">Tool</option><option value="entity">Entity</option>
            </select>
            <input value={nodeForm.label} onChange={(e) => setNodeForm({ ...nodeForm, label: e.target.value })} placeholder="Label" className="bg-slate-800 text-white rounded-xl px-4 py-3 text-sm" />
            <input value={nodeForm.description} onChange={(e) => setNodeForm({ ...nodeForm, description: e.target.value })} placeholder="Description" className="bg-slate-800 text-white rounded-xl px-4 py-3 text-sm" />
          </div>
          <button onClick={handleCreateNode} className="px-6 py-3 bg-violet-500 text-white rounded-xl font-black text-sm">Create Node</button>
        </div>
      )}

      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden">
        <div className="p-6 border-b border-slate-800"><h3 className="text-sm font-black text-white uppercase">Nodes ({nodes?.length ?? 0})</h3></div>
        <div className="divide-y divide-slate-800 max-h-96 overflow-y-auto">
          {(nodes ?? []).slice(0, 30).map((n: any) => (
            <div key={n._id} className="p-4 flex items-center justify-between hover:bg-slate-800/50">
              <div className="flex items-center gap-3">
                <span className="px-2 py-1 bg-violet-500/10 text-violet-500 rounded text-[8px] font-black uppercase">{n.nodeType}</span>
                <div><p className="text-sm font-bold text-white">{n.label}</p><p className="text-[10px] text-slate-500">{n.description}</p></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function CompanionTab({ adminToken, showToast }: any) {
  const sessions = useQuery(api.companion_agent.getActiveSessions, {}) as any;
  const stats = useQuery(api.companion_agent.getCompanionStats, {}) as any;
  const createSession = useMutation(api.companion_agent.createSession);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <MC label="Total Sessions" value={stats?.total ?? 0} icon="🤖" color="violet" />
        <MC label="Active" value={stats?.active ?? 0} icon="🟢" color="emerald" />
        <MC label="Agents Used" value={stats?.agents?.length ?? 0} icon="🧠" color="blue" />
      </div>
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden">
        <div className="p-6 border-b border-slate-800"><h3 className="text-sm font-black text-white uppercase">Active Sessions</h3></div>
        <div className="divide-y divide-slate-800">
          {(sessions ?? []).map((s: any) => (
            <div key={s._id} className="p-4 flex items-center justify-between hover:bg-slate-800/50">
              <div><p className="text-sm font-bold text-white">Session {s.sessionId.slice(0, 16)}...</p><p className="text-[10px] text-slate-500">Agent: {s.agentId} • Personality: {s.personality} • Mood: {s.mood}</p></div>
              <span className="px-2 py-1 bg-emerald-500/10 text-emerald-500 rounded-full text-[8px] font-black">Active</span>
            </div>
          ))}
          {(!sessions || sessions.length === 0) && <div className="p-6 text-center text-slate-500 text-sm">No active sessions</div>}
        </div>
      </div>
    </div>
  );
}

function PaymentsTab({ adminToken, showToast }: any) {
  const stats = useQuery(api.agentic_payments.getAgenticPaymentStats, {}) as any;
  const methods = useQuery(api.agentic_payments.getPaymentMethods, {}) as any;
  const limits = useQuery(api.agentic_payments.getSpendingLimits, {}) as any;
  const transactions = useQuery(api.agentic_payments.getTransactions, {}) as any;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MC label="Transactions" value={stats?.totalTransactions ?? 0} icon="💳" color="violet" />
        <MC label="Completed" value={stats?.completed ?? 0} icon="✅" color="emerald" />
        <MC label="Pending" value={stats?.pending ?? 0} icon="⏳" color="amber" />
        <MC label="Total (₦)" value={`₦${((stats?.totalNgn ?? 0) / 1000).toFixed(0)}K`} icon="💰" color="blue" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
          <h3 className="text-sm font-black text-white uppercase mb-3">Payment Methods</h3>
          {(methods ?? []).map((m: any) => <div key={m._id} className="p-3 bg-slate-800 rounded-xl mb-2"><p className="text-sm text-white">{m.name}</p><p className="text-[10px] text-slate-500">{m.type} • {m.provider}</p></div>)}
          {(!methods || methods.length === 0) && <p className="text-sm text-slate-500">No payment methods configured</p>}
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
          <h3 className="text-sm font-black text-white uppercase mb-3">Spending Limits</h3>
          {(limits ?? []).map((l: any) => <div key={l._id} className="p-3 bg-slate-800 rounded-xl mb-2"><p className="text-sm text-white">{l.agentId}</p><p className="text-[10px] text-slate-500">Daily: ₦{l.dailyLimitNgn.toLocaleString()} • Monthly: ₦{l.monthlyLimitNgn.toLocaleString()}</p></div>)}
          {(!limits || limits.length === 0) && <p className="text-sm text-slate-500">No spending limits set</p>}
        </div>
      </div>
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden">
        <div className="p-6 border-b border-slate-800"><h3 className="text-sm font-black text-white uppercase">Recent Transactions</h3></div>
        <div className="divide-y divide-slate-800 max-h-64 overflow-y-auto">
          {(transactions ?? []).slice(0, 20).map((t: any) => (
            <div key={t._id} className="p-4 flex items-center justify-between hover:bg-slate-800/50">
              <div><p className="text-sm font-bold text-white">{t.description}</p><p className="text-[10px] text-slate-500">Agent: {t.agentId} • ₦{t.amountNgn.toLocaleString()}</p></div>
              <span className={`px-2 py-1 rounded-full text-[8px] font-black ${t.status === "completed" ? "bg-emerald-500/10 text-emerald-500" : t.status === "failed" ? "bg-red-500/10 text-red-500" : "bg-amber-500/10 text-amber-500"}`}>{t.status}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function OrchestrationTab({ adminToken, showToast }: any) {
  const workflows = useQuery(api.orchestration.getWorkflows, {}) as any;
  const stats = useQuery(api.orchestration.getOrchestrationStats, {}) as any;
  const runs = useQuery(api.orchestration.getWorkflowRuns, {}) as any;
  const createWorkflow = useMutation(api.orchestration.createWorkflow);
  const startRun = useMutation(api.orchestration.startWorkflowRun);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MC label="Workflows" value={stats?.totalWorkflows ?? 0} icon="⚡" color="violet" />
        <MC label="Active" value={stats?.activeWorkflows ?? 0} icon="🟢" color="emerald" />
        <MC label="Total Runs" value={stats?.totalRuns ?? 0} icon="▶️" color="blue" />
        <MC label="Failed" value={stats?.failed ?? 0} icon="❌" color="red" />
      </div>
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden">
        <div className="p-6 border-b border-slate-800"><h3 className="text-sm font-black text-white uppercase">Workflows</h3></div>
        <div className="divide-y divide-slate-800">
          {(workflows ?? []).map((wf: any) => (
            <div key={wf._id} className="p-4 flex items-center justify-between hover:bg-slate-800/50">
              <div><p className="text-sm font-bold text-white">{wf.name}</p><p className="text-[10px] text-slate-500">{wf.steps.length} steps • {wf.description}</p></div>
              <div className="flex gap-2">
                <span className={`px-2 py-1 rounded-full text-[8px] font-black ${wf.isActive ? "bg-emerald-500/10 text-emerald-500" : "bg-slate-500/10 text-slate-500"}`}>{wf.isActive ? "Active" : "Paused"}</span>
                <button onClick={() => { startRun({ adminToken, workflowId: wf.workflowId }); showToast("success", "Workflow started"); }} className="px-2 py-1 bg-violet-500/20 text-violet-500 rounded text-[8px] font-black">Run</button>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden">
        <div className="p-6 border-b border-slate-800"><h3 className="text-sm font-black text-white uppercase">Recent Runs</h3></div>
        <div className="divide-y divide-slate-800 max-h-64 overflow-y-auto">
          {(runs ?? []).slice(0, 15).map((r: any) => (
            <div key={r._id} className="p-4 flex items-center justify-between hover:bg-slate-800/50">
              <div><p className="text-sm text-white">{r.runId}</p><p className="text-[10px] text-slate-500">Step {r.currentStep}/{r.totalSteps}</p></div>
              <span className={`px-2 py-1 rounded-full text-[8px] font-black ${r.status === "completed" ? "bg-emerald-500/10 text-emerald-500" : r.status === "failed" ? "bg-red-500/10 text-red-500" : r.status === "running" ? "bg-blue-500/10 text-blue-500" : "bg-slate-500/10 text-slate-500"}`}>{r.status}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function EmotionalTab({ adminToken, showToast }: any) {
  const stats = useQuery(api.emotional_ai.getEmotionalAIStats, {}) as any;
  const interactions = useQuery(api.emotional_ai.getInteractions, {}) as any;
  const profiles = useQuery(api.emotional_ai.getProfile, { userId: "admin" }) as any;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <MC label="Profiles" value={stats?.totalProfiles ?? 0} icon="💜" color="violet" />
        <MC label="Interactions" value={stats?.totalInteractions ?? 0} icon="💬" color="blue" />
        <MC label="Emotions Tracked" value={Object.keys(stats?.emotionDistribution ?? {}).length} icon="🎭" color="emerald" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
          <h3 className="text-sm font-black text-white uppercase mb-3">Emotion Distribution</h3>
          <div className="space-y-2">
            {Object.entries(stats?.emotionDistribution ?? {}).sort(([, a]: any, [, b]: any) => b - a).slice(0, 8).map(([emotion, count]) => (
              <div key={emotion} className="flex items-center gap-3">
                <span className="text-xs text-slate-400 w-24">{emotion}</span>
                <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden"><div className="h-full bg-violet-500 rounded-full" style={{ width: `${Math.min(100, ((count as number) / (stats?.totalInteractions || 1)) * 100)}%` }}></div></div>
                <span className="text-xs text-white font-bold">{count as number}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
          <h3 className="text-sm font-black text-white uppercase mb-3">Recent Interactions</h3>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {(interactions ?? []).slice(0, 10).map((i: any) => (
              <div key={i._id} className="p-3 bg-slate-800 rounded-xl">
                <div className="flex justify-between items-center"><span className="text-xs text-violet-500 font-bold">{i.detectedEmotion}</span><span className="text-[10px] text-slate-500">{(i.confidence * 100).toFixed(0)}%</span></div>
                <p className="text-[10px] text-slate-400 mt-1">{i.content.slice(0, 80)}...</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function MC({ label, value, icon, color }: any) {
  const c: Record<string, string> = { violet: "bg-violet-500/10 text-violet-500", emerald: "bg-emerald-500/10 text-emerald-500", blue: "bg-blue-500/10 text-blue-500", red: "bg-red-500/10 text-red-500", amber: "bg-amber-500/10 text-amber-500" };
  return (
    <div className={`p-5 rounded-3xl border border-white/5 ${c[color] ?? c.violet}`}>
      <div className="flex items-center justify-between mb-3"><span className="text-[10px] font-black uppercase tracking-widest opacity-60">{label}</span><span className="text-lg">{icon}</span></div>
      <p className="text-2xl font-black">{value}</p>
    </div>
  );
}
