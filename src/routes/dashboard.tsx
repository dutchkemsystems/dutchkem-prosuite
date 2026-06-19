import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { useConvexAuth, useConvex, useMutation, useAction } from "convex/react"
import { useAuthActions } from "@convex-dev/auth/react"
import { Suspense, useCallback, useEffect, useRef, useState } from "react"
import {
  CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis
} from 'recharts';
import { api } from "../../convex/_generated/api"
import { CompanyLogo } from '~/components/CompanyLogo';
import { KDPProjectHub } from '~/components/KDPProjectHub';
import { KDPRoyaltyDashboard } from '~/components/KDPRoyaltyDashboard';
import { InactivityLogout } from '~/components/InactivityLogout';
import { FlashSaleBanner } from '~/components/FlashSaleBanner';
import { UrgencyTriggers } from '~/components/UrgencyTriggers';
import { ActivityStats, SocialProofFeed } from '~/components/SocialProofFeed';
import { ClientActivityFeed } from '~/components/ClientActivityFeed';

import { ClientNotificationPrefs } from '~/components/ClientNotificationPrefs';
import { ClientPerformanceSummary } from '~/components/ClientPerformanceSummary';
import { getExistingSubscription, isPushSupported, subscribeToPush, subscriptionToJSON, unsubscribeFromPush } from '~/lib/push';
import { AgentBrowser } from '~/components/dashboard/AgentBrowser';
import { CreditPackages } from '~/components/dashboard/CreditPackages';
import { HistoryPanel } from '~/components/dashboard/HistoryPanel';
import { SupportChat } from '~/components/dashboard/SupportChat';

export const Route = createFileRoute('/dashboard')({
  component: DashboardPage,
})

function DashboardSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
      <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );
}

function DashboardPage() {
  const { isAuthenticated, isLoading: authLoading } = useConvexAuth();
  const navigate = useNavigate();
  const [authTimeout, setAuthTimeout] = useState(false);

  // Safety timeout: if authLoading stays true for >8s, show recovery UI
  useEffect(() => {
    if (authLoading) {
      const timer = setTimeout(() => setAuthTimeout(true), 8000);
      return () => clearTimeout(timer);
    }
    setAuthTimeout(false);
  }, [authLoading]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate({ to: '/auth' });
    }
  }, [isAuthenticated, authLoading, navigate]);

  if (authLoading && !authTimeout) {
    return <DashboardSpinner />;
  }

  if (authTimeout && !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
        <div className="text-center max-w-md p-8">
          <p className="text-amber-400 font-bold text-xl mb-4">Authentication is taking longer than expected</p>
          <p className="text-slate-400 text-sm mb-6">This can happen after Google sign-in. Please wait a moment or try again.</p>
          <div className="flex gap-3 justify-center">
            <button onClick={() => window.location.reload()} className="px-6 py-3 bg-indigo-600 rounded-xl text-white font-bold hover:bg-indigo-500 transition-colors">
              Refresh Page
            </button>
            <button onClick={() => navigate({ to: '/auth' })} className="px-6 py-3 bg-slate-800 rounded-xl text-white font-bold hover:bg-slate-700 transition-colors border border-slate-700">
              Back to Sign In
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-400 text-sm">Redirecting to sign in...</p>
        </div>
      </div>
    );
  }

  return <DashboardContent />;
}

function DashboardContent() {
  const { signOut } = useAuthActions();
  const navigate = useNavigate();
  const convexClient = useConvex();
  const [activeTab, setActiveTab] = useState("overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [modal, setModal] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");
  const [tfaMessage, setTfaMessage] = useState("");
  const [payoutMessage, setPayoutMessage] = useState("");
  const [data, setData] = useState<any>(undefined);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showAccessGranted, setShowAccessGranted] = useState(false);
  const [showAgentBrowser, setShowAgentBrowser] = useState(false);
  const [showCredits, setShowCredits] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showSupport, setShowSupport] = useState(false);
  const fetchedRef = useRef(false);

  const fetchDashboard = useCallback(async () => {
    try {
      setLoadError(null);
      setData(undefined);
      fetchedRef.current = false;
      const result = await Promise.race([
        convexClient.query(api.dashboard.getDashboardData),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Dashboard request timed out. Please refresh.")), 15000)
        ),
      ]);
      setData(result);
      fetchedRef.current = true;
    } catch (err: any) {
      console.error("[Dashboard] Fetch error:", err);
      setLoadError(err?.message || "Failed to load dashboard");
    }
  }, [convexClient]);

  useEffect(() => {
    if (!fetchedRef.current) {
      fetchDashboard();
    }
  }, [fetchDashboard]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("payment") === "success") {
      setShowAccessGranted(true);
      window.history.replaceState({}, "", window.location.pathname);
      setTimeout(() => setShowAccessGranted(false), 5000);
    }
  }, []);

  const toggle2FAAction = useMutation(api.client_actions.toggle2FA);
  const changePasswordAction = useMutation(api.client_actions.changeClientPassword);
  const requestReferralPayoutAction = useMutation(api.client_actions.requestReferralPayout);
  const ensureReferralCode = useMutation(api.client_actions.ensureReferralCode);

  // Auto-generate referral code if missing
  useEffect(() => {
    if (data?.user?._id && !data.user.referralCode) {
      ensureReferralCode({}).then((result) => {
        if (result?.generated) {
          setData((prev: any) => ({
            ...prev,
            user: { ...prev.user, referralCode: result.referralCode },
          }));
        }
      }).catch(() => {});
    }
  }, [data?.user?._id, data?.user?.referralCode, ensureReferralCode]);

  if (data === undefined && !loadError) {
    return <DashboardSpinner />;
  }

  if (loadError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
        <div className="text-center max-w-md p-8">
          <p className="text-red-400 font-bold text-xl mb-4">Failed to load dashboard</p>
          <p className="text-slate-400 text-sm mb-6">{loadError}</p>
          <div className="flex gap-3 justify-center">
            <button onClick={fetchDashboard} className="px-6 py-3 bg-indigo-600 rounded-xl text-white font-bold hover:bg-indigo-500 transition-colors">
              Retry
            </button>
            <button onClick={async () => { try { await signOut(); } catch {} navigate({ to: '/auth' }); }} className="px-6 py-3 bg-slate-800 rounded-xl text-white font-bold hover:bg-slate-700 transition-colors border border-slate-700">
              Sign In Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!data.user._id || data.user._id === "") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
        <div className="text-center max-w-md p-8">
          <p className="text-red-400 font-bold text-xl mb-4">Authentication required</p>
          <p className="text-slate-400 mb-6">Please sign in to view your dashboard.</p>
          <button onClick={async () => { try { await signOut(); } catch {} navigate({ to: '/auth' }); }} className="px-6 py-3 bg-indigo-600 rounded-xl text-white font-bold hover:bg-indigo-500 transition-colors">
            Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row overflow-hidden">
      <InactivityLogout adminMode={false} logoutPath="/auth" />
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 bg-slate-900 border-b border-slate-800 sticky top-0 z-30">
        <Link to="/" className="flex items-center gap-3">
          <CompanyLogo className="w-10 h-10" />
          <span className="font-black text-xs tracking-tighter uppercase text-white">ProSuite</span>
        </Link>
        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="w-12 h-12 flex items-center justify-center rounded-xl bg-slate-800 text-white" aria-label="Toggle menu">
          {sidebarOpen ? '✕' : '☰'}
        </button>
      </div>

      {/* Navigation Sidebar */}
      <aside className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 fixed md:static top-0 left-0 h-full md:h-auto w-72 md:w-64 bg-slate-900 border-r border-slate-800 flex-shrink-0 z-20 flex flex-col transition-transform duration-300 md:transition-none`}>
        <div className="p-4 md:p-6">
          <Link to="/" className="hidden md:flex items-center gap-3 mb-8 group">
            <CompanyLogo className="w-12 h-12" />
            <div className="flex flex-col">
              <span className="font-black text-[10px] tracking-tighter uppercase leading-none text-white">Ventures ProSuite NG+</span>
              <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest mt-1">RC: 9489855</span>
            </div>
          </Link>
          <nav className="space-y-1">
            <TabButton active={activeTab === "overview"} onClick={() => { setActiveTab("overview"); setSidebarOpen(false); }} icon="📊" label="Overview" />
            <TabButton active={activeTab === "activity"} onClick={() => { setActiveTab("activity"); setSidebarOpen(false); }} icon="📡" label="Agent Activity" />
            <TabButton active={activeTab === "subscriptions"} onClick={() => { setActiveTab("subscriptions"); setSidebarOpen(false); }} icon="💳" label="Subscriptions" />
            <TabButton active={activeTab === "kdp"} onClick={() => { setActiveTab("kdp"); setSidebarOpen(false); }} icon="📖" label="KDP Publishing" />
            <TabButton active={activeTab === "projects"} onClick={() => { setActiveTab("projects"); setSidebarOpen(false); }} icon="📁" label="Projects" />
            <TabButton active={activeTab === "referrals"} onClick={() => { setActiveTab("referrals"); setSidebarOpen(false); }} icon="🤝" label="Referrals" />
            <TabButton active={activeTab === "security"} onClick={() => { setActiveTab("security"); setSidebarOpen(false); }} icon="🛡️" label="Security" />
            <TabButton active={activeTab === "settings"} onClick={() => { setActiveTab("settings"); setSidebarOpen(false); }} icon="⚙️" label="Settings" />
            <TabButton active={activeTab === "browse-agents"} onClick={() => { setActiveTab("browse-agents"); setSidebarOpen(false); }} icon="🤖" label="Browse Agents" />
            <TabButton active={activeTab === "history"} onClick={() => { setActiveTab("history"); setSidebarOpen(false); }} icon="📜" label="Full History" />
            <TabButton active={activeTab === "support"} onClick={() => { setActiveTab("support"); setSidebarOpen(false); }} icon="💬" label="Support" />
          </nav>
        </div>
        <div className="mt-auto p-4 md:p-6 border-t border-slate-800">
          <button onClick={async () => { setSidebarOpen(false); try { await signOut(); } catch {} navigate({ to: '/auth' }); }} className="flex items-center gap-2 text-slate-400 hover:text-red-400 transition-colors w-full text-left p-2">
            <span>🚪</span> Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-grow overflow-y-auto h-screen flex flex-col">
        <div className="p-4 md:p-8 space-y-8 flex-grow">
          <Header user={data.user} notifications={data.notifications} />
          
          {activeTab === "overview" && <Overview data={data} setActiveTab={setActiveTab} setModal={setModal} setShowAgentBrowser={setShowAgentBrowser} setShowCredits={setShowCredits} setShowHistory={setShowHistory} setShowSupport={setShowSupport} />}
          {activeTab === "activity" && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <AgentBrowser isOpen={true} onClose={() => setActiveTab("overview")} mode="page" agentEnhancement={data.agentEnhancement} />
            </div>
          )}
          {activeTab === "subscriptions" && <Subscriptions data={data} />}
          {activeTab === "kdp" && (
            <Suspense fallback={<DashboardSpinner />}>
              <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
                 <KDPProjectHub userId={data.user._id} />
                 {(data.user.subscription?.plan === "quarterly" || data.user.subscription?.plan === "yearly") && (
                   <KDPRoyaltyDashboard userId={data.user._id} />
                 )}
              </div>
            </Suspense>
          )}
          {activeTab === "projects" && <Projects data={data} setActiveTab={setActiveTab} setModal={setModal} setShowAgentBrowser={setShowAgentBrowser} setShowCredits={setShowCredits} setShowHistory={setShowHistory} setShowSupport={setShowSupport} />}
          {activeTab === "referrals" && <Referrals data={data} payoutMessage={payoutMessage} setPayoutMessage={setPayoutMessage} requestReferralPayoutAction={requestReferralPayoutAction} />}
          {activeTab === "security" && <Security data={data} tfaMessage={tfaMessage} setTfaMessage={setTfaMessage} toggle2FAAction={toggle2FAAction} newPassword={newPassword} setNewPassword={setNewPassword} passwordMessage={passwordMessage} setPasswordMessage={setPasswordMessage} changePasswordAction={changePasswordAction} />}
          {activeTab === "settings" && <Settings data={data} />}
          {activeTab === "browse-agents" && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <AgentBrowser isOpen={true} onClose={() => setActiveTab("overview")} mode="page" />
            </div>
          )}
          {activeTab === "history" && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <HistoryPanel isOpen={true} onClose={() => setActiveTab("overview")} />
            </div>
          )}
          {activeTab === "support" && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <SupportChat isOpen={true} onClose={() => setActiveTab("overview")} />
            </div>
          )}
        </div>
        <Footer />

        {/* Modal Overlay */}
        {modal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setModal(null)}></div>
            <div className="relative bg-slate-900 border border-slate-800 w-full max-w-lg rounded-3xl p-8 shadow-2xl animate-in zoom-in-95 duration-200">
              <button onClick={() => setModal(null)} className="absolute top-6 right-6 text-slate-500 hover:text-white text-xl">✕</button>
              
              {modal === "new-project" && (
                <div className="space-y-6">
                  <h2 className="text-2xl font-black">➕ Start New Project</h2>
                  <p className="text-slate-400">Select a specialized agent to begin your task.</p>
                  {!data.user.subscription && (
                    <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl">
                      <p className="text-amber-400 text-sm font-bold">⚠️ Active subscription required to use agents.</p>
                      <button onClick={() => setModal("buy-credits")} className="mt-2 text-sm text-amber-300 underline">Subscribe now →</button>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { icon: "🎓", name: "Academic Writer", agentId: "A1", path: "/academic-writer" },
                      { icon: "💼", name: "Business Consultant", agentId: "A2", path: "/business-consultant" },
                      { icon: "✍️", name: "Content Strategist", agentId: "A3", path: "/content-writer" },
                      { icon: "📄", name: "Career Coach", agentId: "A4", path: "/career-coach" },
                      { icon: "🛍️", name: "Personal Shopper", agentId: "A5", path: "/personal-shopper" },
                      { icon: "📝", name: "Exam Prep", agentId: "A6", path: "/exam-prep" },
                      { icon: "💰", name: "Finance Advisor", agentId: "A7", path: "/finance-advisor" },
                      { icon: "🎬", name: "MediaStudio", agentId: "A8", path: "/video-production" },
                      { icon: "🏥", name: "Wellness Coach", agentId: "A9", path: "/wellness-coach" },
                      { icon: "🧹", name: "Home Services", agentId: "A10", path: "/home-management" },
                      { icon: "🗣️", name: "Language Tutor", agentId: "A11", path: "/language-coach" },
                      { icon: "✈️", name: "Travel Planner", agentId: "A12", path: "/travel-planner" },
                      { icon: "🚀", name: "ServiceMart NG", agentId: "A13", path: "/exam-success" },
                      { icon: "📝", name: "Translation Hub", agentId: "A14", path: "/translation-hub" },
                      { icon: "🎉", name: "Event Planner", agentId: "A15", path: "/event-planner" },
                    ].map((agent) => {
                      const enhancement = data.agentEnhancement?.find((e: any) => e.agentId === agent.agentId);
                      return (
                        <button key={agent.agentId} onClick={() => navigate({ to: agent.path })} className="p-4 bg-slate-800 rounded-2xl border border-slate-700 hover:border-indigo-500 transition-all text-left relative">
                          {enhancement?.enhanced && (
                            <span className="absolute top-2 right-2 text-[9px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-bold border border-emerald-500/30">⚡ Enhanced</span>
                          )}
                          <div className="text-2xl mb-2">{agent.icon}</div>
                          <div className="font-bold text-sm">{agent.name}</div>
                          {enhancement?.enhanced && <div className="text-[10px] text-emerald-400 mt-1">{enhancement.toolCount} tools active</div>}
                        </button>
                      );
                    })}
                    <button
                      onClick={() => { setModal(null); setShowAgentBrowser(true); }}
                      className="col-span-2 p-4 bg-slate-800 rounded-2xl border border-dashed border-slate-600 hover:border-indigo-500 transition-all text-center"
                    >
                      <div className="text-2xl mb-2">🔍</div>
                      <div className="font-bold text-sm text-slate-400">Browse All 15 Agents</div>
                    </button>
                  </div>
                </div>
              )}

              {modal === "buy-credits" && (
                <BuyCreditsModal user={data.user} onClose={() => setModal(null)} />
              )}
            </div>
          </div>
        )}

        {showAccessGranted && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-emerald-500/30 rounded-3xl p-8 max-w-md w-full text-center animate-in fade-in zoom-in-95 duration-300">
              <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center text-emerald-500 text-4xl mx-auto mb-6 border border-emerald-500/20">✓</div>
              <h2 className="text-2xl font-black text-white mb-2 uppercase tracking-tight">Access Granted!</h2>
              <p className="text-slate-400 mb-6 font-medium">Your subscription is now active. You have full access to all 15 AI agents.</p>
              <div className="space-y-2 text-left text-sm text-slate-300 mb-6">
                <div className="flex items-center gap-2"><span className="text-emerald-400">✓</span> All 15 agents unlocked</div>
                <div className="flex items-center gap-2"><span className="text-emerald-400">✓</span> Unlimited tasks</div>
                <div className="flex items-center gap-2"><span className="text-emerald-400">✓</span> Priority response time</div>
                <div className="flex items-center gap-2"><span className="text-emerald-400">✓</span> File generation</div>
              </div>
              <button
                onClick={() => {
                  setShowAccessGranted(false);
                  setModal("new-project");
                }}
                className="w-full py-3 bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl font-bold text-white hover:from-orange-600 hover:to-orange-700 transition-all"
              >
                Start Your First Project →
              </button>
            </div>
          </div>
        )}

        <AgentBrowser isOpen={showAgentBrowser} onClose={() => setShowAgentBrowser(false)} mode="modal" />
        <CreditPackages isOpen={showCredits} onClose={() => setShowCredits(false)} />
        <HistoryPanel isOpen={showHistory} onClose={() => setShowHistory(false)} />
        <SupportChat isOpen={showSupport} onClose={() => setShowSupport(false)} />
      </main>
    </div>
  );
}

function TabButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: string, label: string }) {
  return (
    <button 
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
        active ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
      }`}
    >
      <span className="text-lg">{icon}</span>
      {label}
    </button>
  );
}

function Header({ user, notifications }: { user: any, notifications: Array<any> }) {
  const [time, setTime] = useState(new Date().toLocaleTimeString());
  const [showNotifs, setShowNotifs] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushSupported, setPushSupported] = useState(false);
  const subscribeToPushAction = useMutation(api.pushNotifications.subscribe);
  const unsubscribeFromPushAction = useMutation(api.pushNotifications.unsubscribe);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date().toLocaleTimeString()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    setPushSupported(isPushSupported());
    checkPushStatus();
  }, []);

  const checkPushStatus = async () => {
    const subscription = await getExistingSubscription();
    setPushEnabled(!!subscription);
  };

  const handlePushToggle = async () => {
    if (pushEnabled) {
      await unsubscribeFromPush();
      await unsubscribeFromPushAction({});
      setPushEnabled(false);
    } else {
      const subscription = await subscribeToPush();
      if (subscription) {
        const json = subscriptionToJSON(subscription);
        await subscribeToPushAction(json);
        setPushEnabled(true);
      }
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative">
          <div>
            <h1 className="text-2xl font-black tracking-tight">Welcome back, {user.name || 'User'}! 👋</h1>
            <div className="flex items-center gap-3 mt-1">
              <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">{new Date().toLocaleDateString('en-NG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} • {time}</p>
              <div className="h-3 w-px bg-slate-800"></div>
              <p className="text-orange-500 text-[10px] font-black uppercase tracking-widest">TIN: 2512403526652</p>
            </div>
          </div>
      <div className="flex items-center gap-4">
        {/* Flash Sale Banner */}
        <div className="hidden md:block">
          <FlashSaleBanner />
        </div>

        {/* Push Notification Toggle */}
        {pushSupported && (
          <button
            onClick={handlePushToggle}
            className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all border ${
              pushEnabled
                ? 'bg-green-600 border-green-500 text-white shadow-lg'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
            }`}
            title={pushEnabled ? 'Push notifications enabled' : 'Enable push notifications'}
          >
            {pushEnabled ? '🔔' : '🔕'}
          </button>
        )}

        <div className="relative">
          <button 
            onClick={() => setShowNotifs(!showNotifs)}
            className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all border ${
              showNotifs ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg' : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            🔔
          </button>
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-600 text-[10px] text-white flex items-center justify-center rounded-full border-2 border-slate-950 font-black shadow-lg">
              {unreadCount}
            </span>
          )}

          {showNotifs && (
            <div className="absolute right-0 mt-4 w-80 bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="p-4 border-b border-slate-800 bg-slate-900/50 flex justify-between items-center">
                <h3 className="font-black text-xs uppercase tracking-widest">Notifications</h3>
                <button className="text-[10px] font-black text-indigo-400 uppercase">Mark all read</button>
              </div>
              <div className="max-h-96 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center text-slate-500 text-xs italic">No new notifications</div>
                ) : (
                  notifications.map(n => (
                    <div key={n._id} className={`p-4 border-b border-slate-800 hover:bg-slate-800/30 transition-colors cursor-pointer ${!n.read ? 'bg-indigo-600/5' : ''}`}>
                      <p className="text-xs font-black mb-1">{n.title}</p>
                      <p className="text-[10px] text-slate-400 leading-relaxed">{n.message}</p>
                      <p className="text-[9px] text-slate-600 mt-2 font-bold uppercase">{new Date(n.createdAt).toLocaleTimeString()}</p>
                    </div>
                  ))
                )}
              </div>
              <button className="w-full py-3 bg-slate-800 text-[10px] font-black uppercase tracking-widest hover:bg-slate-700 transition-all">View All Notifications</button>
            </div>
          )}
        </div>
        <div className="flex items-center gap-3 pl-4 border-l border-slate-800 group relative cursor-pointer">
          <div className="text-right hidden md:block">
            <p className="text-sm font-black leading-none">{user.name || 'Account'}</p>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{user.email}</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center font-black overflow-hidden border-2 border-indigo-500/20 shadow-lg group-hover:scale-105 transition-transform">
            {user.image ? <img src={user.image} alt="Avatar" className="w-full h-full object-cover" /> : <span>{user.name?.[0] || 'U'}</span>}
          </div>
          
          {/* Avatar Dropdown */}
          <div className="absolute right-0 top-full mt-4 w-48 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl z-50 overflow-hidden opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 translate-y-2 group-hover:translate-y-0">
             <div className="p-2 space-y-1">
                <button className="w-full text-left px-4 py-3 text-xs font-bold text-slate-400 hover:bg-slate-800 hover:text-white rounded-xl transition-colors">Profile Settings</button>
                <button className="w-full text-left px-4 py-3 text-xs font-bold text-slate-400 hover:bg-slate-800 hover:text-white rounded-xl transition-colors">Billing & Plans</button>
                <button onClick={async () => { try { await signOut(); } catch {} navigate({ to: '/auth' }); }} className="w-full text-left px-4 py-3 text-xs font-bold text-red-400 hover:bg-red-500/10 rounded-xl transition-colors">Sign Out</button>
             </div>
          </div>
        </div>
      </div>
    </header>
  );
}

function Overview({ data, setActiveTab, setModal, setShowAgentBrowser, setShowCredits, setShowHistory, setShowSupport }: { data: any, setActiveTab: (tab: string) => void, setModal: (m: string | null) => void, setShowAgentBrowser: (v: boolean) => void, setShowCredits: (v: boolean) => void, setShowHistory: (v: boolean) => void, setShowSupport: (v: boolean) => void }) {
  const navigate = useNavigate();
  const chartData = [
    { name: 'Week 1', value: 4000 },
    { name: 'Week 2', value: 3000 },
    { name: 'Week 3', value: 5000 },
    { name: 'Week 4', value: 8000 },
  ];

  const pieData = [
    { name: 'Business', value: 400 },
    { name: 'Academic', value: 300 },
    { name: 'Content', value: 300 },
    { name: 'Video', value: 200 },
  ];

  const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e'];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Flash Sale Banner - Mobile */}
      <div className="md:hidden">
        <FlashSaleBanner />
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard label="Active Plans" value={data.stats.activeSubscriptions} icon="💳" color="indigo" />
        <StatCard label="Total Spent" value={`₦${data.stats.totalSpentThisMonth.toLocaleString()}`} icon="💸" color="emerald" />
        <StatCard label="Completed" value={data.stats.completedProjects} icon="✅" color="blue" />
        <StatCard label="Referral Earned" value={`₦${data.referrals.totalEarned.toLocaleString()}`} icon="🤝" color="amber" />
        <StatCard label="Monthly Savings" value={`₦${data.stats.savingsThisMonth.toLocaleString()}`} icon="💰" color="teal" />
      </div>

      {/* Social Proof Activity Stats — additive, no existing stats touched */}
      <ActivityStats />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          {/* Usage Analytics Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <h3 className="text-lg font-bold mb-6 flex items-center gap-2">📈 Subscription Value</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="name" stroke="#64748b" fontSize={12} />
                    <YAxis stroke="#64748b" fontSize={12} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px' }}
                      itemStyle={{ color: '#6366f1' }}
                    />
                    <Line type="monotone" dataKey="value" stroke="#6366f1" strokeWidth={3} dot={{ fill: '#6366f1' }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <h3 className="text-lg font-bold mb-6 flex items-center gap-2">🧩 Agent Usage</h3>
              <div className="h-64 flex">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend layout="vertical" align="right" verticalAlign="middle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
          </div>
        </div>

        {/* Live Activity Feed — additive, doesn't break existing stats */}
        <div className="lg:col-span-1">
          <SocialProofFeed limit={8} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Active Subscriptions Preview */}
          <Section title="Active Subscriptions" actionLabel="Manage All">
            <div className="space-y-3">
              {data.subscriptions.length === 0 ? (
                <EmptyState icon="💳" text="No active subscriptions." />
              ) : (
                data.subscriptions.map((s: any) => <SubscriptionRow key={s._id} sub={s} />)
              )}
            </div>
          </Section>

          {/* Recent Projects Table */}
          <Section title="Recent Projects" actionLabel="View All">
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-800/50 border-b border-slate-800">
                  <tr>
                    <th className="px-6 py-4 font-semibold text-slate-300">Project</th>
                    <th className="px-6 py-4 font-semibold text-slate-300">Agent</th>
                    <th className="px-6 py-4 font-semibold text-slate-300">Status</th>
                    <th className="px-6 py-4 font-semibold text-slate-300">Format</th>
                    <th className="px-6 py-4 font-semibold text-slate-300">Date</th>
                    <th className="px-6 py-4 font-semibold text-slate-300">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {data.projects.map((p: any) => (
                    <tr key={p._id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-6 py-4 font-medium">{p.name}</td>
                      <td className="px-6 py-4 text-slate-400 capitalize">{p.agentId}</td>
                      <td className="px-6 py-4">
                        <StatusBadge status={p.status} />
                      </td>
                      <td className="px-6 py-4 text-slate-500">{p.format}</td>
                      <td className="px-6 py-4 text-slate-500">{new Date(p.createdAt).toLocaleDateString()}</td>
                      <td className="px-6 py-4">
                        <button className="text-indigo-400 hover:text-indigo-300 font-bold transition-colors">Download</button>
                      </td>
                    </tr>
                  ))}
                  {data.projects.length === 0 && (
                    <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-500 italic">No projects yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </Section>
        </div>

        <div className="space-y-8">
          {/* Quick Actions Card */}
          <div className="bg-indigo-600 rounded-3xl p-8 shadow-2xl shadow-indigo-600/30">
            <h3 className="text-xl font-bold mb-6">Quick Actions</h3>
            <div className="grid grid-cols-1 gap-3">
              <ActionButton icon="➕" text="New Project" highlight onClick={() => setModal("new-project")} />
              <ActionButton icon="🎓" text="Browse All Agents" onClick={() => setShowAgentBrowser(true)} />
              <ActionButton icon="💰" text="Buy Credits" onClick={() => setShowCredits(true)} />
              <ActionButton icon="📜" text="View Full History" onClick={() => setShowHistory(true)} />
              <ActionButton icon="🎁" text="Refer a Friend" onClick={() => setActiveTab("referrals")} />
              <ActionButton icon="🔧" text="Support" onClick={() => setShowSupport(true)} />
              <ActionButton icon="⚙️" text="Settings" onClick={() => setActiveTab("settings")} />
            </div>
          </div>

          {/* Referral Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <h3 className="text-lg font-bold mb-2">Invite & Earn 🤝</h3>
            <p className="text-slate-400 text-sm mb-4">Share your link and earn ₦500 for every friend who subscribes.</p>
            <div className="flex gap-2">
              <input readOnly value={`prosuite.ng/ref/${data.user.referralCode}`} className="flex-grow bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-500 focus:outline-none" />
              <button onClick={() => {
                navigator.clipboard.writeText(`prosuite.ng/ref/${data.user.referralCode}`);
              }} className="px-3 py-2 bg-indigo-600 rounded-lg text-xs font-bold hover:bg-indigo-700 transition-all">Copy</button>
            </div>
            <div className="mt-4 flex items-center justify-between">
              <div className="text-xs text-slate-500">Earned: <span className="text-slate-100 font-bold">₦{data.referrals.totalEarned}</span></div>
              <button onClick={() => setActiveTab("referrals")} className="text-xs text-indigo-400 font-bold hover:underline">Referral Hub →</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ActionButton({ icon, text, highlight, onClick }: { icon: string, text: string, highlight?: boolean, onClick?: () => void }) {
  return (
    <button onClick={onClick} className={`w-full py-3 px-4 rounded-xl font-bold flex items-center gap-3 transition-all ${
      highlight 
        ? 'bg-white text-indigo-600 hover:bg-slate-100 shadow-lg' 
        : 'bg-indigo-500 text-white hover:bg-indigo-400 border border-indigo-400/30'
    }`}>
      <span className="text-lg">{icon}</span>
      <span className="text-sm">{text}</span>
    </button>
  );
}

function StatCard({ label, value, icon, color }: { label: string, value: any, icon: string, color: string }) {
  const colors: any = {
    indigo: "bg-indigo-600/10 text-indigo-400 border-indigo-500/20",
    emerald: "bg-emerald-600/10 text-emerald-400 border-emerald-500/20",
    blue: "bg-blue-600/10 text-blue-400 border-blue-500/20",
    amber: "bg-amber-600/10 text-amber-400 border-amber-500/20",
    teal: "bg-teal-600/10 text-teal-400 border-teal-500/20",
  };
  return (
    <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl">
      <div className={`w-10 h-10 rounded-xl mb-3 flex items-center justify-center text-xl border ${colors[color]}`}>
        {icon}
      </div>
      <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-1">{label}</p>
      <h4 className="text-xl font-bold">{value}</h4>
    </div>
  );
}

function Section({ title, children, actionLabel }: { title: string, children: any, actionLabel?: string }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold">{title}</h3>
        {actionLabel && <button className="text-xs text-indigo-400 font-bold hover:underline">{actionLabel} →</button>}
      </div>
      {children}
    </div>
  );
}

function SubscriptionRow({ sub }: { sub: any }) {
  const daysRemaining = Math.max(0, Math.ceil((sub.endsAt - Date.now()) / (1000 * 60 * 60 * 24)));
  const percentage = Math.min(100, Math.max(0, (daysRemaining / 30) * 100)); // Simplified for 30-day plans
  const priceMap: Record<string, string> = { weekly: "₦3,500/wk", monthly: "₦12,500/mo", quarterly: "₦32,000/qtr", yearly: "₦120,000/yr" };

  return (
    <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4 group hover:border-indigo-500/50 transition-all">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-indigo-600/10 rounded-xl flex items-center justify-center text-2xl border border-indigo-500/20 group-hover:scale-110 transition-transform">
          🤖
        </div>
        <div>
          <p className="font-black capitalize text-lg tracking-tight">{sub.plan} Agent Access</p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded font-black uppercase">{priceMap[sub.plan] || "₦12,500/mo"}</span>
            <span className="text-[10px] text-slate-500 italic">Next: {new Date(sub.endsAt).toLocaleDateString()}</span>
          </div>
        </div>
      </div>
      <div className="flex-grow max-w-md mx-4">
        <div className="flex justify-between text-[10px] uppercase font-black tracking-widest text-slate-500 mb-2">
          <span>{daysRemaining} Days remaining</span>
          <span className="text-emerald-400">ACTIVE ✅</span>
        </div>
        <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden border border-slate-700/50">
          <div className="h-full bg-gradient-to-r from-indigo-600 to-indigo-400 rounded-full transition-all duration-1000" style={{ width: `${percentage}%` }}></div>
        </div>
      </div>
      <div className="flex gap-2">
        <button className="px-4 py-2 bg-slate-800 text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-slate-700 transition-all border border-slate-700">Pause</button>
        <button className="px-4 py-2 bg-indigo-600 text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20">Upgrade</button>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: any = {
    completed: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    "in-progress": "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
    revision: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  };
  return (
    <span className={`px-2 py-1 rounded-md text-[10px] font-bold border uppercase tracking-tighter ${styles[status] || styles["in-progress"]}`}>
      {status}
    </span>
  );
}

function EmptyState({ icon, text }: { icon: string, text: string }) {
  return (
    <div className="p-12 text-center border-2 border-dashed border-slate-800 rounded-2xl">
      <div className="text-4xl mb-4">{icon}</div>
      <p className="text-slate-500 text-sm">{text}</p>
    </div>
  );
}

function Subscriptions({ data }: { data: any }) { 
  const activeSubs = data.subscriptions.filter((s: any) => s.status === "active");
  const monthlySpend = activeSubs.reduce((sum: number, s: any) => {
    if (s.plan === "weekly") return sum + 3500;
    if (s.plan === "monthly") return sum + 12500;
    if (s.plan === "quarterly") return sum + 32000;
    if (s.plan === "yearly") return sum + 120000;
    return sum + 12500;
  }, 0);
  const nextPayout = activeSubs.length > 0 ? new Date(Math.min(...activeSubs.map((s: any) => s.endsAt))).toLocaleDateString() : "N/A";

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard label="Monthly Spend" value={`₦${monthlySpend.toLocaleString()}`} icon="💳" color="indigo" />
        <StatCard label="Next Renewal" value={nextPayout} icon="📅" color="emerald" />
        <StatCard label="Active Plans" value={activeSubs.length.toString()} icon="💎" color="amber" />
      </div>
      <Section title="Active Subscriptions">
        <div className="space-y-4">
          {data.subscriptions.length === 0 ? (
            <EmptyState icon="💳" text="You have no active subscriptions." />
          ) : (
            data.subscriptions.map((s: any) => <SubscriptionRow key={s._id} sub={s} />)
          )}
        </div>
      </Section>
      
      <Section title="Payment Methods">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.paymentMethods.map((pm: any) => (
            <div key={pm._id} className="p-6 bg-slate-900 border border-slate-800 rounded-2xl relative group">
              <div className="flex items-center justify-between mb-4">
                <div className="text-2xl">{pm.type === 'card' ? '💳' : '🏦'}</div>
                {pm.isDefault && <span className="text-[10px] bg-indigo-600/20 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded font-bold uppercase">Default</span>}
              </div>
              <p className="font-bold text-lg">{pm.provider} {pm.last4 ? `•••• ${pm.last4}` : ''}</p>
              <p className="text-xs text-slate-500 mt-1 uppercase tracking-widest font-medium">Expires 04/28</p>
              <div className="mt-4 flex gap-2">
                {!pm.isDefault && <button className="text-[10px] font-bold text-indigo-400 hover:underline uppercase">Set Default</button>}
                <button className="text-[10px] font-bold text-red-500 hover:underline uppercase ml-auto">Remove</button>
              </div>
            </div>
          ))}
          <button className="p-6 border-2 border-dashed border-slate-800 rounded-2xl flex flex-col items-center justify-center text-slate-500 hover:border-slate-700 hover:text-slate-400 transition-all gap-2">
            <span className="text-2xl">➕</span>
            <span className="text-xs font-bold uppercase">Add Payment Method</span>
          </button>
        </div>
      </Section>
    </div>
  ); 
}

function Projects({ data, setActiveTab, setModal, setShowAgentBrowser, setShowCredits, setShowHistory, setShowSupport }: { data: any, setActiveTab: (tab: string) => void, setModal: (m: string | null) => void, setShowAgentBrowser: (v: boolean) => void, setShowCredits: (v: boolean) => void, setShowHistory: (v: boolean) => void, setShowSupport: (v: boolean) => void }) { return <Overview data={data} setActiveTab={setActiveTab} setModal={setModal} setShowAgentBrowser={setShowAgentBrowser} setShowCredits={setShowCredits} setShowHistory={setShowHistory} setShowSupport={setShowSupport} />; }

function Referrals({ data, payoutMessage, setPayoutMessage, requestReferralPayoutAction }: { data: any; payoutMessage: string; setPayoutMessage: (v: string) => void; requestReferralPayoutAction: any }) {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard label="Friends Signed" value={data.referrals.friendsSignedUp} icon="👥" color="indigo" />
        <StatCard label="Total Earned" value={`₦${data.referrals.totalEarned.toLocaleString()}`} icon="💰" color="emerald" />
        <StatCard label="Available" value={`₦${data.referrals.availableBalance.toLocaleString()}`} icon="💎" color="amber" />
      </div>
      
          <div className="bg-indigo-600 rounded-2xl p-8 text-white relative overflow-hidden">
        <div className="relative z-10">
          <h2 className="text-3xl font-black mb-4 tracking-tight uppercase">Earn ₦500 for Every Friend!</h2>
          <p className="text-indigo-100 max-w-lg mb-8 text-lg font-bold">Spread the word about Dutchkem ProSuite and get paid instantly when your friends start their first subscription. Unlimited earnings!</p>
          <div className="flex flex-col md:flex-row gap-4 items-center mb-6">
            <div className="w-full md:w-96 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl px-6 py-4 text-xl font-mono tracking-widest">{data.user.referralCode}</div>
            <button onClick={() => navigator.clipboard.writeText(`prosuite.ng/ref/${data.user.referralCode}`)} className="w-full md:w-auto px-10 py-4 bg-white text-indigo-600 rounded-xl font-black text-lg hover:shadow-2xl transition-all">COPY LINK</button>
          </div>
          <div className="flex gap-4">
             <button className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center text-xl hover:bg-white/20">💬</button>
             <button className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center text-xl hover:bg-white/20">📘</button>
             <button className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center text-xl hover:bg-white/20">🐦</button>
             <button className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center text-xl hover:bg-white/20">📧</button>
          </div>
        </div>
        <div className="absolute top-0 right-0 text-9xl opacity-10 -rotate-12 translate-x-1/4 -translate-y-1/4">🤝</div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Section title="Referral History">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-800/50 border-b border-slate-800">
                <tr>
                  <th className="px-6 py-4 font-semibold text-slate-300">Friend</th>
                  <th className="px-6 py-4 font-semibold text-slate-300">Date</th>
                  <th className="px-6 py-4 font-semibold text-slate-300">Commission</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {data.referrals.history.map((r: any, i: number) => (
                  <tr key={i}>
                    <td className="px-6 py-4 font-bold">{r.name || 'Incognito Friend'}</td>
                    <td className="px-6 py-4 text-slate-500">{new Date(r.date).toLocaleDateString()}</td>
                    <td className="px-6 py-4 text-emerald-400 font-black">+₦{r.commission}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
        <Section title="Withdraw Funds">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 flex flex-col items-center justify-center text-center space-y-6">
            <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center text-4xl text-emerald-400 border border-emerald-500/20">💸</div>
            <div>
              <p className="text-slate-500 font-bold uppercase tracking-widest text-xs mb-2">Withdrawable Balance</p>
              <h2 className="text-4xl font-black">₦{data.referrals.availableBalance}</h2>
            </div>
            <div className="grid grid-cols-2 gap-2 w-full max-w-xs">
              <button className="py-3 bg-slate-800 rounded-xl text-xs font-bold hover:bg-slate-700 border border-slate-700">Bank Transfer</button>
              <button className="py-3 bg-slate-800 rounded-xl text-xs font-bold hover:bg-slate-700 border border-slate-700">OPay / Palmpay</button>
            </div>
            {payoutMessage && <p className={`text-xs font-bold ${payoutMessage.includes("success") ? "text-emerald-400" : "text-red-400"}`}>{payoutMessage}</p>}
            <button disabled={data.referrals.availableBalance < 1000} onClick={async () => {
              setPayoutMessage("");
              const result = await requestReferralPayoutAction({});
              setPayoutMessage(result?.success ? `Payout of ₦${result.amount?.toLocaleString()} requested!` : result?.error || "Failed to request payout");
              setTimeout(() => setPayoutMessage(""), 4000);
            }} className="w-full max-w-xs py-4 bg-emerald-600 text-white rounded-xl font-black text-lg hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-600/20 disabled:grayscale disabled:opacity-50">REQUEST PAYOUT</button>
            <p className="text-[10px] text-slate-500 uppercase font-bold tracking-tighter">Minimum withdrawal: ₦1,000 • Processed every Friday 2 PM</p>
          </div>
        </Section>
      </div>
    </div>
  );
}

function Security({ data, tfaMessage, setTfaMessage, toggle2FAAction, newPassword, setNewPassword, passwordMessage, setPasswordMessage, changePasswordAction }: { data: any; tfaMessage: string; setTfaMessage: (v: string) => void; toggle2FAAction: any; newPassword: string; setNewPassword: (v: string) => void; passwordMessage: string; setPasswordMessage: (v: string) => void; changePasswordAction: any }) {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-black uppercase tracking-tight">🔐 Security Operations</h3>
        <button className="px-6 py-2 bg-red-600/10 border border-red-600/20 text-red-500 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-red-600 hover:text-white transition-all">Logout Remote Devices</button>
      </div>
      
      <Section title="Active Personnel Sessions">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-800/50 border-b border-slate-800">
              <tr>
                <th className="px-8 py-5 font-black uppercase text-[10px] text-slate-500 tracking-widest">Device / OS</th>
                <th className="px-8 py-5 font-black uppercase text-[10px] text-slate-500 tracking-widest">Geographical Data</th>
                <th className="px-8 py-5 font-black uppercase text-[10px] text-slate-500 tracking-widest">Network IP</th>
                <th className="px-8 py-5 font-black uppercase text-[10px] text-slate-500 tracking-widest">Last Pulse</th>
                <th className="px-8 py-5 font-black uppercase text-[10px] text-slate-500 tracking-widest text-right">Session State</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {data.sessions.map((s: any) => (
                <tr key={s._id} className={`${s.isCurrent ? "bg-indigo-600/5" : ""} hover:bg-slate-800/30 transition-colors`}>
                  <td className="px-8 py-5 font-bold flex items-center gap-3">
                    <span className="text-xl">{s.device.includes('Mobile') ? '📱' : '💻'}</span>
                    <div>
                      <p className="text-sm">{s.device}</p>
                      <p className="text-[10px] text-slate-500 uppercase font-bold">Authorized Session</p>
                    </div>
                  </td>
                  <td className="px-8 py-5 text-slate-400 font-bold">{s.location}</td>
                  <td className="px-8 py-5 text-slate-500 font-mono text-xs tracking-tighter">{s.ip}</td>
                  <td className="px-8 py-5 text-slate-500 font-bold">{new Date(s.lastActive).toLocaleTimeString()}</td>
                  <td className="px-8 py-5 text-right">
                    {s.isCurrent ? (
                      <span className="text-emerald-400 font-black uppercase text-[10px] border border-emerald-500/20 px-3 py-1.5 rounded-lg bg-emerald-500/5 shadow-lg shadow-emerald-500/10">Current Session</span>
                    ) : (
                      <button className="text-red-500 font-black uppercase text-[10px] hover:underline tracking-widest">Revoke Access</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="p-8 bg-slate-900 border border-slate-800 rounded-2xl space-y-6">
          <h3 className="text-lg font-black uppercase tracking-tight flex items-center gap-2 text-teal-400">🛡️ Guardian AI Intelligence</h3>
          <p className="text-slate-400 text-sm">Real-time fraud monitoring and automated payment verification.</p>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-slate-800/30 rounded-xl border border-slate-700">
              <span className="text-xs text-slate-400 font-bold uppercase">Confidence Score</span>
              <span className="text-sm font-black text-emerald-400">98% Secure</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-800/30 rounded-xl border border-slate-700">
              <span className="text-xs text-slate-400 font-bold uppercase">Fraud Flags</span>
              <span className="text-sm font-black text-slate-300">0 Active</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-800/30 rounded-xl border border-slate-700">
              <span className="text-xs text-slate-400 font-bold uppercase">Last Verification</span>
              <span className="text-xs font-bold text-slate-500">2 min ago</span>
            </div>
          </div>
        </div>
        <div className="p-8 bg-slate-900 border border-slate-800 rounded-2xl space-y-6">
          <h3 className="text-lg font-black uppercase tracking-tight flex items-center gap-2">🛡️ 2FA Security</h3>
          <p className="text-slate-400 text-sm">Add an extra layer of protection to your account by enabling two-factor authentication.</p>
          <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-xl border border-slate-700">
            <div>
              <p className="font-bold">Authenticator App</p>
              <p className="text-xs text-slate-500 italic">Google Authenticator, Authy, etc.</p>
            </div>
            <button onClick={async () => {
              const result = await toggle2FAAction({ enable: true });
              setTfaMessage(result?.success ? "2FA enabled successfully!" : result?.error || "Failed to enable 2FA");
              setTimeout(() => setTfaMessage(""), 3000);
            }} className="px-6 py-2 bg-indigo-600 rounded-lg text-xs font-black hover:bg-indigo-700">ENABLE</button>
          </div>
          {tfaMessage && <p className={`text-xs font-bold ${tfaMessage.includes("success") ? "text-emerald-400" : "text-red-400"}`}>{tfaMessage}</p>}
        </div>
        <div className="p-8 bg-slate-900 border border-slate-800 rounded-2xl space-y-6">
          <h3 className="text-lg font-black uppercase tracking-tight flex items-center gap-2">🔑 Change Password</h3>
          <form className="space-y-4" onSubmit={async (e) => {
            e.preventDefault();
            setPasswordMessage("");
            const form = e.target as HTMLFormElement;
            const currentPw = (form.elements[0] as HTMLInputElement).value;
            const newPw = newPassword;
            if (!currentPw || !newPw) { setPasswordMessage("Both fields required"); return; }
            const result = await changePasswordAction({ currentPassword: currentPw, newPassword: newPw });
            setPasswordMessage(result?.success ? "Password updated!" : result?.error || "Failed to update password");
            if (result?.success) { form.reset(); setNewPassword(""); }
            setTimeout(() => setPasswordMessage(""), 3000);
          }}>
            <div className="space-y-2">
              <label className="text-[10px] uppercase font-black text-slate-500 tracking-widest">Current Password</label>
              <input type="password" placeholder="••••••••" className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500/50" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] uppercase font-black text-slate-500 tracking-widest">New Password</label>
              <input type="password" placeholder="••••••••" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500/50" />
            </div>
            {passwordMessage && <p className={`text-xs font-bold ${passwordMessage.includes("success") || passwordMessage.includes("updated") ? "text-emerald-400" : "text-red-400"}`}>{passwordMessage}</p>}
            <button type="submit" className="w-full py-3 bg-slate-800 rounded-xl text-sm font-black border border-slate-700 hover:bg-slate-700">UPDATE PASSWORD</button>
          </form>
        </div>
      </div>
    </div>
  );
}

function Settings({ data }: { data: any }) {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 space-y-6">
          <h3 className="text-xl font-bold flex items-center gap-2">👤 Profile Settings</h3>
          <div className="space-y-4">
            <div className="flex items-center gap-6 p-4 bg-slate-800/30 rounded-xl border border-slate-800">
              <div className="w-20 h-20 rounded-full bg-indigo-600 flex items-center justify-center text-3xl font-bold border-4 border-indigo-500/20 overflow-hidden">
                {data.user.image ? <img src={data.user.image} alt="Avatar" /> : data.user.name?.[0]}
              </div>
              <div>
                <button className="px-4 py-2 bg-indigo-600 rounded-lg text-xs font-bold hover:bg-indigo-700 transition-all mb-2">Change Avatar</button>
                <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Max size 2MB • PNG/JPG</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="Full Name" value={data.user.name || ""} />
              <Input label="Email Address" value={data.user.email || ""} disabled />
              <Input label="Phone Number" placeholder="+234 ..." />
              <Input label="Language" value="English (NG)" />
            </div>
            <button className="w-full py-4 bg-indigo-600 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20">SAVE CHANGES</button>
          </div>
        </div>

        <div className="space-y-8">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 space-y-6">
            <h3 className="text-xl font-bold flex items-center gap-2">🔔 Notification Preferences</h3>
            <div className="space-y-4">
              <Toggle label="Email Notifications" description="Receive updates via your registered email." active />
              <Toggle label="SMS Alerts" description="Get urgent updates on your phone." />
              <Toggle label="Push Notifications" description="Real-time alerts in your browser/app." active />
              <Toggle label="Project Completions" description="Notify me when an agent finishes a task." active />
            </div>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 space-y-6">
            <h3 className="text-xl font-bold flex items-center gap-2">💰 Billing Currency</h3>
            <p className="text-slate-400 text-sm">Choose your preferred currency for invoices and pricing display.</p>
            <div className="flex gap-2">
              <button className="flex-1 py-3 bg-indigo-600 rounded-xl font-bold border border-indigo-500/30">NGN (₦)</button>
              <button className="flex-1 py-3 bg-slate-800 rounded-xl font-bold border border-slate-700 text-slate-400">USD ($)</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Input({ label, value, placeholder, disabled }: { label: string, value?: string, placeholder?: string, disabled?: boolean }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] uppercase font-bold text-slate-500 tracking-widest">{label}</label>
      <input 
        defaultValue={value}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all disabled:opacity-50 text-sm" 
      />
    </div>
  );
}

function Toggle({ label, description, active }: { label: string, description: string, active?: boolean }) {
  return (
    <div className="flex items-center justify-between p-4 bg-slate-800/20 rounded-xl border border-slate-800">
      <div className="max-w-[80%]">
        <p className="text-sm font-bold">{label}</p>
        <p className="text-[10px] text-slate-500 leading-tight">{description}</p>
      </div>
      <button className={`w-12 h-6 rounded-full relative transition-all ${active ? 'bg-indigo-600' : 'bg-slate-700'}`}>
        <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${active ? 'right-1' : 'left-1'}`}></div>
      </button>
    </div>
  );
}

function Footer() {
  return (
    <footer className="bg-slate-900 border-t border-slate-800 p-8 mt-auto">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
        <div className="text-center md:text-left">
          <p className="text-sm font-bold text-slate-300">Powered by Dutchkem Ventures ProSuite NG+</p>
          <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-tighter">© 2026 Dutchkem Ventures. RC: 9489855. All rights reserved.</p>
        </div>
        <div className="flex gap-6 text-xs text-slate-500 font-medium">
          <a href="/terms" className="hover:text-indigo-400">Terms of Service</a>
          <a href="/privacy" className="hover:text-indigo-400">Privacy Policy</a>
          <a href="/contact" className="hover:text-indigo-400">Help Center</a>
          <a href="/contact" className="hover:text-indigo-400">Contact Us</a>
        </div>
        <div className="flex gap-4">
          <SocialIcon icon="🐦" />
          <SocialIcon icon="📸" />
          <SocialIcon icon="💼" />
          <SocialIcon icon="💬" />
        </div>
      </div>
    </footer>
  );
}

function SocialIcon({ icon }: { icon: string }) {
  return (
    <button className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center hover:bg-slate-700 transition-all grayscale hover:grayscale-0">
      {icon}
    </button>
  );
}

function BuyCreditsModal({ user, onClose }: { user: any; onClose: () => void }) {
  const [loading, setLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const createCheckout = useAction(api.kdp_subscriptions.getKDPCheckoutUrl as any);

  const plans = [
    { id: "basic", name: "Basic", price: 8000, period: "monthly", features: ["5 agent tasks/month", "Standard response time", "Email support"] },
    { id: "pro", name: "Pro", price: 25000, period: "monthly", features: ["Unlimited agent tasks", "Priority response", "All 15 agents", "File generation"] },
    { id: "enterprise", name: "Enterprise", price: 80000, period: "yearly", features: ["Everything in Pro", "Custom integrations", "Dedicated support", "API access"] },
  ];

  const handleSubscribe = async (planId: string) => {
    setLoading(true);
    setSelectedPlan(planId);
    try {
      const planMap: Record<string, "BASIC" | "PRO" | "ENTERPRISE"> = {
        basic: "BASIC",
        pro: "PRO",
        enterprise: "ENTERPRISE",
      };
      const result = await createCheckout({
        plan: planMap[planId],
        returnUrl: window.location.href,
      });
      if (result?.checkoutUrl) {
        window.location.href = result.checkoutUrl;
      }
    } catch (e: any) {
      console.error("Checkout failed:", e);
      alert("Failed to initiate checkout. Please try again.");
    } finally {
      setLoading(false);
      setSelectedPlan(null);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-black">💳 Subscribe to ProSuite</h2>
      <p className="text-slate-400">Choose a plan to unlock all 15 AI agents and premium features.</p>
      <div className="space-y-3">
        {plans.map((plan) => (
          <button
            key={plan.id}
            onClick={() => handleSubscribe(plan.id)}
            disabled={loading}
            className={`w-full p-4 rounded-2xl border text-left transition-all ${
              selectedPlan === plan.id
                ? "bg-indigo-600/20 border-indigo-500"
                : "bg-slate-800 border-slate-700 hover:border-indigo-500"
            } ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            <div className="flex justify-between items-center mb-2">
              <span className="font-bold text-lg">{plan.name}</span>
              <span className="text-indigo-400 font-black text-xl">₦{plan.price.toLocaleString()}<span className="text-xs text-slate-400">/{plan.period}</span></span>
            </div>
            <div className="text-xs text-slate-400 space-y-1">
              {plan.features.map((f, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-emerald-400">✓</span> {f}
                </div>
              ))}
            </div>
            {selectedPlan === plan.id && loading && (
              <div className="mt-2 text-xs text-indigo-300 flex items-center gap-2">
                <div className="w-3 h-3 border-2 border-indigo-300 border-t-transparent rounded-full animate-spin"></div>
                Redirecting to Kora Pay...
              </div>
            )}
          </button>
        ))}
      </div>
      <p className="text-[10px] text-slate-500 uppercase font-bold text-center">Secure payment powered by Kora Pay</p>
    </div>
  );
}
