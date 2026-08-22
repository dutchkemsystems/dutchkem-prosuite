import { useState } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { convexQuery } from "@convex-dev/react-query";
import { useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { LiveTransferPanel } from "./LiveTransferPanel";

export function DailySweepStatusPanel({ adminToken }: { adminToken: string }) {
  const { data: settings } = useSuspenseQuery(convexQuery(api.secure_sweeps.getSettings, {})) as { data: any };
  const { data: sweepHistory } = useSuspenseQuery(convexQuery(api.secure_sweeps.getHistory, { limit: 10 })) as { data: any };
  const { data: sweepStats } = useSuspenseQuery(convexQuery(api.secure_sweeps.getSweepStats, {})) as { data: any };
  const { data: beneficiaries } = useSuspenseQuery(convexQuery(api.payouts.getBeneficiaries, {})) as { data: any };
  const { data: earnings } = useSuspenseQuery(convexQuery(api.admin.getEarningsSummary, {})) as { data: any };
  const { data: banks } = useSuspenseQuery(convexQuery(api.fintech.getAvailableBanks, {})) as { data: any };

  const updateSettings = useMutation(api.secure_sweeps.updateSettings);
  const performSweep = useMutation(api.secure_sweeps.performSweep);
  const generatePasskey = useMutation(api.secure_sweeps.generatePasskey);

  const [sweeping, setSweeping] = useState(false);
  const [sweepStatus, setSweepStatus] = useState<{ message: string; type: string } | null>(null);
  const [manualSweepAmount, setManualSweepAmount] = useState("");
  const [sweepRemarks, setSweepRemarks] = useState("");

  const [showPasskeyModal, setShowPasskeyModal] = useState(false);
  const [passkeyCode, setPasskeyCode] = useState("");
  const [passkeyId, setPasskeyId] = useState("");
  const [generatedPasskey, setGeneratedPasskey] = useState("");

  const [transferStatus, setTransferStatus] = useState<{ message: string; type: string } | null>(null);

  const [showReceipt, setShowReceipt] = useState(false);
  const [receipt, setReceipt] = useState<any>(null);

  const handleAutoSweepToggle = async () => {
    const newState = !settings?.autoSweep;
    await updateSettings({ autoSweep: newState });
    setSweepStatus({ message: `Auto Sweep ${newState ? "enabled" : "disabled"}`, type: "success" });
    setTimeout(() => setSweepStatus(null), 3000);
  };

  const handlePauseSchedule = async () => {
    const newState = !settings?.pauseSchedule;
    await updateSettings({ pauseSchedule: newState });
    setSweepStatus({ message: `Schedule ${newState ? "paused" : "resumed"}`, type: "success" });
    setTimeout(() => setSweepStatus(null), 3000);
  };

  const handleManualSweep = async () => {
    const pkResult = await generatePasskey({});
    if (!pkResult?.success) {
      setSweepStatus({ message: "Failed to generate passkey", type: "error" });
      return;
    }
    setPasskeyId(pkResult.passkeyId);
    setGeneratedPasskey(pkResult.passkey);
    setShowPasskeyModal(true);
  };

  const handleConfirmManualSweep = async () => {
    if (passkeyCode !== generatedPasskey) {
      setSweepStatus({ message: "Invalid passkey", type: "error" });
      return;
    }
    setShowPasskeyModal(false);
    setSweeping(true);
    setSweepStatus({ message: "Processing sweep with Kora Pay...", type: "loading" });
    try {
      const amount = manualSweepAmount ? parseFloat(manualSweepAmount) : undefined;
      const result = await performSweep({
        type: "manual",
        amount,
        passkeyId,
        passkey: passkeyCode,
        remarks: sweepRemarks || undefined,
      });
      if (result?.success) {
        setReceipt(result.receipt);
        setShowReceipt(true);
        setSweepStatus({ message: `Sweep completed! ₦${result.amount?.toLocaleString()} transferred.`, type: "success" });
      } else {
        setSweepStatus({ message: result?.error || "Sweep failed", type: "error" });
      }
    } catch (err: any) {
      setSweepStatus({ message: err.message, type: "error" });
    }
    setSweeping(false);
    setTimeout(() => setSweepStatus(null), 5000);
  };

  return (
    <div className="space-y-10 ">
      {sweepStatus && (
        <div className={`p-4 rounded-2xl text-center text-sm font-black ${
          sweepStatus.type === "success" ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" :
          sweepStatus.type === "error" ? "bg-red-500/10 text-red-500 border border-red-500/20" :
          "bg-blue-500/10 text-blue-500 border border-blue-500/20"
        }`}>
          {sweepStatus.message}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <div className="bg-slate-900 border border-slate-800 rounded-[3.5rem] p-12 space-y-8 shadow-2xl relative overflow-hidden">
          <div className="flex justify-between items-center">
            <h3 className="text-2xl font-black uppercase tracking-tighter text-white">Daily Secure Sweep</h3>
            <span className="px-4 py-1 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-full text-[9px] font-black">LIVE KORA PAY</span>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="bg-slate-950 p-6 rounded-2xl border border-white/5">
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Scheduled Time</p>
              <p className="text-xl font-black text-white">{settings?.sweepTime || "22:00"} WAT</p>
            </div>
            <div className="bg-slate-950 p-6 rounded-2xl border border-white/5">
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Main Wallet</p>
              <p className="text-xl font-black text-emerald-500">₦{(earnings?.walletBalance || 0).toLocaleString()}</p>
            </div>
            <div className="bg-slate-950 p-6 rounded-2xl border border-white/5">
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Today Swept</p>
              <p className="text-xl font-black text-white">₦{(sweepStats?.today?.amount || 0).toLocaleString()}</p>
            </div>
            <div className="bg-slate-950 p-6 rounded-2xl border border-white/5">
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">This Month</p>
              <p className="text-xl font-black text-white">₦{(sweepStats?.month?.amount || 0).toLocaleString()}</p>
            </div>
          </div>

          <div className="bg-slate-950 p-6 rounded-2xl border border-white/5 space-y-4">
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Manual Sweep Amount</p>
            <div className="flex gap-3">
              <input
                type="number"
                value={manualSweepAmount}
                onChange={(e) => setManualSweepAmount(e.target.value)}
                placeholder="Enter amount to sweep"
                className="flex-1 bg-slate-900 border border-white/10 rounded-xl p-4 text-white text-sm"
              />
              <button
                onClick={handleManualSweep}
                disabled={!manualSweepAmount || parseFloat(manualSweepAmount) <= 0 || sweeping}
                className="px-6 py-4 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:opacity-50 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
              >
                {sweeping ? "..." : "Apply"}
              </button>
            </div>
            <input
              type="text"
              value={sweepRemarks}
              onChange={(e) => setSweepRemarks(e.target.value)}
              placeholder="Remarks (optional)"
              className="w-full bg-slate-900 border border-white/10 rounded-xl p-4 text-white text-sm"
            />
            <p className="text-[8px] text-slate-600">Enter amount and click Apply to sweep immediately via Kora Pay</p>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between text-[10px] font-black border-b border-white/5 pb-2">
              <span className="text-slate-500 uppercase">DESTINATION</span>
              <span className="text-white uppercase">{beneficiaries?.[0]?.bankName || "OPAY"} (••••••{beneficiaries?.[0]?.encryptedAccountNumber?.slice(-4) || "1202"})</span>
            </div>
            <div className="flex justify-between text-[10px] font-black">
              <span className="text-slate-500 uppercase">PAYOUT FREQUENCY</span>
              <span className="text-white uppercase">DAILY ({settings?.sweepTime || "11 PM"})</span>
            </div>
            <div className="flex justify-between text-[10px] font-black">
              <span className="text-slate-500 uppercase">STATUS</span>
              <span className={`uppercase ${settings?.autoSweep ? "text-emerald-500" : "text-amber-500"}`}>
                {settings?.pauseSchedule ? "PAUSED" : settings?.autoSweep ? "ACTIVE" : "MANUAL"}
              </span>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex gap-4">
              <button
                onClick={handleAutoSweepToggle}
                className={`flex-1 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                  settings?.autoSweep
                    ? "bg-emerald-600 text-white"
                    : "bg-slate-800 border border-slate-700 text-white"
                }`}
              >
                {settings?.autoSweep ? "Auto Sweep ON" : "Auto Sweep OFF"}
              </button>
              <button
                onClick={handlePauseSchedule}
                className={`flex-1 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                  settings?.pauseSchedule
                    ? "bg-amber-600 text-white"
                    : "bg-slate-800 border border-slate-700 text-white"
                }`}
              >
                {settings?.pauseSchedule ? "Resume" : "Pause"}
              </button>
            </div>
            <button
              onClick={handleManualSweep}
              disabled={sweeping}
              className="w-full py-4 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest disabled:opacity-50 transition-all"
            >
              {sweeping ? "Processing with Kora Pay..." : "Sweep Now (Live Transfer)"}
            </button>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-[3.5rem] p-12 shadow-2xl">
          <h3 className="text-xl font-black uppercase tracking-tighter mb-6">Payout History</h3>
          <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
            {sweepHistory?.length === 0 ? (
              <p className="text-slate-500 text-sm text-center py-10">No sweeps performed yet. Use Manual Sweep to start.</p>
            ) : (
              sweepHistory?.map((sweep: any) => (
                <div key={sweep.id} className="bg-slate-950 p-6 rounded-2xl border border-white/5 flex justify-between items-center">
                  <div>
                    <p className="text-sm font-black text-white">₦{sweep.amount.toLocaleString()}</p>
                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
                      {sweep.type} • {sweep.date}
                    </p>
                    {sweep.reference && (
                      <p className="text-[8px] font-mono text-slate-600 mt-1">{sweep.reference}</p>
                    )}
                  </div>
                  <span className={`text-xs font-bold ${sweep.status === "completed" ? "text-emerald-500" : sweep.status === "failed" ? "text-red-500" : "text-amber-500"}`}>
                    {sweep.status === "completed" ? "✓ DONE" : sweep.status === "failed" ? "✗ FAIL" : "⏳ PENDING"}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <LiveTransferPanel
        banks={banks}
        passkeyModal={{
          show: showPasskeyModal,
          setShow: setShowPasskeyModal,
          code: passkeyCode,
          setCode: setPasskeyCode,
          generated: generatedPasskey,
          passkeyId,
          setPasskeyId,
          setGenerated: setGeneratedPasskey,
        }}
        receipt={{
          show: showReceipt,
          setShow: setShowReceipt,
          data: receipt,
          setData: setReceipt,
        }}
        transferStatus={transferStatus}
        setTransferStatus={setTransferStatus}
        setSweepStatus={setSweepStatus}
      />
    </div>
  );
}
