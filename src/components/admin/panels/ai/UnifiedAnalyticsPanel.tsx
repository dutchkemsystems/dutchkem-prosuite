import { useState } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { convexQuery } from "@convex-dev/react-query";
import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { PlatformAnalyticsPanel } from "./PlatformAnalyticsPanel";
import { SupportDashboard } from "~/components/admin/SupportDashboard";
import { ModelAnalyticsPanel } from "~/components/admin/ModelAnalyticsPanel";
import { ClientAnalyticsDashboard } from "~/components/ClientAnalyticsWidgets";

export function UnifiedAnalyticsPanel() {
  const [activeSubTab, setActiveSubTab] = useState<"overview" | "platform" | "ai" | "users" | "support">("overview");

  const { data: platformData } = useSuspenseQuery(convexQuery(api.platform_analytics.getPlatformAnalyticsSummary, { timeRange: "month" })) as { data: any };
  const aiOverview: any = useQuery(api.model_analytics.getOverview, {});
  const supportAnalytics: any = useQuery(api.support_orchestrator.getSupportAnalytics, { days: 30 });

  const platformTotals = platformData?.totals || {};
  const aiTotal = aiOverview?.total || 0;
  const aiSuccessRate = aiOverview?.successRate || "0";
  const supportInteractions = supportAnalytics?.totalInteractions || 0;
  const pendingEscalations = supportAnalytics?.pendingEscalations || 0;

  const subTabs = [
    { id: "overview" as const, label: "Overview", icon: "📊" },
    { id: "platform" as const, label: "Platform", icon: "🌐" },
    { id: "ai" as const, label: "AI Models", icon: "🤖" },
    { id: "users" as const, label: "Users", icon: "👥" },
    { id: "support" as const, label: "Support", icon: "🎧" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-black">Unified Analytics</h2>
        <p className="text-xs text-slate-400 mt-1">Cross-domain insights across platform, AI, users, and support</p>
      </div>

      <div className="flex gap-1 bg-slate-800 rounded-xl p-1">
        {subTabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveSubTab(tab.id)}
            className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all ${
              activeSubTab === tab.id ? 'bg-orange-500 text-white' : 'text-slate-400 hover:text-white'
            }`}>
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {activeSubTab === "overview" && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
              <p className="text-2xl font-black text-blue-400">{(platformTotals.visits || 0).toLocaleString()}</p>
              <p className="text-[10px] text-slate-500 uppercase mt-1">Total Visits</p>
              <p className="text-[9px] text-slate-600 mt-0.5">Platform</p>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
              <p className="text-2xl font-black text-emerald-400">{(platformTotals.registrations || 0).toLocaleString()}</p>
              <p className="text-[10px] text-slate-500 uppercase mt-1">Registrations</p>
              <p className="text-[9px] text-slate-600 mt-0.5">Platform</p>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
              <p className="text-2xl font-black text-amber-400">{(platformTotals.subscriptions || 0).toLocaleString()}</p>
              <p className="text-[10px] text-slate-500 uppercase mt-1">Subscriptions</p>
              <p className="text-[9px] text-slate-600 mt-0.5">Platform</p>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
              <p className="text-2xl font-black text-indigo-400">₦{(platformTotals.revenue || 0).toLocaleString()}</p>
              <p className="text-[10px] text-slate-500 uppercase mt-1">Revenue</p>
              <p className="text-[9px] text-slate-600 mt-0.5">Platform</p>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
              <p className="text-2xl font-black text-purple-400">{aiTotal.toLocaleString()}</p>
              <p className="text-[10px] text-slate-500 uppercase mt-1">AI Requests</p>
              <p className="text-[9px] text-slate-600 mt-0.5">All Models</p>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
              <p className={`text-2xl font-black ${parseFloat(aiSuccessRate) >= 90 ? 'text-emerald-400' : 'text-amber-400'}`}>{aiSuccessRate}%</p>
              <p className="text-[10px] text-slate-500 uppercase mt-1">AI Success Rate</p>
              <p className="text-[9px] text-slate-600 mt-0.5">All Models</p>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
              <p className="text-2xl font-black text-cyan-400">{supportInteractions.toLocaleString()}</p>
              <p className="text-[10px] text-slate-500 uppercase mt-1">Support Interactions</p>
              <p className="text-[9px] text-slate-600 mt-0.5">Last 30 days</p>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
              <p className={`text-2xl font-black ${pendingEscalations > 0 ? 'text-red-400' : 'text-emerald-400'}`}>{pendingEscalations}</p>
              <p className="text-[10px] text-slate-500 uppercase mt-1">Pending Escalations</p>
              <p className="text-[9px] text-slate-600 mt-0.5">Support</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-lg">🌐</span>
                <h3 className="text-sm font-black text-white">Platform Performance</h3>
              </div>
              <div className="space-y-3">
                {platformData?.platforms?.slice(0, 5).map((p: any) => (
                  <div key={p.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span>{p.icon}</span>
                      <span className="text-xs text-slate-300">{p.name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] text-slate-500">{p.visits} visits</span>
                      <span className="text-xs font-bold text-emerald-400">₦{p.revenue.toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-lg">🤖</span>
                <h3 className="text-sm font-black text-white">AI Model Usage</h3>
              </div>
              <div className="space-y-3">
                {Object.entries(aiOverview?.byModel || {}).slice(0, 5).map(([model, data]: [string, any]) => (
                  <div key={model} className="flex items-center justify-between">
                    <span className="text-xs text-slate-300 font-bold">{model}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] text-slate-500">{data.count} req</span>
                      <span className={`text-[10px] font-bold ${parseFloat(data.avgTime) < 2000 ? 'text-emerald-400' : 'text-amber-400'}`}>
                        {Math.round(data.avgTime / 100) / 10}s avg
                      </span>
                    </div>
                  </div>
                ))}
                {Object.keys(aiOverview?.byModel || {}).length === 0 && (
                  <p className="text-xs text-slate-500 text-center py-4">No AI usage data yet</p>
                )}
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-lg">🎧</span>
                <h3 className="text-sm font-black text-white">Support Overview</h3>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-950 rounded-xl p-3 text-center">
                  <p className="text-lg font-black text-orange-400">{supportAnalytics?.totalInteractions || 0}</p>
                  <p className="text-[9px] text-slate-500">Total</p>
                </div>
                <div className="bg-slate-950 rounded-xl p-3 text-center">
                  <p className="text-lg font-black text-emerald-400">{supportAnalytics?.routedCount || 0}</p>
                  <p className="text-[9px] text-slate-500">Routed</p>
                </div>
                <div className="bg-slate-950 rounded-xl p-3 text-center">
                  <p className="text-lg font-black text-blue-400">{supportAnalytics?.avgResponseMs || 0}ms</p>
                  <p className="text-[9px] text-slate-500">Avg Response</p>
                </div>
                <div className="bg-slate-950 rounded-xl p-3 text-center">
                  <p className={`text-lg font-black ${pendingEscalations > 0 ? 'text-red-400' : 'text-emerald-400'}`}>{pendingEscalations}</p>
                  <p className="text-[9px] text-slate-500">Pending</p>
                </div>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-lg">🎯</span>
                <h3 className="text-sm font-black text-white">Support Confidence</h3>
              </div>
              <div className="space-y-3">
                {Object.entries(supportAnalytics?.confidenceCounts || {}).map(([level, count]: [string, any]) => {
                  const total = supportAnalytics?.totalInteractions || 1;
                  const pct = Math.round((count / total) * 100);
                  return (
                    <div key={level}>
                      <div className="flex items-center justify-between text-[10px] mb-1">
                        <span className="text-slate-400 capitalize">{level}</span>
                        <span className="text-slate-300 font-bold">{count} ({pct}%)</span>
                      </div>
                      <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{
                          width: `${pct}%`,
                          backgroundColor: level === 'high' ? '#10b981' : level === 'medium' ? '#f59e0b' : '#ef4444',
                        }} />
                      </div>
                    </div>
                  );
                })}
                {Object.keys(supportAnalytics?.confidenceCounts || {}).length === 0 && (
                  <p className="text-xs text-slate-500 text-center py-4">No support data yet</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeSubTab === "platform" && <PlatformAnalyticsPanel />}
      {activeSubTab === "ai" && <ModelAnalyticsPanel adminToken="" />}
      {activeSubTab === "users" && <ClientAnalyticsDashboard />}
      {activeSubTab === "support" && <SupportDashboard />}
    </div>
  );
}
