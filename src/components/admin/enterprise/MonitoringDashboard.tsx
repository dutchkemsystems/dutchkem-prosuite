import { useState, useEffect } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../../convex/_generated/api'

export function MonitoringDashboard({ adminToken }: { adminToken: string }) {
  const [pulse, setPulse] = useState(0)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const dashboard = useQuery(api.enterprise_scaling.getScalingDashboard, { adminToken })
  const seedMetrics = useMutation(api.enterprise_scaling.seedSampleMetrics)
  const resolveAlert = useMutation(api.enterprise_scaling.resolveAlert)

  useEffect(() => {
    const interval = setInterval(() => setPulse((p) => (p + 1) % 100), 2000)
    return () => clearInterval(interval)
  }, [])

  const data = dashboard || {}
  const metrics = data.currentMetrics || { cpu: 45, memory: 62, requests: 850, latency: 120 }
  const alerts = data.activeAlerts || []
  const logs = data.scalingLogs || []

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  const handleSeed = async () => {
    try {
      const result: any = await seedMetrics({ adminToken })
      showToast(`Seeded ${result.metricsSeeded} metrics + ${result.alertsCreated} alerts`, 'success')
    } catch (e: any) { showToast(e.message || 'Failed', 'error') }
  }

  const handleResolveAlert = async (alertId: string) => {
    try {
      await resolveAlert({ alertId: alertId as any, status: 'resolved', adminToken })
      showToast('Alert resolved', 'success')
    } catch (e: any) { showToast(e.message || 'Failed', 'error') }
  }

  const config = data.configs || {}
  const autoScaling = config.autoScaling
  const cdn = config.cdn
  const redis = config.redis
  const multiRegion = config.multiRegion

  return (
    <div className="space-y-6 ">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl text-sm font-black ${toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-emerald-600 text-white'}`}>
          {toast.message}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black tracking-tight">Monitoring Dashboard</h2>
          <p className="text-sm text-slate-400 mt-1">Real-time infrastructure monitoring for 500K+ employees</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleSeed} className="px-4 py-2 bg-[#FF6B35] hover:bg-[#FF8255] text-white rounded-xl text-xs font-black transition-all">
            Seed Demo Data
          </button>
          <div className="flex items-center gap-2 px-3 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
            <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
            <span className="text-xs font-bold text-emerald-400">LIVE</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/10 border border-blue-500/30 rounded-2xl p-4">
          <div className="text-[10px] text-slate-400 mb-1">CPU Usage</div>
          <div className="text-2xl font-black text-blue-400">{metrics.cpu.toFixed(1)}%</div>
          <div className="mt-2 h-2 bg-white/10 rounded-full overflow-hidden">
            <div className="h-full bg-blue-400 rounded-full transition-all duration-500" style={{ width: `${Math.min(100, metrics.cpu)}%` }} />
          </div>
          <div className="text-[9px] text-slate-500 mt-1">Threshold: 70%</div>
        </div>
        <div className="bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 border border-emerald-500/30 rounded-2xl p-4">
          <div className="text-[10px] text-slate-400 mb-1">Memory Usage</div>
          <div className="text-2xl font-black text-emerald-400">{metrics.memory.toFixed(1)}%</div>
          <div className="mt-2 h-2 bg-white/10 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-400 rounded-full transition-all duration-500" style={{ width: `${Math.min(100, metrics.memory)}%` }} />
          </div>
          <div className="text-[9px] text-slate-500 mt-1">Threshold: 80%</div>
        </div>
        <div className="bg-gradient-to-br from-amber-500/20 to-amber-600/10 border border-amber-500/30 rounded-2xl p-4">
          <div className="text-[10px] text-slate-400 mb-1">Requests/sec</div>
          <div className="text-2xl font-black text-amber-400">{metrics.requests.toLocaleString()}</div>
          <div className="mt-2 h-2 bg-white/10 rounded-full overflow-hidden">
            <div className="h-full bg-amber-400 rounded-full transition-all duration-500" style={{ width: `${Math.min(100, (metrics.requests / 2000) * 100)}%` }} />
          </div>
          <div className="text-[9px] text-slate-500 mt-1">Threshold: 1,000</div>
        </div>
        <div className="bg-gradient-to-br from-rose-500/20 to-rose-600/10 border border-rose-500/30 rounded-2xl p-4">
          <div className="text-[10px] text-slate-400 mb-1">Latency</div>
          <div className="text-2xl font-black text-rose-400">{metrics.latency.toFixed(0)}ms</div>
          <div className="mt-2 h-2 bg-white/10 rounded-full overflow-hidden">
            <div className="h-full bg-rose-400 rounded-full transition-all duration-500" style={{ width: `${Math.min(100, (metrics.latency / 500) * 100)}%` }} />
          </div>
          <div className="text-[9px] text-slate-500 mt-1">Threshold: 500ms</div>
        </div>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
        <h3 className="text-sm font-black text-slate-300 mb-3">System Pulse</h3>
        <div className="flex items-end gap-[2px] h-16">
          {Array.from({ length: 60 }, (_, i) => {
            const height = 30 + Math.sin((i + pulse) * 0.2) * 25 + Math.sin((i + pulse) * 0.5) * 15
            const color = height > 80 ? 'from-red-500/60 to-red-500/20' : height > 60 ? 'from-amber-500/60 to-amber-500/20' : 'from-emerald-500/60 to-emerald-500/20'
            return (
              <div key={i} className={`flex-1 bg-gradient-to-t ${color} rounded-t-sm transition-all duration-300`} style={{ height: `${Math.min(100, Math.max(10, height))}%` }} />
            )
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
          <h3 className="text-sm font-black text-slate-300 mb-3">Scaling Infrastructure</h3>
          <div className="space-y-3">
            {[
              { label: 'Auto-Scaling', enabled: autoScaling?.enabled, config: autoScaling?.settings, icon: '⚙️' },
              { label: 'CDN (Global)', enabled: cdn?.enabled, config: cdn?.settings, icon: '🌐' },
              { label: 'Redis Cache', enabled: redis?.enabled, config: redis?.settings, icon: '⚡' },
              { label: 'Multi-Region DB', enabled: multiRegion?.enabled, config: multiRegion?.settings, icon: '🌍' },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                <div className="flex items-center gap-3">
                  <span className="text-lg">{item.icon}</span>
                  <span className="text-sm font-bold text-white">{item.label}</span>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${item.enabled ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-500/20 text-slate-400'}`}>
                  {item.enabled ? 'ENABLED' : 'NOT CONFIGURED'}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
          <h3 className="text-sm font-black text-slate-300 mb-3">Active Alerts ({alerts.length})</h3>
          {alerts.length === 0 ? (
            <div className="text-center py-6 text-slate-500 text-sm">No active alerts</div>
          ) : (
            <div className="space-y-2">
              {alerts.map((alert: any) => (
                <div key={alert._id} className={`flex items-center justify-between py-2 px-3 rounded-xl ${alert.severity === 'critical' ? 'bg-red-500/10 border border-red-500/20' : alert.severity === 'warning' ? 'bg-amber-500/10 border border-amber-500/20' : 'bg-blue-500/10 border border-blue-500/20'}`}>
                  <div>
                    <div className="text-xs font-black text-white">{alert.title}</div>
                    <div className="text-[10px] text-slate-400">{alert.message}</div>
                  </div>
                  <button onClick={() => handleResolveAlert(alert._id)} className="px-2 py-1 bg-white/10 rounded-lg text-[9px] font-bold text-slate-300 hover:bg-white/20">Resolve</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
        <h3 className="text-sm font-black text-slate-300 mb-3">Monitoring Integrations</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { name: 'Datadog', icon: '📊', url: 'https://app.datadog.com', color: 'from-purple-500/20 to-purple-600/10' },
            { name: 'New Relic', icon: '📈', url: 'https://one.newrelic.com', color: 'from-blue-500/20 to-blue-600/10' },
            { name: 'Grafana', icon: '📉', url: 'https://grafana.dutchkem.com', color: 'from-orange-500/20 to-orange-600/10' },
            { name: 'Cloud Logs', icon: '📜', url: 'https://logs.dutchkem.com', color: 'from-emerald-500/20 to-emerald-600/10' },
          ].map((integration) => (
            <button key={integration.name} onClick={() => window.open(integration.url)} className={`bg-gradient-to-br ${integration.color} border border-white/10 rounded-xl p-4 text-left hover:scale-[1.02] transition-all duration-200`}>
              <span className="text-2xl">{integration.icon}</span>
              <div className="text-sm font-black text-white mt-2">{integration.name}</div>
              <div className="text-[10px] text-slate-400">Open Dashboard →</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
