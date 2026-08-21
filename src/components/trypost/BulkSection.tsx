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
