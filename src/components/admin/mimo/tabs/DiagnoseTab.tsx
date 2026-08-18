import type { MimoData } from '../useMimoData'
import { CommandOutput } from '../CommandOutput'

export function DiagnoseTab({ mimo }: { mimo: MimoData }) {
  const { isDark, healthLogs, runDiagnose, statusColor, commandOutput, setCommandOutput } = mimo

  return (
    <div className="space-y-4 md:space-y-6">
      <div className={`${isDark ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'} border rounded-2xl p-4 md:p-6`}>
        <h3 className={`text-base md:text-lg font-black ${isDark ? 'text-white' : 'text-slate-900'} mb-4`}>System Diagnosis</h3>
        <p className={`text-xs md:text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'} mb-4`}>Run comprehensive checks across all system components: database, agents, payments, security, and external services.</p>
        <button onClick={runDiagnose} className="px-4 md:px-6 py-2 md:py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-xs md:text-sm transition-all">
          🔍 Run Full Diagnosis
        </button>
      </div>

      {healthLogs && healthLogs.length > 0 && (
        <div className={`${isDark ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'} border rounded-2xl p-4 md:p-6`}>
          <h3 className={`text-base md:text-lg font-black ${isDark ? 'text-white' : 'text-slate-900'} mb-4`}>Recent Health Checks</h3>
          <div className="space-y-2">
            {healthLogs.map((log: any) => (
              <div key={log._id} className={`flex flex-col md:flex-row md:items-center justify-between p-3 ${isDark ? 'bg-white/5' : 'bg-slate-100'} rounded-xl gap-2`}>
                <div className="flex items-center gap-3">
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${log.status === 'healthy' ? 'bg-emerald-400' : log.status === 'degraded' ? 'bg-amber-400' : 'bg-red-400'}`} />
                  <span className={`text-xs md:text-sm ${isDark ? 'text-white' : 'text-slate-900'} font-medium`}>{log.component}</span>
                  <span className="text-[10px] md:text-xs text-slate-400 truncate max-w-[150px] md:max-w-none">{log.details}</span>
                </div>
                <div className="text-right">
                  <span className={`text-[10px] md:text-xs font-bold ${statusColor(log.severity)}`}>{log.severity}</span>
                  <div className="text-[10px] md:text-xs text-slate-500">{new Date(log.timestamp).toLocaleString()}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <CommandOutput commandOutput={commandOutput} onClear={() => setCommandOutput(null)} title="Diagnosis Result" isDark={true} />
    </div>
  )
}