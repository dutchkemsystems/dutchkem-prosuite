import { useState } from 'react'
import { useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'

// ═══════════════════════════════════════════════════════════════════
// OPEN DESIGN INTEGRATION - Unified design platform
// Combines Ad Designer + Flyer Engine + AI Image Generation
// ═══════════════════════════════════════════════════════════════════

const DESIGN_CATEGORIES = [
  { id: 'social', name: 'Social Media', icon: '📱', desc: 'Posts, stories, reels' },
  { id: 'print', name: 'Print Design', icon: '🖨️', desc: 'Flyers, posters, banners' },
  { id: 'brand', name: 'Brand Assets', icon: '🎨', desc: 'Logos, business cards, letterheads' },
  { id: 'video', name: 'Video Content', icon: '🎬', desc: 'Thumbnails, intros, overlays' },
  { id: 'ai', name: 'AI Generated', icon: '🤖', desc: 'AI-powered design creation' },
]

const QUICK_TEMPLATES = [
  { id: 'instagram_post', name: 'Instagram Post', size: '1080×1080', category: 'social' },
  { id: 'instagram_story', name: 'Instagram Story', size: '1080×1920', category: 'social' },
  { id: 'facebook_cover', name: 'Facebook Cover', size: '820×312', category: 'social' },
  { id: 'twitter_header', name: 'Twitter Header', size: '1500×500', category: 'social' },
  { id: 'flyer_a4', name: 'A4 Flyer', size: '2480×3508', category: 'print' },
  { id: 'poster', name: 'Event Poster', size: '1080×1350', category: 'print' },
  { id: 'business_card', name: 'Business Card', size: '1050×600', category: 'brand' },
  { id: 'logo', name: 'Logo Design', size: '500×500', category: 'brand' },
  { id: 'youtube_thumb', name: 'YouTube Thumbnail', size: '1280×720', category: 'video' },
  { id: 'ai_image', name: 'AI Image', size: '1024×1024', category: 'ai' },
]

interface OpenDesignPanelProps {
  adminToken: string
}

export function OpenDesignPanel({ adminToken }: OpenDesignPanelProps) {
  const [activeCategory, setActiveCategory] = useState('social')
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)
  const [prompt, setPrompt] = useState('')
  const [generating, setGenerating] = useState(false)
  const [result, setResult] = useState<any>(null)

  const generateDesign = useMutation(api.ad_designer.createNewAdDesign)
  const generateAIImage = useMutation(api.ai_image_generator.generateImage)

  const filteredTemplates = QUICK_TEMPLATES.filter(t => t.category === activeCategory)

  const handleGenerate = async (templateId: string) => {
    setGenerating(true)
    setSelectedTemplate(templateId)
    try {
      const template = QUICK_TEMPLATES.find(t => t.id === templateId)
      if (templateId === 'ai_image') {
        const res = await generateAIImage({
          adminToken,
          prompt: prompt || 'A professional marketing design for Dutchkem Ventures',
          style: 'modern',
        })
        setResult(res)
      } else {
        const res = await generateDesign({
          adminToken,
          template: templateId.replace('_', ' ').split(' ')[0],
          style: 'modern',
          headline: prompt || 'Dutchkem Ventures',
          subtext: 'AI-Powered Business Platform',
          cta: 'Get Started Today',
        })
        setResult(res)
      }
    } catch (err) {
      setResult({ error: 'Generation failed. Please try again.' })
    }
    setGenerating(false)
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-black">🎨 Open Design</h2>
        <p className="text-xs text-slate-400 mt-1">AI-powered design platform — create, customize, and export</p>
      </div>

      {/* Category Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {DESIGN_CATEGORIES.map(cat => (
          <button
            key={cat.id}
            onClick={() => { setActiveCategory(cat.id); setSelectedTemplate(null); setResult(null) }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              activeCategory === cat.id
                ? 'bg-orange-500 text-white'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <span>{cat.icon}</span>
            <span>{cat.name}</span>
          </button>
        ))}
      </div>

      {/* Prompt Input */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
        <label className="text-[10px] text-slate-500 uppercase font-bold block mb-2">Design Brief</label>
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Describe your design... (e.g., 'Modern flyer for tech conference in Lagos')"
          className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
        />
      </div>

      {/* Template Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {filteredTemplates.map(template => (
          <button
            key={template.id}
            onClick={() => handleGenerate(template.id)}
            disabled={generating}
            className={`bg-slate-900 border rounded-2xl p-4 text-left transition-all hover:border-orange-500/50 ${
              selectedTemplate === template.id ? 'border-orange-500' : 'border-slate-800'
            } ${generating ? 'opacity-50' : ''}`}
          >
            <p className="text-sm font-bold text-white">{template.name}</p>
            <p className="text-[10px] text-slate-500 mt-1">{template.size}</p>
          </button>
        ))}
      </div>

      {/* Result */}
      {generating && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center">
          <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-slate-400">Generating design...</p>
        </div>
      )}

      {result && !generating && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          {result.error ? (
            <p className="text-red-400 text-sm">{result.error}</p>
          ) : (
            <div>
              <p className="text-sm font-bold text-white mb-2">Design Generated</p>
              <p className="text-xs text-slate-400">{result.message || 'Your design is ready!'}</p>
              {result.designId && (
                <p className="text-[10px] text-slate-500 mt-2">ID: {result.designId}</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
          <p className="text-2xl font-black text-orange-400">5</p>
          <p className="text-[10px] text-slate-500 uppercase">Design Categories</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
          <p className="text-2xl font-black text-blue-400">10</p>
          <p className="text-[10px] text-slate-500 uppercase">Quick Templates</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
          <p className="text-2xl font-black text-emerald-400">5</p>
          <p className="text-[10px] text-slate-500 uppercase">Design Styles</p>
        </div>
      </div>
    </div>
  )
}
