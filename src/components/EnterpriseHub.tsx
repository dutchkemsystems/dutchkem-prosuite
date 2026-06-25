import { useState } from "react";
import { useMutation } from "convex/react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { convexQuery } from "@convex-dev/react-query";
import { api } from "../../convex/_generated/api";

type AdminPanelProps = { adminToken: string };

export function EnterpriseHub({ adminToken }: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<"marketplace" | "knowledge" | "companion" | "payments" | "workflows" | "emotional">("marketplace");
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const showToast = (type: "success" | "error", msg: string) => { setToast({ type, msg }); setTimeout(() => setToast(null), 4000); };

  return (
    <div className="space-y-6">
      {toast && <div className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-2xl shadow-2xl font-bold text-sm ${toast.type === "success" ? "bg-emerald-500 text-white" : "bg-red-500 text-white"}`}>{toast.msg}</div>}

      {/* Header */}
      <div className="bg-gradient-to-br from-violet-600/20 to-slate-900 border border-violet-500/20 rounded-[3rem] p-10">
        <h2 className="text-2xl font-black uppercase tracking-tighter text-white">Enterprise Hub</h2>
        <p className="text-xs font-black text-violet-500 uppercase tracking-widest mt-1">Agent Marketplace • Knowledge Graph • Companion AI • Agentic Payments • Workflows • Emotional AI</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {(["marketplace", "knowledge", "companion", "payments", "workflows", "emotional"] as const).map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab ? "bg-violet-500 text-white" : "bg-slate-800 text-slate-400 hover:bg-slate-700"}`}>
              {tab === "marketplace" ? "🏪 Marketplace" : tab === "knowledge" ? "🧠 Knowledge" : tab === "companion" ? "🤖 Companion" : tab === "payments" ? "💳 Payments" : tab === "workflows" ? "⚡ Workflows" : "💜 Emotional"}
            </button>
          ))}
        </div>
      </div>

      {activeTab === "marketplace" && <MarketplaceTab adminToken={adminToken} showToast={showToast} />}
      {activeTab === "knowledge" && <KnowledgeTab adminToken={adminToken} showToast={showToast} />}
      {activeTab === "companion" && <CompanionTab adminToken={adminToken} showToast={showToast} />}
      {activeTab === "payments" && <PaymentsTab adminToken={adminToken} showToast={showToast} />}
      {activeTab === "workflows" && <WorkflowsTab adminToken={adminToken} showToast={showToast} />}
      {activeTab === "emotional" && <EmotionalTab adminToken={adminToken} showToast={showToast} />}
    </div>
  );
}

function MarketplaceTab({ adminToken, showToast }: any) {
  const { data: agents } = useSuspenseQuery(convexQuery(api.enterprise_marketplace.listAgents, { adminToken }));
  const { data: installed } = useSuspenseQuery(convexQuery(api.enterprise_marketplace.getInstalledAgents, { adminToken }));
  const installAgent = useMutation(api.enterprise_marketplace.installAgent);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <MC label="Available Agents" value={agents?.length ?? 0} icon="📦" color="violet" />
        <MC label="Installed" value={installed?.length ?? 0} icon="📥" color="emerald" />
        <MC label="Categories" value={new Set(agents?.map((a: any) => a.category) ?? []).size} icon="📊" color="blue" />
      </div>

      <h3 className="text-lg font-black text-white uppercase">Available Agents</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {(agents ?? []).map((agent: any) => (
          <div key={agent.id} className="bg-slate-900 border border-white/5 rounded-3xl p-6 space-y-3">
            <div className="flex justify-between items-start">
              <div>
                <h4 className="text-sm font-black text-white">{agent.name}</h4>
                <p className="text-[10px] text-slate-500">{agent.category} • {agent.complexity} • {agent.estimatedTime}</p>
              </div>
              <span className="px-2 py-1 bg-violet-500/10 text-violet-500 rounded-full text-[8px] font-black">₦{agent.price.toLocaleString()}</span>
            </div>
            <p className="text-xs text-slate-400">{agent.description}</p>
            <div className="flex flex-wrap gap-1">
              {agent.capabilities?.map((cap: string) => (
                <span key={cap} className="px-2 py-0.5 bg-slate-800 text-slate-400 rounded text-[8px]">{cap}</span>
              ))}
            </div>
            <button
              onClick={async () => {
                try {
                  await installAgent({ templateId: agent.id, templateName: agent.name, adminToken });
                  showToast("success", `${agent.name} installed!`);
                } catch (e: any) { showToast("error", e?.message ?? "Install failed"); }
              }}
              className="px-4 py-2 bg-violet-500/20 text-violet-500 rounded-xl text-[10px] font-black uppercase hover:bg-violet-500/30 transition-colors"
            >
              Install
            </button>
          </div>
        ))}
      </div>

      {installed && installed.length > 0 && (
        <>
          <h3 className="text-lg font-black text-white uppercase">Installed Agents</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {installed.map((inst: any) => (
              <div key={inst._id} className="bg-slate-900 border border-emerald-500/20 rounded-3xl p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-black text-white">{inst.templateName}</h4>
                    <p className="text-[10px] text-slate-500">Installed {new Date(inst.installedAt).toLocaleDateString()}</p>
                  </div>
                  <span className="px-2 py-1 bg-emerald-500/10 text-emerald-500 rounded-full text-[8px] font-black">Active</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function KnowledgeTab({ adminToken, showToast }: any) {
  const { data: entries } = useSuspenseQuery(convexQuery(api.enterprise_knowledge.listEntries, { adminToken }));
  const { data: stats } = useSuspenseQuery(convexQuery(api.enterprise_knowledge.getStats, { adminToken }));
  const addEntry = useMutation(api.enterprise_knowledge.addEntry);
  const searchEntries = useMutation(api.enterprise_knowledge.searchEntries);
  const [queryText, setQueryText] = useState("");
  const [queryResult, setQueryResult] = useState<any>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [entryForm, setEntryForm] = useState({ source: "", entity: "", relationship: "", confidence: "0.8" });

  const handleQuery = async () => {
    try {
      const result = await searchEntries({ adminToken, query: queryText });
      if (result) setQueryResult(result);
      else showToast("error", "Query failed");
    } catch (e: any) { showToast("error", e?.message ?? "Query failed"); }
  };

  const handleCreateEntry = async () => {
    try {
      await addEntry({ adminToken, source: entryForm.source, entity: entryForm.entity, relationship: entryForm.relationship, confidence: parseFloat(entryForm.confidence) || 0.8, metadata: {} });
      showToast("success", "Entry added");
      setShowCreate(false);
      setEntryForm({ source: "", entity: "", relationship: "", confidence: "0.8" });
    } catch (e: any) { showToast("error", e?.message ?? "Failed"); }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <MC label="Entries" value={stats?.totalEntries ?? entries?.length ?? 0} icon="🔵" color="violet" />
        <MC label="Sources" value={stats?.uniqueSources ?? 0} icon="🔗" color="blue" />
        <MC label="Entities" value={stats?.uniqueEntities ?? 0} icon="📊" color="emerald" />
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
        <h3 className="text-sm font-black text-white uppercase mb-3">Search Knowledge Graph</h3>
        <div className="flex gap-3">
          <input value={queryText} onChange={(e) => setQueryText(e.target.value)} placeholder="Search query..." className="flex-1 bg-slate-800 text-white rounded-xl px-4 py-3 text-sm" />
          <button onClick={handleQuery} className="px-6 py-3 bg-violet-500 text-white rounded-xl font-black text-sm">Search</button>
        </div>
        {queryResult && (
          <div className="mt-4 p-4 bg-slate-800 rounded-2xl">
            <p className="text-xs text-slate-400 mb-2">{queryResult.length ?? 0} results found</p>
            <div className="flex flex-wrap gap-2">
              {(queryResult ?? []).slice(0, 10).map((n: any, i: number) => <span key={i} className="px-2 py-1 bg-violet-500/10 text-violet-500 rounded-lg text-[10px]">{n.entity}</span>)}
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-between items-center">
        <h3 className="text-lg font-black text-white uppercase">Knowledge Entries</h3>
        <button onClick={() => setShowCreate(!showCreate)} className="px-4 py-2 bg-violet-500 text-white rounded-xl text-[10px] font-black uppercase">{showCreate ? "Cancel" : "+ New Entry"}</button>
      </div>

      {showCreate && (
        <div className="bg-slate-900 border border-violet-500/20 rounded-3xl p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input value={entryForm.source} onChange={(e) => setEntryForm({ ...entryForm, source: e.target.value })} placeholder="Source (e.g. user_input, document)" className="bg-slate-800 text-white rounded-xl px-4 py-3 text-sm" />
            <input value={entryForm.entity} onChange={(e) => setEntryForm({ ...entryForm, entity: e.target.value })} placeholder="Entity (e.g. company name)" className="bg-slate-800 text-white rounded-xl px-4 py-3 text-sm" />
            <input value={entryForm.relationship} onChange={(e) => setEntryForm({ ...entryForm, relationship: e.target.value })} placeholder="Relationship (e.g. works_at)" className="bg-slate-800 text-white rounded-xl px-4 py-3 text-sm" />
            <input value={entryForm.confidence} onChange={(e) => setEntryForm({ ...entryForm, confidence: e.target.value })} placeholder="Confidence (0-1)" type="number" step="0.1" min="0" max="1" className="bg-slate-800 text-white rounded-xl px-4 py-3 text-sm" />
          </div>
          <button onClick={handleCreateEntry} className="px-6 py-3 bg-violet-500 text-white rounded-xl font-black text-sm">Add Entry</button>
        </div>
      )}

      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden">
        <div className="p-6 border-b border-slate-800"><h3 className="text-sm font-black text-white uppercase">Entries ({entries?.length ?? 0})</h3></div>
        <div className="divide-y divide-slate-800 max-h-96 overflow-y-auto">
          {(entries ?? []).slice(0, 30).map((e: any) => (
            <div key={e._id} className="p-4 flex items-center justify-between hover:bg-slate-800/50">
              <div className="flex items-center gap-3">
                <span className="px-2 py-1 bg-violet-500/10 text-violet-500 rounded text-[8px] font-black uppercase">{e.source}</span>
                <div><p className="text-sm font-bold text-white">{e.entity}</p><p className="text-[10px] text-slate-500">{e.relationship} • confidence: {(e.confidence * 100).toFixed(0)}%</p></div>
              </div>
            </div>
          ))}
          {(!entries || entries.length === 0) && <div className="p-6 text-center text-slate-500 text-sm">No entries yet</div>}
        </div>
      </div>
    </div>
  );
}

function CompanionTab({ adminToken, showToast }: any) {
  const { data: sessions } = useSuspenseQuery(convexQuery(api.enterprise_companion.listSessions, { adminToken }));
  const { data: stats } = useSuspenseQuery(convexQuery(api.enterprise_companion.getStats, { adminToken }));
  const startSession = useMutation(api.enterprise_companion.startSession);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <MC label="Total Sessions" value={stats?.totalSessions ?? 0} icon="🤖" color="violet" />
        <MC label="Active" value={stats?.activeSessions ?? 0} icon="🟢" color="emerald" />
        <MC label="Avg Duration" value={`${((stats?.avgDuration ?? 0) / 60000).toFixed(1)}m`} icon="⏱️" color="blue" />
      </div>
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden">
        <div className="p-6 border-b border-slate-800"><h3 className="text-sm font-black text-white uppercase">Sessions</h3></div>
        <div className="divide-y divide-slate-800">
          {(sessions ?? []).map((s: any) => (
            <div key={s._id} className="p-4 flex items-center justify-between hover:bg-slate-800/50">
              <div><p className="text-sm font-bold text-white">Session {s._id.slice(0, 16)}...</p><p className="text-[10px] text-slate-500">User: {s.userId} • Channel: {s.channel}</p></div>
              <span className={`px-2 py-1 rounded-full text-[8px] font-black ${s.status === "active" ? "bg-emerald-500/10 text-emerald-500" : "bg-slate-500/10 text-slate-500"}`}>{s.status}</span>
            </div>
          ))}
          {(!sessions || sessions.length === 0) && <div className="p-6 text-center text-slate-500 text-sm">No sessions yet</div>}
        </div>
      </div>
    </div>
  );
}

function PaymentsTab({ adminToken, showToast }: any) {
  const { data: stats } = useSuspenseQuery(convexQuery(api.enterprise_payments.getStats, { adminToken }));
  const { data: spendingLimit } = useSuspenseQuery(convexQuery(api.enterprise_payments.getSpendingLimit, { adminToken }));
  const { data: transactions } = useSuspenseQuery(convexQuery(api.enterprise_payments.listTransactions, { adminToken }));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MC label="Transactions" value={stats?.totalTransactions ?? 0} icon="💳" color="violet" />
        <MC label="Completed" value={stats?.completed ?? 0} icon="✅" color="emerald" />
        <MC label="Pending" value={stats?.pending ?? 0} icon="⏳" color="amber" />
        <MC label="Total" value={`₦${((stats?.totalNgn ?? 0) / 1000).toFixed(0)}K`} icon="💰" color="blue" />
      </div>
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
        <h3 className="text-sm font-black text-white uppercase mb-3">Spending Limit</h3>
        {spendingLimit ? (
          <p className="text-sm text-white">₦{spendingLimit.limit?.toLocaleString() ?? "No limit set"}</p>
        ) : (
          <p className="text-sm text-slate-500">No spending limit configured</p>
        )}
      </div>
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden">
        <div className="p-6 border-b border-slate-800"><h3 className="text-sm font-black text-white uppercase">Recent Transactions</h3></div>
        <div className="divide-y divide-slate-800 max-h-64 overflow-y-auto">
          {(transactions ?? []).slice(0, 20).map((t: any) => (
            <div key={t._id} className="p-4 flex items-center justify-between hover:bg-slate-800/50">
              <div><p className="text-sm font-bold text-white">{t.fromAgent} → {t.toAgent}</p><p className="text-[10px] text-slate-500">₦{t.amount.toLocaleString()} • {t.currency}</p></div>
              <span className={`px-2 py-1 rounded-full text-[8px] font-black ${t.status === "completed" ? "bg-emerald-500/10 text-emerald-500" : t.status === "failed" ? "bg-red-500/10 text-red-500" : "bg-amber-500/10 text-amber-500"}`}>{t.status}</span>
            </div>
          ))}
          {(!transactions || transactions.length === 0) && <div className="p-6 text-center text-slate-500 text-sm">No transactions yet</div>}
        </div>
      </div>
    </div>
  );
}

function WorkflowsTab({ adminToken, showToast }: any) {
  const { data: workflows } = useSuspenseQuery(convexQuery(api.enterprise_workflows.listWorkflows, { adminToken }));
  const { data: runs } = useSuspenseQuery(convexQuery(api.enterprise_workflows.listWorkflowRuns, { adminToken }));
  const startRun = useMutation(api.enterprise_workflows.startRun);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <MC label="Workflows" value={workflows?.length ?? 0} icon="⚡" color="violet" />
        <MC label="Total Runs" value={runs?.length ?? 0} icon="▶️" color="blue" />
        <MC label="Active" value={workflows?.filter((w: any) => w.status === "active").length ?? 0} icon="🟢" color="emerald" />
      </div>
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden">
        <div className="p-6 border-b border-slate-800"><h3 className="text-sm font-black text-white uppercase">Workflows</h3></div>
        <div className="divide-y divide-slate-800">
          {(workflows ?? []).map((wf: any) => (
            <div key={wf._id} className="p-4 flex items-center justify-between hover:bg-slate-800/50">
              <div><p className="text-sm font-bold text-white">{wf.name}</p><p className="text-[10px] text-slate-500">{wf.nodes?.length ?? 0} nodes • {wf.description || "No description"}</p></div>
              <div className="flex gap-2">
                <span className={`px-2 py-1 rounded-full text-[8px] font-black ${wf.status === "active" ? "bg-emerald-500/10 text-emerald-500" : "bg-slate-500/10 text-slate-500"}`}>{wf.status}</span>
                <button onClick={() => { startRun({ workflowId: wf._id, adminToken }); showToast("success", "Workflow started"); }} className="px-2 py-1 bg-violet-500/20 text-violet-500 rounded text-[8px] font-black">Run</button>
              </div>
            </div>
          ))}
          {(!workflows || workflows.length === 0) && <div className="p-6 text-center text-slate-500 text-sm">No workflows yet</div>}
        </div>
      </div>
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden">
        <div className="p-6 border-b border-slate-800"><h3 className="text-sm font-black text-white uppercase">Recent Runs</h3></div>
        <div className="divide-y divide-slate-800 max-h-64 overflow-y-auto">
          {(runs ?? []).slice(0, 15).map((r: any) => (
            <div key={r._id} className="p-4 flex items-center justify-between hover:bg-slate-800/50">
              <div><p className="text-sm text-white">Run {r._id.slice(0, 16)}...</p><p className="text-[10px] text-slate-500">Workflow: {r.workflowId}</p></div>
              <span className={`px-2 py-1 rounded-full text-[8px] font-black ${r.status === "completed" ? "bg-emerald-500/10 text-emerald-500" : r.status === "failed" ? "bg-red-500/10 text-red-500" : r.status === "running" ? "bg-blue-500/10 text-blue-500" : "bg-slate-500/10 text-slate-500"}`}>{r.status}</span>
            </div>
          ))}
          {(!runs || runs.length === 0) && <div className="p-6 text-center text-slate-500 text-sm">No runs yet</div>}
        </div>
      </div>
    </div>
  );
}

function EmotionalTab({ adminToken, showToast }: any) {
  const { data: profiles } = useSuspenseQuery(convexQuery(api.enterprise_emotional.listProfiles, { adminToken }));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <MC label="Profiles" value={profiles?.length ?? 0} icon="💜" color="violet" />
        <MC label="With Memories" value={profiles?.filter((p: any) => p.memories?.length > 0).length ?? 0} icon="🧠" color="blue" />
        <MC label="Avg Retention" value={`${(profiles?.reduce((sum: number, p: any) => sum + (p.retentionScore ?? 0), 0) / (profiles?.length || 1)).toFixed(0)}%`} icon="📈" color="emerald" />
      </div>
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden">
        <div className="p-6 border-b border-slate-800"><h3 className="text-sm font-black text-white uppercase">User Profiles</h3></div>
        <div className="divide-y divide-slate-800 max-h-96 overflow-y-auto">
          {(profiles ?? []).slice(0, 20).map((p: any) => (
            <div key={p._id} className="p-4 hover:bg-slate-800/50">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-white">User {p.userId}</p>
                  <p className="text-[10px] text-slate-500">Retention: {p.retentionScore}% • Memories: {p.memories?.length ?? 0}</p>
                </div>
                <span className="px-2 py-1 bg-violet-500/10 text-violet-500 rounded-full text-[8px] font-black">Active</span>
              </div>
              {p.sentimentHistory?.length > 0 && (
                <div className="mt-2 flex gap-1">
                  {p.sentimentHistory.slice(-5).map((s: any, i: number) => (
                    <span key={i} className={`px-1.5 py-0.5 rounded text-[7px] ${s.score > 0.5 ? "bg-emerald-500/10 text-emerald-500" : s.score < -0.5 ? "bg-red-500/10 text-red-500" : "bg-slate-500/10 text-slate-500"}`}>
                      {s.label}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
          {(!profiles || profiles.length === 0) && <div className="p-6 text-center text-slate-500 text-sm">No profiles yet</div>}
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
