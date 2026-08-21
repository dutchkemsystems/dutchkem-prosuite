import { useSuspenseQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { api } from '../../../../convex/_generated/api'
import { StatCard } from './shared'

// ─── AUTO-ENGAGE TAB ──────────────────────────────────────────

export function AutoEngageTab({ adminToken }: { adminToken: string }) {
  const { data: logs } = useSuspenseQuery(convexQuery(api.revenue_social.getEngagementLogs, adminToken ? { adminToken, limit: 100 } : 'skip'))

  const totalEngagements = (logs ?? []).length
  const buyingIntent = (logs ?? []).filter((l: any) => (l.buyingIntent ?? 0) >= 40).length
  const autoReplied = (logs ?? []).filter((l: any) => l.autoReplied).length
  const converted = (logs ?? []).filter((l: any) => l.converted).length

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon="🤖" value={totalEngagements} label="Total Engagements" color="from-blue-500/20 to-blue-600/10" />
        <StatCard icon="🎯" value={buyingIntent} label="Buying Intent" color="from-orange-500/20 to-orange-600/10" />
        <StatCard icon="💬" value={autoReplied} label="Auto-Replied" color="from-emerald-500/20 to-emerald-600/10" />
        <StatCard icon="💰" value={converted} label="Converted" color="from-purple-500/20 to-purple-600/10" />
      </div>

      <div>
        <h3 className="text-lg font-bold text-white mb-3">Engagement Logs</h3>
        <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
          <div className="grid grid-cols-[auto_1fr_1fr_auto_auto_auto] px-5 py-3 border-b border-white/5 text-sm text-slate-400 font-medium">
            <div>Platform</div>
            <div>Comment</div>
            <div>Reply</div>
            <div>Intent</div>
            <div>Auto</div>
            <div>Converted</div>
          </div>
          {(logs ?? []).slice(0, 50).map((log: any) => (
            <div key={log._id} className="grid grid-cols-[auto_1fr_1fr_auto_auto_auto] px-5 py-3 border-b border-white/5 hover:bg-white/5 transition-colors text-sm">
              <div className="text-white">{log.platform}</div>
              <div className="text-slate-300 truncate max-w-[200px]">{log.commentText ?? '—'}</div>
              <div className="text-slate-400 truncate max-w-[200px]">{log.replyText ?? '—'}</div>
              <div className={`font-bold ${log.buyingIntent >= 40 ? 'text-[#FF6B35]' : 'text-slate-400'}`}>{log.buyingIntent ?? 0}</div>
              <div>{log.autoReplied ? '✅' : '—'}</div>
              <div>{log.converted ? '✅' : '—'}</div>
            </div>
          ))}
          {(!logs || logs.length === 0) && (
            <div className="px-5 py-8 text-center text-slate-500 text-sm">No engagement logs yet</div>
          )}
        </div>
      </div>
    </div>
  )
}
