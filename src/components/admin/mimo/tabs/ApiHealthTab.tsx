import type { MimoData } from '../useMimoData'

export function ApiHealthTab({ mimo }: { mimo: MimoData }) {
  const { apiHealth } = mimo

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-5 text-center">
          <div className="text-3xl font-black text-emerald-400">{apiHealth?.summary?.healthy ?? 0}</div>
          <div className="text-xs text-slate-400">Healthy</div>
        </div>
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-5 text-center">
          <div className="text-3xl font-black text-amber-400">{apiHealth?.summary?.degraded ?? 0}</div>
          <div className="text-xs text-slate-400">Degraded</div>
        </div>
        <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-5 text-center">
          <div className="text-3xl font-black text-red-400">{apiHealth?.summary?.down ?? 0}</div>
          <div className="text-xs text-slate-400">Down</div>
        </div>
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-5 text-center">
          <div className="text-3xl font-black text-blue-400">${apiHealth?.summary?.totalCostToday?.toFixed(2) ?? '0.00'}</div>
          <div className="text-xs text-slate-400">Cost Today</div>
        </div>
      </div>

      {/* Services */}
      <div className="space-y-3">
        {apiHealth?.services?.map((service: any) => (
          <div key={service.name} className="bg-white/5 border border-white/10 rounded-2xl p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className={`w-3 h-3 rounded-full ${
                  service.status === 'operational' ? 'bg-emerald-400' :
                  service.status === 'degraded' ? 'bg-amber-400' : 'bg-red-400'
                }`} />
                <div>
                  <div className="text-sm font-black text-white">{service.name}</div>
                  <div className="text-xs text-slate-400">{service.endpoint}</div>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-right">
                  <div className="text-sm font-bold text-white">{service.latency}ms</div>
                  <div className="text-xs text-slate-500">Latency</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-emerald-400">{service.uptime}%</div>
                  <div className="text-xs text-slate-500">Uptime</div>
                </div>
                {service.rateLimit.limit > 0 && (
                  <div className="text-right">
                    <div className="text-sm font-bold text-white">{service.rateLimit.used}/{service.rateLimit.limit}</div>
                    <div className="text-xs text-slate-500">Rate Limit</div>
                  </div>
                )}
                {service.costToday > 0 && (
                  <div className="text-right">
                    <div className="text-sm font-bold text-amber-400">${service.costToday.toFixed(2)}</div>
                    <div className="text-xs text-slate-500">Cost</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}