import type { MimoData } from '../../useMimoData'

export function CronCategories({ mimo }: { mimo: MimoData }) {
  const { cronCategories, cronJobs, setCommandOutput, triggerCronJob, adminToken } = mimo

  return (
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
  )
}