import { StatCard, EmptyState } from './shared'

// ─── COMMERCE TAB ─────────────────────────────────────────────

export function CommerceTab() {
  return (
    <div className="space-y-6">
      <div className="bg-white/5 border border-white/10 rounded-2xl p-8">
        <div className="flex items-center gap-4 mb-6">
          <span className="text-4xl">🛒</span>
          <div>
            <h3 className="text-xl font-bold text-white">Conversational Commerce Orchestration</h3>
            <p className="text-sm text-slate-400 mt-1">Multi-channel commerce automation engine</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
            <div className="text-2xl font-black text-white">🟢</div>
            <div className="text-sm text-slate-400 mt-1">System Status</div>
            <div className="text-xs text-emerald-400 mt-1">Operational</div>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
            <div className="text-2xl font-black text-[#FF6B35]">Active</div>
            <div className="text-sm text-slate-400 mt-1">Channels</div>
            <div className="text-xs text-slate-500 mt-1">WhatsApp, Instagram, X</div>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
            <div className="text-2xl font-black text-white">24/7</div>
            <div className="text-sm text-slate-400 mt-1">Availability</div>
            <div className="text-xs text-slate-500 mt-1">Always-on commerce</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon="🛒" value="—" label="Orders Processed" color="from-blue-500/20 to-blue-600/10" />
        <StatCard icon="💬" value="—" label="Conversations" color="from-orange-500/20 to-orange-600/10" />
        <StatCard icon="💰" value="—" label="Revenue" color="from-emerald-500/20 to-emerald-600/10" />
        <StatCard icon="📈" value="—" label="Conversion Rate" color="from-purple-500/20 to-purple-600/10" />
      </div>

      <EmptyState icon="🛒" title="Commerce Pipeline" description="Conversational commerce orchestration data will appear here as orders flow through the system." />
    </div>
  )
}
