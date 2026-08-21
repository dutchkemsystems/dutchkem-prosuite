import { useState } from "react";
import type { ShowToastFn } from "./types";

export function WebhooksSection({
  webhooks,
  toggleWebhook,
  createWebhook,
  adminToken,
  showToast,
}: {
  webhooks: any[];
  toggleWebhook: any;
  createWebhook: any;
  adminToken: string;
  showToast: ShowToastFn;
}) {
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ url: "", events: "*", secret: "" });

  const handleCreate = async () => {
    if (!form.url) {
      showToast("error", "URL is required");
      return;
    }
    try {
      const events = form.events === "*" ? ["*"] : form.events.split(",").map((e) => e.trim());
      const secret = form.secret || "whksec_" + Date.now() + "_" + Math.random().toString(36).slice(2, 10);
      await createWebhook({ adminToken, url: form.url, events, secret });
      showToast("success", "Webhook created");
      setShowCreate(false);
      setForm({ url: "", events: "*", secret: "" });
    } catch (e: any) {
      showToast("error", e?.message ?? "Failed to create webhook");
    }
  };

  return (
    <>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-white">Webhook Endpoints ({webhooks.length})</h3>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-2xl font-bold text-sm"
        >
          {showCreate ? "Cancel" : "+ New Webhook"}
        </button>
      </div>

      {showCreate && (
        <div className="bg-slate-900/50 border border-blue-500/20 rounded-3xl p-6 space-y-3">
          <input
            placeholder="https://yourdomain.com/webhook"
            value={form.url}
            onChange={(e) => setForm({ ...form, url: e.target.value })}
            className="w-full bg-slate-800 text-white rounded-xl px-3 py-2 text-sm"
          />
          <input
            placeholder="Events (comma-separated, or *)"
            value={form.events}
            onChange={(e) => setForm({ ...form, events: e.target.value })}
            className="w-full bg-slate-800 text-white rounded-xl px-3 py-2 text-sm"
          />
          <input
            placeholder="Secret (auto-generated if blank)"
            value={form.secret}
            onChange={(e) => setForm({ ...form, secret: e.target.value })}
            className="w-full bg-slate-800 text-white rounded-xl px-3 py-2 text-sm"
          />
          <button
            onClick={handleCreate}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 rounded-xl"
          >
            Create Webhook
          </button>
        </div>
      )}

      {webhooks.length === 0 ? (
        <div className="bg-slate-900/30 border border-slate-700 rounded-3xl p-8 text-center text-slate-400">
          No webhooks configured.
        </div>
      ) : (
        <div className="space-y-2">
          {webhooks.map((w) => (
            <div key={w._id} className="bg-slate-900/50 border border-slate-700 rounded-2xl p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-white font-mono truncate">{w.url}</div>
                  <div className="text-xs text-slate-400 mt-1">
                    Events: {w.events.join(", ")} - Delivered: {w.deliveryCount} - Failed: {w.failureCount}
                  </div>
                </div>
                <button
                  onClick={() => toggleWebhook({ adminToken, webhookDocId: w._id, enabled: !w.enabled })}
                  className={
                    "px-3 py-1 rounded text-xs font-bold ml-2 " +
                    (w.enabled ? "bg-emerald-500 text-white" : "bg-slate-700 text-slate-400")
                  }
                >
                  {w.enabled ? "ON" : "OFF"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
