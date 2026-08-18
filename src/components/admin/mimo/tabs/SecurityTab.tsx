import type { MimoData } from '../useMimoData'
import { CommandOutput } from '../CommandOutput'

export function SecurityTab({ mimo }: { mimo: MimoData }) {
  const { isDark, runSecurityScan, securityEvents, statusColor, commandOutput, setCommandOutput } = mimo

  return (
    <div className="space-y-4 md:space-y-6">
      <div className={`${isDark ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'} border rounded-2xl p-4 md:p-6`}>
        <h3 className={`text-base md:text-lg font-black ${isDark ? 'text-white' : 'text-slate-900'} mb-4`}>Security Operations</h3>
        <button onClick={runSecurityScan} className="px-4 md:px-6 py-2 md:py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold text-xs md:text-sm transition-all">
          🛡️ Run Security Scan
        </button>
      </div>

      {securityEvents && securityEvents.length > 0 && (
        <div className={`${isDark ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'} border rounded-2xl p-4 md:p-6`}>
          <h3 className={`text-base md:text-lg font-black ${isDark ? 'text-white' : 'text-slate-900'} mb-4`}>Security Events</h3>
          <div className="space-y-2">
            {securityEvents.map((event: any) => (
              <div key={event._id} className={`flex flex-col md:flex-row md:items-center justify-between p-3 ${isDark ? 'bg-white/5' : 'bg-slate-100'} rounded-xl gap-2`}>
                <div className="flex items-center gap-3">
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${event.blocked ? 'bg-red-400' : 'bg-amber-400'}`} />
                  <div>
                    <span className={`text-xs md:text-sm ${isDark ? 'text-white' : 'text-slate-900'} font-medium`}>{event.eventType.replace(/_/g, ' ')}</span>
                    <div className="text-[10px] md:text-xs text-slate-400 truncate max-w-[200px] md:max-w-none">{event.description}</div>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`text-[10px] md:text-xs font-bold ${statusColor(event.severity)}`}>{event.severity}</span>
                  <div className="text-[10px] md:text-xs text-slate-500">{new Date(event.timestamp).toLocaleString()}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <CommandOutput commandOutput={commandOutput} onClear={() => setCommandOutput(null)} title="Scan Result" isDark={true} />
    </div>
  )
}