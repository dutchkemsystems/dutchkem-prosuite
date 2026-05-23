import { useSuspenseQuery } from "@tanstack/react-query";
import { convexQuery } from "@convex-dev/react-query";
import { api } from "../../convex/_generated/api";
import { useMutation } from "convex/react";
import { useState } from "react";

export function KDPProjectHub({ userId }: { userId: any }) {
  const { data: projects } = useSuspenseQuery(convexQuery(api.kdp_agent.listUserProjects, { userId }));
  const startProject = useMutation(api.kdp_agent.startKDPProject);
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(false);

  const handleStart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setLoading(true);
    await startProject({ title });
    setTitle("");
    setLoading(false);
  };

  return (
    <div className="space-y-8">
      <div className="bg-gradient-to-br from-indigo-900 to-slate-900 border border-slate-800 rounded-[3rem] p-10 relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 blur-[80px] group-hover:bg-indigo-500/20 transition-colors"></div>
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="space-y-2">
            <h2 className="text-3xl font-black text-white uppercase tracking-tighter">KDP Author Command Center</h2>
            <p className="text-sm font-bold text-indigo-400 uppercase tracking-widest">Publish directly to Amazon • Keep 100% Royalties</p>
          </div>
          <form onSubmit={handleStart} className="flex gap-4 w-full md:w-auto">
            <input 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter Book Title..." 
              className="px-6 py-4 bg-slate-950 border border-white/10 rounded-2xl text-white text-sm focus:ring-2 focus:ring-indigo-500 outline-none w-full md:w-64"
            />
            <button 
              type="submit"
              disabled={loading}
              className="px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-600/20 active:scale-95 transition-all disabled:opacity-50"
            >
              {loading ? "Initializing..." : "Publish Book"}
            </button>
          </form>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {projects.map((p) => (
          <div key={p._id} className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 space-y-6 group hover:border-indigo-500/50 transition-all">
            <div className="flex justify-between items-start">
              <div className="w-14 h-14 bg-slate-950 rounded-2xl flex items-center justify-center text-3xl shadow-inner group-hover:scale-110 transition-transform">📖</div>
              <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border ${
                p.status === "completed" ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "bg-indigo-500/10 text-indigo-500 border-indigo-500/20"
              }`}>
                {p.status}
              </span>
            </div>
            
            <div>
              <h4 className="text-lg font-black text-white uppercase tracking-tighter leading-tight mb-1">{p.title}</h4>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Created {new Date(p.createdAt).toLocaleDateString()}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <AssetButton label="MS" active={!!p.assets.manuscriptUrl} href={p.assets.manuscriptUrl} />
              <AssetButton label="Cover" active={!!p.assets.coverUrl} href={p.assets.coverUrl} />
              <AssetButton label="EPUB" active={!!p.assets.epubUrl} href={p.assets.epubUrl} />
              <AssetButton label="PDF" active={!!p.assets.pdfUrl} href={p.assets.pdfUrl} />
            </div>

            {p.status === "completed" && (
              <a 
                href={p.assets.zipUrl} 
                className="block w-full py-4 bg-slate-950 hover:bg-slate-800 border border-white/5 text-center text-[10px] font-black text-white uppercase tracking-[0.2em] rounded-2xl transition-all"
              >
                Download KDP Bundle (ZIP)
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function AssetButton({ label, active, href }: { label: string, active: boolean, href?: string }) {
  return (
    <a 
      href={href}
      target="_blank"
      className={`py-2 text-center text-[9px] font-black uppercase tracking-widest rounded-xl border transition-all ${
        active ? "bg-slate-800 text-indigo-400 border-indigo-500/20 hover:bg-slate-700" : "bg-slate-950 text-slate-600 border-white/5 opacity-50 cursor-not-allowed"
      }`}
      onClick={(e) => !active && e.preventDefault()}
    >
      {label} {active ? "✓" : "×"}
    </a>
  );
}
