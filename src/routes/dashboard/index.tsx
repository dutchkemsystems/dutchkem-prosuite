import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { useConvexAuth, useConvex, useMutation, useAction } from "convex/react"
import { useAuthActions } from "@convex-dev/auth/react"
import React, { Suspense, useCallback, useEffect, useRef, useState } from "react"
import { useDashboardData } from '~/lib/hooks/useDashboardData';
import { api } from "../../../convex/_generated/api"
import { CompanyLogo } from '~/components/CompanyLogo';
import { KDPProjectHub } from '~/components/KDPProjectHub';
import { KDPRoyaltyDashboard } from '~/components/KDPRoyaltyDashboard';
import { InactivityLogout } from '~/components/InactivityLogout';
import { UrgencyTriggers } from '~/components/UrgencyTriggers';
import { ClientActivityFeed } from '~/components/ClientActivityFeed';
import ThemeBackground from '~/theme/ThemeBackground'
import { SubscriptionManager } from '~/components/dashboard/SubscriptionManager';
import { CreditBalance } from '~/components/dashboard/CreditBalance';
import { UsageTracker } from '~/components/dashboard/UsageTracker';
import { ClientWhatsApp } from '~/components/dashboard/ClientWhatsApp';
import { AgentBrowser } from '~/components/dashboard/AgentBrowser';
import { CreditPackages } from '~/components/dashboard/CreditPackages';
import { HistoryPanel } from '~/components/dashboard/HistoryPanel';
import { SupportChat } from '~/components/dashboard/SupportChat';
import { MyTasks } from '~/components/dashboard/MyTasks';
import CustomerSupportChat from '~/components/CustomerSupportChat';

import { DashboardSpinner, TabButton, Header, Footer } from './shared';
import { Overview } from './overview';
import { ActivityTab } from './activity';
import { Projects } from './projects';
import { Referrals } from './referrals';
import { Security } from './security';
import { Settings } from './settings';
import { BuyCreditsModal } from './buy-credits-modal';

const PredictiveAnalyticsPanel = React.lazy(() => import("~/components/admin/PredictiveAnalyticsPanel").then(m => ({ default: m.PredictiveAnalyticsPanel })));
const VoiceVideoPanel = React.lazy(() => import("~/components/admin/VoiceVideoPanel").then(m => ({ default: m.VoiceVideoPanel })));
const OpenDesignPanel = React.lazy(() => import("~/components/admin/OpenDesignPanel").then(m => ({ default: m.OpenDesignPanel })));
const BlockchainPanel = React.lazy(() => import("~/components/admin/BlockchainPanel").then(m => ({ default: m.BlockchainPanel })));

export const Route = createFileRoute('/dashboard')({
  component: DashboardPage,
})

function DashboardPage() {
  const { isAuthenticated, isLoading: authLoading } = useConvexAuth();
  const navigate = useNavigate();
  const [authTimeout, setAuthTimeout] = useState(false);

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
  const [activeTab, setActiveTab] = useState("overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [modal, setModal] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");
  const [tfaMessage, setTfaMessage] = useState("");
  const [payoutMessage, setPayoutMessage] = useState("");
  const [showAccessGranted, setShowAccessGranted] = useState(false);
  const [showAgentBrowser, setShowAgentBrowser] = useState(false);
  const [showCredits, setShowCredits] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showSupport, setShowSupport] = useState(false);
  const [showOrchestrator, setShowOrchestrator] = useState(false);
  const [autoAgent, setAutoAgent] = useState<string | null>(null);

  const { data, loadError, refetch: fetchDashboard, setData } = useDashboardData();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("payment") === "success") {
      setShowAccessGranted(true);
      window.history.replaceState({}, "", window.location.pathname);
      setTimeout(() => setShowAccessGranted(false), 5000);
    }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const agentParam = params.get("agent");
    if (agentParam && /^(A\d{1,2}|GENERAL)$/.test(agentParam)) {
      setAutoAgent(agentParam);
      setShowOrchestrator(true);
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  const toggle2FAAction = useMutation(api.client_actions.toggle2FA);
  const changePasswordAction = useMutation(api.client_actions.changeClientPassword);
  const requestReferralPayoutAction = useMutation(api.client_actions.requestReferralPayout);
  const ensureReferralCode = useMutation(api.client_actions.ensureReferralCode);

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
    <ThemeBackground>
    <div className="min-h-screen text-slate-100 flex flex-col md:flex-row overflow-hidden relative">
      <InactivityLogout adminMode={false} logoutPath="/auth" />
      <div className="md:hidden flex items-center justify-between p-4 bg-slate-900 border-b border-slate-800 sticky top-0 z-30">
        <Link to="/" className="flex items-center gap-3">
          <CompanyLogo className="w-10 h-10" />
          <span className="font-black text-xs tracking-tighter uppercase text-white">ProSuite</span>
        </Link>
        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="w-12 h-12 flex items-center justify-center rounded-xl bg-slate-800 text-white" aria-label="Toggle menu">
          {sidebarOpen ? '✕' : '☰'}
        </button>
      </div>

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
            <TabButton active={activeTab === "credits"} onClick={() => { setActiveTab("credits"); setSidebarOpen(false); }} icon="💰" label="Credits" />
            <TabButton active={activeTab === "usage"} onClick={() => { setActiveTab("usage"); setSidebarOpen(false); }} icon="📊" label="Usage" />
            <TabButton active={activeTab === "kdp"} onClick={() => { setActiveTab("kdp"); setSidebarOpen(false); }} icon="📖" label="KDP Publishing" />
            <TabButton active={activeTab === "projects"} onClick={() => { setActiveTab("projects"); setSidebarOpen(false); }} icon="📁" label="Projects" />
            <TabButton active={activeTab === "referrals"} onClick={() => { setActiveTab("referrals"); setSidebarOpen(false); }} icon="🤝" label="Referrals" />
            <TabButton active={activeTab === "whatsapp"} onClick={() => { setActiveTab("whatsapp"); setSidebarOpen(false); }} icon="📱" label="WhatsApp" />
            <TabButton active={activeTab === "security"} onClick={() => { setActiveTab("security"); setSidebarOpen(false); }} icon="🛡️" label="Security" />
            <TabButton active={activeTab === "settings"} onClick={() => { setActiveTab("settings"); setSidebarOpen(false); }} icon="⚙️" label="Settings" />
            <TabButton active={activeTab === "browse-agents"} onClick={() => { setActiveTab("browse-agents"); setSidebarOpen(false); }} icon="🤖" label="Browse Agents" />
            <TabButton active={activeTab === "history"} onClick={() => { setActiveTab("history"); setSidebarOpen(false); }} icon="📜" label="Full History" />
            <TabButton active={activeTab === "my-tasks"} onClick={() => { setActiveTab("my-tasks"); setSidebarOpen(false); }} icon="📋" label="My Tasks" />
            <TabButton active={activeTab === "support"} onClick={() => { setActiveTab("support"); setSidebarOpen(false); }} icon="💬" label="Support" />
            <TabButton active={activeTab === "predictive"} onClick={() => { setActiveTab("predictive"); setSidebarOpen(false); }} icon="🔮" label="Predictive Analytics" />
            <TabButton active={activeTab === "voice-video"} onClick={() => { setActiveTab("voice-video"); setSidebarOpen(false); }} icon="🎬" label="Voice & Video" />
            <TabButton active={activeTab === "open-design"} onClick={() => { setActiveTab("open-design"); setSidebarOpen(false); }} icon="🎨" label="Open Design" />
            <TabButton active={activeTab === "blockchain"} onClick={() => { setActiveTab("blockchain"); setSidebarOpen(false); }} icon="⛓️" label="Blockchain" />
          </nav>
        </div>
        <div className="mt-auto p-4 md:p-6 border-t border-slate-800">
          <button onClick={async () => { setSidebarOpen(false); try { await signOut(); } catch {} navigate({ to: '/auth' }); }} className="flex items-center gap-2 text-slate-400 hover:text-red-400 transition-colors w-full text-left p-2">
            <span>🚪</span> Sign Out
          </button>
        </div>
      </aside>

      <main className="flex-grow overflow-y-auto h-screen flex flex-col">
        <div className="p-4 md:p-8 space-y-8 flex-grow">
          <Header user={data.user} notifications={data.notifications} />
          
          {activeTab === "overview" && <Overview data={data} setActiveTab={setActiveTab} setModal={setModal} setShowAgentBrowser={setShowAgentBrowser} setShowCredits={setShowCredits} setShowHistory={setShowHistory} setShowSupport={setShowSupport} />}
          {activeTab === "activity" && <ActivityTab data={data} />}
          {activeTab === "subscriptions" && (
            <div className="space-y-8">
              <SubscriptionManager userId={data.user._id} email={data.user.email} />
              <CreditBalance userId={data.user._id} email={data.user.email} />
              <UsageTracker userId={data.user._id} />
            </div>
          )}
          {activeTab === "kdp" && (
            <Suspense fallback={<DashboardSpinner />}>
              <div className="space-y-12 ">
                 <KDPProjectHub userId={data.user._id} />
                 {(data.user.subscription?.plan === "quarterly" || data.user.subscription?.plan === "yearly") && (
                   <KDPRoyaltyDashboard userId={data.user._id} />
                 )}
              </div>
            </Suspense>
          )}
          {activeTab === "credits" && <CreditBalance userId={data.user._id} email={data.user.email} />}
          {activeTab === "usage" && <UsageTracker userId={data.user._id} />}
          {activeTab === "projects" && <Projects data={data} setModal={setModal} />}
          {activeTab === "referrals" && <Referrals data={data} payoutMessage={payoutMessage} setPayoutMessage={setPayoutMessage} requestReferralPayoutAction={requestReferralPayoutAction} />}
          {activeTab === "whatsapp" && <ClientWhatsApp userId={data.user._id} userEmail={data.user.email} />}
          {activeTab === "security" && <Security data={data} tfaMessage={tfaMessage} setTfaMessage={setTfaMessage} toggle2FAAction={toggle2FAAction} newPassword={newPassword} setNewPassword={setNewPassword} passwordMessage={passwordMessage} setPasswordMessage={setPasswordMessage} changePasswordAction={changePasswordAction} />}
          {activeTab === "settings" && <Settings data={data} />}
          {activeTab === "browse-agents" && <AgentBrowser isOpen={true} onClose={() => setActiveTab("overview")} mode="page" />}
          {activeTab === "history" && <HistoryPanel isOpen={true} onClose={() => setActiveTab("overview")} />}
          {activeTab === "my-tasks" && data?.user && <MyTasks userId={data.user._id} />}
          {activeTab === "support" && <SupportChat isOpen={true} onClose={() => setActiveTab("overview")} />}
          {activeTab === "predictive" && <Suspense fallback={<DashboardSpinner />}><PredictiveAnalyticsPanel /></Suspense>}
          {activeTab === "voice-video" && <Suspense fallback={<DashboardSpinner />}><VoiceVideoPanel /></Suspense>}
          {activeTab === "open-design" && <Suspense fallback={<DashboardSpinner />}><OpenDesignPanel adminToken="" /></Suspense>}
          {activeTab === "blockchain" && <Suspense fallback={<DashboardSpinner />}><BlockchainPanel /></Suspense>}
        </div>
        <Footer />

        {modal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setModal(null)}></div>
            <div className="relative bg-slate-900 border border-slate-800 w-full max-w-lg rounded-3xl p-8 shadow-2xl ">
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
            <div className="bg-slate-900 border border-emerald-500/30 rounded-3xl p-8 max-w-md w-full text-center ">
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
        {showOrchestrator && (
          <CustomerSupportChat
            agentId={autoAgent || undefined}
            userId={data?.user?._id}
            onClose={() => { setShowOrchestrator(false); setAutoAgent(null); }}
          />
        )}
      </main>
    </div>
    </ThemeBackground>
  );
}
