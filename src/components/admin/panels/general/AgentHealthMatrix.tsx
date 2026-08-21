export function AgentHealthMatrix({ data }: { data: any }) {
  const agentHealth = data?.agentHealth || [];
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-[3rem] overflow-hidden shadow-2xl">
      <div className="p-10 border-b border-slate-800 flex justify-between items-center">
        <h2 className="text-xl font-black uppercase tracking-tighter">Institutional Agent Health Monitor</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-slate-800">
              <th className="p-4 text-[9px] font-black text-slate-500 uppercase tracking-widest">Agent</th>
              <th className="p-4 text-[9px] font-black text-slate-500 uppercase tracking-widest">Status</th>
              <th className="p-4 text-[9px] font-black text-slate-500 uppercase tracking-widest">Uptime</th>
              <th className="p-4 text-[9px] font-black text-slate-500 uppercase tracking-widest">Latency</th>
            </tr>
          </thead>
          <tbody>
            {agentHealth.map((agent: any, i: number) => (
              <tr key={i} className="border-b border-white/5 hover:bg-slate-800/50 transition-colors">
                <td className="p-4 text-sm font-bold text-white">{agent.name || `Agent ${i + 1}`}</td>
                <td className="p-4">
                  <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase ${agent.status === 'healthy' ? 'bg-emerald-500/10 text-emerald-500' : agent.status === 'degraded' ? 'bg-amber-500/10 text-amber-500' : 'bg-red-500/10 text-red-500'}`}>
                    {agent.status || 'unknown'}
                  </span>
                </td>
                <td className="p-4 text-sm text-slate-400">{agent.uptime || 'N/A'}</td>
                <td className="p-4 text-sm text-slate-400">{agent.latency || 'N/A'}</td>
              </tr>
            ))}
            {agentHealth.length === 0 && (
              <tr><td colSpan={4} className="p-10 text-center text-slate-600 font-bold uppercase tracking-widest italic opacity-30">No agent data available</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
