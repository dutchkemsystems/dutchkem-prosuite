import { useState } from "react";
import { useAction, useMutation } from "convex/react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { convexQuery } from "@convex-dev/react-query";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { StatCard } from "./ui/StatCard";

type AdminPanelProps = {
  adminToken: string;
};

const VOICES = ["Professional", "Casual", "Witty", "Authoritative", "Friendly", "Inspirational"];
const TIMEZONES = ["Africa/Lagos", "UTC", "America/New_York", "Europe/London", "Asia/Dubai"];

export function TryPostScheduler({ adminToken }: AdminPanelProps) {
  const [section, setSection] = useState<"brand" | "schedule" | "bulk" | "carousel" | "workflows" | "analytics">("brand");
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [scheduleModal, setScheduleModal] = useState(false);
  const [carouselModal, setCarouselModal] = useState(false);
  const [bulkModal, setBulkModal] = useState(false);
  const [workflowModal, setWorkflowModal] = useState(false);
  const [rejectModal, setRejectModal] = useState<{ postId: string; reason: string } | null>(null);

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
  const schedulePost = useMutation(api.trypost.schedulePost);
  const bulkSchedule = useMutation(api.trypost.bulkSchedule);
  const generateCarousel = useAction(api.trypost.generateCarousel);
  const createWorkflow = useMutation(api.trypost.createWorkflow);
  const cancelPost = useMutation(api.trypost.cancelScheduled);
  const toggleWorkflow = useMutation(api.trypost.toggleWorkflow);
  const generateCaption = useAction(api.trypost.generateCaption);
  const suggestHashtags = useAction(api.trypost.suggestHashtags);
  const addMedia = useMutation(api.trypost.addMedia);
  const deleteMedia = useMutation(api.trypost.deleteMedia);
  const createTemplate = useMutation(api.trypost.createTemplate);
  const deleteTemplate = useMutation(api.trypost.deleteTemplate);
  const useTemplate = useMutation(api.trypost.useTemplate);
  const bulkDeletePosts = useMutation(api.trypost.bulkDeletePosts);
  const approvePost = useMutation(api.trypost.approvePost);
  const rejectPost = useMutation(api.trypost.rejectPost);
  const addComment = useMutation(api.trypost.addComment);
  const { data: exportPosts } = useSuspenseQuery(convexQuery(api.trypost.exportPosts, { adminToken }));

  const [v3Modal, setV3Modal] = useState<null | "caption" | "hashtags" | "besttime" | "media" | "templates" | "trending" | "approvals" | "export">(null);
  const [v3Result, setV3Result] = useState<any>(null);
  const [v3Loading, setV3Loading] = useState(false);
  const [v3Form, setV3Form] = useState<any>({
    topic: "",
    platform: "twitter",
    tone: "professional",
    content: "",
    hashtagCount: 10,
    mediaName: "",
    mediaUrl: "",
    mediaType: "image",
    templateName: "",
    templateContent: "",
    templateCategory: "",
    rejectReason: "",
    selectedPosts: [] as string[],
  });

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

  const handleSchedule = async () => {
    if (!scheduleForm.content.trim()) {
      showToast("error", "Content is required");
      return;
    }
    if (scheduleForm.platforms.length === 0) {
      showToast("error", "Select at least one platform");
      return;
    }
    try {
      await schedulePost({
        adminToken,
        content: scheduleForm.content,
        platforms: scheduleForm.platforms,
        scheduledFor: new Date(scheduleForm.scheduledFor).getTime(),
        hashtags: scheduleForm.hashtags.split(/[\s,]+/).filter(Boolean),
      });
      showToast("success", `Post scheduled to ${scheduleForm.platforms.length} platform(s)`);
      setScheduleModal(false);
      setScheduleForm({ ...scheduleForm, content: "" });
    } catch (e: any) {
      showToast("error", e?.message ?? "Failed to schedule");
    }
  };

  const handleBulkSchedule = async () => {
    try {
      const lines = bulkText.trim().split("\n").filter(Boolean);
      const posts = lines.map((line) => {
        const [content, platformStr, timeStr, ...rest] = line.split("|").map((s) => s.trim());
        return {
          content,
          platforms: (platformStr || "twitter").split(",").map((s) => s.trim()),
          scheduledFor: timeStr ? new Date(timeStr).getTime() : Date.now() + 60000,
          hashtags: rest.join("|").split(/[\s,]+/).filter(Boolean),
        };
      });
      const result = await bulkSchedule({ adminToken, posts });
      showToast("success", `Scheduled ${result.scheduled} posts (${result.failed} failed)`);
      setBulkModal(false);
      setBulkText("");
    } catch (e: any) {
      showToast("error", e?.message ?? "Bulk schedule failed");
    }
  };

  const handleGenerateCarousel = async () => {
    if (!carouselForm.topic) {
      showToast("error", "Topic is required");
      return;
    }
    try {
      const result = await generateCarousel({
        adminToken,
        topic: carouselForm.topic,
        platform: carouselForm.platform,
        slideCount: carouselForm.slideCount,
        scheduleFor: carouselForm.scheduleFor ? new Date(carouselForm.scheduleFor).getTime() : undefined,
      });
      showToast("success", `Generated ${result.slideCount}-slide carousel`);
      setCarouselModal(false);
    } catch (e: any) {
      showToast("error", e?.message ?? "Carousel generation failed");
    }
  };

  const handleCreateWorkflow = async () => {
    try {
      await createWorkflow({
        adminToken,
        name: workflowForm.name,
        description: workflowForm.description,
        triggerType: workflowForm.triggerType,
        triggerConfig: { hourSlot: workflowForm.hourSlot },
        steps: [{ type: "post", template: workflowForm.description }],
        platforms: workflowForm.platforms,
      });
      showToast("success", `Workflow "${workflowForm.name}" created`);
      setWorkflowModal(false);
    } catch (e: any) {
      showToast("error", e?.message ?? "Workflow creation failed");
    }
  };

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
              onClick={() => { setV3Modal(t.key); setV3Result(null); }}
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

      {scheduleModal && (
        <Modal title="📅 Schedule New Post" onClose={() => setScheduleModal(false)}>
          <div className="space-y-3">
            <textarea
              placeholder="What's on your mind?"
              value={scheduleForm.content}
              onChange={(e) => setScheduleForm({ ...scheduleForm, content: e.target.value })}
              className="w-full bg-slate-800 text-white rounded-xl px-3 py-2 text-sm"
              rows={4}
            />
            <div>
              <label className="text-xs text-slate-400 font-bold mb-1 block">Platforms</label>
              <div className="flex flex-wrap gap-2">
                {(platforms ?? []).map((p: any) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      const set = new Set(scheduleForm.platforms);
                      if (set.has(p.id)) set.delete(p.id);
                      else set.add(p.id);
                      setScheduleForm({ ...scheduleForm, platforms: Array.from(set) });
                    }}
                    className={`px-3 py-1 rounded-full text-xs font-bold ${
                      scheduleForm.platforms.includes(p.id)
                        ? "bg-indigo-500 text-white"
                        : "bg-slate-700 text-slate-300"
                    }`}
                  >
                    {p.icon} {p.name}
                  </button>
                ))}
              </div>
            </div>
            <input
              type="datetime-local"
              value={scheduleForm.scheduledFor}
              onChange={(e) => setScheduleForm({ ...scheduleForm, scheduledFor: e.target.value })}
              className="w-full bg-slate-800 text-white rounded-xl px-3 py-2 text-sm"
            />
            <input
              placeholder="Hashtags (space or comma separated)"
              value={scheduleForm.hashtags}
              onChange={(e) => setScheduleForm({ ...scheduleForm, hashtags: e.target.value })}
              className="w-full bg-slate-800 text-white rounded-xl px-3 py-2 text-sm"
            />
            <button
              onClick={handleSchedule}
              className="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-bold py-2 rounded-xl"
            >
              Schedule Post
            </button>
          </div>
        </Modal>
      )}

      {carouselModal && (
        <Modal title="🎠 Generate AI Carousel" onClose={() => setCarouselModal(false)}>
          <div className="space-y-3">
            <input
              placeholder="Carousel topic (e.g., '5 Tips for SME Growth')"
              value={carouselForm.topic}
              onChange={(e) => setCarouselForm({ ...carouselForm, topic: e.target.value })}
              className="w-full bg-slate-800 text-white rounded-xl px-3 py-2 text-sm"
            />
            <select
              value={carouselForm.platform}
              onChange={(e) => setCarouselForm({ ...carouselForm, platform: e.target.value })}
              className="w-full bg-slate-800 text-white rounded-xl px-3 py-2 text-sm"
            >
              {(platforms ?? []).filter((p: any) => p.supportsCarousel).map((p: any) => (
                <option key={p.id} value={p.id}>
                  {p.icon} {p.name}
                </option>
              ))}
            </select>
            <input
              type="number"
              min="2"
              max="10"
              value={carouselForm.slideCount}
              onChange={(e) => setCarouselForm({ ...carouselForm, slideCount: parseInt(e.target.value) || 5 })}
              className="w-full bg-slate-800 text-white rounded-xl px-3 py-2 text-sm"
              placeholder="Number of slides (2-10)"
            />
            <input
              type="datetime-local"
              value={carouselForm.scheduleFor}
              onChange={(e) => setCarouselForm({ ...carouselForm, scheduleFor: e.target.value })}
              className="w-full bg-slate-800 text-white rounded-xl px-3 py-2 text-sm"
            />
            <p className="text-xs text-slate-400">Leave schedule empty to generate without auto-posting</p>
            <button
              onClick={handleGenerateCarousel}
              className="w-full bg-purple-500 hover:bg-purple-600 text-white font-bold py-2 rounded-xl"
            >
              Generate Carousel
            </button>
          </div>
        </Modal>
      )}

      {bulkModal && (
        <Modal title="📦 Bulk Schedule Posts" onClose={() => setBulkModal(false)}>
          <div className="space-y-3">
            <p className="text-xs text-slate-400">
              Format per line: <code>content | platforms | ISO time | hashtags</code>
            </p>
            <textarea
              placeholder="🚀 Excited to announce our new AI platform! | twitter,linkedin | 2026-06-10T09:00 | #Launch #AI"
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
              className="w-full bg-slate-800 text-white rounded-xl px-3 py-2 text-sm font-mono"
              rows={8}
            />
            <button
              onClick={handleBulkSchedule}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 rounded-xl"
            >
              Schedule All
            </button>
          </div>
        </Modal>
      )}

      {workflowModal && (
        <Modal title="⚙️ New Automated Workflow" onClose={() => setWorkflowModal(false)}>
          <div className="space-y-3">
            <input
              placeholder="Workflow Name"
              value={workflowForm.name}
              onChange={(e) => setWorkflowForm({ ...workflowForm, name: e.target.value })}
              className="w-full bg-slate-800 text-white rounded-xl px-3 py-2 text-sm"
            />
            <textarea
              placeholder="Description (used as post template)"
              value={workflowForm.description}
              onChange={(e) => setWorkflowForm({ ...workflowForm, description: e.target.value })}
              className="w-full bg-slate-800 text-white rounded-xl px-3 py-2 text-sm"
              rows={2}
            />
            <select
              value={workflowForm.triggerType}
              onChange={(e) => setWorkflowForm({ ...workflowForm, triggerType: e.target.value })}
              className="w-full bg-slate-800 text-white rounded-xl px-3 py-2 text-sm"
            >
              <option value="schedule">Scheduled (recurring)</option>
              <option value="blog-published">Blog Published</option>
              <option value="agent-completed">Agent Completed</option>
              <option value="manual">Manual</option>
            </select>
            {workflowForm.triggerType === "schedule" && (
              <select
                value={workflowForm.hourSlot}
                onChange={(e) => setWorkflowForm({ ...workflowForm, hourSlot: parseInt(e.target.value) })}
                className="w-full bg-slate-800 text-white rounded-xl px-3 py-2 text-sm"
              >
                <option value={8}>8:00 AM — Morning Briefing</option>
                <option value={12}>12:00 PM — Midday Update</option>
                <option value={18}>6:00 PM — Evening Wrap</option>
              </select>
            )}
            <div>
              <label className="text-xs text-slate-400 font-bold mb-1 block">Target Platforms</label>
              <div className="flex flex-wrap gap-2">
                {(platforms ?? []).map((p: any) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      const set = new Set(workflowForm.platforms);
                      if (set.has(p.id)) set.delete(p.id);
                      else set.add(p.id);
                      setWorkflowForm({ ...workflowForm, platforms: Array.from(set) });
                    }}
                    className={`px-2 py-1 rounded-full text-xs font-bold ${
                      workflowForm.platforms.includes(p.id)
                        ? "bg-amber-500 text-white"
                        : "bg-slate-700 text-slate-300"
                    }`}
                  >
                    {p.icon} {p.name}
                  </button>
                ))}
              </div>
            </div>
            <button
              onClick={handleCreateWorkflow}
              className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-2 rounded-xl"
            >
              Create Workflow
            </button>
          </div>
        </Modal>
      )}

      {v3Modal === "caption" && (
        <Modal title="✍️ AI Caption Generator" onClose={() => setV3Modal(null)}>
          <div className="space-y-3">
            <input
              placeholder="Topic (e.g. New AI feature launch)"
              value={v3Form.topic}
              onChange={(e) => setV3Form({ ...v3Form, topic: e.target.value })}
              className="w-full bg-slate-800 text-white rounded-xl px-3 py-2 text-sm"
            />
            <select
              value={v3Form.platform}
              onChange={(e) => setV3Form({ ...v3Form, platform: e.target.value })}
              className="w-full bg-slate-800 text-white rounded-xl px-3 py-2 text-sm"
            >
              {(platforms ?? []).map((p: any) => (
                <option key={p.id} value={p.id}>{p.icon} {p.name}</option>
              ))}
            </select>
            <select
              value={v3Form.tone}
              onChange={(e) => setV3Form({ ...v3Form, tone: e.target.value })}
              className="w-full bg-slate-800 text-white rounded-xl px-3 py-2 text-sm"
            >
              {VOICES.map((v) => (
                <option key={v} value={v.toLowerCase()}>{v}</option>
              ))}
            </select>
            <button
              onClick={async () => {
                if (!v3Form.topic) { showToast("error", "Topic is required"); return; }
                setV3Loading(true);
                try {
                  const res = await generateCaption({ adminToken, topic: v3Form.topic, platform: v3Form.platform, tone: v3Form.tone });
                  if (res?.authError) { showToast("error", "Auth failed"); }
                  else { setV3Result(res); showToast("success", `Caption generated (${res.charCount} chars)`); }
                } catch (e: any) { showToast("error", e?.message ?? "Failed"); }
                finally { setV3Loading(false); }
              }}
              disabled={v3Loading}
              className="w-full bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white font-bold py-2 rounded-xl"
            >
              {v3Loading ? "Generating..." : "Generate Caption"}
            </button>
            {v3Result && (
              <div className="space-y-2">
                <div className="bg-slate-800 rounded-xl p-3 text-sm text-white whitespace-pre-wrap">{v3Result.caption}</div>
                {v3Result.hashtags?.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {v3Result.hashtags.map((h: string, i: number) => (
                      <span key={i} className="px-2 py-1 bg-indigo-500/20 text-indigo-300 rounded-full text-xs">{h}</span>
                    ))}
                  </div>
                )}
                <div className="text-xs text-slate-400">
                  {v3Result.charCount}/{v3Result.charLimit} chars · {v3Result.withinLimit ? "✅ Fits" : "❌ Too long"} · via {v3Result.source}
                </div>
                <button
                  onClick={() => {
                    setScheduleForm({ ...scheduleForm, content: v3Result.caption, hashtags: v3Result.hashtags?.join(" ") ?? "", platforms: [v3Form.platform] });
                    setScheduleModal(true);
                    setV3Modal(null);
                  }}
                  className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-2 rounded-xl text-sm"
                >
                  Use in Post →
                </button>
              </div>
            )}
          </div>
        </Modal>
      )}

      {v3Modal === "hashtags" && (
        <Modal title="#️⃣ Hashtag Suggester" onClose={() => setV3Modal(null)}>
          <div className="space-y-3">
            <textarea
              placeholder="Paste your post content here..."
              value={v3Form.content}
              onChange={(e) => setV3Form({ ...v3Form, content: e.target.value })}
              className="w-full bg-slate-800 text-white rounded-xl px-3 py-2 text-sm"
              rows={4}
            />
            <div className="flex gap-2">
              <select
                value={v3Form.platform}
                onChange={(e) => setV3Form({ ...v3Form, platform: e.target.value })}
                className="flex-1 bg-slate-800 text-white rounded-xl px-3 py-2 text-sm"
              >
                {(platforms ?? []).map((p: any) => (
                  <option key={p.id} value={p.id}>{p.icon} {p.name}</option>
                ))}
              </select>
              <input
                type="number"
                min={5}
                max={30}
                value={v3Form.hashtagCount}
                onChange={(e) => setV3Form({ ...v3Form, hashtagCount: parseInt(e.target.value) || 10 })}
                className="w-20 bg-slate-800 text-white rounded-xl px-3 py-2 text-sm"
              />
            </div>
            <button
              onClick={async () => {
                if (!v3Form.content) { showToast("error", "Content is required"); return; }
                setV3Loading(true);
                try {
                  const res = await suggestHashtags({ adminToken, content: v3Form.content, platform: v3Form.platform, count: v3Form.hashtagCount });
                  if (res?.authError) { showToast("error", "Auth failed"); }
                  else { setV3Result(res); showToast("success", `${res.count} hashtags suggested`); }
                } catch (e: any) { showToast("error", e?.message ?? "Failed"); }
                finally { setV3Loading(false); }
              }}
              disabled={v3Loading}
              className="w-full bg-purple-500 hover:bg-purple-600 disabled:opacity-50 text-white font-bold py-2 rounded-xl"
            >
              {v3Loading ? "Suggesting..." : "Suggest Hashtags"}
            </button>
            {v3Result && v3Result.hashtags && (
              <div className="space-y-2">
                <div className="flex flex-wrap gap-1">
                  {v3Result.hashtags.map((h: string, i: number) => (
                    <span key={i} className="px-2 py-1 bg-purple-500/20 text-purple-300 rounded-full text-xs">{h}</span>
                  ))}
                </div>
                <button
                  onClick={() => {
                    setScheduleForm({ ...scheduleForm, hashtags: v3Result.hashtags.join(" ") });
                    setV3Modal(null);
                    showToast("success", "Hashtags copied to post form");
                  }}
                  className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-2 rounded-xl text-sm"
                >
                  Use in Post →
                </button>
              </div>
            )}
          </div>
        </Modal>
      )}

      {v3Modal === "besttime" && (
        <Modal title="⏰ Best Times to Post" onClose={() => setV3Modal(null)}>
          <div className="space-y-4">
            <p className="text-xs text-slate-400">Recommended posting hours (WAT) by platform — based on audience engagement data.</p>
            {bestTimes && !bestTimes.authError && Object.entries(bestTimes.times).map(([platform, hours]: [string, any]) => (
              <div key={platform} className="bg-slate-800/50 rounded-xl p-3">
                <div className="text-sm font-bold text-white mb-2 capitalize">{platform}</div>
                <div className="flex flex-wrap gap-1">
                  {(hours ?? []).map((h: number) => (
                    <span key={h} className="px-2 py-1 bg-blue-500/20 text-blue-300 rounded-lg text-xs font-mono">
                      {h.toString().padStart(2, "0")}:00
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Modal>
      )}

      {v3Modal === "trending" && (
        <Modal title="🔥 Trending Topics" onClose={() => setV3Modal(null)}>
          <div className="space-y-3">
            <p className="text-xs text-slate-400">Curated trending topics — click to use as post inspiration.</p>
            {trending && !trending.authError && trending.topics.map((t: any, i: number) => (
              <div
                key={i}
                className="bg-slate-800/50 border border-slate-700 rounded-xl p-3 hover:border-rose-500/50 transition cursor-pointer"
                onClick={() => {
                  setV3Form({ ...v3Form, topic: t.topic });
                  setV3Modal("caption");
                }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-bold text-white">{t.topic}</div>
                    <div className="text-xs text-slate-400 capitalize">{t.category}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-black text-rose-300">{t.score}</div>
                    <div className="text-[9px] text-slate-500">score</div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1 mt-2">
                  {t.hashtags.map((h: string, j: number) => (
                    <span key={j} className="px-1.5 py-0.5 bg-rose-500/20 text-rose-300 rounded text-[9px]">{h}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Modal>
      )}

      {v3Modal === "media" && (
        <Modal title="🖼️ Media Library" onClose={() => setV3Modal(null)}>
          <div className="space-y-3">
            <div className="flex gap-2">
              <input
                placeholder="Media name"
                value={v3Form.mediaName}
                onChange={(e) => setV3Form({ ...v3Form, mediaName: e.target.value })}
                className="flex-1 bg-slate-800 text-white rounded-xl px-3 py-2 text-sm"
              />
              <select
                value={v3Form.mediaType}
                onChange={(e) => setV3Form({ ...v3Form, mediaType: e.target.value })}
                className="w-28 bg-slate-800 text-white rounded-xl px-3 py-2 text-sm"
              >
                <option value="image">Image</option>
                <option value="video">Video</option>
                <option value="gif">GIF</option>
              </select>
            </div>
            <input
              placeholder="URL (https://...)"
              value={v3Form.mediaUrl}
              onChange={(e) => setV3Form({ ...v3Form, mediaUrl: e.target.value })}
              className="w-full bg-slate-800 text-white rounded-xl px-3 py-2 text-sm"
            />
            <button
              onClick={async () => {
                if (!v3Form.mediaName || !v3Form.mediaUrl) { showToast("error", "Name and URL required"); return; }
                try {
                  await addMedia({ adminToken, name: v3Form.mediaName, url: v3Form.mediaUrl, type: v3Form.mediaType as any });
                  showToast("success", "Media added");
                  setV3Form({ ...v3Form, mediaName: "", mediaUrl: "" });
                } catch (e: any) { showToast("error", e?.message ?? "Failed"); }
              }}
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-2 rounded-xl text-sm"
            >
              Add to Library
            </button>
            {media && media.media && media.media.length > 0 && (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {media.media.map((m: any) => (
                  <div key={m._id} className="flex items-center justify-between bg-slate-800/50 rounded-xl px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{m.type === "image" ? "🖼️" : m.type === "video" ? "🎬" : "🎞️"}</span>
                      <div>
                        <div className="text-xs text-white font-bold">{m.name}</div>
                        <div className="text-[10px] text-slate-400 truncate max-w-48">{m.url}</div>
                      </div>
                    </div>
                    <button
                      onClick={async () => {
                        try { await deleteMedia({ adminToken, mediaId: m._id }); showToast("success", "Deleted"); }
                        catch (e: any) { showToast("error", e?.message ?? "Failed"); }
                      }}
                      className="text-xs text-rose-400 hover:text-rose-300 font-bold"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Modal>
      )}

      {v3Modal === "templates" && (
        <Modal title="📋 Post Templates" onClose={() => setV3Modal(null)}>
          <div className="space-y-3">
            <input
              placeholder="Template name"
              value={v3Form.templateName}
              onChange={(e) => setV3Form({ ...v3Form, templateName: e.target.value })}
              className="w-full bg-slate-800 text-white rounded-xl px-3 py-2 text-sm"
            />
            <input
              placeholder="Category (announcement, promo, education...)"
              value={v3Form.templateCategory}
              onChange={(e) => setV3Form({ ...v3Form, templateCategory: e.target.value })}
              className="w-full bg-slate-800 text-white rounded-xl px-3 py-2 text-sm"
            />
            <textarea
              placeholder="Template content (use {{variable}} for dynamic values)"
              value={v3Form.templateContent}
              onChange={(e) => setV3Form({ ...v3Form, templateContent: e.target.value })}
              className="w-full bg-slate-800 text-white rounded-xl px-3 py-2 text-sm"
              rows={4}
            />
            <button
              onClick={async () => {
                if (!v3Form.templateName || !v3Form.templateContent) { showToast("error", "Name and content required"); return; }
                try {
                  await createTemplate({ adminToken, name: v3Form.templateName, content: v3Form.templateContent, category: v3Form.templateCategory || undefined });
                  showToast("success", "Template created");
                  setV3Form({ ...v3Form, templateName: "", templateContent: "", templateCategory: "" });
                } catch (e: any) { showToast("error", e?.message ?? "Failed"); }
              }}
              className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-2 rounded-xl text-sm"
            >
              Create Template
            </button>
            {templates && templates.templates && templates.templates.length > 0 && (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {templates.templates.map((t: any) => (
                  <div key={t._id} className="bg-slate-800/50 rounded-xl p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-xs text-white font-bold">{t.name}</div>
                        <div className="text-[10px] text-slate-400">{t.category ?? "uncategorized"} · used {t.useCount}×</div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={async () => {
                            try {
                              const res = await useTemplate({ adminToken, templateId: t._id });
                              if (res?.template) {
                                setScheduleForm({ ...scheduleForm, content: res.template.content, hashtags: (res.template.hashtags ?? []).join(" ") });
                                setScheduleModal(true);
                                setV3Modal(null);
                              }
                            } catch (e: any) { showToast("error", e?.message ?? "Failed"); }
                          }}
                          className="text-xs text-emerald-400 hover:text-emerald-300 font-bold"
                        >
                          Use
                        </button>
                        <button
                          onClick={async () => {
                            try { await deleteTemplate({ adminToken, templateId: t._id }); showToast("success", "Deleted"); }
                            catch (e: any) { showToast("error", e?.message ?? "Failed"); }
                          }}
                          className="text-xs text-rose-400 hover:text-rose-300 font-bold"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1 truncate">{t.content.slice(0, 100)}...</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Modal>
      )}

      {v3Modal === "approvals" && (
        <Modal title="✅ Pending Approvals" onClose={() => setV3Modal(null)}>
          <div className="space-y-3">
            {!pendingApprovals || pendingApprovals.posts.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <div className="text-3xl mb-2">✅</div>
                <div className="text-sm">No posts pending approval</div>
              </div>
            ) : (
              pendingApprovals.posts.map((p: any) => (
                <div key={p._id} className="bg-slate-800/50 border border-amber-500/20 rounded-xl p-3 space-y-2">
                  <div className="text-xs text-white font-bold truncate">{p.content.slice(0, 120)}...</div>
                  <div className="flex flex-wrap gap-1">
                    {(p.platforms ?? []).map((plat: string) => (
                      <span key={plat} className="px-1.5 py-0.5 bg-slate-700 text-slate-300 rounded text-[9px]">{plat}</span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={async () => {
                        try { await approvePost({ adminToken, postId: p._id }); showToast("success", "Approved"); }
                        catch (e: any) { showToast("error", e?.message ?? "Failed"); }
                      }}
                      className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-1.5 rounded-lg text-xs"
                    >
                      ✓ Approve
                    </button>
                    <button
                      onClick={() => setRejectModal({ postId: p._id, reason: '' })}
                      className="flex-1 bg-rose-500 hover:bg-rose-600 text-white font-bold py-1.5 rounded-lg text-xs"
                    >
                      ✕ Reject
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </Modal>
      )}

      {rejectModal && (
        <Modal title="❌ Reject Post" onClose={() => setRejectModal(null)}>
          <div className="space-y-3">
            <div className="text-xs text-slate-400">Post ID: {rejectModal.postId}</div>
            <textarea
              value={rejectModal.reason}
              onChange={(e) => setRejectModal({ ...rejectModal, reason: e.target.value })}
              placeholder="Reason for rejection..."
              className="w-full bg-slate-800 text-white rounded-xl px-3 py-2 text-sm"
              rows={3}
            />
            <div className="flex gap-2">
              <button
                onClick={() => setRejectModal(null)}
                className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-bold py-2 rounded-xl text-sm"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (!rejectModal.reason) { showToast("error", "Reason required"); return; }
                  try {
                    await rejectPost({ adminToken, postId: rejectModal.postId, reason: rejectModal.reason });
                    showToast("success", "Rejected");
                    setRejectModal(null);
                  } catch (e: any) { showToast("error", e?.message ?? "Failed"); }
                }}
                className="flex-1 bg-rose-500 hover:bg-rose-600 text-white font-bold py-2 rounded-xl text-sm"
              >
                Confirm Reject
              </button>
            </div>
          </div>
        </Modal>
      )}

      {v3Modal === "export" && (
        <Modal title="⬇️ Export Posts (CSV)" onClose={() => setV3Modal(null)}>
          <div className="space-y-3">
            {exportPosts && !exportPosts.authError ? (
              <>
                <div className="text-xs text-slate-400">{exportPosts.count} posts exported</div>
                <textarea
                  readOnly
                  value={exportPosts.csv}
                  className="w-full bg-slate-800 text-emerald-300 rounded-xl px-3 py-2 text-xs font-mono"
                  rows={12}
                />
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(exportPosts.csv);
                    showToast("success", "CSV copied to clipboard");
                  }}
                  className="w-full bg-slate-700 hover:bg-slate-600 text-white font-bold py-2 rounded-xl text-sm"
                >
                  Copy to Clipboard
                </button>
                <button
                  onClick={() => {
                    const blob = new Blob([exportPosts.csv], { type: "text/csv" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `trypost-export-${new Date().toISOString().slice(0, 10)}.csv`;
                    a.click();
                    URL.revokeObjectURL(url);
                    showToast("success", "Downloaded");
                  }}
                  className="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-bold py-2 rounded-xl text-sm"
                >
                  Download CSV
                </button>
              </>
            ) : (
              <div className="text-center py-8 text-slate-400">
                <div className="text-3xl mb-2">📊</div>
                <div className="text-sm">No posts to export</div>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}

function BrandSection({
  brandProfile,
  brandForm,
  setBrandForm,
  onSave,
}: {
  brandProfile: any;
  brandForm: any;
  setBrandForm: (f: any) => void;
  onSave: () => void;
}) {
  const profile = brandProfile?.profile;
  return (
    <div className="bg-slate-900/50 border border-slate-700 rounded-3xl p-6 space-y-4">
      <h3 className="text-lg font-bold text-white">🎨 Brand Profile</h3>
      {profile && (
        <div className="text-xs text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-2">
          ✓ Profile active (last updated {new Date(profile.updatedAt).toLocaleDateString()})
        </div>
      )}
      <div>
        <label className="text-xs text-slate-400 font-bold mb-1 block">Brand Name</label>
        <input
          value={brandForm.brandName}
          onChange={(e) => setBrandForm({ ...brandForm, brandName: e.target.value })}
          className="w-full bg-slate-800 text-white rounded-xl px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="text-xs text-slate-400 font-bold mb-1 block">Voice</label>
        <select
          value={brandForm.voice}
          onChange={(e) => setBrandForm({ ...brandForm, voice: e.target.value })}
          className="w-full bg-slate-800 text-white rounded-xl px-3 py-2 text-sm"
        >
          {VOICES.map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="text-xs text-slate-400 font-bold mb-1 block">Tone Keywords (comma-separated)</label>
        <input
          value={brandForm.toneKeywords}
          onChange={(e) => setBrandForm({ ...brandForm, toneKeywords: e.target.value })}
          className="w-full bg-slate-800 text-white rounded-xl px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="text-xs text-slate-400 font-bold mb-1 block">Target Audience</label>
        <textarea
          value={brandForm.targetAudience}
          onChange={(e) => setBrandForm({ ...brandForm, targetAudience: e.target.value })}
          className="w-full bg-slate-800 text-white rounded-xl px-3 py-2 text-sm"
          rows={2}
        />
      </div>
      <div>
        <label className="text-xs text-slate-400 font-bold mb-1 block">Color Palette (hex, comma-separated)</label>
        <input
          value={brandForm.colorPalette}
          onChange={(e) => setBrandForm({ ...brandForm, colorPalette: e.target.value })}
          className="w-full bg-slate-800 text-white rounded-xl px-3 py-2 text-sm font-mono"
        />
      </div>
      <div>
        <label className="text-xs text-slate-400 font-bold mb-1 block">Auto Hashtags (comma-separated)</label>
        <input
          value={brandForm.autoHashtags}
          onChange={(e) => setBrandForm({ ...brandForm, autoHashtags: e.target.value })}
          className="w-full bg-slate-800 text-white rounded-xl px-3 py-2 text-sm"
        />
      </div>
      <button
        onClick={onSave}
        className="w-full bg-pink-500 hover:bg-pink-600 text-white font-bold py-2 rounded-xl"
      >
        Save Brand Profile
      </button>
    </div>
  );
}

function ScheduleSection({
  posts,
  platforms,
  onNew,
  onCancel,
}: {
  posts: any[];
  platforms: any[];
  onNew: () => void;
  onCancel: (id: Id<"trypost_scheduled_posts">) => void;
}) {
  return (
    <>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-white">📅 Scheduled Posts ({posts.length})</h3>
        <button
          onClick={onNew}
          className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-2xl font-bold text-sm"
        >
          + New Post
        </button>
      </div>
      {posts.length === 0 ? (
        <div className="bg-slate-900/30 border border-slate-700 rounded-3xl p-8 text-center text-slate-400">
          No posts scheduled yet.
        </div>
      ) : (
        <div className="space-y-2">
          {posts.map((p) => (
            <div key={p._id} className="bg-slate-900/50 border border-slate-700 rounded-2xl p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-white line-clamp-2">{p.content}</div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {p.platforms.map((pl: string) => {
                      const meta = platforms.find((x: any) => x.id === pl);
                      return (
                        <span
                          key={pl}
                          className="text-xs px-2 py-0.5 bg-slate-700 text-slate-300 rounded-full"
                        >
                          {meta?.icon ?? "🌐"} {pl}
                        </span>
                      );
                    })}
                  </div>
                  <div className="text-xs text-slate-500 mt-2">
                    {p.status === "scheduled" && `⏰ ${new Date(p.scheduledFor).toLocaleString()}`}
                    {p.status === "published" && `✅ Published ${new Date(p.publishedAt).toLocaleString()}`}
                    {p.status === "failed" && `❌ ${p.errorMessage}`}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span
                    className={`text-xs px-2 py-1 rounded-full font-bold ${
                      p.status === "scheduled"
                        ? "bg-indigo-500/20 text-indigo-300"
                        : p.status === "published"
                        ? "bg-emerald-500/20 text-emerald-300"
                        : p.status === "failed"
                        ? "bg-rose-500/20 text-rose-300"
                        : "bg-slate-700 text-slate-400"
                    }`}
                  >
                    {p.status}
                  </span>
                  {p.status === "scheduled" && (
                    <button
                      onClick={() => onCancel(p._id)}
                      className="text-xs text-rose-400 hover:text-rose-300"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function BulkSection({ onNew, platforms }: { onNew: () => void; platforms: any[] }) {
  return (
    <>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-white">📦 Bulk Upload</h3>
        <button
          onClick={onNew}
          className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-2xl font-bold text-sm"
        >
          + New Bulk Upload
        </button>
      </div>
      <div className="bg-slate-900/50 border border-slate-700 rounded-3xl p-6">
        <h4 className="font-bold text-white mb-3">Format</h4>
        <p className="text-sm text-slate-300 mb-3">
          One post per line in pipe-separated format. Available platforms:{" "}
          {(platforms ?? []).map((p: any) => p.id).join(", ")}
        </p>
        <pre className="bg-slate-950/50 rounded-xl p-3 text-xs text-emerald-300 overflow-x-auto">{`Content | platforms | ISO time | hashtags
🚀 New product launch! | twitter,linkedin | 2026-06-10T09:00 | #Launch,#AI
Weekly tip: Always... | twitter | 2026-06-11T08:00 | #Tips`}</pre>
      </div>
    </>
  );
}

function CarouselSection({ carousels, onNew }: { carousels: any[]; onNew: () => void }) {
  return (
    <>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-white">🎠 AI-Generated Carousels ({carousels.length})</h3>
        <button
          onClick={onNew}
          className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-2xl font-bold text-sm"
        >
          + Generate New
        </button>
      </div>
      {carousels.length === 0 ? (
        <div className="bg-slate-900/30 border border-slate-700 rounded-3xl p-8 text-center text-slate-400">
          No carousels yet. Generate one with AI.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {carousels.map((c) => (
            <div key={c._id} className="bg-slate-900/50 border border-slate-700 rounded-2xl p-4">
              <div className="text-sm text-white font-bold">{c.topic}</div>
              <div className="text-xs text-slate-400 mt-1">
                {c.platform} • {c.slides?.length ?? 0} slides • {c.status}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function WorkflowsSection({
  workflows,
  onNew,
  toggleWorkflow,
}: {
  workflows: any[];
  onNew: () => void;
  toggleWorkflow: (id: Id<"trypost_workflows">, active: boolean) => void;
}) {
  return (
    <>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-white">⚙️ Automated Workflows ({workflows.length})</h3>
        <button
          onClick={onNew}
          className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-2xl font-bold text-sm"
        >
          + New Workflow
        </button>
      </div>
      {workflows.length === 0 ? (
        <div className="bg-slate-900/30 border border-slate-700 rounded-3xl p-8 text-center text-slate-400">
          No workflows configured. Create one to automate posting.
        </div>
      ) : (
        <div className="space-y-2">
          {workflows.map((w) => (
            <div key={w._id} className="bg-slate-900/50 border border-slate-700 rounded-2xl p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="text-sm text-white font-bold">{w.name}</div>
                  <div className="text-xs text-slate-400 mt-1">
                    {w.triggerType} • {w.platforms.length} platforms • Run {w.runCount}x
                  </div>
                </div>
                <button
                  onClick={() => toggleWorkflow(w._id, !w.active)}
                  className={`px-3 py-1 rounded text-xs font-bold ${
                    w.active ? "bg-emerald-500 text-white" : "bg-slate-700 text-slate-400"
                  }`}
                >
                  {w.active ? "ON" : "OFF"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function AnalyticsSection({ analytics }: { analytics: any }) {
  if (!analytics || analytics.authError) {
    return (
      <div className="bg-slate-900/30 border border-slate-700 rounded-3xl p-8 text-center text-slate-400">
        No analytics available yet.
      </div>
    );
  }
  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Published" value={analytics.summary?.postsPublished ?? 0} icon="📅" color="emerald" />
        <StatCard label="Impressions" value={analytics.summary?.totalImpressions ?? 0} icon="👁️" color="blue" />
        <StatCard label="Engagement" value={analytics.summary?.totalEngagement ?? 0} icon="💬" color="purple" />
        <StatCard
          label="Engagement Rate"
          value={`${(analytics.summary?.engagementRate ?? 0).toFixed(1)}%`}
          icon="📈"
          color="amber"
        />
      </div>
      {analytics.byPlatform && Object.keys(analytics.byPlatform).length > 0 && (
        <div className="bg-slate-900/50 border border-slate-700 rounded-3xl p-6">
          <h3 className="text-lg font-bold text-white mb-4">🌐 By Platform (7d)</h3>
          <div className="space-y-2">
            {Object.entries(analytics.byPlatform).map(([platform, data]: any) => (
              <div key={platform} className="bg-slate-800/30 rounded-xl p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-white font-bold capitalize">{platform}</span>
                  <span className="text-xs text-emerald-300">{data.engagementRate.toFixed(1)}%</span>
                </div>
                <div className="grid grid-cols-4 gap-2 text-xs text-slate-400">
                  <div>👁️ {data.impressions}</div>
                  <div>❤️ {data.likes}</div>
                  <div>💬 {data.comments}</div>
                  <div>🔁 {data.shares}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-black text-white">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-xl font-bold">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
