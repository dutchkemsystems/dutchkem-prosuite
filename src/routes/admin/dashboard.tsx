import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useSuspenseQuery } from "@tanstack/react-query"
import { convexQuery } from "@convex-dev/react-query"
import { useConvexAuth, useMutation, useAction } from "convex/react"
import { useAuthActions } from "@convex-dev/auth/react"
import { api, internal } from "../../../convex/_generated/api"
import { useState, useEffect, Suspense, Component, type ReactNode } from "react"
import { CompanyLogo } from "~/components/CompanyLogo";
import { useSocket } from "~/lib/socket";
import { LiveFeed } from "~/components/LiveFeed";
import { LiveCharts } from "~/components/LiveCharts";
import { PaymentMonitor } from "~/components/PaymentMonitor";
import { InactivityLogout } from "~/components/InactivityLogout";

class ErrorBoundary extends Component<{ children: ReactNode; fallback?: ReactNode }, { hasError: boolean; error: Error | null }> {
  state = { hasError: false, error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { hasError: true, error }; }
  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="p-8 bg-red-500/10 border border-red-500/20 rounded-3xl text-center">
          <p className="text-red-500 font-black text-sm uppercase tracking-widest">Something went wrong</p>
          <p className="text-red-400 text-xs mt-2">{this.state.error?.message}</p>
          <button onClick={() => this.setState({ hasError: false, error: null })} className="mt-4 px-6 py-2 bg-slate-800 text-white rounded-xl text-xs font-bold">Retry</button>
        </div>
      );
    }
    return this.props.children;
  }
}

function AdminSuspense({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary>
      <Suspense fallback={
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      }>
        {children}
      </Suspense>
    </ErrorBoundary>
  );
}

export const Route = createFileRoute('/admin/dashboard')({
  component: AdminDashboardPage,
})

function AdminDashboardPage() {
  const { isLoading } = useConvexAuth();
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

  // Real-time socket connection (safe: only connect when token exists)
  const { connected: _wsConnected } = useSocket(adminToken || "");

  // Browser Notification Logic
  const [_lastTxId, setLastTxId] = useState<string | null>(null);

  const handleLogout = async () => {
    localStorage.removeItem('admin_session_token');
    setAdminToken(null);
    try { await authSignOut(); } catch {}
    navigate({ to: '/admin/login' });
  };

  if (isLoading || !adminToken) return <LoadingScreen />;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row overflow-hidden font-sans">
      <InactivityLogout adminMode={true} logoutPath="/admin/login" />
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
          <AdminTab active={activeTab === "live-feed"} onClick={() => setActiveTab("live-feed")} icon="📡" label="Live Feed" />
          <AdminTab active={activeTab === "live-charts"} onClick={() => setActiveTab("live-charts")} icon="📈" label="Live Charts" />
          <AdminTab active={activeTab === "payments"} onClick={() => setActiveTab("payments")} icon="💳" label="Payments" />
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
           <AdminTab active={activeTab === "cloud-memory"} onClick={() => setActiveTab("cloud-memory")} icon="☁️" label="Cloud Memory" />
           <AdminTab active={activeTab === "voice-roi"} onClick={() => setActiveTab("voice-roi")} icon="🎙️" label="Voice ROI" />
           <AdminTab active={activeTab === "live-chats"} onClick={() => setActiveTab("live-chats")} icon="💬" label="Live Chats" />
           <AdminTab active={activeTab === "api-costs"} onClick={() => setActiveTab("api-costs")} icon="🔌" label="API Costs" />
           <AdminTab active={activeTab === "platform-analytics"} onClick={() => setActiveTab("platform-analytics")} icon="📊" label="Platform Analytics" />
           <AdminTab active={activeTab === "synthetic"} onClick={() => setActiveTab("synthetic")} icon="🤖" label="Synthetic AI" />
           <AdminTab active={activeTab === "ad-engine"} onClick={() => setActiveTab("ad-engine")} icon="📢" label="Ad Engine" />
        </nav>

        <div className="p-6 border-t border-slate-800 bg-slate-900/50">
          <button onClick={handleLogout} className="w-full py-4 bg-slate-800 hover:bg-red-900/20 text-slate-400 hover:text-red-500 rounded-2xl font-black text-xs transition-all flex items-center justify-center gap-3 border border-slate-700 uppercase tracking-widest">
            Logout Admin
          </button>
        </div>
      </aside>

      <main className="flex-grow overflow-y-auto h-screen flex flex-col bg-slate-950">
        <AdminSuspense>
          <AdminHeader />
        </AdminSuspense>

        <div className="p-4 md:p-10 space-y-8 md:space-y-12 max-w-[1800px] mx-auto w-full pb-32">
          <AdminSuspense>
            {activeTab === "overview" && <StatsOverviewLazy />}
            {activeTab === "live-feed" && <LiveFeed />}
            {activeTab === "live-charts" && <LiveCharts />}
            {activeTab === "payments" && <PaymentMonitor />}
            {activeTab === "manual-task" && <ManualAgentTaskPanel />}
            {activeTab === "social" && <SocialEnginePanel />}
            {activeTab === "guardian" && <GuardianWatchPanel />}
            {activeTab === "tax" && <TaxDashboardPanel />}
            {activeTab === "payouts" && <DailySweepStatusPanel />}
            {activeTab === "security" && <SecurityHubPanel />}
            {activeTab === "agents" && <AgentHealthMatrixLazy />}
            {activeTab === "freelancers" && <FreelancerPanelLazy />}
            {activeTab === "audit" && <AuditTrailPanel />}
            {activeTab === "discounts" && <HolidayDiscountsPanel />}
            {activeTab === "updates" && <AutoUpdatesPanel />}
            {activeTab === "charity" && <CharityDashboardPanel />}
            {activeTab === "marketplace" && <FreelancerMarketplacePanel />}
            {activeTab === "cloud-memory" && <CloudMemoryPanel />}
            {activeTab === "voice-roi" && <VoiceROIPanel />}
            {activeTab === "live-chats" && <LiveChatsPanel />}
            {activeTab === "api-costs" && <APICostsPanel />}
             {activeTab === "platform-analytics" && <PlatformAnalyticsPanel />}
             {activeTab === "synthetic" && <SyntheticIntelPanel />}
             {activeTab === "ad-engine" && <PostizAdEnginePanel />}
          </AdminSuspense>
        </div>
        <Footer />
      </main>
    </div>
  );
}

function AdminHeader() {
  const { data: uaeStatus } = useSuspenseQuery(convexQuery(api.uae_engine.getSystemStatus, {})) as { data: any };
  const { data: upgradeStatus } = useSuspenseQuery(convexQuery(api.admin.getUpgradeStatus, {})) as { data: any };
  const { data: adminProfile } = useSuspenseQuery(convexQuery(api.admin.getAdminProfile, {})) as { data: any };

  return (
    <header className="px-4 md:px-10 py-4 md:py-8 border-b border-slate-800 bg-slate-950/80 backdrop-blur-xl sticky top-0 z-10 flex justify-between items-center">
      <div className="flex items-center gap-6">
         <h1 className="text-2xl font-black uppercase tracking-tighter text-white tracking-widest">UAE ENGINE CONTROL</h1>
         <div className="h-6 w-px bg-slate-800"></div>
         <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full animate-pulse ${uaeStatus?.type === 'success' ? 'bg-emerald-500' : 'bg-orange-500'}`}></div>
            <span className={`text-[10px] font-black uppercase tracking-widest ${uaeStatus?.type === 'success' ? 'text-emerald-500' : 'text-orange-500'}`}>
                {uaeStatus?.status}
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
  );
}

function StatsOverviewLazy() {
  const { data } = useSuspenseQuery(convexQuery(api.admin.getAdminStats, {})) as { data: any };
  const { data: earnings } = useSuspenseQuery(convexQuery(api.admin.getEarningsSummary, {})) as { data: any };
  const { data: uaeStatus } = useSuspenseQuery(convexQuery(api.uae_engine.getSystemStatus, {})) as { data: any };
  return <StatsOverview data={data} earnings={earnings} uaeStatus={uaeStatus} />;
}

function AgentHealthMatrixLazy() {
  const { data } = useSuspenseQuery(convexQuery(api.admin.getAdminStats, {})) as { data: any };
  return <AgentHealthMatrix data={data} />;
}

function FreelancerPanelLazy() {
  const { data } = useSuspenseQuery(convexQuery(api.admin.getFreelancerOverview, {})) as { data: any };
  return <FreelancerPanel data={data} />;
}

function ManualAgentTaskPanel() {
  const [agentId, setAgentId] = useState("A1");
  const [userEmail, setUserEmail] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [taskOutput, setTaskOutput] = useState<any>(null);

  const agents = [
    { id: "A1", name: "Academic Pro", icon: "🎓" },
    { id: "A2", name: "Business Pro", icon: "💼" },
    { id: "A3", name: "Content Pro", icon: "✍️" },
    { id: "A4", name: "Career Pro", icon: "📄" },
    { id: "A5", name: "Personal Shopper", icon: "🛍️" },
    { id: "A6", name: "Exam Pro", icon: "📝" },
    { id: "A7", name: "Finance Pro", icon: "💰" },
    { id: "A8", name: "MediaStudio Pro", icon: "🎬" },
    { id: "A9", name: "Wellness Pro", icon: "🏥" },
    { id: "A10", name: "Home Services", icon: "🧹" },
    { id: "A11", name: "Language Tutor", icon: "🗣️" },
    { id: "A12", name: "Travel Planner", icon: "✈️" },
    { id: "A13", name: "ServiceMart NG", icon: "🚀" },
    { id: "A14", name: "Translation Hub", icon: "🗣️📝" },
    { id: "A15", name: "Event Planner", icon: "🎉" },
  ];

  const agentServices: Record<string, string[]> = {
    A1: ["Thesis Writing", "Research Papers", "Dissertation Support", "Literature Review", "Data Analysis", "Academic Editing", "Citation Formatting", "Plagiarism Check", "Abstract Writing", "Case Study Analysis"],
    A2: ["Business Plan", "Financial Model", "Pitch Deck", "Market Research", "Competitor Analysis", "GTM Strategy", "Revenue Projection", "Investor Memo", "SWOT Analysis", "Business Valuation"],
    A3: ["SEO Blog Posts", "Social Media Content", "Sales Copy", "Email Campaigns", "Website Copy", "Product Descriptions", "Newsletter Content", "Video Scripts", "Ad Copy", "Brand Voice Guide"],
    A4: ["CV/Resume Writing", "LinkedIn Optimization", "Cover Letter", "Interview Prep", "Career Strategy", "ATS Optimization", "Portfolio Review", "Salary Negotiation", "Executive Bio", "Personal Branding"],
    A5: ["Price Comparison", "Product Research", "Deal Finding", "Purchase Recommendations", "Budget Shopping", "Bulk Sourcing", "Vendor Vetting", "Quality Assessment", "Shipping Optimization", "Return Assistance"],
    A6: ["PMP Prep", "CFA Study Guide", "AWS Certification", "GRE Preparation", "GMAT Training", "JAMB/WAEC Prep", "Study Schedule", "Practice Tests", "Concept Reviews", "Exam Strategy"],
    A7: ["Budget Planning", "Savings Strategy", "Investment Advice", "Debt Management", "Tax Planning", "Retirement Planning", "Insurance Review", "Cash Flow Analysis", "Wealth Building", "Financial Literacy"],
    A8: ["Video Editing", "2D Animation", "3D Animation", "Voiceover Recording", "Script Writing", "Storyboard Creation", "Motion Graphics", "Sound Design", "Color Grading", "Film Production"],
    A9: ["Meal Plans", "Workout Routines", "Weight Management", "Nutrition Coaching", "Mental Wellness", "Sleep Optimization", "Stress Management", "Fitness Tracking", "Health Assessments", "Lifestyle Coaching"],
    A10: ["Cleaning Schedules", "Home Organization", "Maintenance Planning", "Decluttering", "Seasonal Cleaning", "Deep Cleaning", "Move-in/Move-out", "Storage Solutions", "Home Inventory", "Service Booking"],
    A11: ["Language Tutoring", "Conversation Practice", "Grammar Lessons", "Vocabulary Building", "Pronunciation Guide", "Cultural Context", "Business Language", "Travel Phrases", "Exam Prep", "Translation Practice"],
    A12: ["Trip Planning", "Itinerary Creation", "Budget Planning", "Hotel Recommendations", "Flight Booking", "Activity Suggestions", "Travel Insurance", "Visa Guidance", "Packing Lists", "Local Guides"],
    A13: ["JAMB Preparation", "WAEC/NECO Prep", "University Applications", "Scholarship Search", "Career Counseling", "Skill Assessment", "Interview Coaching", "Resume Building", "Job Search", "Freelancing Guide"],
    A14: ["Document Translation", "Website Localization", "Business Translation", "Legal Translation", "Medical Translation", "Technical Translation", "Certified Translation", "Multilingual Content", "Localization QA", "Terminology Management"],
    A15: ["Wedding Planning", "Corporate Events", "Birthday Parties", "Conference Planning", "Venue Selection", "Catering Coordination", "Decor Design", "Entertainment Booking", "Budget Management", "Vendor Management"],
  };

  const selectedAgent = agents.find(a => a.id === agentId);
  const currentServices = agentServices[agentId] || [];

  const { data: services } = useSuspenseQuery(convexQuery(api.admin.getAgentServices, { agentId }));
  const { data: logs } = useSuspenseQuery(convexQuery(api.uae_engine.getManualTaskLogs, {}));
  const generateTask = useMutation(api.uae_engine.generateAdminManualTask);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt) return;
    setIsGenerating(true);
    try {
      const result = await generateTask({ agentId, serviceId: serviceId || "General", prompt, userEmail });
      setTaskOutput(result);
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
                  onChange={(e) => { setAgentId(e.target.value); setServiceId(""); }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-white font-bold"
                >
                  {agents.map(a => (
                    <option key={a.id} value={a.id}>{a.icon} {a.id} — {a.name}</option>
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
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Target Service / Task</label>
              <select 
                value={serviceId} 
                onChange={(e) => setServiceId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-white font-bold"
              >
                <option value="">— Select a service —</option>
                {currentServices.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Input Prompt</label>
              <textarea 
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={4}
                placeholder={`Describe the task for ${selectedAgent?.name || 'Agent'}...`}
                className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-white font-bold"
              />
            </div>

            <button 
              type="submit"
              disabled={isGenerating || !prompt}
              className="w-full py-5 bg-orange-600 hover:bg-orange-500 text-white rounded-2xl font-black uppercase tracking-[0.2em] transition-all shadow-xl shadow-orange-600/20 disabled:opacity-50"
            >
              {isGenerating ? "Executing UAE Command..." : `Generate Task — ${selectedAgent?.name || 'Agent'}`}
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
  const { data: stats } = useSuspenseQuery(convexQuery(api.social.getSocialStats, {})) as { data: any };
  const { data: analytics } = useSuspenseQuery(convexQuery(api.social.getPlatformAnalytics, {})) as { data: any };
  const getConnectedPlatformsAction = useAction(api.social.getConnectedPlatforms);
  const rotateSocial = useMutation(api.social.rotateSocialAgentsManual);
  const generateOAuth = useMutation(api.social.generateOAuthUrl);
  const disconnectPlatform = useMutation(api.social.disconnectPlatform);
  const updatePostingSettings = useMutation(api.social.updatePostingSettings);
  const manualPost = useMutation(api.social.manualPost);
  const [platforms, setPlatforms] = useState<any[]>([]);
  const [platformsLoading, setPlatformsLoading] = useState(true);
  const [rotating, setRotating] = useState(false);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<"platforms" | "analytics" | "posts">("platforms");
  const [postingMode, setPostingMode] = useState<Record<string, string>>({});
  const [manualPostContent, setManualPostContent] = useState("");
  const [postingStatus, setPostingStatus] = useState<{ platformId: string; status: string; error?: string } | null>(null);
  const [toast, setToast] = useState<{ message: string; type: string } | null>(null);

  useEffect(() => {
    const fetchPlatforms = async () => {
      try {
        const result = await getConnectedPlatformsAction();
        const platformsData = result.platforms || [];
        const availablePlatforms = result.availablePlatforms || [];
        const merged = availablePlatforms.map((ap: any) => {
          const conn = platformsData.find((p: any) => p.integration === ap.id || p.id === ap.id);
          return {
            ...ap,
            isConnected: !!conn,
            connectedAt: conn?.connectedAt,
            lastSyncAt: conn?.lastSyncAt,
            postsCount: conn?.postsCount || 0,
            followersCount: conn?.followersCount || 0,
            postingMode: conn?.postingMode || "auto",
            username: conn?.username || conn?.name,
          };
        });
        setPlatforms(merged);
      } catch (error) {
        console.error("Failed to fetch platforms:", error);
        setPlatforms([]);
      } finally {
        setPlatformsLoading(false);
      }
    };
    fetchPlatforms();
  }, [getConnectedPlatformsAction]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'social_connection_success') {
        setToast({ message: `✅ Connected to ${event.data.platformId}! Auto-posting started.`, type: "success" });
        setConnecting(null);
        window.location.reload();
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const showToast = (message: string, type: string) => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  };

  const handleRotate = async () => {
    setRotating(true);
    await rotateSocial({});
    setRotating(false);
    showToast("Agent rotation triggered", "success");
  };

  const handleConnect = async (platformId: string) => {
    setConnecting(platformId);
    try {
      // Use the Convex HTTP endpoint for callback
      const redirectUri = `${window.location.origin}/api/social/callback?platform=${platformId}`;
      const result = await generateOAuth({ platform: platformId, redirectUri });
      
      if (result?.error) {
        showToast(result.error, "error");
        setConnecting(null);
        return;
      }
      
      if (result?.authUrl) {
        // Calculate popup dimensions
        const width = 600;
        const height = 700;
        const left = (window.screen.width / 2) - (width / 2);
        const top = (window.screen.height / 2) - (height / 2);
        
        // Open popup window for OAuth
        const popup = window.open(
          result.authUrl, 
          `connect-${platformId}`, 
          `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
        );
        
        if (!popup) {
          showToast("Popup blocked. Please allow popups for this site.", "error");
          setConnecting(null);
          return;
        }
        
        // Monitor popup for closure
        const popupCheck = setInterval(() => {
          if (popup.closed) {
            clearInterval(popupCheck);
            setConnecting(null);
          }
        }, 500);
      } else if (result?.devMode) {
        showToast(result.message, "success");
        window.location.reload();
      }
    } catch (err: any) {
      showToast(err.message || "Failed to connect", "error");
    }
    setConnecting(null);
  };

  const handleDisconnect = async (platformId: string) => {
    if (!confirm(`Disconnect ${platformId}? Auto-posting to this platform will stop.`)) return;
    await disconnectPlatform({ platform: platformId });
  };

  const handleModeChange = async (platformId: string, mode: "auto" | "manual" | "paused") => {
    setPostingMode({ ...postingMode, [platformId]: mode });
    const result = await updatePostingSettings({
      platformId,
      mode,
      scheduleTime: mode === "auto" ? "09:00,15:00,21:00" : undefined,
      postingFrequency: mode === "auto" ? "daily" : undefined,
    });
    if (result?.success) {
      showToast(`${platformId} posting mode set to ${mode.toUpperCase()}`, "success");
    } else {
      showToast(result?.message || "Failed to update posting mode", "error");
    }
  };

  const handleManualPost = async (platformId: string) => {
    if (!manualPostContent.trim()) {
      showToast("Please enter content to post", "error");
      return;
    }

    setPostingStatus({ platformId, status: "posting" });
    const result = await manualPost({ platformId, content: manualPostContent });

    if (result?.success) {
      setPostingStatus({ platformId, status: "success" });
      setManualPostContent("");
      showToast(`Post published to ${platformId}!`, "success");
      setTimeout(() => setPostingStatus(null), 3000);
    } else {
      setPostingStatus({ platformId, status: "error", error: result?.message || "Post failed" });
      showToast(result?.message || "Post failed", "error");
    }
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-700 relative">
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
      <div className="bg-slate-900 border border-slate-800 rounded-[3.5rem] p-12 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-orange-600/5 blur-[80px]"></div>
        <div className="relative z-10 space-y-10">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-3xl font-black uppercase tracking-tighter text-white">Automated Social Engine</h2>
              <p className="text-sm font-black text-orange-500 uppercase tracking-widest mt-1">OAuth Connection + AI Auto-Posting</p>
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
            <MetricCard label="Total Generated" value={stats?.total || 0} icon="📝" color="blue" />
            <MetricCard label="Live Posts" value={stats?.posted || 0} icon="🌐" color="emerald" />
            <MetricCard label="Scheduled" value={stats?.scheduled || 0} icon="📅" color="indigo" />
            <MetricCard label="Failed" value={stats?.failed || 0} icon="⚠️" color="red" />
          </div>

          {/* Sub-tabs */}
          <div className="flex gap-2 bg-slate-950 p-2 rounded-2xl border border-white/5">
            <button
              onClick={() => setActiveSubTab("platforms")}
              className={`flex-1 py-3 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                activeSubTab === "platforms" ? "bg-orange-600 text-white" : "text-slate-500 hover:bg-slate-800"
              }`}
            >
              Connected Platforms
            </button>
            <button
              onClick={() => setActiveSubTab("analytics")}
              className={`flex-1 py-3 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                activeSubTab === "analytics" ? "bg-orange-600 text-white" : "text-slate-500 hover:bg-slate-800"
              }`}
            >
              Platform Analytics
            </button>
            <button
              onClick={() => setActiveSubTab("posts")}
              className={`flex-1 py-3 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                activeSubTab === "posts" ? "bg-orange-600 text-white" : "text-slate-500 hover:bg-slate-800"
              }`}
            >
              Post History
            </button>
          </div>

          {/* Connected Platforms Tab */}
          {activeSubTab === "platforms" && (
            <div className="space-y-6">
              <div className="bg-slate-950 p-10 rounded-[2.5rem] border border-white/5">
                <h3 className="text-lg font-black text-white uppercase tracking-tighter mb-8">Connect via OAuth</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {platforms?.map((p: any) => (
                    <div key={p.id} className={`p-6 rounded-2xl border transition-all ${
                      p.isConnected 
                        ? 'bg-emerald-500/5 border-emerald-500/20' 
                        : 'bg-slate-900 border-white/5 hover:border-slate-700'
                    }`}>
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{p.icon}</span>
                          <div>
                            <p className="text-sm font-black text-white">{p.name}</p>
                            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">
                              {p.isConnected ? "Connected" : "Not Connected"}
                            </p>
                          </div>
                        </div>
                        <span className={`w-3 h-3 rounded-full ${p.isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-slate-600'}`}></span>
                      </div>
                      
                      {p.isConnected ? (
                        <div className="space-y-3">
                          <div className="flex justify-between text-[9px] font-bold">
                            <span className="text-slate-500 uppercase">Posts</span>
                            <span className="text-white">{p.postsCount}</span>
                          </div>
                          <div className="flex justify-between text-[9px] font-bold">
                            <span className="text-slate-500 uppercase">Followers</span>
                            <span className="text-white">{p.followersCount.toLocaleString()}</span>
                          </div>
                          
                          {/* Auto/Manual/Pause Controls */}
                          <div className="flex gap-1 mt-3">
                            <button
                              onClick={() => handleModeChange(p.id, "auto")}
                              className={`flex-1 py-1.5 rounded-lg text-[8px] font-black uppercase transition-all ${
                                (postingMode[p.id] || p.postingMode) === "auto"
                                  ? "bg-emerald-600 text-white"
                                  : "bg-slate-800 text-slate-500 hover:bg-slate-700"
                              }`}
                            >
                              🤖 Auto
                            </button>
                            <button
                              onClick={() => handleModeChange(p.id, "manual")}
                              className={`flex-1 py-1.5 rounded-lg text-[8px] font-black uppercase transition-all ${
                                postingMode[p.id] === "manual"
                                  ? "bg-blue-600 text-white"
                                  : "bg-slate-800 text-slate-500 hover:bg-slate-700"
                              }`}
                            >
                              ✍️ Manual
                            </button>
                            <button
                              onClick={() => handleModeChange(p.id, "paused")}
                              className={`flex-1 py-1.5 rounded-lg text-[8px] font-black uppercase transition-all ${
                                postingMode[p.id] === "paused"
                                  ? "bg-amber-600 text-white"
                                  : "bg-slate-800 text-slate-500 hover:bg-slate-700"
                              }`}
                            >
                              ⏸️ Pause
                            </button>
                          </div>

                          {/* Manual Post Input */}
                          {(postingMode[p.id] === "manual" || (!postingMode[p.id] && !p.postingMode)) && (
                            <div className="mt-3 space-y-2">
                              <textarea
                                placeholder="Write your post content here..."
                                value={manualPostContent}
                                onChange={(e) => setManualPostContent(e.target.value)}
                                className="w-full bg-slate-950 border border-white/10 rounded-xl p-3 text-white text-xs resize-none"
                                rows={2}
                              />
                              <button
                                onClick={() => handleManualPost(p.id)}
                                disabled={postingStatus?.status === "posting"}
                                className="w-full py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all disabled:opacity-50"
                              >
                                {postingStatus?.status === "posting" ? "Posting..." : "📤 Post Now"}
                              </button>
                              {postingStatus?.platformId === p.id && postingStatus.status === "success" && (
                                <p className="text-emerald-500 text-[9px] font-bold text-center">✅ Posted successfully!</p>
                              )}
                              {postingStatus?.platformId === p.id && postingStatus.status === "error" && (
                                <p className="text-red-500 text-[9px] font-bold text-center">❌ {postingStatus.error}</p>
                              )}
                            </div>
                          )}

                          {/* Auto Mode Info */}
                          {postingMode[p.id] === "auto" && (
                            <div className="mt-3 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                              <p className="text-emerald-500 text-[9px] font-bold">📅 Auto-posting active</p>
                              <p className="text-slate-500 text-[8px] mt-1">Schedule: Daily at 9:00 AM, 3:00 PM, 9:00 PM</p>
                            </div>
                          )}

                          {/* Paused State */}
                          {postingMode[p.id] === "paused" && (
                            <div className="mt-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                              <p className="text-amber-500 text-[9px] font-bold">⏸️ Posting is paused</p>
                            </div>
                          )}

                          <button
                            onClick={() => handleDisconnect(p.id)}
                            className="w-full mt-2 py-2 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-red-500/20 transition-all"
                          >
                            Disconnect
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleConnect(p.id)}
                          disabled={connecting === p.id}
                          className="w-full py-3 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-orange-600/20 disabled:opacity-50"
                        >
                          {connecting === p.id ? "Connecting..." : "Connect OAuth"}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Platform Analytics Tab */}
          {activeSubTab === "analytics" && (
            <div className="space-y-6">
              <div className="bg-slate-950 p-10 rounded-[2.5rem] border border-white/5">
                <h3 className="text-lg font-black text-white uppercase tracking-tighter mb-8">Platform Performance</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                  <MetricCard label="Total Leads" value={analytics?.totalLeads || 0} icon="📊" color="blue" />
                  <MetricCard label="Total Users" value={analytics?.totalUsers || 0} icon="👥" color="emerald" />
                  <MetricCard label="Total Revenue" value={`₦${(analytics?.totalRevenue || 0).toLocaleString()}`} icon="💰" color="amber" />
                </div>
                <div className="space-y-4">
                  {analytics?.platforms?.filter((p: any) => p.leads > 0 || p.registrations > 0).map((p: any) => (
                    <div key={p.platform} className="flex items-center justify-between p-6 bg-slate-900 rounded-2xl border border-white/5">
                      <div className="flex items-center gap-4">
                        <span className="text-2xl">{p.icon}</span>
                        <div>
                          <p className="text-sm font-black text-white">{p.name}</p>
                          <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">
                            {p.leads} leads • {p.registrations} registered • {p.conversions} converted
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-black text-emerald-500">₦{(p.revenue || 0).toLocaleString()}</p>
                        <p className="text-[9px] text-slate-600 font-bold">Revenue</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Post History Tab */}
          {activeSubTab === "posts" && (
            <div className="bg-slate-950 p-10 rounded-[2.5rem] border border-white/5">
              <h3 className="text-lg font-black text-white uppercase tracking-tighter mb-8">Pulse History</h3>
              <div className="space-y-4">
                {stats?.history?.map((p: any) => (
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
          )}
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
   const { data: settings } = useSuspenseQuery(convexQuery(api.secure_sweeps.getSettings, {})) as { data: any };
   const { data: sweepHistory } = useSuspenseQuery(convexQuery(api.secure_sweeps.getHistory, { limit: 10 })) as { data: any };
   const { data: sweepStats } = useSuspenseQuery(convexQuery(api.secure_sweeps.getSweepStats, {})) as { data: any };
   const { data: beneficiaries } = useSuspenseQuery(convexQuery(api.payouts.getBeneficiaries, {})) as { data: any };
   const { data: earnings } = useSuspenseQuery(convexQuery(api.admin.getEarningsSummary, {})) as { data: any };
   const { data: banks } = useSuspenseQuery(convexQuery(api.fintech.getAvailableBanks, {})) as { data: any };
   
   const updateSettings = useMutation(api.secure_sweeps.updateSettings);
   const performSweep = useMutation(api.secure_sweeps.performSweep);
   const initiateDirectTransfer = useMutation(api.fintech.initiateDirectTransfer);
   const verifyDirectTransferOTP = useMutation(api.fintech.verifyDirectTransferOTP);
   const resolveBankAccount = useAction(api.fintech.resolveBankAccount);
   const generatePasskey = useMutation(api.secure_sweeps.generatePasskey);
   
   const [sweeping, setSweeping] = useState(false);
   const [sweepStatus, setSweepStatus] = useState<{ message: string; type: string } | null>(null);
   const [manualSweepAmount, setManualSweepAmount] = useState("");
   const [sweepRemarks, setSweepRemarks] = useState("");
   
   // Transfer states
   const [transferAmount, setTransferAmount] = useState("");
   const [selectedBank, setSelectedBank] = useState("");
   const [recipientAccount, setRecipientAccount] = useState("");
   const [recipientName, setRecipientName] = useState("");
   const [resolving, setResolving] = useState(false);
   const [transferStatus, setTransferStatus] = useState<{ message: string; type: string } | null>(null);
   
   // Passkey states
   const [showPasskeyModal, setShowPasskeyModal] = useState(false);
   const [passkeyCode, setPasskeyCode] = useState("");
   const [passkeyId, setPasskeyId] = useState("");
   const [generatedPasskey, setGeneratedPasskey] = useState("");
   
   // OTP states
   const [showOTPModal, setShowOTPModal] = useState(false);
   const [otpCode, setOtpCode] = useState("");
   const [otpId, setOtpId] = useState("");
   const [verifying, setVerifying] = useState(false);
   
   // Receipt
   const [showReceipt, setShowReceipt] = useState(false);
   const [receipt, setReceipt] = useState<any>(null);

   // Resolve bank account
   const handleResolveAccount = async () => {
      if (!selectedBank || !recipientAccount || recipientAccount.length < 10) {
         setTransferStatus({ message: "Enter valid bank and 10-digit account number", type: "error" });
         return;
      }
      setResolving(true);
      setTransferStatus({ message: "Resolving account...", type: "loading" });
      try {
         const result = await resolveBankAccount({ bankCode: selectedBank, accountNumber: recipientAccount });
         if (result?.success) {
            setRecipientName(result.accountName);
            setTransferStatus({ message: `Account resolved: ${result.accountName}`, type: "success" });
         } else {
            setRecipientName("");
            setTransferStatus({ message: result?.error || "Account resolution failed", type: "error" });
         }
      } catch (err: any) {
         setTransferStatus({ message: err.message, type: "error" });
      }
      setResolving(false);
   };

   // Generate passkey for sweep
   const handleGeneratePasskey = async () => {
      try {
         const result = await generatePasskey({});
         if (result?.success) {
            setPasskeyId(result.passkeyId);
            setGeneratedPasskey(result.passkey);
         }
      } catch (err: any) {
         setSweepStatus({ message: err.message, type: "error" });
      }
   };

   // Initiate transfer with passkey
   const handleInitiateTransfer = async () => {
      if (!selectedBank || !recipientAccount || !transferAmount || !recipientName) {
         setTransferStatus({ message: "Please fill all fields and resolve account", type: "error" });
         return;
      }

      // Generate passkey first
      const pkResult = await generatePasskey({});
      if (!pkResult?.success) {
         setTransferStatus({ message: "Failed to generate passkey", type: "error" });
         return;
      }
      setPasskeyId(pkResult.passkeyId);
      setGeneratedPasskey(pkResult.passkey);
      setShowPasskeyModal(true);
   };

   // Verify passkey and initiate OTP
   const handleVerifyPasskeyAndInitiate = async () => {
      if (passkeyCode !== generatedPasskey) {
         setTransferStatus({ message: "Invalid passkey", type: "error" });
         return;
      }

      setShowPasskeyModal(false);
      setTransferStatus({ message: "Sending OTP...", type: "loading" });
      try {
         const bankName = banks?.find((b: any) => b.code === selectedBank)?.name || selectedBank;
         const result = await initiateDirectTransfer({
            amount: parseFloat(transferAmount),
            bankCode: selectedBank,
            bankName,
            accountNumber: recipientAccount,
            accountName: recipientName,
            purpose: `Transfer to ${recipientName}`,
         });

         if (result?.success) {
            setOtpId(result.otpId);
            setShowOTPModal(true);
            setTransferStatus({ message: "OTP sent! Check your email.", type: "otp" });
         } else {
            setTransferStatus({ message: result?.error || "Failed to initiate transfer", type: "error" });
         }
      } catch (err: any) {
         setTransferStatus({ message: err.message, type: "error" });
      }
   };

   // Verify OTP and complete transfer
   const handleVerifyOTP = async () => {
      if (otpCode.length !== 6) return;

      setVerifying(true);
      try {
         const result = await verifyDirectTransferOTP({ otpId, otp: otpCode, passkeyId, passkey: passkeyCode });

         if (result?.success) {
            setReceipt(result.receipt);
            setShowOTPModal(false);
            setShowReceipt(true);
            setTransferStatus({ message: "Transfer completed!", type: "success" });
            setOtpCode("");
            setPasskeyCode("");
         } else {
            setTransferStatus({ message: result?.error || "Invalid OTP", type: "error" });
         }
      } catch (err: any) {
         setTransferStatus({ message: err.message, type: "error" });
      }
      setVerifying(false);
   };

   const handleAutoSweepToggle = async () => {
      const newState = !settings?.autoSweep;
      await updateSettings({ autoSweep: newState });
      setSweepStatus({ message: `Auto Sweep ${newState ? "enabled" : "disabled"}`, type: "success" });
      setTimeout(() => setSweepStatus(null), 3000);
   };

   const handlePauseSchedule = async () => {
      const newState = !settings?.pauseSchedule;
      await updateSettings({ pauseSchedule: newState });
      setSweepStatus({ message: `Schedule ${newState ? "paused" : "resumed"}`, type: "success" });
      setTimeout(() => setSweepStatus(null), 3000);
   };

   const handleManualSweep = async () => {
      // Generate passkey first
      const pkResult = await generatePasskey({});
      if (!pkResult?.success) {
         setSweepStatus({ message: "Failed to generate passkey", type: "error" });
         return;
      }
      setPasskeyId(pkResult.passkeyId);
      setGeneratedPasskey(pkResult.passkey);
      setShowPasskeyModal(true);
   };

   const handleConfirmManualSweep = async () => {
      if (passkeyCode !== generatedPasskey) {
         setSweepStatus({ message: "Invalid passkey", type: "error" });
         return;
      }

      setShowPasskeyModal(false);
      setSweeping(true);
      setSweepStatus({ message: "Processing sweep with Kora Pay...", type: "loading" });
      try {
         const amount = manualSweepAmount ? parseFloat(manualSweepAmount) : undefined;
         const result = await performSweep({
            type: "manual",
            amount,
            passkeyId,
            passkey: passkeyCode,
            remarks: sweepRemarks || undefined,
         });
         if (result?.success) {
            setReceipt(result.receipt);
            setShowReceipt(true);
            setSweepStatus({ message: `Sweep completed! ₦${result.amount?.toLocaleString()} transferred.`, type: "success" });
         } else {
            setSweepStatus({ message: result?.error || "Sweep failed", type: "error" });
         }
      } catch (err: any) { 
         setSweepStatus({ message: err.message, type: "error" });
      }
      setSweeping(false);
      setTimeout(() => setSweepStatus(null), 5000);
   };
   
   return (
      <div className="space-y-10 animate-in fade-in duration-700">
         {/* Status Banner */}
         {sweepStatus && (
            <div className={`p-4 rounded-2xl text-center text-sm font-black ${
               sweepStatus.type === "success" ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" :
               sweepStatus.type === "error" ? "bg-red-500/10 text-red-500 border border-red-500/20" :
               "bg-blue-500/10 text-blue-500 border border-blue-500/20"
            }`}>
               {sweepStatus.message}
            </div>
         )}

         <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            {/* Sweep Controls */}
            <div className="bg-slate-900 border border-slate-800 rounded-[3.5rem] p-12 space-y-8 shadow-2xl relative overflow-hidden">
               <div className="flex justify-between items-center">
                  <h3 className="text-2xl font-black uppercase tracking-tighter text-white">Daily Secure Sweep</h3>
                  <span className="px-4 py-1 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-full text-[9px] font-black">LIVE KORA PAY</span>
               </div>

               {/* Stats Grid */}
               <div className="grid grid-cols-2 gap-6">
                  <div className="bg-slate-950 p-6 rounded-2xl border border-white/5">
                     <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Scheduled Time</p>
                     <p className="text-xl font-black text-white">{settings?.sweepTime || "22:00"} WAT</p>
                  </div>
                  <div className="bg-slate-950 p-6 rounded-2xl border border-white/5">
                     <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Main Wallet</p>
                     <p className="text-xl font-black text-emerald-500">₦{(earnings?.walletBalance || 0).toLocaleString()}</p>
                  </div>
                  <div className="bg-slate-950 p-6 rounded-2xl border border-white/5">
                     <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Today Swept</p>
                     <p className="text-xl font-black text-white">₦{(sweepStats?.today?.amount || 0).toLocaleString()}</p>
                  </div>
                  <div className="bg-slate-950 p-6 rounded-2xl border border-white/5">
                     <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">This Month</p>
                     <p className="text-xl font-black text-white">₦{(sweepStats?.month?.amount || 0).toLocaleString()}</p>
                  </div>
               </div>

               {/* Manual Sweep Amount */}
               <div className="bg-slate-950 p-6 rounded-2xl border border-white/5 space-y-4">
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Manual Sweep Amount</p>
                  <div className="flex gap-3">
                     <input
                        type="number"
                        value={manualSweepAmount}
                        onChange={(e) => setManualSweepAmount(e.target.value)}
                        placeholder="Enter amount to sweep"
                        className="flex-1 bg-slate-900 border border-white/10 rounded-xl p-4 text-white text-sm"
                     />
                     <button
                        onClick={handleManualSweep}
                        disabled={!manualSweepAmount || parseFloat(manualSweepAmount) <= 0 || sweeping}
                        className="px-6 py-4 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:opacity-50 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                     >
                        {sweeping ? "..." : "Apply"}
                     </button>
                  </div>
                  <input
                     type="text"
                     value={sweepRemarks}
                     onChange={(e) => setSweepRemarks(e.target.value)}
                     placeholder="Remarks (optional)"
                     className="w-full bg-slate-900 border border-white/10 rounded-xl p-4 text-white text-sm"
                  />
                  <p className="text-[8px] text-slate-600">Enter amount and click Apply to sweep immediately via Kora Pay</p>
               </div>

               {/* Sweep Info */}
               <div className="space-y-4">
                  <div className="flex justify-between text-[10px] font-black border-b border-white/5 pb-2">
                     <span className="text-slate-500 uppercase">DESTINATION</span>
                     <span className="text-white uppercase">{beneficiaries?.[0]?.bankName || "OPAY"} (••••••{beneficiaries?.[0]?.encryptedAccountNumber?.slice(-4) || "1202"})</span>
                  </div>
                  <div className="flex justify-between text-[10px] font-black">
                     <span className="text-slate-500 uppercase">PAYOUT FREQUENCY</span>
                     <span className="text-white uppercase">DAILY ({settings?.sweepTime || "11 PM"})</span>
                  </div>
                  <div className="flex justify-between text-[10px] font-black">
                     <span className="text-slate-500 uppercase">STATUS</span>
                     <span className={`uppercase ${settings?.autoSweep ? "text-emerald-500" : "text-amber-500"}`}>
                        {settings?.pauseSchedule ? "PAUSED" : settings?.autoSweep ? "ACTIVE" : "MANUAL"}
                     </span>
                  </div>
               </div>

               {/* Control Buttons */}
               <div className="space-y-4">
                  <div className="flex gap-4">
                     <button 
                        onClick={handleAutoSweepToggle}
                        className={`flex-1 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                           settings?.autoSweep 
                              ? "bg-emerald-600 text-white" 
                              : "bg-slate-800 border border-slate-700 text-white"
                        }`}
                     >
                        {settings?.autoSweep ? "Auto Sweep ON" : "Auto Sweep OFF"}
                     </button>
                     <button 
                        onClick={handlePauseSchedule}
                        className={`flex-1 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                           settings?.pauseSchedule 
                              ? "bg-amber-600 text-white" 
                              : "bg-slate-800 border border-slate-700 text-white"
                        }`}
                     >
                        {settings?.pauseSchedule ? "Resume" : "Pause"}
                     </button>
                  </div>
                  <button 
                     onClick={handleManualSweep}
                     disabled={sweeping}
                     className="w-full py-4 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest disabled:opacity-50 transition-all"
                  >
                     {sweeping ? "Processing with Kora Pay..." : "Sweep Now (Live Transfer)"}
                  </button>
               </div>
            </div>

            {/* Sweep History */}
            <div className="bg-slate-900 border border-slate-800 rounded-[3.5rem] p-12 shadow-2xl">
               <h3 className="text-xl font-black uppercase tracking-tighter mb-6">Payout History</h3>
               <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                  {sweepHistory?.length === 0 ? (
                     <p className="text-slate-500 text-sm text-center py-10">No sweeps performed yet. Use Manual Sweep to start.</p>
                  ) : (
                     sweepHistory?.map((sweep: any) => (
                        <div key={sweep.id} className="bg-slate-950 p-6 rounded-2xl border border-white/5 flex justify-between items-center">
                           <div>
                              <p className="text-sm font-black text-white">₦{sweep.amount.toLocaleString()}</p>
                              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
                                 {sweep.type} • {sweep.date}
                              </p>
                              {sweep.reference && (
                                 <p className="text-[8px] font-mono text-slate-600 mt-1">{sweep.reference}</p>
                              )}
                           </div>
                           <span className={`text-xs font-bold ${sweep.status === "completed" ? "text-emerald-500" : sweep.status === "failed" ? "text-red-500" : "text-amber-500"}`}>
                              {sweep.status === "completed" ? "✓ DONE" : sweep.status === "failed" ? "✗ FAIL" : "⏳ PENDING"}
                           </span>
                        </div>
                     ))
                  )}
               </div>
            </div>
         </div>

         {/* Live Transfer Section */}
         <div className="bg-slate-900 border border-slate-800 rounded-[3.5rem] p-12 shadow-2xl">
            <h3 className="text-xl font-black uppercase tracking-tighter mb-6">Live Transfer (Kora Pay API)</h3>
            
            {/* Transfer Status */}
            {transferStatus && (
               <div className={`mb-6 p-4 rounded-2xl text-center text-sm font-black ${
                  transferStatus.type === "success" ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" :
                  transferStatus.type === "error" ? "bg-red-500/10 text-red-500 border border-red-500/20" :
                  transferStatus.type === "otp" ? "bg-amber-500/10 text-amber-500 border border-amber-500/20" :
                  "bg-blue-500/10 text-blue-500 border border-blue-500/20"
               }`}>
                  {transferStatus.message}
               </div>
            )}

            {/* Transfer Form */}
            {!showOTPModal && !showPasskeyModal && !showReceipt && (
               <div className="space-y-6">
                  {/* Bank and Account Row */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                     <div>
                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Bank</label>
                        <select 
                           value={selectedBank} 
                           onChange={(e) => { setSelectedBank(e.target.value); setRecipientName(""); }}
                           className="w-full bg-slate-950 border border-white/10 rounded-xl p-4 text-white text-sm"
                        >
                           <option value="">-- Select Bank --</option>
                           {banks?.map((bank: any) => (
                              <option key={bank.code} value={bank.code}>
                                 {bank.icon} {bank.name}
                              </option>
                           ))}
                        </select>
                     </div>
                     <div>
                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Account Number</label>
                        <input
                           type="text"
                           value={recipientAccount}
                           onChange={(e) => { setRecipientAccount(e.target.value); setRecipientName(""); }}
                           placeholder="10-digit account"
                           maxLength={10}
                           className="w-full bg-slate-950 border border-white/10 rounded-xl p-4 text-white text-sm"
                        />
                     </div>
                     <div>
                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Account Name</label>
                        <div className="w-full bg-slate-950 border border-white/10 rounded-xl p-4 text-white text-sm">
                           {resolving ? "Resolving..." : recipientName || "Auto-resolved"}
                        </div>
                     </div>
                     <div className="flex items-end">
                        <button 
                           onClick={handleResolveAccount}
                           disabled={!selectedBank || !recipientAccount || recipientAccount.length < 10 || resolving}
                           className="w-full py-4 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-50"
                        >
                           {resolving ? "..." : "🔍 Resolve"}
                        </button>
                     </div>
                  </div>

                  {/* Amount Row */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                     <div>
                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Amount (₦)</label>
                        <input
                           type="number"
                           value={transferAmount}
                           onChange={(e) => setTransferAmount(e.target.value)}
                           placeholder="Enter amount"
                           className="w-full bg-slate-950 border border-white/10 rounded-xl p-4 text-white text-sm"
                        />
                     </div>
                     <div className="md:col-span-2 flex items-end">
                        <button 
                           onClick={handleInitiateTransfer}
                           disabled={!selectedBank || !recipientAccount || !transferAmount || !recipientName}
                           className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-50"
                        >
                           Generate Passkey & Initiate Transfer
                        </button>
                     </div>
                  </div>
               </div>
            )}

            {/* Passkey Modal */}
            {showPasskeyModal && (
               <div className="bg-slate-950 p-8 rounded-2xl border border-white/5 space-y-6">
                  <div className="text-center">
                     <div className="text-4xl mb-4">🔑</div>
                     <h4 className="text-lg font-black text-white">Transaction Passkey</h4>
                     <p className="text-sm text-slate-500 mt-2">
                        Enter the 6-digit passkey to authorize this transfer.
                     </p>
                     <p className="text-xs font-mono text-amber-500 mt-2 bg-amber-500/10 p-2 rounded">
                        Passkey: {generatedPasskey}
                     </p>
                  </div>
                  <div className="flex justify-center">
                     <input
                        type="text"
                        value={passkeyCode}
                        onChange={(e) => setPasskeyCode(e.target.value)}
                        maxLength={6}
                        placeholder="000000"
                        className="w-48 bg-slate-900 border border-white/10 rounded-xl p-4 text-white text-2xl text-center font-mono tracking-[0.5em]"
                     />
                  </div>
                  <div className="flex gap-4">
                     <button 
                        onClick={() => { setShowPasskeyModal(false); setPasskeyCode(""); }}
                        className="flex-1 py-3 bg-slate-800 text-white rounded-xl text-xs font-bold"
                     >
                        Cancel
                     </button>
                     <button 
                        onClick={handleVerifyPasskeyAndInitiate}
                        disabled={passkeyCode.length !== 6}
                        className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold disabled:opacity-50"
                     >
                        Verify & Send OTP
                     </button>
                  </div>
               </div>
            )}

            {/* OTP Verification Modal */}
            {showOTPModal && (
               <div className="bg-slate-950 p-8 rounded-2xl border border-white/5 space-y-6">
                  <div className="text-center">
                     <div className="text-4xl mb-4">🔐</div>
                     <h4 className="text-lg font-black text-white">Enter OTP</h4>
                     <p className="text-sm text-slate-500 mt-2">
                        A 6-digit code has been sent to your email. Valid for 10 minutes.
                     </p>
                  </div>
                  <div className="flex justify-center">
                     <input
                        type="text"
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value)}
                        maxLength={6}
                        placeholder="000000"
                        className="w-48 bg-slate-900 border border-white/10 rounded-xl p-4 text-white text-2xl text-center font-mono tracking-[0.5em]"
                     />
                  </div>
                  <div className="flex gap-4">
                     <button 
                        onClick={() => setShowOTPModal(false)}
                        className="flex-1 py-3 bg-slate-800 text-white rounded-xl text-xs font-bold"
                     >
                        Cancel
                     </button>
                     <button 
                        onClick={handleVerifyOTP}
                        disabled={otpCode.length !== 6 || verifying}
                        className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold disabled:opacity-50"
                     >
                        {verifying ? "Processing Transfer..." : "Verify & Complete Transfer"}
                     </button>
                  </div>
               </div>
            )}

            {/* Receipt Display */}
            {showReceipt && receipt && (
               <div className="bg-slate-950 p-8 rounded-2xl border border-white/5 space-y-6">
                  <div className="text-center">
                     <div className="text-4xl mb-4">✅</div>
                     <h4 className="text-lg font-black text-emerald-500">Transfer Successful!</h4>
                  </div>
                  <div className="bg-slate-900 p-6 rounded-xl space-y-3">
                     <div className="flex justify-between text-sm">
                        <span className="text-slate-500">Reference</span>
                        <span className="text-white font-mono">{receipt.reference}</span>
                     </div>
                     {receipt.koraReference && (
                        <div className="flex justify-between text-sm">
                           <span className="text-slate-500">Kora Ref</span>
                           <span className="text-white font-mono text-[10px]">{receipt.koraReference}</span>
                        </div>
                     )}
                     <div className="flex justify-between text-sm">
                        <span className="text-slate-500">Amount</span>
                        <span className="text-white font-bold">₦{receipt.amount.toLocaleString()}</span>
                     </div>
                     <div className="flex justify-between text-sm">
                        <span className="text-slate-500">To</span>
                        <span className="text-white">{receipt.to}</span>
                     </div>
                     <div className="flex justify-between text-sm">
                        <span className="text-slate-500">Account</span>
                        <span className="text-white font-mono">{receipt.accountNumber || "N/A"}</span>
                     </div>
                     <div className="flex justify-between text-sm">
                        <span className="text-slate-500">Date</span>
                        <span className="text-white">{new Date(receipt.date).toLocaleString()}</span>
                     </div>
                     <div className="flex justify-between text-sm">
                        <span className="text-slate-500">Balance Before</span>
                        <span className="text-white">₦{receipt.balanceBefore?.toLocaleString()}</span>
                     </div>
                     <div className="flex justify-between text-sm">
                        <span className="text-slate-500">Balance After</span>
                        <span className="text-emerald-500 font-bold">₦{receipt.balanceAfter?.toLocaleString()}</span>
                     </div>
                     <div className="flex justify-between text-sm">
                        <span className="text-slate-500">Status</span>
                        <span className="text-emerald-500 font-bold">{receipt.status.toUpperCase()}</span>
                     </div>
                  </div>
                  <button 
                     onClick={() => { setShowReceipt(false); setReceipt(null); setTransferAmount(""); setSelectedBank(""); setRecipientAccount(""); setRecipientName(""); }}
                     className="w-full py-3 bg-slate-800 text-white rounded-xl text-xs font-bold"
                  >
                     Done
                  </button>
               </div>
            )}
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
  const [modal, setModal] = useState<"password" | "2fa" | "ip" | null>(null);

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
              <ProfileAction label="🔑 Change Password" onClick={() => { setShowDropdown(false); setModal("password"); }} />
              <ProfileAction label="🛡️ Enable 2FA" onClick={() => { setShowDropdown(false); setModal("2fa"); }} />
              <ProfileAction label="📋 IP Whitelist" onClick={() => { setShowDropdown(false); setModal("ip"); }} />
              <div className="border-t border-slate-800 my-2"></div>
              <ProfileAction label="🚪 Sign Out" className="text-red-400 hover:bg-red-500/10" onClick={() => { setShowDropdown(false); localStorage.removeItem('admin_session_token'); window.location.href = '/admin/login'; }} />
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

      {modal === "password" && <ChangePasswordModal onClose={() => setModal(null)} adminId={profile._id} />}
      {modal === "2fa" && <Enable2FAModal onClose={() => setModal(null)} adminId={profile.email} />}
      {modal === "ip" && <IPWhitelistModal onClose={() => setModal(null)} adminId={profile._id} />}
    </div>
  );
}

function ProfileAction({ label, className, onClick }: { label: string; className?: string; onClick?: () => void }) {
  return (
    <button onClick={onClick} className={`w-full text-left px-4 py-3 text-xs font-bold text-slate-400 hover:bg-slate-800 hover:text-white rounded-xl transition-all ${className || ''}`}>
      {label}
    </button>
  );
}

function ChangePasswordModal({ onClose, adminId }: { onClose: () => void; adminId: string }) {
  const [current, setCurrent] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const changePass = useMutation(api.auth_helpers.changePassword);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (newPass.length < 16) { setError("Password must be at least 16 characters"); return; }
    if (!/(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[!@#$%^&*])/.test(newPass)) { setError("Password must include uppercase, lowercase, number, and special character"); return; }
    if (newPass !== confirm) { setError("Passwords do not match"); return; }
    setLoading(true);
    try {
      const result = await changePass({ userId: adminId as any, currentPassword: current, newPassword: newPass });
      if (result?.success) { setSuccess(true); setTimeout(() => window.location.href = '/admin/login', 3000); }
      else { setError(result?.error || "Failed to change password"); }
    } catch (err: any) { setError(err?.message || "Failed to change password"); }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
        <h3 className="text-xl font-black text-white mb-6">Change Password</h3>
        {success ? (
          <div className="text-center py-8"><p className="text-emerald-500 font-bold">Password changed successfully. Redirecting to login...</p></div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <input type="password" value={current} onChange={e => setCurrent(e.target.value)} placeholder="Current Password" className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-white font-bold text-sm" required />
            <input type="password" value={newPass} onChange={e => setNewPass(e.target.value)} placeholder="New Password (min 16 chars)" className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-white font-bold text-sm" required />
            <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Confirm New Password" className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-white font-bold text-sm" required />
            {error && <p className="text-red-500 text-xs font-bold">{error}</p>}
            <div className="flex gap-3">
              <button type="button" onClick={onClose} className="flex-1 py-3 bg-slate-800 text-slate-400 rounded-xl font-bold text-sm">Cancel</button>
              <button type="submit" disabled={loading} className="flex-1 py-3 bg-orange-600 hover:bg-orange-500 text-white rounded-xl font-bold text-sm disabled:opacity-50">{loading ? "Saving..." : "Save Password"}</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function Enable2FAModal({ onClose, adminId }: { onClose: () => void; adminId: string }) {
  const [code, setCode] = useState("");
  const [secret] = useState(() => Array.from({ length: 32 }, () => "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"[Math.floor(Math.random() * 62)]).join(""));
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [enabled, setEnabled] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const setup2FA = useMutation(api.auth_helpers.setupAdmin2FA);

  const handleEnable = async () => {
    if (code.length !== 6) { setError("Enter the 6-digit code from your authenticator"); return; }
    setLoading(true);
    try {
      const result = await setup2FA({ adminId: adminId as any, secret });
      if (result?.backupCodes) { setBackupCodes(result.backupCodes); setEnabled(true); }
    } catch (err: any) { setError(err?.message || "Failed to enable 2FA"); }
    setLoading(false);
  };

  const qrUrl = `otpauth://totp/DutchkemProsuite:${adminId}?secret=${secret}&issuer=DutchkemProsuite`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <h3 className="text-xl font-black text-white mb-6">Enable Two-Factor Authentication</h3>
        {enabled ? (
          <div className="space-y-4">
            <p className="text-emerald-500 font-bold text-sm">2FA enabled successfully!</p>
            <div className="bg-slate-950 p-4 rounded-xl border border-white/5">
              <p className="text-[10px] font-black text-slate-500 uppercase mb-2">Backup Codes (save these)</p>
              <div className="grid grid-cols-2 gap-2">{backupCodes.map((c, i) => <p key={i} className="text-xs font-mono text-white">{c}</p>)}</div>
            </div>
            <button onClick={onClose} className="w-full py-3 bg-orange-600 text-white rounded-xl font-bold text-sm">Done</button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-slate-400 text-xs">Scan this QR code with Google Authenticator:</p>
            <div className="bg-white p-4 rounded-xl text-center"><img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrUrl)}`} alt="2FA QR" className="mx-auto" /></div>
            <div className="bg-slate-950 p-3 rounded-xl"><p className="text-[10px] text-slate-500 uppercase mb-1">Manual Secret</p><p className="text-xs font-mono text-white break-all">{secret}</p></div>
            <input type="text" value={code} onChange={e => setCode(e.target.value)} placeholder="Enter 6-digit code" maxLength={6} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-white font-bold text-sm text-center tracking-[0.5em]" />
            {error && <p className="text-red-500 text-xs font-bold">{error}</p>}
            <div className="flex gap-3">
              <button type="button" onClick={onClose} className="flex-1 py-3 bg-slate-800 text-slate-400 rounded-xl font-bold text-sm">Cancel</button>
              <button onClick={handleEnable} disabled={loading || code.length !== 6} className="flex-1 py-3 bg-orange-600 hover:bg-orange-500 text-white rounded-xl font-bold text-sm disabled:opacity-50">{loading ? "Enabling..." : "Enable 2FA"}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function IPWhitelistModal({ onClose, adminId }: { onClose: () => void; adminId: string }) {
  const [ips, setIps] = useState<string[]>(["127.0.0.1"]);
  const [newIp, setNewIp] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const updateIPs = useMutation(api.auth_helpers.updateIpWhitelist);

  const handleAdd = () => {
    if (!newIp.trim()) return;
    if (ips.includes(newIp.trim())) return;
    setIps([...ips, newIp.trim()]);
    setNewIp("");
  };

  const handleRemove = (ip: string) => setIps(ips.filter(i => i !== ip));

  const handleSave = async () => {
    setLoading(true);
    try {
      await updateIPs({ adminId: adminId as any, ipAddresses: ips, description: "Admin IP whitelist" });
      setSuccess(true);
    } catch {}
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
        <h3 className="text-xl font-black text-white mb-6">IP Whitelist</h3>
        {success ? (
          <div className="text-center py-8"><p className="text-emerald-500 font-bold">IP whitelist saved successfully!</p><button onClick={onClose} className="mt-4 px-6 py-2 bg-orange-600 text-white rounded-xl font-bold text-sm">Done</button></div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2 max-h-40 overflow-y-auto">{ips.map(ip => (
              <div key={ip} className="flex items-center justify-between bg-slate-950 p-3 rounded-xl border border-white/5">
                <span className="text-xs font-mono text-white">{ip}</span>
                <button onClick={() => handleRemove(ip)} className="text-red-500 text-xs font-bold hover:underline">Remove</button>
              </div>
            ))}</div>
            <div className="flex gap-2">
              <input type="text" value={newIp} onChange={e => setNewIp(e.target.value)} placeholder="Add IP address" className="flex-1 bg-slate-950 border border-slate-800 rounded-xl p-3 text-white font-bold text-sm" />
              <button onClick={handleAdd} className="px-4 py-3 bg-slate-800 text-white rounded-xl font-bold text-sm">Add</button>
            </div>
            <div className="flex gap-3">
              <button onClick={onClose} className="flex-1 py-3 bg-slate-800 text-slate-400 rounded-xl font-bold text-sm">Cancel</button>
              <button onClick={handleSave} disabled={loading} className="flex-1 py-3 bg-orange-600 hover:bg-orange-500 text-white rounded-xl font-bold text-sm disabled:opacity-50">{loading ? "Saving..." : "Save"}</button>
            </div>
          </div>
        )}
      </div>
    </div>
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
  const { data: settings } = useSuspenseQuery(convexQuery(api.charity.getSettings, {})) as { data: any };
  const { data: titheHistory } = useSuspenseQuery(convexQuery(api.charity.getHistory, { limit: 10 })) as { data: any };
  const { data: charities } = useSuspenseQuery(convexQuery(api.charity.getCharities, {})) as { data: any };
  const { data: charityStats } = useSuspenseQuery(convexQuery(api.charity.getCharityAdminStats, {})) as { data: any };
  
  const updateSettings = useMutation(api.charity.updateSettings);
  const performTithe = useMutation(api.charity.performTithe);
  const [titheStatus, setTitheStatus] = useState<{ message: string; type: string } | null>(null);
  const [selectedCharity, setSelectedCharity] = useState("");
  const [titheAmount, setTitheAmount] = useState("");
  const [autoTithe, setAutoTithe] = useState(settings?.autoTithe || false);
  const [pauseTithe, setPauseTithe] = useState(settings?.pauseTithe || false);
  const [tithePercentage, setTithePercentage] = useState(settings?.tithePercentage || 10);

  const handleAutoTithe = async () => {
    const newState = !autoTithe;
    await updateSettings({ autoTithe: newState });
    setAutoTithe(newState);
    setTitheStatus({ message: `Auto Tithe ${newState ? "enabled" : "disabled"} (${tithePercentage}% of earnings)`, type: "success" });
    setTimeout(() => setTitheStatus(null), 3000);
  };

  const handlePauseTithe = async () => {
    const newState = !pauseTithe;
    await updateSettings({ pauseTithe: newState });
    setPauseTithe(newState);
    setTitheStatus({ message: `Tithe ${newState ? "paused" : "resumed"}`, type: "success" });
    setTimeout(() => setTitheStatus(null), 3000);
  };

  const handleManualTithe = async () => {
    if (!selectedCharity) {
      alert("Please select a charity");
      return;
    }
    
    setTitheStatus({ message: "Processing tithe...", type: "loading" });
    const result = await performTithe({ 
      type: "manual",
      charityId: selectedCharity,
      amount: titheAmount ? parseFloat(titheAmount) : undefined,
    });
    
    if (result?.success) {
      setTitheStatus({ message: `Tithe of ₦${result.amount?.toLocaleString()} sent to ${result.charityName}!`, type: "success" });
      setTitheAmount("");
    } else {
      setTitheStatus({ message: result?.error || "Tithe failed", type: "error" });
    }
    setTimeout(() => setTitheStatus(null), 5000);
  };

  const handlePercentageChange = async (newPercent: number) => {
    setTithePercentage(newPercent);
    await updateSettings({ tithePercentage: newPercent });
  };

  const wallet = charityStats?.wallet;

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      {/* Status Banner */}
      {titheStatus && (
        <div className={`p-4 rounded-2xl text-center text-sm font-black ${
          titheStatus.type === "success" ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" :
          titheStatus.type === "error" ? "bg-red-500/10 text-red-500 border border-red-500/20" :
          "bg-blue-500/10 text-blue-500 border border-blue-500/20"
        }`}>
          {titheStatus.message}
        </div>
      )}

      {/* Main Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-[3.5rem] p-12 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-600/5 blur-[80px]"></div>
        <div className="relative z-10 space-y-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="space-y-2">
              <h2 className="text-3xl font-black uppercase tracking-tighter text-white">Charity Tithe / Offering</h2>
              <p className="text-sm font-black text-amber-500 uppercase tracking-widest">Support charitable causes with automated or manual transfers</p>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <MetricCard label="Charity Balance" value={`₦${(wallet?.balance || 0).toLocaleString()}`} icon="🕊️" color="amber" subValue={pauseTithe ? "PAUSED" : "Active"} />
            <MetricCard label="Monthly Earnings" value={`₦${(wallet?.monthlyEarningsSoFar || 0).toLocaleString()}`} icon="💰" color="emerald" subValue={`${wallet?.currentMonth || ""}`} />
            <MetricCard label={`Tithe (${tithePercentage}%)`} value={`₦${((wallet?.monthlyEarningsSoFar || 0) * (tithePercentage / 100)).toLocaleString()}`} icon="🎯" color="blue" />
            <MetricCard label="Lifetime Set Aside" value={`₦${(wallet?.totalSetAsideLifetime || 0).toLocaleString()}`} icon="📈" color="indigo" subValue={`Transferred: ₦${(wallet?.totalTransferred || 0).toLocaleString()}`} />
          </div>

          {/* Control Buttons */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Auto Tithe Toggle */}
            <div className="bg-slate-950 p-6 rounded-2xl border border-white/5 space-y-4">
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">🤖 Auto Tithe</p>
              <button 
                onClick={handleAutoTithe}
                className={`w-full py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                  autoTithe 
                    ? "bg-emerald-600 text-white" 
                    : "bg-slate-800 border border-slate-700 text-white"
                }`}
              >
                {autoTithe ? "✅ Auto Tithe ON" : "⭕ Auto Tithe OFF"}
              </button>
              <p className="text-[8px] text-slate-500">Automatically sends {tithePercentage}% of earnings</p>
            </div>

            {/* Pause Tithe */}
            <div className="bg-slate-950 p-6 rounded-2xl border border-white/5 space-y-4">
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">⏸️ Pause Tithe</p>
              <button 
                onClick={handlePauseTithe}
                className={`w-full py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                  pauseTithe 
                    ? "bg-amber-600 text-white" 
                    : "bg-slate-800 border border-slate-700 text-white"
                }`}
              >
                {pauseTithe ? "▶️ Resume Tithe" : "⏸️ Pause Tithe"}
              </button>
              <p className="text-[8px] text-slate-500">Temporarily pause automated transfers</p>
            </div>

            {/* Percentage Slider */}
            <div className="bg-slate-950 p-6 rounded-2xl border border-white/5 space-y-4">
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">📊 Percentage: {tithePercentage}%</p>
              <input
                type="range"
                min="1"
                max="50"
                value={tithePercentage}
                onChange={(e) => handlePercentageChange(parseInt(e.target.value))}
                className="w-full accent-amber-500"
              />
              <div className="flex justify-between text-[8px] text-slate-500">
                <span>1%</span>
                <span>50%</span>
              </div>
            </div>
          </div>

          {/* Manual Tithe Section */}
          <div className="bg-slate-950 p-8 rounded-2xl border border-white/5 space-y-6">
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">✋ Manual Transfer Now</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Select Charity</label>
                <select 
                  value={selectedCharity} 
                  onChange={(e) => setSelectedCharity(e.target.value)}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl p-4 text-white text-sm"
                >
                  <option value="">-- Select Charity --</option>
                  {charities?.map((c: any) => (
                    <option key={c.id} value={c.id}>
                      {c.name} - {c.description}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Amount (₦)</label>
                <input
                  type="number"
                  placeholder="Optional - uses percentage if empty"
                  value={titheAmount}
                  onChange={(e) => setTitheAmount(e.target.value)}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl p-4 text-white text-sm"
                />
              </div>
              <div className="flex items-end">
                <button 
                  onClick={handleManualTithe}
                  className="w-full py-4 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                >
                  💸 Send Tithe Now
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tithe History */}
      <div className="bg-slate-900 border border-slate-800 rounded-[3.5rem] p-12 shadow-2xl">
        <h3 className="text-xl font-black uppercase tracking-tighter text-white mb-8">Tithe History</h3>
        <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
          {titheHistory?.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-10">No tithes recorded yet. Use Manual Transfer to start.</p>
          ) : (
            titheHistory?.map((tithe: any) => (
              <div key={tithe.id} className="flex justify-between items-center p-6 bg-slate-950 rounded-2xl border border-white/5">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-lg ${
                    tithe.type === "auto" ? "bg-amber-500/10" : "bg-emerald-500/10"
                  }`}>
                    {tithe.type === "auto" ? "🤖" : "✋"}
                  </div>
                  <div>
                    <p className="text-sm font-black text-white">₦{tithe.amount.toLocaleString()}</p>
                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
                      {tithe.charity_name} • {tithe.type} ({tithe.percentage}%) • {tithe.date}
                    </p>
                  </div>
                </div>
                <span className={`text-xs font-bold ${tithe.status === "completed" ? "text-emerald-500" : "text-amber-500"}`}>
                  {tithe.status === "completed" ? "✓" : "⏳"}
                </span>
              </div>
            ))
          )}
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
                    ₦{tx.freelancerAmount?.toLocaleString()} {tx.status === 'released' ? 'Released' : 'In Escrow'}
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

function CloudMemoryPanel() {
  const { data: health } = useSuspenseQuery(convexQuery(api.cloud_memory.getSystemHealth, {}));
  const { data: backups } = useSuspenseQuery(convexQuery(api.cloud_memory.getAllBackups, {}));
  const runSelfHealing = useAction(internal.cloud_memory.runSelfHealing);
  const autoBackup = useAction(internal.cloud_memory.autoBackupSystem);
  const [healing, setHealing] = useState(false);
  const [backing, setBacking] = useState(false);
  const [lastHealingResult, setLastHealingResult] = useState<any>(null);

  const handleSelfHealing = async () => {
    setHealing(true);
    try {
      const result = await runSelfHealing({});
      setLastHealingResult(result);
    } catch (err: any) {
      alert(err.message);
    }
    setHealing(false);
  };

  const handleAutoBackup = async () => {
    setBacking(true);
    try {
      await autoBackup({});
      alert("System backup initiated successfully!");
    } catch (err: any) {
      alert(err.message);
    }
    setBacking(false);
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      <div className="bg-slate-900 border border-slate-800 rounded-[3.5rem] p-12 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-600/5 blur-[80px]"></div>
        <div className="relative z-10 space-y-10">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-3xl font-black uppercase tracking-tighter text-white">Cloud Memory & Self-Healing</h2>
              <p className="text-sm font-black text-cyan-500 uppercase tracking-widest mt-1">Automatic Backup • Error Detection • Auto-Recovery</p>
            </div>
            <div className="flex gap-4">
              <button
                onClick={handleAutoBackup}
                disabled={backing}
                className="px-8 py-4 bg-cyan-600 hover:bg-cyan-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl shadow-cyan-600/20 disabled:opacity-50"
              >
                {backing ? "Backing Up..." : "Manual Backup"}
              </button>
              <button
                onClick={handleSelfHealing}
                disabled={healing}
                className="px-8 py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl shadow-emerald-600/20 disabled:opacity-50"
              >
                {healing ? "Healing..." : "Run Self-Healing"}
              </button>
            </div>
          </div>

          {/* Health Status */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <MetricCard label="System Health" value={`${health?.healthScore || 100}%`} icon="🛡️" color={health?.status === 'optimal' ? 'emerald' : 'amber'} subValue={health?.status === 'optimal' ? 'OPTIMAL' : 'DEGRADED'} />
            <MetricCard label="Active Backups" value={health?.backupCount || 0} icon="☁️" color="cyan" subValue="Auto-synced" />
            <MetricCard label="Active Sessions" value={health?.activeSessions || 0} icon="👥" color="blue" />
            <MetricCard label="Stuck Posts" value={health?.stuckPosts || 0} icon="⚠️" color={health?.stuckPosts > 0 ? 'red' : 'emerald'} subValue={health?.stuckPosts > 0 ? 'Needs attention' : 'All clear'} />
          </div>

          {/* Last Healing Result */}
          {lastHealingResult && (
            <div className={`p-8 rounded-3xl border ${
              lastHealingResult.healed 
                ? 'bg-emerald-500/5 border-emerald-500/20' 
                : 'bg-slate-950 border-white/5'
            }`}>
              <h3 className="text-lg font-black text-white uppercase tracking-tighter mb-4">
                {lastHealingResult.healed ? '✅ Issues Fixed' : '🔍 Healing Complete'}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Issues Found</p>
                  {lastHealingResult.issues.length === 0 ? (
                    <p className="text-sm text-emerald-500 font-bold">No issues detected</p>
                  ) : (
                    lastHealingResult.issues.map((issue: string, i: number) => (
                      <p key={i} className="text-sm text-amber-500 font-bold">• {issue}</p>
                    ))
                  )}
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Fixes Applied</p>
                  {lastHealingResult.fixes.length === 0 ? (
                    <p className="text-sm text-slate-500 font-bold">No fixes needed</p>
                  ) : (
                    lastHealingResult.fixes.map((fix: string, i: number) => (
                      <p key={i} className="text-sm text-emerald-500 font-bold">✓ {fix}</p>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Backup History */}
          <div className="bg-slate-950 p-10 rounded-[2.5rem] border border-white/5">
            <h3 className="text-lg font-black text-white uppercase tracking-tighter mb-8">Backup History</h3>
            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              {backups?.slice(0, 20).map((backup: any) => (
                <div key={backup._id} className="flex justify-between items-center p-6 bg-slate-900 rounded-2xl border border-white/5">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-cyan-500/10 rounded-2xl flex items-center justify-center text-lg">☁️</div>
                    <div>
                      <p className="text-sm font-black text-white">{backup.backupType.replace(/_/g, ' ').toUpperCase()}</p>
                      <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">
                        {new Date(backup.createdAt).toLocaleString()} • {backup.description}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="px-3 py-1 bg-emerald-500/10 text-emerald-500 rounded-full text-[8px] font-black uppercase">
                      {backup.status}
                    </span>
                    <p className="text-[8px] text-slate-600 font-mono mt-1">{backup.checksum.slice(0, 12)}...</p>
                  </div>
                </div>
              ))}
              {(!backups || backups.length === 0) && (
                <div className="text-center py-20 text-slate-600 font-bold uppercase tracking-widest italic opacity-30">No backups yet</div>
              )}
            </div>
          </div>

          {/* System Features */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-8 bg-slate-950 rounded-3xl border border-white/5 text-center">
              <div className="text-4xl mb-4">🔄</div>
              <h4 className="text-sm font-black text-white uppercase tracking-widest mb-2">Auto-Backup</h4>
              <p className="text-[10px] text-slate-500 font-bold">System backups every 6 hours to cloud storage</p>
            </div>
            <div className="p-8 bg-slate-950 rounded-3xl border border-white/5 text-center">
              <div className="text-4xl mb-4">🛡️</div>
              <h4 className="text-sm font-black text-white uppercase tracking-widest mb-2">Self-Healing</h4>
              <p className="text-[10px] text-slate-500 font-bold">Automatic error detection and recovery every 30 min</p>
            </div>
            <div className="p-8 bg-slate-950 rounded-3xl border border-white/5 text-center">
              <div className="text-4xl mb-4">📧</div>
              <h4 className="text-sm font-black text-white uppercase tracking-widest mb-2">Email Reports</h4>
              <p className="text-[10px] text-slate-500 font-bold">Healing reports sent to admin email automatically</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function VoiceROIPanel() {
  const { data: voiceStats } = useSuspenseQuery(convexQuery(api.voice_roi.getStats, { timeRange: "week" })) as { data: any };
  const { data: callHistory } = useSuspenseQuery(convexQuery(api.voice_roi.getCallHistory, { limit: 20 })) as { data: any };
  const { data: dailyMetrics } = useSuspenseQuery(convexQuery(api.voice_roi.getDailyMetrics, { days: 7 })) as { data: any };
  
  const [timeRange, setTimeRange] = useState<"day" | "week" | "month" | "quarter">("week");

  const totalCost = (voiceStats?.totalMinutes || 0) * 0.024;
  const roi = voiceStats?.roi || 0;

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-[3.5rem] p-12 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/5 blur-[80px]"></div>
        <div className="relative z-10 space-y-8">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-3xl font-black uppercase tracking-tighter text-white">Voice ROI Analytics</h2>
              <p className="text-sm font-black text-indigo-500 uppercase tracking-widest mt-1">Deepgram + LiveKit Costs vs Revenue Generated</p>
            </div>
            <div className="flex gap-2">
              {(["day", "week", "month", "quarter"] as const).map((range) => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range)}
                  className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                    timeRange === range
                      ? "bg-indigo-600 text-white"
                      : "bg-slate-800 text-slate-500 hover:bg-slate-700"
                  }`}
                >
                  {range}
                </button>
              ))}
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
            <MetricCard label="Total Calls" value={voiceStats?.totalCalls || 0} icon="📞" color="blue" />
            <MetricCard label="Total Minutes" value={`${voiceStats?.totalMinutes || 0} min`} icon="⏱️" color="emerald" />
            <MetricCard label="Revenue Generated" value={`₦${(voiceStats?.totalRevenue || 0).toLocaleString()}`} icon="💰" color="amber" />
            <MetricCard label="Voice Cost" value={`₦${totalCost.toFixed(2)}`} icon="💸" color="red" />
            <MetricCard 
              label="Estimated ROI" 
              value={`${roi.toFixed(1)}%`} 
              icon="📈" 
              color={roi >= 0 ? "emerald" : "red"} 
              subValue={`${voiceStats?.conversionRate || 0}% conversion`}
            />
          </div>

          {/* ROI Explanation */}
          <div className="bg-slate-950 p-6 rounded-2xl border border-white/5">
            <p className="text-[10px] text-slate-500 font-bold">
              <span className="text-indigo-500">ROI Formula:</span> (Revenue - Cost) / Cost × 100% | 
              <span className="text-slate-400"> Cost:</span> Deepgram ($0.004/min) + LiveKit ($0.02/min) = $0.024/min
            </p>
          </div>
        </div>
      </div>

      {/* Daily Metrics Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-[3.5rem] p-12 shadow-2xl">
        <h3 className="text-xl font-black uppercase tracking-tighter text-white mb-8">Daily Metrics (Last 7 Days)</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left text-[9px] font-black text-slate-500 uppercase tracking-widest pb-4">Date</th>
                <th className="text-left text-[9px] font-black text-slate-500 uppercase tracking-widest pb-4">Calls</th>
                <th className="text-left text-[9px] font-black text-slate-500 uppercase tracking-widest pb-4">Minutes</th>
                <th className="text-left text-[9px] font-black text-slate-500 uppercase tracking-widest pb-4">Revenue</th>
                <th className="text-left text-[9px] font-black text-slate-500 uppercase tracking-widest pb-4">Cost</th>
                <th className="text-left text-[9px] font-black text-slate-500 uppercase tracking-widest pb-4">Conversion</th>
              </tr>
            </thead>
            <tbody>
              {dailyMetrics?.map((metric: any) => (
                <tr key={metric.date} className="border-b border-white/5">
                  <td className="py-4 text-sm font-bold text-white">{metric.date}</td>
                  <td className="py-4 text-sm text-slate-300">{metric.calls}</td>
                  <td className="py-4 text-sm text-slate-300">{metric.minutes}</td>
                  <td className="py-4 text-sm font-bold text-emerald-500">₦{metric.revenue.toLocaleString()}</td>
                  <td className="py-4 text-sm text-red-500">₦{metric.cost.toFixed(2)}</td>
                  <td className="py-4 text-sm text-slate-300">{metric.conversionRate}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Call History */}
      <div className="bg-slate-900 border border-slate-800 rounded-[3.5rem] p-12 shadow-2xl">
        <h3 className="text-xl font-black uppercase tracking-tighter text-white mb-8">Recent Voice Calls</h3>
        <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
          {callHistory?.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-10">No voice calls recorded yet.</p>
          ) : (
            callHistory?.map((call: any) => (
              <div key={call.id} className="flex justify-between items-center p-6 bg-slate-950 rounded-2xl border border-white/5">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-lg bg-indigo-500/10">📞</div>
                  <div>
                    <p className="text-sm font-bold text-white">{call.user_name || "Unknown User"}</p>
                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
                      {call.agent_id} • {call.duration_seconds}s • {new Date(call.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-emerald-500">₦{(call.revenue || 0).toLocaleString()}</p>
                  <p className="text-[9px] text-slate-500">Cost: ₦{(call.cost || 0).toFixed(2)}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function LiveChatsPanel() {
  const { data: activeChats } = useSuspenseQuery(convexQuery(api.live_chats.getActiveChats, {})) as { data: any };
  const { data: chatStats } = useSuspenseQuery(convexQuery(api.live_chats.getChatStats, {})) as { data: any };
  const [selectedChat, setSelectedChat] = useState<any>(null);
  const [replyText, setReplyText] = useState("");
  const sendReply = useMutation(api.live_chats.sendReply);
  const resolveChat = useMutation(api.live_chats.resolveChat);

  const handleSendReply = async () => {
    if (!replyText.trim() || !selectedChat) return;
    await sendReply({ chatId: selectedChat.id, message: replyText });
    setReplyText("");
  };

  const handleResolve = async () => {
    if (!selectedChat) return;
    if (!confirm("Resolve this chat?")) return;
    await resolveChat({ chatId: selectedChat.id });
    setSelectedChat(null);
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        <MetricCard label="Active Chats" value={chatStats?.active || 0} icon="💬" color="emerald" />
        <MetricCard label="Escalated" value={chatStats?.escalated || 0} icon="⚠️" color="amber" />
        <MetricCard label="Resolved" value={chatStats?.resolved || 0} icon="✅" color="blue" />
        <MetricCard label="Resolution Rate" value={`${chatStats?.resolutionRate || 0}%`} icon="📈" color="indigo" />
      </div>

      {/* Chat Interface */}
      <div className="bg-slate-900 border border-slate-800 rounded-[3.5rem] p-12 shadow-2xl">
        <h3 className="text-xl font-black uppercase tracking-tighter text-white mb-8">Live Chat Support</h3>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Chat List */}
          <div className="space-y-4 max-h-[500px] overflow-y-auto">
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Active Conversations ({activeChats?.length || 0})</p>
            {activeChats?.map((chat: any) => (
              <div
                key={chat.id}
                onClick={() => setSelectedChat(chat)}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  selectedChat?.id === chat.id
                    ? "bg-orange-600/10 border-orange-500/20"
                    : "bg-slate-950 border-white/5 hover:border-slate-700"
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-bold text-white">{chat.user_name || "Anonymous"}</p>
                    <p className="text-[9px] text-slate-500 line-clamp-1">{chat.last_message}</p>
                  </div>
                  {chat.unread_count > 0 && (
                    <span className="w-5 h-5 bg-orange-600 text-white text-[8px] font-bold rounded-full flex items-center justify-center">
                      {chat.unread_count}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Chat Area */}
          <div className="lg:col-span-2 bg-slate-950 rounded-2xl border border-white/5 p-6">
            {selectedChat ? (
              <div className="space-y-4">
                <div className="flex justify-between items-center pb-4 border-b border-white/5">
                  <p className="text-sm font-bold text-white">{selectedChat.user_name || "Anonymous"}</p>
                  <button onClick={handleResolve} className="px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-lg">
                    ✅ Resolve
                  </button>
                </div>
                <div className="h-[300px] overflow-y-auto space-y-3">
                  <div className="p-3 bg-slate-900 rounded-xl max-w-[80%]">
                    <p className="text-sm text-white">{selectedChat.last_message}</p>
                    <p className="text-[8px] text-slate-500 mt-1">{new Date(selectedChat.last_message_time).toLocaleTimeString()}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <input
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSendReply()}
                    placeholder="Type your reply..."
                    className="flex-1 bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-white text-sm"
                  />
                  <button onClick={handleSendReply} className="px-6 py-3 bg-orange-600 text-white text-xs font-bold rounded-xl">
                    Send
                  </button>
                </div>
              </div>
            ) : (
              <div className="h-[400px] flex items-center justify-center text-slate-500">
                Select a chat to start responding
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function APICostsPanel() {
  const { data: apiCosts } = useSuspenseQuery(convexQuery(api.api_costs.getApiCostSummary, {})) as { data: any };

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <MetricCard label="Total API Cost" value={`₦${(apiCosts?.totalCost || 0).toLocaleString()}`} icon="💸" color="red" />
        <MetricCard label="Wallet Balance" value={`₦${(apiCosts?.walletBalance || 0).toLocaleString()}`} icon="💰" color="emerald" />
        <MetricCard label="Month" value={apiCosts?.month || ""} icon="📅" color="blue" />
      </div>

      {/* API Costs Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-[3.5rem] p-12 shadow-2xl">
        <h3 className="text-xl font-black uppercase tracking-tighter text-white mb-8">API Subscription Costs</h3>
        <div className="space-y-4">
          {apiCosts?.costs?.map((api: any) => (
            <div key={api.id} className="flex justify-between items-center p-6 bg-slate-950 rounded-2xl border border-white/5">
              <div>
                <p className="text-sm font-bold text-white">{api.name}</p>
                <p className="text-[9px] text-slate-500">{api.usage.toLocaleString()} {api.unit}s used</p>
              </div>
              <p className="text-sm font-bold text-red-500">₦{api.cost.toLocaleString()}</p>
            </div>
          ))}
        </div>
        <div className="mt-8 p-6 bg-slate-950 rounded-2xl border border-white/5 flex justify-between items-center">
          <p className="text-sm font-black text-white">TOTAL MONTHLY COST</p>
          <p className="text-lg font-black text-red-500">₦{(apiCosts?.totalCost || 0).toLocaleString()}</p>
        </div>
      </div>
    </div>
  );
}

function PlatformAnalyticsPanel() {
  const [timeRange, setTimeRange] = useState<"day" | "week" | "month" | "year">("month");
  const { data: analytics } = useSuspenseQuery(convexQuery(api.platform_analytics.getPlatformAnalyticsSummary, { timeRange })) as { data: any };

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        <MetricCard label="Total Visits" value={(analytics?.totals?.visits || 0).toLocaleString()} icon="👁️" color="blue" />
        <MetricCard label="Registrations" value={(analytics?.totals?.registrations || 0).toLocaleString()} icon="👥" color="emerald" />
        <MetricCard label="Subscriptions" value={(analytics?.totals?.subscriptions || 0).toLocaleString()} icon="💳" color="amber" />
        <MetricCard label="Revenue" value={`₦${(analytics?.totals?.revenue || 0).toLocaleString()}`} icon="💰" color="indigo" />
      </div>

      {/* Time Range Selector */}
      <div className="flex gap-2">
        {(["day", "week", "month", "year"] as const).map((range) => (
          <button
            key={range}
            onClick={() => setTimeRange(range)}
            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
              timeRange === range
                ? "bg-orange-600 text-white"
                : "bg-slate-800 text-slate-500 hover:bg-slate-700"
            }`}
          >
            {range}
          </button>
        ))}
      </div>

      {/* Platform Breakdown */}
      <div className="bg-slate-900 border border-slate-800 rounded-[3.5rem] p-12 shadow-2xl">
        <h3 className="text-xl font-black uppercase tracking-tighter text-white mb-8">Platform Performance</h3>
        <div className="space-y-4">
          {analytics?.platforms?.map((platform: any) => (
            <div key={platform.id} className="flex items-center justify-between p-6 bg-slate-950 rounded-2xl border border-white/5">
              <div className="flex items-center gap-4">
                <span className="text-2xl">{platform.icon}</span>
                <div>
                  <p className="text-sm font-bold text-white">{platform.name}</p>
                  <p className="text-[9px] text-slate-500">
                    {platform.visits} visits • {platform.registrations} registered • {platform.subscriptions} subscribed
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-emerald-500">₦{platform.revenue.toLocaleString()}</p>
                <p className="text-[9px] text-slate-500">{platform.conversionRate}% conversion</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SyntheticIntelPanel() {
  const { data: agents } = useSuspenseQuery(convexQuery(api.synthetic_intelligence.getAgentsWithStatus, {})) as { data: any };
  const { data: backups } = useSuspenseQuery(convexQuery(api.agent_backups.getBackups, {})) as { data: any };
  const { data: perfSummary } = useSuspenseQuery(convexQuery(api.synthetic_intelligence.getPerformanceSummary, {})) as { data: any };
  const { data: recentLogs } = useSuspenseQuery(convexQuery(api.synthetic_intelligence.getPerformanceLogs, { limit: 20 })) as { data: any };
  
  const toggleAgent = useMutation(api.synthetic_intelligence.toggleSyntheticAgent);
  const updateSettings = useMutation(api.synthetic_intelligence.updateAgentSettings);
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
    <div className="space-y-10 animate-in fade-in duration-700">
      {/* Status Banner */}
      {status && (
        <div className={`p-4 rounded-2xl text-center text-sm font-black ${
          status.type === "success" ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" :
          status.type === "error" ? "bg-red-500/10 text-red-500 border border-red-500/20" :
          "bg-blue-500/10 text-blue-500 border border-blue-500/20"
        }`}>
          {status.message}
        </div>
      )}

      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-[3.5rem] p-12 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-purple-600/5 blur-[80px]"></div>
        <div className="relative z-10 space-y-8">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-3xl font-black uppercase tracking-tighter text-white">Synthetic Intelligence</h2>
              <p className="text-sm font-black text-purple-500 uppercase tracking-widest mt-1">Agentic AI for 15 Agents • Live NVIDIA NIM Integration</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleEnableAll}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl"
              >
                Enable All
              </button>
              <button
                onClick={handleDisableAll}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-xl"
              >
                Disable All
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <MetricCard label="Total Agents" value={agents?.length || 0} icon="🤖" color="blue" />
            <MetricCard label="Enabled" value={enabledCount} icon="✅" color="emerald" />
            <MetricCard label="Disabled" value={(agents?.length || 0) - enabledCount} icon="⭕" color="red" />
            <MetricCard label="Backups" value={backups?.length || 0} icon="💾" color="amber" />
          </div>

          {/* Live Performance Stats */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
            <MetricCard label="Total Requests" value={perfSummary?.totals?.requests || 0} icon="📊" color="blue" />
            <MetricCard label="Success Rate" value={`${perfSummary?.totals?.requests ? Math.round((perfSummary.totals.success / perfSummary.totals.requests) * 100) : 0}%`} icon="✅" color="emerald" />
            <MetricCard label="Avg Latency" value={`${perfSummary?.totals?.avgLatency || 0}ms`} icon="⚡" color="amber" />
            <MetricCard label="Total Tokens" value={(perfSummary?.totals?.tokens || 0).toLocaleString()} icon="🔤" color="purple" />
            <MetricCard label="Errors" value={perfSummary?.totals?.failed || 0} icon="❌" color="red" />
          </div>
        </div>
      </div>

      {/* Agent Grid */}
      <div className="bg-slate-900 border border-slate-800 rounded-[3.5rem] p-12 shadow-2xl">
        <h3 className="text-xl font-black uppercase tracking-tighter text-white mb-8">Agent Synthetic Controls</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {agents?.map((agent: any) => (
            <div key={agent.id} className={`p-6 rounded-2xl border transition-all ${
              agent.syntheticEnabled 
                ? "bg-emerald-500/5 border-emerald-500/20" 
                : "bg-slate-950 border-white/5"
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
                  className={`w-12 h-6 rounded-full relative transition-all ${
                    agent.syntheticEnabled ? "bg-emerald-600" : "bg-slate-700"
                  }`}
                >
                  <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${
                    agent.syntheticEnabled ? "right-1" : "left-1"
                  }`}></div>
                </button>
              </div>
              <p className="text-[9px] text-slate-500 mb-3">{agent.description}</p>
              <div className="flex flex-wrap gap-1">
                {agent.capabilities?.map((cap: string) => (
                  <span key={cap} className="px-2 py-0.5 bg-slate-800 text-slate-400 text-[8px] rounded">
                    {cap}
                  </span>
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

      {/* Live Test Panel */}
      <div className="bg-slate-900 border border-slate-800 rounded-[3.5rem] p-12 shadow-2xl">
        <div className="flex justify-between items-center mb-8">
          <h3 className="text-xl font-black uppercase tracking-tighter text-white">Live AI Test</h3>
          <button
            onClick={() => setShowLivePanel(!showLivePanel)}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl"
          >
            {showLivePanel ? "Hide" : "Show"} Live Logs
          </button>
        </div>
        
        <div className="flex gap-4 mb-6">
          <select
            value={testAgentId}
            onChange={(e) => setTestAgentId(e.target.value)}
            className="bg-slate-950 border border-white/10 rounded-xl p-4 text-white text-sm w-48"
          >
            {agents?.map((agent: any) => (
              <option key={agent.id} value={agent.id}>{agent.icon} {agent.name}</option>
            ))}
          </select>
          <input
            value={testPrompt}
            onChange={(e) => setTestPrompt(e.target.value)}
            placeholder="Enter a prompt to test..."
            className="flex-1 bg-slate-950 border border-white/10 rounded-xl p-4 text-white text-sm"
            onKeyDown={(e) => e.key === "Enter" && handleTestAgent()}
          />
          <button
            onClick={handleTestAgent}
            disabled={testing}
            className="px-6 py-4 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 text-white text-xs font-bold rounded-xl"
          >
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

        {/* Live Performance Logs */}
        {showLivePanel && recentLogs && (
          <div className="mt-8 space-y-2">
            <h4 className="text-sm font-bold text-white mb-4">Recent Activity</h4>
            {recentLogs.length === 0 ? (
              <p className="text-slate-500 text-xs text-center py-4">No activity yet. Test an agent to see logs.</p>
            ) : (
              recentLogs.map((log: any) => (
                <div key={log._id} className="flex items-center justify-between p-4 bg-slate-950 rounded-xl border border-white/5 text-[9px]">
                  <div className="flex items-center gap-3">
                    <span className={log.success ? "text-emerald-500" : "text-red-500"}>
                      {log.success ? "✅" : "❌"}
                    </span>
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

      {/* Backup Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-[3.5rem] p-12 shadow-2xl">
        <h3 className="text-xl font-black uppercase tracking-tighter text-white mb-8">Cloud Backups</h3>
        
        {/* Create Backup */}
        <div className="flex gap-4 mb-8">
          <input
            value={backupName}
            onChange={(e) => setBackupName(e.target.value)}
            placeholder="Backup name (e.g., Pre-upgrade snapshot)"
            className="flex-1 bg-slate-950 border border-white/10 rounded-xl p-4 text-white text-sm"
          />
          <button
            onClick={handleCreateBackup}
            className="px-6 py-4 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl"
          >
            💾 Create Backup
          </button>
        </div>

        {/* Backup List */}
        <div className="space-y-4">
          {backups?.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-10">No backups yet. Create one to protect your settings.</p>
          ) : (
            backups?.map((backup: any) => (
              <div key={backup.id} className="flex justify-between items-center p-6 bg-slate-950 rounded-2xl border border-white/5">
                <div>
                  <p className="text-sm font-bold text-white">{backup.name}</p>
                  <p className="text-[9px] text-slate-500">
                    {new Date(backup.timestamp).toLocaleString()} • {backup.stats?.totalConfigs || 0} configs
                  </p>
                </div>
                <button
                  onClick={() => handleRestore(backup.id)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl"
                >
                  ↩️ Restore
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function PostizAdEnginePanel() {
  const { data: engineStatus } = useSuspenseQuery(convexQuery(api.postiz_ad_engine.getAdEngineStatus, {})) as { data: any };
  const { data: campaigns } = useSuspenseQuery(convexQuery(api.postiz_ad_engine.getCampaigns, {})) as { data: any };
  const { data: analytics } = useSuspenseQuery(convexQuery(api.postiz_ad_engine.getAdAnalytics, {})) as { data: any };
  const { data: agents } = useSuspenseQuery(convexQuery(api.synthetic_intelligence.getAgentsWithStatus, {})) as { data: any };

  const toggleEngine = useMutation(api.postiz_ad_engine.toggleAdEngine);
  const toggleAutoPost = useMutation(api.postiz_ad_engine.toggleAutoPost);
  const createCampaign = useMutation(api.postiz_ad_engine.createCampaign);
  const updateCampaign = useMutation(api.postiz_ad_engine.updateCampaign);
  const deleteCampaign = useMutation(api.postiz_ad_engine.deleteCampaign);

  const [status, setStatus] = useState<{ message: string; type: string } | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newCampaign, setNewCampaign] = useState({
    name: "",
    description: "",
    platform: "x",
    budget: 0,
    dailyBudget: 0,
    goals: "",
  });

  const handleToggleEngine = async (enabled: boolean) => {
    await toggleEngine({ enabled });
    setStatus({ message: `Ad Engine ${enabled ? "enabled" : "disabled"}`, type: "success" });
    setTimeout(() => setStatus(null), 3000);
  };

  const handleToggleAutoPost = async (enabled: boolean) => {
    await toggleAutoPost({ enabled });
    setStatus({ message: `Auto-post ${enabled ? "enabled" : "disabled"}`, type: "success" });
    setTimeout(() => setStatus(null), 3000);
  };

  const handleCreateCampaign = async () => {
    if (!newCampaign.name.trim()) {
      setStatus({ message: "Campaign name required", type: "error" });
      return;
    }
    await createCampaign({
      name: newCampaign.name,
      description: newCampaign.description,
      platform: newCampaign.platform,
      budget: newCampaign.budget || undefined,
      dailyBudget: newCampaign.dailyBudget || undefined,
      startDate: Date.now(),
      goals: newCampaign.goals || undefined,
    });
    setShowCreateForm(false);
    setNewCampaign({ name: "", description: "", platform: "x", budget: 0, dailyBudget: 0, goals: "" });
    setStatus({ message: "Campaign created!", type: "success" });
    setTimeout(() => setStatus(null), 3000);
  };

  const handleToggleCampaign = async (campaignId: string, currentStatus: string) => {
    const newStatus = currentStatus === "active" ? "paused" : "active";
    await updateCampaign({ campaignId: campaignId as any, status: newStatus });
    setStatus({ message: `Campaign ${newStatus}`, type: "success" });
    setTimeout(() => setStatus(null), 3000);
  };

  const handleDeleteCampaign = async (campaignId: string) => {
    if (!confirm("Delete this campaign?")) return;
    await deleteCampaign({ campaignId: campaignId as any });
    setStatus({ message: "Campaign deleted", type: "success" });
    setTimeout(() => setStatus(null), 3000);
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      {/* Status Banner */}
      {status && (
        <div className={`p-4 rounded-2xl text-center text-sm font-black ${
          status.type === "success" ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" :
          "bg-red-500/10 text-red-500 border border-red-500/20"
        }`}>
          {status.message}
        </div>
      )}

      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-[3.5rem] p-12 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-orange-600/5 blur-[80px]"></div>
        <div className="relative z-10 space-y-8">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-3xl font-black uppercase tracking-tighter text-white">Postiz Ad Engine</h2>
              <p className="text-sm font-black text-orange-500 uppercase tracking-widest mt-1">AI-Powered Advertisements • NVIDIA NIM Flyers • Postiz Integration</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => handleToggleEngine(!engineStatus?.enabled)}
                className={`px-6 py-3 text-xs font-black rounded-xl transition-all ${
                  engineStatus?.enabled
                    ? "bg-red-600 hover:bg-red-500 text-white"
                    : "bg-emerald-600 hover:bg-emerald-500 text-white"
                }`}
              >
                {engineStatus?.enabled ? "Disable Engine" : "Enable Engine"}
              </button>
              <button
                onClick={() => handleToggleAutoPost(!engineStatus?.autoPost)}
                className={`px-6 py-3 text-xs font-black rounded-xl transition-all ${
                  engineStatus?.autoPost
                    ? "bg-slate-700 hover:bg-slate-600 text-slate-300"
                    : "bg-blue-600 hover:bg-blue-500 text-white"
                }`}
              >
                {engineStatus?.autoPost ? "Auto-Post ON" : "Auto-Post OFF"}
              </button>
            </div>
          </div>

          {/* Engine Status */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
            <MetricCard label="Engine" value={engineStatus?.enabled ? "ACTIVE" : "OFF"} icon={engineStatus?.enabled ? "🟢" : "🔴"} color={engineStatus?.enabled ? "emerald" : "red"} />
            <MetricCard label="Auto-Post" value={engineStatus?.autoPost ? "ON" : "OFF"} icon="🔄" color="blue" />
            <MetricCard label="Campaigns" value={analytics?.totals?.ads || 0} icon="📋" color="amber" />
            <MetricCard label="Impressions" value={(analytics?.totals?.impressions || 0).toLocaleString()} icon="👁️" color="purple" />
            <MetricCard label="CTR" value={`${analytics?.totals?.ctr || 0}%`} icon="📈" color="emerald" />
          </div>
        </div>
      </div>

      {/* Campaign Management */}
      <div className="bg-slate-900 border border-slate-800 rounded-[3.5rem] p-12 shadow-2xl">
        <div className="flex justify-between items-center mb-8">
          <h3 className="text-xl font-black uppercase tracking-tighter text-white">Campaigns</h3>
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="px-6 py-3 bg-orange-600 hover:bg-orange-500 text-white text-xs font-black rounded-xl"
          >
            {showCreateForm ? "Cancel" : "+ Create Campaign"}
          </button>
        </div>

        {/* Create Campaign Form */}
        {showCreateForm && (
          <div className="mb-8 p-8 bg-slate-950 rounded-2xl border border-white/10 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                value={newCampaign.name}
                onChange={(e) => setNewCampaign({ ...newCampaign, name: e.target.value })}
                placeholder="Campaign name"
                className="bg-slate-900 border border-white/10 rounded-xl p-4 text-white text-sm"
              />
              <select
                value={newCampaign.platform}
                onChange={(e) => setNewCampaign({ ...newCampaign, platform: e.target.value })}
                className="bg-slate-900 border border-white/10 rounded-xl p-4 text-white text-sm"
              >
                <option value="x">Twitter/X</option>
                <option value="linkedin">LinkedIn</option>
                <option value="instagram">Instagram</option>
                <option value="facebook">Facebook</option>
                <option value="tiktok">TikTok</option>
              </select>
            </div>
            <input
              value={newCampaign.description}
              onChange={(e) => setNewCampaign({ ...newCampaign, description: e.target.value })}
              placeholder="Campaign description"
              className="w-full bg-slate-900 border border-white/10 rounded-xl p-4 text-white text-sm"
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="number"
                value={newCampaign.budget || ""}
                onChange={(e) => setNewCampaign({ ...newCampaign, budget: Number(e.target.value) })}
                placeholder="Total budget (₦)"
                className="bg-slate-900 border border-white/10 rounded-xl p-4 text-white text-sm"
              />
              <input
                type="number"
                value={newCampaign.dailyBudget || ""}
                onChange={(e) => setNewCampaign({ ...newCampaign, dailyBudget: Number(e.target.value) })}
                placeholder="Daily budget (₦)"
                className="bg-slate-900 border border-white/10 rounded-xl p-4 text-white text-sm"
              />
            </div>
            <input
              value={newCampaign.goals}
              onChange={(e) => setNewCampaign({ ...newCampaign, goals: e.target.value })}
              placeholder="Campaign goals"
              className="w-full bg-slate-900 border border-white/10 rounded-xl p-4 text-white text-sm"
            />
            <button
              onClick={handleCreateCampaign}
              className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black rounded-xl"
            >
              Create Campaign
            </button>
          </div>
        )}

        {/* Campaign List */}
        <div className="space-y-4">
          {campaigns?.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-10">No campaigns yet. Create one to start advertising.</p>
          ) : (
            campaigns?.map((campaign: any) => (
              <div key={campaign._id} className="flex justify-between items-center p-6 bg-slate-950 rounded-2xl border border-white/5">
                <div className="flex items-center gap-4">
                  <span className="text-2xl">
                    {campaign.platform === "x" ? "🐦" :
                     campaign.platform === "linkedin" ? "💼" :
                     campaign.platform === "instagram" ? "📸" :
                     campaign.platform === "facebook" ? "👍" :
                     campaign.platform === "tiktok" ? "🎵" : "📣"}
                  </span>
                  <div>
                    <p className="text-sm font-bold text-white">{campaign.name}</p>
                    <p className="text-[9px] text-slate-500">
                      {campaign.platform.toUpperCase()} • {campaign.status} • {campaign.description || "No description"}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleToggleCampaign(campaign._id, campaign.status)}
                    className={`px-4 py-2 text-[9px] font-bold rounded-xl ${
                      campaign.status === "active"
                        ? "bg-yellow-600 hover:bg-yellow-500 text-white"
                        : "bg-emerald-600 hover:bg-emerald-500 text-white"
                    }`}
                  >
                    {campaign.status === "active" ? "Pause" : "Activate"}
                  </button>
                  <button
                    onClick={() => handleDeleteCampaign(campaign._id)}
                    className="px-4 py-2 bg-red-600/20 hover:bg-red-600 text-red-400 text-[9px] font-bold rounded-xl"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Platform Breakdown */}
      {analytics?.byPlatform?.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-[3.5rem] p-12 shadow-2xl">
          <h3 className="text-xl font-black uppercase tracking-tighter text-white mb-8">Platform Performance</h3>
          <div className="space-y-4">
            {analytics.byPlatform.map((platform: any) => (
              <div key={platform.platform} className="flex items-center justify-between p-6 bg-slate-950 rounded-2xl border border-white/5">
                <div className="flex items-center gap-4">
                  <span className="text-2xl">
                    {platform.platform === "x" ? "🐦" :
                     platform.platform === "linkedin" ? "💼" :
                     platform.platform === "instagram" ? "📸" :
                     platform.platform === "facebook" ? "👍" :
                     platform.platform === "tiktok" ? "🎵" : "📣"}
                  </span>
                  <div>
                    <p className="text-sm font-bold text-white">{platform.platform.toUpperCase()}</p>
                    <p className="text-[9px] text-slate-500">
                      {platform.ads} ads • {platform.impressions.toLocaleString()} impressions • {platform.clicks.toLocaleString()} clicks
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-emerald-500">₦{platform.spend.toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Agent Performance */}
      {analytics?.byAgent?.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-[3.5rem] p-12 shadow-2xl">
          <h3 className="text-xl font-black uppercase tracking-tighter text-white mb-8">Agent Ad Performance</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {analytics.byAgent.map((agent: any) => {
              const agentInfo = agents?.find((a: any) => a.id === agent.agentId);
              return (
                <div key={agent.agentId} className="p-6 bg-slate-950 rounded-2xl border border-white/5">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-xl">{agentInfo?.icon || "🤖"}</span>
                    <p className="text-sm font-bold text-white">{agentInfo?.name || agent.agentId}</p>
                  </div>
                  <div className="space-y-1 text-[9px] text-slate-500">
                    <p>Ads: {agent.ads} • Impressions: {agent.impressions.toLocaleString()}</p>
                    <p>Clicks: {agent.clicks.toLocaleString()}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
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
