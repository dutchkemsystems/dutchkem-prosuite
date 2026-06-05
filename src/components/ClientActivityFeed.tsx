import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

export function ClientActivityFeed() {
  const activity = useQuery(api.composioClient.getActivityFeed, { limit: 15 });

  if (!activity) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8">
        <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-black text-white uppercase tracking-tight">Agent Activity</h3>
        <span className="text-[9px] text-purple-500 font-bold uppercase">Live Feed</span>
      </div>

      {activity.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-4xl mb-3">📡</p>
          <p className="text-sm text-slate-500 font-bold">No activity yet</p>
          <p className="text-[10px] text-slate-600 mt-1">Your agents will appear here once they start working</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-[400px] overflow-y-auto">
          {activity.map((item: any) => (
            <div
              key={item.id}
              className="flex items-center gap-4 p-4 bg-slate-950 rounded-2xl border border-white/5 hover:border-slate-700 transition-all"
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${
                item.status === "success" ? "bg-emerald-500/10" :
                item.status === "failed" ? "bg-red-500/10" : "bg-amber-500/10"
              }`}>
                {item.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-white truncate">{item.label}</p>
                <p className="text-[9px] text-slate-500">
                  {item.platformName} • {item.agentId ? `${item.agentId} • ` : ""}{new Date(item.timestamp).toLocaleString()}
                </p>
                {item.content && (
                  <p className="text-[10px] text-slate-400 mt-1 truncate italic">"{item.content}"</p>
                )}
              </div>
              <span className={`text-[8px] font-black uppercase px-2 py-1 rounded shrink-0 ${
                item.status === "success" ? "bg-emerald-500/10 text-emerald-500" :
                item.status === "failed" ? "bg-red-500/10 text-red-500" :
                "bg-amber-500/10 text-amber-500"
              }`}>
                {item.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
