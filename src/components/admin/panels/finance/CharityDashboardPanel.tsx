import { useState } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { convexQuery } from "@convex-dev/react-query";
import { useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { MetricCard } from "../shared";

export function CharityDashboardPanel() {
  const { data: settings } = useSuspenseQuery(convexQuery(api.charity.getSettings, {})) as { data: any };
  const { data: titheHistory } = useSuspenseQuery(convexQuery(api.charity.getHistory, { limit: 10 })) as { data: any };
  const { data: charities } = useSuspenseQuery(convexQuery(api.charity.getCharities, {})) as { data: any };
  const { data: charityStats } = useSuspenseQuery(convexQuery(api.charity.getCharityAdminStats, {})) as { data: any };
  
  const updateSettings = useMutation(api.charity.updateSettings);
  const performTithe = useMutation(api.charity.performTithe);
  const [titheStatus, setTitheStatus] = useState<{ message: string; type: string } | null>(null);
  const [selectedCharity, setSelectedCharity] = useState("");
  const [titheAmount, setTitheAmount] = useState("");
  const [autoTithe, setAutoTithe] = useState(settings?.autoTithe || false);
  const [pauseTithe, setPauseTithe] = useState(settings?.pauseTithe || false);
  const [tithePercentage, setTithePercentage] = useState(settings?.tithePercentage || 10);

  const handleAutoTithe = async () => {
    const newState = !autoTithe;
    await updateSettings({ autoTithe: newState });
    setAutoTithe(newState);
    setTitheStatus({ message: `Auto Tithe ${newState ? "enabled" : "disabled"} (${tithePercentage}% of earnings)`, type: "success" });
    setTimeout(() => setTitheStatus(null), 3000);
  };

  const handlePauseTithe = async () => {
    const newState = !pauseTithe;
    await updateSettings({ pauseTithe: newState });
    setPauseTithe(newState);
    setTitheStatus({ message: `Tithe ${newState ? "paused" : "resumed"}`, type: "success" });
    setTimeout(() => setTitheStatus(null), 3000);
  };

  const handleManualTithe = async () => {
    if (!selectedCharity) {
      alert("Please select a charity");
      return;
    }
    
    setTitheStatus({ message: "Processing tithe...", type: "loading" });
    const result = await performTithe({ 
      type: "manual",
      charityId: selectedCharity,
      amount: titheAmount ? parseFloat(titheAmount) : undefined,
    });
    
    if (result?.success) {
      setTitheStatus({ message: `Tithe of ₦${result.amount?.toLocaleString()} sent to ${result.charityName}!`, type: "success" });
      setTitheAmount("");
    } else {
      setTitheStatus({ message: result?.error || "Tithe failed", type: "error" });
    }
    setTimeout(() => setTitheStatus(null), 5000);
  };

  const handlePercentageChange = async (newPercent: number) => {
    setTithePercentage(newPercent);
    await updateSettings({ tithePercentage: newPercent });
  };

  const wallet = charityStats?.wallet;

  return (
    <div className="space-y-10 ">
      {titheStatus && (
        <div className={`p-4 rounded-2xl text-center text-sm font-black ${
          titheStatus.type === "success" ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" :
          titheStatus.type === "error" ? "bg-red-500/10 text-red-500 border border-red-500/20" :
          "bg-blue-500/10 text-blue-500 border border-blue-500/20"
        }`}>
          {titheStatus.message}
        </div>
      )}

      <div className="bg-slate-900 border border-slate-800 rounded-[3.5rem] p-12 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-600/5 blur-[80px]"></div>
        <div className="relative z-10 space-y-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="space-y-2">
              <h2 className="text-3xl font-black uppercase tracking-tighter text-white">Charity Tithe / Offering</h2>
              <p className="text-sm font-black text-amber-500 uppercase tracking-widest">Support charitable causes with automated or manual transfers</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <MetricCard label="Charity Balance" value={`₦${(wallet?.balance || 0).toLocaleString()}`} icon="🕊️" color="amber" subValue={pauseTithe ? "PAUSED" : "Active"} />
            <MetricCard label="Monthly Earnings" value={`₦${(wallet?.monthlyEarningsSoFar || 0).toLocaleString()}`} icon="💰" color="emerald" subValue={`${wallet?.currentMonth || ""}`} />
            <MetricCard label={`Tithe (${tithePercentage}%)`} value={`₦${((wallet?.monthlyEarningsSoFar || 0) * (tithePercentage / 100)).toLocaleString()}`} icon="🎯" color="blue" />
            <MetricCard label="Lifetime Set Aside" value={`₦${(wallet?.totalSetAsideLifetime || 0).toLocaleString()}`} icon="📈" color="indigo" subValue={`Transferred: ₦${(wallet?.totalTransferred || 0).toLocaleString()}`} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-slate-950 p-6 rounded-2xl border border-white/5 space-y-4">
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">🤖 Auto Tithe</p>
              <button 
                onClick={handleAutoTithe}
                className={`w-full py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                  autoTithe 
                    ? "bg-emerald-600 text-white" 
                    : "bg-slate-800 border border-slate-700 text-white"
                }`}
              >
                {autoTithe ? "✅ Auto Tithe ON" : "⭕ Auto Tithe OFF"}
              </button>
              <p className="text-[8px] text-slate-500">Automatically sends {tithePercentage}% of earnings</p>
            </div>

            <div className="bg-slate-950 p-6 rounded-2xl border border-white/5 space-y-4">
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">⏸️ Pause Tithe</p>
              <button 
                onClick={handlePauseTithe}
                className={`w-full py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                  pauseTithe 
                    ? "bg-amber-600 text-white" 
                    : "bg-slate-800 border border-slate-700 text-white"
                }`}
              >
                {pauseTithe ? "▶️ Resume Tithe" : "⏸️ Pause Tithe"}
              </button>
              <p className="text-[8px] text-slate-500">Temporarily pause automated transfers</p>
            </div>

            <div className="bg-slate-950 p-6 rounded-2xl border border-white/5 space-y-4">
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">📊 Percentage: {tithePercentage}%</p>
              <input
                type="range"
                min="1"
                max="50"
                value={tithePercentage}
                onChange={(e) => handlePercentageChange(parseInt(e.target.value))}
                className="w-full accent-amber-500"
              />
              <div className="flex justify-between text-[8px] text-slate-500">
                <span>1%</span>
                <span>50%</span>
              </div>
            </div>
          </div>

          <div className="bg-slate-950 p-8 rounded-2xl border border-white/5 space-y-6">
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">✋ Manual Transfer Now</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Select Charity</label>
                <select 
                  value={selectedCharity} 
                  onChange={(e) => setSelectedCharity(e.target.value)}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl p-4 text-white text-sm"
                >
                  <option value="">-- Select Charity --</option>
                  {charities?.map((c: any) => (
                    <option key={c.id} value={c.id}>
                      {c.name} - {c.description}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Amount (₦)</label>
                <input
                  type="number"
                  placeholder="Optional - uses percentage if empty"
                  value={titheAmount}
                  onChange={(e) => setTitheAmount(e.target.value)}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl p-4 text-white text-sm"
                />
              </div>
              <div className="flex items-end">
                <button 
                  onClick={handleManualTithe}
                  className="w-full py-4 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                >
                  💸 Send Tithe Now
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-[3.5rem] p-12 shadow-2xl">
        <h3 className="text-xl font-black uppercase tracking-tighter text-white mb-8">Tithe History</h3>
        <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
          {titheHistory?.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-10">No tithes recorded yet. Use Manual Transfer to start.</p>
          ) : (
            titheHistory?.map((tithe: any) => (
              <div key={tithe.id} className="flex justify-between items-center p-6 bg-slate-950 rounded-2xl border border-white/5">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-lg ${
                    tithe.type === "auto" ? "bg-amber-500/10" : "bg-emerald-500/10"
                  }`}>
                    {tithe.type === "auto" ? "🤖" : "✋"}
                  </div>
                  <div>
                    <p className="text-sm font-black text-white">₦{tithe.amount.toLocaleString()}</p>
                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
                      {tithe.charity_name} • {tithe.type} ({tithe.percentage}%) • {tithe.date}
                    </p>
                  </div>
                </div>
                <span className={`text-xs font-bold ${tithe.status === "completed" ? "text-emerald-500" : "text-amber-500"}`}>
                  {tithe.status === "completed" ? "✓" : "⏳"}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
