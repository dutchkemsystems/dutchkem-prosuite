interface HistoryTabProps {
  commands: any[]
  auditLogs: any[]
  isDark: boolean
}

export function HistoryTab({ commands, auditLogs, isDark }: HistoryTabProps) {
  return (
          <div className="space-y-4 md:space-y-6">
            <div className={`${isDark ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'} border rounded-2xl p-4 md:p-6`}>
              <h3 className={`text-base md:text-lg font-black ${isDark ? 'text-white' : 'text-slate-900'} mb-4`}>Command History</h3>
              <div className="space-y-2">
                {commands?.map((cmd: any) => (
                  <div key={cmd._id} className={`flex flex-col md:flex-row md:items-center justify-between p-3 ${isDark ? 'bg-white/5' : 'bg-slate-100'} rounded-xl gap-2`}>
                    <div className="flex items-center gap-2 md:gap-3">
                      <span className={`text-[10px] md:text-xs font-bold px-2 py-1 rounded ${cmd.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400' : cmd.status === 'failed' ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'}`}>
                        {cmd.status}
                      </span>
                      <span className={`text-xs md:text-sm ${isDark ? 'text-white' : 'text-slate-900'} font-medium truncate max-w-[150px] md:max-w-none`}>{cmd.command}</span>
                      <span className="text-[10px] md:text-xs text-slate-400 hidden sm:inline">by {cmd.issuedBy}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] md:text-xs text-slate-500">{new Date(cmd.startedAt).toLocaleString()}</div>
                      {cmd.durationMs && <div className="text-[10px] md:text-xs text-slate-500">{cmd.durationMs}ms</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className={`${isDark ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'} border rounded-2xl p-4 md:p-6`}>
              <h3 className={`text-base md:text-lg font-black ${isDark ? 'text-white' : 'text-slate-900'} mb-4`}>Audit Logs</h3>
              <div className="space-y-2">
                {auditLogs?.map((log: any) => (
                  <div key={log._id} className={`flex flex-col md:flex-row md:items-center justify-between p-3 ${isDark ? 'bg-white/5' : 'bg-slate-100'} rounded-xl gap-2`}>
                    <div className="flex items-center gap-2 md:gap-3">
                      <span className="text-[10px] md:text-xs text-slate-400">{log.action}</span>
                      <span className={`text-xs md:text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>{log.actor}</span>
                      {log.target && <span className="text-[10px] md:text-xs text-slate-400">→ {log.target}</span>}
                    </div>
                    <div className="text-[10px] md:text-xs text-slate-500">{new Date(log.timestamp).toLocaleString()}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}