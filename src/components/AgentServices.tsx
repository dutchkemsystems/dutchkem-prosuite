import { useSuspenseQuery } from "@tanstack/react-query";
import { convexQuery } from "@convex-dev/react-query";
import { api } from "../../convex/_generated/api";

export function AgentServices({ agentId, onSelect }: { agentId: string, onSelect: (name: string) => void }) {
  const { data: services } = useSuspenseQuery(convexQuery(api.updates.getAgentServices, { agent_id: agentId })) as any;

  const isNew = (timestamp: number) => {
    const thirtyDays = 30 * 24 * 60 * 60 * 1000;
    return Date.now() - timestamp < thirtyDays;
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
      {services.map((s: any) => (
        <button 
          key={s._id}
          onClick={() => onSelect(s.name)}
          className="flex items-center gap-3 p-4 bg-slate-800/50 border border-slate-700/50 rounded-2xl hover:bg-slate-800 hover:border-slate-500 transition-all text-left group relative overflow-hidden"
        >
          <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-xl shadow-inner group-hover:scale-110 transition-transform">
            {s.icon}
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-100">{s.name}</span>
              {isNew(s.added_at) && (
                <span className="text-[8px] font-black bg-orange-600 text-white px-1.5 py-0.5 rounded-full uppercase tracking-widest animate-pulse">
                  NEW
                </span>
              )}
            </div>
            <span className="text-[10px] text-slate-500 line-clamp-1">{s.description}</span>
          </div>
          
          <div className="absolute inset-0 bg-gradient-to-r from-orange-500/0 via-orange-500/0 to-orange-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
        </button>
      ))}
    </div>
  );
}
