import { useSuspenseQuery } from "@tanstack/react-query";
import { convexQuery } from "@convex-dev/react-query";
import { api } from "../../../../../convex/_generated/api";
import { MetricCard } from "../shared";

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
