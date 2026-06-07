import { useState } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

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

  const platforms = useQuery(api.trypost.getSupportedPlatforms, {});
  const brandProfile = useQuery(api.trypost.getBrandProfile, { adminToken });
  const scheduled = useQuery(api.trypost.listScheduledPosts, { adminToken, limit: 50 });
  const workflows = useQuery(api.trypost.listWorkflows, { adminToken });
  const carousels = useQuery(api.trypost.listCarousels, { adminToken });
  const analytics = useQuery(api.trypost.getAnalytics, { adminToken, period: "7d" });
  const schedule = useQuery(api.trypost.getPostingSchedule, { adminToken });

  const upsertBrand = useMutation(api.trypost.upsertBrandProfile);
  const schedulePost = useMutation(api.trypost.schedulePost);
  const bulkSchedule = useMutation(api.trypost.bulkSchedule);
  const generateCarousel = useAction(api.trypost.generateCarousel);
  const createWorkflow = useMutation(api.trypost.createWorkflow);
  const cancelPost = useMutation(api.trypost.cancelScheduled);
  const toggleWorkflow = useMutation(api.trypost.toggleWorkflow);

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

function StatCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: string | number;
  icon: string;
  color: "indigo" | "emerald" | "rose" | "blue" | "amber" | "purple";
}) {
  return (
    <div className={`bg-gradient-to-br from-${color}-500/10 to-${color}-600/5 border border-${color}-500/20 rounded-2xl p-4`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-slate-400 uppercase font-bold">{label}</span>
        <span className="text-xl">{icon}</span>
      </div>
      <div className={`text-2xl font-black text-${color}-300`}>{value}</div>
    </div>
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
