import { useState } from "react";
import { useAction, useMutation } from "convex/react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { convexQuery } from "@convex-dev/react-query";
import { api } from "../../../convex/_generated/api";
import type { Period, Toolkit, ShowToastFn } from "./types";
import { OverviewSection } from "./OverviewSection";
import { ToolkitDetailModal } from "./ToolkitDetailModal";
import { TriggersSection } from "./TriggersSection";
import { WebhooksSection } from "./WebhooksSection";
import { CustomToolsSection } from "./CustomToolsSection";

type AdminPanelProps = {
  adminToken: string;
};

export function ComposioObservability({ adminToken }: AdminPanelProps) {
  const [period, setPeriod] = useState<Period>("24h");
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [activeSection, setActiveSection] = useState<"overview" | "triggers" | "webhooks" | "tools">("overview");
  const [showCustomToolModal, setShowCustomToolModal] = useState(false);
  const [customToolForm, setCustomToolForm] = useState({
    toolName: "",
    toolkit: "github",
    description: "",
    handler: "",
  });

  const showToast: ShowToastFn = (type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  };

  const { data: stats } = useSuspenseQuery(convexQuery(api.composioEnhanced.getToolCatalogStats, { adminToken }));
  const { data: observability } = useSuspenseQuery(convexQuery(api.composioEnhanced.getObservability, { adminToken, period }));
  const { data: toolkits } = useSuspenseQuery(convexQuery(api.composioEnhanced.getPopularToolkits, {}));
  const { data: triggers } = useSuspenseQuery(convexQuery(api.composioEnhanced.listTriggers, { adminToken }));
  const { data: triggerEvents } = useSuspenseQuery(convexQuery(api.composioEnhanced.getTriggerEvents, { adminToken, limit: 20 }));
  const { data: webhooks } = useSuspenseQuery(convexQuery(api.composioEnhanced.listWebhooks, { adminToken }));
  const { data: customTools } = useSuspenseQuery(convexQuery(api.composioEnhanced.listCustomTools, { adminToken }));
  const { data: sessions } = useSuspenseQuery(convexQuery(api.composioEnhanced.listSessions, { adminToken }));
  const { data: toolkitDetails } = useSuspenseQuery(convexQuery(api.composioEnhanced.getToolkitDetails, { adminToken }));
  const executeTool = useAction(api.composioEnhanced.executeToolByName);

  const toggleTrigger = useMutation(api.composioEnhanced.toggleTrigger);
  const deleteTrigger = useMutation(api.composioEnhanced.deleteTrigger);
  const createTrigger = useMutation(api.composioEnhanced.createTrigger);
  const toggleWebhook = useMutation(api.composioEnhanced.toggleWebhook);
  const createWebhook = useMutation(api.composioEnhanced.createWebhook);
  const createCustomTool = useMutation(api.composioEnhanced.createCustomTool);
  const toggleCustomTool = useMutation(api.composioEnhanced.toggleCustomTool);
  const deleteCustomTool = useMutation(api.composioEnhanced.deleteCustomTool);

  const [selectedToolkit, setSelectedToolkit] = useState<Toolkit | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [executingTool, setExecutingTool] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      {toast && (
        <div
          className={
            "fixed top-4 right-4 z-50 px-6 py-3 rounded-2xl shadow-2xl font-bold text-sm " +
            (toast.type === "success" ? "bg-emerald-500 text-white" : "bg-rose-500 text-white")
          }
        >
          {toast.msg}
        </div>
      )}

      <div className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 rounded-3xl p-6">
        <h2 className="text-2xl font-black text-white mb-2">Composio Hub - Max Capacity</h2>
        <p className="text-sm text-slate-300">
          10,000+ tools across 250+ toolkits - Triggers, Webhooks, Custom Tool Builder - Real-time Observability
        </p>
        {stats && !stats.authError && (
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <span className="px-3 py-1 bg-indigo-500/20 text-indigo-300 rounded-full font-bold">
              {stats.totalToolkits} toolkits
            </span>
            <span className="px-3 py-1 bg-purple-500/20 text-purple-300 rounded-full font-bold">
              {stats.totalTools.toLocaleString()} tools
            </span>
            <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 rounded-full font-bold">
              {stats.totalConnectedAccounts} connections
            </span>
            <span className="px-3 py-1 bg-amber-500/20 text-amber-300 rounded-full font-bold">
              {stats.totalActiveTriggers} active triggers
            </span>
            <span className="px-3 py-1 bg-rose-500/20 text-rose-300 rounded-full font-bold">
              {stats.totalCustomTools} custom tools
            </span>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {[
          { key: "overview" as const, label: "Overview", color: "indigo" },
          { key: "triggers" as const, label: "Triggers", color: "amber" },
          { key: "webhooks" as const, label: "Webhooks", color: "blue" },
          { key: "tools" as const, label: "Custom Tools", color: "purple" },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveSection(t.key)}
            className={
              "px-4 py-2 rounded-2xl font-bold text-sm transition " +
              (activeSection === t.key
                ? "bg-" + t.color + "-500 text-white shadow-lg"
                : "bg-slate-800 text-slate-300 hover:bg-slate-700")
            }
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeSection === "overview" && (
        <OverviewSection
          stats={stats}
          observability={observability}
          toolkits={toolkits}
          toolkitDetails={toolkitDetails?.toolkits ?? []}
          period={period}
          setPeriod={setPeriod}
          onToolkitClick={(tk) => setSelectedToolkit(tk)}
        />
      )}
      {activeSection === "triggers" && (
        <TriggersSection
          triggers={triggers?.triggers ?? []}
          events={triggerEvents?.events ?? []}
          toggleTrigger={toggleTrigger}
          deleteTrigger={deleteTrigger}
          createTrigger={createTrigger}
          adminToken={adminToken}
          showToast={showToast}
        />
      )}
      {activeSection === "webhooks" && (
        <WebhooksSection
          webhooks={webhooks?.webhooks ?? []}
          toggleWebhook={toggleWebhook}
          createWebhook={createWebhook}
          adminToken={adminToken}
          showToast={showToast}
        />
      )}
      {activeSection === "tools" && (
        <CustomToolsSection
          customTools={customTools?.tools ?? []}
          sessions={sessions?.sessions ?? []}
          toggleCustomTool={toggleCustomTool}
          deleteCustomTool={deleteCustomTool}
          createCustomTool={createCustomTool}
          adminToken={adminToken}
          showToast={showToast}
          showCustomToolModal={showCustomToolModal}
          setShowCustomToolModal={setShowCustomToolModal}
          customToolForm={customToolForm}
          setCustomToolForm={setCustomToolForm}
        />
      )}

      {selectedToolkit && (
        <ToolkitDetailModal
          toolkit={selectedToolkit}
          onClose={() => { setSelectedToolkit(null); setSearchQuery(""); }}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          executeTool={executeTool}
          executingTool={executingTool}
          setExecutingTool={setExecutingTool}
          adminToken={adminToken}
          showToast={showToast}
        />
      )}
    </div>
  );
}
