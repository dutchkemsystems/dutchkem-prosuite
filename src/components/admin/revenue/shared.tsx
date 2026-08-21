export function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  return (
    <div className="fixed top-4 right-4 z-50 bg-emerald-500/90 text-white px-5 py-3 rounded-xl shadow-lg shadow-emerald-500/20 text-sm font-medium backdrop-blur-sm animate-in slide-in-from-right">
      <div className="flex items-center gap-3">
        <span>✓</span>
        <span>{message}</span>
        <button onClick={onClose} className="ml-2 text-white/70 hover:text-white">✕</button>
      </div>
    </div>
  )
}

export function StatCard({ icon, value, label, color = 'from-orange-500/20 to-orange-600/10' }: { icon: string; value: string | number; label: string; color?: string }) {
  return (
    <div className={`bg-gradient-to-br ${color} border border-white/10 rounded-2xl p-5 transition-all duration-300 hover:scale-[1.02] hover:border-white/20`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-2xl">{icon}</span>
      </div>
      <div className="text-3xl font-black">{value}</div>
      <div className="text-sm text-slate-400 mt-1">{label}</div>
    </div>
  )
}

export function EmptyState({ icon, title, description }: { icon: string; title: string; description: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <span className="text-5xl mb-4">{icon}</span>
      <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
      <p className="text-slate-400 max-w-md">{description}</p>
    </div>
  )
}

export function formatNgN(amount: number): string {
  return `₦${amount.toLocaleString()}`
}

export function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString('en-NG', { month: 'short', day: 'numeric', year: 'numeric' })
}
