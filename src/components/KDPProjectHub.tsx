import { useSuspenseQuery } from "@tanstack/react-query";
import { convexQuery } from "@convex-dev/react-query";
import { api } from "../../convex/_generated/api";
import { useMutation } from "convex/react";
import { useState } from "react";

const SUBSCRIPTION_TIERS = ["Basic", "Pro", "Enterprise"] as const;
const TRIM_SIZES = ["5x8", "5.5x8.5", "6x9", "6.14x9.21", "7x10", "8.5x11"] as const;
const PAPER_TYPES = ["Black & White", "Cream", "Color"] as const;
const COVER_TYPES = ["Matte", "Glossy", "Premium Matte"] as const;

export function KDPProjectHub({ userId: _userId }: { userId: any }) {
  const { data: projects } = useSuspenseQuery(convexQuery(api.kdp_agent.listBookProjects, {}));
  const createProject = useMutation(api.kdp_agent.createBookProject);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);

  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [authorName, setAuthorName] = useState("");
  const [authorBio, setAuthorBio] = useState("");
  const [description, setDescription] = useState("");
  const [trimSize, setTrimSize] = useState("6x9");
  const [pageCount, setPageCount] = useState(150);
  const [interiorType, setInteriorType] = useState("Black & White");
  const [bleedSetting, setBleedSetting] = useState("No Bleed");
  const [coverType, setCoverType] = useState("Matte");
  const [kdpEmail, setKdpEmail] = useState("");
  const [publishingRole, setPublishingRole] = useState("Author");
  const [imprintName, setImprintName] = useState("");
  const [isbnOption, setIsbnOption] = useState("Free KDP ISBN");
  const [tier, setTier] = useState<"Basic" | "Pro" | "Enterprise">("Basic");
  const [keywordsStr, setKeywordsStr] = useState("");
  const [categoriesStr, setCategoriesStr] = useState("");
  const [pricingTiersStr, setPricingTiersStr] = useState("");

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !authorName.trim()) return;
    setLoading(true);

    await createProject({
      subscriptionTier: tier,
      manuscript: {
        title: title.trim(),
        subtitle: subtitle.trim() || undefined,
        authorName: authorName.trim(),
        authorBio: authorBio.trim() || undefined,
        description: description.trim(),
        keywords: keywordsStr.split(",").map(s => s.trim()).filter(Boolean),
        categories: categoriesStr.split(",").map(s => s.trim()).filter(Boolean),
        trimSize,
        pageCount,
        interiorType,
        bleedSetting,
        coverType,
      },
      kdpMetadata: {
        kdpAccountEmail: kdpEmail.trim(),
        publishingRole,
        imprintName: imprintName.trim() || undefined,
        isbnOption,
        pricingTiers: pricingTiersStr.split(",").map(s => s.trim()).filter(Boolean),
      },
    });

    setLoading(false);
    setShowForm(false);
    setTitle("");
    setSubtitle("");
    setAuthorName("");
    setAuthorBio("");
    setDescription("");
    setKeywordsStr("");
    setCategoriesStr("");
    setPricingTiersStr("");
  };

  if (showForm) {
    return (
      <form onSubmit={handleCreate} className="space-y-8 max-w-3xl mx-auto">
        <div className="bg-gradient-to-br from-indigo-900 to-slate-900 border border-slate-800 rounded-[3rem] p-10 relative overflow-hidden">
          <h2 className="text-2xl font-black text-white uppercase tracking-tighter mb-6">New KDP Book Project</h2>

          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField label="Book Title *">
                <input value={title} onChange={e => setTitle(e.target.value)} className="w-full px-4 py-3 bg-slate-950 border border-white/10 rounded-xl text-white text-sm focus:ring-2 focus:ring-indigo-500 outline-none" required />
              </FormField>
              <FormField label="Subtitle">
                <input value={subtitle} onChange={e => setSubtitle(e.target.value)} className="w-full px-4 py-3 bg-slate-950 border border-white/10 rounded-xl text-white text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
              </FormField>
              <FormField label="Author Name *">
                <input value={authorName} onChange={e => setAuthorName(e.target.value)} className="w-full px-4 py-3 bg-slate-950 border border-white/10 rounded-xl text-white text-sm focus:ring-2 focus:ring-indigo-500 outline-none" required />
              </FormField>
              <FormField label="KDP Account Email">
                <input type="email" value={kdpEmail} onChange={e => setKdpEmail(e.target.value)} className="w-full px-4 py-3 bg-slate-950 border border-white/10 rounded-xl text-white text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
              </FormField>
            </div>

            <FormField label="Description">
              <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} className="w-full px-4 py-3 bg-slate-950 border border-white/10 rounded-xl text-white text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
            </FormField>
            <FormField label="Author Bio">
              <textarea value={authorBio} onChange={e => setAuthorBio(e.target.value)} rows={2} className="w-full px-4 py-3 bg-slate-950 border border-white/10 rounded-xl text-white text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
            </FormField>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField label="Trim Size">
                <select value={trimSize} onChange={e => setTrimSize(e.target.value)} className="w-full px-4 py-3 bg-slate-950 border border-white/10 rounded-xl text-white text-sm focus:ring-2 focus:ring-indigo-500 outline-none">
                  {TRIM_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </FormField>
              <FormField label="Page Count">
                <input type="number" value={pageCount} onChange={e => setPageCount(Number(e.target.value))} min={24} className="w-full px-4 py-3 bg-slate-950 border border-white/10 rounded-xl text-white text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
              </FormField>
              <FormField label="Interior Type">
                <select value={interiorType} onChange={e => setInteriorType(e.target.value)} className="w-full px-4 py-3 bg-slate-950 border border-white/10 rounded-xl text-white text-sm focus:ring-2 focus:ring-indigo-500 outline-none">
                  {PAPER_TYPES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </FormField>
              <FormField label="Bleed Setting">
                <select value={bleedSetting} onChange={e => setBleedSetting(e.target.value)} className="w-full px-4 py-3 bg-slate-950 border border-white/10 rounded-xl text-white text-sm focus:ring-2 focus:ring-indigo-500 outline-none">
                  <option value="No Bleed">No Bleed</option>
                  <option value="Bleed">Bleed</option>
                </select>
              </FormField>
              <FormField label="Cover Type">
                <select value={coverType} onChange={e => setCoverType(e.target.value)} className="w-full px-4 py-3 bg-slate-950 border border-white/10 rounded-xl text-white text-sm focus:ring-2 focus:ring-indigo-500 outline-none">
                  {COVER_TYPES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </FormField>
              <FormField label="Cover / Interior">
                <select value={coverType} onChange={e => setCoverType(e.target.value)} className="w-full px-4 py-3 bg-slate-950 border border-white/10 rounded-xl text-white text-sm focus:ring-2 focus:ring-indigo-500 outline-none">
                  <option value="Matte">Matte Cover</option>
                  <option value="Glossy">Glossy Cover</option>
                </select>
              </FormField>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField label="Keywords (comma-separated)">
                <input value={keywordsStr} onChange={e => setKeywordsStr(e.target.value)} placeholder="keyword1, keyword2" className="w-full px-4 py-3 bg-slate-950 border border-white/10 rounded-xl text-white text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
              </FormField>
              <FormField label="Categories (comma-separated)">
                <input value={categoriesStr} onChange={e => setCategoriesStr(e.target.value)} placeholder="cat1, cat2" className="w-full px-4 py-3 bg-slate-950 border border-white/10 rounded-xl text-white text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
              </FormField>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField label="Publishing Role">
                <select value={publishingRole} onChange={e => setPublishingRole(e.target.value)} className="w-full px-4 py-3 bg-slate-950 border border-white/10 rounded-xl text-white text-sm focus:ring-2 focus:ring-indigo-500 outline-none">
                  <option value="Author">Author</option>
                  <option value="Publisher">Publisher</option>
                  <option value="Both">Both</option>
                </select>
              </FormField>
              <FormField label="ISBN Option">
                <select value={isbnOption} onChange={e => setIsbnOption(e.target.value)} className="w-full px-4 py-3 bg-slate-950 border border-white/10 rounded-xl text-white text-sm focus:ring-2 focus:ring-indigo-500 outline-none">
                  <option value="Free KDP ISBN">Free KDP ISBN</option>
                  <option value="My Own ISBN">My Own ISBN</option>
                </select>
              </FormField>
              <FormField label="Imprint Name">
                <input value={imprintName} onChange={e => setImprintName(e.target.value)} className="w-full px-4 py-3 bg-slate-950 border border-white/10 rounded-xl text-white text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
              </FormField>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField label="Subscription Tier">
                <select value={tier} onChange={e => setTier(e.target.value as "Basic" | "Pro" | "Enterprise")} className="w-full px-4 py-3 bg-slate-950 border border-white/10 rounded-xl text-white text-sm focus:ring-2 focus:ring-indigo-500 outline-none">
                  {SUBSCRIPTION_TIERS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </FormField>
              <FormField label="Pricing Tiers (comma-separated)">
                <input value={pricingTiersStr} onChange={e => setPricingTiersStr(e.target.value)} placeholder="$2.99, $4.99, $9.99" className="w-full px-4 py-3 bg-slate-950 border border-white/10 rounded-xl text-white text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
              </FormField>
            </div>
          </div>

          <div className="flex gap-4 mt-8">
            <button type="button" onClick={() => setShowForm(false)} className="px-8 py-4 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-600/20 active:scale-95 transition-all disabled:opacity-50">
              {loading ? "Creating..." : "Create Project"}
            </button>
          </div>
        </div>
      </form>
    );
  }

  return (
    <div className="space-y-8">
      <div className="bg-gradient-to-br from-indigo-900 to-slate-900 border border-slate-800 rounded-[3rem] p-10 relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 blur-[80px] group-hover:bg-indigo-500/20 transition-colors"></div>
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="space-y-2">
            <h2 className="text-3xl font-black text-white uppercase tracking-tighter">KDP Author Command Center</h2>
            <p className="text-sm font-bold text-indigo-400 uppercase tracking-widest">Publish directly to Amazon • Keep 100% Royalties</p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-600/20 active:scale-95 transition-all"
          >
            New Book Project
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {projects.map((p) => (
          <div key={p._id} className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 space-y-6 group hover:border-indigo-500/50 transition-all">
            <div className="flex justify-between items-start">
              <div className="w-14 h-14 bg-slate-950 rounded-2xl flex items-center justify-center text-3xl shadow-inner group-hover:scale-110 transition-transform">📖</div>
              <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border ${
                p.status === "published" ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "bg-indigo-500/10 text-indigo-500 border-indigo-500/20"
              }`}>
                {p.status}
              </span>
            </div>

            <div>
              <h4 className="text-lg font-black text-white uppercase tracking-tighter leading-tight mb-1">{p.manuscript.title}</h4>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">by {p.manuscript.authorName}</p>
              {p.kdpMetadata.imprintName && (
                <p className="text-[9px] text-slate-600 font-bold uppercase tracking-widest mt-1">Imprint: {p.kdpMetadata.imprintName}</p>
              )}
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-2">Created {new Date(p.createdAt).toLocaleDateString()}</p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="py-2 px-3 bg-slate-950 rounded-xl border border-white/5">
                <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Trim</p>
                <p className="text-xs font-bold text-white">{p.manuscript.trimSize}</p>
              </div>
              <div className="py-2 px-3 bg-slate-950 rounded-xl border border-white/5">
                <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Pages</p>
                <p className="text-xs font-bold text-white">{p.manuscript.pageCount}</p>
              </div>
              <div className="py-2 px-3 bg-slate-950 rounded-xl border border-white/5">
                <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Cover</p>
                <p className="text-xs font-bold text-white">{p.manuscript.coverType}</p>
              </div>
              <div className="py-2 px-3 bg-slate-950 rounded-xl border border-white/5">
                <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Tier</p>
                <p className="text-xs font-bold text-white">{p.subscriptionTier}</p>
              </div>
            </div>

            {(p.coverFiles.length > 0 || p.interiorFiles.length > 0) && (
              <div className="space-y-1">
                {p.coverFiles.map((f, i) => (
                  <a key={`cover-${i}`} href={f.fileUrl} target="_blank" className="block py-2 px-3 bg-slate-950 rounded-xl border border-white/5 text-[9px] font-black text-indigo-400 uppercase tracking-widest hover:bg-slate-800 transition-all">
                    Cover: {f.fileName}
                  </a>
                ))}
                {p.interiorFiles.map((f, i) => (
                  <a key={`interior-${i}`} href={f.fileUrl} target="_blank" className="block py-2 px-3 bg-slate-950 rounded-xl border border-white/5 text-[9px] font-black text-indigo-400 uppercase tracking-widest hover:bg-slate-800 transition-all">
                    Interior: {f.fileName}
                  </a>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</label>
      {children}
    </div>
  );
}
