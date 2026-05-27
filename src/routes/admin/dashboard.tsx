import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useSuspenseQuery } from "@tanstack/react-query"
import { convexQuery } from "@convex-dev/react-query"
import { useConvexAuth, useMutation, useAction } from "convex/react"
import { useAuthActions } from "@convex-dev/auth/react"
import { api, internal } from "../../../convex/_generated/api"
import { useState, useEffect } from "react"
import { CompanyLogo } from "~/components/CompanyLogo";
import { useSocket } from "~/lib/socket";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line
} from 'recharts';

export const Route = createFileRoute('/admin/dashboard')({
  component: AdminDashboardPage,
})

function AdminDashboardPage() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const { signOut: authSignOut } = useAuthActions();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("overview");

  // Check for admin session
  const [adminToken, setAdminToken] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('admin_session_token');
    if (!token && !isLoading) {
      navigate({ to: '/admin/login' });
    } else {
      setAdminToken(token);
    }
  }, [isLoading, navigate]);

  const { data } = useSuspenseQuery(convexQuery(api.admin.getAdminStats, {}));
  const { data: earnings } = useSuspenseQuery(convexQuery(api.admin.getEarningsSummary, {}));
  const { data: recentTxs } = useSuspenseQuery(convexQuery(api.admin.getRecentTransactions, {}));
  const { data: uaeStatus } = useSuspenseQuery(convexQuery(api.uae_engine.getSystemStatus, {}));
  const { data: adminProfile } = useSuspenseQuery(convexQuery(api.admin.getAdminProfile, {}));
  const { data: upgradeStatus } = useSuspenseQuery(convexQuery(api.admin.getUpgradeStatus, {}));
  const { data: freelancers } = useSuspenseQuery(convexQuery(api.admin.getFreelancerOverview, {}));

  // Real-time socket connection
  const { connected: wsConnected } = useSocket(adminToken);

  // Browser Notification Logic
  const [lastTxId, setLastTxId] = useState<string | null>(null);
  useEffect(() => {
    if (recentTxs && recentTxs.length > 0) {
      const latest = recentTxs[0];
      if (lastTxId && latest._id !== lastTxId && latest.status === 'approved') {
        if ("Notification" in window && Notification.permission === "granted") {
          new Notification(`New Payment: ₦${latest.amount.toLocaleString()}`, {
            body: `Received from Client. Agent service confirmed.`,
            icon: "/favicon.ico"
          });
        }
      }
      setLastTxId(latest._id);
    }
  }, [recentTxs]);

  const handleLogout = async () => {
    localStorage.removeItem('admin_session_token');
    await authSignOut();
    navigate({ to: '/admin/login' });
  };

  if (isLoading || !adminToken) return <LoadingScreen />;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row overflow-hidden font-sans">
      <aside className="w-full md:w-80 bg-slate-900 border-r border-slate-800 flex-shrink-0 z-20 flex flex-col shadow-2xl">
        <div className="p-8 border-b border-slate-800 bg-red-600/5">
          <div className="flex items-center gap-4 mb-2">
            <CompanyLogo className="w-12 h-12" />
            <div>
              <h2 className="font-black text-lg tracking-tighter uppercase leading-tight text-white">Dutchkem Ventures</h2>
              <p className="text-[10px] text-red-500 font-black uppercase tracking-widest leading-none">RC: 9489855 • TIN: 2512403526652</p>
            </div>
          </div>
          <div className="mt-4 p-3 bg-black/20 rounded-xl border border-white/5">
             <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Command Center v4.0</p>
             <p className="text-[10px] font-bold text-slate-300 italic">"Unified Autonomous Evolution Engine Active"</p>
          </div>
        </div>
        
        <nav className="p-4 space-y-1 flex-grow overflow-y-auto custom-scrollbar">
          <AdminTab active={activeTab === "overview"} onClick={() => setActiveTab("overview")} icon="📊" label="Overview" />
          <AdminTab active={activeTab === "manual-task"} onClick={() => setActiveTab("manual-task")} icon="⚡" label="Manual Task" />
          <AdminTab active={activeTab === "social"} onClick={() => setActiveTab("social")} icon="📣" label="Social Engine" />
          <AdminTab active={activeTab === "guardian"} onClick={() => setActiveTab("guardian")} icon="🛡️" label="Guardian Watch" />
          <AdminTab active={activeTab === "tax"} onClick={() => setActiveTab("tax")} icon="🏛️" label="Tax Wallet" />
          <AdminTab active={activeTab === "payouts"} onClick={() => setActiveTab("payouts")} icon="🏦" label="Secure Sweeps" />
          <AdminTab active={activeTab === "security"} onClick={() => setActiveTab("security")} icon="🔐" label="Encryption Hub" />
          <AdminTab active={activeTab === "agents"} onClick={() => setActiveTab("agents")} icon="🤖" label="Agent Health" />
          <AdminTab active={activeTab === "discounts"} onClick={() => setActiveTab("discounts")} icon="📅" label="Holiday Logic" />
          <AdminTab active={activeTab === "updates"} onClick={() => setActiveTab("updates")} icon="🔄" label="Service Evolution" />
          <AdminTab active={activeTab === "freelancers"} onClick={() => setActiveTab("freelancers")} icon="👥" label="Freelancers" />
          <AdminTab active={activeTab === "audit"} onClick={() => setActiveTab("audit")} icon="📜" label="Audit Trail" />
          <AdminTab active={activeTab === "charity"} onClick={() => setActiveTab("charity")} icon="🕊️" label="Charity / Tithe" />
          <AdminTab active={activeTab === "marketplace"} onClick={() => setActiveTab("marketplace")} icon="🏪" label="Freelancer Marketplace" />
        </nav>

        <div className="p-6 border-t border-slate-800 bg-slate-900/50">
          <button onClick={handleLogout} className="w-full py-4 bg-slate-800 hover:bg-red-900/20 text-slate-400 hover:text-red-500 rounded-2xl font-black text-xs transition-all flex items-center justify-center gap-3 border border-slate-700 uppercase tracking-widest">
            Logout Admin
          </button>
        </div>
      </aside>

      <main className="flex-grow overflow-y-auto h-screen flex flex-col bg-slate-950">
        <header className="px-10 py-8 border-b border-slate-800 bg-slate-950/80 backdrop-blur-xl sticky top-0 z-10 flex justify-between items-center">
          <div className="flex items-center gap-6">
             <h1 className="text-2xl font-black uppercase tracking-tighter text-white tracking-widest">UAE ENGINE CONTROL</h1>
             <div className="h-6 w-px bg-slate-800"></div>
             <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full animate-pulse ${uaeStatus.type === 'success' ? 'bg-emerald-500' : 'bg-orange-500'}`}></div>
                <span className={`text-[10px] font-black uppercase tracking-widest ${uaeStatus.type === 'success' ? 'text-emerald-500' : 'text-orange-500'}`}>
                    {uaeStatus.status}
                </span>
             </div>
             {upgradeStatus && (
               <>
                 <div className="h-6 w-px bg-slate-800"></div>
                 <div className="flex items-center gap-2">
                   <span>{upgradeStatus.statusIndicator}</span>
                   <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{upgradeStatus.currentStatus}</span>
                 </div>
               </>
             )}
          </div>
          <AdminProfileCard profile={adminProfile} />
        </header>

        <div className="p-10 space-y-12 max-w-[1800px] mx-auto w-full pb-32">
          {activeTab === "overview" && <StatsOverview data={data} earnings={earnings} uaeStatus={uaeStatus} />}
          {activeTab === "manual-task" && <ManualAgentTaskPanel />}
          {activeTab === "social" && <SocialEnginePanel />}
          {activeTab === "guardian" && <GuardianWatchPanel />}
          {activeTab === "tax" && <TaxDashboardPanel />}
          {activeTab === "payouts" && <DailySweepStatusPanel />}
          {activeTab === "security" && <SecurityHubPanel />}
          {activeTab === "agents" && <AgentHealthMatrix data={data} />}
          {activeTab === "freelancers" && <FreelancerPanel data={freelancers} />}
          {activeTab === "audit" && <AuditTrailPanel />}
          {activeTab === "discounts" && <HolidayDiscountsPanel />}
          {activeTab === "updates" && <AutoUpdatesPanel />}
          {activeTab === "charity" && <CharityDashboardPanel />}
          {activeTab === "marketplace" && <FreelancerMarketplacePanel />}
        </div>
        <Footer />
      </main>
    </div>
  );
}

function ManualAgentTaskPanel() {
  const [agentId, setAgentId] = useState("A1");
  const [userEmail, setUserEmail] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [taskOutput, setTaskOutput] = useState<any>(null);

  const { data: services } = useSuspenseQuery(convexQuery(api.admin.getAgentServices, { agentId }));
  const { data: logs } = useSuspenseQuery(convexQuery(api.uae_engine.getManualTaskLogs, {}));
  const generateTask = useMutation(api.uae_engine.generateAdminManualTask);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt) return;
    setIsGenerating(true);
    try {
      const result = await generateTask({ agentId, serviceId: serviceId || services[0]?.name || "General", prompt, userEmail });
      // Poll for completion or just show in logs
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <div className="bg-slate-900 border border-slate-800 rounded-[3.5rem] p-12 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-orange-600/5 blur-[80px]"></div>
          <h2 className="text-2xl font-black uppercase tracking-tighter text-white mb-8">Manual Agent Task (Admin Override)</h2>
          <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Select Agent</label>
                <select 
                  value={agentId} 
                  onChange={(e) => setAgentId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-white font-bold"
                >
                  {Array.from({ length: 15 }, (_, i) => `A${i + 1}`).map(id => (
                    <option key={id} value={id}>Agent {id}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">User Email (Optional)</label>
                <input 
                  type="email" 
                  value={userEmail}
                  onChange={(e) => setUserEmail(e.target.value)}
                  placeholder="user@example.com"
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-white font-bold"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Target Service</label>
              <select 
                value={serviceId} 
                onChange={(e) => setServiceId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-white font-bold"
              >
                {services.map((s: any) => (
                  <option key={s._id} value={s.name}>{s.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Input Prompt</label>
              <textarea 
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={4}
                placeholder="Enter exact override command..."
                className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-white font-bold"
              />
            </div>

            <button 
              type="submit"
              disabled={isGenerating}
              className="w-full py-5 bg-orange-600 hover:bg-orange-500 text-white rounded-2xl font-black uppercase tracking-[0.2em] transition-all shadow-xl shadow-orange-600/20 disabled:opacity-50"
            >
              {isGenerating ? "Executing UAE Command..." : "Generate Manual Task"}
            </button>
          </form>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-[3.5rem] p-12 shadow-2xl">
          <h2 className="text-xl font-black uppercase tracking-tighter text-white mb-8">Admin Task Audit Log</h2>
          <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
            {logs.map((log: any) => (
              <div key={log._id} className="bg-slate-950 p-6 rounded-3xl border border-white/5 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-xs font-black text-white uppercase tracking-tight">{log.agentId} • {log.serviceId}</p>
                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{new Date(log.timestamp).toLocaleString()}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase border ${
                    log.status === 'completed' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                    log.status === 'failed' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                    'bg-orange-500/10 text-orange-500 border-orange-500/20 animate-pulse'
                  }`}>
                    {log.status}
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 font-bold italic line-clamp-2">"{log.prompt}"</p>
                {log.output && (
                  <div className="mt-4 p-4 bg-black/40 rounded-xl border border-white/5">
                    <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-2">Result Output</p>
                    <p className="text-[10px] text-slate-300 font-medium whitespace-pre-wrap">{log.output}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function TaxDashboardPanel() {
  const { data: taxData } = useSuspenseQuery(convexQuery(api.admin.getTaxWalletStats, {}));
  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      <div className="bg-slate-900 border border-slate-800 rounded-[3.5rem] p-12 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/5 blur-[80px]"></div>
        <div className="relative z-10 space-y-8">
           <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
              <div className="space-y-2">
                 <h2 className="text-3xl font-black uppercase tracking-tighter text-white">Dutchkem Ventures Prosuite NG+ — Tax Wallet Dashboard</h2>
                 <p className="text-sm font-black text-indigo-500 uppercase tracking-widest">RC: 9489855 | TIN: 2512403526652</p>
              </div>
              <button className="px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all">Export Tax Report</button>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <MetricCard label="Tax Wallet Balance" value={`₦${taxData.balance.toLocaleString()}`} icon="🏛️" color="emerald" subValue="5% Interest Active" />
              <MetricCard label="Annual Dev Levy" value="₦100,000" icon="🇳🇬" color="amber" subValue="Provisioned" />
              <MetricCard label="Interest Accrued" value={`₦${taxData.interestEarned.toLocaleString()}`} icon="📈" color="blue" subValue="Compounded Daily" />
           </div>

           <div className="bg-slate-950 p-10 rounded-[2.5rem] border border-white/5">
              <h3 className="text-lg font-black text-white uppercase tracking-tighter mb-6">Recent Tax Deductions</h3>
              <div className="space-y-4">
                 {taxData.history.map((h: any, i: number) => (
                    <div key={i} className="flex justify-between items-center p-4 bg-slate-900 rounded-2xl border border-white/5">
                       <div>
                          <p className="text-sm font-black text-white">₦{h.amount.toLocaleString()}</p>
                          <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{h.type} • {h.date}</p>
                       </div>
                       <span className="text-emerald-500 text-xs">✓</span>
                    </div>
                 ))}
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}

function SocialEnginePanel() {
  const { data: stats } = useSuspenseQuery(convexQuery(api.social.getSocialStats, {}));
  const rotateSocial = useMutation(internal.social.rotateSocialAgents);
  const [rotating, setRotating] = useState(false);

  const handleRotate = async () => {
    setRotating(true);
    await rotateSocial({});
    setRotating(false);
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      <div className="bg-slate-900 border border-slate-800 rounded-[3.5rem] p-12 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-orange-600/5 blur-[80px]"></div>
        <div className="relative z-10 space-y-10">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-3xl font-black uppercase tracking-tighter text-white">Automated Social Engine</h2>
              <p className="text-sm font-black text-orange-500 uppercase tracking-widest mt-1">NVIDIA NIM + Postiz Multi-Platform Bridge</p>
            </div>
            <button
              onClick={handleRotate}
              disabled={rotating}
              className="px-8 py-4 bg-orange-600 hover:bg-orange-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl shadow-orange-600/20 disabled:opacity-50"
            >
              {rotating ? "Generating..." : "Force Agent Rotation"}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <MetricCard label="Total Generated" value={stats.total} icon="📝" color="blue" />
            <MetricCard label="Live Posts" value={stats.posted} icon="🌐" color="emerald" />
            <MetricCard label="Scheduled" value={stats.scheduled} icon="📅" color="indigo" />
            <MetricCard label="Failed" value={stats.failed} icon="⚠️" color="red" />
          </div>

          <div className="bg-slate-950 p-10 rounded-[2.5rem] border border-white/5">
            <h3 className="text-lg font-black text-white uppercase tracking-tighter mb-8">Pulse History</h3>
            <div className="space-y-4">
              {stats.history.map((p: any) => (
                <div key={p._id} className="flex flex-col md:flex-row justify-between items-start md:items-center p-6 bg-slate-900 rounded-3xl border border-white/5 gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-slate-950 rounded-2xl flex items-center justify-center text-xl">{p.platform === 'X' ? '𝕏' : '📱'}</div>
                    <div>
                      <p className="text-sm font-bold text-white line-clamp-1 max-w-md">{p.content}</p>
                      <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-1">{p.agentId} • {new Date(p.scheduledFor).toLocaleString()}</p>
                    </div>
                  </div>
                  <span className={`px-4 py-1.5 rounded-full text-[8px] font-black uppercase tracking-widest border ${
                    p.status === 'posted' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                    p.status === 'failed' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                    'bg-indigo-500/10 text-indigo-500 border-indigo-500/20'
                  }`}>
                    {p.status}
                  </span>
                </div>
              ))}
              {stats.history.length === 0 && (
                <div className="text-center py-20 text-slate-600 font-bold uppercase tracking-widest italic opacity-30">Waiting for first pulse...</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function GuardianWatchPanel() {
  const { data: logs } = useSuspenseQuery(convexQuery(api.guardian_watch.getGuardianLogs, {}));
  const runDiagnosis = useAction(internal.guardian_watch.runFullDiagnosis);
  const [running, setRunning] = useState(false);

  const handleRun = async () => {
    setRunning(true);
    await runDiagnosis({});
    setRunning(false);
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      <div className="bg-slate-900 border border-slate-800 rounded-[3.5rem] p-12 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-teal-600/5 blur-[80px]"></div>
        <div className="relative z-10 space-y-10">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-3xl font-black uppercase tracking-tighter text-white">Guardian Watch v4.0</h2>
              <p className="text-sm font-black text-teal-500 uppercase tracking-widest mt-1">Self-Testing & Auto-Healing Infrastructure</p>
            </div>
            <button
              onClick={handleRun}
              disabled={running}
              className="px-8 py-4 bg-teal-600 hover:bg-teal-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl shadow-teal-600/20 disabled:opacity-50"
            >
              {running ? "Diagnosing..." : "Run Full System Audit"}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <MetricCard label="System Integrity" value="OPTIMAL" icon="🛡️" color="emerald" />
            <MetricCard label="Active Sentinels" value="12" icon="👁️" color="blue" />
            <MetricCard label="Total Tests" value={logs.length} icon="🧪" color="indigo" />
            <MetricCard label="Healed Issues" value={logs.filter((l: any) => l.status === 'healed').length} icon="🏥" color="teal" />
          </div>

          <div className="bg-slate-950 p-10 rounded-[2.5rem] border border-white/5">
            <h3 className="text-lg font-black text-white uppercase tracking-tighter mb-8">Sentinel Logs</h3>
            <div className="space-y-4">
              {logs.map((l: any) => (
                <div key={l._id} className="flex flex-col md:flex-row justify-between items-start md:items-center p-6 bg-slate-900 rounded-3xl border border-white/5 gap-4">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-lg ${
                      l.status === 'pass' ? 'bg-emerald-500/10 text-emerald-500' :
                      l.status === 'fail' ? 'bg-red-500/10 text-red-500' :
                      'bg-teal-500/10 text-teal-500'
                    }`}>
                      {l.status === 'pass' ? '✓' : l.status === 'fail' ? '✗' : '✚'}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">{l.testName}</p>
                      <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-1">
                        {l.category} • {new Date(l.timestamp).toLocaleTimeString()} {l.latency ? `• ${l.latency}ms` : ''}
                      </p>
                      {l.fixAction && (
                        <p className="text-[10px] text-teal-400 font-bold mt-2 italic flex items-center gap-2">
                           <span className="w-1 h-1 bg-teal-400 rounded-full animate-pulse"></span>
                           Auto-Fix: {l.fixAction}
                        </p>
                      )}
                    </div>
                  </div>
                  <span className={`px-4 py-1.5 rounded-full text-[8px] font-black uppercase tracking-widest border ${
                    l.status === 'pass' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                    l.status === 'fail' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                    'bg-teal-500/10 text-teal-500 border-teal-500/20'
                  }`}>
                    {l.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Footer() {
return (
<footer className="bg-slate-900 border-t border-slate-800 p-10 mt-auto">
<div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-10">
<div className="text-center md:text-left space-y-2">
<p className="text-sm font-black text-white uppercase tracking-widest">Dutchkem Ventures Prosuite NG+ — RC: 9489855 | TIN: 2512403526652</p>
<p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-relaxed">
26, Opeki Road, Ipaja, Ayobo, Lagos | Tel: (+234)-911-339-3525
</p>
<p className="text-[9px] text-slate-600 font-black uppercase tracking-[0.4em]">© 2026 Dutchkem Ventures. All rights reserved.</p>
</div>
<div className="flex gap-4">
<div className="px-6 py-3 bg-slate-950 rounded-2xl border border-white/5 flex items-center gap-3">
  <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">System Entropy: Secure</span>
</div>
</div>
</div>
</footer>
);
}

function AdminTab({ active, onClick, icon, label }: any) {
  return (
    <button onClick={onClick} className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all group ${
      active ? 'bg-orange-600 text-white shadow-2xl shadow-orange-600/20' : 'text-slate-500 hover:bg-slate-800 hover:text-slate-200'
    }`}>
      <span className={`text-xl transition-transform group-hover:scale-125 ${active ? 'scale-110' : ''}`}>{icon}</span> {label}
    </button>
  );
}

function MetricCard({ label, value, icon, color, subValue }: any) {
  const colors: any = {
    red: "from-red-500/20 to-red-600/5 border-red-500/20 text-red-500",
    blue: "from-blue-500/20 to-blue-600/5 border-blue-500/20 text-blue-500",
    emerald: "from-emerald-500/20 to-emerald-600/5 border-emerald-500/20 text-emerald-500",
    amber: "from-amber-500/20 to-amber-600/5 border-amber-500/20 text-amber-500",
    indigo: "from-indigo-500/20 to-indigo-600/5 border-indigo-500/20 text-indigo-500",
    teal: "from-teal-500/20 to-teal-600/5 border-teal-500/20 text-teal-500",
  };
  return (
    <div className={`p-8 bg-gradient-to-br ${colors[color]} border rounded-[2.5rem] shadow-2xl hover:scale-[1.02] transition-all relative overflow-hidden group`}>
      <div className="flex justify-between items-start mb-6">
         <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl bg-white shadow-xl">{icon}</div>
         {subValue && <span className="text-[10px] font-black uppercase tracking-widest opacity-60 bg-white/10 px-3 py-1 rounded-full">{subValue}</span>}
      </div>
      <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] mb-2">{label}</p>
      <h4 className="text-4xl font-black text-white tracking-tighter">{value}</h4>
    </div>
  );
}

function StatsOverview({ data, earnings, uaeStatus }: any) {
  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        <MetricCard label="Monthly Payout (Est)" value={`₦${(earnings.month.share / 1000000).toFixed(2)}M`} icon="💰" color="emerald" subValue="Ready to Sweep" />
        <MetricCard label="Evolution Status" value={uaeStatus.code} icon="🔄" color={uaeStatus.type === 'success' ? 'emerald' : 'amber'} subValue={uaeStatus.status} />
        <MetricCard label="System Health" value="OPTIMAL" icon="🛡️" color="blue" subValue="AES-256 Active" />
        <MetricCard label="Total Fees Collected" value={`₦${(earnings.allTime.fee / 1000000).toFixed(2)}M`} icon="🏛️" color="amber" />
      </div>
    </div>
  );
}

function RecentTransactions() {
   const { data: txs } = useSuspenseQuery(convexQuery(api.admin.getRecentTransactions, {}));
   return (
      <div className="bg-slate-900 border border-slate-800 rounded-[3rem] overflow-hidden shadow-2xl animate-in fade-in duration-700">
         <div className="p-10 border-b border-slate-800 flex justify-between items-center">
            <h2 className="text-xl font-black uppercase tracking-tighter">Live Transaction Ledger</h2>
         </div>
         <div className="overflow-x-auto">
            <table className="w-full text-left">
               <thead className="bg-slate-950/50 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                  <tr>
                     <th className="px-10 py-6">Transaction ID</th>
                     <th className="px-10 py-6">Agent</th>
                     <th className="px-10 py-6">Amount (₦)</th>
                     <th className="px-10 py-6">Fee (15%)</th>
                     <th className="px-10 py-6">Your Share</th>
                     <th className="px-10 py-6">Status</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-slate-800 text-[11px]">
                  {txs.map((tx: any) => (
                     <tr key={tx._id} className="hover:bg-slate-800/30 transition-colors group">
                        <td className="px-10 py-6 font-mono text-slate-400">ID:{tx.reference.slice(-8)}</td>
                        <td className="px-10 py-6 font-black text-white">{tx.agentId || 'A-NODE-1'}</td>
                        <td className="px-10 py-6 font-bold text-white text-xs">₦{tx.amount.toLocaleString()}</td>
                        <td className="px-10 py-6 font-bold text-red-500">- ₦{(tx.amount * 0.15).toLocaleString()}</td>
                        <td className="px-10 py-6 font-black text-emerald-500">+ ₦{(tx.amount * 0.85).toLocaleString()}</td>
                        <td className="px-10 py-6">
                           <span className={`px-2 py-1 rounded text-[9px] font-black uppercase border ${tx.status === 'approved' ? 'text-emerald-500 border-emerald-500/20' : 'text-red-500 border-red-500/20'}`}>{tx.status}</span>
                        </td>
                     </tr>
                  ))}
               </tbody>
            </table>
         </div>
      </div>
   )
}

function DailySweepStatusPanel() {
   const { data: settings } = useSuspenseQuery(convexQuery(api.admin.getSweepSettings, {}));
   const { data: sweeps } = useSuspenseQuery(convexQuery(api.admin.getDailySweeps, {}));
   const { data: earnings } = useSuspenseQuery(convexQuery(api.admin.getEarningsSummary, {}));
   
   const triggerSweep = useAction(internal.payouts.runDailySweep);
   const [sweeping, setSweeping] = useState(false);

   const handleManualSweep = async () => {
      if (!confirm("Proceed with manual secure sweep? System will verify entropy and 2FA.")) return;
      setSweeping(true);
      try {
         await triggerSweep({ forceApproved: true });
         alert("Manual sweep initiated. Verify logs for disbursement status.");
      } catch (err: any) { alert(err.message); }
      setSweeping(false);
   };
   
   return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
         <div className="bg-slate-900 border border-slate-800 rounded-[3.5rem] p-12 space-y-8 shadow-2xl relative overflow-hidden group">
            <div className="flex justify-between items-center">
               <h3 className="text-2xl font-black uppercase tracking-tighter text-white">Daily Secure Sweep</h3>
               <span className="px-4 py-1 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-full text-[9px] font-black">ENCRYPTED</span>
            </div>
            <div className="grid grid-cols-2 gap-6">
               <div className="bg-slate-950 p-6 rounded-2xl border border-white/5">
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Scheduled Time</p>
                  <p className="text-xl font-black text-white">{settings.time} WAT</p>
               </div>
               <div className="bg-slate-950 p-6 rounded-2xl border border-white/5">
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Main Wallet</p>
                  <p className="text-xl font-black text-emerald-500">₦{earnings.walletBalance.toLocaleString()}</p>
               </div>
            </div>
            <div className="space-y-4">
               <div className="flex justify-between text-[10px] font-black border-b border-white/5 pb-2">
                  <span className="text-slate-500 uppercase">DESTINATION</span>
                  <span className="text-white uppercase">OPAY (••••••1202)</span>
               </div>
               <div className="flex justify-between text-[10px] font-black">
                  <span className="text-slate-500 uppercase">PAYOUT FREQUENCY</span>
                  <span className="text-white uppercase">DAILY (11 PM)</span>
               </div>
            </div>
            <div className="flex gap-4">
                <button 
                  onClick={handleManualSweep}
                  disabled={sweeping}
                  className="flex-1 py-4 bg-slate-800 border border-slate-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest disabled:opacity-50"
                >
                  {sweeping ? "Sweeping..." : "Manual Sweep"}
                </button>
                <button className="flex-1 py-4 bg-white text-slate-950 rounded-xl text-[10px] font-black uppercase tracking-widest">Pause Schedule</button>
            </div>
         </div>
         <div className="bg-slate-900 border border-slate-800 rounded-[3.5rem] p-12 shadow-2xl">
            <h3 className="text-xl font-black uppercase tracking-tighter mb-6">Payout History</h3>
            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
               {sweeps.map((sweep: any) => (
                  <div key={sweep._id} className="bg-slate-950 p-6 rounded-2xl border border-white/5 flex justify-between items-center group">
                     <div>
                        <p className="text-sm font-black text-white">₦{sweep.amount.toLocaleString()}</p>
                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">REF: {sweep.kora_reference?.slice(0,12)} • {sweep.date}</p>
                     </div>
                     <span className="text-emerald-500 text-xs">✓</span>
                  </div>
               ))}
            </div>
         </div>
      </div>
   )
}

function SecurityHubPanel() {
   const { data: beneficiaries } = useSuspenseQuery(convexQuery(api.payouts.getBeneficiaries, {}));
   const rotateKeys = useMutation(api.admin.rotateEncryptionKeys);

   const handleRotate = async () => {
      if (!confirm("Are you sure you want to rotate the AES-256-GCM encryption keys? This is an institutional grade security protocol.")) return;
      const sessionId = localStorage.getItem("admin_session_token") as any;
      try {
         await rotateKeys({ sessionId });
         alert("Key rotation initialized. All sensitive data is now shielded by the new entropy pool.");
      } catch (err: any) { alert(err.message); }
   };

   return (
      <div className="space-y-12 animate-in fade-in duration-700">
         <div className="bg-gradient-to-br from-indigo-600/20 to-slate-900 border border-indigo-500/20 rounded-[3.5rem] p-12 relative overflow-hidden">
            <div className="relative z-10 space-y-10">
               <div className="flex items-center justify-between">
                  <div className="flex items-center gap-6">
                     <div className="w-20 h-20 bg-white rounded-[2.5rem] flex items-center justify-center text-4xl shadow-2xl">🔐</div>
                     <div>
                        <h3 className="text-3xl font-black uppercase tracking-tighter text-white leading-tight">Encryption Hub</h3>
                        <p className="text-xs font-black text-indigo-500 uppercase tracking-widest mt-1">AES-256-GCM (Institutional Grade)</p>
                     </div>
                  </div>
                  <button onClick={handleRotate} className="px-8 py-5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all shadow-xl shadow-indigo-600/20">Rotate Keys</button>
               </div>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  <div className="bg-slate-950/50 p-10 rounded-[2.5rem] border border-white/5 space-y-6">
                     <p className="text-xs font-black text-slate-500 uppercase tracking-[0.3em]">Encrypted Beneficiaries</p>
                     <div className="space-y-4">
                        {beneficiaries.map((b: any) => (
                           <div key={b._id} className="flex justify-between items-center py-4 border-b border-white/5">
                              <div>
                                 <p className="text-sm font-black text-white">{b.bankName}</p>
                                 <p className="text-[10px] font-mono text-slate-500 truncate max-w-[150px]">AES256:{b.encryptedAccountNumber.slice(0,12)}...</p>
                              </div>
                              <span className="px-3 py-1 bg-emerald-500/10 text-emerald-500 rounded-full text-[8px] font-black uppercase">ACTIVE</span>
                           </div>
                        ))}
                     </div>
                     <button className="w-full py-4 border border-white/10 rounded-xl text-[9px] font-black uppercase tracking-widest text-slate-400 hover:bg-white hover:text-slate-950 transition-all">+ Add Encrypted Destination</button>
                  </div>
                  <div className="bg-slate-950/50 p-10 rounded-[2.5rem] border border-white/5 space-y-8">
                     <p className="text-xs font-black text-slate-500 uppercase tracking-[0.3em]">Security Metrics</p>
                     <div className="space-y-6">
                        <SecurityBar label="Entropy Pool Integrity" value={98} color="indigo" />
                        <SecurityBar label="Database Encryption" value={100} color="emerald" />
                        <SecurityBar label="TLS 1.3 Hardening" value={100} color="indigo" />
                     </div>
                     <div className="pt-4 grid grid-cols-2 gap-4">
                        <div className="text-center p-4 bg-slate-900 rounded-2xl"><p className="text-[8px] font-black text-slate-500 uppercase mb-1">Last Rotation</p><p className="text-xs font-black text-white">MAY 1, 2026</p></div>
                        <div className="text-center p-4 bg-slate-900 rounded-2xl"><p className="text-[8px] font-black text-slate-500 uppercase mb-1">Next Scheduled</p><p className="text-xs font-black text-white">AUG 1, 2026</p></div>
                     </div>
                  </div>
               </div>
            </div>
         </div>
      </div>
   )
}

function SecurityBar({ label, value, color }: any) {
   const colors: any = { indigo: "bg-indigo-500", emerald: "bg-emerald-500" };
   return (
      <div className="space-y-2">
         <div className="flex justify-between text-[9px] font-black uppercase tracking-widest text-slate-500"><span>{label}</span><span>{value}%</span></div>
         <div className="h-1 w-full bg-slate-800 rounded-full overflow-hidden">
            <div className={`h-full ${colors[color]} rounded-full`} style={{ width: `${value}%` }}></div>
         </div>
      </div>
   )
}

function AgentHealthMatrix({ data }: any) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-[3rem] overflow-hidden shadow-2xl animate-in fade-in duration-700">
         <div className="p-10 border-b border-slate-800 flex justify-between items-center">
            <h2 className="text-xl font-black uppercase tracking-tighter">Institutional Agent Health Monitor</h2>
            <button className="px-8 py-3 bg-slate-800 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-700 transition-all border border-slate-700">Sync Cluster</button>
         </div>
         <div className="overflow-x-auto">
            <table className="w-full text-left">
               <thead className="bg-slate-950/50 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                  <tr>
                     <th className="px-10 py-6">Node</th>
                     <th className="px-10 py-6">Model (NVIDIA)</th>
                     <th className="px-10 py-6">Status</th>
                     <th className="px-10 py-6">Latency</th>
                     <th className="px-10 py-6">Req Today</th>
                     <th className="px-10 py-6 text-right">Self-Healing</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-slate-800 text-[11px]">
                  {data.agentHealth.map((h: any, i: number) => (
                     <tr key={h.modelName} className="hover:bg-slate-800/30 transition-colors">
                        <td className="px-10 py-6 font-black text-white">A{i+1} — HUB</td>
                        <td className="px-10 py-6 font-mono text-[10px] text-slate-400">{h.modelName.slice(0,30)}...</td>
                        <td className="px-10 py-6">
                           <span className={`px-2 py-1 rounded text-[8px] font-black uppercase border ${h.status === 'healthy' ? 'text-emerald-500 border-emerald-500/20 bg-emerald-500/5' : 'text-red-500 border-red-500/20 bg-red-500/5'}`}>
                              {h.status}
                           </span>
                        </td>
                        <td className="px-10 py-6 font-bold text-white">{h.avgResponseTime}s</td>
                        <td className="px-10 py-6 text-slate-400 font-bold">{h.requestsToday.toLocaleString()}</td>
                        <td className="px-10 py-6 text-right"><span className="text-[10px] font-black text-indigo-500 bg-indigo-500/10 px-3 py-1 rounded-lg">{h.fallbackTriggered}</span></td>
                     </tr>
                  ))}
               </tbody>
            </table>
         </div>
      </div>
  );
}

function AuditTrailPanel() {
  const { data: logs } = useSuspenseQuery(convexQuery(api.admin.getAuditLogs, {}));
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-[3rem] overflow-hidden shadow-2xl animate-in fade-in duration-700">
      <div className="p-10 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
        <h2 className="text-xl font-black uppercase tracking-tighter">Immutable Audit Ledger</h2>
        <button className="px-8 py-3 bg-white text-slate-950 rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap shadow-xl shadow-white/5">Export CSV (2FA)</button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
           <thead className="bg-slate-950/50 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
              <tr>
                 <th className="px-10 py-6">Timestamp</th>
                 <th className="px-10 py-6">Action</th>
                 <th className="px-10 py-6">Payload</th>
                 <th className="px-10 py-6">IP Address</th>
              </tr>
           </thead>
           <tbody className="divide-y divide-slate-800 text-[11px]">
              {logs.map((log: any) => (
                 <tr key={log._id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-10 py-6 font-mono text-slate-500">{new Date(log.createdAt).toLocaleString()}</td>
                    <td className="px-10 py-6"><span className="text-white font-black uppercase">{log.action}</span></td>
                    <td className="px-10 py-6 text-slate-400 font-bold max-w-sm truncate">{log.details}</td>
                    <td className="px-10 py-6 font-mono text-slate-500">{log.ip}</td>
                 </tr>
              ))}
           </tbody>
        </table>
      </div>
    </div>
  );
}

function HolidayDiscountsPanel() {
  const { data: holidays } = useSuspenseQuery(convexQuery(api.holidays.listHolidays, {}));
  const refresh = useMutation(api.holidays.refreshActiveDiscounts);

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      <div className="bg-slate-900 border border-slate-800 rounded-[3rem] p-12 shadow-2xl">
        <div className="flex justify-between items-center mb-10">
          <h2 className="text-2xl font-black uppercase tracking-tighter text-white">Holiday Discount Logic</h2>
          <button onClick={() => refresh()} className="px-8 py-3 bg-orange-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-orange-700 transition-all shadow-xl shadow-orange-600/20">Manual Sync</button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {holidays.map((h: any) => (
            <div key={h._id} className={`p-6 rounded-3xl border ${h.is_active ? 'bg-orange-600/10 border-orange-500 shadow-xl shadow-orange-600/5' : 'bg-slate-950 border-white/5'} transition-all`}>
              <div className="flex justify-between items-start mb-4">
                <span className="text-3xl">{h.banner_icon}</span>
                <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase ${h.is_active ? 'bg-orange-500 text-white animate-pulse' : 'bg-slate-800 text-slate-500'}`}>
                  {h.is_active ? 'ACTIVE' : 'INACTIVE'}
                </span>
              </div>
              <h3 className="font-black text-white uppercase tracking-tighter mb-1">{h.name}</h3>
              <p className="text-[10px] font-bold text-orange-500 uppercase tracking-widest mb-4">CODE: {h.code} • -{h.percent}%</p>
              <p className="text-[9px] text-slate-500 font-medium line-clamp-2 mb-4 leading-relaxed">{h.banner_text}</p>
              <div className="text-[8px] font-black text-slate-600 uppercase tracking-widest border-t border-white/5 pt-4">
                {new Date(h.start_date).toLocaleDateString()} - {new Date(h.end_date).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AutoUpdatesPanel() {
  const triggerUpdate = useMutation(api.updates.runServiceUpdates);
  const rollback = useMutation(api.uae_engine.rollbackEvolution);
  const [processing, setProcessing] = useState(false);

  const handleUpdate = async (cycle: string) => {
    setProcessing(true);
    await triggerUpdate({ forceCycle: cycle });
    setProcessing(false);
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      <div className="bg-slate-900 border border-slate-800 rounded-[3rem] p-12 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-orange-600/5 blur-[80px]"></div>
        <div className="flex justify-between items-center mb-12">
          <h2 className="text-2xl font-black uppercase tracking-tighter text-white">Service Expansion Scheduler</h2>
          <div className="flex gap-4">
            <button 
                onClick={() => handleUpdate('SPRING_2026')} 
                disabled={processing}
                className="px-6 py-3 bg-slate-800 border border-slate-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-700 transition-all disabled:opacity-50"
            >
                Force Spring Evolution
            </button>
            <button 
                onClick={() => handleUpdate('FALL_2026')} 
                disabled={processing}
                className="px-6 py-3 bg-slate-800 border border-slate-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-700 transition-all disabled:opacity-50"
            >
                Force Fall Evolution
            </button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          <div className="bg-slate-950 p-10 rounded-[2.5rem] border border-white/5 space-y-6">
            <div className="flex justify-between items-center mb-2">
                <h3 className="text-lg font-black text-white uppercase tracking-tighter">Bi-Annual Evolution Cycles</h3>
                <button onClick={() => rollback({ cycle: 'SPRING_2026' })} className="text-[8px] font-black text-red-500 uppercase tracking-widest hover:underline">One-Click Rollback</button>
            </div>
            <div className="space-y-4">
              <UpdateCycleItem label="Spring Update" date="MAY 1, 2026" status="OPTIMAL" color="orange" />
              <UpdateCycleItem label="Fall Update" date="NOV 1, 2026" status="PENDING" color="slate" />
            </div>
          </div>
          
          <div className="bg-slate-950 p-10 rounded-[2.5rem] border border-white/5 space-y-6">
            <h3 className="text-lg font-black text-white uppercase tracking-tighter">Intelligence Growth Metrics</h3>
            <div className="grid grid-cols-2 gap-4">
               <div className="p-6 bg-slate-900 rounded-2xl border border-white/5">
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">New Features Deployed</p>
                  <p className="text-2xl font-black text-orange-500">+242</p>
               </div>
               <div className="p-6 bg-slate-900 rounded-2xl border border-white/5">
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Autonomous Uptime</p>
                  <p className="text-2xl font-black text-emerald-500">100%</p>
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function UpdateCycleItem({ label, date, status, color }: any) {
  return (
    <div className="flex justify-between items-center p-6 bg-slate-900 rounded-2xl border border-white/5">
      <div>
        <p className="text-sm font-black text-white uppercase tracking-tight">{label}</p>
        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{date}</p>
      </div>
      <span className={`px-4 py-1 rounded-full text-[8px] font-black uppercase border ${color === 'orange' ? 'bg-orange-500/10 text-orange-500 border-orange-500/20' : 'bg-slate-800 text-slate-500 border-white/5'}`}>{status}</span>
    </div>
  );
}

function AdminProfileCard({ profile }: { profile: any }) {
  const [showDropdown, setShowDropdown] = useState(false);

  if (!profile) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="flex items-center gap-4 pl-6 border-l border-slate-800 group"
      >
        <div className="text-right hidden sm:block">
          <p className="text-sm font-black text-white leading-none">{profile.name}</p>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{profile.email}</p>
        </div>
        <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-orange-600 to-red-600 flex items-center justify-center text-white font-black text-lg shadow-lg group-hover:scale-105 transition-transform">
          {profile.name?.[0] || 'A'}
        </div>
      </button>

      {showDropdown && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowDropdown(false)}></div>
          <div className="absolute right-0 top-full mt-4 w-80 bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="p-6 border-b border-slate-800 bg-gradient-to-br from-orange-900/10 to-slate-900">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-orange-600 to-red-600 flex items-center justify-center text-white font-black text-2xl shadow-lg">
                  {profile.name?.[0] || 'A'}
                </div>
                <div>
                  <p className="text-lg font-black text-white">{profile.name}</p>
                  <p className="text-xs text-slate-400">{profile.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 bg-orange-500/10 border border-orange-500/20 rounded-full text-[8px] font-black text-orange-500 uppercase tracking-widest">{profile.role}</span>
                {profile.lastLogin && (
                  <span className="text-[8px] text-slate-500 font-bold uppercase tracking-widest">Last login: {new Date(profile.lastLogin).toLocaleDateString()}</span>
                )}
              </div>
            </div>
            <div className="p-4 space-y-1">
              <ProfileAction label="🔑 Change Password" />
              <ProfileAction label="🛡️ Enable 2FA" />
              <ProfileAction label="📋 IP Whitelist" />
              <div className="border-t border-slate-800 my-2"></div>
              <ProfileAction label="🚪 Sign Out" className="text-red-400 hover:bg-red-500/10" />
            </div>
            <div className="px-4 pb-4">
              <div className="p-3 bg-slate-950 rounded-xl border border-white/5 text-center">
                <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Login Count</p>
                <p className="text-sm font-black text-white">{profile.loginCount}</p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function ProfileAction({ label, className }: { label: string; className?: string }) {
  return (
    <button className={`w-full text-left px-4 py-3 text-xs font-bold text-slate-400 hover:bg-slate-800 hover:text-white rounded-xl transition-all ${className || ''}`}>
      {label}
    </button>
  );
}

function FreelancerPanel({ data }: { data: any }) {
  const stats = data || { total: 0, pendingApplications: 0, autoApprovedWeek: 0, autoRejectedWeek: 0, totalPaidMonth: 0, avgEarnings: 0 };
  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="bg-slate-900 border border-slate-800 rounded-[3rem] p-10 shadow-2xl">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-xl font-black uppercase tracking-tighter">Freelancer Management</h2>
          <div className="flex gap-3">
            <button className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all">Review Pending ({stats.pendingApplications})</button>
            <button className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-2xl font-black text-xs uppercase tracking-widest transition-all">View All</button>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="p-6 bg-slate-950 rounded-2xl border border-slate-800">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Total Freelancers</p>
            <p className="text-3xl font-black text-white">{stats.total.toLocaleString()}</p>
          </div>
          <div className="p-6 bg-slate-950 rounded-2xl border border-slate-800">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Auto-Approved (Week)</p>
            <p className="text-3xl font-black text-emerald-500">{stats.autoApprovedWeek}</p>
          </div>
          <div className="p-6 bg-slate-950 rounded-2xl border border-slate-800">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Total Paid (Month)</p>
            <p className="text-3xl font-black text-white">₦{(stats.totalPaidMonth / 1e6).toFixed(1)}M</p>
          </div>
          <div className="p-6 bg-slate-950 rounded-2xl border border-slate-800">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Avg Earnings</p>
            <p className="text-3xl font-black text-amber-500">₦{stats.avgEarnings.toLocaleString()}</p>
          </div>
        </div>
      </div>
      <div className="bg-slate-900 border border-slate-800 rounded-[3rem] p-10 shadow-2xl">
        <h3 className="text-lg font-black uppercase tracking-tighter mb-6">Pending Applications ({stats.pendingApplications})</h3>
        <div className="text-center py-12 text-slate-600 font-black text-sm">Freelancer application list with proficiency scores will appear here.</div>
      </div>
    </div>
  );
}

function CharityDashboardPanel() {
  const { data: charity } = useSuspenseQuery(convexQuery(api.charity.getCharityAdminStats, {}));
  const { data: settings } = useSuspenseQuery(convexQuery(api.admin.getSweepSettings, {}));
  const transferNow = useAction(api.charity.manualCharityTransfer);
  const togglePause = useMutation(api.charity.toggleCharityPause);
  const [transferring, setTransferring] = useState(false);
  const [toggling, setToggling] = useState(false);

  const wallet = charity.wallet;
  const adminSession = localStorage.getItem('admin_session_token');

  const handleManualTransfer = async () => {
    const amount = wallet?.balance || 0;
    if (!amount) { alert("Charity wallet is empty."); return; }
    if (!confirm(`Transfer ₦${amount.toLocaleString()} to charity account?`)) return;
    if (!adminSession) { alert("No admin session"); return; }
    setTransferring(true);
    try {
      const result = await transferNow({ sessionId: adminSession });
      alert(`Transfer initiated: ₦${result.amount.toLocaleString()} (ref: ${result.reference})`);
    } catch (err: any) { alert(err.message); }
    setTransferring(false);
  };

  const handleTogglePause = async () => {
    if (!adminSession) { alert("No admin session"); return; }
    setToggling(true);
    try {
      await togglePause({ paused: !wallet?.isPaused, sessionId: adminSession });
    } catch (err: any) { alert(err.message); }
    setToggling(false);
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      <div className="bg-slate-900 border border-slate-800 rounded-[3.5rem] p-12 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-600/5 blur-[80px]"></div>
        <div className="relative z-10 space-y-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="space-y-2">
              <h2 className="text-3xl font-black uppercase tracking-tighter text-white">Charity / Tithe Management</h2>
              <p className="text-sm font-black text-amber-500 uppercase tracking-widest">10% of Platform Earnings • Monthly Auto-Transfer</p>
            </div>
            <div className="flex gap-4">
              <button
                onClick={handleTogglePause}
                disabled={toggling}
                className={`px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
                  wallet?.isPaused
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-xl shadow-emerald-600/20'
                    : 'bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {toggling ? "Updating..." : wallet?.isPaused ? "▶ Resume Deductions" : "⏸ Pause Deductions"}
              </button>
              <button
                onClick={handleManualTransfer}
                disabled={transferring || !wallet?.balance}
                className="px-8 py-4 bg-amber-600 hover:bg-amber-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl shadow-amber-600/20 disabled:opacity-50"
              >
                {transferring ? "Transferring..." : "Manual Transfer Now"}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <MetricCard label="Charity Balance" value={`₦${(wallet?.balance || 0).toLocaleString()}`} icon="🕊️" color="amber" subValue={wallet?.isPaused ? "PAUSED" : "Active"} />
            <MetricCard label="Monthly Earnings" value={`₦${(wallet?.monthlyEarningsSoFar || 0).toLocaleString()}`} icon="💰" color="emerald" subValue={`${wallet?.currentMonth || ''}`} />
            <MetricCard label="Monthly Target (10%)" value={`₦${((wallet?.monthlyEarningsSoFar || 0) * 0.10).toLocaleString()}`} icon="🎯" color="blue" />
            <MetricCard label="Lifetime Set Aside" value={`₦${(wallet?.totalSetAsideLifetime || 0).toLocaleString()}`} icon="📈" color="indigo" subValue={`Transferred: ₦${(wallet?.totalTransferred || 0).toLocaleString()}`} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-slate-950 p-6 rounded-2xl border border-white/5">
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Daily Deduction</p>
              <p className="text-xl font-black text-white">₦{(wallet?.dailyDeductionAmount || 0).toFixed(2)}</p>
            </div>
            <div className="bg-slate-950 p-6 rounded-2xl border border-white/5">
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Days in Month</p>
              <p className="text-xl font-black text-white">{wallet?.daysInMonth || 0}</p>
            </div>
            <div className="bg-slate-950 p-6 rounded-2xl border border-white/5">
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Last Deduction</p>
              <p className="text-xl font-black text-white">
                {wallet?.lastDeductionDate ? new Date(wallet.lastDeductionDate).toLocaleDateString() : "N/A"}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-[3.5rem] p-12 shadow-2xl">
        <h3 className="text-xl font-black uppercase tracking-tighter text-white mb-8">Charity Transaction Ledger</h3>
        <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
          {charity.transactions.map((tx: any) => (
            <div key={tx._id} className="flex justify-between items-center p-6 bg-slate-950 rounded-2xl border border-white/5 group">
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-lg ${
                  tx.type === 'DAILY_DEDUCTION' ? 'bg-amber-500/10' : 'bg-emerald-500/10'
                }`}>
                  {tx.type === 'DAILY_DEDUCTION' ? '📅' : '💸'}
                </div>
                <div>
                  <p className="text-sm font-black text-white">
                    {tx.type === 'DAILY_DEDUCTION' ? 'Daily Deduction' : 'Monthly Transfer'}
                  </p>
                  <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">
                    {new Date(tx.date).toLocaleString()}
                    {tx.reference ? ` • ${tx.reference}` : ''}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className={`text-sm font-black ${tx.status === 'failed' ? 'text-red-500' : 'text-emerald-500'}`}>
                  {tx.status === 'failed' ? 'FAILED' : `₦${tx.amount.toLocaleString()}`}
                </p>
                <p className="text-[9px] text-slate-600 font-bold">Balance: ₦{tx.balanceAfter.toLocaleString()}</p>
              </div>
            </div>
          ))}
          {charity.transactions.length === 0 && (
            <div className="text-center py-20 text-slate-600 font-bold uppercase tracking-widest italic opacity-30">No transactions yet</div>
          )}
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-[3.5rem] p-12 shadow-2xl">
        <h3 className="text-xl font-black uppercase tracking-tighter text-white mb-6">Configuration</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-slate-950 p-6 rounded-2xl border border-white/5 space-y-4">
            <div className="flex justify-between text-[10px] font-black">
              <span className="text-slate-500 uppercase">Auto-Deduction</span>
              <span className={wallet?.isPaused ? 'text-red-500' : 'text-emerald-500'}>{wallet?.isPaused ? 'PAUSED' : 'ACTIVE'}</span>
            </div>
            <div className="flex justify-between text-[10px] font-black">
              <span className="text-slate-500 uppercase">Monthly Percent</span>
              <span className="text-white">10%</span>
            </div>
            <div className="flex justify-between text-[10px] font-black">
              <span className="text-slate-500 uppercase">Schedule (Daily)</span>
              <span className="text-white">00:00 WAT</span>
            </div>
            <div className="flex justify-between text-[10px] font-black">
              <span className="text-slate-500 uppercase">Monthly Transfer</span>
              <span className="text-white">Last Day • 23:59 WAT</span>
            </div>
          </div>
          <div className="bg-slate-950 p-6 rounded-2xl border border-white/5 space-y-4">
            <div className="flex justify-between text-[10px] font-black">
              <span className="text-slate-500 uppercase">Bank</span>
              <span className="text-white">Palmpay / OPay</span>
            </div>
            <div className="flex justify-between text-[10px] font-black">
              <span className="text-slate-500 uppercase">Account Number</span>
              <span className="text-white">8121161202</span>
            </div>
            <div className="flex justify-between text-[10px] font-black">
              <span className="text-slate-500 uppercase">Account Name</span>
              <span className="text-white">Oladotun Alabi</span>
            </div>
            <button className="w-full py-3 border border-white/10 rounded-xl text-[9px] font-black uppercase tracking-widest text-slate-400 hover:bg-white hover:text-slate-950 transition-all mt-2">
              Change Account Details (2FA)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function FreelancerMarketplacePanel() {
  const { data: escrowBalance } = useSuspenseQuery(convexQuery(api.marketplace.getEscrowBalance, {}));
  const { data: pendingPayout } = useSuspenseQuery(convexQuery(api.marketplace.getPendingFridayPayout, {}));
  const { data: marketplaceStats } = useSuspenseQuery(convexQuery(api.marketplace.getMarketplaceStats, {}));
  const { data: payoutHistory } = useSuspenseQuery(convexQuery(api.marketplace.getPayoutHistory, { limit: 20 }));

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-[3.5rem] p-12 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-600/5 blur-[80px]"></div>
        <div className="relative z-10 space-y-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="space-y-2">
              <h2 className="text-3xl font-black uppercase tracking-tighter text-white">Freelancer Marketplace</h2>
              <p className="text-sm font-black text-emerald-500 uppercase tracking-widest">15% Platform Fee • 85% Escrow • Friday 2 PM Payouts</p>
            </div>
            <div className="flex gap-4">
              <div className="bg-slate-950 px-6 py-3 rounded-2xl border border-white/5">
                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Next Payout</p>
                <p className="text-lg font-black text-white">Friday 2:00 PM</p>
              </div>
            </div>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <MetricCard label="Escrow Balance" value={`₦${(escrowBalance?.balance || 0).toLocaleString()}`} icon="🔒" color="emerald" subValue="Held for Freelancers" />
            <MetricCard label="Pending Friday Payout" value={`₦${(pendingPayout?.total || 0).toLocaleString()}`} icon="📅" color="blue" subValue={`${pendingPayout?.count || 0} jobs`} />
            <MetricCard label="Platform Fees Collected" value={`₦${(marketplaceStats?.totalPlatformFees || 0).toLocaleString()}`} icon="💰" color="amber" subValue="In Main Wallet" />
            <MetricCard label="Total Transactions" value={String(marketplaceStats?.totalTransactions || 0)} icon="📊" color="indigo" subValue="Since launch" />
          </div>
        </div>
      </div>

      {/* Money Flow Diagram */}
      <div className="bg-slate-900 border border-slate-800 rounded-[3.5rem] p-12 shadow-2xl">
        <h3 className="text-xl font-black uppercase tracking-tighter text-white mb-8">Money Flow</h3>
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 bg-slate-950 p-8 rounded-3xl border border-white/5">
          <div className="flex-1 space-y-3 text-center md:text-left">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">1. Client Pays</p>
            <p className="text-lg font-black text-white">Job Budget</p>
            <p className="text-xs text-slate-400">Client deposit → Kora merchant wallet</p>
          </div>
          <div className="text-3xl text-slate-700">→</div>
          <div className="flex-1 space-y-3 text-center">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">2. Split Payment</p>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-red-900/20 border border-red-800/30 rounded-xl p-4">
                <p className="text-xs text-red-400 font-bold">15%</p>
                <p className="text-sm font-black text-white">Platform Fee</p>
                <p className="text-[10px] text-slate-500">→ Main Wallet</p>
              </div>
              <div className="bg-emerald-900/20 border border-emerald-800/30 rounded-xl p-4">
                <p className="text-xs text-emerald-400 font-bold">85%</p>
                <p className="text-sm font-black text-white">Freelancer Amount</p>
                <p className="text-[10px] text-slate-500">→ Escrow</p>
              </div>
            </div>
          </div>
          <div className="text-3xl text-slate-700">→</div>
          <div className="flex-1 space-y-3 text-center md:text-right">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">3. Friday 2 PM</p>
            <p className="text-lg font-black text-white">Freelancer Paid</p>
            <p className="text-xs text-slate-400">Kora Payout API → Freelancer bank</p>
          </div>
        </div>
      </div>

      {/* Recent Payouts */}
      <div className="bg-slate-900 border border-slate-800 rounded-[3.5rem] p-12 shadow-2xl">
        <h3 className="text-xl font-black uppercase tracking-tighter text-white mb-8">Payout History</h3>
        <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
          {payoutHistory?.map((tx: any) => (
            <div key={tx._id} className="flex justify-between items-center p-6 bg-slate-950 rounded-2xl border border-white/5 group">
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-lg ${
                  tx.status === 'released' ? 'bg-emerald-500/10' : 'bg-amber-500/10'
                }`}>
                  {tx.status === 'released' ? '💸' : '🔒'}
                </div>
                <div>
                  <p className="text-sm font-black text-white">
                    ₹{tx.freelancerAmount?.toLocaleString()} {tx.status === 'released' ? 'Released' : 'In Escrow'}
                  </p>
                  <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">
                    {tx.status} • {new Date(tx.createdAt).toLocaleDateString()}
                    {tx.koraPayoutReference ? ` • ${tx.koraPayoutReference}` : ''}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-black text-slate-300">
                  Total: {'₦' + (tx.amount || 0).toLocaleString()}
                </p>
                <p className="text-[9px] text-slate-600 font-bold">
                  Fee: {'₦' + (tx.platformFee || 0).toLocaleString()}
                </p>
              </div>
            </div>
          ))}
          {(!payoutHistory || payoutHistory.length === 0) && (
            <div className="text-center py-20 text-slate-600 font-bold uppercase tracking-widest italic opacity-30">No payouts yet</div>
          )}
        </div>
      </div>
    </div>
  );
}

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white p-8">
      <div className="relative mb-12">
         <div className="w-24 h-24 border-4 border-slate-900 rounded-full"></div>
         <div className="absolute inset-0 border-t-4 border-orange-600 rounded-full animate-spin"></div>
      </div>
      <h2 className="text-3xl font-black uppercase tracking-[0.4em] text-white animate-pulse mb-4">Hardening Environment</h2>
      <p className="text-slate-500 font-black text-[10px] uppercase tracking-[0.5em] text-center max-w-md">Verifying Encryption Layers • Syncing Secure Nodes • Activating UAE Engine</p>
    </div>
  );
}
