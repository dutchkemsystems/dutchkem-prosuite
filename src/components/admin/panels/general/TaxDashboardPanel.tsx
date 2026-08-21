import { useSuspenseQuery } from "@tanstack/react-query";
import { convexQuery } from "@convex-dev/react-query";
import { api } from "../../../../../convex/_generated/api";
import { MetricCard } from "../shared";

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
