import type { MimoData } from '../../useMimoData'

export function CronJobsList({ mimo }: { mimo: MimoData }) {
  const {
    cronJobs, cronCategories, cronCategoryFilter, setCronCategoryFilter,
    setCommandOutput, triggerCronJob, toggleCronJobMutation, adminToken,
  } = mimo

  return (
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
  )
}