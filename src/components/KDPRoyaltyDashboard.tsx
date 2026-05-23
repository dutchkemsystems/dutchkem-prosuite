import { useSuspenseQuery } from "@tanstack/react-query";
import { convexQuery } from "@convex-dev/react-query";
import { api } from "../../convex/_generated/api";
import { useMutation } from "convex/react";
import { useState } from "react";

export function KDPRoyaltyDashboard({ userId }: { userId: any }) {
  const { data: royalties } = useSuspenseQuery(convexQuery(api.kdp_agent.getRoyalties, { userId }));
  const importRoyalties = useMutation(api.kdp_agent.importRoyalties);

  const total = royalties.reduce((acc, r) => acc + r.amount, 0);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Simulate CSV parsing
    const mockData = [
      { bookTitle: "Passive Income Guide", amount: 150.50, currency: "USD", date: "2026-04" },
      { bookTitle: "Passive Income Guide", amount: 210.20, currency: "USD", date: "2026-05" },
    ];

    await importRoyalties({ userId, data: mockData });
  };

  return (
    <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-8 space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-xl font-black text-white uppercase tracking-tighter">Amazon KDP Royalty Tracker</h3>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Real-time earnings from your KDP dashboard</p>
        </div>
        <div className="flex flex-col items-end">
          <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-1">Total Royalties</p>
          <p className="text-3xl font-black text-emerald-500 tracking-tighter">${total.toLocaleString()}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-6 bg-slate-950 rounded-2xl border border-white/5 space-y-4">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Import KDP Report (CSV)</p>
          <input 
            type="file" 
            accept=".csv" 
            onChange={handleFileUpload}
            className="w-full text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-[10px] file:font-black file:bg-slate-800 file:text-slate-100 hover:file:bg-slate-700 cursor-pointer"
          />
        </div>
        <div className="p-6 bg-slate-950 rounded-2xl border border-white/5 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Payout Status</p>
            <p className="text-sm font-bold text-white mt-1">Pending Transfer</p>
          </div>
          <span className="w-3 h-3 bg-orange-500 rounded-full animate-pulse"></span>
        </div>
      </div>

      <div className="space-y-4">
        {royalties.map((r, i) => (
          <div key={i} className="flex justify-between items-center p-4 bg-slate-950 rounded-2xl border border-white/5 transition-all hover:border-indigo-500/30">
            <div>
              <p className="text-sm font-black text-white">{r.bookTitle}</p>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{r.date}</p>
            </div>
            <p className="font-black text-emerald-500 tracking-tighter">+${r.amount.toLocaleString()}</p>
          </div>
        ))}
        {royalties.length === 0 && (
          <div className="text-center py-10 opacity-30">
            <p className="text-[10px] font-black uppercase tracking-widest">No royalty data found</p>
          </div>
        )}
      </div>
    </div>
  );
}
