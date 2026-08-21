import { VOICES } from "./constants";

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
