import type { ShowToastFn } from "./types";

export function CustomToolsSection({
  customTools,
  sessions,
  toggleCustomTool,
  deleteCustomTool,
  createCustomTool,
  adminToken,
  showToast,
  showCustomToolModal,
  setShowCustomToolModal,
  customToolForm,
  setCustomToolForm,
}: {
  customTools: any[];
  sessions: any[];
  toggleCustomTool: any;
  deleteCustomTool: any;
  createCustomTool: any;
  adminToken: string;
  showToast: ShowToastFn;
  showCustomToolModal: boolean;
  setShowCustomToolModal: (b: boolean) => void;
  customToolForm: any;
  setCustomToolForm: (f: any) => void;
}) {
  const handleCreate = async () => {
    if (!customToolForm.toolName || !customToolForm.handler) {
      showToast("error", "Tool name and handler are required");
      return;
    }
    try {
      await createCustomTool({
        adminToken,
        toolName: customToolForm.toolName,
        toolkit: customToolForm.toolkit,
        description: customToolForm.description,
        inputSchema: { type: "object", properties: {} },
        handler: customToolForm.handler,
      });
      showToast("success", "Custom tool " + customToolForm.toolName + " created");
      setShowCustomToolModal(false);
      setCustomToolForm({ toolName: "", toolkit: "github", description: "", handler: "" });
    } catch (e: any) {
      showToast("error", e?.message ?? "Failed to create tool");
    }
  };

  return (
    <>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-white">Custom Tools ({customTools.length})</h3>
        <button
          onClick={() => setShowCustomToolModal(!showCustomToolModal)}
          className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-2xl font-bold text-sm"
        >
          {showCustomToolModal ? "Cancel" : "+ New Custom Tool"}
        </button>
      </div>

      {showCustomToolModal && (
        <div className="bg-slate-900/50 border border-purple-500/20 rounded-3xl p-6 space-y-3">
          <input
            placeholder="Tool Name (e.g., dutchkem_wallet_balance)"
            value={customToolForm.toolName}
            onChange={(e) => setCustomToolForm({ ...customToolForm, toolName: e.target.value })}
            className="w-full bg-slate-800 text-white rounded-xl px-3 py-2 text-sm"
          />
          <select
            value={customToolForm.toolkit}
            onChange={(e) => setCustomToolForm({ ...customToolForm, toolkit: e.target.value })}
            className="w-full bg-slate-800 text-white rounded-xl px-3 py-2 text-sm"
          >
            <option value="github">GitHub</option>
            <option value="slack">Slack</option>
            <option value="custom">Custom</option>
          </select>
          <textarea
            placeholder="Description"
            value={customToolForm.description}
            onChange={(e) => setCustomToolForm({ ...customToolForm, description: e.target.value })}
            className="w-full bg-slate-800 text-white rounded-xl px-3 py-2 text-sm"
            rows={2}
          />
          <input
            placeholder="Handler function (e.g., internal.wallet.getBalance)"
            value={customToolForm.handler}
            onChange={(e) => setCustomToolForm({ ...customToolForm, handler: e.target.value })}
            className="w-full bg-slate-800 text-white rounded-xl px-3 py-2 text-sm"
          />
          <button
            onClick={handleCreate}
            className="w-full bg-purple-500 hover:bg-purple-600 text-white font-bold py-2 rounded-xl"
          >
            Create Custom Tool
          </button>
        </div>
      )}

      {customTools.length === 0 ? (
        <div className="bg-slate-900/30 border border-slate-700 rounded-3xl p-8 text-center text-slate-400">
          No custom tools yet. Build one to extend Composio's reach.
        </div>
      ) : (
        <div className="space-y-2">
          {customTools.map((t) => (
            <div key={t._id} className="bg-slate-900/50 border border-slate-700 rounded-2xl p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="text-sm text-white font-bold">{t.toolName}</div>
                  <div className="text-xs text-slate-400 mt-1">
                    {t.toolkit} - {t.usageCount} uses
                  </div>
                </div>
                <button
                  onClick={() => toggleCustomTool({ adminToken, toolDocId: t._id, enabled: !t.enabled })}
                  className={
                    "px-3 py-1 rounded text-xs font-bold " +
                    (t.enabled ? "bg-emerald-500 text-white" : "bg-slate-700 text-slate-400")
                  }
                >
                  {t.enabled ? "ON" : "OFF"}
                </button>
                <button
                  onClick={() => deleteCustomTool({ adminToken, toolDocId: t._id })}
                  className="text-rose-400 hover:text-rose-300 text-xs ml-2"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {sessions.length > 0 && (
        <div className="bg-slate-900/50 border border-slate-700 rounded-3xl p-6">
          <h3 className="text-lg font-bold text-white mb-4">Tool Router Sessions</h3>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {sessions.map((s: any) => (
              <div key={s._id} className="bg-slate-800/30 rounded-xl p-3 text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-white font-mono">{s.sessionId.slice(0, 20)}...</span>
                  <span className="text-slate-400">{s.toolkits.length} toolkits</span>
                  <span className="text-slate-500 ml-auto">{s.toolCallCount} calls</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
