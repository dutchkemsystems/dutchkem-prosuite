import type { Id } from "../../../convex/_generated/dataModel";

export function WorkflowsSection({
  workflows,
  onNew,
  toggleWorkflow,
}: {
  workflows: any[];
  onNew: () => void;
  toggleWorkflow: (id: Id<"trypost_workflows">, active: boolean) => void;
}) {
  return (
    <>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-white">⚙️ Automated Workflows ({workflows.length})</h3>
        <button
          onClick={onNew}
          className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-2xl font-bold text-sm"
        >
          + New Workflow
        </button>
      </div>
      {workflows.length === 0 ? (
        <div className="bg-slate-900/30 border border-slate-700 rounded-3xl p-8 text-center text-slate-400">
          No workflows configured. Create one to automate posting.
        </div>
      ) : (
        <div className="space-y-2">
          {workflows.map((w) => (
            <div key={w._id} className="bg-slate-900/50 border border-slate-700 rounded-2xl p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="text-sm text-white font-bold">{w.name}</div>
                  <div className="text-xs text-slate-400 mt-1">
                    {w.triggerType} • {w.platforms.length} platforms • Run {w.runCount}x
                  </div>
                </div>
                <button
                  onClick={() => toggleWorkflow(w._id, !w.active)}
                  className={`px-3 py-1 rounded text-xs font-bold ${
                    w.active ? "bg-emerald-500 text-white" : "bg-slate-700 text-slate-400"
                  }`}
                >
                  {w.active ? "ON" : "OFF"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
