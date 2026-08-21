import { useState } from "react";
import { useMutation } from "convex/react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { convexQuery } from "@convex-dev/react-query";
import { api } from "../../../convex/_generated/api";
import { StatCard } from "../ui/StatCard";
import { BrandSection } from "./BrandSection";
import { ScheduleSection } from "./ScheduleSection";
import { BulkSection } from "./BulkSection";
import { CarouselSection } from "./CarouselSection";
import { WorkflowsSection } from "./WorkflowsSection";
import { AnalyticsSection } from "./AnalyticsSection";
import { Modals } from "./Modals";
import { TryPostActionsProvider } from "./TryPostActions";

type AdminPanelProps = {
  adminToken: string;
};

export function TryPostScheduler({ adminToken }: AdminPanelProps) {
  const [section, setSection] = useState<"brand" | "schedule" | "bulk" | "carousel" | "workflows" | "analytics">("brand");
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [scheduleModal, setScheduleModal] = useState(false);
  const [carouselModal, setCarouselModal] = useState(false);
  const [bulkModal, setBulkModal] = useState(false);
  const [workflowModal, setWorkflowModal] = useState(false);
  const [brandForm, setBrandForm] = useState({
    brandName: "DutchKem Ventures",
    voice: "Professional",
    toneKeywords: "innovative, reliable, African",
    targetAudience: "African SMEs, entrepreneurs, and developers",
    colorPalette: "#1e3a8a, #f59e0b, #10b981",
    autoHashtags: "#DutchKem, #AfricanTech, #AI",
  });

  const [scheduleForm, setScheduleForm] = useState({
    content: "",
    platforms: ["twitter"] as string[],
    scheduledFor: new Date(Date.now() + 86400000).toISOString().slice(0, 16),
    hashtags: "",
  });

  const [carouselForm, setCarouselForm] = useState({
    topic: "",
    platform: "linkedin",
    slideCount: 5,
    scheduleFor: "",
  });

  const [workflowForm, setWorkflowForm] = useState({
    name: "Daily Briefing",
    description: "Auto-post daily business briefing",
    triggerType: "schedule",
    platforms: ["twitter", "linkedin"] as string[],
    hourSlot: 8,
  });

  const [bulkText, setBulkText] = useState("");

  const showToast = (type: "success" | "error", msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  };

  const { data: platforms } = useSuspenseQuery(convexQuery(api.trypost.getSupportedPlatforms, {}));
  const { data: brandProfile } = useSuspenseQuery(convexQuery(api.trypost.getBrandProfile, { adminToken }));
  const { data: scheduled } = useSuspenseQuery(convexQuery(api.trypost.listScheduledPosts, { adminToken, limit: 50 }));
  const { data: workflows } = useSuspenseQuery(convexQuery(api.trypost.listWorkflows, { adminToken }));
  const { data: carousels } = useSuspenseQuery(convexQuery(api.trypost.listCarousels, { adminToken }));
  const { data: analytics } = useSuspenseQuery(convexQuery(api.trypost.getAnalytics, { adminToken, period: "7d" }));
  const { data: schedule } = useSuspenseQuery(convexQuery(api.trypost.getPostingSchedule, { adminToken }));
  const { data: bestTimes } = useSuspenseQuery(convexQuery(api.trypost.getBestPostingTimes, { adminToken }));
  const { data: trending } = useSuspenseQuery(convexQuery(api.trypost.getTrendingTopics, { adminToken }));
  const { data: templates } = useSuspenseQuery(convexQuery(api.trypost.listTemplates, { adminToken }));
  const { data: media } = useSuspenseQuery(convexQuery(api.trypost.listMedia, { adminToken }));
  const { data: pendingApprovals } = useSuspenseQuery(convexQuery(api.trypost.listPendingApprovals, { adminToken }));
  const { data: categories } = useSuspenseQuery(convexQuery(api.trypost.listCategories, { adminToken }));

  const upsertBrand = useMutation(api.trypost.upsertBrandProfile);
  const cancelPost = useMutation(api.trypost.cancelScheduled);
  const toggleWorkflow = useMutation(api.trypost.toggleWorkflow);
  const { data: exportPosts } = useSuspenseQuery(convexQuery(api.trypost.exportPosts, { adminToken }));

  const [v3Modal, setV3Modal] = useState<null | "caption" | "hashtags" | "besttime" | "media" | "templates" | "trending" | "approvals" | "export">(null);

  const handleSaveBrand = async () => {
    try {
      await upsertBrand({
        adminToken,
        brandName: brandForm.brandName,
        voice: brandForm.voice,
        toneKeywords: brandForm.toneKeywords.split(",").map((s) => s.trim()).filter(Boolean),
        targetAudience: brandForm.targetAudience,
        colorPalette: brandForm.colorPalette.split(",").map((s) => s.trim()).filter(Boolean),
        autoHashtags: brandForm.autoHashtags.split(",").map((s) => s.trim()).filter(Boolean),
      });
      showToast("success", "Brand profile saved");
    } catch (e: any) {
      showToast("error", e?.message ?? "Failed to save brand");
    }
  };

  return (
    <TryPostActionsProvider adminToken={adminToken} showToast={showToast}>
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

      <div className="bg-gradient-to-br from-pink-500/10 to-rose-500/10 border border-pink-500/20 rounded-3xl p-6">
        <h2 className="text-2xl font-black text-white mb-2">📅 TryPost — Dedicated Social Scheduler</h2>
        <p className="text-sm text-slate-300">
          12+ platforms natively • AI carousels • Brand profiles • Bulk uploads • 3x daily automation
        </p>
        {schedule && !schedule.authError && (
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            {schedule.times.map((t: any) => (
              <span key={t.hour} className="px-3 py-1 bg-pink-500/20 text-pink-300 rounded-full font-bold">
                {t.hour.toString().padStart(2, "0")}:00 — {t.label}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Scheduled"
          value={scheduled?.posts?.filter((p: any) => p.status === "scheduled").length ?? 0}
          icon="📅"
          color="indigo"
        />
        <StatCard
          label="Published"
          value={scheduled?.posts?.filter((p: any) => p.status === "published").length ?? 0}
          icon="✅"
          color="emerald"
        />
        <StatCard
          label="Platforms"
          value={platforms?.length ?? 0}
          icon="🌐"
          color="blue"
        />
        <StatCard
          label="Workflows"
          value={workflows?.workflows?.length ?? 0}
          icon="⚙️"
          color="purple"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {[
          { key: "brand" as const, label: "🎨 Brand", color: "pink" },
          { key: "schedule" as const, label: "📅 Posts", color: "indigo" },
          { key: "bulk" as const, label: "📦 Bulk", color: "blue" },
          { key: "carousel" as const, label: "🎠 Carousels", color: "purple" },
          { key: "workflows" as const, label: "⚙️ Workflows", color: "amber" },
          { key: "analytics" as const, label: "📊 Analytics", color: "emerald" },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setSection(t.key)}
            className={`px-4 py-2 rounded-2xl font-bold text-sm transition ${
              section === t.key ? `bg-${t.color}-500 text-white shadow-lg` : "bg-slate-800 text-slate-300 hover:bg-slate-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="bg-slate-900/50 border border-pink-500/20 rounded-3xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-sm font-black text-white">⚡ v3 Tools</span>
          <span className="text-xs text-slate-400">AI + automation</span>
          {pendingApprovals && pendingApprovals.posts && pendingApprovals.posts.length > 0 && (
            <span className="ml-auto px-2 py-1 bg-amber-500 text-white rounded-full text-xs font-bold animate-pulse">
              {pendingApprovals.posts.length} pending approval
            </span>
          )}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2">
          {[
            { key: "caption" as const, label: "✍️ Caption", color: "indigo" },
            { key: "hashtags" as const, label: "#️⃣ Hashtags", color: "purple" },
            { key: "besttime" as const, label: "⏰ Best Time", color: "blue" },
            { key: "trending" as const, label: "🔥 Trending", color: "rose" },
            { key: "media" as const, label: "🖼️ Media", color: "emerald" },
            { key: "templates" as const, label: "📋 Templates", color: "amber" },
            { key: "approvals" as const, label: "✅ Approvals", color: "pink" },
            { key: "export" as const, label: "⬇️ Export", color: "slate" },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setV3Modal(t.key)}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition ${
                v3Modal === t.key ? `bg-${t.color}-500 text-white` : `bg-${t.color}-500/20 text-${t.color}-300 hover:bg-${t.color}-500/30`
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {section === "brand" && (
        <BrandSection
          brandProfile={brandProfile}
          brandForm={brandForm}
          setBrandForm={setBrandForm}
          onSave={handleSaveBrand}
        />
      )}

      {section === "schedule" && (
        <ScheduleSection
          posts={scheduled?.posts ?? []}
          platforms={platforms ?? []}
          onNew={() => setScheduleModal(true)}
          onCancel={async (id) => {
            try {
              await cancelPost({ adminToken, postId: id });
              showToast("success", "Post cancelled");
            } catch (e: any) {
              showToast("error", e?.message ?? "Failed to cancel");
            }
          }}
        />
      )}

      {section === "bulk" && (
        <BulkSection
          onNew={() => setBulkModal(true)}
          platforms={platforms ?? []}
        />
      )}

      {section === "carousel" && (
        <CarouselSection
          carousels={carousels?.carousels ?? []}
          onNew={() => setCarouselModal(true)}
        />
      )}

      {section === "workflows" && (
        <WorkflowsSection
          workflows={workflows?.workflows ?? []}
          onNew={() => setWorkflowModal(true)}
          toggleWorkflow={async (id, active) => {
            try {
              await toggleWorkflow({ adminToken, workflowId: id, active });
              showToast("success", "Workflow updated");
            } catch (e: any) {
              showToast("error", e?.message ?? "Failed to update");
            }
          }}
        />
      )}

      {section === "analytics" && <AnalyticsSection analytics={analytics} />}

      <Modals
        platforms={platforms ?? []}
        scheduleForm={scheduleForm}
        setScheduleForm={setScheduleForm}
        carouselForm={carouselForm}
        setCarouselForm={setCarouselForm}
        bulkText={bulkText}
        setBulkText={setBulkText}
        workflowForm={workflowForm}
        setWorkflowForm={setWorkflowForm}
        scheduleModal={scheduleModal}
        setScheduleModal={setScheduleModal}
        carouselModal={carouselModal}
        setCarouselModal={setCarouselModal}
        bulkModal={bulkModal}
        setBulkModal={setBulkModal}
        workflowModal={workflowModal}
        setWorkflowModal={setWorkflowModal}
        v3Modal={v3Modal}
        setV3Modal={setV3Modal}
        bestTimes={bestTimes}
        trending={trending}
        templates={templates}
        media={media}
        pendingApprovals={pendingApprovals}
        exportPosts={exportPosts}
      />
    </div>
    </TryPostActionsProvider>
  );
}
