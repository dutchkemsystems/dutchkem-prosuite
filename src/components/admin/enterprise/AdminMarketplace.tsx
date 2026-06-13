import { useState, useMemo } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../../convex/_generated/api'

const CATEGORY_ICONS: Record<string, string> = {
  'Customer Service': '💬', 'Sales & Marketing': '📈', 'Finance & Accounting': '💰',
  'Human Resources': '👥', 'Operations & Logistics': '🚚', 'Industry Specific': '🏭',
  'Compliance & Risk': '🛡️', 'Global & Multinational': '🌍', 'AI & Automation': '🤖',
  'Oil & Gas': '⛽', 'Insurance': '🏥', 'Healthcare': '⚕️', 'Education': '🎓',
  'Customs & Trade': '📦', 'Security & Defense': '🔒', 'Transportation': '🚛',
  'Telecom': '📡', 'Government': '🏛️', 'Real Estate': '🏗️',
  'Marketing & Advertising': '📢', 'E-commerce & Retail': '🛒',
  'Banking & Finance': '🏦', 'Manufacturing': '🏭', 'Pharmaceutical': '💊',
  'Logistics & Supply Chain': '🔗', 'Hospitality & Tourism': '🏨',
  'Mining & Resources': '⛏️', 'Legal & Regulatory': '⚖️', 'Agriculture & Food': '🌾',
}

const CATEGORY_COLORS: Record<string, string> = {
  'Customer Service': 'from-blue-500/20 to-blue-600/10 border-blue-500/30',
  'Sales & Marketing': 'from-emerald-500/20 to-emerald-600/10 border-emerald-500/30',
  'Finance & Accounting': 'from-amber-500/20 to-amber-600/10 border-amber-500/30',
  'Human Resources': 'from-purple-500/20 to-purple-600/10 border-purple-500/30',
  'Operations & Logistics': 'from-teal-500/20 to-teal-600/10 border-teal-500/30',
  'Industry Specific': 'from-orange-500/20 to-orange-600/10 border-orange-500/30',
  'Compliance & Risk': 'from-red-500/20 to-red-600/10 border-red-500/30',
  'Global & Multinational': 'from-cyan-500/20 to-cyan-600/10 border-cyan-500/30',
  'AI & Automation': 'from-violet-500/20 to-violet-600/10 border-violet-500/30',
  'Oil & Gas': 'from-yellow-500/20 to-yellow-600/10 border-yellow-500/30',
  'Insurance': 'from-indigo-500/20 to-indigo-600/10 border-indigo-500/30',
  'Healthcare': 'from-rose-500/20 to-rose-600/10 border-rose-500/30',
  'Education': 'from-sky-500/20 to-sky-600/10 border-sky-500/30',
  'Customs & Trade': 'from-lime-500/20 to-lime-600/10 border-lime-500/30',
  'Security & Defense': 'from-slate-500/20 to-slate-600/10 border-slate-500/30',
  'Transportation': 'from-orange-400/20 to-orange-500/10 border-orange-400/30',
  'Telecom': 'from-blue-400/20 to-blue-500/10 border-blue-400/30',
  'Government': 'from-stone-500/20 to-stone-600/10 border-stone-500/30',
  'Real Estate': 'from-emerald-400/20 to-emerald-500/10 border-emerald-400/30',
  'Marketing & Advertising': 'from-fuchsia-500/20 to-fuchsia-600/10 border-fuchsia-500/30',
  'E-commerce & Retail': 'from-pink-500/20 to-pink-600/10 border-pink-500/30',
  'Banking & Finance': 'from-green-500/20 to-green-600/10 border-green-500/30',
  'Manufacturing': 'from-zinc-500/20 to-zinc-600/10 border-zinc-500/30',
  'Pharmaceutical': 'from-cyan-400/20 to-cyan-500/10 border-cyan-400/30',
  'Logistics & Supply Chain': 'from-amber-400/20 to-amber-500/10 border-amber-400/30',
  'Hospitality & Tourism': 'from-violet-400/20 to-violet-500/10 border-violet-400/30',
  'Mining & Resources': 'from-gray-500/20 to-gray-600/10 border-gray-500/30',
  'Legal & Regulatory': 'from-red-400/20 to-red-500/10 border-red-400/30',
  'Agriculture & Food': 'from-green-400/20 to-green-500/10 border-green-400/30',
}

export function AdminMarketplace({ adminToken, organizations }: { adminToken: string, agents: any[], organizations: any[] }) {
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [search, setSearch] = useState('')
  const [selectedOrg, setSelectedOrg] = useState(organizations[0]?._id || '')
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [seeding, setSeeding] = useState(false)

  const categoryCounts = useQuery(api.seed_marketplace_templates.getCategoryCounts, {})
  const templates = useQuery(api.seed_marketplace_templates.listAllTemplates, {
    category: selectedCategory !== 'all' ? selectedCategory : undefined,
    search: search || undefined,
    limit: 500,
  })
  const installedAgents = useQuery(api.enterprise_marketplace.getInstalledAgents, selectedOrg ? { orgId: selectedOrg as any, adminToken } : "skip")
  const installAgent = useMutation(api.enterprise_marketplace.installAgent)
  const uninstallAgent = useMutation(api.enterprise_marketplace.uninstallAgent)
  const seedTemplates = useMutation(api.seed_marketplace_templates.seedAllTemplates)
  const seedEnterpriseTemplates = useMutation(api.enterprise_marketplace_templates.seedEnterpriseTemplates)
  const testSeed = useMutation(api.seed_test.testSeedOne)

  const templateList = templates || []
  const installed = installedAgents || []
  const installedIds = new Set(installed.map((i: any) => i.templateId))
  const counts = categoryCounts?.counts || {}
  const totalTemplates = categoryCounts?.total || 0

  const categories = useMemo(() => {
    const cats = Object.keys(counts).sort()
    return [{ key: 'all', label: 'All Templates', count: totalTemplates, icon: '🏪' }, ...cats.map(c => ({ key: c, label: c, count: counts[c], icon: CATEGORY_ICONS[c] || '📦' }))]
  }, [counts, totalTemplates])

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 4000)
  }

  const handleSeed = async () => {
    setSeeding(true)
    const siteUrl = "https://warmhearted-aardvark-280.convex.site"
    let offset = 0
    let totalInserted = 0
    try {
      while (true) {
        // Try HTTP endpoint first
        let result: any = null
        try {
          const res = await fetch(`${siteUrl}/api/marketplace/seed`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ adminToken, offset }),
          })
          result = await res.json()
        } catch {
          // Fallback to mutation
          result = await seedTemplates({ adminToken, offset })
        }

        if (result?.error) { showToast(`Error: ${result.error}`, 'error'); break }
        if (result?.authError) { showToast(`Auth failed: ${result.message || 'invalid token'}`, 'error'); break }
        totalInserted += result?.inserted || 0
        if (!result?.hasMore) { showToast(`Done! ${totalInserted} templates loaded`, 'success'); break }
        offset = result.nextOffset
      }
    } catch (e: any) { showToast(`Exception: ${e.message || e}`, 'error') }
    setSeeding(false)
  }

  const handleSeedEnterprise = async () => {
    setSeeding(true)
    let offset = 0
    let totalInserted = 0
    try {
      while (true) {
        const result: any = await seedEnterpriseTemplates({ adminToken, offset })
        if (result?.error) { showToast(`Error: ${result.error}`, 'error'); break }
        if (result?.authError) { showToast(`Auth failed: ${result.message || 'invalid token'}`, 'error'); break }
        totalInserted += result?.inserted || 0
        if (!result?.hasMore) { showToast(`Done! ${totalInserted} enterprise templates loaded`, 'success'); break }
        offset = result.nextOffset
      }
    } catch (e: any) { showToast(`Exception: ${e.message || e}`, 'error') }
    setSeeding(false)
  }

  const handleInstall = async (tpl: any) => {
    if (!selectedOrg) { showToast('Select an organization first', 'error'); return }
    try {
      const result: any = await installAgent({ templateId: tpl.templateId, templateName: tpl.name, orgId: selectedOrg as any, adminToken })
      if (result?.error) { showToast(result.error, 'error'); return }
      showToast(`${tpl.name} installed!`, 'success')
    } catch (e: any) { showToast(e.message || 'Install failed', 'error') }
  }

  const handleUninstall = async (templateId: string) => {
    try {
      const inst = installed.find((i: any) => i.templateId === templateId)
      if (inst) await uninstallAgent({ installId: inst._id, adminToken })
      showToast('Uninstalled', 'success')
    } catch (e: any) { showToast(e.message || 'Uninstall failed', 'error') }
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl text-sm font-black ${toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-emerald-600 text-white'}`}>
          {toast.message}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black tracking-tight">Agent Marketplace</h2>
          <p className="text-sm text-slate-400 mt-1">{totalTemplates} AI templates across {Object.keys(counts).length} categories — install per organization</p>
        </div>
        <div className="flex items-center gap-3">
          <select value={selectedOrg} onChange={(e) => setSelectedOrg(e.target.value)} className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-[#FF6B35]/50">
            <option value="" className="bg-[#0a0a0f]">Select organization...</option>
            {organizations.map((o: any) => <option key={o._id} value={o._id} className="bg-[#0a0a0f]">{o.name}</option>)}
          </select>
          <button onClick={handleSeed} disabled={seeding} className="px-4 py-2 bg-[#FF6B35] hover:bg-[#FF8255] text-white rounded-xl text-xs font-black transition-all disabled:opacity-50">
            {seeding ? '⏳ Loading...' : '🔄 Load 200+ Templates'}
          </button>
          <button onClick={handleSeedEnterprise} disabled={seeding} className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-xs font-black transition-all disabled:opacity-50">
            {seeding ? '⏳ Loading...' : '🏭 Load 200 Enterprise Templates'}
          </button>
        </div>
      </div>

      {/* Category Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-2 max-h-48 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10">
        {categories.map((cat) => (
          <button
            key={cat.key}
            onClick={() => setSelectedCategory(cat.key)}
            className={`p-3 rounded-xl border text-center transition-all duration-200 ${selectedCategory === cat.key ? 'bg-[#FF6B35]/10 border-[#FF6B35]/30 ring-1 ring-[#FF6B35]/20' : 'bg-white/5 border-white/10 hover:border-white/20'}`}
          >
            <div className="text-lg mb-1">{cat.icon}</div>
            <div className="text-[10px] font-black text-white truncate">{cat.label}</div>
            <div className="text-[9px] text-slate-500">{cat.count}</div>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search templates by name, description, or tag..."
          className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#FF6B35]/50"
        />
        {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white text-xs">✕</button>}
      </div>

      {/* Stats Bar */}
      <div className="flex items-center justify-between text-xs text-slate-400">
        <span>Showing {templateList.length} templates {selectedCategory !== 'all' ? `in ${selectedCategory}` : ''}</span>
        <span>{installed.length} installed in selected org</span>
      </div>

      {/* Template Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {templateList.map((tpl: any) => {
          const isInstalled = installedIds.has(tpl.templateId)
          const catColor = CATEGORY_COLORS[tpl.category] || 'from-gray-500/20 to-gray-600/10 border-gray-500/30'
          return (
            <div key={tpl._id} className={`bg-gradient-to-br ${catColor} border rounded-2xl p-5 hover:scale-[1.01] transition-all duration-300 group`}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{CATEGORY_ICONS[tpl.category] || '📦'}</span>
                  <span className="px-2 py-0.5 bg-black/20 border border-white/10 rounded text-[9px] font-black text-slate-300">{tpl.templateId}</span>
                </div>
                {isInstalled && <span className="px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 text-[9px] rounded-full font-bold">INSTALLED</span>}
              </div>
              <h3 className="text-sm font-black text-white mb-1 group-hover:text-[#FF6B35] transition-colors">{tpl.name}</h3>
              <p className="text-[11px] text-slate-400 leading-relaxed mb-3 line-clamp-2">{tpl.description}</p>
              <div className="flex flex-wrap gap-1 mb-3">
                {(tpl.config?.bestFor ? [tpl.config.bestFor] : []).concat(tpl.tags?.slice(0, 2) || []).slice(0, 3).map((tag: string) => (
                  <span key={tag} className="px-1.5 py-0.5 bg-black/20 border border-white/5 rounded text-[8px] text-slate-400">{tag}</span>
                ))}
              </div>
              <div className="flex items-center justify-between text-[10px] mb-3">
                <span className="text-amber-400 font-black">{tpl.isFree ? 'FREE' : `₦${tpl.priceNgn?.toLocaleString()}/mo`}</span>
                <span className="text-slate-500">⭐ {tpl.rating} ({tpl.reviewCount})</span>
                <span className="text-slate-500">📥 {tpl.installCount}</span>
              </div>
              <div className="flex gap-2">
                {isInstalled ? (
                  <button onClick={() => handleUninstall(tpl.templateId)} className="flex-1 px-3 py-2 bg-red-500/20 border border-red-500/30 text-red-400 rounded-xl text-xs font-black hover:bg-red-500/30 transition-all">
                    Uninstall
                  </button>
                ) : (
                  <button onClick={() => handleInstall(tpl)} className="flex-1 px-3 py-2 bg-[#FF6B35] hover:bg-[#FF8255] text-white rounded-xl text-xs font-black transition-all">
                    Install
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {templateList.length === 0 && (
        <div className="text-center py-12">
          <div className="text-4xl mb-4">🏪</div>
          <div className="text-lg font-black text-white mb-2">No templates found</div>
          <div className="text-sm text-slate-400 mb-4">{search ? 'Try a different search term' : 'Click "Load 200+ Templates" to populate the marketplace'}</div>
          <button onClick={handleSeed} disabled={seeding} className="px-6 py-3 bg-[#FF6B35] hover:bg-[#FF8255] text-white rounded-xl text-sm font-black transition-all disabled:opacity-50">
            {seeding ? 'Loading...' : 'Load All Templates'}
          </button>
        </div>
      )}

      {/* Installed Section */}
      {selectedOrg && installed.length > 0 && (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
          <h3 className="text-sm font-black text-slate-300 mb-3">Installed Agents ({installed.length})</h3>
          <div className="space-y-2">
            {installed.map((inst: any) => (
              <div key={inst._id} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                <div>
                  <span className="text-sm text-white font-bold">{inst.templateName}</span>
                  <span className="text-[10px] text-slate-500 ml-2">Installed {new Date(inst.installedAt).toLocaleDateString()}</span>
                </div>
                <button onClick={() => handleUninstall(inst.templateId)} className="px-2 py-1 bg-red-500/20 border border-red-500/30 rounded-lg text-[10px] font-bold text-red-400 hover:bg-red-500/30 transition-all">Remove</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
