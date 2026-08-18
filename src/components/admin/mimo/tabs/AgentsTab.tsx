import type { MimoData } from '../useMimoData'

export function AgentsTab({ mimo }: { mimo: MimoData }) {
  const { isDark, agents, statusColor, suspendAgentMutation, deleteAgentMutation, adminToken } = mimo

  return (
    <div className="space-y-4 md:space-y-6">
      <div className={`${isDark ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'} border rounded-2xl p-4 md:p-6`}>
        <h3 className={`text-base md:text-lg font-black ${isDark ? 'text-white' : 'text-slate-900'} mb-4`}>Agent Registry ({agents?.length || 0} agents)</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
          {agents?.map((agent: any) => (
            <div key={agent._id} className={`${isDark ? 'bg-white/5 border-white/10' : 'bg-white border-slate-200'} border rounded-xl p-3 md:p-4`}>
              <div className="flex items-center justify-between mb-2">
                <span className={`text-xs md:text-sm font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>{agent.agentId} — {agent.agentName}</span>
                <span className={`text-[10px] md:text-xs font-bold ${statusColor(agent.status)}`}>{agent.status}</span>
              </div>
              <div className="text-[10px] md:text-xs text-slate-400 mb-2 truncate">
                Capabilities: {agent.capabilities?.join(', ')}
              </div>
              <div className="flex items-center gap-3 md:gap-4 text-[10px] md:text-xs text-slate-400">
                <span>Health: {agent.healthScore}%</span>
                <span>Tasks: {agent.totalTasks}</span>
              </div>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={async () => {
                    try {
                      await suspendAgentMutation({ adminToken, agentId: agent.agentId })
                    } catch (err) {
                      console.error('[Mimo] Failed to suspend agent:', err)
                    }
                  }}
                  className="px-2 md:px-3 py-1 bg-amber-600/20 text-amber-400 rounded-lg text-[10px] md:text-xs font-bold hover:bg-amber-600/40"
                >
                  Suspend
                </button>
                <button
                  onClick={async () => {
                    if (window.confirm(`Delete agent ${agent.agentId}?`)) {
                      try {
                        await deleteAgentMutation({ adminToken, agentId: agent.agentId })
                      } catch (err) {
                        console.error('[Mimo] Failed to delete agent:', err)
                      }
                    }
                  }}
                  className="px-2 md:px-3 py-1 bg-red-600/20 text-red-400 rounded-lg text-[10px] md:text-xs font-bold hover:bg-red-600/40"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}