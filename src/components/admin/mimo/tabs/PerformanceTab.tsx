import type { MimoData } from '../useMimoData'

export function PerformanceTab({ mimo }: { mimo: MimoData }) {
  const { performanceMetrics, apiCosts } = mimo

  return (
    <div className="space-y-6">
      {/* System Resources */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'CPU Usage', value: performanceMetrics?.system?.cpu ?? 0, icon: '🖥️', color: 'blue', unit: '%' },
          { label: 'Memory Usage', value: performanceMetrics?.system?.memory ?? 0, icon: '💾', color: 'purple', unit: '%' },
          { label: 'Disk Usage', value: performanceMetrics?.system?.disk ?? 0, icon: '💿', color: 'amber', unit: '%' },
        ].map((metric) => (
          <div key={metric.label} className="bg-white/5 border border-white/10 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-slate-400">{metric.label}</span>
              <span className="text-xl">{metric.icon}</span>
            </div>
            <div className="text-3xl font-black text-white">{metric.value}{metric.unit}</div>
            <div className="mt-2 h-2 bg-white/10 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${metric.value > 80 ? 'bg-red-500' : metric.value > 60 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                style={{ width: `${metric.value}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Response Time */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
        <h3 className="text-lg font-black text-white mb-4">Response Time</h3>
        <div className="grid grid-cols-4 gap-4">
          <div className="text-center p-3 bg-white/5 rounded-xl">
            <div className="text-2xl font-black text-blue-400">{performanceMetrics?.responseTime?.avg ?? 0}ms</div>
            <div className="text-xs text-slate-400">Average</div>
          </div>
          <div className="text-center p-3 bg-white/5 rounded-xl">
            <div className="text-2xl font-black text-emerald-400">{performanceMetrics?.responseTime?.p50 ?? 0}ms</div>
            <div className="text-xs text-slate-400">P50</div>
          </div>
          <div className="text-center p-3 bg-white/5 rounded-xl">
            <div className="text-2xl font-black text-amber-400">{performanceMetrics?.responseTime?.p95 ?? 0}ms</div>
            <div className="text-xs text-slate-400">P95</div>
          </div>
          <div className="text-center p-3 bg-white/5 rounded-xl">
            <div className="text-2xl font-black text-red-400">{performanceMetrics?.responseTime?.p99 ?? 0}ms</div>
            <div className="text-xs text-slate-400">P99</div>
          </div>
        </div>
      </div>

      {/* Throughput & Errors */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <h3 className="text-lg font-black text-white mb-4">Throughput</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-400">Requests (1h)</span>
              <span className="text-lg font-black text-white">{performanceMetrics?.throughput?.requestsPerHour ?? 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-400">Requests (24h)</span>
              <span className="text-lg font-black text-white">{performanceMetrics?.throughput?.requestsPerDay ?? 0}</span>
            </div>
          </div>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <h3 className="text-lg font-black text-white mb-4">Errors</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-400">Errors (1h)</span>
              <span className="text-lg font-black text-red-400">{performanceMetrics?.errors?.count1h ?? 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-400">Error Rate</span>
              <span className="text-lg font-black text-amber-400">{performanceMetrics?.errors?.rate ?? 0}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Agent Health */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
        <h3 className="text-lg font-black text-white mb-4">Agent Health</h3>
        <div className="grid grid-cols-4 gap-4">
          <div className="text-center p-3 bg-white/5 rounded-xl">
            <div className="text-2xl font-black text-white">{performanceMetrics?.agents?.total ?? 0}</div>
            <div className="text-xs text-slate-400">Total</div>
          </div>
          <div className="text-center p-3 bg-emerald-500/10 rounded-xl">
            <div className="text-2xl font-black text-emerald-400">{performanceMetrics?.agents?.healthy ?? 0}</div>
            <div className="text-xs text-slate-400">Healthy</div>
          </div>
          <div className="text-center p-3 bg-amber-500/10 rounded-xl">
            <div className="text-2xl font-black text-amber-400">{performanceMetrics?.agents?.degraded ?? 0}</div>
            <div className="text-xs text-slate-400">Degraded</div>
          </div>
          <div className="text-center p-3 bg-red-500/10 rounded-xl">
            <div className="text-2xl font-black text-red-400">{performanceMetrics?.agents?.down ?? 0}</div>
            <div className="text-xs text-slate-400">Down</div>
          </div>
        </div>
      </div>

      {/* API Costs */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
        <h3 className="text-lg font-black text-white mb-4">API Costs</h3>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="p-4 bg-white/5 rounded-xl">
            <div className="text-sm text-slate-400">Today</div>
            <div className="text-2xl font-black text-white">${apiCosts?.today?.toFixed(2) ?? '0.00'}</div>
          </div>
          <div className="p-4 bg-white/5 rounded-xl">
            <div className="text-sm text-slate-400">This Month</div>
            <div className="text-2xl font-black text-white">${apiCosts?.thisMonth?.toFixed(2) ?? '0.00'}</div>
          </div>
        </div>
        {apiCosts?.byProvider && Object.entries(apiCosts.byProvider).map(([provider, data]: [string, any]) => (
          <div key={provider} className="flex items-center justify-between p-3 bg-white/5 rounded-xl mb-2">
            <span className="text-sm text-white font-medium capitalize">{provider}</span>
            <div className="flex items-center gap-4 text-sm">
              <span className="text-slate-400">{data.calls} calls</span>
              <span className="text-white font-bold">${data.month.toFixed(2)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}