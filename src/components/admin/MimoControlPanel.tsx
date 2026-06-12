import { useState, useCallback } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'

const MIMO_TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: '📊' },
  { id: 'diagnose', label: 'Diagnose', icon: '🔍' },
  { id: 'healing', label: 'Healing', icon: '🩹' },
  { id: 'security', label: 'Security', icon: '🛡️' },
  { id: 'autoheal', label: 'Auto-Heal Reports', icon: '📋' },
  { id: 'secmonitor', label: 'Security Monitor', icon: '👁️' },
  { id: 'deployment', label: 'Deployment', icon: '🚀' },
  { id: 'agents', label: 'Agents', icon: '🤖' },
  { id: 'history', label: 'History', icon: '📜' },
] as const

type MimoTabId = typeof MIMO_TABS[number]['id']

export function MimoControlPanel({ adminToken }: { adminToken: string }) {
  const [activeTab, setActiveTab] = useState<MimoTabId>('dashboard')
  const [commandOutput, setCommandOutput] = useState<string | null>(null)

  const coreState = useQuery(api.mimo_core.getCoreState, { adminToken })
  const stats = useQuery(api.mimo_core.getDashboardStats, { adminToken })
  const agents = useQuery(api.mimo_core.listAgents, { adminToken })
  const healthLogs = useQuery(api.mimo_core.listHealthLogs, { adminToken, limit: 30 })
  const securityEvents = useQuery(api.mimo_core.listSecurityEvents, { adminToken, limit: 30 })
  const commands = useQuery(api.mimo_core.listCommandHistory, { adminToken, limit: 30 })
  const deployments = useQuery(api.mimo_core.listDeployments, { adminToken, limit: 10 })
  const auditLogs = useQuery(api.mimo_core.listAuditLogs, { adminToken, limit: 30 })

  const autoHealRuns = useQuery(api.mimo_core.listAutoHealRuns, { adminToken, limit: 30 })
  const autoHealStats = useQuery(api.mimo_core.getAutoHealStats, { adminToken })
  const securityDashboard = useQuery(api.mimo_core.getSecurityDashboard, { adminToken })

  const diagnose = useMutation(api.mimo_core.diagnose)
  const heal = useMutation(api.mimo_core.heal)
  const forceHeal = useMutation(api.mimo_core.forceHeal)
  const securityScan = useMutation(api.mimo_core.securityScan)
  const verify = useMutation(api.mimo_core.verify)
  const deployMutation = useMutation(api.mimo_core.deploy)
  const suspendAgentMutation = useMutation(api.mimo_core.suspendAgent)
  const deleteAgentMutation = useMutation(api.mimo_core.deleteAgent)
  const manualFix = useMutation(api.mimo_core.manualFix)
  const selfUpdate = useMutation(api.mimo_core.selfUpdate)
  const blockIPMutation = useMutation(api.mimo_core.blockIP)
  const unblockIPMutation = useMutation(api.mimo_core.unblockIP)

  const runDiagnose = useCallback(async () => {
    setCommandOutput('Running diagnosis...')
    try {
      const result = await diagnose({ adminToken })
      setCommandOutput(JSON.stringify(result, null, 2))
    } catch (err) {
      setCommandOutput(`Error: ${err instanceof Error ? err.message : String(err)}`)
    }
  }, [adminToken, diagnose])

  const runHeal = useCallback(async () => {
    setCommandOutput('Running auto-heal...')
    try {
      const result = await heal({ adminToken })
      setCommandOutput(JSON.stringify(result, null, 2))
    } catch (err) {
      setCommandOutput(`Error: ${err instanceof Error ? err.message : String(err)}`)
    }
  }, [adminToken, heal])

  const runForceHeal = useCallback(async () => {
    setCommandOutput('Running force heal...')
    try {
      const result = await forceHeal({ adminToken })
      setCommandOutput(JSON.stringify(result, null, 2))
    } catch (err) {
      setCommandOutput(`Error: ${err instanceof Error ? err.message : String(err)}`)
    }
  }, [adminToken, forceHeal])

  const runSecurityScan = useCallback(async () => {
    setCommandOutput('Running security scan...')
    try {
      const result = await securityScan({ adminToken })
      setCommandOutput(JSON.stringify(result, null, 2))
    } catch (err) {
      setCommandOutput(`Error: ${err instanceof Error ? err.message : String(err)}`)
    }
  }, [adminToken, securityScan])

  const runVerify = useCallback(async () => {
    setCommandOutput('Running verification...')
    try {
      const result = await verify({ adminToken })
      setCommandOutput(JSON.stringify(result, null, 2))
    } catch (err) {
      setCommandOutput(`Error: ${err instanceof Error ? err.message : String(err)}`)
    }
  }, [adminToken, verify])

  const runSelfUpdate = useCallback(async () => {
    setCommandOutput('Running self-update...')
    try {
      const result = await selfUpdate({ adminToken })
      setCommandOutput(JSON.stringify(result, null, 2))
    } catch (err) {
      setCommandOutput(`Error: ${err instanceof Error ? err.message : String(err)}`)
    }
  }, [adminToken, selfUpdate])

  const runDeploy = useCallback(async (platform: "convex" | "vercel" | "github" | "all", type: "standard" | "force") => {
    setCommandOutput(`Deploying to ${platform}...`)
    try {
      const result = await deployMutation({ adminToken, platform, type })
      setCommandOutput(JSON.stringify(result, null, 2))
    } catch (err) {
      setCommandOutput(`Error: ${err instanceof Error ? err.message : String(err)}`)
    }
  }, [adminToken, deployMutation])

  const statusColor = (status: string) => {
    switch (status) {
      case 'operational': return 'text-emerald-400'
      case 'healthy': return 'text-emerald-400'
      case 'degraded': return 'text-amber-400'
      case 'down': return 'text-red-400'
      case 'emergency': return 'text-red-500'
      case 'active': return 'text-emerald-400'
      case 'suspended': return 'text-red-400'
      case 'completed': return 'text-emerald-400'
      case 'failed': return 'text-red-400'
      case 'running': return 'text-blue-400'
      case 'pending': return 'text-amber-400'
      case 'critical': return 'text-red-500'
      case 'warning': return 'text-amber-400'
      case 'info': return 'text-blue-400'
      default: return 'text-slate-400'
    }
  }

  const renderTab = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <div className="space-y-6">
            {/* Core Status */}
            <div className="bg-gradient-to-br from-emerald-500/10 to-blue-500/10 border border-white/10 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-black text-white">Mimo Core v{coreState?.version || '2.5'}</h3>
                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${statusColor(coreState?.status || 'operational')}`}>
                  {coreState?.status || 'operational'}
                </span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <div className="text-3xl font-black text-white">{coreState?.overallHealth ?? 100}%</div>
                  <div className="text-xs text-slate-400">Health Score</div>
                </div>
                <div>
                  <div className="text-3xl font-black text-white">{stats?.agentCount ?? 0}</div>
                  <div className="text-xs text-slate-400">Active Agents</div>
                </div>
                <div>
                  <div className="text-3xl font-black text-white">{coreState?.totalDiagnoses ?? 0}</div>
                  <div className="text-xs text-slate-400">Diagnoses Run</div>
                </div>
                <div>
                  <div className="text-3xl font-black text-white">{coreState?.totalHeals ?? 0}</div>
                  <div className="text-xs text-slate-400">Heals Performed</div>
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Health Logs (24h)', value: stats?.healthLogs24h ?? 0, icon: '📋', color: 'from-blue-500/20 to-blue-600/10' },
                { label: 'Security Events (24h)', value: stats?.securityEvents24h ?? 0, icon: '🛡️', color: 'from-red-500/20 to-red-600/10' },
                { label: 'Commands (24h)', value: stats?.commands24h ?? 0, icon: '⚡', color: 'from-purple-500/20 to-purple-600/10' },
                { label: 'Critical Events', value: stats?.criticalEvents ?? 0, icon: '🚨', color: 'from-amber-500/20 to-amber-600/10' },
              ].map((card) => (
                <div key={card.label} className={`bg-gradient-to-br ${card.color} border border-white/10 rounded-2xl p-5`}>
                  <div className="text-2xl mb-2">{card.icon}</div>
                  <div className="text-2xl font-black text-white">{card.value}</div>
                  <div className="text-xs text-slate-400 mt-1">{card.label}</div>
                </div>
              ))}
            </div>

            {/* Quick Actions */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <h3 className="text-lg font-black text-white mb-4">Quick Actions</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <button onClick={runDiagnose} className="px-4 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-sm transition-all">
                  🔍 Run Diagnosis
                </button>
                <button onClick={runHeal} className="px-4 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-sm transition-all">
                  🩹 Auto-Heal
                </button>
                <button onClick={runSecurityScan} className="px-4 py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold text-sm transition-all">
                  🛡️ Security Scan
                </button>
                <button onClick={runVerify} className="px-4 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-bold text-sm transition-all">
                  ✅ Verify System
                </button>
                <button onClick={runForceHeal} className="px-4 py-3 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-bold text-sm transition-all">
                  ⚡ Force Heal
                </button>
                <button onClick={() => runDeploy("all", "standard")} className="px-4 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-sm transition-all">
                  🚀 Deploy All
                </button>
              </div>
            </div>

            {/* Command Output */}
            {commandOutput && (
              <div className="bg-slate-900 border border-white/10 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-bold text-slate-300">Command Output</h4>
                  <button onClick={() => setCommandOutput(null)} className="text-xs text-slate-500 hover:text-white">Clear</button>
                </div>
                <pre className="text-xs text-emerald-400 overflow-x-auto max-h-64 overflow-y-auto font-mono whitespace-pre-wrap">{commandOutput}</pre>
              </div>
            )}
          </div>
        )

      case 'diagnose':
        return (
          <div className="space-y-6">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <h3 className="text-lg font-black text-white mb-4">System Diagnosis</h3>
              <p className="text-sm text-slate-400 mb-4">Run comprehensive checks across all system components: database, agents, payments, security, and external services.</p>
              <button onClick={runDiagnose} className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-sm transition-all">
                🔍 Run Full Diagnosis
              </button>
            </div>

            {healthLogs && healthLogs.length > 0 && (
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <h3 className="text-lg font-black text-white mb-4">Recent Health Checks</h3>
                <div className="space-y-2">
                  {healthLogs.map((log: any) => (
                    <div key={log._id} className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                      <div className="flex items-center gap-3">
                        <span className={`w-2 h-2 rounded-full ${log.status === 'healthy' ? 'bg-emerald-400' : log.status === 'degraded' ? 'bg-amber-400' : 'bg-red-400'}`} />
                        <span className="text-sm text-white font-medium">{log.component}</span>
                        <span className="text-xs text-slate-400">{log.details}</span>
                      </div>
                      <div className="text-right">
                        <span className={`text-xs font-bold ${statusColor(log.severity)}`}>{log.severity}</span>
                        <div className="text-xs text-slate-500">{new Date(log.timestamp).toLocaleString()}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {commandOutput && (
              <div className="bg-slate-900 border border-white/10 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-bold text-slate-300">Diagnosis Result</h4>
                  <button onClick={() => setCommandOutput(null)} className="text-xs text-slate-500 hover:text-white">Clear</button>
                </div>
                <pre className="text-xs text-emerald-400 overflow-x-auto max-h-64 overflow-y-auto font-mono whitespace-pre-wrap">{commandOutput}</pre>
              </div>
            )}
          </div>
        )

      case 'healing':
        return (
          <div className="space-y-6">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <h3 className="text-lg font-black text-white mb-4">System Healing</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button onClick={runHeal} className="px-6 py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-sm transition-all">
                  🩹 Auto-Heal<br />
                  <span className="text-xs font-normal opacity-75">Fix detected issues automatically</span>
                </button>
                <button onClick={runForceHeal} className="px-6 py-4 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-bold text-sm transition-all">
                  ⚡ Force Heal<br />
                  <span className="text-xs font-normal opacity-75">Deep repair with system reset</span>
                </button>
                <button onClick={runVerify} className="px-6 py-4 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-bold text-sm transition-all">
                  ✅ Verify<br />
                  <span className="text-xs font-normal opacity-75">Confirm system integrity</span>
                </button>
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <h3 className="text-lg font-black text-white mb-4">Manual Fixes</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button onClick={async () => {
                  const r = await manualFix({ adminToken, component: 'agents', fixType: 're_register_all', description: 'Re-register all agents' })
                  setCommandOutput(JSON.stringify(r, null, 2))
                }} className="px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-bold text-sm transition-all">
                  🤖 Re-register Agents
                </button>
                <button onClick={async () => {
                  const r = await manualFix({ adminToken, component: 'wallets', fixType: 're_initialize', description: 'Re-initialize all wallets' })
                  setCommandOutput(JSON.stringify(r, null, 2))
                }} className="px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-bold text-sm transition-all">
                  💰 Re-init Wallets
                </button>
                <button onClick={async () => {
                  const r = await manualFix({ adminToken, component: 'security', fixType: 'clear_expired_blocks', description: 'Clear expired IP blocks' })
                  setCommandOutput(JSON.stringify(r, null, 2))
                }} className="px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-bold text-sm transition-all">
                  🛡️ Clear Expired Blocks
                </button>
              </div>
            </div>

            {commandOutput && (
              <div className="bg-slate-900 border border-white/10 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-bold text-slate-300">Result</h4>
                  <button onClick={() => setCommandOutput(null)} className="text-xs text-slate-500 hover:text-white">Clear</button>
                </div>
                <pre className="text-xs text-emerald-400 overflow-x-auto max-h-64 overflow-y-auto font-mono whitespace-pre-wrap">{commandOutput}</pre>
              </div>
            )}
          </div>
        )

      case 'security':
        return (
          <div className="space-y-6">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <h3 className="text-lg font-black text-white mb-4">Security Operations</h3>
              <button onClick={runSecurityScan} className="px-6 py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold text-sm transition-all">
                🛡️ Run Security Scan
              </button>
            </div>

            {securityEvents && securityEvents.length > 0 && (
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <h3 className="text-lg font-black text-white mb-4">Security Events</h3>
                <div className="space-y-2">
                  {securityEvents.map((event: any) => (
                    <div key={event._id} className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                      <div className="flex items-center gap-3">
                        <span className={`w-2 h-2 rounded-full ${event.blocked ? 'bg-red-400' : 'bg-amber-400'}`} />
                        <div>
                          <span className="text-sm text-white font-medium">{event.eventType.replace(/_/g, ' ')}</span>
                          <div className="text-xs text-slate-400">{event.description}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`text-xs font-bold ${statusColor(event.severity)}`}>{event.severity}</span>
                        <div className="text-xs text-slate-500">{new Date(event.timestamp).toLocaleString()}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {commandOutput && (
              <div className="bg-slate-900 border border-white/10 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-bold text-slate-300">Scan Result</h4>
                  <button onClick={() => setCommandOutput(null)} className="text-xs text-slate-500 hover:text-white">Clear</button>
                </div>
                <pre className="text-xs text-emerald-400 overflow-x-auto max-h-64 overflow-y-auto font-mono whitespace-pre-wrap">{commandOutput}</pre>
              </div>
            )}
          </div>
        )

      case 'autoheal':
        return (
          <div className="space-y-6">
            {/* Stats Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Total Runs', value: autoHealStats?.totalRuns ?? 0, icon: '🔄', color: 'from-blue-500/20 to-blue-600/10' },
                { label: 'Success Rate', value: `${autoHealStats?.successRate ?? 100}%`, icon: '✅', color: 'from-emerald-500/20 to-emerald-600/10' },
                { label: 'Issues Fixed', value: autoHealStats?.totalIssuesFixed ?? 0, icon: '🔧', color: 'from-purple-500/20 to-purple-600/10' },
                { label: 'Critical Alerts', value: autoHealStats?.criticalAlerts ?? 0, icon: '🚨', color: 'from-red-500/20 to-red-600/10' },
              ].map((card) => (
                <div key={card.label} className={`bg-gradient-to-br ${card.color} border border-white/10 rounded-2xl p-5`}>
                  <div className="text-2xl mb-2">{card.icon}</div>
                  <div className="text-2xl font-black text-white">{card.value}</div>
                  <div className="text-xs text-slate-400 mt-1">{card.label}</div>
                </div>
              ))}
            </div>

            {/* Run Status Breakdown */}
            {autoHealStats?.runsByStatus && (
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <h3 className="text-lg font-black text-white mb-4">Run Status Breakdown</h3>
                <div className="grid grid-cols-4 gap-4">
                  <div className="text-center p-3 bg-emerald-500/10 rounded-xl">
                    <div className="text-2xl font-black text-emerald-400">{autoHealStats.runsByStatus.success}</div>
                    <div className="text-xs text-slate-400">Success</div>
                  </div>
                  <div className="text-center p-3 bg-amber-500/10 rounded-xl">
                    <div className="text-2xl font-black text-amber-400">{autoHealStats.runsByStatus.partial}</div>
                    <div className="text-xs text-slate-400">Partial</div>
                  </div>
                  <div className="text-center p-3 bg-red-500/10 rounded-xl">
                    <div className="text-2xl font-black text-red-400">{autoHealStats.runsByStatus.failed}</div>
                    <div className="text-xs text-slate-400">Failed</div>
                  </div>
                  <div className="text-center p-3 bg-blue-500/10 rounded-xl">
                    <div className="text-2xl font-black text-blue-400">{autoHealStats.runsByStatus.running}</div>
                    <div className="text-xs text-slate-400">Running</div>
                  </div>
                </div>
              </div>
            )}

            {/* Latest Run */}
            {autoHealStats?.latestRun && (
              <div className="bg-gradient-to-br from-emerald-500/10 to-blue-500/10 border border-white/10 rounded-2xl p-6">
                <h3 className="text-lg font-black text-white mb-3">Latest Run</h3>
                <div className="flex items-center justify-between">
                  <div>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${autoHealStats.latestRun.status === 'success' ? 'bg-emerald-500/20 text-emerald-400' : autoHealStats.latestRun.status === 'failed' ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'}`}>
                      {autoHealStats.latestRun.status}
                    </span>
                    <span className="text-sm text-slate-400 ml-3">{autoHealStats.latestRun.runId}</span>
                  </div>
                  <div className="text-right text-xs text-slate-400">
                    <div>{new Date(autoHealStats.latestRun.startedAt).toLocaleString()}</div>
                    {autoHealStats.latestRun.durationMs && <div>{autoHealStats.latestRun.durationMs}ms</div>}
                  </div>
                </div>
                {autoHealStats.latestRun.sections && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {autoHealStats.latestRun.sections.map((s: any, i: number) => (
                      <span key={i} className={`px-2 py-1 rounded text-xs font-bold ${s.status === 'ok' ? 'bg-emerald-500/20 text-emerald-400' : s.status === 'warn' ? 'bg-amber-500/20 text-amber-400' : 'bg-red-500/20 text-red-400'}`}>
                        {s.name}: {s.status}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Run History */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <h3 className="text-lg font-black text-white mb-4">Run History</h3>
              <div className="space-y-2 max-h-[40vh] overflow-y-auto">
                {autoHealRuns?.map((run: any) => (
                  <div key={run._id} className="flex items-center justify-between p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-colors">
                    <div className="flex items-center gap-3">
                      <span className={`w-2 h-2 rounded-full ${run.status === 'success' ? 'bg-emerald-400' : run.status === 'failed' ? 'bg-red-400' : run.status === 'partial' ? 'bg-amber-400' : 'bg-blue-400'}`} />
                      <div>
                        <span className="text-sm text-white font-medium">{run.runId}</span>
                        <div className="text-xs text-slate-400">
                          {run.issuesFound} issues found, {run.issuesFixed} fixed
                          {run.commitSha && ` • ${run.commitSha.slice(0, 7)}`}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`text-xs font-bold ${run.status === 'success' ? 'text-emerald-400' : run.status === 'failed' ? 'text-red-400' : 'text-amber-400'}`}>{run.status}</span>
                      <div className="text-xs text-slate-500">{new Date(run.startedAt).toLocaleString()}</div>
                    </div>
                  </div>
                ))}
                {(!autoHealRuns || autoHealRuns.length === 0) && (
                  <p className="text-sm text-slate-400 text-center py-4">No auto-heal runs recorded yet</p>
                )}
              </div>
            </div>

            {/* Self-Update Button */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <h3 className="text-lg font-black text-white mb-4">Maintenance</h3>
              <button onClick={runSelfUpdate} className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-sm transition-all">
                🔄 Run Self-Update
              </button>
              <p className="text-xs text-slate-400 mt-2">Cleans expired blocks, archives old data, optimizes thresholds</p>
            </div>
          </div>
        )

      case 'secmonitor':
        return (
          <div className="space-y-6">
            {/* Threat Level Banner */}
            <div className={`border rounded-2xl p-6 ${
              securityDashboard?.threatLevel === 'critical' ? 'bg-red-500/10 border-red-500/30' :
              securityDashboard?.threatLevel === 'high' ? 'bg-orange-500/10 border-orange-500/30' :
              securityDashboard?.threatLevel === 'medium' ? 'bg-amber-500/10 border-amber-500/30' :
              'bg-emerald-500/10 border-emerald-500/30'
            }`}>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-black text-white">Security Status</h3>
                  <p className="text-sm text-slate-400">Real-time threat monitoring across all components</p>
                </div>
                <span className={`px-4 py-2 rounded-full text-sm font-black uppercase ${
                  securityDashboard?.threatLevel === 'critical' ? 'bg-red-500 text-white' :
                  securityDashboard?.threatLevel === 'high' ? 'bg-orange-500 text-white' :
                  securityDashboard?.threatLevel === 'medium' ? 'bg-amber-500 text-white' :
                  'bg-emerald-500 text-white'
                }`}>
                  {securityDashboard?.threatLevel || 'low'}
                </span>
              </div>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Events (24h)', value: securityDashboard?.summary?.totalEvents24h ?? 0, icon: '📊', color: 'from-blue-500/20 to-blue-600/10' },
                { label: 'Critical', value: securityDashboard?.summary?.criticalEvents ?? 0, icon: '🔴', color: 'from-red-500/20 to-red-600/10' },
                { label: 'Blocked IPs', value: securityDashboard?.summary?.blockedIps ?? 0, icon: '🚫', color: 'from-purple-500/20 to-purple-600/10' },
                { label: 'Failed Logins (1h)', value: securityDashboard?.summary?.failedLogins1h ?? 0, icon: '🔑', color: 'from-amber-500/20 to-amber-600/10' },
              ].map((card) => (
                <div key={card.label} className={`bg-gradient-to-br ${card.color} border border-white/10 rounded-2xl p-5`}>
                  <div className="text-2xl mb-2">{card.icon}</div>
                  <div className="text-2xl font-black text-white">{card.value}</div>
                  <div className="text-xs text-slate-400 mt-1">{card.label}</div>
                </div>
              ))}
            </div>

            {/* Component Breakdown */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <h3 className="text-lg font-black text-white mb-4">Threats by Component</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { name: 'Frontend', key: 'frontend', icon: '🌐' },
                  { name: 'Backend', key: 'backend', icon: '⚙️' },
                  { name: 'Agents', key: 'agents', icon: '🤖' },
                  { name: 'Dashboard', key: 'dashboard', icon: '📊' },
                ].map((comp) => {
                  const data = securityDashboard?.byComponent?.[comp.key];
                  return (
                    <div key={comp.key} className="bg-white/5 border border-white/10 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xl">{comp.icon}</span>
                        <span className="text-sm font-bold text-white">{comp.name}</span>
                      </div>
                      <div className={`text-2xl font-black ${data?.threats > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                        {data?.threats ?? 0}
                      </div>
                      <div className="text-xs text-slate-400">threats detected</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Attack Type Breakdown */}
            {securityDashboard?.attackTypes && Object.keys(securityDashboard.attackTypes).length > 0 && (
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <h3 className="text-lg font-black text-white mb-4">Attack Types</h3>
                <div className="space-y-2">
                  {Object.entries(securityDashboard.attackTypes)
                    .sort(([,a], [,b]) => (b as number) - (a as number))
                    .slice(0, 10)
                    .map(([type, count]) => (
                      <div key={type} className="flex items-center justify-between p-2 bg-white/5 rounded-lg">
                        <span className="text-sm text-slate-300">{type.replace(/_/g, ' ')}</span>
                        <span className="text-sm font-bold text-white">{count as number}</span>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Rate Limited IPs */}
            {securityDashboard?.rateLimitedIps && securityDashboard.rateLimitedIps.length > 0 && (
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <h3 className="text-lg font-black text-white mb-4">Rate Limited IPs</h3>
                <div className="space-y-2">
                  {securityDashboard.rateLimitedIps.map((item: any) => (
                    <div key={item.ip} className="flex items-center justify-between p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                      <div className="flex items-center gap-3">
                        <span className="w-2 h-2 rounded-full bg-red-400" />
                        <span className="text-sm text-white font-mono">{item.ip}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-red-400">{item.count} attempts</span>
                        <button
                          onClick={async () => {
                            const reason = prompt('Block reason:', 'Rate limit exceeded')
                            if (reason) {
                              await blockIPMutation({ adminToken, ip: item.ip, reason })
                              setCommandOutput(`Blocked ${item.ip}`)
                            }
                          }}
                          className="px-3 py-1 bg-red-600/20 text-red-400 rounded-lg text-xs font-bold hover:bg-red-600/40"
                        >
                          Block
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Active IP Blocks */}
            {securityDashboard?.activeBlocks && securityDashboard.activeBlocks.length > 0 && (
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <h3 className="text-lg font-black text-white mb-4">Active IP Blocks</h3>
                <div className="space-y-2 max-h-[30vh] overflow-y-auto">
                  {securityDashboard.activeBlocks.map((block: any) => (
                    <div key={block._id} className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                      <div className="flex items-center gap-3">
                        <span className="w-2 h-2 rounded-full bg-red-400" />
                        <div>
                          <span className="text-sm text-white font-mono">{block.ip}</span>
                          <div className="text-xs text-slate-400">{block.reason}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-slate-500">{new Date(block.blockedAt).toLocaleString()}</span>
                        <button
                          onClick={async () => {
                            await unblockIPMutation({ adminToken, ip: block.ip })
                            setCommandOutput(`Unblocked ${block.ip}`)
                          }}
                          className="px-3 py-1 bg-emerald-600/20 text-emerald-400 rounded-lg text-xs font-bold hover:bg-emerald-600/40"
                        >
                          Unblock
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recent Security Events */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <h3 className="text-lg font-black text-white mb-4">Recent Security Events</h3>
              <div className="space-y-2 max-h-[40vh] overflow-y-auto">
                {securityDashboard?.recentEvents?.map((event: any, idx: number) => (
                  <div key={event._id || idx} className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                    <div className="flex items-center gap-3">
                      <span className={`w-2 h-2 rounded-full ${event.blocked ? 'bg-red-400' : event.severity === 'critical' ? 'bg-red-500' : event.severity === 'high' ? 'bg-orange-400' : 'bg-amber-400'}`} />
                      <div>
                        <span className="text-sm text-white font-medium">{(event.eventType || event.category || 'unknown').replace(/_/g, ' ')}</span>
                        <div className="text-xs text-slate-400">{event.description || event.details}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`text-xs font-bold ${statusColor(event.severity)}`}>{event.severity}</span>
                      <div className="text-xs text-slate-500">{new Date(event.timestamp || event.createdAt).toLocaleString()}</div>
                    </div>
                  </div>
                ))}
                {(!securityDashboard?.recentEvents || securityDashboard.recentEvents.length === 0) && (
                  <p className="text-sm text-slate-400 text-center py-4">No security events in the last 24 hours</p>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <h3 className="text-lg font-black text-white mb-4">Security Actions</h3>
              <div className="flex gap-3 flex-wrap">
                <button onClick={runSecurityScan} className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold text-sm transition-all">
                  🛡️ Run Security Scan
                </button>
                <button onClick={runSelfUpdate} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-sm transition-all">
                  🔄 Self-Update
                </button>
                <button onClick={async () => {
                  const ip = prompt('IP to block:')
                  const reason = prompt('Reason:')
                  if (ip && reason) {
                    await blockIPMutation({ adminToken, ip, reason })
                    setCommandOutput(`Blocked ${ip}`)
                  }
                }} className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-bold text-sm transition-all">
                  🚫 Block IP
                </button>
              </div>
            </div>
          </div>
        )

      case 'deployment':
        return (
          <div className="space-y-6">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <h3 className="text-lg font-black text-white mb-4">Deployment Control</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <button onClick={() => runDeploy("convex", "standard")} className="px-4 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-sm transition-all">
                  📦 Deploy Convex
                </button>
                <button onClick={() => runDeploy("vercel", "standard")} className="px-4 py-3 bg-teal-600 hover:bg-teal-500 text-white rounded-xl font-bold text-sm transition-all">
                  🌐 Deploy Vercel
                </button>
                <button onClick={() => runDeploy("github", "standard")} className="px-4 py-3 bg-slate-600 hover:bg-slate-500 text-white rounded-xl font-bold text-sm transition-all">
                  📁 Deploy GitHub
                </button>
                <button onClick={() => runDeploy("all", "standard")} className="px-4 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-bold text-sm transition-all">
                  🚀 Deploy All
                </button>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <button onClick={() => runDeploy("all", "force")} className="px-4 py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold text-sm transition-all">
                  ⚡ Force Deploy All
                </button>
              </div>
            </div>

            {deployments && deployments.length > 0 && (
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <h3 className="text-lg font-black text-white mb-4">Recent Deployments</h3>
                <div className="space-y-2">
                  {deployments.map((d: any) => (
                    <div key={d._id} className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                      <div className="flex items-center gap-3">
                        <span className={`w-2 h-2 rounded-full ${d.status === 'success' ? 'bg-emerald-400' : d.status === 'deploying' ? 'bg-blue-400' : 'bg-red-400'}`} />
                        <span className="text-sm text-white font-medium">{d.platform} ({d.type})</span>
                      </div>
                      <div className="text-right">
                        <span className={`text-xs font-bold ${statusColor(d.status)}`}>{d.status}</span>
                        <div className="text-xs text-slate-500">{new Date(d.startedAt).toLocaleString()}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )

      case 'agents':
        return (
          <div className="space-y-6">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <h3 className="text-lg font-black text-white mb-4">Agent Registry ({agents?.length || 0} agents)</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {agents?.map((agent: any) => (
                  <div key={agent._id} className="bg-white/5 border border-white/10 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-black text-white">{agent.agentId} — {agent.agentName}</span>
                      <span className={`text-xs font-bold ${statusColor(agent.status)}`}>{agent.status}</span>
                    </div>
                    <div className="text-xs text-slate-400 mb-2">
                      Capabilities: {agent.capabilities?.join(', ')}
                    </div>
                    <div className="flex items-center gap-4 text-xs text-slate-400">
                      <span>Health: {agent.healthScore}%</span>
                      <span>Tasks: {agent.totalTasks}</span>
                    </div>
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={async () => {
                          await suspendAgentMutation({ adminToken, agentId: agent.agentId })
                        }}
                        className="px-3 py-1 bg-amber-600/20 text-amber-400 rounded-lg text-xs font-bold hover:bg-amber-600/40"
                      >
                        Suspend
                      </button>
                      <button
                        onClick={async () => {
                          if (confirm(`Delete agent ${agent.agentId}?`)) {
                            await deleteAgentMutation({ adminToken, agentId: agent.agentId })
                          }
                        }}
                        className="px-3 py-1 bg-red-600/20 text-red-400 rounded-lg text-xs font-bold hover:bg-red-600/40"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )

      case 'history':
        return (
          <div className="space-y-6">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <h3 className="text-lg font-black text-white mb-4">Command History</h3>
              <div className="space-y-2">
                {commands?.map((cmd: any) => (
                  <div key={cmd._id} className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                    <div className="flex items-center gap-3">
                      <span className={`text-xs font-bold px-2 py-1 rounded ${cmd.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400' : cmd.status === 'failed' ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'}`}>
                        {cmd.status}
                      </span>
                      <span className="text-sm text-white font-medium">{cmd.command}</span>
                      <span className="text-xs text-slate-400">by {cmd.issuedBy}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-slate-500">{new Date(cmd.startedAt).toLocaleString()}</div>
                      {cmd.durationMs && <div className="text-xs text-slate-500">{cmd.durationMs}ms</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <h3 className="text-lg font-black text-white mb-4">Audit Logs</h3>
              <div className="space-y-2">
                {auditLogs?.map((log: any) => (
                  <div key={log._id} className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-slate-400">{log.action}</span>
                      <span className="text-sm text-white">{log.actor}</span>
                      {log.target && <span className="text-xs text-slate-400">→ {log.target}</span>}
                    </div>
                    <div className="text-xs text-slate-500">{new Date(log.timestamp).toLocaleString()}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-white flex items-center gap-3">
            🧠 Mimo V.2.5
            <span className="text-xs px-3 py-1 bg-purple-500/20 text-purple-400 rounded-full font-bold">AUTONOMOUS INTELLIGENCE</span>
          </h2>
          <p className="text-sm text-slate-400 mt-1">Self-diagnose, self-heal, deploy, and manage all agents</p>
        </div>
        <div className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-slate-300">
          Health: <span className={`font-black ${statusColor(coreState?.status || 'operational')}`}>{coreState?.overallHealth ?? 100}%</span>
        </div>
      </div>

      <div className="flex gap-1 bg-white/5 border border-white/10 rounded-2xl p-1 overflow-x-auto">
        {MIMO_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-[#FF6B35] text-white shadow-lg shadow-[#FF6B35]/20'
                : 'text-slate-400 hover:text-white hover:bg-white/10'
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      <div className="min-h-[60vh]">
        {renderTab()}
      </div>
    </div>
  )
}
