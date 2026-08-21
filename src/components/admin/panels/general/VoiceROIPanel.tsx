import { useState } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { convexQuery } from "@convex-dev/react-query";
import { api } from "../../../../../convex/_generated/api";
import { MetricCard } from "../shared";

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
