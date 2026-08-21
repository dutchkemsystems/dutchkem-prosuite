import { useState, useEffect } from "react";
import { MetricCard } from "../shared";

export function StatsOverview({ data, earnings, uaeStatus }: any) {
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const [liveEarnings, setLiveEarnings] = useState(earnings);
  const [liveTxs, setLiveTxs] = useState<any[]>([]);
  const [exchangeRates, setExchangeRates] = useState<Record<string, number>>({
    NGN: 1,
    USD: 1500,
    GBP: 1900,
    EUR: 1650,
  });

  const CURRENCY_SYMBOLS: Record<string, string> = {
    NGN: '₦',
    USD: '$',
    GBP: '£',
    EUR: '€',
  };

  const walletBalance = liveEarnings?.allTime?.share || 0;
  const walletCurrencies = Object.entries(exchangeRates).map(([code, rate]) => ({
    code,
    symbol: CURRENCY_SYMBOLS[code],
    amount: Math.round(walletBalance / rate),
    rate,
  }));

  useEffect(() => {
    const fetchLive = async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_CONVEX_URL.replace('.cloud', '.site')}/api/admin/earnings-live`);
        if (res.ok) {
          const d = await res.json();
          if (d.earnings) setLiveEarnings(d.earnings);
          if (d.txs) setLiveTxs(d.txs);
          if (d.exchangeRates) setExchangeRates(d.exchangeRates);
        }
      } catch (e) { console.error("Failed to fetch live earnings:", e); }
    };
    fetchLive();
    const interval = setInterval(fetchLive, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleCardClick = (card: string) => {
    setExpandedCard(expandedCard === card ? null : card);
  };

  const formatTx = (tx: any) => ({
    id: tx._id || tx.reference,
    name: tx.platformUsername || tx.accountName || "User",
    bank: tx.bankName || tx.platform || "N/A",
    purpose: tx.purpose || tx.agentId || "Service payment",
    amount: tx.amount,
    fee: Math.round(tx.amount * 0.15),
    share: Math.round(tx.amount * 0.85),
    time: tx.verifiedAt || tx._creationTime,
    status: tx.status,
  });

  return (
    <div className="space-y-10 ">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        <MetricCard
          label="Monthly Payout (Est)"
          value={`₦${((liveEarnings?.month?.share || 0) / 1000000).toFixed(2)}M`}
          icon="💰" color="emerald"
          subValue="Ready to Sweep"
          onClick={() => handleCardClick("sweep")}
        />
        <MetricCard
          label="Evolution Status"
          value={uaeStatus.code}
          icon="🔄"
          color={uaeStatus.type === 'success' ? 'emerald' : 'amber'}
          subValue={uaeStatus.status}
        />
        <MetricCard
          label="System Health"
          value="OPTIMAL"
          icon="🛡️" color="blue"
          subValue="AES-256 Active"
        />
        <MetricCard
          label="Total Fees Collected"
          value={`₦${((liveEarnings?.allTime?.fee || 0) / 1000000).toFixed(2)}M`}
          icon="🏛️" color="amber"
          onClick={() => handleCardClick("fees")}
        />
      </div>

      {/* Multi-Currency Wallet Display */}
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-[2rem] p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-black text-white">💱 Wallet Balance (Multi-Currency)</h3>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest">Live rates • Updated in real-time</p>
          </div>
          <div className="px-4 py-2 bg-green-500/10 border border-green-500/20 rounded-xl">
            <span className="text-green-400 font-bold text-sm">✓ Live Rates</span>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {walletCurrencies.map((curr) => (
            <div key={curr.code} className="bg-white/5 rounded-xl p-5 border border-white/10 hover:border-white/20 transition-all">
              <div className="flex items-center justify-between mb-3">
                <span className="text-2xl">{curr.symbol}</span>
                <span className="text-xs text-slate-400 font-bold">{curr.code}</span>
              </div>
              <div className="text-2xl font-black text-white">{curr.symbol}{curr.amount.toLocaleString()}</div>
              <div className="text-[10px] text-slate-500 mt-1">Rate: 1 {curr.code} = ₦{curr.rate.toLocaleString()}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Expanded Transaction Panels */}
      {expandedCard === "sweep" && (
        <div className="bg-slate-900 border border-slate-800 rounded-[3rem] overflow-hidden shadow-2xl ">
          <div className="p-10 border-b border-slate-800 flex justify-between items-center">
            <div>
              <h2 className="text-xl font-black uppercase tracking-tighter">Ready to Sweep — Monthly Payout Transactions</h2>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">Live • Updates every second • ₦{((liveEarnings?.month?.share || 0)).toLocaleString()} total</p>
            </div>
            <button onClick={() => setExpandedCard(null)} className="text-slate-500 hover:text-white text-2xl">✕</button>
          </div>
          <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-950/50 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 sticky top-0">
                <tr>
                  <th className="px-10 py-6">Name</th>
                  <th className="px-10 py-6">Platform/Bank</th>
                  <th className="px-10 py-6">Purpose</th>
                  <th className="px-10 py-6">Amount (₦)</th>
                  <th className="px-10 py-6">Fee (15%)</th>
                  <th className="px-10 py-6">Your Share</th>
                  <th className="px-10 py-6">Time</th>
                  <th className="px-10 py-6">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-[11px]">
                {liveTxs.length === 0 ? (
                  <tr><td colSpan={8} className="px-10 py-10 text-center text-slate-500">Loading transactions...</td></tr>
                ) : (
                  liveTxs.filter((t: any) => t.status === "approved").map((tx: any) => {
                    const f = formatTx(tx);
                    return (
                      <tr key={f.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="px-10 py-6 font-black text-white">{f.name}</td>
                        <td className="px-10 py-6 text-slate-400">{f.bank}</td>
                        <td className="px-10 py-6 text-slate-400">{f.purpose}</td>
                        <td className="px-10 py-6 font-bold text-white">₦{f.amount.toLocaleString()}</td>
                        <td className="px-10 py-6 font-bold text-red-500">- ₦{f.fee.toLocaleString()}</td>
                        <td className="px-10 py-6 font-black text-emerald-500">+ ₦{f.share.toLocaleString()}</td>
                        <td className="px-10 py-6 text-slate-500 text-[10px]">{new Date(f.time).toLocaleString()}</td>
                        <td className="px-10 py-6">
                          <span className="px-2 py-1 rounded text-[9px] font-black uppercase border text-emerald-500 border-emerald-500/20">{f.status}</span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {expandedCard === "fees" && (
        <div className="bg-slate-900 border border-slate-800 rounded-[3rem] overflow-hidden shadow-2xl ">
          <div className="p-10 border-b border-slate-800 flex justify-between items-center">
            <div>
              <h2 className="text-xl font-black uppercase tracking-tighter">Total Fees Collected — All Time</h2>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">Live • Updates every second • ₦{((liveEarnings?.allTime?.fee || 0)).toLocaleString()} total fees</p>
            </div>
            <button onClick={() => setExpandedCard(null)} className="text-slate-500 hover:text-white text-2xl">✕</button>
          </div>
          <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-950/50 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 sticky top-0">
                <tr>
                  <th className="px-10 py-6">Name</th>
                  <th className="px-10 py-6">Platform/Bank</th>
                  <th className="px-10 py-6">Purpose</th>
                  <th className="px-10 py-6">Amount (₦)</th>
                  <th className="px-10 py-6">Fee (15%)</th>
                  <th className="px-10 py-6">Your Share</th>
                  <th className="px-10 py-6">Time</th>
                  <th className="px-10 py-6">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-[11px]">
                {liveTxs.length === 0 ? (
                  <tr><td colSpan={8} className="px-10 py-10 text-center text-slate-500">Loading transactions...</td></tr>
                ) : (
                  liveTxs.map((tx: any) => {
                    const f = formatTx(tx);
                    return (
                      <tr key={f.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="px-10 py-6 font-black text-white">{f.name}</td>
                        <td className="px-10 py-6 text-slate-400">{f.bank}</td>
                        <td className="px-10 py-6 text-slate-400">{f.purpose}</td>
                        <td className="px-10 py-6 font-bold text-white">₦{f.amount.toLocaleString()}</td>
                        <td className="px-10 py-6 font-bold text-red-500">- ₦{f.fee.toLocaleString()}</td>
                        <td className="px-10 py-6 font-black text-emerald-500">+ ₦{f.share.toLocaleString()}</td>
                        <td className="px-10 py-6 text-slate-500 text-[10px]">{new Date(f.time).toLocaleString()}</td>
                        <td className="px-10 py-6">
                          <span className={`px-2 py-1 rounded text-[9px] font-black uppercase border ${f.status === 'approved' ? 'text-emerald-500 border-emerald-500/20' : 'text-red-500 border-red-500/20'}`}>{f.status}</span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
