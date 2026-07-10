import { useMutation, useSuspenseQuery } from 'convex/react'
import { convexQuery } from '@convex-dev/react-query'
import { api } from '../../../../convex/_generated/api'

interface DeploymentTabProps {
  adminToken: string
  isDark: boolean
  setCommandOutput: (v: string | null) => void
}

export function DeploymentTab({ adminToken, isDark, setCommandOutput }: DeploymentTabProps) {
  const deployMutation = useMutation(api.mimo_core.deploy)
  const { data: deployments } = useSuspenseQuery(convexQuery(api.mimo_core.listDeployments, { adminToken })) as { data: any[] }

  const runDeploy = async (platform: string, type: string) => {
    setCommandOutput('Deploying to ' + platform + '...')
    try {
      const r = await deployMutation({ adminToken, platform: platform as any, type: type as any })
      setCommandOutput(JSON.stringify(r, null, 2))
    } catch (e: any) {
      setCommandOutput('Error: ' + e.message)
    }
  }

  const statusColor = (status: string) => {
    switch (status) {
      case 'success': return 'text-emerald-400'
      case 'deploying': return 'text-blue-400'
      case 'failed': return 'text-red-400'
      default: return 'text-slate-400'
    }
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <div className={`${isDark ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'} border rounded-2xl p-4 md:p-6`}>
        <h3 className={`text-base md:text-lg font-black ${isDark ? 'text-white' : 'text-slate-900'} mb-4`}>Deployment Control</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
          <button onClick={() => runDeploy("convex", "standard")} className="px-3 md:px-4 py-2 md:py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-xs md:text-sm transition-all">
            📦 Deploy Convex
          </button>
          <button onClick={() => runDeploy("vercel", "standard")} className="px-3 md:px-4 py-2 md:py-3 bg-teal-600 hover:bg-teal-500 text-white rounded-xl font-bold text-xs md:text-sm transition-all">
            🌐 Deploy Vercel
          </button>
          <button onClick={() => runDeploy("github", "standard")} className="px-3 md:px-4 py-2 md:py-3 bg-slate-600 hover:bg-slate-500 text-white rounded-xl font-bold text-xs md:text-sm transition-all">
            📁 Deploy GitHub
          </button>
          <button onClick={() => runDeploy("all", "standard")} className="px-3 md:px-4 py-2 md:py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-bold text-xs md:text-sm transition-all">
            🚀 Deploy All
          </button>
        </div>
        <div className="mt-3 md:mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2 md:gap-3">
          <button onClick={() => runDeploy("all", "force")} className="px-3 md:px-4 py-2 md:py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold text-xs md:text-sm transition-all">
            ⚡ Force Deploy All
          </button>
        </div>
      </div>

      {deployments && deployments.length > 0 && (
        <div className={`${isDark ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'} border rounded-2xl p-4 md:p-6`}>
          <h3 className={`text-base md:text-lg font-black ${isDark ? 'text-white' : 'text-slate-900'} mb-4`}>Recent Deployments</h3>
          <div className="space-y-2">
            {deployments.map((d: any) => (
              <div key={d._id} className={`flex flex-col md:flex-row md:items-center justify-between p-3 ${isDark ? 'bg-white/5' : 'bg-slate-100'} rounded-xl gap-2`}>
                <div className="flex items-center gap-3">
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${d.status === 'success' ? 'bg-emerald-400' : d.status === 'deploying' ? 'bg-blue-400' : 'bg-red-400'}`} />
                  <span className={`text-xs md:text-sm ${isDark ? 'text-white' : 'text-slate-900'} font-medium`}>{d.platform} ({d.type})</span>
                </div>
                <div className="text-right">
                  <span className={`text-[10px] md:text-xs font-bold ${statusColor(d.status)}`}>{d.status}</span>
                  <div className="text-[10px] md:text-xs text-slate-500">{new Date(d.startedAt).toLocaleString()}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
