import { useEffect, useState } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { api, internal } from "../../convex/_generated/api";

type AdminPanelProps = {
  adminToken: string;
};

const DESIGNATED_ACCOUNT = "8121161202";
const PASSKEY_LENGTH = 6;
const PASSKEY_EXPIRY_MIN = 10;

export function RenewalsTithePanel({ adminToken }: AdminPanelProps) {
  const [subTab, setSubTab] = useState<"renewals" | "tithe" | "cac" | "receipts" | "alerts">("renewals");
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [passkeyModal, setPasskeyModal] = useState<{ open: boolean; purpose: string; passkeyId?: string; txId?: string; amount?: number; service?: string }>({ open: false, purpose: "" });

  const showToast = (type: "success" | "error", msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  };

  return (
    <div className="space-y-6">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-2xl shadow-2xl font-bold text-sm ${toast.type === "success" ? "bg-emerald-500 text-white" : "bg-rose-500 text-white"}`}>
          {toast.msg}
        </div>
      )}

      <div className="bg-gradient-to-br from-orange-500/10 to-amber-500/10 border border-orange-500/20 rounded-3xl p-6">
        <h2 className="text-2xl font-black text-white mb-2">🔄 Renewals, Tithe & CAC Automation</h2>
        <p className="text-sm text-slate-300">
          Auto-sweep system: 29-day API renewals • 10% daily tithe • Monthly CAC fraction • Passkey-protected manual transfers
        </p>
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 rounded-full font-bold">Designated: {DESIGNATED_ACCOUNT} (PalmPay)</span>
          <span className="px-3 py-1 bg-blue-500/20 text-blue-300 rounded-full font-bold">Passkey: {PASSKEY_LENGTH}-digit, {PASSKEY_EXPIRY_MIN}-min expiry</span>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {[
          { key: "renewals" as const, label: "🔄 Subscriptions", color: "orange" },
          { key: "tithe" as const, label: "🕊️ Tithe", color: "emerald" },
          { key: "cac" as const, label: "🏛️ CAC Tax", color: "blue" },
          { key: "receipts" as const, label: "🧾 Receipts", color: "purple" },
          { key: "alerts" as const, label: "📊 Usage Alerts", color: "rose" },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setSubTab(t.key)}
            className={`px-4 py-2 rounded-2xl font-bold text-sm transition ${subTab === t.key ? `bg-${t.color}-500 text-white shadow-lg` : "bg-slate-800 text-slate-300 hover:bg-slate-700"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {subTab === "renewals" && <RenewalsSection showToast={showToast} openPasskeyModal={setPasskeyModal} adminToken={adminToken} />}
      {subTab === "tithe" && <TitheSection showToast={showToast} openPasskeyModal={setPasskeyModal} />}
      {subTab === "cac" && <CACSection showToast={showToast} openPasskeyModal={setPasskeyModal} />}
      {subTab === "receipts" && <ReceiptsSection showToast={showToast} />}
      {subTab === "alerts" && <UsageAlertsSection showToast={showToast} />}

      {passkeyModal.open && (
        <PasskeyModal
          modal={passkeyModal}
          onClose={() => setPasskeyModal({ open: false, purpose: "" })}
          onSuccess={(msg) => {
            showToast("success", msg);
            setPasskeyModal({ open: false, purpose: "" });
          }}
          onError={(msg) => showToast("error", msg)}
        />
      )}
    </div>
  );
}

function RenewalsSection({ showToast, openPasskeyModal, adminToken }: { showToast: (t: "success" | "error", m: string) => void; openPasskeyModal: (m: any) => void; adminToken: string }) {
  const configs: any = useQuery(api.subscription_renewal.getAllConfigs, {});
  const history: any = useQuery(api.subscription_renewal.getRenewalHistory, { limit: 20 });
  const stats: any = useQuery(api.subscription_renewal.getRenewalStats, {});
  const seedDefaults: any = useMutation(api.subscription_renewal.seedDefaultConfigsPublic);

  const handleSeed = async () => {
    try {
      const result = await seedDefaults({});
      showToast("success", result?.message || "Seeded");
    } catch (e: any) {
      showToast("error", e.message);
    }
  };

  const handleManualRenewal = (configId: string, service: string, amount: number) => {
    openPasskeyModal({ open: true, purpose: `renewal-${configId}`, service, amount, txId: configId });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-black text-white">29-Day API Subscription Renewals</h3>
        <button onClick={handleSeed} className="px-4 py-2 bg-orange-500 text-white rounded-xl text-xs font-bold hover:bg-orange-600">
          Seed Defaults
        </button>
      </div>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatBox label="Active Subs" value={stats.activeConfigs || 0} color="emerald" />
          <StatBox label="Total Spent" value={`₦${(stats.last30Days?.totalSpent || 0).toLocaleString()}`} color="blue" />
          <StatBox label="Due Now" value={stats.dueNow || 0} color="amber" />
          <StatBox label="Total Configs" value={stats.totalConfigs || 0} color="purple" />
        </div>
      )}

      <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4">
        <h4 className="font-black text-white mb-3">Configured Subscriptions</h4>
        {!configs || configs.length === 0 ? (
          <p className="text-sm text-slate-400">No subscriptions configured. Click "Seed Defaults" to add Kora, Termii, Resend, Deepgram, LiveKit, NVIDIA NIM.</p>
        ) : (
          <div className="space-y-2">
            {configs.map((c: any) => (
              <div key={c._id} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-xl">
                <div>
                  <p className="font-bold text-white text-sm">{c.serviceName} <span className="text-slate-400 font-normal">({c.service})</span></p>
                  <p className="text-xs text-slate-400">Next: {c.nextRenewalAt ? new Date(c.nextRenewalAt).toLocaleDateString() : "—"} • Cycle: {c.cycleDays}d</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-emerald-400 font-bold text-sm">₦{c.amountNgn.toLocaleString()}</span>
                  <button onClick={() => handleManualRenewal(c._id, c.service, c.amountNgn)} className="px-3 py-1 bg-orange-500 text-white rounded-lg text-xs font-bold">Manual</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4">
        <h4 className="font-black text-white mb-3">Recent Renewal History</h4>
        {!history || history.length === 0 ? (
          <p className="text-sm text-slate-400">No renewals yet.</p>
        ) : (
          <div className="space-y-1">
            {history.slice(0, 10).map((h: any) => (
              <div key={h._id} className="flex items-center justify-between p-2 text-xs">
                <span className="text-white font-bold">{h.service}</span>
                <span className="text-slate-400">{new Date(h.timestamp).toLocaleString()}</span>
                <span className={`font-bold ${h.status === "completed" ? "text-emerald-400" : h.status === "failed" ? "text-rose-400" : "text-amber-400"}`}>{h.status}</span>
                <span className="text-white">₦{(h.amountNgn || 0).toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function TitheSection({ showToast, openPasskeyModal }: { showToast: (t: "success" | "error", m: string) => void; openPasskeyModal: (m: any) => void }) {
  const history: any = useQuery(api.tithe_deductions.getTitheHistory, { limit: 30 });
  const stats: any = useQuery(api.tithe_deductions.getTitheStats, {});

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-black text-white">🕊️ Tithe Deductions (10% of revenue)</h3>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatBox label="Total Deducted" value={`₦${(stats.allTime?.totalDeducted || 0).toLocaleString()}`} color="emerald" />
          <StatBox label="Total Transferred" value={`₦${(stats.allTime?.totalTransferred || 0).toLocaleString()}`} color="blue" />
          <StatBox label="Wallet Balance" value={`₦${(stats.wallet?.balance || 0).toLocaleString()}`} color="amber" />
          <StatBox label="This Month" value={`₦${(stats.thisMonth?.totalDeducted || 0).toLocaleString()}`} color="purple" />
        </div>
      )}

      <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-black text-white">Recent Tithe Deductions</h4>
          <button onClick={() => openPasskeyModal({ open: true, purpose: "manual-tithe" })} className="px-3 py-1 bg-emerald-500 text-white rounded-lg text-xs font-bold">Manual Transfer</button>
        </div>
        {!history || history.length === 0 ? (
          <p className="text-sm text-slate-400">No tithe deductions yet. Cron runs daily at 23:55.</p>
        ) : (
          <div className="space-y-1">
            {history.slice(0, 15).map((h: any) => (
              <div key={h._id} className="flex items-center justify-between p-2 text-xs">
                <span className="text-white font-bold">{h.type}</span>
                <span className="text-slate-400">{new Date(h.date).toLocaleDateString()}</span>
                <span className={`font-bold ${h.status === "completed" ? "text-emerald-400" : "text-amber-400"}`}>{h.status}</span>
                <span className="text-white">₦{(h.amountNgn || 0).toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function CACSection({ showToast, openPasskeyModal }: { showToast: (t: "success" | "error", m: string) => void; openPasskeyModal: (m: any) => void }) {
  const history: any = useQuery(api.cac_deductions.getCacHistory, { limit: 30 });
  const stats: any = useQuery(api.cac_deductions.getCacStats, {});

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-black text-white">🏛️ CAC Annual Returns (₦100,000/yr → ₦8,333/mo)</h3>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatBox label="Annual Fee" value={`₦${(stats.annualFee || 0).toLocaleString()}`} color="blue" />
          <StatBox label="Deducted YTD" value={`₦${(stats.totalDeductedThisYear || 0).toLocaleString()}`} color="emerald" />
          <StatBox label="Tax Wallet" value={`₦${(stats.taxWalletBalance || 0).toLocaleString()}`} color="amber" />
          <StatBox label="Remaining" value={`₦${(stats.remainingForYear || 0).toLocaleString()}`} color="purple" />
        </div>
      )}

      <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-black text-white">Recent CAC Remittances</h4>
          <button onClick={() => openPasskeyModal({ open: true, purpose: "manual-cac" })} className="px-3 py-1 bg-blue-500 text-white rounded-lg text-xs font-bold">Manual Remittance</button>
        </div>
        {!history || history.length === 0 ? (
          <p className="text-sm text-slate-400">No CAC transactions yet. Cron runs 1st of each month at 00:05.</p>
        ) : (
          <div className="space-y-1">
            {history.slice(0, 15).map((h: any) => (
              <div key={h._id} className="flex items-center justify-between p-2 text-xs">
                <span className="text-white font-bold">{h.type}</span>
                <span className="text-slate-400">{new Date(h.date).toLocaleDateString()}</span>
                <span className={`font-bold ${h.status === "completed" ? "text-emerald-400" : "text-amber-400"}`}>{h.status}</span>
                <span className="text-white">₦{(h.amountNgn || 0).toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ReceiptsSection({ showToast }: { showToast: (t: "success" | "error", m: string) => void }) {
  const receipts: any = useQuery(api.receipts_v2.getAllReceipts, { limit: 50 });
  const stats: any = useQuery(api.receipts_v2.getReceiptStats, {});

  const downloadHtml = (r: any) => {
    try {
      const html = generateReceiptHtml(r);
      const blob = new Blob([html], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${r.receiptNumber}.html`;
      link.click();
      URL.revokeObjectURL(url);
      showToast("success", `Receipt ${r.receiptNumber} downloaded`);
    } catch (e: any) {
      showToast("error", e.message);
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-black text-white">🧾 Generated Receipts</h3>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatBox label="Total" value={stats.total || 0} color="purple" />
          <StatBox label="This Month" value={stats.thisMonth || 0} color="emerald" />
          <StatBox label="Downloads" value={stats.totalDownloads || 0} color="blue" />
          <StatBox label="Total Amount" value={`₦${(stats.totalAmount || 0).toLocaleString()}`} color="amber" />
        </div>
      )}

      <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4">
        <h4 className="font-black text-white mb-3">All Receipts</h4>
        {!receipts || receipts.length === 0 ? (
          <p className="text-sm text-slate-400">No receipts generated yet. Receipts are auto-created on every successful transfer.</p>
        ) : (
          <div className="space-y-1">
            {receipts.map((r: any) => (
              <div key={r._id} className="flex items-center justify-between p-2 text-xs">
                <span className="text-white font-bold font-mono">{r.receiptNumber}</span>
                <span className="text-slate-400">{r.transactionType}</span>
                <span className="text-emerald-400 font-bold">₦{(r.amountNgn || 0).toLocaleString()}</span>
                <span className="text-slate-400">{new Date(r.createdAt).toLocaleDateString()}</span>
                <button onClick={() => downloadHtml(r)} className="px-2 py-1 bg-purple-500 text-white rounded text-xs">Download</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function UsageAlertsSection({ showToast }: { showToast: (t: "success" | "error", m: string) => void }) {
  const alerts: any = useQuery(api.usage_alerts.getActiveAlerts, {});
  const summary: any = useQuery(api.usage_alerts.getUsageSummary, {});
  const acknowledge: any = useMutation(api.usage_alerts.acknowledgeAlert);

  const handleAck = async (id: string) => {
    try { await acknowledge({ alertId: id as any }); showToast("success", "Alert acknowledged"); }
    catch (e: any) { showToast("error", e.message); }
  };

  const summaryArr: Array<any> = Array.isArray(summary) ? summary : [];
  const avgUsage = summaryArr.length > 0 ? summaryArr.reduce((a, b) => a + (b.percentage || 0), 0) / summaryArr.length : 0;
  const criticalCount = summaryArr.filter((s) => s.status === "critical" || s.status === "exceeded").length;

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-black text-white">📊 Usage Alerts (80% / 90% / 95% / 100%)</h3>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatBox label="Active Alerts" value={alerts?.length || 0} color="rose" />
        <StatBox label="Critical Services" value={criticalCount} color="rose" />
        <StatBox label="Services" value={summaryArr.length} color="blue" />
        <StatBox label="Avg Usage" value={`${avgUsage.toFixed(1)}%`} color="amber" />
      </div>

      <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4">
        <h4 className="font-black text-white mb-3">Active Alerts</h4>
        {!alerts || alerts.length === 0 ? (
          <p className="text-sm text-slate-400">No active alerts. Cron checks every 6 hours.</p>
        ) : (
          <div className="space-y-2">
            {alerts.map((a: any) => (
              <div key={a._id} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-xl">
                <div>
                  <p className="font-bold text-white text-sm">{a.serviceName || a.service}</p>
                  <p className="text-xs text-slate-400">{a.threshold}% threshold • {a.period}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`font-bold text-sm ${a.threshold >= 95 ? "text-rose-400" : a.threshold >= 90 ? "text-orange-400" : "text-amber-400"}`}>
                    {(a.usagePercent || 0).toFixed(1)}% used
                  </span>
                  <button onClick={() => handleAck(a._id)} className="px-3 py-1 bg-slate-700 text-white rounded-lg text-xs">Ack</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {summaryArr.length > 0 && (
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4">
          <h4 className="font-black text-white mb-3">Service Usage</h4>
          <div className="space-y-2">
            {summaryArr.map((s: any) => (
              <div key={s.service} className="flex items-center justify-between p-2 text-xs">
                <span className="text-white font-bold">{s.displayName || s.service}</span>
                <div className="flex-1 mx-3 h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div className={`h-full ${s.percentage >= 95 ? "bg-rose-500" : s.percentage >= 80 ? "bg-amber-500" : "bg-emerald-500"}`} style={{ width: `${Math.min(100, s.percentage)}%` }}></div>
                </div>
                <span className="text-slate-300 w-20 text-right">{s.usage || 0}/{s.limit || 0} {s.unit || ""}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function PasskeyModal({ modal, onClose, onSuccess, onError }: { modal: any; onClose: () => void; onSuccess: (m: string) => void; onError: (m: string) => void }) {
  const [passkey, setPasskey] = useState("");
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState<{ passkey: string; expiresAt: number; passkeyId: string } | null>(null);
  const generate: any = useMutation(api.transfer_passkeys.generateTransferPasskey);
  const verify: any = useMutation(api.transfer_passkeys.verifyTransferPasskey);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const result = await generate({ purpose: modal.purpose });
      setGenerated({ passkey: result.passkey, expiresAt: result.expiresAt, passkeyId: result.passkeyId });
    } catch (e: any) { onError(e.message); }
    finally { setLoading(false); }
  };

  const handleVerify = async () => {
    if (!generated) return onError("Generate a passkey first");
    if (passkey.length !== PASSKEY_LENGTH) return onError(`Passkey must be ${PASSKEY_LENGTH} digits`);
    setLoading(true);
    try {
      const result = await verify({ passkeyId: generated.passkeyId, passkey });
      if (result.success) { onSuccess("Transfer authorized! Executing..."); onClose(); }
      else { onError(result.error || "Invalid or expired passkey"); }
    } catch (e: any) { onError(e.message); }
    finally { setLoading(false); setPasskey(""); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl p-8 max-w-md w-full mx-4 shadow-2xl">
        <h3 className="text-xl font-black text-white mb-4">🔐 Passkey-Protected Transfer</h3>
        <p className="text-sm text-slate-300 mb-4">
          This {modal.purpose} requires a {PASSKEY_LENGTH}-digit passkey valid for {PASSKEY_EXPIRY_MIN} minutes.
        </p>

        {!generated ? (
          <button onClick={handleGenerate} disabled={loading} className="w-full py-3 bg-orange-500 text-white rounded-xl font-bold hover:bg-orange-600 disabled:opacity-50">
            {loading ? "Generating..." : `Generate Passkey`}
          </button>
        ) : (
          <div className="space-y-4">
            <div className="bg-slate-800/50 p-4 rounded-xl">
              <p className="text-xs text-slate-400 mb-1">Your passkey (shown once):</p>
              <p className="text-3xl font-black text-orange-400 tracking-widest text-center font-mono">{generated.passkey}</p>
              <p className="text-xs text-slate-400 mt-2 text-center">Expires: {new Date(generated.expiresAt).toLocaleTimeString()}</p>
            </div>
            <input
              type="text"
              maxLength={PASSKEY_LENGTH}
              value={passkey}
              onChange={(e) => setPasskey(e.target.value.replace(/\D/g, ""))}
              placeholder={`Enter ${PASSKEY_LENGTH}-digit passkey`}
              className="w-full px-4 py-3 bg-slate-800 text-white rounded-xl text-center text-2xl font-mono tracking-widest"
            />
            <button onClick={handleVerify} disabled={loading || passkey.length !== PASSKEY_LENGTH} className="w-full py-3 bg-emerald-500 text-white rounded-xl font-bold hover:bg-emerald-600 disabled:opacity-50">
              {loading ? "Verifying..." : "Verify & Execute"}
            </button>
          </div>
        )}

        <button onClick={onClose} className="w-full mt-3 py-2 text-slate-400 text-sm">Cancel</button>
      </div>
    </div>
  );
}

function StatBox({ label, value, color }: { label: string; value: any; color: string }) {
  const colors: Record<string, string> = {
    emerald: "from-emerald-500/20 to-emerald-600/10 border-emerald-500/30",
    blue: "from-blue-500/20 to-blue-600/10 border-blue-500/30",
    amber: "from-amber-500/20 to-amber-600/10 border-amber-500/30",
    rose: "from-rose-500/20 to-rose-600/10 border-rose-500/30",
    purple: "from-purple-500/20 to-purple-600/10 border-purple-500/30",
    orange: "from-orange-500/20 to-orange-600/10 border-orange-500/30",
  };
  return (
    <div className={`bg-gradient-to-br ${colors[color] || colors.blue} border rounded-2xl p-4`}>
      <p className="text-xs text-slate-400 uppercase font-bold">{label}</p>
      <p className="text-2xl font-black text-white mt-1">{value}</p>
    </div>
  );
}

function generateReceiptHtml(r: any): string {
  return `<!DOCTYPE html><html><head><title>Receipt ${r.receiptNumber}</title><style>body{font-family:system-ui;padding:40px;max-width:600px;margin:0 auto;background:#f8fafc}h1{color:#059669;border-bottom:2px solid #059669;padding-bottom:10px}table{width:100%;border-collapse:collapse;margin-top:20px}td{padding:8px;border-bottom:1px solid #e2e8f0}.label{color:#64748b;font-weight:bold}.value{color:#0f172a;text-align:right}.total{font-size:24px;color:#059669;font-weight:900;margin-top:20px;text-align:right}</style></head><body><h1>🧾 Dutchkem Ventures — Receipt</h1><table><tr><td class="label">Receipt #</td><td class="value">${r.receiptNumber}</td></tr><tr><td class="label">Type</td><td class="value">${r.transactionType}</td></tr><tr><td class="label">Amount</td><td class="value">₦${(r.amountNgn || 0).toLocaleString()}</td></tr><tr><td class="label">Date</td><td class="value">${new Date(r.createdAt).toLocaleString()}</td></tr><tr><td class="label">Account</td><td class="value">${DESIGNATED_ACCOUNT} (PalmPay)</td></tr></table><p class="total">Total: ₦${(r.amountNgn || 0).toLocaleString()}</p><p style="text-align:center;margin-top:40px;color:#64748b;font-size:12px">Thank you for your business. — Dutchkem Ventures</p></body></html>`;
}

export default RenewalsTithePanel;
