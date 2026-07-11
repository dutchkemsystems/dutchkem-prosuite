import { useState } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { convexQuery } from "@convex-dev/react-query";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { StatCard } from "./ui/StatCard";

type AdminPanelProps = {
  adminToken: string;
};

const SECTION_TAB_COLORS: Record<string, string> = {
  overview: "bg-indigo-500 text-white shadow-lg",
  runs: "bg-blue-500 text-white shadow-lg",
  alerts: "bg-rose-500 text-white shadow-lg",
  secrets: "bg-amber-500 text-white shadow-lg",
  health: "bg-emerald-500 text-white shadow-lg",
};

export function AutoHealDashboard({ adminToken }: AdminPanelProps) {
  const [section, setSection] = useState<"overview" | "runs" | "alerts" | "secrets" | "health">("overview");
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [healthResults, setHealthResults] = useState<any[] | null>(null);
  const [triggering, setTriggering] = useState(false);

  const showToast = (type: "success" | "error", msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  };

  const { data: summary } = useSuspenseQuery(convexQuery(api.auto_heal.getSummary, { adminToken }));
  const { data: runs } = useSuspenseQuery(convexQuery(api.auto_heal.listRuns, { adminToken, limit: 25 }));
  const { data: alerts } = useSuspenseQuery(convexQuery(api.auto_heal.listAlerts, { adminToken, dismissed: false, limit: 50 }));

  const dismissAlert = useMutation(api.auto_heal.dismissAlert);
  const markSecretResolved = useMutation(api.auto_heal.markSecretResolved);
  const runLiveHealthCheck = useAction(api.auto_heal.runLiveHealthCheck);
  const triggerRun = useAction(api.auto_heal.triggerAutoHealRun);

  const handleHealthCheck = async () => {
    try {
      const result = await runLiveHealthCheck({ adminToken });
      setHealthResults(result.results);
      showToast("success", "Health check complete");
    } catch (e: any) {
      showToast("error", e?.message ?? "Health check failed");
    }
  };

  const handleTrigger = async () => {
    setTriggering(true);
    try {
      const result = await triggerRun({ adminToken });
      if (result.success) {
        showToast("success", "Auto-heal run triggered");
      } else {
        showToast("error", result.message ?? "Trigger failed");
      }
    } catch (e: any) {
      showToast("error", e?.message ?? "Trigger failed");
    } finally {
      setTriggering(false);
    }
  };

  return (
    <div className="space-y-6">
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-2xl shadow-2xl font-bold text-sm ${
            toast.type === "success" ? "bg-emerald-500 text-white" : "bg-rose-500 text-white"
          }`}
        >
          {toast.msg}
        </div>
      )}

      <div className="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 rounded-3xl p-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-2xl font-black text-white mb-2">🛡️ Auto-Heal & Security</h2>
            <p className="text-sm text-slate-300">
              Self-healing system • Diagnostics • Security scanning • Auto-deploy • Endpoint monitoring
            </p>
            {summary && !summary.authError && (
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 rounded-full font-bold">
                  Health: {summary.summary?.healthScore ?? 100}%
                </span>
                <span className="px-3 py-1 bg-blue-500/20 text-blue-300 rounded-full font-bold">
                  {summary.summary?.totalRuns ?? 0} total runs
                </span>
                <span className="px-3 py-1 bg-purple-500/20 text-purple-300 rounded-full font-bold">
                  {summary.summary?.success ?? 0} successful
                </span>
                {(summary.alerts?.critical ?? 0) > 0 && (
                  <span className="px-3 py-1 bg-rose-500/20 text-rose-300 rounded-full font-bold animate-pulse">
                    ⚠ {summary.alerts?.critical ?? 0} critical
                  </span>
                )}
                {(summary.secrets?.unresolved ?? 0) > 0 && (
                  <span className="px-3 py-1 bg-amber-500/20 text-amber-300 rounded-full font-bold">
                    🔑 {summary.secrets?.unresolved ?? 0} unresolved secrets
                  </span>
                )}
              </div>
            )}
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={handleHealthCheck}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-bold text-sm"
            >
              🩺 Live Health Check
            </button>
            <button
              onClick={handleTrigger}
              disabled={triggering}
              className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white rounded-2xl font-bold text-sm"
            >
              {triggering ? "⏳ Triggering…" : "⚡ Trigger Run"}
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Total Runs"
          value={summary?.summary?.totalRuns ?? 0}
          icon="📊"
          color="indigo"
        />
        <StatCard
          label="Active Alerts"
          value={summary?.alerts?.active ?? 0}
          icon="🔔"
          color={(summary?.alerts?.critical ?? 0) > 0 ? "rose" : "amber"}
        />
        <StatCard
          label="Unresolved Secrets"
          value={summary?.secrets?.unresolved ?? 0}
          icon="🔑"
          color={(summary?.secrets?.critical ?? 0) > 0 ? "rose" : "amber"}
        />
        <StatCard
          label="Health Score"
          value={`${summary?.summary?.healthScore ?? 100}%`}
          icon="💚"
          color={(summary?.summary?.healthScore ?? 100) >= 80 ? "emerald" : "rose"}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {[
          { key: "overview" as const, label: "📊 Overview" },
          { key: "runs" as const, label: "🏃 Runs" },
          { key: "alerts" as const, label: "🔔 Alerts" },
          { key: "secrets" as const, label: "🔑 Secrets" },
          { key: "health" as const, label: "🩺 Health" },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setSection(t.key)}
            className={`px-4 py-2 rounded-2xl font-bold text-sm transition ${
              section === t.key
                ? SECTION_TAB_COLORS[t.key]
                : "bg-slate-800 text-slate-300 hover:bg-slate-700"
            }`}
          >
            {t.label}
            {t.key === "alerts" && summary && (summary.alerts?.active ?? 0) > 0 && (
              <span className="ml-2 px-1.5 py-0.5 bg-rose-500 text-white rounded-full text-[10px]">
                {summary.alerts?.active ?? 0}
              </span>
            )}
          </button>
        ))}
      </div>

      {section === "overview" && summary && <OverviewSection summary={summary} lastRun={runs?.runs?.[0]} />}

      {section === "runs" && (
        <RunsSection
          runs={runs?.runs ?? []}
          adminToken={adminToken}
        />
      )}

      {section === "alerts" && (
        <AlertsSection
          alerts={alerts?.alerts ?? []}
          dismissAlert={async (id) => {
            try {
              await dismissAlert({ adminToken, alertId: id });
              showToast("success", "Alert dismissed");
            } catch (e: any) {
              showToast("error", e?.message ?? "Failed to dismiss");
            }
          }}
        />
      )}

      {section === "secrets" && (
        <SecretsSection
          runs={runs?.runs ?? []}
          adminToken={adminToken}
          markResolved={async (id) => {
            try {
              await markSecretResolved({ adminToken, secretId: id });
              showToast("success", "Secret marked resolved");
            } catch (e: any) {
              showToast("error", e?.message ?? "Failed to mark");
            }
          }}
        />
      )}

      {section === "health" && (
        <HealthSection
          healthResults={healthResults}
          summary={summary}
        />
      )}
    </div>
  );
}

function OverviewSection({ summary, lastRun }: { summary: any; lastRun: any }) {
  if (!summary || summary.authError) {
    return (
      <div className="bg-slate-900/30 border border-slate-700 rounded-3xl p-8 text-center text-slate-400">
        Authorization required
      </div>
    );
  }

  return (
    <>
      {lastRun && (
        <div className="bg-slate-900/50 border border-slate-700 rounded-3xl p-6">
          <h3 className="text-lg font-bold text-white mb-3">🏃 Last Run: {lastRun.runId}</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <MiniStat label="Status" value={lastRun.status} color={lastRun.status === "success" ? "emerald" : lastRun.status === "partial" ? "amber" : "rose"} />
            <MiniStat label="Duration" value={lastRun.durationMs ? `${(lastRun.durationMs / 1000).toFixed(1)}s` : "—"} color="blue" />
            <MiniStat label="Issues Found" value={lastRun.issuesFound} color={lastRun.issuesFound > 0 ? "amber" : "emerald"} />
            <MiniStat label="Issues Fixed" value={lastRun.issuesFixed} color={lastRun.issuesFixed > 0 ? "emerald" : "slate"} />
          </div>
          {lastRun.summary && (
            <p className="text-xs text-slate-400 italic">{lastRun.summary}</p>
          )}
        </div>
      )}

      <div className="bg-slate-900/50 border border-slate-700 rounded-3xl p-6">
        <h3 className="text-lg font-bold text-white mb-4">📊 System Overview</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <DetailCard title="🏃 Runs" items={[
            { label: "Total", value: summary.summary.totalRuns },
            { label: "Successful", value: summary.summary.success, color: "emerald" },
            { label: "Partial", value: summary.summary.partial, color: "amber" },
            { label: "Failed", value: summary.summary.failed, color: "rose" },
            { label: "Running", value: summary.summary.running, color: "blue" },
            { label: "Last 24h", value: summary.summary.last24h },
          ]} />
          <DetailCard title="🔔 Alerts" items={[
            { label: "Active", value: summary.alerts.active, color: summary.alerts.active > 0 ? "amber" : "slate" },
            { label: "Critical", value: summary.alerts.critical, color: summary.alerts.critical > 0 ? "rose" : "slate" },
            { label: "Warning", value: summary.alerts.warning, color: "amber" },
            { label: "Total", value: summary.alerts.total },
          ]} />
          <DetailCard title="🔑 Secrets" items={[
            { label: "Unresolved", value: summary.secrets.unresolved, color: summary.secrets.unresolved > 0 ? "rose" : "emerald" },
            { label: "Critical", value: summary.secrets.critical, color: summary.secrets.critical > 0 ? "rose" : "slate" },
            { label: "Total Detected", value: summary.secrets.total },
          ]} />
          <DetailCard title="🩺 Health" items={[
            { label: "Healthy", value: summary.health.healthy, color: "emerald" },
            { label: "Down", value: summary.health.down, color: summary.health.down > 0 ? "rose" : "slate" },
            { label: "Total Checks", value: summary.health.total },
          ]} />
        </div>
      </div>
    </>
  );
}

function RunsSection({ runs, adminToken }: { runs: any[]; adminToken: string }) {
  const [selectedRun, setSelectedRun] = useState<any>(null);
  const runDetails = useQuery(
    api.auto_heal.getRun,
    selectedRun ? { adminToken, runId: selectedRun._id as Id<"auto_heal_runs"> } : "skip"
  );

  if (runs.length === 0) {
    return (
      <div className="bg-slate-900/30 border border-slate-700 rounded-3xl p-8 text-center text-slate-400">
        <p>No runs yet. Run <code className="px-2 py-1 bg-slate-800 rounded">.\fix-advanced.ps1</code> to populate.</p>
      </div>
    );
  }

  return (
    <>
      {selectedRun && runDetails && !runDetails.authError && (
        <div className="bg-slate-900/50 border border-indigo-500/30 rounded-3xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-white">📋 {runDetails.run?.runId} Details</h3>
            <button
              onClick={() => setSelectedRun(null)}
              className="text-slate-400 hover:text-white text-sm"
            >
              ✕ Close
            </button>
          </div>
          {runDetails.run?.sections && runDetails.run.sections.length > 0 && (
            <div className="space-y-1 mb-4">
              {runDetails.run.sections.map((s: any, i: number) => (
                <div key={i} className="flex items-center gap-3 bg-slate-800/30 rounded-lg px-3 py-2 text-xs">
                  <span className={`w-2 h-2 rounded-full ${
                    s.status === "ok" ? "bg-emerald-400" : s.status === "warn" ? "bg-amber-400" : "bg-rose-400"
                  }`} />
                  <span className="font-mono text-slate-300 w-48 truncate">{s.name}</span>
                  {s.durationMs && <span className="text-slate-500">{Math.round(s.durationMs)}ms</span>}
                  <span className="ml-auto text-slate-400 truncate">{s.message}</span>
                </div>
              ))}
            </div>
          )}
          {runDetails.fixes && runDetails.fixes.length > 0 && (
            <div className="mt-3">
              <h4 className="text-sm font-bold text-emerald-300 mb-2">🔧 Fixes Applied ({runDetails.fixes.length})</h4>
              <div className="space-y-1">
                {runDetails.fixes.slice(0, 10).map((f: any) => (
                  <div key={f._id} className="text-xs text-slate-300 bg-slate-800/30 rounded-lg px-3 py-1.5">
                    {f.filePath} — <span className="text-emerald-400">{f.fixType}</span>: {f.description}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="space-y-2">
        {runs.map((r) => (
          <button
            key={r._id}
            onClick={() => setSelectedRun(r)}
            className={`w-full text-left bg-slate-900/50 border rounded-2xl p-4 transition ${
              selectedRun?._id === r._id
                ? "border-indigo-500"
                : "border-slate-700 hover:border-slate-500"
            }`}
          >
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-3">
                <span
                  className={`w-3 h-3 rounded-full ${
                    r.status === "success"
                      ? "bg-emerald-400"
                      : r.status === "partial"
                      ? "bg-amber-400"
                      : r.status === "running"
                      ? "bg-blue-400 animate-pulse"
                      : "bg-rose-400"
                  }`}
                />
                <div>
                  <div className="text-sm text-white font-mono font-bold">{r.runId}</div>
                  <div className="text-xs text-slate-400">
                    {new Date(r.startedAt).toLocaleString()} • {r.triggeredBy}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="px-2 py-0.5 bg-slate-800 rounded-full">
                  {r.sections?.length ?? 0} sections
                </span>
                {r.issuesFound > 0 && (
                  <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 rounded-full">
                    {r.issuesFound} issues
                  </span>
                )}
                {r.issuesFixed > 0 && (
                  <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 rounded-full">
                    {r.issuesFixed} fixed
                  </span>
                )}
                {r.durationMs && (
                  <span className="px-2 py-0.5 bg-slate-800 rounded-full">
                    {(r.durationMs / 1000).toFixed(1)}s
                  </span>
                )}
              </div>
            </div>
          </button>
        ))}
      </div>
    </>
  );
}

function AlertsSection({ alerts, dismissAlert }: { alerts: any[]; dismissAlert: (id: Id<"auto_heal_alerts">) => void }) {
  if (alerts.length === 0) {
    return (
      <div className="bg-slate-900/30 border border-slate-700 rounded-3xl p-8 text-center text-slate-400">
        <p>✅ No active alerts. System is healthy.</p>
      </div>
    );
  }
  return (
    <div className="space-y-2">
      {alerts.map((a) => (
        <div
          key={a._id}
          className={`bg-slate-900/50 border rounded-2xl p-4 ${
            a.severity === "critical"
              ? "border-rose-500/30"
              : a.severity === "warning"
              ? "border-amber-500/30"
              : "border-blue-500/30"
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-bold uppercase ${
                    a.severity === "critical"
                      ? "bg-rose-500 text-white"
                      : a.severity === "warning"
                      ? "bg-amber-500 text-white"
                      : "bg-blue-500 text-white"
                  }`}
                >
                  {a.severity}
                </span>
                <span className="text-xs px-2 py-0.5 bg-slate-700 text-slate-300 rounded-full">
                  {a.category}
                </span>
                {a.autoFixed && (
                  <span className="text-xs px-2 py-0.5 bg-emerald-500/20 text-emerald-300 rounded-full font-bold">
                    AUTO-FIXED
                  </span>
                )}
                {a.notifyEmail && (
                  <span className="text-xs px-2 py-0.5 bg-blue-500/20 text-blue-300 rounded-full">📧 email sent</span>
                )}
                {a.notifySms && (
                  <span className="text-xs px-2 py-0.5 bg-purple-500/20 text-purple-300 rounded-full">📱 SMS sent</span>
                )}
              </div>
              <div className="text-sm text-white font-bold mt-2">{a.title}</div>
              <div className="text-xs text-slate-300 mt-1">{a.message}</div>
              {a.source && (
                <div className="text-[10px] text-slate-500 font-mono mt-1">
                  {a.source}{a.lineNumber ? `:${a.lineNumber}` : ""}
                </div>
              )}
              <div className="text-[10px] text-slate-500 mt-1">
                {new Date(a.createdAt).toLocaleString()}
              </div>
            </div>
            <button
              onClick={() => dismissAlert(a._id)}
              className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold"
            >
              Dismiss
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function SecretsSection({
  runs,
  adminToken,
  markResolved,
}: {
  runs: any[];
  adminToken: string;
  markResolved: (id: Id<"auto_heal_secrets">) => void;
}) {
  const [selectedRun, setSelectedRun] = useState<string | null>(null);
  const runDetails = useQuery(
    api.auto_heal.getRun,
    selectedRun ? { adminToken, runId: selectedRun as Id<"auto_heal_runs"> } : "skip"
  );

  if (runs.length === 0) {
    return (
      <div className="bg-slate-900/30 border border-slate-700 rounded-3xl p-8 text-center text-slate-400">
        No runs to inspect
      </div>
    );
  }

  if (!selectedRun) {
    return (
      <div className="space-y-2">
        <p className="text-xs text-slate-400">Select a run to view detected secrets:</p>
        {runs.map((r) => (
          <button
            key={r._id}
            onClick={() => setSelectedRun(r._id)}
            className="w-full text-left bg-slate-900/50 border border-slate-700 hover:border-slate-500 rounded-2xl p-4 transition"
          >
            <div className="text-sm text-white font-mono font-bold">{r.runId}</div>
            <div className="text-xs text-slate-400">
              {new Date(r.startedAt).toLocaleString()}
            </div>
          </button>
        ))}
      </div>
    );
  }

  const secrets = runDetails?.secrets ?? [];
  return (
    <div className="bg-slate-900/50 border border-slate-700 rounded-3xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-white">🔑 Secrets Found</h3>
        <button
          onClick={() => setSelectedRun(null)}
          className="text-slate-400 hover:text-white text-sm"
        >
          ← Back
        </button>
      </div>
      {secrets.length === 0 ? (
        <p className="text-emerald-300 text-sm">✅ No secrets detected in this run.</p>
      ) : (
        <div className="space-y-2">
          {secrets.map((s: any) => (
            <div
              key={s._id}
              className={`bg-slate-800/30 border rounded-xl p-3 ${
                s.severity === "critical" ? "border-rose-500/30" : "border-amber-500/30"
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                    s.severity === "critical"
                      ? "bg-rose-500 text-white"
                      : "bg-amber-500 text-white"
                  }`}
                >
                  {s.severity}
                </span>
                <span className="text-xs text-slate-300 font-mono">{s.secretType}</span>
                {s.resolved && (
                  <span className="text-xs px-2 py-0.5 bg-emerald-500/20 text-emerald-300 rounded-full">RESOLVED</span>
                )}
              </div>
              <div className="text-xs font-mono text-slate-300 mb-1">
                📁 {s.filePath}:{s.lineNumber}
              </div>
              <div className="text-xs font-mono text-amber-300 mb-1">
                Value: {s.redactedValue}
              </div>
              <div className="text-xs text-slate-400">💡 {s.recommendedAction}</div>
              {!s.resolved && (
                <button
                  onClick={() => markResolved(s._id)}
                  className="mt-2 px-2 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 rounded text-xs font-bold"
                >
                  Mark Resolved
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function HealthSection({ healthResults, summary }: { healthResults: any[] | null; summary: any }) {
  return (
    <>
      {healthResults && healthResults.length > 0 && (
        <div className="bg-slate-900/50 border border-slate-700 rounded-3xl p-6">
          <h3 className="text-lg font-bold text-white mb-4">
            🩺 Live Health Check ({new Date().toLocaleString()})
          </h3>
          <div className="space-y-2">
            {healthResults.map((h, i) => (
              <div key={i} className="flex items-center gap-3 bg-slate-800/30 rounded-xl p-3">
                <span
                  className={`w-3 h-3 rounded-full ${
                    h.status === "healthy"
                      ? "bg-emerald-400"
                      : h.status === "degraded"
                      ? "bg-amber-400"
                      : "bg-rose-400 animate-pulse"
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-white font-bold">{h.endpoint}</div>
                  <div className="text-xs text-slate-400 font-mono truncate">{h.url}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-slate-300 font-mono">
                    {h.responseCode ?? "—"} • {Math.round(h.responseTimeMs ?? 0)}ms
                  </div>
                  <div
                    className={`text-xs font-bold ${
                      h.status === "healthy"
                        ? "text-emerald-300"
                        : h.status === "degraded"
                        ? "text-amber-300"
                        : "text-rose-300"
                    }`}
                  >
                    {h.status.toUpperCase()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {summary && summary.health.total > 0 && (
        <div className="bg-slate-900/50 border border-slate-700 rounded-3xl p-6">
          <h3 className="text-lg font-bold text-white mb-4">📊 Historical Health</h3>
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 text-center">
              <div className="text-2xl font-black text-emerald-300">{summary.health.healthy}</div>
              <div className="text-xs text-slate-400">Healthy</div>
            </div>
            <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-3 text-center">
              <div className="text-2xl font-black text-rose-300">{summary.health.down}</div>
              <div className="text-xs text-slate-400">Down</div>
            </div>
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-3 text-center">
              <div className="text-2xl font-black text-slate-300">{summary.health.total}</div>
              <div className="text-xs text-slate-400">Total</div>
            </div>
          </div>
        </div>
      )}

      {!healthResults && (
        <div className="bg-slate-900/30 border border-slate-700 rounded-3xl p-8 text-center text-slate-400">
          <p>Click <strong>🩺 Live Health Check</strong> above to probe Vercel + Convex endpoints.</p>
        </div>
      )}
    </>
  );
}

function MiniStat({ label, value, color }: { label: string; value: any; color?: string }) {
  return (
    <div className="bg-slate-800/30 rounded-xl p-2">
      <div className="text-[10px] text-slate-400 uppercase font-bold">{label}</div>
      <div className={`text-sm font-bold ${color === "emerald" ? "text-emerald-300" : color === "amber" ? "text-amber-300" : color === "rose" ? "text-rose-300" : color === "blue" ? "text-blue-300" : "text-slate-200"}`}>
        {value}
      </div>
    </div>
  );
}

function DetailCard({ title, items }: { title: string; items: { label: string; value: any; color?: string }[] }) {
  return (
    <div className="bg-slate-800/30 rounded-2xl p-4">
      <h4 className="text-sm font-bold text-white mb-3">{title}</h4>
      <div className="space-y-1.5">
        {items.map((it, i) => (
          <div key={i} className="flex items-center justify-between text-xs">
            <span className="text-slate-400">{it.label}</span>
            <span className={`font-bold ${
              it.color === "emerald" ? "text-emerald-300" :
              it.color === "amber" ? "text-amber-300" :
              it.color === "rose" ? "text-rose-300" :
              it.color === "blue" ? "text-blue-300" :
              "text-slate-200"
            }`}>
              {it.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
