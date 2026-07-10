// General panels extracted from admin/dashboard.tsx
import { useState } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { convexQuery } from "@convex-dev/react-query";
import { useAction, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { MetricCard, UpdateCycleItem } from "./shared";

// ManualAgentTaskPanel (lines 352-571)
export function ManualAgentTaskPanel() {
  const [agentId, setAgentId] = useState("A1");
  const [userEmail, setUserEmail] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [taskOutput, setTaskOutput] = useState<any>(null);
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);

  const agents = [
    { id: "A1", name: "Academic Pro", icon: "🎓" },
    { id: "A2", name: "Business Pro", icon: "💼" },
    { id: "A3", name: "Content Pro", icon: "✍️" },
    { id: "A4", name: "Career Pro", icon: "📄" },
    { id: "A5", name: "Personal Shopper", icon: "🛍️" },
    { id: "A6", name: "Exam Pro", icon: "📝" },
    { id: "A7", name: "Finance Pro", icon: "💰" },
    { id: "A8", name: "MediaStudio Pro", icon: "🎬" },
    { id: "A9", name: "Wellness Pro", icon: "🏥" },
    { id: "A10", name: "Home Services", icon: "🧹" },
    { id: "A11", name: "Language Tutor", icon: "🗣️" },
    { id: "A12", name: "Travel Planner", icon: "✈️" },
    { id: "A13", name: "ServiceMart NG", icon: "🚀" },
    { id: "A14", name: "Translation Hub", icon: "🗣️📝" },
    { id: "A15", name: "Event Planner", icon: "🎉" },
  ];

  const agentServices: Record<string, Array<string>> = {
    A1: ["Thesis Writing", "Research Papers", "Dissertation Support", "Literature Review", "Data Analysis", "Academic Editing", "Citation Formatting", "Plagiarism Check", "Abstract Writing", "Case Study Analysis"],
    A2: ["Business Plan", "Financial Model", "Pitch Deck", "Market Research", "Competitor Analysis", "GTM Strategy", "Revenue Projection", "Investor Memo", "SWOT Analysis", "Business Valuation"],
    A3: ["SEO Blog Posts", "Social Media Content", "Sales Copy", "Email Campaigns", "Website Copy", "Product Descriptions", "Newsletter Content", "Video Scripts", "Ad Copy", "Brand Voice Guide"],
    A4: ["CV/Resume Writing", "LinkedIn Optimization", "Cover Letter", "Interview Prep", "Career Strategy", "ATS Optimization", "Portfolio Review", "Salary Negotiation", "Executive Bio", "Personal Branding"],
    A5: ["Price Comparison", "Product Research", "Deal Finding", "Purchase Recommendations", "Budget Shopping", "Bulk Sourcing", "Vendor Vetting", "Quality Assessment", "Shipping Optimization", "Return Assistance"],
    A6: ["PMP Prep", "CFA Study Guide", "AWS Certification", "GRE Preparation", "GMAT Training", "JAMB/WAEC Prep", "Study Schedule", "Practice Tests", "Concept Reviews", "Exam Strategy"],
    A7: ["Budget Planning", "Savings Strategy", "Investment Advice", "Debt Management", "Tax Planning", "Retirement Planning", "Insurance Review", "Cash Flow Analysis", "Wealth Building", "Financial Literacy"],
    A8: ["Video Editing", "2D Animation", "3D Animation", "Voiceover Recording", "Script Writing", "Storyboard Creation", "Motion Graphics", "Sound Design", "Color Grading", "Film Production"],
    A9: ["Meal Plans", "Workout Routines", "Weight Management", "Nutrition Coaching", "Mental Wellness", "Sleep Optimization", "Stress Management", "Fitness Tracking", "Health Assessments", "Lifestyle Coaching"],
    A10: ["Cleaning Schedules", "Home Organization", "Maintenance Planning", "Decluttering", "Seasonal Cleaning", "Deep Cleaning", "Move-in/Move-out", "Storage Solutions", "Home Inventory", "Service Booking"],
    A11: ["Language Tutoring", "Conversation Practice", "Grammar Lessons", "Vocabulary Building", "Pronunciation Guide", "Cultural Context", "Business Language", "Travel Phrases", "Exam Prep", "Translation Practice"],
    A12: ["Trip Planning", "Itinerary Creation", "Budget Planning", "Hotel Recommendations", "Flight Booking", "Activity Suggestions", "Travel Insurance", "Visa Guidance", "Packing Lists", "Local Guides"],
    A13: ["JAMB Preparation", "WAEC/NECO Prep", "University Applications", "Scholarship Search", "Career Counseling", "Skill Assessment", "Interview Coaching", "Resume Building", "Job Search", "Freelancing Guide"],
    A14: ["Document Translation", "Website Localization", "Business Translation", "Legal Translation", "Medical Translation", "Technical Translation", "Certified Translation", "Multilingual Content", "Localization QA", "Terminology Management"],
    A15: ["Wedding Planning", "Corporate Events", "Birthday Parties", "Conference Planning", "Venue Selection", "Catering Coordination", "Decor Design", "Entertainment Booking", "Budget Management", "Vendor Management"],
  };

  const selectedAgent = agents.find(a => a.id === agentId);
  const currentServices = agentServices[agentId] || [];

  const { data: services } = useSuspenseQuery(convexQuery(api.admin.getAgentServices, { agentId }));
  const { data: logs } = useSuspenseQuery(convexQuery(api.uae_engine.getManualTaskLogs, {})) as { data: any[] };
  const generateTask = useMutation(api.uae_engine.generateAdminManualTask);

  // Poll for task completion
  useEffect(() => {
    if (!currentTaskId) return;
    let cancelled = false;
    const poll = async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_CONVEX_URL.replace('.cloud', '.site')}/api/admin/task-status?taskId=${currentTaskId}`);
        if (res.ok) {
          const data = await res.json();
          if (data.status === "completed" && !cancelled) {
            setTaskOutput({ output: data.output, status: "completed" });
            setIsGenerating(false);
            setCurrentTaskId(null);
          } else if (data.status === "failed" && !cancelled) {
            setTaskOutput({ output: data.output || "Task failed", status: "failed" });
            setIsGenerating(false);
            setCurrentTaskId(null);
          }
        }
      } catch (e) { console.error("Task status poll failed:", e); }
    };
    const interval = setInterval(poll, 2000);
    poll();
    return () => { cancelled = true; clearInterval(interval); };
  }, [currentTaskId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt) return;
    setIsGenerating(true);
    setTaskOutput(null);
    try {
      const result = await generateTask({ agentId, serviceId: serviceId || "General", prompt, userEmail });
      if (result?.taskId) {
        setCurrentTaskId(result.taskId);
      } else {
        setTaskOutput({ output: result?.error || "Failed to start task", status: "failed" });
        setIsGenerating(false);
      }
    } catch (err: any) {
      setTaskOutput({ output: err.message, status: "failed" });
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-10 ">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <div className="bg-slate-900 border border-slate-800 rounded-[3.5rem] p-12 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-orange-600/5 blur-[80px]"></div>
          <h2 className="text-2xl font-black uppercase tracking-tighter text-white mb-8">Manual Agent Task (Admin Override)</h2>
          <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Select Agent</label>
                <select 
                  value={agentId} 
                  onChange={(e) => { setAgentId(e.target.value); setServiceId(""); }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-white font-bold"
                >
                  {agents.map(a => (
                    <option key={a.id} value={a.id}>{a.icon} {a.id} — {a.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">User Email (Optional)</label>
                <input 
                  type="email" 
                  value={userEmail}
                  onChange={(e) => setUserEmail(e.target.value)}
                  placeholder="user@example.com"
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-white font-bold"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Target Service / Task</label>
              <select 
                value={serviceId} 
                onChange={(e) => setServiceId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-white font-bold"
              >
                <option value="">— Select a service —</option>
                {currentServices.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Input Prompt</label>
              <textarea 
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={4}
                placeholder={`Describe the task for ${selectedAgent?.name || 'Agent'}...`}
                className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-white font-bold"
              />
            </div>

            <button 
              type="submit"
              disabled={isGenerating || !prompt}
              className="w-full py-5 bg-orange-600 hover:bg-orange-500 text-white rounded-2xl font-black uppercase tracking-[0.2em] transition-all shadow-xl shadow-orange-600/20 disabled:opacity-50"
            >
              {isGenerating ? "Executing Agent..." : `Generate Task — ${selectedAgent?.name || 'Agent'}`}
            </button>
          </form>

          {/* Live Task Output */}
          {isGenerating && (
            <div className="mt-6 p-6 bg-orange-500/10 border border-orange-500/20 rounded-2xl text-center">
              <div className="text-2xl mb-2 animate-pulse">⚡</div>
              <p className="text-sm font-black text-orange-500 uppercase tracking-widest">Generating with {selectedAgent?.name} AI...</p>
              <p className="text-[10px] text-slate-500 mt-1">The real agent is processing your request. This may take 10-30 seconds.</p>
            </div>
          )}
          {taskOutput && (
            <div className="mt-6 p-6 bg-slate-950 border border-white/5 rounded-2xl space-y-3">
              <div className="flex justify-between items-center">
                <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">Agent Output — {selectedAgent?.name}</p>
                <span className={`px-2 py-1 rounded text-[8px] font-black uppercase ${taskOutput.status === "completed" ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"}`}>
                  {taskOutput.status}
                </span>
              </div>
              <div className="text-[11px] text-slate-300 font-medium whitespace-pre-wrap leading-relaxed max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                {taskOutput.output}
              </div>
            </div>
          )}
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-[3.5rem] p-12 shadow-2xl">
          <h2 className="text-xl font-black uppercase tracking-tighter text-white mb-8">Admin Task Audit Log</h2>
          <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
            {logs.map((log: any) => (
              <div key={log._id} className="bg-slate-950 p-6 rounded-3xl border border-white/5 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-xs font-black text-white uppercase tracking-tight">{log.agentId} • {log.serviceId}</p>
                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{new Date(log.timestamp).toLocaleString()}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase border ${
                    log.status === 'completed' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                    log.status === 'failed' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                    'bg-orange-500/10 text-orange-500 border-orange-500/20 animate-pulse'
                  }`}>
                    {log.status}
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 font-bold italic line-clamp-2">"{log.prompt}"</p>
                {log.output && (
                  <div className="mt-4 p-4 bg-black/40 rounded-xl border border-white/5">
                    <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-2">Result Output</p>
                    <p className="text-[10px] text-slate-300 font-medium whitespace-pre-wrap">{log.output}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}


// StatsOverview (lines 612-834)
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

  // Calculate wallet balance in all currencies
  const walletBalance = liveEarnings?.allTime?.share || 0;
  const walletCurrencies = Object.entries(exchangeRates).map(([code, rate]) => ({
    code,
    symbol: CURRENCY_SYMBOLS[code],
    amount: Math.round(walletBalance / rate),
    rate,
  }));

  // Live poll every second
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


// RecentTransactions (lines 835-873)
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
   )
}


// FreelancerPanel (lines 1986-2024)
export function FreelancerPanel({ data }: { data: any }) {
  const stats = data || { total: 0, pendingApplications: 0, autoApprovedWeek: 0, autoRejectedWeek: 0, totalPaidMonth: 0, avgEarnings: 0 };
  return (
    <div className="space-y-8 ">
      <div className="bg-slate-900 border border-slate-800 rounded-[3rem] p-10 shadow-2xl">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-xl font-black uppercase tracking-tighter">Freelancer Management</h2>
          <div className="flex gap-3">
            <button className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all">Review Pending ({stats.pendingApplications})</button>
            <button className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-2xl font-black text-xs uppercase tracking-widest transition-all">View All</button>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="p-6 bg-slate-950 rounded-2xl border border-slate-800">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Total Freelancers</p>
            <p className="text-3xl font-black text-white">{stats.total.toLocaleString()}</p>
          </div>
          <div className="p-6 bg-slate-950 rounded-2xl border border-slate-800">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Auto-Approved (Week)</p>
            <p className="text-3xl font-black text-emerald-500">{stats.autoApprovedWeek}</p>
          </div>
          <div className="p-6 bg-slate-950 rounded-2xl border border-slate-800">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Total Paid (Month)</p>
            <p className="text-3xl font-black text-white">₦{(stats.totalPaidMonth / 1e6).toFixed(1)}M</p>
          </div>
          <div className="p-6 bg-slate-950 rounded-2xl border border-slate-800">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Avg Earnings</p>
            <p className="text-3xl font-black text-amber-500">₦{stats.avgEarnings.toLocaleString()}</p>
          </div>
        </div>
      </div>
      <div className="bg-slate-900 border border-slate-800 rounded-[3rem] p-10 shadow-2xl">
        <h3 className="text-lg font-black uppercase tracking-tighter mb-6">Pending Applications ({stats.pendingApplications})</h3>
        <div className="text-center py-12 text-slate-600 font-black text-sm">Freelancer application list with proficiency scores will appear here.</div>
      </div>
    </div>
  );
}


// CloudMemoryPanel (lines 2355-2571)
export function CloudMemoryPanel({ adminToken }: { adminToken: string }) {
  const { data: health } = useSuspenseQuery(convexQuery(api.cloud_memory.getSystemHealth, {})) as { data: any };
  const { data: backups } = useSuspenseQuery(convexQuery(api.cloud_memory.getAllBackups, {})) as { data: any[] };
  const { data: healingHistory } = useSuspenseQuery(convexQuery(api.cloud_memory.getHealingHistory, { limit: 10 })) as { data: Array<any> };
  // REGRESSION FIX: Use public *Action wrappers (not the internalAction
  // versions) — useAction(internal.*) returns [CONVEX A] Server Error.
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


// VoiceROIPanel (lines 2572-2696)
export function VoiceROIPanel() {
  const { data: voiceStats } = useSuspenseQuery(convexQuery(api.voice_roi.getStats, { timeRange: "week" })) as { data: any };
  const { data: callHistory } = useSuspenseQuery(convexQuery(api.voice_roi.getCallHistory, { limit: 20 })) as { data: any };
  const { data: dailyMetrics } = useSuspenseQuery(convexQuery(api.voice_roi.getDailyMetrics, { days: 7 })) as { data: any };
  
  const [timeRange, setTimeRange] = useState<"day" | "week" | "month" | "quarter">("week");

  const totalCost = (voiceStats?.totalMinutes || 0) * 0.024;
  const roi = voiceStats?.roi || 0;

  return (
    <div className="space-y-10 ">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-[3.5rem] p-12 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/5 blur-[80px]"></div>
        <div className="relative z-10 space-y-8">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-3xl font-black uppercase tracking-tighter text-white">Voice ROI Analytics</h2>
              <p className="text-sm font-black text-indigo-500 uppercase tracking-widest mt-1">Deepgram + LiveKit Costs vs Revenue Generated</p>
            </div>
            <div className="flex gap-2">
              {(["day", "week", "month", "quarter"] as const).map((range) => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range)}
                  className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                    timeRange === range
                      ? "bg-indigo-600 text-white"
                      : "bg-slate-800 text-slate-500 hover:bg-slate-700"
                  }`}
                >
                  {range}
                </button>
              ))}
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
            <MetricCard label="Total Calls" value={voiceStats?.totalCalls || 0} icon="📞" color="blue" />
            <MetricCard label="Total Minutes" value={`${voiceStats?.totalMinutes || 0} min`} icon="⏱️" color="emerald" />
            <MetricCard label="Revenue Generated" value={`₦${(voiceStats?.totalRevenue || 0).toLocaleString()}`} icon="💰" color="amber" />
            <MetricCard label="Voice Cost" value={`₦${totalCost.toFixed(2)}`} icon="💸" color="red" />
            <MetricCard 
              label="Estimated ROI" 
              value={`${roi.toFixed(1)}%`} 
              icon="📈" 
              color={roi >= 0 ? "emerald" : "red"} 
              subValue={`${voiceStats?.conversionRate || 0}% conversion`}
            />
          </div>

          {/* ROI Explanation */}
          <div className="bg-slate-950 p-6 rounded-2xl border border-white/5">
            <p className="text-[10px] text-slate-500 font-bold">
              <span className="text-indigo-500">ROI Formula:</span> (Revenue - Cost) / Cost × 100% | 
              <span className="text-slate-400"> Cost:</span> Deepgram ($0.004/min) + LiveKit ($0.02/min) = $0.024/min
            </p>
          </div>
        </div>
      </div>

      {/* Daily Metrics Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-[3.5rem] p-12 shadow-2xl">
        <h3 className="text-xl font-black uppercase tracking-tighter text-white mb-8">Daily Metrics (Last 7 Days)</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left text-[9px] font-black text-slate-500 uppercase tracking-widest pb-4">Date</th>
                <th className="text-left text-[9px] font-black text-slate-500 uppercase tracking-widest pb-4">Calls</th>
                <th className="text-left text-[9px] font-black text-slate-500 uppercase tracking-widest pb-4">Minutes</th>
                <th className="text-left text-[9px] font-black text-slate-500 uppercase tracking-widest pb-4">Revenue</th>
                <th className="text-left text-[9px] font-black text-slate-500 uppercase tracking-widest pb-4">Cost</th>
                <th className="text-left text-[9px] font-black text-slate-500 uppercase tracking-widest pb-4">Conversion</th>
              </tr>
            </thead>
            <tbody>
              {dailyMetrics?.map((metric: any) => (
                <tr key={metric.date} className="border-b border-white/5">
                  <td className="py-4 text-sm font-bold text-white">{metric.date}</td>
                  <td className="py-4 text-sm text-slate-300">{metric.calls}</td>
                  <td className="py-4 text-sm text-slate-300">{metric.minutes}</td>
                  <td className="py-4 text-sm font-bold text-emerald-500">₦{metric.revenue.toLocaleString()}</td>
                  <td className="py-4 text-sm text-red-500">₦{metric.cost.toFixed(2)}</td>
                  <td className="py-4 text-sm text-slate-300">{metric.conversionRate}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Call History */}
      <div className="bg-slate-900 border border-slate-800 rounded-[3.5rem] p-12 shadow-2xl">
        <h3 className="text-xl font-black uppercase tracking-tighter text-white mb-8">Recent Voice Calls</h3>
        <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
          {callHistory?.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-10">No voice calls recorded yet.</p>
          ) : (
            callHistory?.map((call: any) => (
              <div key={call.id} className="flex justify-between items-center p-6 bg-slate-950 rounded-2xl border border-white/5">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-lg bg-indigo-500/10">📞</div>
                  <div>
                    <p className="text-sm font-bold text-white">{call.user_name || "Unknown User"}</p>
                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
                      {call.agent_id} • {call.duration_seconds}s • {new Date(call.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-emerald-500">₦{(call.revenue || 0).toLocaleString()}</p>
                  <p className="text-[9px] text-slate-500">Cost: ₦{(call.cost || 0).toFixed(2)}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}


// LiveChatsPanel (lines 2697-2801)
export function LiveChatsPanel() {
  const { data: activeChats } = useSuspenseQuery(convexQuery(api.live_chats.getActiveChats, {})) as { data: any };
  const { data: chatStats } = useSuspenseQuery(convexQuery(api.live_chats.getChatStats, {})) as { data: any };
  const [selectedChat, setSelectedChat] = useState<any>(null);
  const [replyText, setReplyText] = useState("");
  const sendReply = useMutation(api.live_chats.sendReply);
  const resolveChat = useMutation(api.live_chats.resolveChat);

  const handleSendReply = async () => {
    if (!replyText.trim() || !selectedChat) return;
    await sendReply({ chatId: selectedChat.id, message: replyText });
    setReplyText("");
  };

  const handleResolve = async () => {
    if (!selectedChat) return;
    if (!confirm("Resolve this chat?")) return;
    await resolveChat({ chatId: selectedChat.id });
    setSelectedChat(null);
  };

  return (
    <div className="space-y-10 ">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        <MetricCard label="Active Chats" value={chatStats?.active || 0} icon="💬" color="emerald" />
        <MetricCard label="Escalated" value={chatStats?.escalated || 0} icon="⚠️" color="amber" />
        <MetricCard label="Resolved" value={chatStats?.resolved || 0} icon="✅" color="blue" />
        <MetricCard label="Resolution Rate" value={`${chatStats?.resolutionRate || 0}%`} icon="📈" color="indigo" />
      </div>

      {/* Chat Interface */}
      <div className="bg-slate-900 border border-slate-800 rounded-[3.5rem] p-12 shadow-2xl">
        <h3 className="text-xl font-black uppercase tracking-tighter text-white mb-8">Live Chat Support</h3>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Chat List */}
          <div className="space-y-4 max-h-[500px] overflow-y-auto">
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Active Conversations ({activeChats?.length || 0})</p>
            {activeChats?.map((chat: any) => (
              <div
                key={chat.id}
                onClick={() => setSelectedChat(chat)}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  selectedChat?.id === chat.id
                    ? "bg-orange-600/10 border-orange-500/20"
                    : "bg-slate-950 border-white/5 hover:border-slate-700"
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-bold text-white">{chat.user_name || "Anonymous"}</p>
                    <p className="text-[9px] text-slate-500 line-clamp-1">{chat.last_message}</p>
                  </div>
                  {chat.unread_count > 0 && (
                    <span className="w-5 h-5 bg-orange-600 text-white text-[8px] font-bold rounded-full flex items-center justify-center">
                      {chat.unread_count}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Chat Area */}
          <div className="lg:col-span-2 bg-slate-950 rounded-2xl border border-white/5 p-6">
            {selectedChat ? (
              <div className="space-y-4">
                <div className="flex justify-between items-center pb-4 border-b border-white/5">
                  <p className="text-sm font-bold text-white">{selectedChat.user_name || "Anonymous"}</p>
                  <button onClick={handleResolve} className="px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-lg">
                    ✅ Resolve
                  </button>
                </div>
                <div className="h-[300px] overflow-y-auto space-y-3">
                  <div className="p-3 bg-slate-900 rounded-xl max-w-[80%]">
                    <p className="text-sm text-white">{selectedChat.last_message}</p>
                    <p className="text-[8px] text-slate-500 mt-1">{new Date(selectedChat.last_message_time).toLocaleTimeString()}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <input
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSendReply()}
                    placeholder="Type your reply..."
                    className="flex-1 bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-white text-sm"
                  />
                  <button onClick={handleSendReply} className="px-6 py-3 bg-orange-600 text-white text-xs font-bold rounded-xl">
                    Send
                  </button>
                </div>
              </div>
            ) : (
              <div className="h-[400px] flex items-center justify-center text-slate-500">
                Select a chat to start responding
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


// APICostsPanel (lines 2802-2836)
export function APICostsPanel() {
  const { data: apiCosts } = useSuspenseQuery(convexQuery(api.api_costs.getApiCostSummary, {})) as { data: any };

  return (
    <div className="space-y-10 ">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <MetricCard label="Total API Cost" value={`₦${(apiCosts?.totalCost || 0).toLocaleString()}`} icon="💸" color="red" />
        <MetricCard label="Wallet Balance" value={`₦${(apiCosts?.walletBalance || 0).toLocaleString()}`} icon="💰" color="emerald" />
        <MetricCard label="Month" value={apiCosts?.month || ""} icon="📅" color="blue" />
      </div>

      {/* API Costs Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-[3.5rem] p-12 shadow-2xl">
        <h3 className="text-xl font-black uppercase tracking-tighter text-white mb-8">API Subscription Costs</h3>
        <div className="space-y-4">
          {apiCosts?.costs?.map((api: any) => (
            <div key={api.id} className="flex justify-between items-center p-6 bg-slate-950 rounded-2xl border border-white/5">
              <div>
                <p className="text-sm font-bold text-white">{api.name}</p>
                <p className="text-[9px] text-slate-500">{api.usage.toLocaleString()} {api.unit}s used</p>
              </div>
              <p className="text-sm font-bold text-red-500">₦{api.cost.toLocaleString()}</p>
            </div>
          ))}
        </div>
        <div className="mt-8 p-6 bg-slate-950 rounded-2xl border border-white/5 flex justify-between items-center">
          <p className="text-sm font-black text-white">TOTAL MONTHLY COST</p>
          <p className="text-lg font-black text-red-500">₦{(apiCosts?.totalCost || 0).toLocaleString()}</p>
        </div>
      </div>
    </div>
  );
}

export function TaxDashboardPanel() {
  const { data: taxStatus } = useSuspenseQuery(convexQuery(api.tax.getTaxStatus, {})) as { data: any };
  const status = taxStatus ?? {};
  return (
    <div className="space-y-10">
      <div className="bg-slate-900 border border-slate-800 rounded-[3.5rem] p-12 shadow-2xl">
        <h2 className="text-3xl font-black uppercase tracking-tighter text-white mb-8">Tax Wallet</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <MetricCard label="Total Tax Deducted" value={`₦${(status.totalDeducted || 0).toLocaleString()}`} icon="🏛️" color="amber" />
          <MetricCard label="Interest Earned" value={`₦${(status.interestEarned || 0).toLocaleString()}`} icon="📈" color="emerald" />
          <MetricCard label="Next Filing" value={status.nextFilingDate || "N/A"} icon="📋" color="blue" />
        </div>
      </div>
    </div>
  );
}

export function AgentHealthMatrix({ data }: { data: any }) {
  const agentHealth = data?.agentHealth || [];
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-[3rem] overflow-hidden shadow-2xl">
      <div className="p-10 border-b border-slate-800 flex justify-between items-center">
        <h2 className="text-xl font-black uppercase tracking-tighter">Institutional Agent Health Monitor</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-slate-800">
              <th className="p-4 text-[9px] font-black text-slate-500 uppercase tracking-widest">Agent</th>
              <th className="p-4 text-[9px] font-black text-slate-500 uppercase tracking-widest">Status</th>
              <th className="p-4 text-[9px] font-black text-slate-500 uppercase tracking-widest">Uptime</th>
              <th className="p-4 text-[9px] font-black text-slate-500 uppercase tracking-widest">Latency</th>
            </tr>
          </thead>
          <tbody>
            {agentHealth.map((agent: any, i: number) => (
              <tr key={i} className="border-b border-white/5 hover:bg-slate-800/50 transition-colors">
                <td className="p-4 text-sm font-bold text-white">{agent.name || `Agent ${i + 1}`}</td>
                <td className="p-4">
                  <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase ${agent.status === 'healthy' ? 'bg-emerald-500/10 text-emerald-500' : agent.status === 'degraded' ? 'bg-amber-500/10 text-amber-500' : 'bg-red-500/10 text-red-500'}`}>
                    {agent.status || 'unknown'}
                  </span>
                </td>
                <td className="p-4 text-sm text-slate-400">{agent.uptime || 'N/A'}</td>
                <td className="p-4 text-sm text-slate-400">{agent.latency || 'N/A'}</td>
              </tr>
            ))}
            {agentHealth.length === 0 && (
              <tr><td colSpan={4} className="p-10 text-center text-slate-600 font-bold uppercase tracking-widest italic opacity-30">No agent data available</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
