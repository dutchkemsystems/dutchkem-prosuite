import { useState } from "react";
import { useTryPostActions } from "./TryPostActions";
import { Modal } from "./Modal";

export function MediaLibraryModal({ media, onClose }: { media: any; onClose: () => void }) {
  const { addMedia, deleteMedia, adminToken, showToast } = useTryPostActions();
  const [form, setForm] = useState({ mediaName: "", mediaUrl: "", mediaType: "image" });

  return (
    <Modal title="🖼️ Media Library" onClose={onClose}>
      <div className="space-y-3">
        <div className="flex gap-2">
          <input
            placeholder="Media name"
            value={form.mediaName}
            onChange={(e) => setForm({ ...form, mediaName: e.target.value })}
            className="flex-1 bg-slate-800 text-white rounded-xl px-3 py-2 text-sm"
          />
          <select
            value={form.mediaType}
            onChange={(e) => setForm({ ...form, mediaType: e.target.value })}
            className="w-28 bg-slate-800 text-white rounded-xl px-3 py-2 text-sm"
          >
            <option value="image">Image</option>
            <option value="video">Video</option>
            <option value="gif">GIF</option>
          </select>
        </div>
        <input
          placeholder="URL (https://...)"
          value={form.mediaUrl}
          onChange={(e) => setForm({ ...form, mediaUrl: e.target.value })}
          className="w-full bg-slate-800 text-white rounded-xl px-3 py-2 text-sm"
        />
        <button
          onClick={async () => {
            if (!form.mediaName || !form.mediaUrl) { showToast("error", "Name and URL required"); return; }
            try {
              await addMedia({ adminToken, name: form.mediaName, url: form.mediaUrl, type: form.mediaType as any });
              showToast("success", "Media added");
              setForm({ mediaName: "", mediaUrl: "", mediaType: "image" });
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
  );
}

export function TemplatesModal({
  templates,
  setScheduleForm,
  scheduleForm,
  setScheduleModal,
  onClose,
}: {
  templates: any;
  setScheduleForm: (f: any) => void;
  scheduleForm: any;
  setScheduleModal: (v: boolean) => void;
  onClose: () => void;
}) {
  const { createTemplate, deleteTemplate, useTemplate: useTemplateMut, adminToken, showToast } = useTryPostActions();
  const [form, setForm] = useState({ templateName: "", templateContent: "", templateCategory: "" });

  return (
    <Modal title="📋 Post Templates" onClose={onClose}>
      <div className="space-y-3">
        <input
          placeholder="Template name"
          value={form.templateName}
          onChange={(e) => setForm({ ...form, templateName: e.target.value })}
          className="w-full bg-slate-800 text-white rounded-xl px-3 py-2 text-sm"
        />
        <input
          placeholder="Category (announcement, promo, education...)"
          value={form.templateCategory}
          onChange={(e) => setForm({ ...form, templateCategory: e.target.value })}
          className="w-full bg-slate-800 text-white rounded-xl px-3 py-2 text-sm"
        />
        <textarea
          placeholder="Template content (use {{variable}} for dynamic values)"
          value={form.templateContent}
          onChange={(e) => setForm({ ...form, templateContent: e.target.value })}
          className="w-full bg-slate-800 text-white rounded-xl px-3 py-2 text-sm"
          rows={4}
        />
        <button
          onClick={async () => {
            if (!form.templateName || !form.templateContent) { showToast("error", "Name and content required"); return; }
            try {
              await createTemplate({ adminToken, name: form.templateName, content: form.templateContent, category: form.templateCategory || undefined });
              showToast("success", "Template created");
              setForm({ templateName: "", templateContent: "", templateCategory: "" });
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
                          const res = await useTemplateMut({ adminToken, templateId: t._id });
                          if (res?.template) {
                            setScheduleForm({ ...scheduleForm, content: res.template.content, hashtags: (res.template.hashtags ?? []).join(" ") });
                            setScheduleModal(true);
                            onClose();
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
  );
}

export function ApprovalsModal({
  pendingApprovals,
  onClose,
}: {
  pendingApprovals: any;
  onClose: () => void;
}) {
  const { approvePost, rejectPost, adminToken, showToast } = useTryPostActions();
  const [rejectModal, setRejectModal] = useState<{ postId: string; reason: string } | null>(null);

  return (
    <>
      <Modal title="✅ Pending Approvals" onClose={onClose}>
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
    </>
  );
}

export function ExportPostsModal({ exportPosts, onClose }: { exportPosts: any; onClose: () => void }) {
  const { showToast } = useTryPostActions();

  return (
    <Modal title="⬇️ Export Posts (CSV)" onClose={onClose}>
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
  );
}
