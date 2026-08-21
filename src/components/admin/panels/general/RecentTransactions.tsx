import { useSuspenseQuery } from "@tanstack/react-query";
import { convexQuery } from "@convex-dev/react-query";
import { api } from "../../../../../convex/_generated/api";

export function RecentTransactions() {
  const { data: txs } = useSuspenseQuery(convexQuery(api.admin.getRecentTransactions, { adminToken: localStorage.getItem("admin_session_token") || "" })) as { data: any[] };
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-[3rem] overflow-hidden shadow-2xl ">
      <div className="p-10 border-b border-slate-800 flex justify-between items-center">
        <h2 className="text-xl font-black uppercase tracking-tighter">Live Transaction Ledger</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-slate-950/50 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
            <tr>
              <th className="px-10 py-6">Transaction ID</th>
              <th className="px-10 py-6">Agent</th>
              <th className="px-10 py-6">Amount (₦)</th>
              <th className="px-10 py-6">Fee (15%)</th>
              <th className="px-10 py-6">Your Share</th>
              <th className="px-10 py-6">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800 text-[11px]">
            {txs.map((tx: any) => (
              <tr key={tx._id} className="hover:bg-slate-800/30 transition-colors group">
                <td className="px-10 py-6 font-mono text-slate-400">ID:{tx.reference.slice(-8)}</td>
                <td className="px-10 py-6 font-black text-white">{tx.agentId || 'A-NODE-1'}</td>
                <td className="px-10 py-6 font-bold text-white text-xs">₦{tx.amount.toLocaleString()}</td>
                <td className="px-10 py-6 font-bold text-red-500">- ₦{(tx.amount * 0.15).toLocaleString()}</td>
                <td className="px-10 py-6 font-black text-emerald-500">+ ₦{(tx.amount * 0.85).toLocaleString()}</td>
                <td className="px-10 py-6">
                  <span className={`px-2 py-1 rounded text-[9px] font-black uppercase border ${tx.status === 'approved' ? 'text-emerald-500 border-emerald-500/20' : 'text-red-500 border-red-500/20'}`}>{tx.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
