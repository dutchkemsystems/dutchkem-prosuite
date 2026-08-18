import type { MimoData } from '../useMimoData'

export function ConfigTab({ mimo }: { mimo: MimoData }) {
  const { environmentConfig } = mimo

  return (
    <div className="space-y-6">
      {/* Environment Info */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
        <h3 className="text-lg font-black text-white mb-4">Environment</h3>
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-400">Current:</span>
          <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 rounded-full text-sm font-bold">
            {environmentConfig?.environment ?? 'production'}
          </span>
        </div>
      </div>

      {/* API Keys */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
        <h3 className="text-lg font-black text-white mb-4">API Keys Status</h3>
        <div className="space-y-2">
          {environmentConfig?.apiKeys?.map((key: any) => (
            <div key={key.name} className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
              <div className="flex items-center gap-3">
                <span className={`w-3 h-3 rounded-full ${key.configured ? 'bg-emerald-400' : 'bg-red-400'}`} />
                <span className="text-sm text-white font-medium">{key.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-slate-500">{key.key}</span>
                <span className={`px-2 py-0.5 rounded text-xs font-bold ${key.configured ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                  {key.configured ? '✓ Configured' : '✗ Missing'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Feature Flags */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
        <h3 className="text-lg font-black text-white mb-4">Feature Flags</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {environmentConfig?.featureFlags && Object.entries(environmentConfig.featureFlags).map(([flag, enabled]: [string, any]) => (
            <div key={flag} className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
              <span className="text-sm text-white font-medium capitalize">{flag.replace(/([A-Z])/g, ' $1').trim()}</span>
              <span className={`w-3 h-3 rounded-full ${enabled ? 'bg-emerald-400' : 'bg-slate-500'}`} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}