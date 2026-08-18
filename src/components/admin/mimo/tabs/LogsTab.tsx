import type { MimoData } from '../useMimoData'

export function LogsTab({ mimo }: { mimo: MimoData }) {
  const { recentLogs, logFilter, setLogFilter } = mimo

  return (
    <div className="space-y-6">
      {/* Filter */}
      <div className="flex items-center gap-3">
        <span className="text-sm text-slate-400">Filter:</span>
        {['all', 'critical', 'error', 'warning', 'info'].map((level) => (
          <button
            key={level}
            onClick={() => setLogFilter(level)}
            className={`px-3 py-1 rounded-lg text-xs font-bold capitalize transition-all ${
              logFilter === level ? 'bg-orange-500 text-white' : 'bg-white/5 text-slate-400 hover:text-white'
            }`}
          >
            {level}
          </button>
        ))}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Critical', value: recentLogs?.stats?.critical ?? 0, color: 'red' },
          { label: 'Error', value: recentLogs?.stats?.error ?? 0, color: 'amber' },
          { label: 'Warning', value: recentLogs?.stats?.warning ?? 0, color: 'yellow' },
          { label: 'Info', value: recentLogs?.stats?.info ?? 0, color: 'blue' },
        ].map((stat) => (
          <div key={stat.label} className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center">
            <div className={`text-2xl font-black text-${stat.color}-400`}>{stat.value}</div>
            <div className="text-xs text-slate-400">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Log List */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
        <h3 className="text-lg font-black text-white mb-4">Recent Logs</h3>
        <div className="space-y-2 max-h-[50vh] overflow-y-auto">
          {recentLogs?.logs
            ?.filter((log: any) => logFilter === 'all' || log.level === logFilter)
            .map((log: any) => (
              <div key={log.id} className="flex items-start gap-3 p-3 bg-white/5 rounded-xl">
                <span className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                  log.level === 'critical' ? 'bg-red-500' :
                  log.level === 'high' || log.level === 'error' ? 'bg-amber-500' :
                  log.level === 'medium' || log.level === 'warning' ? 'bg-yellow-500' :
                  'bg-blue-500'
                }`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2 py-0.5 rounded bg-white/10 text-slate-400 capitalize">{log.component}</span>
                    <span className={`text-xs px-2 py-0.5 rounded capitalize ${
                      log.level === 'critical' ? 'bg-red-500/20 text-red-400' :
                      log.level === 'high' || log.level === 'error' ? 'bg-amber-500/20 text-amber-400' :
                      'bg-blue-500/20 text-blue-400'
                    }`}>{log.level}</span>
                  </div>
                  <div className="text-sm text-white mt-1">{log.message}</div>
                  <div className="text-xs text-slate-500 mt-1">{new Date(log.timestamp).toLocaleString()}</div>
                </div>
              </div>
            ))}
          {(!recentLogs?.logs || recentLogs.logs.length === 0) && (
            <div className="text-center py-8 text-slate-400">
              <p className="text-4xl mb-2">📝</p>
              <p className="font-bold">No logs found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}