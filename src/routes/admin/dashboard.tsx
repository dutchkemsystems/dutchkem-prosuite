import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useSuspenseQuery } from "@tanstack/react-query"
import { convexQuery } from "@convex-dev/react-query"
import { useAction, useConvexAuth, useMutation, useQuery } from "convex/react"
import { useAuthActions } from "@convex-dev/auth/react"
import { Component,  Suspense, useCallback, useEffect, useState } from "react"
import { api } from "../../../convex/_generated/api"
import type {ReactNode} from "react";
import { CompanyLogo } from "~/components/CompanyLogo";
import { useSocket } from "~/lib/socket";
import { LiveFeed } from "~/components/LiveFeed";
import { LiveCharts } from "~/components/LiveCharts";
import { PaymentMonitor } from "~/components/PaymentMonitor";
import { InactivityLogout } from "~/components/InactivityLogout";
import { ComposioAdminHub } from "~/components/ComposioAdminHub";
import { RenewalsTithePanel } from "~/components/RenewalsTithePanel";
import { ComposioObservability } from "~/components/ComposioObservability";
import { TryPostScheduler } from "~/components/TryPostScheduler";
import { AutoHealDashboard } from "~/components/AutoHealDashboard";
import { ComposioEnhancementPanel } from "~/components/ComposioEnhancementPanel";
import { TaxCompliancePanel } from "~/components/TaxCompliancePanel";
import { EnterprisePortalAdmin } from "~/components/enterprise/EnterprisePortalAdmin";
import { AdminEnterpriseHub } from "~/components/admin/AdminEnterpriseHub";
import { MimoControlPanel } from "~/components/admin/MimoControlPanel";
import { RapidAPIFallbackDashboard } from "~/components/admin/RapidAPIFallbackDashboard";
import { RevenueHub } from "~/components/admin/RevenueHub";
import AutoFlyerDashboard from "~/components/admin/AutoFlyerDashboard";
import CurrencyConverter from "~/components/admin/CurrencyConverter";
import AdAutomationHub from "~/components/admin/enterprise/AdAutomationHub";
import AdminPayoutDashboard from "~/components/admin/enterprise/AdminPayoutDashboard";

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
  errorComponent: ({ error }) => (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4">
      <div className="max-w-lg w-full bg-red-500/10 border border-red-500/20 rounded-2xl p-8 text-center">
        <p className="text-red-400 font-black text-xl mb-4">Dashboard Error</p>
        <p className="text-red-300 text-sm font-mono break-all mb-4">{String(error?.message || error)}</p>
        <div className="flex gap-3 justify-center">
          <button onClick={() => window.location.reload()} className="px-6 py-3 bg-white/10 rounded-xl text-white text-sm font-bold hover:bg-white/20 transition-colors">Retry</button>
          <a href="/admin/login" className="px-6 py-3 bg-red-600 rounded-xl text-white text-sm font-bold hover:bg-red-700 transition-colors">Re-login</a>
        </div>
      </div>
    </div>
  ),
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

  // Continuously validate the session against the backend.
  // If the backend session was deleted/expired/revoked, log the user out.
  // This protects against stale localStorage tokens pointing to dead sessions.
  const sessionCheck = useQuery(
    api.auth_helpers.checkAdminSession,
    adminToken ? { adminToken } : "skip"
  );
  useEffect(() => {
    if (!adminToken) return;
    if (sessionCheck && sessionCheck.valid === false) {
      localStorage.removeItem('admin_session_token');
      localStorage.removeItem('auth_access_token');
      localStorage.removeItem('auth_refresh_token');
      localStorage.removeItem('auth_token_type');
      localStorage.removeItem('auth_expires_at');
      navigate({ to: '/admin/login' });
    }
  }, [sessionCheck, adminToken, navigate]);

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
            <AdminTab active={activeTab === "ad-automation"} onClick={() => setActiveTab("ad-automation")} icon="🚀" label="Ad Automation" />
            <AdminTab active={activeTab === "kyc-payouts"} onClick={() => setActiveTab("kyc-payouts")} icon="💸" label="KYC & Payouts" />
              <AdminTab active={activeTab === "composio-hub"} onClick={() => setActiveTab("composio-hub")} icon="🔗" label="Composio Hub" />
              <AdminTab active={activeTab === "composio-obs"} onClick={() => setActiveTab("composio-obs")} icon="🔌" label="Composio Max" />
              <AdminTab active={activeTab === "trypost"} onClick={() => setActiveTab("trypost")} icon="📅" label="TryPost" />
              <AdminTab active={activeTab === "auto-heal"} onClick={() => setActiveTab("auto-heal")} icon="🛡️" label="Auto-Heal" />
              <AdminTab active={activeTab === "renewals-tithe"} onClick={() => setActiveTab("renewals-tithe")} icon="🔄" label="Renewals & Tithe" />
               <AdminTab active={activeTab === "composio-enhance"} onClick={() => setActiveTab("composio-enhance")} icon="🔧" label="Composio Enhance" />
               <AdminTab active={activeTab === "tax-compliance"} onClick={() => setActiveTab("tax-compliance")} icon="📋" label="Tax Compliance" />
                 <AdminTab active={activeTab === "enterprise"} onClick={() => setActiveTab("enterprise")} icon="🏢" label="Enterprise Hub" />
                 <AdminTab active={activeTab === "enterprise-portal"} onClick={() => setActiveTab("enterprise-portal")} icon="🌐" label="Enterprise Portal" />
                  <AdminTab active={activeTab === "mimo"} onClick={() => setActiveTab("mimo")} icon="🧠" label="Mimo V.2.5" />
                   <AdminTab active={activeTab === "rapidapi"} onClick={() => setActiveTab("rapidapi")} icon="🔄" label="RapidAPI Fallback" />
                    <AdminTab active={activeTab === "revenue"} onClick={() => setActiveTab("revenue")} icon="💰" label="Revenue Hub" />
                    <AdminTab active={activeTab === "currency"} onClick={() => setActiveTab("currency")} icon="💱" label="Currency Converter" />
                    <AdminTab active={activeTab === "auto-flyer"} onClick={() => setActiveTab("auto-flyer")} icon="🎨" label="Auto Flyer" />
        </nav>

        <div className="p-6 border-t border-slate-800 bg-slate-900/50">
          <button onClick={handleLogout} className="w-full py-4 bg-slate-800 hover:bg-red-900/20 text-slate-400 hover:text-red-500 rounded-2xl font-black text-xs transition-all flex items-center justify-center gap-3 border border-slate-700 uppercase tracking-widest">
            Logout Admin
          </button>
        </div>
      </aside>

      <main className="flex-grow overflow-y-auto h-screen flex flex-col bg-slate-950">
        <AdminSuspense>
           <AdminHeader adminToken={adminToken} />
        </AdminSuspense>

        <div className="p-4 md:p-10 space-y-8 md:space-y-12 max-w-[1800px] mx-auto w-full pb-32">
          <AdminSuspense>
            {activeTab === "overview" && <StatsOverviewLazy />}
            {activeTab === "live-feed" && <LiveFeed />}
            {activeTab === "live-charts" && <LiveCharts />}
            {activeTab === "payments" && <PaymentMonitor />}
            {activeTab === "manual-task" && <ManualAgentTaskPanel />}
            {activeTab === "social" && <SocialEnginePanel adminToken={adminToken} />}
            {activeTab === "guardian" && <GuardianWatchPanel />}
            {activeTab === "tax" && <TaxDashboardPanel />}
            {activeTab === "payouts" && <DailySweepStatusPanel />}
            {activeTab === "security" && <SecurityHubPanel adminToken={adminToken} />}
            {activeTab === "agents" && <AgentHealthMatrixLazy />}
            {activeTab === "freelancers" && <FreelancerPanelLazy />}
            {activeTab === "audit" && <AuditTrailPanel />}
            {activeTab === "discounts" && <HolidayDiscountsPanel />}
            {activeTab === "updates" && <AutoUpdatesPanel />}
            {activeTab === "charity" && <CharityDashboardPanel />}
            {activeTab === "marketplace" && <FreelancerMarketplacePanel />}
            {activeTab === "cloud-memory" && <CloudMemoryPanel adminToken={adminToken} />}
            {activeTab === "voice-roi" && <VoiceROIPanel />}
            {activeTab === "live-chats" && <LiveChatsPanel />}
            {activeTab === "api-costs" && <APICostsPanel />}
             {activeTab === "platform-analytics" && <PlatformAnalyticsPanel />}
             {activeTab === "synthetic" && <SyntheticIntelPanel />}
              {activeTab === "ad-engine" && <AdEnginePanel />}
              {activeTab === "ad-automation" && <AdAutomationHub adminToken={adminToken} />}
              {activeTab === "kyc-payouts" && <AdminPayoutDashboard adminToken={adminToken} />}
             {activeTab === "composio-hub" && <ComposioAdminHub adminToken={adminToken} />}
             {activeTab === "composio-obs" && <ComposioObservability adminToken={adminToken} />}
             {activeTab === "trypost" && <TryPostScheduler adminToken={adminToken} />}
             {activeTab === "auto-heal" && <AutoHealDashboard adminToken={adminToken} />}
              {activeTab === "renewals-tithe" && <RenewalsTithePanel adminToken={adminToken} />}
               {activeTab === "composio-enhance" && <ComposioEnhancementPanel adminToken={adminToken} />}
               {activeTab === "tax-compliance" && <TaxCompliancePanel adminToken={adminToken} />}
                 {activeTab === "enterprise" && <AdminEnterpriseHub adminToken={adminToken} />}
                {activeTab === "enterprise-portal" && <EnterprisePortalAdmin adminToken={adminToken} />}
                 {activeTab === "mimo" && <MimoControlPanel adminToken={adminToken} />}
                  {activeTab === "rapidapi" && <RapidAPIFallbackDashboard adminToken={adminToken} />}
                    {activeTab === "revenue" && <RevenueHub adminToken={adminToken} />}
                    {activeTab === "currency" && <CurrencyConverter />}
                    {activeTab === "auto-flyer" && <AutoFlyerDashboard />}
           </AdminSuspense>
        </div>
        <Footer />
      </main>
    </div>
  );
}

function AdminHeader({ adminToken }: { adminToken: string }) {
  const { data: uaeStatus } = useSuspenseQuery(convexQuery(api.uae_engine.getSystemStatus, {})) as { data: any };
  const { data: upgradeStatus } = useSuspenseQuery(convexQuery(api.admin.getUpgradeStatus, {})) as { data: any };
  const { data: adminProfile } = useSuspenseQuery(convexQuery(api.admin.getAdminProfile, { adminToken })) as { data: any };

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
            <AdminProfileCard profile={adminProfile} adminToken={adminToken} />
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
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);

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

  const agentServices: Record<string, Array<string>> = {
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
  const { data: logs } = useSuspenseQuery(convexQuery(api.uae_engine.getManualTaskLogs, {})) as { data: any[] };
  const generateTask = useMutation(api.uae_engine.generateAdminManualTask);

  // Poll for task completion
  useEffect(() => {
    if (!currentTaskId) return;
    let cancelled = false;
    const poll = async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_CONVEX_URL.replace('.cloud', '.site')}/api/admin/task-status?taskId=${currentTaskId}`);
        if (res.ok) {
          const data = await res.json();
          if (data.status === "completed" && !cancelled) {
            setTaskOutput({ output: data.output, status: "completed" });
            setIsGenerating(false);
            setCurrentTaskId(null);
          } else if (data.status === "failed" && !cancelled) {
            setTaskOutput({ output: data.output || "Task failed", status: "failed" });
            setIsGenerating(false);
            setCurrentTaskId(null);
          }
        }
      } catch {}
    };
    const interval = setInterval(poll, 2000);
    poll();
    return () => { cancelled = true; clearInterval(interval); };
  }, [currentTaskId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt) return;
    setIsGenerating(true);
    setTaskOutput(null);
    try {
      const result = await generateTask({ agentId, serviceId: serviceId || "General", prompt, userEmail });
      if (result?.taskId) {
        setCurrentTaskId(result.taskId);
      } else {
        setTaskOutput({ output: result?.error || "Failed to start task", status: "failed" });
        setIsGenerating(false);
      }
    } catch (err: any) {
      setTaskOutput({ output: err.message, status: "failed" });
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
              {isGenerating ? "Executing Agent..." : `Generate Task — ${selectedAgent?.name || 'Agent'}`}
            </button>
          </form>

          {/* Live Task Output */}
          {isGenerating && (
            <div className="mt-6 p-6 bg-orange-500/10 border border-orange-500/20 rounded-2xl text-center">
              <div className="text-2xl mb-2 animate-pulse">⚡</div>
              <p className="text-sm font-black text-orange-500 uppercase tracking-widest">Generating with {selectedAgent?.name} AI...</p>
              <p className="text-[10px] text-slate-500 mt-1">The real agent is processing your request. This may take 10-30 seconds.</p>
            </div>
          )}
          {taskOutput && (
            <div className="mt-6 p-6 bg-slate-950 border border-white/5 rounded-2xl space-y-3">
              <div className="flex justify-between items-center">
                <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">Agent Output — {selectedAgent?.name}</p>
                <span className={`px-2 py-1 rounded text-[8px] font-black uppercase ${taskOutput.status === "completed" ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"}`}>
                  {taskOutput.status}
                </span>
              </div>
              <div className="text-[11px] text-slate-300 font-medium whitespace-pre-wrap leading-relaxed max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                {taskOutput.output}
              </div>
            </div>
          )}
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
  const { data: taxData } = useSuspenseQuery(convexQuery(api.admin.getTaxWalletStats, {})) as { data: any };
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

function SocialEnginePanel({ adminToken }: { adminToken: string }) {
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
  // FIX: getOAuthProviderStatus is a QUERY on the backend, NOT an action.
  // Using useAction here was the actual root cause of the [CONVEX M(...)] errors —
  // the dashboard was calling a query via /api/action, which always failed,
  // so providerStatus was always null, so the dashboard ALWAYS fell back to
  // direct OAuth instead of using Composio as primary.
  // Now using useQuery (which goes to /api/query) so the value actually loads.
  const providerStatus = useQuery(api.social.getOAuthProviderStatus, {});
  const disconnectPlatform = useMutation(api.social.disconnectPlatform);
  const disconnectAllPlatforms = useMutation(api.social.disconnectAllPlatforms);
  const updatePostingSettings = useMutation(api.social.updatePostingSettings);
  const manualPost = useAction(api.social.postToPlatform);

  const [platforms, setPlatforms] = useState<Array<any>>([]);
  const [platformsLoading, setPlatformsLoading] = useState(true);
  const [rotating, setRotating] = useState(false);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<"platforms" | "analytics" | "posts">("platforms");
  const [postingMode, setPostingMode] = useState<Record<string, string>>({});
  const [manualPostContent, setManualPostContent] = useState("");
  const [postingStatus, setPostingStatus] = useState<{ platformId: string; status: string; error?: string } | null>(null);
  const [toast, setToast] = useState<{ message: string; type: string } | null>(null);
  const [composioPoll, setComposioPoll] = useState<{ connectionId: string; platformId: string; startedAt: number } | null>(null);

  const fetchPlatforms = useCallback(async () => {
    try {
      const result = await getConnectedPlatformsAction({ adminToken });
      const platformsData = result.platforms || [];
      const availablePlatforms = result.availablePlatforms || [];
      const merged = availablePlatforms.map((ap: any) => {
        // Match by `id` OR `platformId` (getPlatformsFromDb now returns both)
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

  useEffect(() => {
    fetchPlatforms();
  }, [fetchPlatforms]);

  // Handle popup redirect: when OAuth callback redirects to ?connected=platform,
  // read the param and notify the user
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const connectedPlatform = params.get("connected");
    if (connectedPlatform) {
      const platformName = connectedPlatform.charAt(0).toUpperCase() + connectedPlatform.slice(1);
      setToast({ message: `✅ Connected to ${platformName}!`, type: "success" });
      setConnecting(null);
      fetchPlatforms();
      // Clean URL without reload
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [fetchPlatforms]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === "social_connection_success") {
        const platformName = event.data.platformId?.charAt(0).toUpperCase() + event.data.platformId?.slice(1);
        setToast({ message: `✅ Connected to ${platformName}!`, type: "success" });
        setConnecting(null);
        fetchPlatforms();
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [fetchPlatforms]);

  // localStorage fallback: popup writes result here when window.opener is null
  useEffect(() => {
    const checkLocalStorage = () => {
      try {
        const raw = localStorage.getItem("oauth_result");
        if (raw) {
          localStorage.removeItem("oauth_result");
          const data = JSON.parse(raw);
          if (data?.type === "social_connection_success") {
            const platformName = data.platformId?.charAt(0).toUpperCase() + data.platformId?.slice(1);
            setToast({ message: `✅ Connected to ${platformName}!`, type: "success" });
            setConnecting(null);
            fetchPlatforms();
          }
        }
        const composioRaw = localStorage.getItem("composio_result");
        if (composioRaw) {
          localStorage.removeItem("composio_result");
          const composioData = JSON.parse(composioRaw);
          if (composioData?.type === "composio_connection_complete" && composioData?.connectedAccountId) {
            setComposioPoll({
              connectionId: composioData.connectedAccountId,
              platformId: composioData.platformId || "unknown",
              startedAt: Date.now(),
            });
          }
        }
      } catch {}
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key === "oauth_result" || e.key === "composio_result") checkLocalStorage();
    };
    window.addEventListener("storage", onStorage);
    const interval = setInterval(checkLocalStorage, 1500);
    return () => { clearInterval(interval); window.removeEventListener("storage", onStorage); };
  }, [fetchPlatforms]);

  // Composio postMessage: popup notifies us with the connected_account_id
  useEffect(() => {
    const handleComposioMessage = (event: MessageEvent) => {
      const data: any = event.data;
      if (data?.type === "composio_connection_complete" && data?.connectedAccountId) {
        setComposioPoll({
          connectionId: data.connectedAccountId,
          platformId: data.platformId || "unknown",
          startedAt: Date.now(),
        });
      }
    };
    window.addEventListener("message", handleComposioMessage);
    return () => window.removeEventListener("message", handleComposioMessage);
  }, []);

  // Pick up composio pending connections from handleConnectAll (stored in localStorage)
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
                setComposioPoll({
                  connectionId: data.connectionId,
                  platformId,
                  startedAt: data.startedAt || Date.now(),
                });
              }
            }
          }
        }
      } catch {}
    };
    const interval = setInterval(checkPending, 2000);
    checkPending();
    return () => clearInterval(interval);
  }, [composioPoll]);

  // Composio poll: keep asking the backend to extract tokens until ACTIVE
  // (or 90s timeout)
  useEffect(() => {
    if (!composioPoll) return;
    let cancelled = false;

    const tick = async () => {
      if (cancelled) return;
      const result: any = await handleComposioCallback({
        platform: composioPoll.platformId,
        connectionId: composioPoll.connectionId,
        adminToken,
      });
      if (cancelled) return;
      if (result?.success) {
        setToast({ message: `✅ Connected to ${result.platformName} via Composio${result.username ? ` (@${result.username})` : ""}`, type: "success" });
        setConnecting(null);
        setComposioPoll(null);
        fetchPlatforms();
        return;
      }
      if (result?.error && /not active/i.test(result.error)) {
        // Still pending — keep polling
        return;
      }
      if (result?.error) {
        setToast({ message: `Composio: ${result.error}`, type: "error" });
        setConnecting(null);
        setComposioPoll(null);
      }
    };

    const interval = setInterval(tick, 2500);
    tick();

    const timeout = setTimeout(() => {
      if (!cancelled) {
        setToast({ message: "Composio connection timed out (90s). You can retry from the dashboard.", type: "error" });
        setConnecting(null);
        setComposioPoll(null);
      }
    }, 90_000);

    return () => {
      cancelled = true;
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [composioPoll, handleComposioCallback, fetchPlatforms]);

  const showToast = (message: string, type: string) => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  };

  const handleConnect = async (platformId: string) => {
    setConnecting(platformId);
    try {
      // Telegram: use bot token modal (no OAuth)
      if (platformId === "telegram") {
        const botToken = prompt("Enter your Telegram Bot Token (from @BotFather):\n\nFormat: 123456789:ABCdefGHIjklMNOpqrsTUVwxyz");
        if (!botToken) { setConnecting(null); return; }
        const result = await connectTelegramBot({ botToken, adminToken });
        if (result?.error) { showToast(result.error, "error"); }
        else { showToast(`Connected to Telegram (${result.username || "bot"})`, "success"); fetchPlatforms(); }
        setConnecting(null);
        return;
      }

      // Bluesky: use AT Protocol credentials modal
      if (platformId === "bluesky") {
        const identifier = prompt("Enter your Bluesky handle (e.g. alice.bsky.social):");
        if (!identifier) { setConnecting(null); return; }
        const appPassword = prompt("Enter your Bluesky App Password (create one at bsky.social/settings/app-passwords):");
        if (!appPassword) { setConnecting(null); return; }
        const result = await connectBluesky({ identifier, appPassword, adminToken });
        if (result?.error) { showToast(result.error, "error"); }
        else { showToast(`Connected to Bluesky (@${result.handle})`, "success"); fetchPlatforms(); }
        setConnecting(null);
        return;
      }

      // Provider selection: Composio → TryPost → Direct OAuth
      let authUrl: string | null = null;
      let usingProvider: "composio" | "trypost" | "direct" = "direct";
      let composioConnectionId: string | undefined = undefined;

      const composioAvailable =
        providerStatus?.composioEnabled === true &&
        providerStatus?.composioPlatforms?.includes(platformId);

      const trypostAvailable =
        providerStatus?.trypostEnabled === true &&
        providerStatus?.trypostPlatforms?.includes(platformId);

      if (composioAvailable) {
        // PRIMARY: Use Composio for managed OAuth
        const composioResult = await startComposioOAuth({ platform: platformId, adminToken });
        if (composioResult?.success && composioResult.redirectUrl) {
          authUrl = composioResult.redirectUrl;
          usingProvider = "composio";
          composioConnectionId = composioResult.connectionId;
        } else if (composioResult?.error) {
          console.warn("Composio failed, trying TryPost:", composioResult.error);
        }
      }

      if (!authUrl && trypostAvailable) {
        // SECONDARY: Use TryPost's Socialite OAuth
        const trypostResult = await startTryPostOAuth({ platform: platformId, adminToken });
        if (trypostResult?.success && trypostResult.redirectUrl) {
          authUrl = trypostResult.redirectUrl;
          usingProvider = "trypost";
        } else if (trypostResult?.error) {
          console.warn("TryPost failed, falling back to direct OAuth:", trypostResult.error);
        }
      }

      if (!authUrl) {
        // FALLBACK: Use direct platform OAuth
        const directResult = await generateOAuthUrl({ platform: platformId, adminToken });
        if (directResult?.error) {
          // If the error indicates TryPost is available, redirect there
          if (directResult.error.startsWith("TRYPST:")) {
            const tpPlatform = directResult.error.replace("TRYPST:", "");
            if (directResult.authUrl) {
              authUrl = directResult.authUrl;
              usingProvider = "trypost";
            }
          } else {
            showToast(directResult.error, "error");
            setConnecting(null);
            return;
          }
        } else {
          authUrl = directResult.authUrl || null;
          usingProvider = "direct";
        }
      }

      if (authUrl) {
        const width = 600;
        const height = 700;
        const left = (window.screen.width / 2) - (width / 2);
        const top = (window.screen.height / 2) - (height / 2);

        const popup = window.open(
          authUrl,
          `connect-${platformId}`,
          `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
        );

        if (!popup) {
          showToast("Popup blocked. Please allow popups for this site.", "error");
          setConnecting(null);
          return;
        }

        const popupCheck = setInterval(() => {
          if (popup.closed) {
            clearInterval(popupCheck);
            setConnecting(null);
            if (usingProvider === "composio" && composioConnectionId) {
              setComposioPoll({
                connectionId: composioConnectionId,
                platformId,
                startedAt: Date.now(),
              });
            } else if (usingProvider === "trypost") {
              // Sync from TryPost after popup closes
              syncFromTryPost({ platform: platformId, adminToken }).then((result) => {
                if (result?.synced && result.synced > 0) {
                  showToast(`Connected via TryPost (${result.synced} account synced)`, "success");
                } else {
                  showToast("Connected in TryPost. Click 'Sync from TryPost' if accounts don't appear.", "info");
                }
                fetchPlatforms();
              }).catch(() => {
                showToast("Connected in TryPost. Click 'Sync from TryPost' if accounts don't appear.", "info");
                fetchPlatforms();
              });
            } else {
              fetchPlatforms();
            }
          }
        }, 500);
      }
    } catch (err: any) {
      showToast(err?.message || "Failed to initiate connection", "error");
      setConnecting(null);
    }
  };

  const handleDisconnect = async (platformId: string, platformName: string) => {
    if (!confirm(`Disconnect from ${platformName}? Auto-posting to this platform will stop.`)) return;
    try {
      await disconnectPlatform({ platformId, adminToken });
      showToast(`Disconnected from ${platformName}`, "success");
      fetchPlatforms();
    } catch {
      showToast(`Failed to disconnect from ${platformName}`, "error");
    }
  };

  const handleConnectAll = async () => {
    const unconnected = platforms.filter((p) => !p.isConnected);
    if (unconnected.length === 0) {
      showToast("All platforms are already connected!", "success");
      return;
    }
    if (!confirm(`Connect all ${unconnected.length} platforms? Each will open its login page in a popup.`)) return;

    showToast(`Opening ${unconnected.length} platform connections...`, "success");
    let openedCount = 0;

    for (const p of unconnected) {
      try {
        let authUrl: string | null = null;
        let composioConnectionId: string | undefined = undefined;
        const composioAvailable =
          providerStatus?.composioEnabled === true &&
          providerStatus?.composioPlatforms?.includes(p.id);
        if (composioAvailable) {
          const cr = await startComposioOAuth({ platform: p.id, adminToken });
          if (cr?.success && cr?.redirectUrl) {
            authUrl = cr.redirectUrl;
            composioConnectionId = cr.connectionId;
          }
        }
        if (!authUrl) {
          const dr = await generateOAuthUrl({ platform: p.id, adminToken });
          if (dr?.authUrl) authUrl = dr.authUrl;
          else if (dr?.error) {
            showToast(`${p.name}: ${dr.error}`, "error");
            continue;
          }
        }
        if (authUrl) {
          const width = 600;
          const height = 700;
          const left = (window.screen.width / 2) - (width / 2);
          const top = (window.screen.height / 2) - (height / 2);
          window.open(
            authUrl,
            `connect-${p.id}`,
            `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
          );
          // If Composio, store the connection ID so the dashboard can poll
          if (composioConnectionId) {
            localStorage.setItem(`composio_pending_${p.id}`, JSON.stringify({
              connectionId: composioConnectionId,
              startedAt: Date.now(),
            }));
          }
          openedCount++;
          await new Promise((r) => setTimeout(r, 1500));
        }
      } catch (err: any) {
        showToast(`${p.name}: ${err.message}`, "error");
      }
    }
    showToast(`${openedCount} popups opened. Authorize in each window.`, "success");
  };

  // handleDisconnectAll removed — disconnectAllPlatforms not in current social engine
  const handleDisconnectAll = async () => {
    const connectedCount = platforms.filter((p) => p.isConnected).length;
    if (connectedCount === 0) {
      showToast("No platforms are connected!", "error");
      return;
    }
    if (!confirm(`Disconnect ALL ${connectedCount} connected platforms? Auto-posting will stop everywhere.`)) return;
    try {
      await disconnectAllPlatforms({ adminToken });
      showToast(`Disconnected all ${connectedCount} platforms`, "success");
      fetchPlatforms();
    } catch {
      showToast("Failed to disconnect platforms", "error");
    }
  };

  const handleModeChange = async (platformId: string, mode: "auto" | "manual" | "paused") => {
    setPostingMode((prev) => ({ ...prev, [platformId]: mode }));
    const result = await updatePostingSettings({
      platformId,
      mode,
      adminToken,
    });
    if (result?.success) {
      showToast(`${platformId.toUpperCase()} posting mode: ${mode.toUpperCase()}`, "success");
    }
  };

  const handleManualPost = async (platformId: string) => {
    if (!manualPostContent.trim()) {
      showToast("Please enter content to post", "error");
      return;
    }
    setPostingStatus({ platformId, status: "posting" });
    const result = await manualPost({ platform: platformId, content: manualPostContent, adminToken });
    if (result?.success) {
      setPostingStatus({ platformId, status: "success" });
      setManualPostContent("");
      showToast(`Post published to ${platformId}!`, "success");
      setTimeout(() => setPostingStatus(null), 3000);
      // FIX: refresh platforms so stats reflect the new post
      fetchPlatforms();
    } else {
      // FIX: postToPlatformHandler returns `{ success, postId, error }` — use `error` not `message`
      const errMsg = result?.error || result?.message || "Post failed";
      setPostingStatus({ platformId, status: "error", error: errMsg });
      showToast(errMsg, "error");
    }
  };

  if (platformsLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center space-y-4">
          <div className="w-10 h-10 border-3 border-slate-700 border-t-orange-500 rounded-full animate-spin mx-auto"></div>
          <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Loading platforms...</p>
        </div>
      </div>
    );
  }

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

      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-[3.5rem] p-12 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-orange-600/5 blur-[80px]"></div>
        <div className="relative z-10 space-y-10">
          <div className="flex justify-between items-center flex-wrap gap-4">
            <div>
              <h2 className="text-3xl font-black uppercase tracking-tighter text-white">Automated Social Engine</h2>
              <p className="text-sm font-black text-orange-500 uppercase tracking-widest mt-1">
                Direct OAuth + API Integration — No Third-Party
              </p>
            </div>
            <div className="flex gap-3 flex-wrap">
              <button
                onClick={handleConnectAll}
                disabled={connecting !== null}
                className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl shadow-emerald-600/20 disabled:opacity-50"
              >
                🔗 Connect All
              </button>
              <button
                onClick={handleDisconnectAll}
                disabled={connecting !== null}
                className="px-6 py-3 bg-red-600/20 hover:bg-red-600/40 text-red-400 border border-red-500/30 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-50"
              >
                ⛓️‍💥 Disconnect All
              </button>
              <button
                onClick={() => { fetchPlatforms(); showToast("Refreshing platforms...", "success"); }}
                disabled={platformsLoading}
                className="px-8 py-4 bg-orange-600 hover:bg-orange-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl shadow-orange-600/20 disabled:opacity-50 flex items-center gap-2"
              >
                {platformsLoading ? <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> : "🔄"}
                {platformsLoading ? "Refreshing..." : "Refresh Platforms"}
              </button>
              {providerStatus?.trypostEnabled && (
                <button
                  onClick={async () => {
                    const result = await syncFromTryPost({ adminToken });
                    if (result?.synced && result.synced > 0) {
                      showToast(`Synced ${result.synced} accounts from TryPost`, "success");
                    } else {
                      showToast(result?.error || "No new accounts found in TryPost", "info");
                    }
                    fetchPlatforms();
                  }}
                  className="px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl shadow-purple-600/20"
                >
                  🔄 Sync from TryPost
                </button>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <MetricCard label="Total Generated" value={stats?.total || 0} icon="📝" color="blue" />
            <MetricCard label="Live Posts" value={stats?.posted || 0} icon="🌐" color="emerald" />
            <MetricCard label="Scheduled" value={stats?.scheduled || 0} icon="📅" color="indigo" />
            <MetricCard label="Failed" value={stats?.failed || 0} icon="⚠️" color="red" />
          </div>

          {/* Sub-tabs */}
          <div className="flex gap-2 bg-slate-950 p-2 rounded-2xl border border-white/5">
            {(["platforms", "analytics", "posts"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveSubTab(tab)}
                className={`flex-1 py-3 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                  activeSubTab === tab ? "bg-orange-600 text-white" : "text-slate-500 hover:bg-slate-800"
                }`}
              >
                {tab === "platforms" ? "Connected Platforms" : tab === "analytics" ? "Platform Analytics" : "Post History"}
              </button>
            ))}
          </div>

          {/* ── Connected Platforms Tab ── */}
          {activeSubTab === "platforms" && (
            <div className="space-y-6">
              {/* OAuth provider banner — shows which provider is active */}
              <div className={`p-5 rounded-2xl border ${
                providerStatus?.composioEnabled
                  ? "bg-emerald-500/5 border-emerald-500/20"
                  : "bg-amber-500/5 border-amber-500/20"
              }`}>
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${
                      providerStatus?.composioEnabled ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/20 text-amber-400"
                    }`}>
                      {providerStatus?.composioEnabled ? "✓" : "⚠"}
                    </div>
                    <div>
                      <p className="text-xs font-black text-white uppercase tracking-widest">
                        OAuth Provider: {providerStatus?.composioEnabled ? "Composio (Primary)" : "Direct Platform OAuth"}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {providerStatus?.composioEnabled
                          ? `Composio manages ${providerStatus.composioPlatforms?.length || 0} platforms — managed OAuth, auto-refresh, 20k free calls/month`
                          : "Set COMPOSIO_API_KEY env var to enable Composio (recommended — one key for all 11 platforms)"}
                      </p>
                    </div>
                  </div>
                  {!providerStatus?.composioEnabled && (
                    <a
                      href="https://app.composio.dev"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white text-[10px] font-black uppercase tracking-widest rounded-lg"
                    >
                      Get Free Composio Key →
                    </a>
                  )}
                </div>
              </div>

              <div className="bg-slate-950 p-10 rounded-[2.5rem] border border-white/5">
                <h3 className="text-lg font-black text-white uppercase tracking-tighter mb-8">Connect via OAuth</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {platforms?.map((p: any) => (
                    <div
                      key={p.id}
                      className={`p-6 rounded-2xl border transition-all ${
                        p.isConnected
                          ? "bg-emerald-500/5 border-emerald-500/20"
                          : "bg-slate-900 border-white/5 hover:border-slate-700"
                      }`}
                    >
                      {/* Platform header */}
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center text-lg text-white"
                            style={{ backgroundColor: p.color || "#333" }}
                          >
                            {p.icon}
                          </div>
                          <div>
                            <p className="text-sm font-black text-white">{p.name}</p>
                            <p className="text-[9px] font-bold uppercase tracking-widest">
                              {p.isConnected ? (
                                <span className="text-emerald-500">
                                  Connected{p.username ? ` @${p.username}` : ""}
                                </span>
                              ) : (
                                <span className="text-slate-500">Not Connected</span>
                              )}
                            </p>
                            {!p.isConnected && providerStatus?.composioEnabled && providerStatus.composioPlatforms?.includes(p.id) && (
                              <p className="text-[8px] text-emerald-500 font-bold uppercase tracking-widest mt-0.5">
                                ⚡ via Composio
                              </p>
                            )}
                          </div>
                        </div>
                        <span
                          className={`w-3 h-3 rounded-full ${
                            p.isConnected ? "bg-emerald-500 animate-pulse" : "bg-slate-600"
                          }`}
                        ></span>
                      </div>

                      {p.isConnected ? (
                        <div className="space-y-3">
                          {/* Stats */}
                          <div className="flex justify-between text-[9px] font-bold">
                            <span className="text-slate-500 uppercase">Posts</span>
                            <span className="text-white">{p.postsCount}</span>
                          </div>
                          <div className="flex justify-between text-[9px] font-bold">
                            <span className="text-slate-500 uppercase">Followers</span>
                            <span className="text-white">{p.followersCount.toLocaleString()}</span>
                          </div>

                          {/* Auto / Manual / Pause controls */}
                          <div className="flex gap-1 mt-3">
                            {(["auto", "manual", "paused"] as const).map((mode) => (
                              <button
                                key={mode}
                                onClick={() => handleModeChange(p.id, mode)}
                                className={`flex-1 py-1.5 rounded-lg text-[8px] font-black uppercase transition-all ${
                                  (postingMode[p.id] || p.postingMode) === mode
                                    ? mode === "auto"
                                      ? "bg-emerald-600 text-white"
                                      : mode === "manual"
                                        ? "bg-blue-600 text-white"
                                        : "bg-amber-600 text-white"
                                    : "bg-slate-800 text-slate-500 hover:bg-slate-700"
                                }`}
                              >
                                {mode === "auto" ? "🤖 Auto" : mode === "manual" ? "✍️ Manual" : "⏸️ Pause"}
                              </button>
                            ))}
                          </div>

                          {/* Manual post input */}
                          {(postingMode[p.id] || p.postingMode) === "manual" && (
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
                                {postingStatus?.status === "posting" && postingStatus?.platformId === p.id
                                  ? "Posting..."
                                  : "📤 Post Now"}
                              </button>
                              {postingStatus?.platformId === p.id && postingStatus?.status === "success" && (
                                <p className="text-emerald-500 text-[9px] font-bold text-center">✅ Posted!</p>
                              )}
                              {postingStatus?.platformId === p.id && postingStatus?.status === "error" && (
                                <p className="text-red-500 text-[9px] font-bold text-center">❌ {postingStatus?.error}</p>
                              )}
                            </div>
                          )}

                          {/* Auto mode info */}
                          {(postingMode[p.id] || p.postingMode) === "auto" && (
                            <div className="mt-3 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                              <p className="text-emerald-500 text-[9px] font-bold">📅 Auto-posting active</p>
                              <p className="text-slate-500 text-[8px] mt-1">Schedule: Daily at 9:00 AM, 3:00 PM, 9:00 PM</p>
                            </div>
                          )}

                          {/* Paused state */}
                          {(postingMode[p.id] || p.postingMode) === "paused" && (
                            <div className="mt-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                              <p className="text-amber-500 text-[9px] font-bold">⏸️ Posting is paused</p>
                            </div>
                          )}

                          <button
                            onClick={() => handleDisconnect(p.id, p.name)}
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
                          {connecting === p.id ? (
                            <span className="flex items-center justify-center gap-2">
                              <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                              Connecting...
                            </span>
                          ) : (
                            `🔗 Connect ${p.name}`
                          )}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── Analytics Tab ── */}
          {activeSubTab === "analytics" && (
            <div className="space-y-6">
              <div className="bg-slate-950 p-10 rounded-[2.5rem] border border-white/5">
                <h3 className="text-lg font-black text-white uppercase tracking-tighter mb-8">Platform Performance</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                  <MetricCard label="Total Leads" value={analytics?.totalLeads || 0} icon="📊" color="blue" />
                  <MetricCard label="Total Users" value={analytics?.totalUsers || 0} icon="👥" color="emerald" />
                  <MetricCard
                    label="Total Revenue"
                    value={`₦${(analytics?.totalRevenue || 0).toLocaleString()}`}
                    icon="💰"
                    color="amber"
                  />
                </div>
                <div className="space-y-4">
                  {analytics?.platforms
                    ?.filter((p: any) => p.leads > 0 || p.registrations > 0)
                    .map((p: any) => (
                      <div
                        key={p.platform}
                        className="flex items-center justify-between p-6 bg-slate-900 rounded-2xl border border-white/5"
                      >
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

          {/* ── Post History Tab ── */}
          {activeSubTab === "posts" && (
            <div className="bg-slate-950 p-10 rounded-[2.5rem] border border-white/5">
              <h3 className="text-lg font-black text-white uppercase tracking-tighter mb-8">Post History</h3>
              <div className="space-y-4">
                {stats?.history?.map((p: any) => (
                  <div
                    key={p._id}
                    className="flex flex-col md:flex-row justify-between items-start md:items-center p-6 bg-slate-900 rounded-3xl border border-white/5 gap-4"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-slate-950 rounded-2xl flex items-center justify-center text-xl">
                        {p.platform === "x" ? "🐦" : p.platform === "linkedin" ? "💼" : "📱"}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white line-clamp-1 max-w-md">{p.content}</p>
                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-1">
                          {p.agentId} • {new Date(p.scheduledFor).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`px-4 py-1.5 rounded-full text-[8px] font-black uppercase tracking-widest border ${
                        p.status === "posted"
                          ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                          : p.status === "failed"
                            ? "bg-red-500/10 text-red-500 border-red-500/20"
                            : "bg-indigo-500/10 text-indigo-500 border-indigo-500/20"
                      }`}
                    >
                      {p.status}
                    </span>
                  </div>
                ))}
                {stats?.history?.length === 0 && (
                  <div className="text-center py-20 text-slate-600 font-bold uppercase tracking-widest italic opacity-30">
                    Waiting for first post...
                  </div>
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
  const { data: logs } = useSuspenseQuery(convexQuery(api.guardian_watch.getGuardianLogs, {})) as { data: any[] };
  const { data: dashboard } = useSuspenseQuery(convexQuery(api.guardian_watch.getGuardianDashboard, {})) as { data: any };
  const runDiagnosis = useAction(api.guardian_watch.runFullDiagnosis);
  const [running, setRunning] = useState(false);

  const handleRun = async () => {
    setRunning(true);
    await runDiagnosis({});
    setRunning(false);
  };

  const dash = dashboard ?? {};

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
            <MetricCard label="System Status" value={dash.status === 'optimal' ? 'OPTIMAL' : 'ATTENTION'} icon="🛡️" color={dash.status === 'optimal' ? 'emerald' : 'amber'} />
            <MetricCard label="Users" value={dash.userCount ?? 0} icon="👥" color="blue" />
            <MetricCard label="Total Tests" value={dash.totalTests ?? logs.length} icon="🧪" color="indigo" />
            <MetricCard label="Healed Issues" value={dash.healedCount ?? logs.filter((l: any) => l.status === 'healed').length} icon="🏥" color="teal" />
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

function MetricCard({ label, value, icon, color, subValue, onClick }: any) {
  const colors: any = {
    red: "from-red-500/20 to-red-600/5 border-red-500/20 text-red-500",
    blue: "from-blue-500/20 to-blue-600/5 border-blue-500/20 text-blue-500",
    emerald: "from-emerald-500/20 to-emerald-600/5 border-emerald-500/20 text-emerald-500",
    amber: "from-amber-500/20 to-amber-600/5 border-amber-500/20 text-amber-500",
    indigo: "from-indigo-500/20 to-indigo-600/5 border-indigo-500/20 text-indigo-500",
    teal: "from-teal-500/20 to-teal-600/5 border-teal-500/20 text-teal-500",
  };
  return (
    <div onClick={onClick} className={`p-8 bg-gradient-to-br ${colors[color]} border rounded-[2.5rem] shadow-2xl hover:scale-[1.02] transition-all relative overflow-hidden group ${onClick ? "cursor-pointer" : ""}`}>
      <div className="flex justify-between items-start mb-6">
         <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl bg-white shadow-xl">{icon}</div>
         {subValue && <span className="text-[10px] font-black uppercase tracking-widest opacity-60 bg-white/10 px-3 py-1 rounded-full">{subValue}</span>}
      </div>
      <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] mb-2">{label}</p>
      <h4 className="text-4xl font-black text-white tracking-tighter">{value}</h4>
      {onClick && <p className="text-[8px] font-black uppercase tracking-widest opacity-40 mt-2">Click to view details</p>}
    </div>
  );
}

function StatsOverview({ data, earnings, uaeStatus }: any) {
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const [liveEarnings, setLiveEarnings] = useState(earnings);
  const [liveTxs, setLiveTxs] = useState<any[]>([]);

  // Multi-currency exchange rates
  const EXCHANGE_RATES: Record<string, number> = {
    NGN: 1,
    USD: 1500,
    GBP: 1900,
    EUR: 1650,
  };

  const CURRENCY_SYMBOLS: Record<string, string> = {
    NGN: '₦',
    USD: '$',
    GBP: '£',
    EUR: '€',
  };

  // Calculate wallet balance in all currencies
  const walletBalance = liveEarnings?.allTime?.share || 0;
  const walletCurrencies = Object.entries(EXCHANGE_RATES).map(([code, rate]) => ({
    code,
    symbol: CURRENCY_SYMBOLS[code],
    amount: Math.round(walletBalance / rate),
    rate,
  }));

  // Live poll every second
  useEffect(() => {
    const fetchLive = async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_CONVEX_URL.replace('.cloud', '.site')}/api/admin/earnings-live`);
        if (res.ok) {
          const d = await res.json();
          if (d.earnings) setLiveEarnings(d.earnings);
          if (d.txs) setLiveTxs(d.txs);
        }
      } catch {}
    };
    fetchLive();
    const interval = setInterval(fetchLive, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleCardClick = (card: string) => {
    setExpandedCard(expandedCard === card ? null : card);
  };

  const formatTx = (tx: any) => ({
    id: tx._id || tx.reference,
    name: tx.platformUsername || tx.accountName || "User",
    bank: tx.bankName || tx.platform || "N/A",
    purpose: tx.purpose || tx.agentId || "Service payment",
    amount: tx.amount,
    fee: Math.round(tx.amount * 0.15),
    share: Math.round(tx.amount * 0.85),
    time: tx.verifiedAt || tx._creationTime,
    status: tx.status,
  });

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        <MetricCard
          label="Monthly Payout (Est)"
          value={`₦${((liveEarnings?.month?.share || 0) / 1000000).toFixed(2)}M`}
          icon="💰" color="emerald"
          subValue="Ready to Sweep"
          onClick={() => handleCardClick("sweep")}
        />
        <MetricCard
          label="Evolution Status"
          value={uaeStatus.code}
          icon="🔄"
          color={uaeStatus.type === 'success' ? 'emerald' : 'amber'}
          subValue={uaeStatus.status}
        />
        <MetricCard
          label="System Health"
          value="OPTIMAL"
          icon="🛡️" color="blue"
          subValue="AES-256 Active"
        />
        <MetricCard
          label="Total Fees Collected"
          value={`₦${((liveEarnings?.allTime?.fee || 0) / 1000000).toFixed(2)}M`}
          icon="🏛️" color="amber"
          onClick={() => handleCardClick("fees")}
        />
      </div>

      {/* Multi-Currency Wallet Display */}
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-[2rem] p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-black text-white">💱 Wallet Balance (Multi-Currency)</h3>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest">Live rates • Updated in real-time</p>
          </div>
          <div className="px-4 py-2 bg-green-500/10 border border-green-500/20 rounded-xl">
            <span className="text-green-400 font-bold text-sm">✓ Live Rates</span>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {walletCurrencies.map((curr) => (
            <div key={curr.code} className="bg-white/5 rounded-xl p-5 border border-white/10 hover:border-white/20 transition-all">
              <div className="flex items-center justify-between mb-3">
                <span className="text-2xl">{curr.symbol}</span>
                <span className="text-xs text-slate-400 font-bold">{curr.code}</span>
              </div>
              <div className="text-2xl font-black text-white">{curr.symbol}{curr.amount.toLocaleString()}</div>
              <div className="text-[10px] text-slate-500 mt-1">Rate: 1 {curr.code} = ₦{curr.rate.toLocaleString()}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Expanded Transaction Panels */}
      {expandedCard === "sweep" && (
        <div className="bg-slate-900 border border-slate-800 rounded-[3rem] overflow-hidden shadow-2xl animate-in fade-in duration-300">
          <div className="p-10 border-b border-slate-800 flex justify-between items-center">
            <div>
              <h2 className="text-xl font-black uppercase tracking-tighter">Ready to Sweep — Monthly Payout Transactions</h2>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">Live • Updates every second • ₦{((liveEarnings?.month?.share || 0)).toLocaleString()} total</p>
            </div>
            <button onClick={() => setExpandedCard(null)} className="text-slate-500 hover:text-white text-2xl">✕</button>
          </div>
          <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-950/50 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 sticky top-0">
                <tr>
                  <th className="px-10 py-6">Name</th>
                  <th className="px-10 py-6">Platform/Bank</th>
                  <th className="px-10 py-6">Purpose</th>
                  <th className="px-10 py-6">Amount (₦)</th>
                  <th className="px-10 py-6">Fee (15%)</th>
                  <th className="px-10 py-6">Your Share</th>
                  <th className="px-10 py-6">Time</th>
                  <th className="px-10 py-6">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-[11px]">
                {liveTxs.length === 0 ? (
                  <tr><td colSpan={8} className="px-10 py-10 text-center text-slate-500">Loading transactions...</td></tr>
                ) : (
                  liveTxs.filter((t: any) => t.status === "approved").map((tx: any) => {
                    const f = formatTx(tx);
                    return (
                      <tr key={f.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="px-10 py-6 font-black text-white">{f.name}</td>
                        <td className="px-10 py-6 text-slate-400">{f.bank}</td>
                        <td className="px-10 py-6 text-slate-400">{f.purpose}</td>
                        <td className="px-10 py-6 font-bold text-white">₦{f.amount.toLocaleString()}</td>
                        <td className="px-10 py-6 font-bold text-red-500">- ₦{f.fee.toLocaleString()}</td>
                        <td className="px-10 py-6 font-black text-emerald-500">+ ₦{f.share.toLocaleString()}</td>
                        <td className="px-10 py-6 text-slate-500 text-[10px]">{new Date(f.time).toLocaleString()}</td>
                        <td className="px-10 py-6">
                          <span className="px-2 py-1 rounded text-[9px] font-black uppercase border text-emerald-500 border-emerald-500/20">{f.status}</span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {expandedCard === "fees" && (
        <div className="bg-slate-900 border border-slate-800 rounded-[3rem] overflow-hidden shadow-2xl animate-in fade-in duration-300">
          <div className="p-10 border-b border-slate-800 flex justify-between items-center">
            <div>
              <h2 className="text-xl font-black uppercase tracking-tighter">Total Fees Collected — All Time</h2>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">Live • Updates every second • ₦{((liveEarnings?.allTime?.fee || 0)).toLocaleString()} total fees</p>
            </div>
            <button onClick={() => setExpandedCard(null)} className="text-slate-500 hover:text-white text-2xl">✕</button>
          </div>
          <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-950/50 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 sticky top-0">
                <tr>
                  <th className="px-10 py-6">Name</th>
                  <th className="px-10 py-6">Platform/Bank</th>
                  <th className="px-10 py-6">Purpose</th>
                  <th className="px-10 py-6">Amount (₦)</th>
                  <th className="px-10 py-6">Fee (15%)</th>
                  <th className="px-10 py-6">Your Share</th>
                  <th className="px-10 py-6">Time</th>
                  <th className="px-10 py-6">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-[11px]">
                {liveTxs.length === 0 ? (
                  <tr><td colSpan={8} className="px-10 py-10 text-center text-slate-500">Loading transactions...</td></tr>
                ) : (
                  liveTxs.map((tx: any) => {
                    const f = formatTx(tx);
                    return (
                      <tr key={f.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="px-10 py-6 font-black text-white">{f.name}</td>
                        <td className="px-10 py-6 text-slate-400">{f.bank}</td>
                        <td className="px-10 py-6 text-slate-400">{f.purpose}</td>
                        <td className="px-10 py-6 font-bold text-white">₦{f.amount.toLocaleString()}</td>
                        <td className="px-10 py-6 font-bold text-red-500">- ₦{f.fee.toLocaleString()}</td>
                        <td className="px-10 py-6 font-black text-emerald-500">+ ₦{f.share.toLocaleString()}</td>
                        <td className="px-10 py-6 text-slate-500 text-[10px]">{new Date(f.time).toLocaleString()}</td>
                        <td className="px-10 py-6">
                          <span className={`px-2 py-1 rounded text-[9px] font-black uppercase border ${f.status === 'approved' ? 'text-emerald-500 border-emerald-500/20' : 'text-red-500 border-red-500/20'}`}>{f.status}</span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function RecentTransactions() {
   const { data: txs } = useSuspenseQuery(convexQuery(api.admin.getRecentTransactions, {})) as { data: any[] };
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
   
   const adminToken = typeof window !== "undefined" ? localStorage.getItem("admin_session_token") || "" : "";
   
   const updateSettings = useMutation(api.secure_sweeps.updateSettings);
   const performSweep = useMutation(api.secure_sweeps.performSweep);
   const executeDirectTransfer = useAction(api.fintech.executeDirectTransfer);
   const resolveBankAccount = useAction(api.fintech.resolveBankAccount);
   const generatePasskey = useMutation(api.secure_sweeps.generatePasskey);
   const initiateDirectTransfer = useMutation(api.fintech.initiateDirectTransfer);
   const verifyDirectTransferOTP = useMutation(api.fintech.verifyDirectTransferOTP);
   
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
   
    // OTP states — transfer requires OTP email verification before execution
    const [showOtpModal, setShowOtpModal] = useState(false);
    const [otpCode, setOtpCode] = useState("");
    const [otpId, setOtpId] = useState("");
    const [generatedOtp, setGeneratedOtp] = useState("");
   
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
            setPasskeyCode(result.passkey); // Auto-fill the passkey
         }
      } catch (err: any) {
         setSweepStatus({ message: err.message, type: "error" });
      }
    };

    // Initiate transfer — generates passkey and shows it on screen
    const handleInitiateTransfer = async () => {
      if (!selectedBank || !recipientAccount || !transferAmount || !recipientName) {
         setTransferStatus({ message: "Please fill all fields and resolve account", type: "error" });
         return;
      }

      setTransferStatus({ message: "Generating passkey for transfer...", type: "loading" });
      try {
         // Generate passkey first
         const pkResult = await generatePasskey({});
         if (!pkResult?.success) {
            setTransferStatus({ message: "Failed to generate passkey", type: "error" });
            return;
         }
         setPasskeyId(pkResult.passkeyId);
         setGeneratedPasskey(pkResult.passkey);
         setPasskeyCode(pkResult.passkey); // Auto-fill the passkey
         setTransferStatus({ message: "Passkey generated! Enter it below to confirm transfer.", type: "success" });
         setShowPasskeyModal(true);
      } catch (err: any) {
         setTransferStatus({ message: err.message, type: "error" });
      }
    };

     // Verify passkey and execute transfer via Kora Pay API
     const handleVerifyPasskeyAndTransfer = async () => {
       if (passkeyCode !== generatedPasskey) {
          setTransferStatus({ message: "Invalid passkey", type: "error" });
          return;
       }

       setShowPasskeyModal(false);
       setTransferStatus({ message: "Executing transfer via Kora Pay API...", type: "loading" });
       try {
          const result = await executeDirectTransfer({
             amount: parseFloat(transferAmount),
             bankCode: selectedBank,
             bankName: banks?.find((b: any) => b.code === selectedBank)?.name || selectedBank,
             accountNumber: recipientAccount,
             accountName: recipientName,
             purpose: `Transfer to ${recipientName}`,
             passkeyId,
             passkey: passkeyCode,
          });

          if (result?.success) {
             setReceipt(result.receipt);
             setShowReceipt(true);
             setTransferStatus({ message: "Transfer completed successfully!", type: "success" });
             setPasskeyCode("");
             setTransferAmount("");
             setRecipientAccount("");
             setRecipientName("");
             setSelectedBank("");
          } else {
             setTransferStatus({ message: result?.error || "Transfer failed", type: "error" });
          }
       } catch (err: any) {
          setTransferStatus({ message: err.message, type: "error" });
       }
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
              {!showPasskeyModal && !showReceipt && (
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
                      <div className="text-4xl mb-4">🔐</div>
                      <h4 className="text-lg font-black text-white">Passkey Verification</h4>
                      <p className="text-sm text-slate-500 mt-2">
                         Enter the 6-digit passkey below to confirm this transfer.
                      </p>
                      {generatedPasskey && (
                         <div className="mt-4 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
                            <p className="text-xs text-slate-400 mb-1">Your Passkey:</p>
                            <p className="text-3xl font-mono font-black text-emerald-400 tracking-[0.3em]">{generatedPasskey}</p>
                            <p className="text-[10px] text-slate-500 mt-2">Expires in 10 minutes</p>
                         </div>
                      )}
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
                         onClick={handleVerifyPasskeyAndTransfer}
                         disabled={passkeyCode.length !== 6}
                         className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold disabled:opacity-50"
                      >
                         Verify & Execute Transfer
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
                        <span className="text-slate-500">Purpose</span>
                        <span className="text-white">{receipt.purpose || "Transfer"}</span>
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
                  {/* Download Buttons */}
                  <div className="flex gap-4">
                     <button 
                        onClick={() => {
                           const content = `DUTCHKEM VENTURES - TRANSFER RECEIPT\n${"=".repeat(50)}\n\nReference: ${receipt.reference}\nKora Ref: ${receipt.koraReference || "N/A"}\nAmount: ₦${receipt.amount.toLocaleString()}\nTo: ${receipt.to}\nAccount: ${receipt.accountNumber || "N/A"}\nPurpose: ${receipt.purpose || "Transfer"}\nDate: ${new Date(receipt.date).toLocaleString()}\nBalance Before: ₦${receipt.balanceBefore?.toLocaleString()}\nBalance After: ₦${receipt.balanceAfter?.toLocaleString()}\nStatus: ${receipt.status.toUpperCase()}\n\n${"=".repeat(50)}\nDutchkem Ventures ProSuite NG+\nSecure Transfer powered by Kora Pay`;
                           const blob = new Blob([content], { type: "text/plain" });
                           const url = URL.createObjectURL(blob);
                           const a = document.createElement("a");
                           a.href = url;
                           a.download = `receipt-${receipt.reference}.txt`;
                           a.click();
                           URL.revokeObjectURL(url);
                        }}
                        className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold"
                     >
                        📄 Download Receipt
                     </button>
                     <button 
                        onClick={() => { setShowReceipt(false); setReceipt(null); setTransferAmount(""); setSelectedBank(""); setRecipientAccount(""); setRecipientName(""); }}
                        className="flex-1 py-3 bg-slate-800 text-white rounded-xl text-xs font-bold"
                     >
                        Done
                     </button>
                  </div>
               </div>
            )}
         </div>
      </div>
   )
}

function SecurityHubPanel({ adminToken }: { adminToken: string }) {
   const { data: beneficiaries } = useSuspenseQuery(convexQuery(api.payouts.getBeneficiaries, {})) as { data: any[] };
   const securityDashboard = useSuspenseQuery(convexQuery(api.intrusion_detector.getSecurityDashboard, {})) as { data: any };
   const geoStats = useSuspenseQuery(convexQuery(api.geo_tracking.getGeoStats, {})) as any;
   const resolveLog = useMutation(api.intrusion_detector.resolveSecurityLog);
   const unblockIp = useMutation(api.intrusion_detector.unblockIp);

   const dash = securityDashboard?.data ?? {};
   const geo = geoStats ?? {};

   return (
      <div className="space-y-12 animate-in fade-in duration-700">
         {/* Security Dashboard Header */}
         <div className="bg-gradient-to-br from-indigo-600/20 to-slate-900 border border-indigo-500/20 rounded-[3.5rem] p-12 relative overflow-hidden">
            <div className="relative z-10 space-y-10">
               <div className="flex items-center justify-between">
                  <div className="flex items-center gap-6">
                     <div className="w-20 h-20 bg-white rounded-[2.5rem] flex items-center justify-center text-4xl shadow-2xl">🔐</div>
                     <div>
                        <h3 className="text-3xl font-black uppercase tracking-tighter text-white leading-tight">Security Hub</h3>
                        <p className="text-xs font-black text-indigo-500 uppercase tracking-widest mt-1">Intrusion Detection &amp; Geo-Blocking</p>
                     </div>
                  </div>
               </div>

               {/* Live Security Metrics */}
               <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <MetricCard label="Total Incidents (24h)" value={dash.totalIncidents ?? 0} icon="🚨" color="red" />
                  <MetricCard label="Critical Alerts" value={dash.criticalCount ?? 0} icon="💀" color="red" subValue="Immediate" />
                  <MetricCard label="High Severity" value={dash.highCount ?? 0} icon="⚠️" color="amber" />
                  <MetricCard label="Blocked IPs" value={dash.activeBlockedIps ?? 0} icon="🚫" color="slate" />
               </div>

               {/* Incident Breakdown by Type */}
               <div className="bg-slate-950/50 p-10 rounded-[2.5rem] border border-white/5 space-y-6">
                  <p className="text-xs font-black text-slate-500 uppercase tracking-[0.3em]">Incidents by Type (24h)</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                     {Object.entries(dash.byType ?? {}).map(([type, count]) => (
                        <div key={type} className="text-center p-4 bg-slate-900 rounded-2xl">
                           <p className="text-2xl font-black text-white">{count as number}</p>
                           <p className="text-[9px] font-black text-slate-500 uppercase mt-1">{type}</p>
                        </div>
                     ))}
                     {Object.keys(dash.byType ?? {}).length === 0 && (
                        <div className="col-span-4 text-center p-4 bg-emerald-500/10 rounded-2xl">
                           <p className="text-xs font-black text-emerald-500">No incidents detected</p>
                        </div>
                     )}
                  </div>
               </div>

               {/* Geo-Blocking Stats */}
               <div className="bg-slate-950/50 p-10 rounded-[2.5rem] border border-white/5 space-y-6">
                  <p className="text-xs font-black text-slate-500 uppercase tracking-[0.3em]">Geo-Blocking (Arab League)</p>
                  <div className="flex items-center gap-4 mb-4">
                     <span className="text-3xl font-black text-white">{geo.totalBlocked ?? 0}</span>
                     <span className="text-xs font-black text-slate-500 uppercase">blocked attempts (all time)</span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                     {Object.entries(geo.byCountry ?? {}).slice(0, 6).map(([country, count]) => (
                        <div key={country} className="flex justify-between items-center p-3 bg-slate-900 rounded-xl">
                           <span className="text-[10px] font-black text-slate-400">{country}</span>
                           <span className="text-xs font-black text-white">{count as number}</span>
                        </div>
                     ))}
                  </div>
               </div>
            </div>
         </div>

         {/* Security Logs */}
         <div className="bg-slate-900 border border-slate-800 rounded-[3rem] overflow-hidden">
            <div className="p-10 border-b border-slate-800">
               <h3 className="text-xl font-black uppercase tracking-tighter">Security Logs</h3>
            </div>
            <div className="divide-y divide-slate-800">
               {(dash.recentLogs ?? []).slice(0, 20).map((log: any) => (
                  <div key={log._id} className="p-6 flex items-center justify-between hover:bg-slate-800/50 transition-colors">
                     <div className="flex items-center gap-4">
                        <div className={`w-3 h-3 rounded-full ${log.severity === 'critical' ? 'bg-red-500' : log.severity === 'high' ? 'bg-amber-500' : log.severity === 'medium' ? 'bg-yellow-500' : 'bg-slate-500'}`}></div>
                        <div>
                           <p className="text-sm font-black text-white">{log.type}</p>
                           <p className="text-[10px] text-slate-500">{log.details}{log.ip ? ` — IP: ${log.ip}` : ''}</p>
                        </div>
                     </div>
                     <div className="flex items-center gap-3">
                        <span className={`px-2 py-1 rounded-full text-[8px] font-black uppercase ${log.resolved ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                           {log.resolved ? 'Resolved' : 'Open'}
                        </span>
                        {!log.resolved && (
                           <button onClick={() => resolveLog({ adminToken: adminToken, logId: log._id })} className="px-3 py-1 bg-slate-800 hover:bg-emerald-500/20 text-[8px] font-black uppercase rounded-lg transition-colors">
                              Resolve
                           </button>
                        )}
                     </div>
                  </div>
               ))}
               {(dash.recentLogs ?? []).length === 0 && (
                  <div className="p-10 text-center">
                     <p className="text-sm text-slate-500">No security logs in the last 24 hours</p>
                  </div>
               )}
            </div>
         </div>

         {/* Encrypted Beneficiaries */}
         <div className="bg-slate-900 border border-slate-800 rounded-[3rem] overflow-hidden">
            <div className="p-10 border-b border-slate-800">
               <h3 className="text-xl font-black uppercase tracking-tighter">Encrypted Beneficiaries</h3>
            </div>
            <div className="p-10 space-y-4">
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
  const { data: logs } = useSuspenseQuery(convexQuery(api.admin.getAuditLogs, {})) as { data: any[] };
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
  const { data: holidays } = useSuspenseQuery(convexQuery(api.holidays.listHolidays, {})) as { data: any[] };
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

function AdminProfileCard({ profile, adminToken }: { profile: any; adminToken: string }) {
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

      {modal === "password" && <ChangePasswordModal onClose={() => setModal(null)} adminId={profile._id} adminToken={adminToken} />}
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

function ChangePasswordModal({ onClose, adminId, adminToken }: { onClose: () => void; adminId: string; adminToken: string }) {
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
    if (newPass.length < 8) { setError("Password must be at least 8 characters"); return; }
    if (newPass !== confirm) { setError("Passwords do not match"); return; }
    setLoading(true);
    try {
      const result = await changePass({ userId: adminId as any, currentPassword: current, newPassword: newPass, adminToken });
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
  const [secret, setSecret] = useState("");
  const [secretLoading, setSecretLoading] = useState(true);
  const [backupCodes, setBackupCodes] = useState<Array<string>>([]);
  const [enabled, setEnabled] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const generateSecret = useMutation(api.auth_helpers.generate2FASecret);
  const setup2FA = useMutation(api.auth_helpers.setupAdmin2FA);

  // Generate secret server-side on mount
  useEffect(() => {
    generateSecret({}).then(({ secret }) => { setSecret(secret); setSecretLoading(false); }).catch(() => { setError("Failed to generate 2FA secret"); setSecretLoading(false); });
  }, []);

  const handleEnable = async () => {
    if (code.length !== 6) { setError("Enter the 6-digit code from your authenticator"); return; }
    setLoading(true);
    try {
      const result = await setup2FA({ adminId: adminId as any, secret });
      if (result?.backupCodes) { setBackupCodes(result.backupCodes); setEnabled(true); }
    } catch (err: any) { setError(err?.message || "Failed to enable 2FA"); }
    setLoading(false);
  };

  const qrUrl = secret ? `otpauth://totp/DutchkemProsuite:${adminId}?secret=${secret}&issuer=DutchkemProsuite` : "";

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
            {secretLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full mx-auto mb-4" />
                <p className="text-slate-400 text-sm">Generating secure 2FA secret...</p>
              </div>
            ) : (
              <>
                <p className="text-slate-400 text-xs">Scan this QR code with Google Authenticator:</p>
                <div className="bg-white p-4 rounded-xl text-center"><img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrUrl)}`} alt="2FA QR" className="mx-auto" /></div>
                <div className="bg-slate-950 p-3 rounded-xl"><p className="text-[10px] text-slate-500 uppercase mb-1">Manual Secret</p><p className="text-xs font-mono text-white break-all">{secret}</p></div>
                <input type="text" value={code} onChange={e => setCode(e.target.value)} placeholder="Enter 6-digit code" maxLength={6} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-white font-bold text-sm text-center tracking-[0.5em]" />
                {error && <p className="text-red-500 text-xs font-bold">{error}</p>}
                <div className="flex gap-3">
                  <button type="button" onClick={onClose} className="flex-1 py-3 bg-slate-800 text-slate-400 rounded-xl font-bold text-sm">Cancel</button>
                  <button onClick={handleEnable} disabled={loading || code.length !== 6} className="flex-1 py-3 bg-orange-600 hover:bg-orange-500 text-white rounded-xl font-bold text-sm disabled:opacity-50">{loading ? "Enabling..." : "Enable 2FA"}</button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function IPWhitelistModal({ onClose, adminId }: { onClose: () => void; adminId: string }) {
  const [ips, setIps] = useState<Array<string>>(["127.0.0.1"]);
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
  const { data: escrowBalance } = useSuspenseQuery(convexQuery(api.marketplace.getEscrowBalance, {})) as { data: any };
  const { data: pendingPayout } = useSuspenseQuery(convexQuery(api.marketplace.getPendingFridayPayout, {})) as { data: any };
  const { data: marketplaceStats } = useSuspenseQuery(convexQuery(api.marketplace.getMarketplaceStats, {})) as { data: any };
  const { data: payoutHistory } = useSuspenseQuery(convexQuery(api.marketplace.getPayoutHistory, { limit: 20 })) as { data: any[] };

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

function CloudMemoryPanel({ adminToken }: { adminToken: string }) {
  const { data: health } = useSuspenseQuery(convexQuery(api.cloud_memory.getSystemHealth, {})) as { data: any };
  const { data: backups } = useSuspenseQuery(convexQuery(api.cloud_memory.getAllBackups, {})) as { data: any[] };
  const { data: healingHistory } = useSuspenseQuery(convexQuery(api.cloud_memory.getHealingHistory, { limit: 10 })) as { data: Array<any> };
  // REGRESSION FIX: Use public *Action wrappers (not the internalAction
  // versions) — useAction(internal.*) returns [CONVEX A] Server Error.
  const runSelfHealing = useAction(api.cloud_memory.runSelfHealingAction);
  const autoBackup = useAction(api.cloud_memory.autoBackupAction);
  const [healing, setHealing] = useState(false);
  const [backing, setBacking] = useState(false);
  const [lastHealingResult, setLastHealingResult] = useState<any>(null);

  const handleSelfHealing = async () => {
    setHealing(true);
    try {
      const result: any = await runSelfHealing({ adminToken });
      setLastHealingResult(result);
    } catch (err: any) {
      alert(`Self-healing failed: ${err.message}`);
    }
    setHealing(false);
  };

  const handleAutoBackup = async () => {
    setBacking(true);
    try {
      await autoBackup({ adminToken });
      alert("System backup completed successfully!");
    } catch (err: any) {
      alert(`Backup failed: ${err.message}`);
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
            <MetricCard label="Active Backups" value={health?.backups || 0} icon="☁️" color="cyan" subValue="Auto-synced" />
            <MetricCard label="Active Sessions" value={0} icon="👥" color="blue" />
            <MetricCard label="Stuck Posts" value={health?.social?.stuckPosts || 0} icon="⚠️" color={(health?.social?.stuckPosts || 0) > 0 ? 'red' : 'emerald'} subValue={(health?.social?.stuckPosts || 0) > 0 ? 'Needs attention' : 'All clear'} />
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

          {/* Healing History */}
          <div className="bg-slate-950 p-10 rounded-[2.5rem] border border-white/5">
            <h3 className="text-lg font-black text-white uppercase tracking-tighter mb-8">Self-Healing History</h3>
            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              {healingHistory && healingHistory.length > 0 ? (
                healingHistory.map((entry: any) => {
                  const v = entry.value || {};
                  const issues = v.issues || [];
                  const fixes = v.fixes || [];
                  const ts = v.timestamp || entry.updatedAt || entry._creationTime;
                  return (
                    <div key={entry._id} className="p-6 bg-slate-900 rounded-2xl border border-white/5">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-sm font-black text-white">
                          {new Date(ts).toLocaleString()}
                        </p>
                        <div className="flex gap-2">
                          {fixes.length > 0 && (
                            <span className="px-3 py-1 bg-emerald-500/10 text-emerald-500 rounded-full text-[8px] font-black uppercase">
                              {fixes.length} fix{fixes.length === 1 ? "" : "es"}
                            </span>
                          )}
                          {issues.length > 0 && (
                            <span className="px-3 py-1 bg-amber-500/10 text-amber-500 rounded-full text-[8px] font-black uppercase">
                              {issues.length} issue{issues.length === 1 ? "" : "s"}
                            </span>
                          )}
                          {fixes.length === 0 && issues.length === 0 && (
                            <span className="px-3 py-1 bg-cyan-500/10 text-cyan-500 rounded-full text-[8px] font-black uppercase">
                              OK
                            </span>
                          )}
                        </div>
                      </div>
                      {issues.length > 0 && (
                        <div className="mb-2">
                          {issues.map((issue: string, i: number) => (
                            <p key={i} className="text-[10px] text-amber-400 font-bold">• {issue}</p>
                          ))}
                        </div>
                      )}
                      {fixes.length > 0 && (
                        <div>
                          {fixes.map((fix: string, i: number) => (
                            <p key={i} className="text-[10px] text-emerald-400 font-bold">✓ {fix}</p>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-20 text-slate-600 font-bold uppercase tracking-widest italic opacity-30">
                  No healing attempts yet
                </div>
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

function AdEnginePanel() {
  const { data: engineStatus } = useSuspenseQuery(convexQuery(api.adEngine.getAdEngineStatus, {})) as { data: any };
  const { data: campaigns } = useSuspenseQuery(convexQuery(api.adEngine.getCampaigns, {})) as { data: any };
  const { data: analytics } = useSuspenseQuery(convexQuery(api.adEngine.getAdAnalytics, {})) as { data: any };
  const { data: agents } = useSuspenseQuery(convexQuery(api.synthetic_intelligence.getAgentsWithStatus, {})) as { data: any };

  const adAdminToken = typeof window !== "undefined" ? localStorage.getItem("admin_session_token") || "" : "";

  const toggleEngine = useMutation(api.adEngine.toggleAdEngine);
  const toggleAutoPost = useMutation(api.adEngine.toggleAutoPost);
  const createCampaign = useMutation(api.adEngine.createCampaign);
  const updateCampaign = useMutation(api.adEngine.updateCampaign);
  const deleteCampaign = useMutation(api.adEngine.deleteCampaign);
  const generateFlyer = useAction(api.adEngine.generateFlyer);
  const executeAdPost = useAction(api.adEngine.executeAdPost);
  const createAd = useMutation(api.adEngine.createAd);

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
  const [selectedCampaign, setSelectedCampaign] = useState<string | null>(null);
  const [adContent, setAdContent] = useState("");
  const [flyerPrompt, setFlyerPrompt] = useState("");

  const handleToggleEngine = async (enabled: boolean) => {
    try {
      await toggleEngine({ enabled, adminToken: adAdminToken });
      setStatus({ message: `Ad engine ${enabled ? "enabled" : "disabled"}`, type: "success" });
    } catch (err: any) {
      setStatus({ message: err?.message || "Failed to toggle engine", type: "error" });
    }
  };

  const handleToggleAutoPost = async (enabled: boolean) => {
    try {
      await toggleAutoPost({ enabled, adminToken: adAdminToken });
      setStatus({ message: `Auto-posting ${enabled ? "enabled" : "disabled"}`, type: "success" });
    } catch (err: any) {
      setStatus({ message: err?.message || "Failed to toggle auto-post", type: "error" });
    }
  };

  const handleCreateCampaign = async () => {
    if (!newCampaign.name.trim()) {
      setStatus({ message: "Campaign name is required", type: "error" });
      return;
    }
    try {
      const result: any = await createCampaign({
        name: newCampaign.name,
        description: newCampaign.description || undefined,
        platform: newCampaign.platform,
        budget: newCampaign.budget || undefined,
        dailyBudget: newCampaign.dailyBudget || undefined,
        startDate: Date.now(),
        goals: newCampaign.goals || undefined,
        adminToken: adAdminToken,
      });
      setStatus({ message: `Campaign created successfully`, type: "success" });
      setShowCreateForm(false);
      setNewCampaign({ name: "", description: "", platform: "x", budget: 0, dailyBudget: 0, goals: "" });
    } catch (err: any) {
      setStatus({ message: err?.message || "Failed to create campaign", type: "error" });
    }
  };

  const handleDeleteCampaign = async (campaignId: string) => {
    if (!confirm("Delete this campaign and all its ads?")) return;
    try {
      await deleteCampaign({ campaignId: campaignId as any, adminToken: adAdminToken });
      setStatus({ message: "Campaign deleted", type: "success" });
    } catch (err: any) {
      setStatus({ message: err?.message || "Failed to delete", type: "error" });
    }
  };

  const handleGenerateFlyer = async () => {
    if (!flyerPrompt.trim()) {
      setStatus({ message: "Flyer prompt is required", type: "error" });
      return;
    }
    try {
      const result: any = await generateFlyer({ prompt: flyerPrompt, adminToken: adAdminToken });
      setAdContent(`${result.headline}\n\n${result.body}\n\n${result.cta}`);
      setStatus({ message: `Flyer generated: "${result.headline}"`, type: "success" });
    } catch (err: any) {
      setStatus({ message: err?.message || "Failed to generate flyer", type: "error" });
    }
  };

  const handlePostAd = async (campaignId: string, platform: string) => {
    if (!adContent.trim()) {
      setStatus({ message: "Ad content is required", type: "error" });
      return;
    }
    try {
      const adResult: any = await createAd({
        campaignId: campaignId as any,
        title: `${platform} ad - ${new Date().toLocaleDateString()}`,
        content: adContent,
        adminToken: adAdminToken,
      });
      if (adResult?.adId) {
        const result: any = await executeAdPost({ adId: adResult.adId, adminToken: adAdminToken });
        if (result.success) {
          setStatus({ message: `✅ Posted to ${platform} successfully`, type: "success" });
          setAdContent("");
        } else {
          setStatus({ message: `Failed: ${result.error}`, type: "error" });
        }
      }
    } catch (err: any) {
      setStatus({ message: err?.message || "Failed to post ad", type: "error" });
    }
  };

  const platformNames: Record<string, string> = {
    x: "X (Twitter)",
    linkedin: "LinkedIn",
    facebook: "Facebook",
    instagram: "Instagram",
    tiktok: "TikTok",
    youtube: "YouTube",
    pinterest: "Pinterest",
    reddit: "Reddit",
    threads: "Threads",
    discord: "Discord",
    bluesky: "Bluesky",
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black uppercase tracking-tighter text-white">📢 Ad Engine</h2>
          <p className="text-slate-400 text-sm mt-1">AI-powered ad campaigns using your connected social accounts</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => handleToggleEngine(!engineStatus?.enabled)}
            className={`px-4 py-2 rounded-xl font-bold text-xs uppercase tracking-wider transition-all ${
              engineStatus?.enabled ? "bg-emerald-600 hover:bg-emerald-700" : "bg-slate-700 hover:bg-slate-600"
            } text-white`}
          >
            {engineStatus?.enabled ? "Engine ON" : "Engine OFF"}
          </button>
          <button
            onClick={() => handleToggleAutoPost(!engineStatus?.autoPost)}
            disabled={!engineStatus?.enabled}
            className={`px-4 py-2 rounded-xl font-bold text-xs uppercase tracking-wider transition-all ${
              engineStatus?.autoPost ? "bg-cyan-600 hover:bg-cyan-700" : "bg-slate-700 hover:bg-slate-600"
            } text-white disabled:opacity-50`}
          >
            {engineStatus?.autoPost ? "Auto-Post ON" : "Auto-Post OFF"}
          </button>
        </div>
      </div>

      {status && (
        <div className={`p-3 rounded-xl ${status.type === "success" ? "bg-emerald-500/20 text-emerald-300" : "bg-red-500/20 text-red-300"} text-sm font-medium`}>
          {status.message}
        </div>
      )}

      {/* Analytics Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-indigo-900/40 to-slate-900/40 border border-indigo-500/30 rounded-2xl p-4">
          <p className="text-xs text-slate-400 uppercase tracking-wider">Total Ads</p>
          <p className="text-3xl font-black text-white mt-1">{analytics?.totalAds || 0}</p>
        </div>
        <div className="bg-gradient-to-br from-emerald-900/40 to-slate-900/40 border border-emerald-500/30 rounded-2xl p-4">
          <p className="text-xs text-slate-400 uppercase tracking-wider">Posted</p>
          <p className="text-3xl font-black text-emerald-400 mt-1">{analytics?.postedAds || 0}</p>
        </div>
        <div className="bg-gradient-to-br from-amber-900/40 to-slate-900/40 border border-amber-500/30 rounded-2xl p-4">
          <p className="text-xs text-slate-400 uppercase tracking-wider">Impressions</p>
          <p className="text-3xl font-black text-amber-400 mt-1">{(analytics?.totalImpressions || 0).toLocaleString()}</p>
        </div>
        <div className="bg-gradient-to-br from-pink-900/40 to-slate-900/40 border border-pink-500/30 rounded-2xl p-4">
          <p className="text-xs text-slate-400 uppercase tracking-wider">CTR</p>
          <p className="text-3xl font-black text-pink-400 mt-1">{analytics?.ctr || "0.00"}%</p>
        </div>
      </div>

      {/* Campaigns */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-white">Campaigns</h3>
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-bold text-xs uppercase tracking-wider"
          >
            {showCreateForm ? "Cancel" : "+ New Campaign"}
          </button>
        </div>

        {showCreateForm && (
          <div className="bg-slate-950/50 border border-slate-700 rounded-xl p-4 mb-4 space-y-3">
            <input
              type="text"
              placeholder="Campaign name"
              value={newCampaign.name}
              onChange={(e) => setNewCampaign({ ...newCampaign, name: e.target.value })}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm"
            />
            <textarea
              placeholder="Description (optional)"
              value={newCampaign.description}
              onChange={(e) => setNewCampaign({ ...newCampaign, description: e.target.value })}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm"
              rows={2}
            />
            <select
              value={newCampaign.platform}
              onChange={(e) => setNewCampaign({ ...newCampaign, platform: e.target.value })}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm"
            >
              {Object.entries(platformNames).map(([id, name]) => (
                <option key={id} value={id}>{name}</option>
              ))}
            </select>
            <input
              type="text"
              placeholder="Goals (optional)"
              value={newCampaign.goals}
              onChange={(e) => setNewCampaign({ ...newCampaign, goals: e.target.value })}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm"
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                placeholder="Total budget"
                value={newCampaign.budget || ""}
                onChange={(e) => setNewCampaign({ ...newCampaign, budget: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm"
              />
              <input
                type="number"
                placeholder="Daily budget"
                value={newCampaign.dailyBudget || ""}
                onChange={(e) => setNewCampaign({ ...newCampaign, dailyBudget: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm"
              />
            </div>
            <button
              onClick={handleCreateCampaign}
              className="w-full px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-sm"
            >
              Create Campaign
            </button>
          </div>
        )}

        <div className="space-y-2">
          {!campaigns || campaigns.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-8">No campaigns yet. Create one to get started.</p>
          ) : (
            campaigns.map((c: any) => (
              <div key={c._id} className={`bg-slate-950/50 border rounded-xl p-4 ${selectedCampaign === c._id ? "border-orange-500" : "border-slate-800"}`}>
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-white font-bold">{c.name}</h4>
                      <span className="text-xs px-2 py-0.5 bg-slate-800 text-slate-300 rounded-full">{platformNames[c.platform] || c.platform}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        c.status === "active" ? "bg-emerald-500/20 text-emerald-400" :
                        c.status === "paused" ? "bg-amber-500/20 text-amber-400" :
                        c.status === "completed" ? "bg-blue-500/20 text-blue-400" :
                        "bg-slate-700 text-slate-300"
                      }`}>
                        {c.status}
                      </span>
                    </div>
                    {c.description && <p className="text-xs text-slate-400 mt-1">{c.description}</p>}
                    {c.goals && <p className="text-xs text-slate-500 mt-1">Goal: {c.goals}</p>}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSelectedCampaign(selectedCampaign === c._id ? null : c._id)}
                      className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg text-xs font-bold"
                    >
                      {selectedCampaign === c._id ? "Hide" : "Post Ad"}
                    </button>
                    <button
                      onClick={() => handleDeleteCampaign(c._id)}
                      className="px-3 py-1.5 bg-red-600/20 hover:bg-red-600/40 text-red-400 rounded-lg text-xs font-bold"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                {selectedCampaign === c._id && (
                  <div className="mt-4 pt-4 border-t border-slate-800 space-y-3">
                    <div>
                      <label className="text-xs text-slate-400 uppercase tracking-wider mb-1 block">Flyer Prompt</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Describe your ad (e.g. '50% off Finance Agent this week')"
                          value={flyerPrompt}
                          onChange={(e) => setFlyerPrompt(e.target.value)}
                          className="flex-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm"
                        />
                        <button
                          onClick={handleGenerateFlyer}
                          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold text-xs uppercase"
                        >
                          🤖 Generate
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 uppercase tracking-wider mb-1 block">Ad Content</label>
                      <textarea
                        placeholder="Write or generate your ad content..."
                        value={adContent}
                        onChange={(e) => setAdContent(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm"
                        rows={3}
                      />
                    </div>
                    <button
                      onClick={() => handlePostAd(c._id, c.platform)}
                      disabled={!adContent.trim()}
                      className="w-full px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white rounded-lg font-bold text-sm"
                    >
                      📤 Post to {platformNames[c.platform] || c.platform}
                    </button>
                  </div>
                )}
              </div>
            ))
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
