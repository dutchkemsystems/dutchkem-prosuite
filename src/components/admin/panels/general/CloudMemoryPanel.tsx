import { useState } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { convexQuery } from "@convex-dev/react-query";
import { useAction } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { MetricCard } from "../shared";

export function CloudMemoryPanel({ adminToken }: { adminToken: string }) {
  const { data: health } = useSuspenseQuery(convexQuery(api.cloud_memory.getSystemHealth, {})) as { data: any };
  const { data: backups } = useSuspenseQuery(convexQuery(api.cloud_memory.getAllBackups, {})) as { data: any[] };
  const { data: healingHistory } = useSuspenseQuery(convexQuery(api.cloud_memory.getHealingHistory, { limit: 10 })) as { data: Array<any> };
  const runSelfHealing = useAction(api.cloud_memory.runSelfHealingAction);
  const autoBackup = useAction(api.cloud_memory.autoBackupAction);
  const [healing, setHealing] = useState(false);
  const [backing, setBacking] = useState(false);
  const [lastHealingResult, setLastHealingResult] = useState<any>(null);

  const handleSelfHealing = async () => {
    setHealing(true);
    try {
      const result: any = await runSelfHealing({ adminToken });
      setLastHealingResult(result);
    } catch (err: any) {
      alert(`Self-healing failed: ${err.message}`);
    }
    setHealing(false);
  };

  const handleAutoBackup = async () => {
    setBacking(true);
    try {
      await autoBackup({ adminToken });
      alert("System backup completed successfully!");
    } catch (err: any) {
      alert(`Backup failed: ${err.message}`);
    }
    setBacking(false);
  };

  return (
    <div className="space-y-10 ">
      <div className="bg-slate-900 border border-slate-800 rounded-[3.5rem] p-12 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-600/5 blur-[80px]"></div>
        <div className="relative z-10 space-y-10">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-3xl font-black uppercase tracking-tighter text-white">Cloud Memory & Self-Healing</h2>
              <p className="text-sm font-black text-cyan-500 uppercase tracking-widest mt-1">Automatic Backup • Error Detection • Auto-Recovery</p>
            </div>
            <div className="flex gap-4">
              <button
                onClick={handleAutoBackup}
                disabled={backing}
                className="px-8 py-4 bg-cyan-600 hover:bg-cyan-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl shadow-cyan-600/20 disabled:opacity-50"
              >
                {backing ? "Backing Up..." : "Manual Backup"}
              </button>
              <button
                onClick={handleSelfHealing}
                disabled={healing}
                className="px-8 py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl shadow-emerald-600/20 disabled:opacity-50"
              >
                {healing ? "Healing..." : "Run Self-Healing"}
              </button>
            </div>
          </div>

          {/* Health Status */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <MetricCard label="System Health" value={`${health?.healthScore || 100}%`} icon="🛡️" color={health?.status === 'optimal' ? 'emerald' : 'amber'} subValue={health?.status === 'optimal' ? 'OPTIMAL' : 'DEGRADED'} />
            <MetricCard label="Active Backups" value={health?.backups || 0} icon="☁️" color="cyan" subValue="Auto-synced" />
            <MetricCard label="Active Sessions" value={0} icon="👥" color="blue" />
            <MetricCard label="Stuck Posts" value={health?.social?.stuckPosts || 0} icon="⚠️" color={(health?.social?.stuckPosts || 0) > 0 ? 'red' : 'emerald'} subValue={(health?.social?.stuckPosts || 0) > 0 ? 'Needs attention' : 'All clear'} />
          </div>

          {/* Last Healing Result */}
          {lastHealingResult && (
            <div className={`p-8 rounded-3xl border ${
              lastHealingResult.healed
                ? 'bg-emerald-500/5 border-emerald-500/20'
                : 'bg-slate-950 border-white/5'
            }`}>
              <h3 className="text-lg font-black text-white uppercase tracking-tighter mb-4">
                {lastHealingResult.healed ? '✅ Issues Fixed' : '🔍 Healing Complete'}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Issues Found</p>
                  {lastHealingResult.issues.length === 0 ? (
                    <p className="text-sm text-emerald-500 font-bold">No issues detected</p>
                  ) : (
                    lastHealingResult.issues.map((issue: string, i: number) => (
                      <p key={i} className="text-sm text-amber-500 font-bold">• {issue}</p>
                    ))
                  )}
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Fixes Applied</p>
                  {lastHealingResult.fixes.length === 0 ? (
                    <p className="text-sm text-slate-500 font-bold">No fixes needed</p>
                  ) : (
                    lastHealingResult.fixes.map((fix: string, i: number) => (
                      <p key={i} className="text-sm text-emerald-500 font-bold">✓ {fix}</p>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Backup History */}
          <div className="bg-slate-950 p-10 rounded-[2.5rem] border border-white/5">
            <h3 className="text-lg font-black text-white uppercase tracking-tighter mb-8">Backup History</h3>
            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              {backups?.slice(0, 20).map((backup: any) => (
                <div key={backup._id} className="flex justify-between items-center p-6 bg-slate-900 rounded-2xl border border-white/5">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-cyan-500/10 rounded-2xl flex items-center justify-center text-lg">☁️</div>
                    <div>
                      <p className="text-sm font-black text-white">{backup.backupType.replace(/_/g, ' ').toUpperCase()}</p>
                      <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">
                        {new Date(backup.createdAt).toLocaleString()} • {backup.description}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="px-3 py-1 bg-emerald-500/10 text-emerald-500 rounded-full text-[8px] font-black uppercase">
                      {backup.status}
                    </span>
                    <p className="text-[8px] text-slate-600 font-mono mt-1">{backup.checksum.slice(0, 12)}...</p>
                  </div>
                </div>
              ))}
              {(!backups || backups.length === 0) && (
                <div className="text-center py-20 text-slate-600 font-bold uppercase tracking-widest italic opacity-30">No backups yet</div>
              )}
            </div>
          </div>

          {/* Healing History */}
          <div className="bg-slate-950 p-10 rounded-[2.5rem] border border-white/5">
            <h3 className="text-lg font-black text-white uppercase tracking-tighter mb-8">Self-Healing History</h3>
            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              {healingHistory && healingHistory.length > 0 ? (
                healingHistory.map((entry: any) => {
                  const v = entry.value || {};
                  const issues = v.issues || [];
                  const fixes = v.fixes || [];
                  const ts = v.timestamp || entry.updatedAt || entry._creationTime;
                  return (
                    <div key={entry._id} className="p-6 bg-slate-900 rounded-2xl border border-white/5">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-sm font-black text-white">
                          {new Date(ts).toLocaleString()}
                        </p>
                        <div className="flex gap-2">
                          {fixes.length > 0 && (
                            <span className="px-3 py-1 bg-emerald-500/10 text-emerald-500 rounded-full text-[8px] font-black uppercase">
                              {fixes.length} fix{fixes.length === 1 ? "" : "es"}
                            </span>
                          )}
                          {issues.length > 0 && (
                            <span className="px-3 py-1 bg-amber-500/10 text-amber-500 rounded-full text-[8px] font-black uppercase">
                              {issues.length} issue{issues.length === 1 ? "" : "s"}
                            </span>
                          )}
                          {fixes.length === 0 && issues.length === 0 && (
                            <span className="px-3 py-1 bg-cyan-500/10 text-cyan-500 rounded-full text-[8px] font-black uppercase">
                              OK
                            </span>
                          )}
                        </div>
                      </div>
                      {issues.length > 0 && (
                        <div className="mb-2">
                          {issues.map((issue: string, i: number) => (
                            <p key={i} className="text-[10px] text-amber-400 font-bold">• {issue}</p>
                          ))}
                        </div>
                      )}
                      {fixes.length > 0 && (
                        <div>
                          {fixes.map((fix: string, i: number) => (
                            <p key={i} className="text-[10px] text-emerald-400 font-bold">✓ {fix}</p>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-20 text-slate-600 font-bold uppercase tracking-widest italic opacity-30">
                  No healing attempts yet
                </div>
              )}
            </div>
          </div>

          {/* System Features */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-8 bg-slate-950 rounded-3xl border border-white/5 text-center">
              <div className="text-4xl mb-4">🔄</div>
              <h4 className="text-sm font-black text-white uppercase tracking-widest mb-2">Auto-Backup</h4>
              <p className="text-[10px] text-slate-500 font-bold">System backups every 6 hours to cloud storage</p>
            </div>
            <div className="p-8 bg-slate-950 rounded-3xl border border-white/5 text-center">
              <div className="text-4xl mb-4">🛡️</div>
              <h4 className="text-sm font-black text-white uppercase tracking-widest mb-2">Self-Healing</h4>
              <p className="text-[10px] text-slate-500 font-bold">Automatic error detection and recovery every 30 min</p>
            </div>
            <div className="p-8 bg-slate-950 rounded-3xl border border-white/5 text-center">
              <div className="text-4xl mb-4">📧</div>
              <h4 className="text-sm font-black text-white uppercase tracking-widest mb-2">Email Reports</h4>
              <p className="text-[10px] text-slate-500 font-bold">Healing reports sent to admin email automatically</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
