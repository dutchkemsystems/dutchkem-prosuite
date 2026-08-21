import { useTryPostActions } from "./TryPostActions";
import { Modal } from "./Modal";

export function SchedulePostModal({ scheduleForm, setScheduleForm, platforms, onClose }: {
  scheduleForm: any; setScheduleForm: (f: any) => void; platforms: any[]; onClose: () => void;
}) {
  const { schedulePost, adminToken, showToast } = useTryPostActions();

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
      onClose();
      setScheduleForm({ ...scheduleForm, content: "" });
    } catch (e: any) {
      showToast("error", e?.message ?? "Failed to schedule");
    }
  };

  return (
    <Modal title="📅 Schedule New Post" onClose={onClose}>
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
  );
}

export function CarouselGenerateModal({ carouselForm, setCarouselForm, platforms, onClose }: {
  carouselForm: any; setCarouselForm: (f: any) => void; platforms: any[]; onClose: () => void;
}) {
  const { generateCarousel, adminToken, showToast } = useTryPostActions();

  const handleGenerate = async () => {
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
      onClose();
    } catch (e: any) {
      showToast("error", e?.message ?? "Carousel generation failed");
    }
  };

  return (
    <Modal title="🎠 Generate AI Carousel" onClose={onClose}>
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
          onClick={handleGenerate}
          className="w-full bg-purple-500 hover:bg-purple-600 text-white font-bold py-2 rounded-xl"
        >
          Generate Carousel
        </button>
      </div>
    </Modal>
  );
}

export function BulkScheduleModal({ bulkText, setBulkText, onClose }: { bulkText: string; setBulkText: (t: string) => void; onClose: () => void }) {
  const { bulkSchedule, adminToken, showToast } = useTryPostActions();

  const handleBulk = async () => {
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
      onClose();
      setBulkText("");
    } catch (e: any) {
      showToast("error", e?.message ?? "Bulk schedule failed");
    }
  };

  return (
    <Modal title="📦 Bulk Schedule Posts" onClose={onClose}>
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
          onClick={handleBulk}
          className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 rounded-xl"
        >
          Schedule All
        </button>
      </div>
    </Modal>
  );
}

export function WorkflowCreateModal({ workflowForm, setWorkflowForm, platforms, onClose }: {
  workflowForm: any; setWorkflowForm: (f: any) => void; platforms: any[]; onClose: () => void;
}) {
  const { createWorkflow, adminToken, showToast } = useTryPostActions();

  const handleCreate = async () => {
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
      onClose();
    } catch (e: any) {
      showToast("error", e?.message ?? "Workflow creation failed");
    }
  };

  return (
    <Modal title="⚙️ New Automated Workflow" onClose={onClose}>
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
          onClick={handleCreate}
          className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-2 rounded-xl"
        >
          Create Workflow
        </button>
      </div>
    </Modal>
  );
}
