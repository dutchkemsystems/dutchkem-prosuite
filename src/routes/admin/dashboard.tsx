import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useSuspenseQuery } from "@tanstack/react-query"
import { convexQuery } from "@convex-dev/react-query"
import { useConvexAuth, useConvex } from "convex/react"
import { useAuthActions } from "@convex-dev/auth/react"
import { lazy, useEffect, useState } from "react"
import { api } from "../../../convex/_generated/api"
import { CompanyLogo } from "~/components/CompanyLogo";
import { useSocket } from "~/lib/socket";
import { InactivityLogout } from "~/components/InactivityLogout";
import { AdminSuspense, AdminTab, Footer, LoadingScreen } from "~/components/admin/panels/shared";

// Extracted panel modules (lazy-loaded)
const SocialEnginePanel = lazy(() => import("~/components/admin/panels/social-panels").then(m => ({ default: m.SocialEnginePanel })));
const GuardianWatchPanel = lazy(() => import("~/components/admin/panels/social-panels").then(m => ({ default: m.GuardianWatchPanel })));
const DailySweepStatusPanel = lazy(() => import("~/components/admin/panels/finance-panels").then(m => ({ default: m.DailySweepStatusPanel })));
const CharityDashboardPanel = lazy(() => import("~/components/admin/panels/finance-panels").then(m => ({ default: m.CharityDashboardPanel })));
const FreelancerMarketplacePanel = lazy(() => import("~/components/admin/panels/finance-panels").then(m => ({ default: m.FreelancerMarketplacePanel })));
const SecurityHubPanel = lazy(() => import("~/components/admin/panels/admin-panels").then(m => ({ default: m.SecurityHubPanel })));
const AuditTrailPanel = lazy(() => import("~/components/admin/panels/admin-panels").then(m => ({ default: m.AuditTrailPanel })));
const HolidayDiscountsPanel = lazy(() => import("~/components/admin/panels/admin-panels").then(m => ({ default: m.HolidayDiscountsPanel })));
const AutoUpdatesPanel = lazy(() => import("~/components/admin/panels/admin-panels").then(m => ({ default: m.AutoUpdatesPanel })));
const AdminProfileCard = lazy(() => import("~/components/admin/panels/admin-panels").then(m => ({ default: m.AdminProfileCard })));
const ManualAgentTaskPanel = lazy(() => import("~/components/admin/panels/general-panels").then(m => ({ default: m.ManualAgentTaskPanel })));
const StatsOverview = lazy(() => import("~/components/admin/panels/general-panels").then(m => ({ default: m.StatsOverview })));
const RecentTransactions = lazy(() => import("~/components/admin/panels/general-panels").then(m => ({ default: m.RecentTransactions })));
const FreelancerPanel = lazy(() => import("~/components/admin/panels/general-panels").then(m => ({ default: m.FreelancerPanel })));
const CloudMemoryPanel = lazy(() => import("~/components/admin/panels/general-panels").then(m => ({ default: m.CloudMemoryPanel })));
const VoiceROIPanel = lazy(() => import("~/components/admin/panels/general-panels").then(m => ({ default: m.VoiceROIPanel })));
const LiveChatsPanel = lazy(() => import("~/components/admin/panels/general-panels").then(m => ({ default: m.LiveChatsPanel })));
const APICostsPanel = lazy(() => import("~/components/admin/panels/general-panels").then(m => ({ default: m.APICostsPanel })));
const PlatformAnalyticsPanel = lazy(() => import("~/components/admin/panels/ai-panels").then(m => ({ default: m.PlatformAnalyticsPanel })));
const UserManagementPanel = lazy(() => import("~/components/admin/panels/ai-panels").then(m => ({ default: m.UserManagementPanel })));
const UnifiedAnalyticsPanel = lazy(() => import("~/components/admin/panels/ai-panels").then(m => ({ default: m.UnifiedAnalyticsPanel })));
const SyntheticIntelPanel = lazy(() => import("~/components/admin/panels/ai-panels").then(m => ({ default: m.SyntheticIntelPanel })));
const AdEnginePanel = lazy(() => import("~/components/admin/panels/ai-panels").then(m => ({ default: m.AdEnginePanel })));

// Lazy-loaded external panels
const LiveFeed = lazy(() => import("~/components/LiveFeed").then(m => ({ default: m.LiveFeed })));
const LiveCharts = lazy(() => import("~/components/LiveCharts").then(m => ({ default: m.LiveCharts })));
const PaymentMonitor = lazy(() => import("~/components/PaymentMonitor").then(m => ({ default: m.PaymentMonitor })));
const SupportDashboard = lazy(() => import("~/components/admin/SupportDashboard").then(m => ({ default: m.SupportDashboard })));
const ComposioAdminHub = lazy(() => import("~/components/ComposioAdminHub").then(m => ({ default: m.ComposioAdminHub })));
const RenewalsTithePanel = lazy(() => import("~/components/RenewalsTithePanel").then(m => ({ default: m.RenewalsTithePanel })));
const ComposioObservability = lazy(() => import("~/components/ComposioObservability").then(m => ({ default: m.ComposioObservability })));
const TryPostScheduler = lazy(() => import("~/components/TryPostScheduler").then(m => ({ default: m.TryPostScheduler })));
const AutoHealDashboard = lazy(() => import("~/components/AutoHealDashboard").then(m => ({ default: m.AutoHealDashboard })));
const ComposioEnhancementPanel = lazy(() => import("~/components/ComposioEnhancementPanel").then(m => ({ default: m.ComposioEnhancementPanel })));
const TaxCompliancePanel = lazy(() => import("~/components/TaxCompliancePanel").then(m => ({ default: m.TaxCompliancePanel })));
const EnterprisePortalAdmin = lazy(() => import("~/components/enterprise/EnterprisePortalAdmin").then(m => ({ default: m.EnterprisePortalAdmin })));
const AdminEnterpriseHub = lazy(() => import("~/components/admin/AdminEnterpriseHub").then(m => ({ default: m.AdminEnterpriseHub })));
const MimoControlPanel = lazy(() => import("~/components/admin/MimoControlPanel").then(m => ({ default: m.MimoControlPanel })));
const RapidAPIFallbackDashboard = lazy(() => import("~/components/admin/RapidAPIFallbackDashboard").then(m => ({ default: m.RapidAPIFallbackDashboard })));
const RevenueHub = lazy(() => import("~/components/admin/RevenueHub").then(m => ({ default: m.RevenueHub })));
const AutoFlyerDashboard = lazy(() => import("~/components/admin/AutoFlyerDashboard"));
const CurrencyConverter = lazy(() => import("~/components/admin/CurrencyConverter"));
const AdAutomationHub = lazy(() => import("~/components/admin/enterprise/AdAutomationHub"));
const AdDesignerPanel = lazy(() => import("~/components/admin/AdDesignerPanel").then(m => ({ default: m.AdDesignerPanel })));
const WhatsAppHub = lazy(() => import("~/components/admin/WhatsAppHub").then(m => ({ default: m.WhatsAppHub })));
const AdminPayoutDashboard = lazy(() => import("~/components/admin/enterprise/AdminPayoutDashboard"));
const EnterprisePaymentsReadOnly = lazy(() => import("~/components/admin/EnterprisePaymentsReadOnly").then(m => ({ default: m.EnterprisePaymentsReadOnly })));
const ModelTogglePanel = lazy(() => import("~/components/admin/ModelTogglePanel").then(m => ({ default: m.ModelTogglePanel })));
const ModelAnalyticsPanel = lazy(() => import("~/components/admin/ModelAnalyticsPanel").then(m => ({ default: m.ModelAnalyticsPanel })));
const WhatsAppDualPanel = lazy(() => import("~/components/admin/WhatsAppDualPanel").then(m => ({ default: m.WhatsAppDualPanel })));
const HermesDashboard = lazy(() => import("~/components/admin/HermesDashboard").then(m => ({ default: m.HermesDashboard })));
const FreeLLMAPIPanel = lazy(() => import("~/components/admin/FreeLLMAPIPanel").then(m => ({ default: m.FreeLLMAPIPanel })));
const PaymentAnalyticsPanel = lazy(() => import("~/components/admin/PaymentAnalyticsPanel").then(m => ({ default: m.PaymentAnalyticsPanel })));
const RefundsPanel = lazy(() => import("~/components/admin/RefundsPanel").then(m => ({ default: m.RefundsPanel })));
const InvoicesPanel = lazy(() => import("~/components/admin/InvoicesPanel").then(m => ({ default: m.InvoicesPanel })));
const RecurringBillingPanel = lazy(() => import("~/components/admin/RecurringBillingPanel").then(m => ({ default: m.RecurringBillingPanel })));
const ClientAnalyticsDashboard = lazy(() => import("~/components/ClientAnalyticsWidgets").then(m => ({ default: m.ClientAnalyticsDashboard })));
const TaxDashboardPanel = lazy(() => import("~/components/admin/panels/general-panels").then(m => ({ default: m.TaxDashboardPanel })));

// Orphan panels (previously built but unwired)
const PredictiveAnalyticsPanel = lazy(() => import("~/components/admin/PredictiveAnalyticsPanel").then(m => ({ default: m.PredictiveAnalyticsPanel })));
const MarketingFunnelPanel = lazy(() => import("~/components/admin/MarketingFunnelPanel").then(m => ({ default: m.MarketingFunnelPanel })));
const VoiceVideoPanel = lazy(() => import("~/components/admin/VoiceVideoPanel").then(m => ({ default: m.VoiceVideoPanel })));
const WhiteLabelPanel = lazy(() => import("~/components/admin/WhiteLabelPanel").then(m => ({ default: m.WhiteLabelPanel })));
const SalesAgentPanel = lazy(() => import("~/components/admin/SalesAgentPanel").then(m => ({ default: m.SalesAgentPanel })));
const OpenDesignPanel = lazy(() => import("~/components/admin/OpenDesignPanel").then(m => ({ default: m.OpenDesignPanel })));
const DynamicPricingPanel = lazy(() => import("~/components/admin/DynamicPricingPanel").then(m => ({ default: m.DynamicPricingPanel })));
const UltimatePlatformPanel = lazy(() => import("~/components/admin/UltimatePlatformPanel").then(m => ({ default: m.UltimatePlatformPanel })));
const BlockchainPanel = lazy(() => import("~/components/admin/BlockchainPanel").then(m => ({ default: m.BlockchainPanel })));

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
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const convex = useConvex();
  const [sessionCheck, setSessionCheck] = useState<any>(undefined);
  const [adminToken, setAdminToken] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('admin_session_token');
    if (!token && !isLoading) { navigate({ to: '/admin/login' }); } else { setAdminToken(token); }
  }, [isLoading, navigate]);

  useEffect(() => {
    if (!adminToken) return;
    convex.query(api.auth_helpers.checkAdminSession, { adminToken }).then(setSessionCheck).catch(() => {});
  }, [adminToken]);

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

  const { connected: _wsConnected } = useSocket(adminToken || "");

  const handleLogout = async () => {
    localStorage.removeItem('admin_session_token');
    setAdminToken(null);
    try { await authSignOut(); } catch (e) { console.error("Failed to sign out:", e); }
    navigate({ to: '/admin/login' });
  };

  if (isLoading || !adminToken) return <LoadingScreen />;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row overflow-hidden font-sans">
      <InactivityLogout adminMode={true} logoutPath="/admin/login" />
      <div className="md:hidden flex items-center justify-between p-4 bg-slate-900 border-b border-slate-800 sticky top-0 z-30">
        <div className="flex items-center gap-3"><CompanyLogo className="w-10 h-10" /><span className="font-black text-xs tracking-tighter uppercase text-white">Admin</span></div>
        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="w-12 h-12 flex items-center justify-center rounded-xl bg-slate-800 text-white" aria-label="Toggle menu">{sidebarOpen ? '✕' : '☰'}</button>
      </div>
      <div className={`fixed inset-0 z-40 bg-black/60 md:hidden transition-opacity ${sidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={() => setSidebarOpen(false)} />
      <aside className={`fixed md:static inset-y-0 left-0 z-50 w-72 bg-slate-900 border-r border-slate-800 flex flex-col transform transition-transform md:transform-none ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        <div className="p-6 border-b border-slate-800"><div className="flex items-center gap-3"><CompanyLogo className="w-10 h-10" /><div><p className="text-sm font-black text-white uppercase tracking-widest">Admin Control</p><p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">UAE Engine v4.0</p></div></div></div>
        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          <AdminTab active={activeTab === "overview"} onClick={() => setActiveTab("overview")} icon="📊" label="Overview" onClose={() => setSidebarOpen(false)} />
          <AdminTab active={activeTab === "live-feed"} onClick={() => setActiveTab("live-feed")} icon="📡" label="Live Feed" onClose={() => setSidebarOpen(false)} />
          <AdminTab active={activeTab === "live-charts"} onClick={() => setActiveTab("live-charts")} icon="📈" label="Live Charts" onClose={() => setSidebarOpen(false)} />
          <AdminTab active={activeTab === "payments"} onClick={() => setActiveTab("payments")} icon="💳" label="Payments" onClose={() => setSidebarOpen(false)} />
          <AdminTab active={activeTab === "manual-task"} onClick={() => setActiveTab("manual-task")} icon="⚡" label="Manual Task" onClose={() => setSidebarOpen(false)} />
          <AdminTab active={activeTab === "social"} onClick={() => setActiveTab("social")} icon="📣" label="Social Engine" onClose={() => setSidebarOpen(false)} />
          <AdminTab active={activeTab === "guardian"} onClick={() => setActiveTab("guardian")} icon="🛡️" label="Guardian Watch" onClose={() => setSidebarOpen(false)} />
          <AdminTab active={activeTab === "tax"} onClick={() => setActiveTab("tax")} icon="🏛️" label="Tax Wallet" onClose={() => setSidebarOpen(false)} />
          <AdminTab active={activeTab === "payouts"} onClick={() => setActiveTab("payouts")} icon="🏦" label="Secure Sweeps" onClose={() => setSidebarOpen(false)} />
          <AdminTab active={activeTab === "security"} onClick={() => setActiveTab("security")} icon="🔐" label="Encryption Hub" onClose={() => setSidebarOpen(false)} />
          <AdminTab active={activeTab === "agents"} onClick={() => setActiveTab("agents")} icon="🤖" label="Agent Health" onClose={() => setSidebarOpen(false)} />
          <AdminTab active={activeTab === "discounts"} onClick={() => setActiveTab("discounts")} icon="📅" label="Holiday Logic" onClose={() => setSidebarOpen(false)} />
          <AdminTab active={activeTab === "updates"} onClick={() => setActiveTab("updates")} icon="🔄" label="Service Evolution" onClose={() => setSidebarOpen(false)} />
          <AdminTab active={activeTab === "freelancers"} onClick={() => setActiveTab("freelancers")} icon="👥" label="Freelancers" onClose={() => setSidebarOpen(false)} />
          <AdminTab active={activeTab === "audit"} onClick={() => setActiveTab("audit")} icon="📜" label="Audit Trail" onClose={() => setSidebarOpen(false)} />
          <AdminTab active={activeTab === "charity"} onClick={() => setActiveTab("charity")} icon="🕊️" label="Charity / Tithe" onClose={() => setSidebarOpen(false)} />
          <AdminTab active={activeTab === "marketplace"} onClick={() => setActiveTab("marketplace")} icon="🏪" label="Freelancer Marketplace" onClose={() => setSidebarOpen(false)} />
          <AdminTab active={activeTab === "cloud-memory"} onClick={() => setActiveTab("cloud-memory")} icon="☁️" label="Cloud Memory" onClose={() => setSidebarOpen(false)} />
          <AdminTab active={activeTab === "voice-roi"} onClick={() => setActiveTab("voice-roi")} icon="🎙️" label="Voice ROI" onClose={() => setSidebarOpen(false)} />
          <AdminTab active={activeTab === "live-chats"} onClick={() => setActiveTab("live-chats")} icon="💬" label="Live Chats" onClose={() => setSidebarOpen(false)} />
          <AdminTab active={activeTab === "api-costs"} onClick={() => setActiveTab("api-costs")} icon="🔌" label="API Costs" onClose={() => setSidebarOpen(false)} />
          <AdminTab active={activeTab === "platform-analytics"} onClick={() => setActiveTab("platform-analytics")} icon="📊" label="Platform Analytics" onClose={() => setSidebarOpen(false)} />
          <AdminTab active={activeTab === "users"} onClick={() => setActiveTab("users")} icon="👤" label="User Management" onClose={() => setSidebarOpen(false)} />
          <AdminTab active={activeTab === "unified-analytics"} onClick={() => setActiveTab("unified-analytics")} icon="📊" label="Unified Analytics" onClose={() => setSidebarOpen(false)} />
          <AdminTab active={activeTab === "synthetic"} onClick={() => setActiveTab("synthetic")} icon="🤖" label="Synthetic AI" onClose={() => setSidebarOpen(false)} />
          <AdminTab active={activeTab === "ad-engine"} onClick={() => setActiveTab("ad-engine")} icon="📢" label="Ad Engine" onClose={() => setSidebarOpen(false)} />
          <AdminTab active={activeTab === "ad-automation"} onClick={() => setActiveTab("ad-automation")} icon="🚀" label="Ad Automation" onClose={() => setSidebarOpen(false)} />
          <AdminTab active={activeTab === "kyc-payouts"} onClick={() => setActiveTab("kyc-payouts")} icon="💸" label="KYC & Payouts" onClose={() => setSidebarOpen(false)} />
          <AdminTab active={activeTab === "composio-hub"} onClick={() => setActiveTab("composio-hub")} icon="🔗" label="Composio Hub" onClose={() => setSidebarOpen(false)} />
          <AdminTab active={activeTab === "composio-obs"} onClick={() => setActiveTab("composio-obs")} icon="🔌" label="Composio Max" onClose={() => setSidebarOpen(false)} />
          <AdminTab active={activeTab === "trypost"} onClick={() => setActiveTab("trypost")} icon="📅" label="TryPost" onClose={() => setSidebarOpen(false)} />
          <AdminTab active={activeTab === "auto-heal"} onClick={() => setActiveTab("auto-heal")} icon="🛡️" label="Auto-Heal" onClose={() => setSidebarOpen(false)} />
          <AdminTab active={activeTab === "renewals-tithe"} onClick={() => setActiveTab("renewals-tithe")} icon="🔄" label="Renewals & Tithe" onClose={() => setSidebarOpen(false)} />
          <AdminTab active={activeTab === "composio-enhance"} onClick={() => setActiveTab("composio-enhance")} icon="🔧" label="Composio Enhance" onClose={() => setSidebarOpen(false)} />
          <AdminTab active={activeTab === "tax-compliance"} onClick={() => setActiveTab("tax-compliance")} icon="📋" label="Tax Compliance" onClose={() => setSidebarOpen(false)} />
          <AdminTab active={activeTab === "enterprise"} onClick={() => setActiveTab("enterprise")} icon="🏢" label="Enterprise Hub" onClose={() => setSidebarOpen(false)} />
          <AdminTab active={activeTab === "enterprise-portal"} onClick={() => setActiveTab("enterprise-portal")} icon="🌐" label="Enterprise Portal" onClose={() => setSidebarOpen(false)} />
          <AdminTab active={activeTab === "mimo"} onClick={() => setActiveTab("mimo")} icon="🧠" label="Mimo V.2.5" onClose={() => setSidebarOpen(false)} />
          <AdminTab active={activeTab === "rapidapi"} onClick={() => setActiveTab("rapidapi")} icon="🔄" label="RapidAPI Fallback" onClose={() => setSidebarOpen(false)} />
          <AdminTab active={activeTab === "revenue"} onClick={() => setActiveTab("revenue")} icon="💰" label="Revenue Hub" onClose={() => setSidebarOpen(false)} />
          <AdminTab active={activeTab === "currency"} onClick={() => setActiveTab("currency")} icon="💱" label="Currency Converter" onClose={() => setSidebarOpen(false)} />
          <AdminTab active={activeTab === "auto-flyer"} onClick={() => setActiveTab("auto-flyer")} icon="🎨" label="Auto Flyer" onClose={() => setSidebarOpen(false)} />
          <AdminTab active={activeTab === "ad-designer"} onClick={() => setActiveTab("ad-designer")} icon="🖼️" label="Ad Designer" onClose={() => setSidebarOpen(false)} />
          <AdminTab active={activeTab === "whatsapp"} onClick={() => setActiveTab("whatsapp")} icon="📱" label="WhatsApp" onClose={() => setSidebarOpen(false)} />
          <AdminTab active={activeTab === "enterprise-payments"} onClick={() => setActiveTab("enterprise-payments")} icon="💳" label="Enterprise Payments" onClose={() => setSidebarOpen(false)} />
          <AdminTab active={activeTab === "payment-analytics"} onClick={() => setActiveTab("payment-analytics")} icon="📊" label="Payment Analytics" onClose={() => setSidebarOpen(false)} />
          <AdminTab active={activeTab === "refunds"} onClick={() => setActiveTab("refunds")} icon="💸" label="Refunds" onClose={() => setSidebarOpen(false)} />
          <AdminTab active={activeTab === "invoices"} onClick={() => setActiveTab("invoices")} icon="🧾" label="Invoices" onClose={() => setSidebarOpen(false)} />
          <AdminTab active={activeTab === "recurring"} onClick={() => setActiveTab("recurring")} icon="🔁" label="Recurring Billing" onClose={() => setSidebarOpen(false)} />
          <AdminTab active={activeTab === "ai-models"} onClick={() => setActiveTab("ai-models")} icon="🤖" label="AI Model Toggle" onClose={() => setSidebarOpen(false)} />
          <AdminTab active={activeTab === "ai-analytics"} onClick={() => setActiveTab("ai-analytics")} icon="📊" label="AI Analytics" onClose={() => setSidebarOpen(false)} />
          <AdminTab active={activeTab === "freellmapi"} onClick={() => setActiveTab("freellmapi")} icon="🆓" label="FreeLLMAPI" onClose={() => setSidebarOpen(false)} />
          <AdminTab active={activeTab === "whatsapp-dual"} onClick={() => setActiveTab("whatsapp-dual")} icon="📱" label="WhatsApp Dual" onClose={() => setSidebarOpen(false)} />
          <AdminTab active={activeTab === "hermes"} onClick={() => setActiveTab("hermes")} icon="🤖" label="Hermes AI" onClose={() => setSidebarOpen(false)} />
          <AdminTab active={activeTab === "support-orch"} onClick={() => setActiveTab("support-orch")} icon="🎧" label="Support Orchestrator" onClose={() => setSidebarOpen(false)} />
          <AdminTab active={activeTab === "predictive"} onClick={() => setActiveTab("predictive")} icon="🔮" label="Predictive Analytics" onClose={() => setSidebarOpen(false)} />
          <AdminTab active={activeTab === "marketing-funnel"} onClick={() => setActiveTab("marketing-funnel")} icon="📧" label="Marketing Funnel" onClose={() => setSidebarOpen(false)} />
          <AdminTab active={activeTab === "voice-video"} onClick={() => setActiveTab("voice-video")} icon="🎬" label="Voice & Video" onClose={() => setSidebarOpen(false)} />
          <AdminTab active={activeTab === "white-label"} onClick={() => setActiveTab("white-label")} icon="🏷️" label="White-Label AI" onClose={() => setSidebarOpen(false)} />
          <AdminTab active={activeTab === "sales-agent"} onClick={() => setActiveTab("sales-agent")} icon="💰" label="AI Sales Agent" onClose={() => setSidebarOpen(false)} />
          <AdminTab active={activeTab === "open-design"} onClick={() => setActiveTab("open-design")} icon="🎨" label="Open Design" onClose={() => setSidebarOpen(false)} />
          <AdminTab active={activeTab === "dynamic-pricing"} onClick={() => setActiveTab("dynamic-pricing")} icon="💲" label="Dynamic Pricing" onClose={() => setSidebarOpen(false)} />
          <AdminTab active={activeTab === "ultimate"} onClick={() => setActiveTab("ultimate")} icon="🚀" label="Ultimate Platform" onClose={() => setSidebarOpen(false)} />
          <AdminTab active={activeTab === "blockchain"} onClick={() => setActiveTab("blockchain")} icon="⛓️" label="Blockchain" onClose={() => setSidebarOpen(false)} />
        </nav>
        <div className="p-4 border-t border-slate-800"><button onClick={handleLogout} className="w-full py-3 bg-red-600/20 hover:bg-red-600/40 text-red-400 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border border-red-500/30">Sign Out</button></div>
      </aside>
      <main className="flex-1 flex flex-col min-h-screen overflow-y-auto">
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
            {activeTab === "payouts" && <DailySweepStatusPanel adminToken={adminToken} />}
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
            {activeTab === "users" && <UserManagementPanel adminToken={adminToken} />}
            {activeTab === "unified-analytics" && <UnifiedAnalyticsPanel />}
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
            {activeTab === "ad-designer" && <AdDesignerPanel adminToken={adminToken} />}
            {activeTab === "whatsapp" && <WhatsAppHub adminToken={adminToken} />}
            {activeTab === "enterprise-payments" && <EnterprisePaymentsReadOnly adminToken={adminToken} />}
            {activeTab === "payment-analytics" && <PaymentAnalyticsPanel adminToken={adminToken} />}
            {activeTab === "refunds" && <RefundsPanel adminToken={adminToken} />}
            {activeTab === "invoices" && <InvoicesPanel adminToken={adminToken} />}
            {activeTab === "recurring" && <RecurringBillingPanel adminToken={adminToken} />}
            {activeTab === "ai-models" && <ModelTogglePanel adminToken={adminToken} />}
            {activeTab === "ai-analytics" && <ModelAnalyticsPanel adminToken={adminToken} />}
            {activeTab === "freellmapi" && <FreeLLMAPIPanel adminToken={adminToken} />}
            {activeTab === "whatsapp-dual" && <WhatsAppDualPanel adminToken={adminToken} />}
            {activeTab === "hermes" && <HermesDashboard adminToken={adminToken} />}
            {activeTab === "support-orch" && <SupportDashboard />}
            {activeTab === "predictive" && <PredictiveAnalyticsPanel />}
            {activeTab === "marketing-funnel" && <MarketingFunnelPanel />}
            {activeTab === "voice-video" && <VoiceVideoPanel />}
            {activeTab === "white-label" && <WhiteLabelPanel adminToken={adminToken} />}
            {activeTab === "sales-agent" && <SalesAgentPanel adminToken={adminToken} />}
            {activeTab === "open-design" && <OpenDesignPanel adminToken={adminToken} />}
            {activeTab === "dynamic-pricing" && <DynamicPricingPanel />}
            {activeTab === "ultimate" && <UltimatePlatformPanel />}
            {activeTab === "blockchain" && <BlockchainPanel />}
          </AdminSuspense>
        </div>
        <Footer />
      </main>
    </div>
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
  const { AgentHealthMatrix } = require("~/components/admin/panels/general-panels");
  return <AgentHealthMatrix data={data} />;
}

function FreelancerPanelLazy() {
  const { data } = useSuspenseQuery(convexQuery(api.admin.getFreelancerOverview, {})) as { data: any };
  return <FreelancerPanel data={data} />;
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
            <span className={`text-[10px] font-black uppercase tracking-widest ${uaeStatus?.type === 'success' ? 'text-emerald-500' : 'text-orange-500'}`}>{uaeStatus?.status}</span>
         </div>
         {upgradeStatus && (<><div className="h-6 w-px bg-slate-800"></div><div className="flex items-center gap-2"><span>{upgradeStatus.statusIndicator}</span><span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{upgradeStatus.currentStatus}</span></div></>)}
      </div>
      <AdminProfileCard profile={adminProfile} adminToken={adminToken} />
    </header>
  );
}
