import { useState } from 'react'

const templates = [
  { id: '1', name: 'Customer Support Bot', category: 'Support', installs: 2340, rating: 4.8, price: 'Free', icon: '🎧', color: 'from-blue-500 to-cyan-500' },
  { id: '2', name: 'Sales Lead Qualifier', category: 'Sales', installs: 1890, rating: 4.7, price: '₦5,000', icon: '💼', color: 'from-emerald-500 to-green-500' },
  { id: '3', name: 'Content Writer Pro', category: 'Marketing', installs: 3120, rating: 4.9, price: '₦8,000', icon: '✍️', color: 'from-orange-500 to-amber-500' },
  { id: '4', name: 'Data Analyst Agent', category: 'Analytics', installs: 1560, rating: 4.6, price: '₦12,000', icon: '📊', color: 'from-violet-500 to-purple-500' },
  { id: '5', name: 'HR Onboarding Bot', category: 'Human Resources', installs: 980, rating: 4.5, price: 'Free', icon: '🤝', color: 'from-pink-500 to-rose-500' },
  { id: '6', name: 'Legal Document Review', category: 'Legal', installs: 720, rating: 4.8, price: '₦15,000', icon: '⚖️', color: 'from-slate-500 to-gray-600' },
]

export function MarketplaceTab({ token }: { token: string }) {
  const [filter, setFilter] = useState('all')
  const [installed, setInstalled] = useState<string[]>(['1'])

  const categories = ['all', ...new Set(templates.map(t => t.category))]
  const filtered = filter === 'all' ? templates : templates.filter(t => t.category === filter)

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h2 className="text-2xl font-black tracking-tight">Agent Marketplace</h2>
        <p className="text-sm text-slate-400 mt-1">Install pre-built AI agents for your organization</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {categories.map(cat => (
          <button key={cat} onClick={() => setFilter(cat)}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
              filter === cat ? 'bg-orange-500 text-white' : 'bg-white/5 text-slate-400 hover:bg-white/10'
            }`}>
            {cat}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map((tpl) => (
          <div key={tpl.id} className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all group">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl mb-4 bg-gradient-to-br ${tpl.color} group-hover:scale-110 transition-transform`}>
              {tpl.icon}
            </div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">{tpl.category}</p>
            <h3 className="font-black text-lg mb-2">{tpl.name}</h3>
            <div className="flex items-center gap-4 text-xs text-slate-400 mb-4">
              <span>⭐ {tpl.rating}</span>
              <span>📥 {tpl.installs.toLocaleString()} installs</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-black text-orange-400">{tpl.price}</span>
              <button
                onClick={() => setInstalled(prev => prev.includes(tpl.id) ? prev.filter(id => id !== tpl.id) : [...prev, tpl.id])}
                className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
                  installed.includes(tpl.id)
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'bg-orange-500 text-white hover:bg-orange-600'
                }`}
              >
                {installed.includes(tpl.id) ? '✓ Installed' : 'Install'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
