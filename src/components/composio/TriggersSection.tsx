import { useState } from "react";
import type { ShowToastFn } from "./types";

export function TriggersSection({
  triggers,
  events,
  toggleTrigger,
  deleteTrigger,
  createTrigger,
  adminToken,
  showToast,
}: {
  triggers: any[];
  events: any[];
  toggleTrigger: any;
  deleteTrigger: any;
  createTrigger: any;
  adminToken: string;
  showToast: ShowToastFn;
}) {
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    triggerId: "",
    toolkit: "github",
    triggerName: "",
    description: "",
    agentId: "default",
  });

  const handleCreate = async () => {
    if (!form.triggerId || !form.triggerName) {
      showToast("error", "Trigger ID and Name are required");
      return;
    }
    try {
      await createTrigger({ adminToken, ...form });
      showToast("success", "Trigger " + form.triggerName + " created");
      setShowCreate(false);
      setForm({ triggerId: "", toolkit: "github", triggerName: "", description: "", agentId: "default" });
    } catch (e: any) {
      showToast("error", e?.message ?? "Failed to create trigger");
    }
  };

  return (
    <>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-white">Active Triggers ({triggers.length})</h3>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-2xl font-bold text-sm"
        >
          {showCreate ? "Cancel" : "+ New Trigger"}
        </button>
      </div>

      {showCreate && (
        <div className="bg-slate-900/50 border border-amber-500/20 rounded-3xl p-6 space-y-3">
          <input
            placeholder="Trigger ID (e.g., github_star_event)"
            value={form.triggerId}
            onChange={(e) => setForm({ ...form, triggerId: e.target.value })}
            className="w-full bg-slate-800 text-white rounded-xl px-3 py-2 text-sm"
          />
          <input
            placeholder="Trigger Name (e.g., Watch for new stars)"
            value={form.triggerName}
            onChange={(e) => setForm({ ...form, triggerName: e.target.value })}
            className="w-full bg-slate-800 text-white rounded-xl px-3 py-2 text-sm"
          />
          <select
            value={form.toolkit}
            onChange={(e) => setForm({ ...form, toolkit: e.target.value })}
            className="w-full bg-slate-800 text-white rounded-xl px-3 py-2 text-sm"
          >
            <option value="github">GitHub</option>
            <option value="slack">Slack</option>
            <option value="gmail">Gmail</option>
            <option value="stripe">Stripe</option>
            <option value="hubspot">HubSpot</option>
          </select>
          <textarea
            placeholder="Description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="w-full bg-slate-800 text-white rounded-xl px-3 py-2 text-sm"
            rows={2}
          />
          <input
            placeholder="Agent ID (default = system)"
            value={form.agentId}
            onChange={(e) => setForm({ ...form, agentId: e.target.value })}
            className="w-full bg-slate-800 text-white rounded-xl px-3 py-2 text-sm"
          />
          <button
            onClick={handleCreate}
            className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-2 rounded-xl"
          >
            Create Trigger
          </button>
        </div>
      )}

      {triggers.length === 0 ? (
        <div className="bg-slate-900/30 border border-slate-700 rounded-3xl p-8 text-center text-slate-400">
          No triggers configured yet. Create one above.
        </div>
      ) : (
        <div className="bg-slate-900/50 border border-slate-700 rounded-3xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-800/50">
              <tr>
                <th className="text-left p-3 text-slate-300">Trigger</th>
                <th className="text-left p-3 text-slate-300">Toolkit</th>
                <th className="text-left p-3 text-slate-300">Agent</th>
                <th className="text-right p-3 text-slate-300">Fired</th>
                <th className="text-center p-3 text-slate-300">Enabled</th>
                <th className="text-right p-3 text-slate-300">Actions</th>
              </tr>
            </thead>
            <tbody>
              {triggers.map((t) => (
                <tr key={t._id} className="border-t border-slate-800">
                  <td className="p-3 text-white font-bold">{t.triggerName}</td>
                  <td className="p-3 text-slate-300">{t.toolkit}</td>
                  <td className="p-3 text-slate-400 text-xs">{t.agentId}</td>
                  <td className="p-3 text-right text-amber-300 font-mono">{t.fireCount}</td>
                  <td className="p-3 text-center">
                    <button
                      onClick={() => toggleTrigger({ adminToken, triggerDocId: t._id, enabled: !t.enabled })}
                      className={
                        "px-2 py-1 rounded text-xs font-bold " +
                        (t.enabled ? "bg-emerald-500 text-white" : "bg-slate-700 text-slate-400")
                      }
                    >
                      {t.enabled ? "ON" : "OFF"}
                    </button>
                  </td>
                  <td className="p-3 text-right">
                    <button
                      onClick={() => deleteTrigger({ adminToken, triggerDocId: t._id })}
                      className="text-rose-400 hover:text-rose-300 text-xs"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {events.length > 0 && (
        <div className="bg-slate-900/50 border border-slate-700 rounded-3xl p-6">
          <h3 className="text-lg font-bold text-white mb-4">Recent Trigger Events</h3>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {events.map((e: any) => (
              <div key={e._id} className="bg-slate-800/30 rounded-xl p-3 text-xs">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 rounded font-bold">
                    {e.eventType}
                  </span>
                  <span className="text-slate-400">{e.toolkit}</span>
                  <span className="text-slate-500 ml-auto">{new Date(e.receivedAt).toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
