import type { MimoData } from '../useMimoData'
import { CommandOutput } from '../CommandOutput'

export function DashboardTab({ mimo }: { mimo: MimoData }) {
  const {
    isDark, coreState, stats, commandOutput, setCommandOutput, statusColor,
    runDiagnose, runHeal, runSecurityScan, runVerify, runForceHeal, runDeploy,
  } = mimo

  return (
    <div className="space-y-6">
      {/* Core Status */}
      <div className={`${isDark ? 'bg-gradient-to-br from-emerald-500/10 to-blue-500/10 border-white/10' : 'bg-gradient-to-br from-emerald-50 to-blue-50 border-slate-200'} border rounded-2xl p-4 md:p-6`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className={`text-base md:text-lg font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>Mimo Core v{coreState?.version || '2.5'}</h3>
          <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${statusColor(coreState?.status || 'operational')}`}>
            {coreState?.status || 'operational'}
          </span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          <div>
            <div className={`text-2xl md:text-3xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>{coreState?.overallHealth ?? 100}%</div>
            <div className="text-xs text-slate-400">Health Score</div>
          </div>
          <div>
            <div className={`text-2xl md:text-3xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>{stats?.agentCount ?? 0}</div>
            <div className="text-xs text-slate-400">Active Agents</div>
          </div>
          <div>
            <div className={`text-2xl md:text-3xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>{coreState?.totalDiagnoses ?? 0}</div>
            <div className="text-xs text-slate-400">Diagnoses Run</div>
          </div>
          <div>
            <div className={`text-2xl md:text-3xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>{coreState?.totalHeals ?? 0}</div>
            <div className="text-xs text-slate-400">Heals Performed</div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        {[
          { label: 'Health Logs (24h)', value: stats?.healthLogs24h ?? 0, icon: '📋', color: 'from-blue-500/20 to-blue-600/10' },
          { label: 'Security Events (24h)', value: stats?.securityEvents24h ?? 0, icon: '🛡️', color: 'from-red-500/20 to-red-600/10' },
          { label: 'Commands (24h)', value: stats?.commands24h ?? 0, icon: '⚡', color: 'from-purple-500/20 to-purple-600/10' },
          { label: 'Critical Events', value: stats?.criticalEvents ?? 0, icon: '🚨', color: 'from-amber-500/20 to-amber-600/10' },
        ].map((card) => (
          <div key={card.label} className={`bg-gradient-to-br ${card.color} ${isDark ? 'border-white/10' : 'border-slate-200'} border rounded-2xl p-4 md:p-5`}>
            <div className="text-xl md:text-2xl mb-2">{card.icon}</div>
            <div className={`text-xl md:text-2xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>{card.value}</div>
            <div className="text-[10px] md:text-xs text-slate-400 mt-1">{card.label}</div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className={`${isDark ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'} border rounded-2xl p-4 md:p-6`}>
        <h3 className={`text-base md:text-lg font-black ${isDark ? 'text-white' : 'text-slate-900'} mb-4`}>Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-3">
          <button onClick={runDiagnose} className="px-3 md:px-4 py-2 md:py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-xs md:text-sm transition-all">
            🔍 Run Diagnosis
          </button>
          <button onClick={runHeal} className="px-3 md:px-4 py-2 md:py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs md:text-sm transition-all">
            🩹 Auto-Heal
          </button>
          <button onClick={runSecurityScan} className="px-3 md:px-4 py-2 md:py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold text-xs md:text-sm transition-all">
            🛡️ Security Scan
          </button>
          <button onClick={runVerify} className="px-3 md:px-4 py-2 md:py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-bold text-xs md:text-sm transition-all">
            ✅ Verify System
          </button>
          <button onClick={runForceHeal} className="px-3 md:px-4 py-2 md:py-3 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-bold text-xs md:text-sm transition-all">
            ⚡ Force Heal
          </button>
          <button onClick={() => runDeploy("all", "standard")} className="px-3 md:px-4 py-2 md:py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-xs md:text-sm transition-all">
            🚀 Deploy All
          </button>
        </div>
      </div>

      {/* Command Output */}
      <CommandOutput commandOutput={commandOutput} onClear={() => setCommandOutput(null)} isDark={isDark} />
    </div>
  )
}