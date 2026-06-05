import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";

export function ClientQuickActions() {
  const actions = useQuery(api.composioClient.getQuickActions, {});
  const triggerAction = useMutation(api.composioClient.triggerQuickAction);
  const [triggering, setTriggering] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<{ actionId: string; message: string } | null>(null);

  if (!actions) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8">
        <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const handleTrigger = async (actionId: string) => {
    setTriggering(actionId);
    try {
      const result = await triggerAction({ actionId });
      setLastResult({ actionId, message: result.message });
      setTimeout(() => setLastResult(null), 5000);
    } catch (err: any) {
      setLastResult({ actionId, message: err.message || "Failed to trigger action" });
      setTimeout(() => setLastResult(null), 5000);
    }
    setTriggering(null);
  };

  const categories = [...new Set(actions.map((a: any) => a.category))];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-black text-white uppercase tracking-tight">Quick Actions</h3>
        <span className="text-[9px] text-purple-500 font-bold uppercase">Trigger Tasks</span>
      </div>

      {lastResult && (
        <div className="mb-4 p-3 bg-purple-500/10 border border-purple-500/20 rounded-xl">
          <p className="text-xs text-purple-400 font-bold">{lastResult.message}</p>
        </div>
      )}

      {categories.map((category) => (
        <div key={category} className="mb-6 last:mb-0">
          <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mb-3">{category}</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {actions.filter((a: any) => a.category === category).map((action: any) => (
              <button
                key={action.id}
                onClick={() => handleTrigger(action.id)}
                disabled={triggering === action.id || !action.enabled}
                className="p-4 bg-slate-950 rounded-2xl border border-white/5 hover:border-purple-500/30 transition-all text-left group disabled:opacity-50"
              >
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-xl">{action.icon}</span>
                  <div>
                    <p className="text-xs font-bold text-white group-hover:text-purple-400 transition-colors">
                      {action.name}
                    </p>
                    <p className="text-[9px] text-slate-500">{action.agentId}</p>
                  </div>
                </div>
                <p className="text-[10px] text-slate-400">{action.description}</p>
                {triggering === action.id && (
                  <div className="mt-2 flex items-center gap-2">
                    <div className="w-3 h-3 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                    <span className="text-[9px] text-purple-500 font-bold">Queued...</span>
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
