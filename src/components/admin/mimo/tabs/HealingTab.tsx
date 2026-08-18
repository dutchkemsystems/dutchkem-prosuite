import type { MimoData } from '../useMimoData'
import { CommandOutput } from '../CommandOutput'

export function HealingTab({ mimo }: { mimo: MimoData }) {
  const { isDark, runHeal, runForceHeal, runVerify, manualFix, adminToken, setCommandOutput, commandOutput } = mimo

  return (
    <div className="space-y-4 md:space-y-6">
      <div className={`${isDark ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'} border rounded-2xl p-4 md:p-6`}>
        <h3 className={`text-base md:text-lg font-black ${isDark ? 'text-white' : 'text-slate-900'} mb-4`}>System Healing</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
          <button onClick={runHeal} className="px-4 md:px-6 py-3 md:py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs md:text-sm transition-all">
            🩹 Auto-Heal<br />
            <span className="text-[10px] md:text-xs font-normal opacity-75">Fix detected issues automatically</span>
          </button>
          <button onClick={runForceHeal} className="px-4 md:px-6 py-3 md:py-4 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-bold text-xs md:text-sm transition-all">
            ⚡ Force Heal<br />
            <span className="text-[10px] md:text-xs font-normal opacity-75">Deep repair with system reset</span>
          </button>
          <button onClick={runVerify} className="px-4 md:px-6 py-3 md:py-4 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-bold text-xs md:text-sm transition-all">
            ✅ Verify<br />
            <span className="text-[10px] md:text-xs font-normal opacity-75">Confirm system integrity</span>
          </button>
        </div>
      </div>

      <div className={`${isDark ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'} border rounded-2xl p-4 md:p-6`}>
        <h3 className={`text-base md:text-lg font-black ${isDark ? 'text-white' : 'text-slate-900'} mb-4`}>Manual Fixes</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
          <button onClick={async () => {
            try {
              const r = await manualFix({ adminToken, component: 'agents', fixType: 're_register_all', description: 'Re-register all agents' })
              setCommandOutput(JSON.stringify(r, null, 2))
            } catch (err) {
              setCommandOutput(`Error: ${err instanceof Error ? err.message : String(err)}`)
            }
          }} className="px-3 md:px-4 py-2 md:py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-bold text-xs md:text-sm transition-all">
            🤖 Re-register Agents
          </button>
          <button onClick={async () => {
            try {
              const r = await manualFix({ adminToken, component: 'wallets', fixType: 're_initialize', description: 'Re-initialize all wallets' })
              setCommandOutput(JSON.stringify(r, null, 2))
            } catch (err) {
              setCommandOutput(`Error: ${err instanceof Error ? err.message : String(err)}`)
            }
          }} className="px-3 md:px-4 py-2 md:py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-bold text-xs md:text-sm transition-all">
            💰 Re-init Wallets
          </button>
          <button onClick={async () => {
            try {
              const r = await manualFix({ adminToken, component: 'security', fixType: 'clear_expired_blocks', description: 'Clear expired IP blocks' })
              setCommandOutput(JSON.stringify(r, null, 2))
            } catch (err) {
              setCommandOutput(`Error: ${err instanceof Error ? err.message : String(err)}`)
            }
          }} className="px-3 md:px-4 py-2 md:py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-bold text-xs md:text-sm transition-all">
            🛡️ Clear Expired Blocks
          </button>
        </div>
      </div>

      <CommandOutput commandOutput={commandOutput} onClear={() => setCommandOutput(null)} title="Result" isDark={isDark} />
    </div>
  )
}