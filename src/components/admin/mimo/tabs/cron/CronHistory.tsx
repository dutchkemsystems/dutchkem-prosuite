import type { MimoData } from '../../useMimoData'

export function CronHistory({ mimo }: { mimo: MimoData }) {
  const { cronExecutions } = mimo

  return (
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
  )
}