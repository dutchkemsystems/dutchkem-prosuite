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
