import { useState } from "react";
import type { Toolkit, ShowToastFn } from "./types";

export function ToolkitDetailModal({
  toolkit,
  onClose,
  searchQuery,
  setSearchQuery,
  executeTool,
  executingTool,
  setExecutingTool,
  adminToken,
  showToast,
}: {
  toolkit: Toolkit;
  onClose: () => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  executeTool: any;
  executingTool: string | null;
  setExecutingTool: (s: string | null) => void;
  adminToken: string;
  showToast: ShowToastFn;
}) {
  const [paramsJson, setParamsJson] = useState("{}");
  const [selectedTool, setSelectedTool] = useState<any | null>(null);

  const filteredTools = toolkit.tools.filter((t: any) =>
    !searchQuery ||
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleExecute = async () => {
    if (!selectedTool) return;
    let params: any = {};
    try {
      params = JSON.parse(paramsJson);
    } catch {
      showToast("error", "Invalid JSON in parameters");
      return;
    }
    setExecutingTool(selectedTool.name);
    try {
      const result = await executeTool({
        adminToken,
        toolkit: toolkit.toolkit,
        toolName: selectedTool.name,
        params,
      });
      if (result?.success) {
        showToast("success", `✓ ${selectedTool.name} executed (${result.durationMs}ms)`);
      } else {
        showToast("error", `✗ ${result?.error ?? "Tool execution failed"}`);
      }
    } catch (e: any) {
      showToast("error", e?.message ?? "Execution failed");
    } finally {
      setExecutingTool(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-indigo-500/30 rounded-3xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-slate-700 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black text-white flex items-center gap-2">
              <span className="text-3xl">{toolkit.icon}</span>
              {toolkit.name}
            </h2>
            <p className="text-sm text-slate-400 mt-1">{toolkit.description}</p>
            <p className="text-xs text-indigo-300 mt-1">{toolkit.tools.length} tools available</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-2xl font-bold w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-800"
          >
            ×
          </button>
        </div>

        <div className="p-4 border-b border-slate-700">
          <input
            type="text"
            placeholder="Search tools by name or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-800 text-white rounded-xl px-4 py-2 text-sm border border-slate-700 focus:border-indigo-500 outline-none"
          />
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {filteredTools.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <div className="text-4xl mb-2">🔍</div>
              <div>No tools match &quot;{searchQuery}&quot;</div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {filteredTools.map((tool: any) => (
                <div
                  key={tool.name}
                  className={`bg-slate-800/50 border rounded-xl p-3 transition ${
                    selectedTool?.name === tool.name ? "border-indigo-500 bg-indigo-500/10" : "border-slate-700"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-mono font-bold text-white">{tool.name}</span>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase ${
                          tool.category === "write" ? "bg-amber-500/20 text-amber-300" :
                          tool.category === "read" ? "bg-blue-500/20 text-blue-300" :
                          tool.category === "execute" ? "bg-rose-500/20 text-rose-300" :
                          "bg-emerald-500/20 text-emerald-300"
                        }`}>{tool.category}</span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">{tool.description}</p>
                      {tool.parameters && tool.parameters.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {tool.parameters.slice(0, 4).map((p: any) => (
                            <span key={p.name} className="text-[9px] px-1.5 py-0.5 bg-slate-700/50 text-slate-300 rounded font-mono">
                              {p.name}{p.required ? "*" : ""}
                            </span>
                          ))}
                          {tool.parameters.length > 4 && (
                            <span className="text-[9px] px-1.5 py-0.5 bg-slate-700/50 text-slate-400 rounded">
                              +{tool.parameters.length - 4} more
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => setSelectedTool(selectedTool?.name === tool.name ? null : tool)}
                      className="px-3 py-1.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg text-xs font-bold whitespace-nowrap"
                    >
                      {selectedTool?.name === tool.name ? "Close" : "Use"}
                    </button>
                  </div>

                  {selectedTool?.name === tool.name && (
                    <div className="mt-3 pt-3 border-t border-slate-700 space-y-2">
                      <div className="text-[10px] font-bold text-slate-400 uppercase">Parameters (JSON)</div>
                      <textarea
                        value={paramsJson}
                        onChange={(e) => setParamsJson(e.target.value)}
                        rows={4}
                        className="w-full bg-slate-900 text-emerald-300 rounded-lg px-3 py-2 text-xs font-mono border border-slate-700 outline-none focus:border-indigo-500"
                        placeholder='{"key": "value"}'
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={handleExecute}
                          disabled={executingTool === tool.name}
                          className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white rounded-lg text-xs font-bold"
                        >
                          {executingTool === tool.name ? "Running..." : "▶ Execute"}
                        </button>
                        <button
                          onClick={() => { setParamsJson("{}"); setSelectedTool(null); }}
                          className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-xs font-bold"
                        >
                          Reset
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
