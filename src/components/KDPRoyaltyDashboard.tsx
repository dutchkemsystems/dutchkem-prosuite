import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { convexQuery } from "@convex-dev/react-query";
import { useMutation } from "convex/react";
import { useState } from "react";
import { api } from "../../convex/_generated/api";

export function KDPRoyaltyDashboard({ userId: _userId }: { userId: any }) {
  const { data: projects } = useSuspenseQuery(convexQuery(api.kdp_agent.listBookProjects, {})) as { data: Array<any> };
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const { data: royalties } = useQuery(
    selectedProjectId ? convexQuery(api.kdp_agent.getBookRoyalties, { projectId: selectedProjectId as any }) : { queryKey: [], enabled: false, queryFn: () => Promise.resolve(null) } as any
  ) as { data: any };
  const setRoyaltyData = useMutation(api.kdp_agent.setBookRoyaltyData);

  const totalRevenue = (royalties ?? []).reduce((acc: any, r: any) => acc + r.dashboardData.totalRevenue, 0);
  const totalSold = (royalties ?? []).reduce((acc: any, r: any) => acc + r.dashboardData.totalSold, 0);
  const netRoyalties = (royalties ?? []).reduce((acc: any, r: any) => acc + r.dashboardData.netRoyalties, 0);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedProjectId) return;

    // Read and parse CSV file
    const text = await file.text();
    const lines = text.split('\n').filter((line: string) => line.trim());
    const headers = lines[0]?.toLowerCase().split(',').map((h: string) => h.trim()) || [];

    // Find column indices for common KDP report fields
    const dateIdx = headers.findIndex((h: string) => h.includes('date') || h.includes('period'));
    const unitsIdx = headers.findIndex((h: string) => h.includes('unit') || h.includes('sold') || h.includes('qty'));
    const royaltyIdx = headers.findIndex((h: string) => h.includes('royalt') || h.includes('revenue') || h.includes('earn'));
    const returnIdx = headers.findIndex((h: string) => h.includes('return'));

    let totalSold = 0;
    let totalRevenue = 0;
    let totalReturns = 0;
    const monthlyData: Record<string, { sales: number; revenue: number }> = {};

    // Parse data rows
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',').map((c: string) => c.trim());
      if (cols.length < 2) continue;

      const units = unitsIdx >= 0 ? parseFloat(cols[unitsIdx]) || 0 : 0;
      const royalty = royaltyIdx >= 0 ? parseFloat(cols[royaltyIdx]?.replace(/[$,]/g, '')) || 0 : 0;
      const returns = returnIdx >= 0 ? parseFloat(cols[returnIdx]) || 0 : 0;

      totalSold += units;
      totalRevenue += royalty;
      totalReturns += returns;

      // Aggregate by month
      const dateStr = dateIdx >= 0 ? cols[dateIdx] : '';
      const monthMatch = dateStr.match(/(\d{4})[/-](\d{2})/);
      if (monthMatch) {
        const monthKey = `${monthMatch[1]}-${monthMatch[2]}`;
        if (!monthlyData[monthKey]) monthlyData[monthKey] = { sales: 0, revenue: 0 };
        monthlyData[monthKey].sales += units;
        monthlyData[monthKey].revenue += royalty;
      }
    }

    // Convert monthly data to trend array sorted by month
    const monthlyTrend = Object.entries(monthlyData)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, data]) => ({ month, ...data }));

    const penaltyCharges = totalRevenue * 0.005; // Estimate 0.5% penalty charges
    const dashboardData = {
      totalSold,
      totalRevenue,
      averagePrice: totalSold > 0 ? totalRevenue / totalSold : 0,
      returns: totalReturns,
      penaltyCharges,
      netRoyalties: totalRevenue - penaltyCharges,
      monthlyTrend,
    };

    const now = new Date();
    await setRoyaltyData({
      projectId: selectedProjectId as any,
      csvDataUrl: URL.createObjectURL(file),
      dashboardData,
      month: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`,
      year: now.getFullYear(),
    });
  };

  return (
    <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-8 space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-xl font-black text-white uppercase tracking-tighter">Amazon KDP Royalty Tracker</h3>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Real-time earnings from your KDP dashboard</p>
        </div>
        <div className="flex flex-col items-end">
          <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-1">Net Royalties</p>
          <p className="text-3xl font-black text-emerald-500 tracking-tighter">${netRoyalties.toLocaleString()}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatBox label="Total Sold" value={totalSold.toLocaleString()} />
        <StatBox label="Total Revenue" value={`$${totalRevenue.toLocaleString()}`} />
        <StatBox label="Avg Price" value={`$${totalSold > 0 ? (totalRevenue / totalSold).toFixed(2) : "0.00"}`} />
        <StatBox label="Payout Status" value="Pending" pulse />
      </div>

      <div className="p-6 bg-slate-950 rounded-2xl border border-white/5 space-y-4">
        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Select Project & Import KDP Report</p>
        <div className="flex gap-4">
          <select
            value={selectedProjectId ?? ""}
            onChange={e => setSelectedProjectId(e.target.value || null)}
            className="flex-1 px-4 py-3 bg-slate-900 border border-white/10 rounded-xl text-white text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
          >
            <option value="">-- Select a book project --</option>
            {projects.map(p => (
              <option key={p._id} value={p._id}>{p.manuscript.title}</option>
            ))}
          </select>
          <input
            type="file"
            accept=".csv"
            onChange={handleFileUpload}
            disabled={!selectedProjectId}
            className="w-full max-w-xs text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-[10px] file:font-black file:bg-slate-800 file:text-slate-100 hover:file:bg-slate-700 cursor-pointer disabled:opacity-50"
          />
        </div>
      </div>

      {royalties && royalties.length > 0 && (
        <div className="space-y-6">
          <h4 className="text-sm font-black text-white uppercase tracking-tighter">Monthly Breakdown</h4>

          {royalties[0]?.dashboardData.monthlyTrend.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {royalties[0].dashboardData.monthlyTrend.map((m: any, i: number) => (
                <div key={i} className="p-4 bg-slate-950 rounded-2xl border border-white/5">
                  <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">{m.month}</p>
                  <p className="text-lg font-black text-emerald-500 mt-1">${m.revenue.toLocaleString()}</p>
                  <p className="text-[9px] font-bold text-slate-500">{m.sales} sold</p>
                </div>
              ))}
            </div>
          )}

          {royalties.map((r: any, i: number) => (
            <div key={i} className="flex justify-between items-center p-4 bg-slate-950 rounded-2xl border border-white/5 transition-all hover:border-indigo-500/30">
              <div>
                <p className="text-sm font-black text-white">{r.month} {r.year}</p>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{r.dashboardData.totalSold} units sold</p>
              </div>
              <div className="text-right">
                <p className="font-black text-emerald-500 tracking-tighter">+${r.dashboardData.netRoyalties.toLocaleString()}</p>
                <p className="text-[9px] text-slate-500 font-bold">returns: {r.dashboardData.returns}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {(!royalties || royalties.length === 0) && (
        <div className="text-center py-10 opacity-30">
          <p className="text-[10px] font-black uppercase tracking-widest">No royalty data found. Import a CSV report.</p>
        </div>
      )}
    </div>
  );
}

function StatBox({ label, value, pulse }: { label: string; value: string; pulse?: boolean }) {
  return (
    <div className="p-6 bg-slate-950 rounded-2xl border border-white/5 flex items-center justify-between">
      <div>
        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{label}</p>
        <p className="text-sm font-bold text-white mt-1">{value}</p>
      </div>
      {pulse && <span className="w-3 h-3 bg-orange-500 rounded-full animate-pulse"></span>}
    </div>
  );
}
