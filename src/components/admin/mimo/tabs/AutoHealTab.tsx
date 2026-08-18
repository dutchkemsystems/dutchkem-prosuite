import type { MimoData } from '../useMimoData'
import { CommandOutput } from '../CommandOutput'

export function AutoHealTab({ mimo }: { mimo: MimoData }) {
  const { isDark, autoHealStats, autoHealRuns, runSelfUpdate, commandOutput, setCommandOutput } = mimo

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        {[
          { label: 'Total Runs', value: autoHealStats?.totalRuns ?? 0, icon: '🔄', color: 'from-blue-500/20 to-blue-600/10' },
          { label: 'Success Rate', value: `${autoHealStats?.successRate ?? 100}%`, icon: '✅', color: 'from-emerald-500/20 to-emerald-600/10' },
          { label: 'Issues Fixed', value: autoHealStats?.totalIssuesFixed ?? 0, icon: '🔧', color: 'from-purple-500/20 to-purple-600/10' },
          { label: 'Critical Alerts', value: autoHealStats?.criticalAlerts ?? 0, icon: '🚨', color: 'from-red-500/20 to-red-600/10' },
        ].map((card) => (
          <div key={card.label} className={`bg-gradient-to-br ${card.color} ${isDark ? 'border-white/10' : 'border-slate-200'} border rounded-2xl p-4 md:p-5`}>
            <div className="text-xl md:text-2xl mb-2">{card.icon}</div>
            <div className={`text-xl md:text-2xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>{card.value}</div>
            <div className="text-[10px] md:text-xs text-slate-400 mt-1">{card.label}</div>
          </div>
        ))}
      </div>

      {/* Run Status Breakdown */}
      {autoHealStats?.runsByStatus && (
        <div className={`${isDark ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'} border rounded-2xl p-4 md:p-6`}>
          <h3 className={`text-base md:text-lg font-black ${isDark ? 'text-white' : 'text-slate-900'} mb-4`}>Run Status Breakdown</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            <div className="text-center p-2 md:p-3 bg-emerald-500/10 rounded-xl">
              <div className="text-xl md:text-2xl font-black text-emerald-400">{autoHealStats.runsByStatus.success}</div>
              <div className="text-[10px] md:text-xs text-slate-400">Success</div>
            </div>
            <div className="text-center p-2 md:p-3 bg-amber-500/10 rounded-xl">
              <div className="text-xl md:text-2xl font-black text-amber-400">{autoHealStats.runsByStatus.partial}</div>
              <div className="text-[10px] md:text-xs text-slate-400">Partial</div>
            </div>
            <div className="text-center p-2 md:p-3 bg-red-500/10 rounded-xl">
              <div className="text-xl md:text-2xl font-black text-red-400">{autoHealStats.runsByStatus.failed}</div>
              <div className="text-[10px] md:text-xs text-slate-400">Failed</div>
            </div>
            <div className="text-center p-2 md:p-3 bg-blue-500/10 rounded-xl">
              <div className="text-xl md:text-2xl font-black text-blue-400">{autoHealStats.runsByStatus.running}</div>
              <div className="text-[10px] md:text-xs text-slate-400">Running</div>
            </div>
          </div>
        </div>
      )}

      {/* Latest Run */}
      {autoHealStats?.latestRun && (
        <div className={`bg-gradient-to-br from-emerald-500/10 to-blue-500/10 ${isDark ? 'border-white/10' : 'border-slate-200'} border rounded-2xl p-4 md:p-6`}>
          <h3 className={`text-base md:text-lg font-black ${isDark ? 'text-white' : 'text-slate-900'} mb-3`}>Latest Run</h3>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
            <div>
              <span className={`px-3 py-1 rounded-full text-[10px] md:text-xs font-bold uppercase ${autoHealStats.latestRun.status === 'success' ? 'bg-emerald-500/20 text-emerald-400' : autoHealStats.latestRun.status === 'failed' ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'}`}>
                {autoHealStats.latestRun.status}
              </span>
              <span className={`text-xs md:text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'} ml-3`}>{autoHealStats.latestRun.runId}</span>
            </div>
            <div className="text-right text-[10px] md:text-xs text-slate-400">
              <div>{new Date(autoHealStats.latestRun.startedAt).toLocaleString()}</div>
              {autoHealStats.latestRun.durationMs && <div>{autoHealStats.latestRun.durationMs}ms</div>}
            </div>
          </div>
          {autoHealStats.latestRun.sections && (
            <div className="mt-3 flex flex-wrap gap-1.5 md:gap-2">
              {autoHealStats.latestRun.sections.map((s: any, i: number) => (
                <span key={i} className={`px-1.5 md:px-2 py-0.5 md:py-1 rounded text-[10px] md:text-xs font-bold ${s.status === 'ok' ? 'bg-emerald-500/20 text-emerald-400' : s.status === 'warn' ? 'bg-amber-500/20 text-amber-400' : 'bg-red-500/20 text-red-400'}`}>
                  {s.name}: {s.status}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Run History */}
      <div className={`${isDark ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'} border rounded-2xl p-4 md:p-6`}>
        <h3 className={`text-base md:text-lg font-black ${isDark ? 'text-white' : 'text-slate-900'} mb-4`}>Run History</h3>
        <div className="space-y-2 max-h-[30vh] md:max-h-[40vh] overflow-y-auto">
          {autoHealRuns?.map((run: any) => (
            <div key={run._id} className={`flex flex-col md:flex-row md:items-center justify-between p-3 ${isDark ? 'bg-white/5 hover:bg-white/10' : 'bg-slate-100 hover:bg-slate-200'} rounded-xl transition-colors gap-2`}>
              <div className="flex items-center gap-3">
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${run.status === 'success' ? 'bg-emerald-400' : run.status === 'failed' ? 'bg-red-400' : run.status === 'partial' ? 'bg-amber-400' : 'bg-blue-400'}`} />
                <div>
                  <span className={`text-xs md:text-sm ${isDark ? 'text-white' : 'text-slate-900'} font-medium`}>{run.runId}</span>
                  <div className="text-[10px] md:text-xs text-slate-400">
                    {run.issuesFound} issues found, {run.issuesFixed} fixed
                    {run.commitSha && ` • ${run.commitSha.slice(0, 7)}`}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <span className={`text-[10px] md:text-xs font-bold ${run.status === 'success' ? 'text-emerald-400' : run.status === 'failed' ? 'text-red-400' : 'text-amber-400'}`}>{run.status}</span>
                <div className="text-[10px] md:text-xs text-slate-500">{new Date(run.startedAt).toLocaleString()}</div>
              </div>
            </div>
          ))}
          {(!autoHealRuns || autoHealRuns.length === 0) && (
            <p className={`text-xs md:text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'} text-center py-4`}>No auto-heal runs recorded yet</p>
          )}
        </div>
      </div>

      {/* Self-Update Button */}
      <div className={`${isDark ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'} border rounded-2xl p-4 md:p-6`}>
        <h3 className={`text-base md:text-lg font-black ${isDark ? 'text-white' : 'text-slate-900'} mb-4`}>Maintenance</h3>
        <button onClick={runSelfUpdate} className="px-4 md:px-6 py-2 md:py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-xs md:text-sm transition-all">
          🔄 Run Self-Update
        </button>
        <p className={`text-[10px] md:text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'} mt-2`}>Cleans expired blocks, archives old data, optimizes thresholds</p>
      </div>

      <CommandOutput commandOutput={commandOutput} onClear={() => setCommandOutput(null)} isDark={isDark} />
    </div>
  )
}