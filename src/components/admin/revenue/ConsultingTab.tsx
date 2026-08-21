import { useSuspenseQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { api } from '../../../../convex/_generated/api'
import { StatCard, formatNgN } from './shared'

// ─── CONSULTING TAB ───────────────────────────────────────────

export function ConsultingTab({ adminToken }: { adminToken: string }) {
  const { data: stats } = useSuspenseQuery(convexQuery(api.revenue_outcomes.getConsultingStats, adminToken ? { adminToken } : 'skip'))
  const { data: bookings } = useSuspenseQuery(convexQuery(api.revenue_outcomes.getConsultingBookings, adminToken ? { adminToken } : 'skip'))

  const services = [
    { name: 'Setup & Configuration', price: formatNgN(200000), icon: '⚙️' },
    { name: 'Custom Agent Development', price: formatNgN(500000), icon: '🤖' },
    { name: 'Team Training', price: formatNgN(100000), icon: '📚' },
    { name: 'Monthly Retainer', price: formatNgN(300000), icon: '📅' },
    { name: 'Strategy Consulting', price: formatNgN(500000), icon: '🎯' },
  ]

  const statusColor: Record<string, string> = {
    pending: 'bg-yellow-500/20 text-yellow-400',
    completed: 'bg-emerald-500/20 text-emerald-400',
    cancelled: 'bg-red-500/20 text-red-400',
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon="📋" value={stats?.totalBookings ?? 0} label="Total Bookings" color="from-blue-500/20 to-blue-600/10" />
        <StatCard icon="⏳" value={stats?.pendingBookings ?? 0} label="Pending" color="from-yellow-500/20 to-yellow-600/10" />
        <StatCard icon="✅" value={stats?.completedBookings ?? 0} label="Completed" color="from-emerald-500/20 to-emerald-600/10" />
        <StatCard icon="💰" value={formatNgN(stats?.totalRevenue ?? 0)} label="Revenue" color="from-orange-500/20 to-orange-600/10" />
      </div>

      <div>
        <h3 className="text-lg font-bold text-white mb-3">Service Types</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {services.map((s) => (
            <div key={s.name} className="bg-white/5 border border-white/10 rounded-2xl p-5 hover:border-white/20 transition-all">
              <span className="text-2xl">{s.icon}</span>
              <div className="text-white font-bold mt-3">{s.name}</div>
              <div className="text-[#FF6B35] font-black mt-1">{s.price}</div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-lg font-bold text-white mb-3">Bookings</h3>
        <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
          <div className="grid grid-cols-[1fr_auto_auto_auto] px-5 py-3 border-b border-white/5 text-sm text-slate-400 font-medium">
            <div>Client</div>
            <div>Service</div>
            <div>Amount</div>
            <div>Status</div>
          </div>
          {(bookings ?? []).map((b: any) => (
            <div key={b._id} className="grid grid-cols-[1fr_auto_auto_auto] px-5 py-3 border-b border-white/5 hover:bg-white/5 transition-colors text-sm">
              <div className="text-white truncate max-w-[160px]">{b.clientId}</div>
              <div className="text-slate-300">{b.serviceType?.replace(/_/g, ' ')}</div>
              <div className="text-[#FF6B35] font-bold">{formatNgN(b.priceNgN ?? 0)}</div>
              <div className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusColor[b.status] ?? 'bg-slate-500/20 text-slate-400'}`}>{b.status}</div>
            </div>
          ))}
          {(!bookings || bookings.length === 0) && (
            <div className="px-5 py-8 text-center text-slate-500 text-sm">No bookings yet</div>
          )}
        </div>
      </div>
    </div>
  )
}
