import { useState, useEffect } from 'react'
import { useQuery, useAction } from 'convex/react'
import { api } from '../../../convex/_generated/api'

export function FreeLLMAPIPanel({ adminToken }: { adminToken: string }) {
  const [loading, setLoading] = useState(true)
  const [testing, setTesting] = useState(false)
  const [toast, setToast] = useState<{ type: string; message: string } | null>(null)

  const status = useQuery(api.freellmapi.getStatus, {})
  const analytics = useQuery(api.freellmapi.getUsageAnalytics, { days: 7 })
  const checkHealth = useAction(api.freellmapi.checkHealth)
  const getModels = useAction(api.freellmapi.getModels)

  const [healthStatus, setHealthStatus] = useState<any>(null)
  const [models, setModels] = useState<any[]>([])

  useEffect(() => {
    if (status?.configured) {
      loadData()
    } else {
      setLoading(false)
    }
  }, [status])

  const loadData = async () => {
    setLoading(true)
    try {
      const [health, modelsResult] = await Promise.all([
        checkHealth({}),
        getModels({}),
      ])
      setHealthStatus(health)
      setModels(modelsResult.models || [])
    } catch (e: any) {
      console.error('Error loading FreeLLMAPI data:', e)
    } finally {
      setLoading(false)
    }
  }

  const handleTest = async () => {
    setTesting(true)
    try {
      const result = await checkHealth({})
      setHealthStatus(result)
      setToast({
        type: result.status === 'healthy' ? 'success' : 'error',
        message: result.status === 'healthy' ? 'FreeLLMAPI is healthy!' : `Status: ${result.status}`,
      })
    } catch (e: any) {
      setToast({ type: 'error', message: `Test failed: ${e.message}` })
    } finally {
      setTesting(false)
    }
  }

  const showToast = (type: string, message: string) => {
    setToast({ type, message })
    setTimeout(() => setToast(null), 4000)
  }

  // Group models by provider
  const modelsByProvider: Record<string, any[]> = {}
  models.forEach((m: any) => {
    const provider = m.owned_by || m.provider || 'unknown'
    if (!modelsByProvider[provider]) modelsByProvider[provider] = []
    modelsByProvider[provider].push(m)
  })

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-2 rounded-lg shadow-lg ${
          toast.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'
        }`}>
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black">🆓 FreeLLMAPI Integration</h2>
          <p className="text-xs text-slate-400 mt-1">
            161+ free AI models from 18 providers with automatic failover
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleTest}
            disabled={testing || !status?.configured}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:cursor-not-allowed rounded-lg text-sm font-medium transition-colors"
          >
            {testing ? 'Testing...' : 'Test Connection'}
          </button>
          <button
            onClick={loadData}
            disabled={loading || !status?.configured}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:cursor-not-allowed rounded-lg text-sm font-medium transition-colors"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Not Configured Warning */}
      {!status?.configured && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-6">
          <h3 className="text-amber-400 font-bold mb-2">⚠️ FreeLLMAPI Not Configured</h3>
          <p className="text-sm text-slate-300 mb-4">
            To enable FreeLLMAPI, deploy it separately and add the environment variables:
          </p>
          <div className="bg-slate-900 rounded-lg p-4 font-mono text-xs">
            <p className="text-slate-500"># Deploy FreeLLMAPI (Docker)</p>
            <p className="text-emerald-400">docker pull ghcr.io/tashfeenahmed/freellmapi:latest</p>
            <p className="text-emerald-400">docker run -d -p 3001:3001 freellmapi</p>
            <p className="text-slate-500 mt-2"># Add to Convex env vars</p>
            <p className="text-emerald-400">FREELLMAPI_URL=http://your-server:3001/v1</p>
            <p className="text-emerald-400">FREELLMAPI_API_KEY=freellmapi-your-key</p>
          </div>
        </div>
      )}

      {/* Status Cards */}
      {status?.configured && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
            <p className="text-2xl font-black text-white">{models.length}</p>
            <p className="text-[10px] text-slate-500 uppercase">Total Models</p>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
            <p className="text-2xl font-black text-white">{Object.keys(modelsByProvider).length}</p>
            <p className="text-[10px] text-slate-500 uppercase">Providers</p>
          </div>
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4">
            <p className="text-2xl font-black text-emerald-400">
              {healthStatus?.status === 'healthy' ? '✓' : healthStatus?.status === 'unhealthy' ? '✗' : '?'}
            </p>
            <p className="text-[10px] text-slate-500 uppercase">Health Status</p>
          </div>
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-4">
            <p className="text-2xl font-black text-blue-400">
              {analytics?.totalRequests || 0}
            </p>
            <p className="text-[10px] text-slate-500 uppercase">Requests (7d)</p>
          </div>
        </div>
      )}

      {/* Provider Status */}
      {status?.configured && Object.keys(modelsByProvider).length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <h3 className="text-sm font-bold mb-3">Provider Status</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {Object.entries(modelsByProvider).map(([provider, providerModels]) => (
              <div key={provider} className="bg-slate-800 rounded-lg p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium capitalize">{provider}</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                </div>
                <p className="text-[10px] text-slate-500">{providerModels.length} models</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Model Catalog */}
      {status?.configured && models.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-slate-800">
            <h3 className="text-sm font-bold">Available Models</h3>
            <p className="text-[10px] text-slate-500 mt-1">All models are FREE to use</p>
          </div>
          <div className="overflow-x-auto max-h-96 overflow-y-auto">
            <table className="w-full">
              <thead className="sticky top-0 bg-slate-900">
                <tr className="text-left text-[10px] text-slate-500 uppercase">
                  <th className="px-4 py-2">Model</th>
                  <th className="px-4 py-2">Provider</th>
                  <th className="px-4 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {models.slice(0, 50).map((model: any, idx: number) => (
                  <tr key={model.id || idx} className="border-t border-slate-800 hover:bg-slate-800/50">
                    <td className="px-4 py-2 text-xs font-medium">{model.id || model.model}</td>
                    <td className="px-4 py-2 text-xs text-slate-400 capitalize">
                      {model.owned_by || 'unknown'}
                    </td>
                    <td className="px-4 py-2">
                      <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-[10px] rounded-full">
                        FREE
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {models.length > 50 && (
              <div className="p-3 text-center text-xs text-slate-500">
                +{models.length - 50} more models available
              </div>
            )}
          </div>
        </div>
      )}

      {/* Usage Analytics */}
      {status?.configured && analytics && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <h3 className="text-sm font-bold mb-3">Usage Analytics (7 days)</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-lg font-bold">{analytics.totalRequests}</p>
              <p className="text-[10px] text-slate-500">Total Requests</p>
            </div>
            <div>
              <p className="text-lg font-bold text-emerald-400">{analytics.successRate?.toFixed(1)}%</p>
              <p className="text-[10px] text-slate-500">Success Rate</p>
            </div>
            <div>
              <p className="text-lg font-bold">{analytics.avgLatency}ms</p>
              <p className="text-[10px] text-slate-500">Avg Latency</p>
            </div>
            <div>
              <p className="text-lg font-bold">{analytics.totalTokens?.toLocaleString()}</p>
              <p className="text-[10px] text-slate-500">Tokens Used</p>
            </div>
          </div>
          
          {/* Top Models */}
          {Object.keys(analytics.byModel || {}).length > 0 && (
            <div className="mt-4">
              <p className="text-xs text-slate-500 mb-2">Top Models</p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(analytics.byModel)
                  .sort(([, a], [, b]) => (b as number) - (a as number))
                  .slice(0, 5)
                  .map(([model, count]) => (
                    <span key={model} className="px-2 py-1 bg-slate-800 rounded text-[10px]">
                      {model} ({count})
                    </span>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
