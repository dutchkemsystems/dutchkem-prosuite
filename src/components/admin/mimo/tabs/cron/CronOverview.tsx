import type { MimoData } from '../../useMimoData'

export function CronOverview({ mimo }: { mimo: MimoData }) {
  const {
    cronStats, cronExecutions, cronCategories, cronJobs, setCronSubTab,
    setCronCategoryFilter, setCommandOutput, seedCronJobsMutation,
    triggerCronJob, adminToken,
  } = mimo

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Jobs', value: cronStats?.totalJobs ?? 0, icon: '⏰', color: 'from-blue-500/20 to-blue-600/10' },
          { label: 'Enabled', value: cronStats?.enabledJobs ?? 0, icon: '✅', color: 'from-emerald-500/20 to-emerald-600/10' },
          { label: 'Executions (24h)', value: cronStats?.executions24h ?? 0, icon: '🔄', color: 'from-purple-500/20 to-purple-600/10' },
          { label: 'Failed (24h)', value: cronStats?.failed24h ?? 0, icon: '❌', color: 'from-red-500/20 to-red-600/10' },
        ].map((card) => (
          <div key={card.label} className={`bg-gradient-to-br ${card.color} border border-white/10 rounded-2xl p-5`}>
            <div className="text-2xl mb-2">{card.icon}</div>
            <div className="text-2xl font-black text-white">{card.value}</div>
            <div className="text-xs text-slate-400 mt-1">{card.label}</div>
          </div>
        ))}
      </div>

      {/* Success Rate & Avg Duration */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
          <div className="text-sm text-slate-400 mb-2">Success Rate (24h)</div>
          <div className="flex items-end gap-2">
            <span className="text-3xl font-black text-emerald-400">
              {cronStats?.executions24h ? Math.round((cronStats.success24h / cronStats.executions24h) * 100) : 100}%
            </span>
            <span className="text-xs text-slate-500 mb-1">({cronStats?.success24h ?? 0}/{cronStats?.executions24h ?? 0})</span>
          </div>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
          <div className="text-sm text-slate-400 mb-2">Avg Duration (24h)</div>
          <span className="text-3xl font-black text-blue-400">{cronStats?.avgDurationMs ?? 0}ms</span>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
        <h3 className="text-lg font-black text-white mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <button
            onClick={async () => {
              try {
                const result = await seedCronJobsMutation({ adminToken })
                setCommandOutput(JSON.stringify(result, null, 2))
              } catch (err) {
                setCommandOutput(`Error: ${err instanceof Error ? err.message : String(err)}`)
              }
            }}
            className="px-4 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-sm transition-all"
          >
            🔄 Sync Cron Definitions
          </button>
          <button
            onClick={async () => {
              try {
                // Trigger all enabled jobs
                if (cronJobs) {
                  let triggered = 0
                  for (const job of cronJobs.filter((j: any) => j.isEnabled) as Array<any>) {
                    await triggerCronJob({ adminToken, cronJobId: job._id })
                    triggered++
                  }
                  setCommandOutput(`Triggered ${triggered} jobs`)
                }
              } catch (err) {
                setCommandOutput(`Error: ${err instanceof Error ? err.message : String(err)}`)
              }
            }}
            className="px-4 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-sm transition-all"
          >
            ⚡ Trigger All Enabled
          </button>
          <button
            onClick={() => setCronSubTab('jobs')}
            className="px-4 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-bold text-sm transition-all"
          >
            📋 View All Jobs
          </button>
        </div>
      </div>

      {/* Category Breakdown */}
      {cronCategories && Object.keys(cronCategories).length > 0 && (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <h3 className="text-lg font-black text-white mb-4">Jobs by Category</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(cronCategories).map(([category, stats]: [string, any]) => (
              <div
                key={category}
                className="bg-white/5 border border-white/10 rounded-xl p-4 cursor-pointer hover:bg-white/10 transition-colors"
                onClick={() => {
                  setCronCategoryFilter(category)
                  setCronSubTab('jobs')
                }}
              >
                <div className="text-sm font-bold text-white capitalize mb-2">{category}</div>
                <div className="flex items-center gap-4 text-xs text-slate-400">
                  <span>{stats.total} total</span>
                  <span className="text-emerald-400">{stats.enabled} active</span>
                </div>
                {stats.failed > 0 && (
                  <div className="text-xs text-red-400 mt-1">{stats.failed} with failures</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Executions */}
      {cronExecutions && cronExecutions.length > 0 && (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-black text-white">Recent Executions</h3>
            <button
              onClick={() => setCronSubTab('history')}
              className="text-xs text-orange-400 hover:text-orange-300"
            >
              View All →
            </button>
          </div>
          <div className="space-y-2 max-h-[30vh] overflow-y-auto">
            {cronExecutions.slice(0, 10).map((exec: any) => (
              <div key={exec._id} className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                <div className="flex items-center gap-3">
                  <span className={`w-2 h-2 rounded-full ${exec.status === 'success' ? 'bg-emerald-400' : exec.status === 'failed' ? 'bg-red-400' : 'bg-blue-400'}`} />
                  <div>
                    <span className="text-sm text-white font-medium">{exec.cronJobName}</span>
                    <div className="text-xs text-slate-400">
                      {exec.triggeredBy === 'manual' ? '👤 Manual' : '⏰ Scheduled'}
                      {exec.durationMs && ` • ${exec.durationMs}ms`}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`text-xs font-bold ${exec.status === 'success' ? 'text-emerald-400' : exec.status === 'failed' ? 'text-red-400' : 'text-blue-400'}`}>
                    {exec.status}
                  </span>
                  <div className="text-xs text-slate-500">{new Date(exec.startedAt).toLocaleString()}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}