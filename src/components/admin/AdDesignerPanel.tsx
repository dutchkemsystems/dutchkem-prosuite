import { useState } from 'react'
import { useMutation } from 'convex/react'
import { useSuspenseQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { api } from '../../../convex/_generated/api'

// ═══════════════════════════════════════════════════════════════════
// AD DESIGNER PANEL - Creates NEW unique ad designs
// ═══════════════════════════════════════════════════════════════════

const TEMPLATES = [
  { id: 'social_media', name: 'Social Media Ad', dimensions: '1080x1080', platforms: ['Facebook', 'Instagram', 'Twitter'] },
  { id: 'story', name: 'Story/Reel', dimensions: '1080x1920', platforms: ['Instagram', 'TikTok', 'Facebook'] },
  { id: 'banner', name: 'Web Banner', dimensions: '728x90', platforms: ['Website', 'Google Ads'] },
  { id: 'flyer', name: 'Marketing Flyer', dimensions: '1080x1920', platforms: ['Print', 'Email'] },
  { id: 'poster', name: 'Event Poster', dimensions: '1080x1350', platforms: ['Facebook', 'LinkedIn'] },
]

const STYLES = [
  { id: 'modern', name: 'Modern', colors: ['#1E1E1E', '#FFFFFF', '#FF6B35'] },
  { id: 'vibrant', name: 'Vibrant', colors: ['#FF6B35', '#FF3366', '#FFD700'] },
  { id: 'minimal', name: 'Minimal', colors: ['#000000', '#FFFFFF', '#F5F5F5'] },
  { id: 'corporate', name: 'Corporate', colors: ['#1E3A8A', '#FFFFFF', '#F59E0B'] },
  { id: 'playful', name: 'Playful', colors: ['#FF6B35', '#3B82F6', '#10B981'] },
]

interface AdDesignerPanelProps {
  adminToken: string
}

export function AdDesignerPanel({ adminToken }: AdDesignerPanelProps) {
  const [design, setDesign] = useState({
    headline: 'AI-Powered Business Automation',
    subheadline: 'Let AI agents work for you 24/7',
    body: 'Transform your business with intelligent automation. Our AI agents handle tasks, analyze data, and boost productivity.',
    cta: 'Start Free Trial',
    url: 'https://dutchkem-prosuite-app.vercel.app/auth',
    template: 'social_media',
    style: 'modern',
    primaryColor: '#FF6B35',
    secondaryColor: '#F7931E',
    accentColor: '#FFD700',
  })

  const [preview, setPreview] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)

  const { data: existingDesigns } = useSuspenseQuery(convexQuery(api.poster_converter.getReadyPosters, { adminToken }))
  const createDesign = useMutation(api.poster_converter.generateReadyPoster)

  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg })
    setTimeout(() => setToast(null), 4000)
  }

  const handleGenerate = async () => {
    setGenerating(true)
    try {
      // Generate using canvas
      const canvas = document.createElement('canvas')
      const template = TEMPLATES.find(t => t.id === design.template) || TEMPLATES[0]
      const [width, height] = template.dimensions.split('x').map(Number)
      
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      
      if (!ctx) throw new Error('Could not create canvas')

      // Draw gradient background
      const gradient = ctx.createLinearGradient(0, 0, width, height)
      gradient.addColorStop(0, design.primaryColor)
      gradient.addColorStop(1, design.secondaryColor)
      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, width, height)

      // Add decorative elements
      ctx.fillStyle = 'rgba(255, 255, 255, 0.1)'
      ctx.beginPath()
      ctx.arc(width * 0.85, height * 0.15, width * 0.15, 0, Math.PI * 2)
      ctx.fill()

      ctx.fillStyle = 'rgba(255, 255, 255, 0.05)'
      ctx.beginPath()
      ctx.arc(width * 0.15, height * 0.85, width * 0.2, 0, Math.PI * 2)
      ctx.fill()

      // Draw headline
      ctx.fillStyle = '#FFFFFF'
      ctx.font = `bold ${Math.floor(width * 0.06)}px Arial`
      ctx.textAlign = 'center'
      ctx.fillText(design.headline, width / 2, height * 0.25)

      // Draw subheadline
      if (design.subheadline) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'
        ctx.font = `${Math.floor(width * 0.035)}px Arial`
        ctx.fillText(design.subheadline, width / 2, height * 0.35)
      }

      // Draw body
      ctx.fillStyle = '#FFFFFF'
      ctx.font = `${Math.floor(width * 0.025)}px Arial`
      ctx.fillText(design.body.substring(0, 80), width / 2, height * 0.5)

      // Draw CTA button
      const btnWidth = width * 0.35
      const btnHeight = height * 0.06
      const btnX = (width - btnWidth) / 2
      const btnY = height * 0.7
      
      ctx.fillStyle = design.accentColor
      ctx.beginPath()
      ctx.roundRect(btnX, btnY, btnWidth, btnHeight, btnHeight / 2)
      ctx.fill()
      
      ctx.fillStyle = '#000000'
      ctx.font = `bold ${Math.floor(width * 0.025)}px Arial`
      ctx.textAlign = 'center'
      ctx.fillText(design.cta, width / 2, btnY + btnHeight * 0.65)

      // Draw URL
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)'
      ctx.font = `${Math.floor(width * 0.02)}px Arial`
      ctx.fillText(design.url, width / 2, height * 0.88)

      // Convert to data URL
      const dataUrl = canvas.toDataURL('image/jpeg', 0.95)
      setPreview(dataUrl)
      
      showToast('success', 'Design generated successfully!')
    } catch (err: any) {
      showToast('error', err.message || 'Failed to generate design')
    }
    setGenerating(false)
  }

  const handleDownload = () => {
    if (!preview) return
    const link = document.createElement('a')
    link.download = `ad_${design.template}_${Date.now()}.jpg`
    link.href = preview
    link.click()
  }

  const handlePostToTelegram = async () => {
    if (!preview) return
    try {
      showToast('success', 'Design ready for posting!')
    } catch (err: any) {
      showToast('error', err.message || 'Failed to post')
    }
  }

  return (
    <div className="space-y-6">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-2xl shadow-2xl font-bold text-sm ${toast.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'}`}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black uppercase tracking-tighter text-white flex items-center gap-2">
            🖼️ Ad Designer
          </h2>
          <p className="text-xs text-slate-400 mt-1">Create NEW unique ad designs from scratch</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Design Form */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <h3 className="text-lg font-black text-white">Create New Design</h3>
          
          <div className="grid grid-cols-2 gap-4">
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
                value={design.subheadline}
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
                onChange={(e) => setDesign({ ...design, template: e.target.value })}
                className="w-full bg-slate-800 text-white rounded-xl px-3 py-2 text-sm"
              >
                {TEMPLATES.map(t => (
                  <option key={t.id} value={t.id}>{t.name} ({t.dimensions})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-400">Style</label>
              <select
                value={design.style}
                onChange={(e) => setDesign({ ...design, style: e.target.value })}
                className="w-full bg-slate-800 text-white rounded-xl px-3 py-2 text-sm"
              >
                {STYLES.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-400">Primary Color</label>
              <input
                type="color"
                value={design.primaryColor}
                onChange={(e) => setDesign({ ...design, primaryColor: e.target.value })}
                className="w-full h-10 rounded-xl"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400">Secondary Color</label>
              <input
                type="color"
                value={design.secondaryColor}
                onChange={(e) => setDesign({ ...design, secondaryColor: e.target.value })}
                className="w-full h-10 rounded-xl"
              />
            </div>
          </div>

          <button
            onClick={handleGenerate}
            disabled={generating}
            className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold transition-all disabled:opacity-50"
          >
            {generating ? 'Generating...' : '🎨 Generate New Design'}
          </button>
        </div>

        {/* Preview */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <h3 className="text-lg font-black text-white mb-4">Preview</h3>
          
          {preview ? (
            <div className="space-y-4">
              <img src={preview} alt="Generated ad" className="w-full rounded-xl border border-white/10" />
              <div className="flex gap-2">
                <button
                  onClick={handleDownload}
                  className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold transition-all"
                >
                  📥 Download JPG
                </button>
                <button
                  onClick={handlePostToTelegram}
                  className="flex-1 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-bold transition-all"
                >
                  📤 Post to Telegram
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-64 text-slate-500">
              <p>Click "Generate New Design" to see preview</p>
            </div>
          )}
        </div>
      </div>

      {/* Recent Designs */}
      {existingDesigns && existingDesigns.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <h3 className="text-lg font-black text-white mb-4">Recent Designs</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {existingDesigns.slice(0, 8).map((d: any) => (
              <div key={d._id} className="bg-slate-800 rounded-xl p-3">
                <div className="text-xs text-white font-bold truncate">{d.headline || 'Design'}</div>
                <div className="text-[10px] text-slate-400">{d.template || 'social_media'}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
