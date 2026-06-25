import { useState } from 'react';
import { generateNewAdImage, downloadImage, imageToDataURL, AdDesignData } from '../lib/adDesigner';

// ═══════════════════════════════════════════════════════════════════
// AD DESIGNER COMPONENT - Creates NEW unique designs
// ═══════════════════════════════════════════════════════════════════

interface AdDesignerProps {
  onDesignCreated?: (design: { imageUrl: string; blob: Blob }) => void;
}

export function AdDesigner({ onDesignCreated }: AdDesignerProps) {
  const [design, setDesign] = useState<AdDesignData>({
    headline: 'AI-Powered Business Automation',
    subheadline: 'Let AI agents work for you 24/7',
    body: 'Transform your business with intelligent automation. Our AI agents handle tasks, analyze data, and boost productivity.',
    cta: 'Start Free Trial',
    url: 'https://dutchkem-prosuite-app.vercel.app/auth',
    template: 'social_media',
    style: 'modern',
    colors: {
      primary: '#FF6B35',
      secondary: '#F7931E',
      accent: '#FFD700',
    },
  });

  const [preview, setPreview] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const blob = await generateNewAdImage(design);
      const dataUrl = await imageToDataURL(blob);
      setPreview(dataUrl);
      onDesignCreated?.({ imageUrl: dataUrl, blob });
    } catch (err) {
      console.error('Generation failed:', err);
    }
    setGenerating(false);
  };

  const handleDownload = async () => {
    if (!preview) return;
    const blob = await generateNewAdImage(design);
    downloadImage(blob, `ad_${design.template}_${Date.now()}.jpg`);
  };

  return (
    <div className="p-6 bg-slate-900 rounded-2xl">
      <h2 className="text-xl font-black text-white mb-4">🎨 Create New Ad Design</h2>
      
      {/* Design Form */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <label className="text-xs text-slate-400">Headline</label>
          <input
            type="text"
            value={design.headline}
            onChange={(e) => setDesign({ ...design, headline: e.target.value })}
            className="w-full bg-slate-800 text-white rounded-xl px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="text-xs text-slate-400">Subheadline</label>
          <input
            type="text"
            value={design.subheadline || ''}
            onChange={(e) => setDesign({ ...design, subheadline: e.target.value })}
            className="w-full bg-slate-800 text-white rounded-xl px-3 py-2 text-sm"
          />
        </div>
        <div className="col-span-2">
          <label className="text-xs text-slate-400">Body Text</label>
          <textarea
            value={design.body}
            onChange={(e) => setDesign({ ...design, body: e.target.value })}
            className="w-full bg-slate-800 text-white rounded-xl px-3 py-2 text-sm h-20"
          />
        </div>
        <div>
          <label className="text-xs text-slate-400">CTA Button</label>
          <input
            type="text"
            value={design.cta}
            onChange={(e) => setDesign({ ...design, cta: e.target.value })}
            className="w-full bg-slate-800 text-white rounded-xl px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="text-xs text-slate-400">URL</label>
          <input
            type="text"
            value={design.url}
            onChange={(e) => setDesign({ ...design, url: e.target.value })}
            className="w-full bg-slate-800 text-white rounded-xl px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="text-xs text-slate-400">Template</label>
          <select
            value={design.template}
            onChange={(e) => setDesign({ ...design, template: e.target.value as any })}
            className="w-full bg-slate-800 text-white rounded-xl px-3 py-2 text-sm"
          >
            <option value="social_media">Social Media (1080x1080)</option>
            <option value="story">Story/Reel (1080x1920)</option>
            <option value="banner">Web Banner (728x90)</option>
            <option value="flyer">Marketing Flyer (1080x1920)</option>
            <option value="poster">Event Poster (1080x1350)</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-slate-400">Style</label>
          <select
            value={design.style}
            onChange={(e) => setDesign({ ...design, style: e.target.value as any })}
            className="w-full bg-slate-800 text-white rounded-xl px-3 py-2 text-sm"
          >
            <option value="modern">Modern</option>
            <option value="vibrant">Vibrant</option>
            <option value="minimal">Minimal</option>
            <option value="corporate">Corporate</option>
            <option value="playful">Playful</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-slate-400">Primary Color</label>
          <input
            type="color"
            value={design.colors.primary}
            onChange={(e) => setDesign({ ...design, colors: { ...design.colors, primary: e.target.value } })}
            className="w-full h-10 rounded-xl"
          />
        </div>
        <div>
          <label className="text-xs text-slate-400">Secondary Color</label>
          <input
            type="color"
            value={design.colors.secondary}
            onChange={(e) => setDesign({ ...design, colors: { ...design.colors, secondary: e.target.value } })}
            className="w-full h-10 rounded-xl"
          />
        </div>
      </div>

      {/* Generate Button */}
      <button
        onClick={handleGenerate}
        disabled={generating}
        className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold transition-all disabled:opacity-50"
      >
        {generating ? 'Generating...' : '🎨 Generate New Design'}
      </button>

      {/* Preview */}
      {preview && (
        <div className="mt-6">
          <h3 className="text-lg font-bold text-white mb-3">Preview</h3>
          <img src={preview} alt="Generated ad" className="w-full rounded-xl border border-white/10" />
          <button
            onClick={handleDownload}
            className="w-full mt-4 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold transition-all"
          >
            📥 Download JPG
          </button>
        </div>
      )}
    </div>
  );
}
