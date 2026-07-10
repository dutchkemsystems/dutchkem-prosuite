import { useState } from 'react'
import { useMutation } from 'convex/react'
import { api } from '../../../../convex/_generated/api'

interface CronTabProps {
  adminToken: string
  cronJobs: any[]
  cronStats: any
  cronExecutions: any[]
  cronCategories: any
  isDark: boolean
  setCommandOutput: (v: string | null) => void
}

export function CronJobsTab({ adminToken, cronJobs, cronStats, cronExecutions, cronCategories, isDark, setCommandOutput }: CronTabProps) {
  const [cronSubTab, setCronSubTab] = useState<'overview' | 'jobs' | 'history' | 'categories'>('overview')
  const [cronCategoryFilter, setCronCategoryFilter] = useState<string | null>(null)
  const triggerCronJob = useMutation(api.mimo_core.triggerCronJob)
  const toggleCronJobMutation = useMutation(api.mimo_core.toggleCronJob)
  const seedCronJobsMutation = useMutation(api.mimo_core.seedCronJobs)

  return (
          <div className="space-y-6">
            {/* Cron Sub-Tabs */}
            <div className="flex gap-2 bg-white/5 border border-white/10 rounded-xl p-1">
              {[
                { id: 'overview' as const, label: 'Overview', icon: '📊' },
                { id: 'jobs' as const, label: 'All Jobs', icon: '⏰' },
                { id: 'history' as const, label: 'Execution History', icon: '📜' },
                { id: 'categories' as const, label: 'By Category', icon: '📁' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setCronSubTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    cronSubTab === tab.id
                      ? 'bg-orange-500 text-white'
                      : 'text-slate-400 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <span>{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>

            {/* Overview Sub-Tab */}
            {cronSubTab === 'overview' && (
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
                            for (const job of cronJobs.filter((j: any) => j.isEnabled)) {
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
            )}

            {/* All Jobs Sub-Tab */}
            {cronSubTab === 'jobs' && (
              <div className="space-y-6">
                {/* Category Filter */}
                <div className="flex items-center gap-3">
                  <span className="text-sm text-slate-400">Filter:</span>
                  <button
                    onClick={() => setCronCategoryFilter(null)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${!cronCategoryFilter ? 'bg-orange-500 text-white' : 'bg-white/5 text-slate-400 hover:text-white'}`}
                  >
                    All
                  </button>
                  {cronCategories && Object.keys(cronCategories).map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setCronCategoryFilter(cat)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold capitalize transition-all ${cronCategoryFilter === cat ? 'bg-orange-500 text-white' : 'bg-white/5 text-slate-400 hover:text-white'}`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                {/* Jobs List */}
                <div className="space-y-3">
                  {cronJobs
                    ?.filter((job: any) => !cronCategoryFilter || job.category === cronCategoryFilter)
                    .map((job: any) => (
                      <div key={job._id} className="bg-white/5 border border-white/10 rounded-2xl p-4 hover:bg-white/10 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className={`w-3 h-3 rounded-full ${job.isEnabled ? 'bg-emerald-400' : 'bg-slate-500'}`} />
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-black text-white">{job.name}</span>
                                <span className="text-xs px-2 py-0.5 bg-white/10 text-slate-400 rounded capitalize">{job.category}</span>
                                <span className="text-xs px-2 py-0.5 bg-white/10 text-slate-400 rounded">{job.scheduleType === 'cron' ? '📅' : '🔄'} {job.schedule}</span>
                              </div>
                              <div className="text-xs text-slate-400 mt-1">{job.description}</div>
                              <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                                <span>Runs: {job.totalRuns}</span>
                                <span className="text-emerald-400">✓ {job.successCount}</span>
                                {job.failureCount > 0 && <span className="text-red-400">✗ {job.failureCount}</span>}
                                {job.lastRunAt && <span>Last: {new Date(job.lastRunAt).toLocaleString()}</span>}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={async () => {
                                try {
                                  setCommandOutput(`Triggering: ${job.name}...`)
                                  const result = await triggerCronJob({ adminToken, cronJobId: job._id })
                                  setCommandOutput(JSON.stringify(result, null, 2))
                                } catch (err) {
                                  setCommandOutput(`Error: ${err instanceof Error ? err.message : String(err)}`)
                                }
                              }}
                              className="px-3 py-1.5 bg-blue-600/20 text-blue-400 rounded-lg text-xs font-bold hover:bg-blue-600/40 transition-all"
                            >
                              ▶ Run
                            </button>
                            <button
                              onClick={async () => {
                                try {
                                  await toggleCronJobMutation({ adminToken, cronJobId: job._id, isEnabled: !job.isEnabled })
                                  setCommandOutput(`${job.name} ${job.isEnabled ? 'disabled' : 'enabled'}`)
                                } catch (err) {
                                  setCommandOutput(`Error: ${err instanceof Error ? err.message : String(err)}`)
                                }
                              }}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                job.isEnabled
                                  ? 'bg-amber-600/20 text-amber-400 hover:bg-amber-600/40'
                                  : 'bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/40'
                              }`}
                            >
                              {job.isEnabled ? '⏸ Disable' : '▶ Enable'}
                            </button>
                          </div>
                        </div>
                        {job.lastRunStatus && (
                          <div className={`mt-2 text-xs ${job.lastRunStatus === 'success' ? 'text-emerald-400' : job.lastRunStatus === 'failed' ? 'text-red-400' : 'text-blue-400'}`}>
                            Last status: {job.lastRunStatus} {job.lastRunDurationMs && `(${job.lastRunDurationMs}ms)`}
                          </div>
                        )}
                      </div>
                    ))}
                  {(!cronJobs || cronJobs.length === 0) && (
                    <div className="text-center py-12 text-slate-400">
                      <p className="text-4xl mb-2">⏰</p>
                      <p className="font-bold">No cron jobs found</p>
                      <p className="text-sm mt-1">Click "Sync Cron Definitions" to import from crons.ts</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Execution History Sub-Tab */}
            {cronSubTab === 'history' && (
              <div className="space-y-6">
                {/* Status Filter */}
                <div className="flex items-center gap-3">
                  <span className="text-sm text-slate-400">Status:</span>
                  {['all', 'success', 'failed', 'running'].map((status) => (
                    <button
                      key={status}
                      onClick={() => {
                        // Would filter executions by status
                      }}
                      className={`px-3 py-1 rounded-lg text-xs font-bold capitalize transition-all bg-white/5 text-slate-400 hover:text-white`}
                    >
                      {status}
                    </button>
                  ))}
                </div>

                {/* Executions List */}
                <div className="space-y-2">
                  {cronExecutions?.map((exec: any) => (
                    <div key={exec._id} className="bg-white/5 border border-white/10 rounded-2xl p-4 hover:bg-white/10 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <span className={`w-3 h-3 rounded-full ${exec.status === 'success' ? 'bg-emerald-400' : exec.status === 'failed' ? 'bg-red-400' : 'bg-blue-400'}`} />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-black text-white">{exec.cronJobName}</span>
                              <span className={`text-xs px-2 py-0.5 rounded ${
                                exec.status === 'success' ? 'bg-emerald-500/20 text-emerald-400' :
                                exec.status === 'failed' ? 'bg-red-500/20 text-red-400' :
                                'bg-blue-500/20 text-blue-400'
                              }`}>
                                {exec.status}
                              </span>
                              <span className="text-xs px-2 py-0.5 bg-white/10 text-slate-400 rounded">
                                {exec.triggeredBy === 'manual' ? '👤 Manual' : '⏰ Scheduled'}
                              </span>
                            </div>
                            {exec.error && (
                              <div className="text-xs text-red-400 mt-1 font-mono">{exec.error}</div>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-bold text-white">
                            {exec.durationMs ? `${exec.durationMs}ms` : '—'}
                          </div>
                          <div className="text-xs text-slate-500">
                            {new Date(exec.startedAt).toLocaleString()}
                          </div>
                          {exec.completedAt && (
                            <div className="text-xs text-slate-500">
                              Duration: {Math.round((exec.completedAt - exec.startedAt) / 1000)}s
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  {(!cronExecutions || cronExecutions.length === 0) && (
                    <div className="text-center py-12 text-slate-400">
                      <p className="text-4xl mb-2">📜</p>
                      <p className="font-bold">No execution history</p>
                      <p className="text-sm mt-1">Cron jobs will appear here after they run</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Categories Sub-Tab */}
            {cronSubTab === 'categories' && (
              <div className="space-y-6">
                {cronCategories && Object.entries(cronCategories).map(([category, stats]: [string, any]) => (
                  <div key={category} className="bg-white/5 border border-white/10 rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-black text-white capitalize">{category}</h3>
                      <div className="flex items-center gap-4 text-sm">
                        <span className="text-slate-400">{stats.total} jobs</span>
                        <span className="text-emerald-400">{stats.enabled} enabled</span>
                        {stats.failed > 0 && <span className="text-red-400">{stats.failed} failing</span>}
                      </div>
                    </div>
                    <div className="space-y-2">
                      {cronJobs
                        ?.filter((job: any) => job.category === category)
                        .map((job: any) => (
                          <div key={job._id} className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                            <div className="flex items-center gap-3">
                              <span className={`w-2 h-2 rounded-full ${job.isEnabled ? 'bg-emerald-400' : 'bg-slate-500'}`} />
                              <span className="text-sm text-white font-medium">{job.name}</span>
                              <span className="text-xs text-slate-400">{job.schedule}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              {job.lastRunStatus && (
                                <span className={`text-xs ${job.lastRunStatus === 'success' ? 'text-emerald-400' : 'text-red-400'}`}>
                                  {job.lastRunStatus}
                                </span>
                              )}
                              <button
                                onClick={async () => {
                                  try {
                                    await triggerCronJob({ adminToken, cronJobId: job._id })
                                    setCommandOutput(`Triggered: ${job.name}`)
                                  } catch (err) {
                                    setCommandOutput(`Error: ${err instanceof Error ? err.message : String(err)}`)
                                  }
                                }}
                                className="px-2 py-1 bg-blue-600/20 text-blue-400 rounded text-xs font-bold hover:bg-blue-600/40"
                              >
                                ▶
                              </button>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                ))}
                {(!cronCategories || Object.keys(cronCategories).length === 0) && (
                  <div className="text-center py-12 text-slate-400">
                    <p className="text-4xl mb-2">📁</p>
                    <p className="font-bold">No categories found</p>
                    <p className="text-sm mt-1">Sync cron definitions first to populate categories</p>
                  </div>
                )}
              </div>
            )}

            {/* Command Output */}
            {commandOutput && (
              <div className="bg-slate-900 border border-white/10 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-bold text-slate-300">Result</h4>
                  <button onClick={() => setCommandOutput(null)} className="text-xs text-slate-500 hover:text-white">Clear</button>
                </div>
                <pre className="text-xs text-emerald-400 overflow-x-auto max-h-64 overflow-y-auto font-mono whitespace-pre-wrap">{commandOutput}</pre>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}