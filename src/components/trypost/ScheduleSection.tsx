import type { Id } from "../../../convex/_generated/dataModel";

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
