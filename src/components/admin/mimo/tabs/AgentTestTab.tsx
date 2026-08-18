import type { MimoData } from '../useMimoData'
import { CommandOutput } from '../CommandOutput'

export function AgentTestTab({ mimo }: { mimo: MimoData }) {
  const {
    isDark, agentTestConfig, agentTestResults, testAllAgentsMutation,
    adminToken, commandOutput, setCommandOutput,
  } = mimo

  return (
    <div className="space-y-4 md:space-y-6">
      <div className={`${isDark ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'} border rounded-2xl p-4 md:p-6`}>
        <h3 className={`text-base md:text-lg font-black ${isDark ? 'text-white' : 'text-slate-900'} mb-4`}>Agent Testing</h3>
        <p className={`text-xs md:text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'} mb-4`}>
          Test all registered agents against their configured models and capabilities.
          {agentTestConfig?.enabled ? ' Automated testing is enabled.' : ' Automated testing is disabled.'}
        </p>
        <button
          onClick={async () => {
            setCommandOutput('Testing all agents...')
            try {
              const result = await testAllAgentsMutation({ adminToken })
              setCommandOutput(JSON.stringify(result, null, 2))
            } catch (err) {
              setCommandOutput(`Error: ${err instanceof Error ? err.message : String(err)}`)
            }
          }}
          className="px-4 md:px-6 py-2 md:py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-xs md:text-sm transition-all"
        >
          🧪 Test All Agents
        </button>
      </div>

      {/* Test Results */}
      <div className={`${isDark ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'} border rounded-2xl p-4 md:p-6`}>
        <h3 className={`text-base md:text-lg font-black ${isDark ? 'text-white' : 'text-slate-900'} mb-4`}>Recent Test Results ({agentTestResults?.length || 0})</h3>
        <div className="space-y-2">
          {(agentTestResults as any[] | undefined)?.map((result: any) => (
            <div key={result._id} className={`flex flex-col md:flex-row md:items-center justify-between p-3 ${isDark ? 'bg-white/5' : 'bg-slate-100'} rounded-xl gap-2`}>
              <div className="flex items-center gap-3">
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${result.status === 'pass' ? 'bg-emerald-400' : result.status === 'fail' ? 'bg-red-400' : 'bg-amber-400'}`} />
                <div>
                  <span className={`text-xs md:text-sm ${isDark ? 'text-white' : 'text-slate-900'} font-medium`}>{result.agentId}</span>
                  <div className="text-[10px] md:text-xs text-slate-400">{result.capability}</div>
                </div>
              </div>
              <div className="text-right">
                <span className={`text-[10px] md:text-xs font-bold ${result.status === 'pass' ? 'text-emerald-400' : result.status === 'fail' ? 'text-red-400' : 'text-amber-400'}`}>{result.status}</span>
                <div className="text-[10px] md:text-xs text-slate-500">{new Date(result.timestamp).toLocaleString()}</div>
              </div>
            </div>
          ))}
          {(!agentTestResults || agentTestResults.length === 0) && (
            <p className={`text-xs md:text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'} text-center py-4`}>No test results yet. Run "Test All Agents" to begin.</p>
          )}
        </div>
      </div>

      <CommandOutput commandOutput={commandOutput} onClear={() => setCommandOutput(null)} isDark={isDark} />
    </div>
  )
}