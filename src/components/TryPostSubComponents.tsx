import type { ReactNode } from "react";
import { VOICES, TIMEZONES } from "./TryPostScheduler";

export function BrandSection({
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

export function ScheduleSection({
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

export function BulkSection({ onNew, platforms }: { onNew: () => void; platforms: any[] }) {
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

export function CarouselSection({ carousels, onNew }: { carousels: any[]; onNew: () => void }) {
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

export function WorkflowsSection({
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

export function AnalyticsSection({ analytics }: { analytics: any }) {
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

export function Modal({
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