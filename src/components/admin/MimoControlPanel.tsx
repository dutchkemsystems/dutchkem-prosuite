import { useState, useCallback, useEffect } from 'react'
import { useMutation } from 'convex/react'
import { useSuspenseQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { api } from '../../../convex/_generated/api'

const MIMO_TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: '📊', category: 'core' },
  { id: 'cronjobs', label: 'Cron Jobs', icon: '⏰', category: 'core' },
  { id: 'agenttest', label: 'Agent Test', icon: '🧪', category: 'core' },
  { id: 'performance', label: 'Performance', icon: '⚡', category: 'monitoring' },
  { id: 'database', label: 'Database', icon: '🗄️', category: 'monitoring' },
  { id: 'config', label: 'Config', icon: '⚙️', category: 'monitoring' },
  { id: 'logs', label: 'Logs', icon: '📝', category: 'monitoring' },
  { id: 'notifications', label: 'Alerts', icon: '🔔', category: 'monitoring' },
  { id: 'apihealth', label: 'API Health', icon: '🌐', category: 'monitoring' },
  { id: 'diagnose', label: 'Diagnose', icon: '🔍', category: 'maintenance' },
  { id: 'healing', label: 'Healing', icon: '🩹', category: 'maintenance' },
  { id: 'security', label: 'Security', icon: '🛡️', category: 'maintenance' },
  { id: 'autoheal', label: 'Auto-Heal Reports', icon: '📋', category: 'maintenance' },
  { id: 'secmonitor', label: 'Security Monitor', icon: '👁️', category: 'maintenance' },
  { id: 'deployment', label: 'Deployment', icon: '🚀', category: 'maintenance' },
  { id: 'agents', label: 'Agents', icon: '🤖', category: 'maintenance' },
  { id: 'history', label: 'History', icon: '📜', category: 'maintenance' },
] as const

const TAB_CATEGORIES = [
  { id: 'core', label: 'Core', icon: '🏠' },
  { id: 'monitoring', label: 'Monitoring', icon: '📊' },
  { id: 'maintenance', label: 'Maintenance', icon: '🔧' },
] as const

type MimoTabId = typeof MIMO_TABS[number]['id']
type TabCategory = typeof TAB_CATEGORIES[number]['id']

function useDarkMode() {
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('mimo-dark-mode')
    if (saved !== null) return saved === 'true'
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  })

  useEffect(() => {
    localStorage.setItem('mimo-dark-mode', String(isDark))
    if (isDark) {
      document.documentElement.classList.add('dark')
      document.documentElement.classList.remove('light')
    } else {
      document.documentElement.classList.add('light')
      document.documentElement.classList.remove('dark')
    }
  }, [isDark])

  return { isDark, toggle: () => setIsDark((p) => !p) }
}

export function MimoControlPanel({ adminToken }: { adminToken: string }) {
  const [activeTab, setActiveTab] = useState<MimoTabId>('dashboard')
  const [commandOutput, setCommandOutput] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [activeCategory, setActiveCategory] = useState<TabCategory>('core')
  const [autoRefresh, setAutoRefresh] = useState(false)
  const [refreshInterval, setRefreshInterval] = useState(60000)
  const { isDark, toggle: toggleDarkMode } = useDarkMode()

  const refreshOptions = [
    { label: '30s', value: 30000 },
    { label: '1m', value: 60000 },
    { label: '5m', value: 300000 },
    { label: 'Off', value: 0 },
  ]

  // Safe query wrapper with defaults
  const safeQuery = <T,>(queryFn: any, fallback: T): { data: T } => {
    try {
      const result = useSuspenseQuery(queryFn)
      return { data: (result.data as T) ?? fallback }
    } catch {
      return { data: fallback }
    }
  }

  // Core queries with safe defaults
  const { data: coreState } = safeQuery(convexQuery(api.mimo_core.getCoreState, { adminToken }), { status: 'operational', overallHealth: 100, version: '2.5' })
  const { data: stats } = safeQuery(convexQuery(api.mimo_core.getDashboardStats, { adminToken }), { agentCount: 0, healthLogs24h: 0, securityEvents24h: 0, commands24h: 0, criticalEvents: 0 })
  const { data: agents } = safeQuery(convexQuery(api.mimo_core.listAgents, { adminToken }), [])
  const { data: healthLogs } = safeQuery(convexQuery(api.mimo_core.listHealthLogs, { adminToken, limit: 30 }), [])
  const { data: securityEvents } = safeQuery(convexQuery(api.mimo_core.listSecurityEvents, { adminToken, limit: 30 }), [])
  const { data: commands } = safeQuery(convexQuery(api.mimo_core.listCommandHistory, { adminToken, limit: 30 }), [])
  const { data: deployments } = safeQuery(convexQuery(api.mimo_core.listDeployments, { adminToken, limit: 10 }), [])
  const { data: auditLogs } = safeQuery(convexQuery(api.mimo_core.listAuditLogs, { adminToken, limit: 30 }), [])

  const { data: autoHealRuns } = safeQuery(convexQuery(api.mimo_core.listAutoHealRuns, { adminToken, limit: 30 }), [])
  const { data: autoHealStats } = safeQuery(convexQuery(api.mimo_core.getAutoHealStats, { adminToken }), { totalRuns: 0, successRate: 100, totalIssuesFixed: 0, criticalAlerts: 0 })
  const { data: securityDashboard } = safeQuery(convexQuery(api.mimo_core.getSecurityDashboard, { adminToken }), { threatLevel: 'low', summary: {}, recentEvents: [], activeBlocks: [], rateLimitedIps: [] })

  // Cron Jobs queries
  const { data: cronJobs } = safeQuery(convexQuery(api.mimo_core.listCronJobs, { adminToken }), [])
  const { data: cronStats } = safeQuery(convexQuery(api.mimo_core.getCronStats, { adminToken }), { totalJobs: 0, enabledJobs: 0, executions24h: 0, failed24h: 0, success24h: 0, avgDurationMs: 0 })
  const { data: cronExecutions } = safeQuery(convexQuery(api.mimo_core.getCronExecutionHistory, { adminToken, limit: 50 }), [])
  const { data: cronCategories } = safeQuery(convexQuery(api.mimo_core.getCronCategories, { adminToken }), {})

  // Tab-specific queries
  const { data: performanceMetrics } = safeQuery(convexQuery(api.mimo_core.getPerformanceMetrics, { adminToken }), { responseTime: {}, throughput: {}, errors: {}, system: { cpu: 0, memory: 0, disk: 0 }, agents: { total: 0, healthy: 0, degraded: 0, down: 0 } })
  const { data: apiCosts } = safeQuery(convexQuery(api.mimo_core.getApiCosts, { adminToken }), { today: 0, thisMonth: 0, byProvider: {} })
  const { data: databaseStats } = safeQuery(convexQuery(api.mimo_core.getDatabaseStats, { adminToken }), { totalTables: 0, totalRows: 0, tables: [] })
  const { data: databaseIndexes } = safeQuery(convexQuery(api.mimo_core.getDatabaseIndexes, { adminToken }), { indexes: [] })
  const { data: environmentConfig } = safeQuery(convexQuery(api.mimo_core.getEnvironmentConfig, { adminToken }), { environment: 'production', apiKeys: [], featureFlags: {} })
  const { data: recentLogs } = safeQuery(convexQuery(api.mimo_core.getRecentLogs, { adminToken, limit: 100 }), { logs: [], stats: { critical: 0, error: 0, warning: 0, info: 0 } })
  const { data: notifications } = safeQuery(convexQuery(api.mimo_core.getNotifications, { adminToken, limit: 50 }), { notifications: [], alertCount: 0, warningCount: 0, unreadCount: 0 })
  const { data: notificationPrefs } = safeQuery(convexQuery(api.mimo_core.getNotificationPreferences, { adminToken }), { thresholds: {} })
  const { data: apiHealth } = safeQuery(convexQuery(api.mimo_core.getApiHealth, { adminToken }), { summary: { healthy: 0, degraded: 0, down: 0, totalCostToday: 0 }, services: [] })
  const { data: agentTestConfig } = safeQuery(convexQuery(api.mimo_core.getAgentTestConfig, { adminToken }), { enabled: false })
  const { data: agentTestResults } = safeQuery(convexQuery(api.mimo_core.getAgentTestResults, { adminToken }), [])

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

  // Cron Jobs mutations
  const triggerCronJob = useMutation(api.mimo_core.triggerCronJob)
  const toggleCronJobMutation = useMutation(api.mimo_core.toggleCronJob)
  const seedCronJobsMutation = useMutation(api.mimo_core.seedCronJobs)
  const testAllAgentsMutation = useMutation(api.mimo_core.testAllAgents)
  const testAgentChatMutation = useMutation(api.mimo_core.testAgentChat)

  const [blockIPModal, setBlockIPModal] = useState<{ ip: string; reason: string } | null>(null)
  const [cronSubTab, setCronSubTab] = useState<'overview' | 'jobs' | 'history' | 'categories'>('overview')
  const [cronCategoryFilter, setCronCategoryFilter] = useState<string | null>(null)
  const [dbSubTab, setDbSubTab] = useState<'tables' | 'indexes'>('tables')
  const [logFilter, setLogFilter] = useState<string>('all')
  const [agentTestRunning, setAgentTestRunning] = useState(false)
  const [agentTestProgress, setAgentTestProgress] = useState<string | null>(null)
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null)
  const [singleTestResult, setSingleTestResult] = useState<any>(null)

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
            <div className={`${isDark ? 'bg-gradient-to-br from-emerald-500/10 to-blue-500/10 border-white/10' : 'bg-gradient-to-br from-emerald-50 to-blue-50 border-slate-200'} border rounded-2xl p-4 md:p-6`}>
              <div className="flex items-center justify-between mb-4">
                <h3 className={`text-base md:text-lg font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>Mimo Core v{coreState?.version || '2.5'}</h3>
                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${statusColor(coreState?.status || 'operational')}`}>
                  {coreState?.status || 'operational'}
                </span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                <div>
                  <div className={`text-2xl md:text-3xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>{coreState?.overallHealth ?? 100}%</div>
                  <div className="text-xs text-slate-400">Health Score</div>
                </div>
                <div>
                  <div className={`text-2xl md:text-3xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>{stats?.agentCount ?? 0}</div>
                  <div className="text-xs text-slate-400">Active Agents</div>
                </div>
                <div>
                  <div className={`text-2xl md:text-3xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>{coreState?.totalDiagnoses ?? 0}</div>
                  <div className="text-xs text-slate-400">Diagnoses Run</div>
                </div>
                <div>
                  <div className={`text-2xl md:text-3xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>{coreState?.totalHeals ?? 0}</div>
                  <div className="text-xs text-slate-400">Heals Performed</div>
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
              {[
                { label: 'Health Logs (24h)', value: stats?.healthLogs24h ?? 0, icon: '📋', color: 'from-blue-500/20 to-blue-600/10' },
                { label: 'Security Events (24h)', value: stats?.securityEvents24h ?? 0, icon: '🛡️', color: 'from-red-500/20 to-red-600/10' },
                { label: 'Commands (24h)', value: stats?.commands24h ?? 0, icon: '⚡', color: 'from-purple-500/20 to-purple-600/10' },
                { label: 'Critical Events', value: stats?.criticalEvents ?? 0, icon: '🚨', color: 'from-amber-500/20 to-amber-600/10' },
              ].map((card) => (
                <div key={card.label} className={`bg-gradient-to-br ${card.color} ${isDark ? 'border-white/10' : 'border-slate-200'} border rounded-2xl p-4 md:p-5`}>
                  <div className="text-xl md:text-2xl mb-2">{card.icon}</div>
                  <div className={`text-xl md:text-2xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>{card.value}</div>
                  <div className="text-[10px] md:text-xs text-slate-400 mt-1">{card.label}</div>
                </div>
              ))}
            </div>

            {/* Quick Actions */}
            <div className={`${isDark ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'} border rounded-2xl p-4 md:p-6`}>
              <h3 className={`text-base md:text-lg font-black ${isDark ? 'text-white' : 'text-slate-900'} mb-4`}>Quick Actions</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-3">
                <button onClick={runDiagnose} className="px-3 md:px-4 py-2 md:py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-xs md:text-sm transition-all">
                  🔍 Run Diagnosis
                </button>
                <button onClick={runHeal} className="px-3 md:px-4 py-2 md:py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs md:text-sm transition-all">
                  🩹 Auto-Heal
                </button>
                <button onClick={runSecurityScan} className="px-3 md:px-4 py-2 md:py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold text-xs md:text-sm transition-all">
                  🛡️ Security Scan
                </button>
                <button onClick={runVerify} className="px-3 md:px-4 py-2 md:py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-bold text-xs md:text-sm transition-all">
                  ✅ Verify System
                </button>
                <button onClick={runForceHeal} className="px-3 md:px-4 py-2 md:py-3 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-bold text-xs md:text-sm transition-all">
                  ⚡ Force Heal
                </button>
                <button onClick={() => runDeploy("all", "standard")} className="px-3 md:px-4 py-2 md:py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-xs md:text-sm transition-all">
                  🚀 Deploy All
                </button>
              </div>
            </div>

            {/* Command Output */}
            {commandOutput && (
              <div className={`${isDark ? 'bg-slate-900 border-white/10' : 'bg-slate-100 border-slate-200'} border rounded-2xl p-3 md:p-4`}>
                <div className="flex items-center justify-between mb-2">
                  <h4 className={`text-xs md:text-sm font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Command Output</h4>
                  <button onClick={() => setCommandOutput(null)} className="text-xs text-slate-500 hover:text-white">Clear</button>
                </div>
                <pre className="text-[10px] md:text-xs text-emerald-400 overflow-x-auto max-h-48 md:max-h-64 overflow-y-auto font-mono whitespace-pre-wrap">{commandOutput}</pre>
              </div>
            )}
          </div>
        )

      case 'cronjobs':
        return (
          <div className="space-y-6">
            {/* Cron Sub-Tabs */}
            <div className="flex gap-2 bg-white/5 border border-white/10 rounded-xl p-1">
              {[
                { id: 'overview' as const, label: 'Overview', icon: '📊' },
                { id: 'jobs' as const, label: 'All Jobs', icon: '⏰' },
                { id: 'history' as const, label: 'Execution History', icon: '📜' },
                { id: 'categories' as const, label: 'By Category', icon: '📁' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setCronSubTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    cronSubTab === tab.id
                      ? 'bg-orange-500 text-white'
                      : 'text-slate-400 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <span>{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>

            {/* Overview Sub-Tab */}
            {cronSubTab === 'overview' && (
              <div className="space-y-6">
                {/* Stats Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: 'Total Jobs', value: cronStats?.totalJobs ?? 0, icon: '⏰', color: 'from-blue-500/20 to-blue-600/10' },
                    { label: 'Enabled', value: cronStats?.enabledJobs ?? 0, icon: '✅', color: 'from-emerald-500/20 to-emerald-600/10' },
                    { label: 'Executions (24h)', value: cronStats?.executions24h ?? 0, icon: '🔄', color: 'from-purple-500/20 to-purple-600/10' },
                    { label: 'Failed (24h)', value: cronStats?.failed24h ?? 0, icon: '❌', color: 'from-red-500/20 to-red-600/10' },
                  ].map((card) => (
                    <div key={card.label} className={`bg-gradient-to-br ${card.color} border border-white/10 rounded-2xl p-5`}>
                      <div className="text-2xl mb-2">{card.icon}</div>
                      <div className="text-2xl font-black text-white">{card.value}</div>
                      <div className="text-xs text-slate-400 mt-1">{card.label}</div>
                    </div>
                  ))}
                </div>

                {/* Success Rate & Avg Duration */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                    <div className="text-sm text-slate-400 mb-2">Success Rate (24h)</div>
                    <div className="flex items-end gap-2">
                      <span className="text-3xl font-black text-emerald-400">
                        {cronStats?.executions24h ? Math.round((cronStats.success24h / cronStats.executions24h) * 100) : 100}%
                      </span>
                      <span className="text-xs text-slate-500 mb-1">({cronStats?.success24h ?? 0}/{cronStats?.executions24h ?? 0})</span>
                    </div>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                    <div className="text-sm text-slate-400 mb-2">Avg Duration (24h)</div>
                    <span className="text-3xl font-black text-blue-400">{cronStats?.avgDurationMs ?? 0}ms</span>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                  <h3 className="text-lg font-black text-white mb-4">Quick Actions</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <button
                      onClick={async () => {
                        try {
                          const result = await seedCronJobsMutation({ adminToken })
                          setCommandOutput(JSON.stringify(result, null, 2))
                        } catch (err) {
                          setCommandOutput(`Error: ${err instanceof Error ? err.message : String(err)}`)
                        }
                      }}
                      className="px-4 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-sm transition-all"
                    >
                      🔄 Sync Cron Definitions
                    </button>
                    <button
                      onClick={async () => {
                        try {
                          // Trigger all enabled jobs
                          if (cronJobs) {
                            let triggered = 0
                            for (const job of cronJobs.filter((j: any) => j.isEnabled)) {
                              await triggerCronJob({ adminToken, cronJobId: job._id })
                              triggered++
                            }
                            setCommandOutput(`Triggered ${triggered} jobs`)
                          }
                        } catch (err) {
                          setCommandOutput(`Error: ${err instanceof Error ? err.message : String(err)}`)
                        }
                      }}
                      className="px-4 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-sm transition-all"
                    >
                      ⚡ Trigger All Enabled
                    </button>
                    <button
                      onClick={() => setCronSubTab('jobs')}
                      className="px-4 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-bold text-sm transition-all"
                    >
                      📋 View All Jobs
                    </button>
                  </div>
                </div>

                {/* Category Breakdown */}
                {cronCategories && Object.keys(cronCategories).length > 0 && (
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                    <h3 className="text-lg font-black text-white mb-4">Jobs by Category</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {Object.entries(cronCategories).map(([category, stats]: [string, any]) => (
                        <div
                          key={category}
                          className="bg-white/5 border border-white/10 rounded-xl p-4 cursor-pointer hover:bg-white/10 transition-colors"
                          onClick={() => {
                            setCronCategoryFilter(category)
                            setCronSubTab('jobs')
                          }}
                        >
                          <div className="text-sm font-bold text-white capitalize mb-2">{category}</div>
                          <div className="flex items-center gap-4 text-xs text-slate-400">
                            <span>{stats.total} total</span>
                            <span className="text-emerald-400">{stats.enabled} active</span>
                          </div>
                          {stats.failed > 0 && (
                            <div className="text-xs text-red-400 mt-1">{stats.failed} with failures</div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recent Executions */}
                {cronExecutions && cronExecutions.length > 0 && (
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-black text-white">Recent Executions</h3>
                      <button
                        onClick={() => setCronSubTab('history')}
                        className="text-xs text-orange-400 hover:text-orange-300"
                      >
                        View All →
                      </button>
                    </div>
                    <div className="space-y-2 max-h-[30vh] overflow-y-auto">
                      {cronExecutions.slice(0, 10).map((exec: any) => (
                        <div key={exec._id} className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                          <div className="flex items-center gap-3">
                            <span className={`w-2 h-2 rounded-full ${exec.status === 'success' ? 'bg-emerald-400' : exec.status === 'failed' ? 'bg-red-400' : 'bg-blue-400'}`} />
                            <div>
                              <span className="text-sm text-white font-medium">{exec.cronJobName}</span>
                              <div className="text-xs text-slate-400">
                                {exec.triggeredBy === 'manual' ? '👤 Manual' : '⏰ Scheduled'}
                                {exec.durationMs && ` • ${exec.durationMs}ms`}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className={`text-xs font-bold ${exec.status === 'success' ? 'text-emerald-400' : exec.status === 'failed' ? 'text-red-400' : 'text-blue-400'}`}>
                              {exec.status}
                            </span>
                            <div className="text-xs text-slate-500">{new Date(exec.startedAt).toLocaleString()}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* All Jobs Sub-Tab */}
            {cronSubTab === 'jobs' && (
              <div className="space-y-6">
                {/* Category Filter */}
                <div className="flex items-center gap-3">
                  <span className="text-sm text-slate-400">Filter:</span>
                  <button
                    onClick={() => setCronCategoryFilter(null)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${!cronCategoryFilter ? 'bg-orange-500 text-white' : 'bg-white/5 text-slate-400 hover:text-white'}`}
                  >
                    All
                  </button>
                  {cronCategories && Object.keys(cronCategories).map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setCronCategoryFilter(cat)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold capitalize transition-all ${cronCategoryFilter === cat ? 'bg-orange-500 text-white' : 'bg-white/5 text-slate-400 hover:text-white'}`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                {/* Jobs List */}
                <div className="space-y-3">
                  {cronJobs
                    ?.filter((job: any) => !cronCategoryFilter || job.category === cronCategoryFilter)
                    .map((job: any) => (
                      <div key={job._id} className="bg-white/5 border border-white/10 rounded-2xl p-4 hover:bg-white/10 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className={`w-3 h-3 rounded-full ${job.isEnabled ? 'bg-emerald-400' : 'bg-slate-500'}`} />
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-black text-white">{job.name}</span>
                                <span className="text-xs px-2 py-0.5 bg-white/10 text-slate-400 rounded capitalize">{job.category}</span>
                                <span className="text-xs px-2 py-0.5 bg-white/10 text-slate-400 rounded">{job.scheduleType === 'cron' ? '📅' : '🔄'} {job.schedule}</span>
                              </div>
                              <div className="text-xs text-slate-400 mt-1">{job.description}</div>
                              <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                                <span>Runs: {job.totalRuns}</span>
                                <span className="text-emerald-400">✓ {job.successCount}</span>
                                {job.failureCount > 0 && <span className="text-red-400">✗ {job.failureCount}</span>}
                                {job.lastRunAt && <span>Last: {new Date(job.lastRunAt).toLocaleString()}</span>}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={async () => {
                                try {
                                  setCommandOutput(`Triggering: ${job.name}...`)
                                  const result = await triggerCronJob({ adminToken, cronJobId: job._id })
                                  setCommandOutput(JSON.stringify(result, null, 2))
                                } catch (err) {
                                  setCommandOutput(`Error: ${err instanceof Error ? err.message : String(err)}`)
                                }
                              }}
                              className="px-3 py-1.5 bg-blue-600/20 text-blue-400 rounded-lg text-xs font-bold hover:bg-blue-600/40 transition-all"
                            >
                              ▶ Run
                            </button>
                            <button
                              onClick={async () => {
                                try {
                                  await toggleCronJobMutation({ adminToken, cronJobId: job._id, isEnabled: !job.isEnabled })
                                  setCommandOutput(`${job.name} ${job.isEnabled ? 'disabled' : 'enabled'}`)
                                } catch (err) {
                                  setCommandOutput(`Error: ${err instanceof Error ? err.message : String(err)}`)
                                }
                              }}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                job.isEnabled
                                  ? 'bg-amber-600/20 text-amber-400 hover:bg-amber-600/40'
                                  : 'bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/40'
                              }`}
                            >
                              {job.isEnabled ? '⏸ Disable' : '▶ Enable'}
                            </button>
                          </div>
                        </div>
                        {job.lastRunStatus && (
                          <div className={`mt-2 text-xs ${job.lastRunStatus === 'success' ? 'text-emerald-400' : job.lastRunStatus === 'failed' ? 'text-red-400' : 'text-blue-400'}`}>
                            Last status: {job.lastRunStatus} {job.lastRunDurationMs && `(${job.lastRunDurationMs}ms)`}
                          </div>
                        )}
                      </div>
                    ))}
                  {(!cronJobs || cronJobs.length === 0) && (
                    <div className="text-center py-12 text-slate-400">
                      <p className="text-4xl mb-2">⏰</p>
                      <p className="font-bold">No cron jobs found</p>
                      <p className="text-sm mt-1">Click "Sync Cron Definitions" to import from crons.ts</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Execution History Sub-Tab */}
            {cronSubTab === 'history' && (
              <div className="space-y-6">
                {/* Status Filter */}
                <div className="flex items-center gap-3">
                  <span className="text-sm text-slate-400">Status:</span>
                  {['all', 'success', 'failed', 'running'].map((status) => (
                    <button
                      key={status}
                      onClick={() => {
                        // Would filter executions by status
                      }}
                      className={`px-3 py-1 rounded-lg text-xs font-bold capitalize transition-all bg-white/5 text-slate-400 hover:text-white`}
                    >
                      {status}
                    </button>
                  ))}
                </div>

                {/* Executions List */}
                <div className="space-y-2">
                  {cronExecutions?.map((exec: any) => (
                    <div key={exec._id} className="bg-white/5 border border-white/10 rounded-2xl p-4 hover:bg-white/10 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <span className={`w-3 h-3 rounded-full ${exec.status === 'success' ? 'bg-emerald-400' : exec.status === 'failed' ? 'bg-red-400' : 'bg-blue-400'}`} />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-black text-white">{exec.cronJobName}</span>
                              <span className={`text-xs px-2 py-0.5 rounded ${
                                exec.status === 'success' ? 'bg-emerald-500/20 text-emerald-400' :
                                exec.status === 'failed' ? 'bg-red-500/20 text-red-400' :
                                'bg-blue-500/20 text-blue-400'
                              }`}>
                                {exec.status}
                              </span>
                              <span className="text-xs px-2 py-0.5 bg-white/10 text-slate-400 rounded">
                                {exec.triggeredBy === 'manual' ? '👤 Manual' : '⏰ Scheduled'}
                              </span>
                            </div>
                            {exec.error && (
                              <div className="text-xs text-red-400 mt-1 font-mono">{exec.error}</div>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-bold text-white">
                            {exec.durationMs ? `${exec.durationMs}ms` : '—'}
                          </div>
                          <div className="text-xs text-slate-500">
                            {new Date(exec.startedAt).toLocaleString()}
                          </div>
                          {exec.completedAt && (
                            <div className="text-xs text-slate-500">
                              Duration: {Math.round((exec.completedAt - exec.startedAt) / 1000)}s
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  {(!cronExecutions || cronExecutions.length === 0) && (
                    <div className="text-center py-12 text-slate-400">
                      <p className="text-4xl mb-2">📜</p>
                      <p className="font-bold">No execution history</p>
                      <p className="text-sm mt-1">Cron jobs will appear here after they run</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Categories Sub-Tab */}
            {cronSubTab === 'categories' && (
              <div className="space-y-6">
                {cronCategories && Object.entries(cronCategories).map(([category, stats]: [string, any]) => (
                  <div key={category} className="bg-white/5 border border-white/10 rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-black text-white capitalize">{category}</h3>
                      <div className="flex items-center gap-4 text-sm">
                        <span className="text-slate-400">{stats.total} jobs</span>
                        <span className="text-emerald-400">{stats.enabled} enabled</span>
                        {stats.failed > 0 && <span className="text-red-400">{stats.failed} failing</span>}
                      </div>
                    </div>
                    <div className="space-y-2">
                      {cronJobs
                        ?.filter((job: any) => job.category === category)
                        .map((job: any) => (
                          <div key={job._id} className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                            <div className="flex items-center gap-3">
                              <span className={`w-2 h-2 rounded-full ${job.isEnabled ? 'bg-emerald-400' : 'bg-slate-500'}`} />
                              <span className="text-sm text-white font-medium">{job.name}</span>
                              <span className="text-xs text-slate-400">{job.schedule}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              {job.lastRunStatus && (
                                <span className={`text-xs ${job.lastRunStatus === 'success' ? 'text-emerald-400' : 'text-red-400'}`}>
                                  {job.lastRunStatus}
                                </span>
                              )}
                              <button
                                onClick={async () => {
                                  try {
                                    await triggerCronJob({ adminToken, cronJobId: job._id })
                                    setCommandOutput(`Triggered: ${job.name}`)
                                  } catch (err) {
                                    setCommandOutput(`Error: ${err instanceof Error ? err.message : String(err)}`)
                                  }
                                }}
                                className="px-2 py-1 bg-blue-600/20 text-blue-400 rounded text-xs font-bold hover:bg-blue-600/40"
                              >
                                ▶
                              </button>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                ))}
                {(!cronCategories || Object.keys(cronCategories).length === 0) && (
                  <div className="text-center py-12 text-slate-400">
                    <p className="text-4xl mb-2">📁</p>
                    <p className="font-bold">No categories found</p>
                    <p className="text-sm mt-1">Sync cron definitions first to populate categories</p>
                  </div>
                )}
              </div>
            )}

            {/* Command Output */}
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

      case 'performance':
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

      case 'database':
        return (
          <div className="space-y-6">
            {/* Sub-Tabs */}
            <div className="flex gap-2 bg-white/5 border border-white/10 rounded-xl p-1">
              {[
                { id: 'tables' as const, label: 'Tables', icon: '📊' },
                { id: 'indexes' as const, label: 'Indexes', icon: '🔍' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setDbSubTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    dbSubTab === tab.id ? 'bg-orange-500 text-white' : 'text-slate-400 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <span>{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>

            {/* Stats Summary */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                <div className="text-2xl font-black text-white">{databaseStats?.totalTables ?? 0}</div>
                <div className="text-xs text-slate-400">Total Tables</div>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                <div className="text-2xl font-black text-white">{databaseStats?.totalRows?.toLocaleString() ?? 0}</div>
                <div className="text-xs text-slate-400">Total Rows</div>
              </div>
            </div>

            {/* Tables Tab */}
            {dbSubTab === 'tables' && (
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <h3 className="text-lg font-black text-white mb-4">Table Statistics</h3>
                <div className="space-y-2">
                  {databaseStats?.tables?.map((table: any) => (
                    <div key={table.name} className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                      <div className="flex items-center gap-3">
                        <span className="text-lg">📋</span>
                        <span className="text-sm text-white font-medium font-mono">{table.name}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-sm text-slate-400">{table.rowCount.toLocaleString()} rows</span>
                        {table.lastActivity > 0 && (
                          <span className="text-xs text-slate-500">{new Date(table.lastActivity).toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Indexes Tab */}
            {dbSubTab === 'indexes' && (
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <h3 className="text-lg font-black text-white mb-4">Database Indexes</h3>
                <div className="space-y-2">
                  {databaseIndexes?.indexes?.map((idx: any, i: number) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                      <div className="flex items-center gap-3">
                        <span className="text-lg">🔍</span>
                        <div>
                          <span className="text-sm text-white font-medium">{idx.table}.{idx.name}</span>
                          <div className="text-xs text-slate-400">{idx.fields.join(', ')}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )

      case 'config':
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

      case 'logs':
        return (
          <div className="space-y-6">
            {/* Filter */}
            <div className="flex items-center gap-3">
              <span className="text-sm text-slate-400">Filter:</span>
              {['all', 'critical', 'error', 'warning', 'info'].map((level) => (
                <button
                  key={level}
                  onClick={() => setLogFilter(level)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold capitalize transition-all ${
                    logFilter === level ? 'bg-orange-500 text-white' : 'bg-white/5 text-slate-400 hover:text-white'
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-4">
              {[
                { label: 'Critical', value: recentLogs?.stats?.critical ?? 0, color: 'red' },
                { label: 'Error', value: recentLogs?.stats?.error ?? 0, color: 'amber' },
                { label: 'Warning', value: recentLogs?.stats?.warning ?? 0, color: 'yellow' },
                { label: 'Info', value: recentLogs?.stats?.info ?? 0, color: 'blue' },
              ].map((stat) => (
                <div key={stat.label} className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center">
                  <div className={`text-2xl font-black text-${stat.color}-400`}>{stat.value}</div>
                  <div className="text-xs text-slate-400">{stat.label}</div>
                </div>
              ))}
            </div>

            {/* Log List */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <h3 className="text-lg font-black text-white mb-4">Recent Logs</h3>
              <div className="space-y-2 max-h-[50vh] overflow-y-auto">
                {recentLogs?.logs
                  ?.filter((log: any) => logFilter === 'all' || log.level === logFilter)
                  .map((log: any) => (
                    <div key={log.id} className="flex items-start gap-3 p-3 bg-white/5 rounded-xl">
                      <span className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                        log.level === 'critical' ? 'bg-red-500' :
                        log.level === 'high' || log.level === 'error' ? 'bg-amber-500' :
                        log.level === 'medium' || log.level === 'warning' ? 'bg-yellow-500' :
                        'bg-blue-500'
                      }`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs px-2 py-0.5 rounded bg-white/10 text-slate-400 capitalize">{log.component}</span>
                          <span className={`text-xs px-2 py-0.5 rounded capitalize ${
                            log.level === 'critical' ? 'bg-red-500/20 text-red-400' :
                            log.level === 'high' || log.level === 'error' ? 'bg-amber-500/20 text-amber-400' :
                            'bg-blue-500/20 text-blue-400'
                          }`}>{log.level}</span>
                        </div>
                        <div className="text-sm text-white mt-1">{log.message}</div>
                        <div className="text-xs text-slate-500 mt-1">{new Date(log.timestamp).toLocaleString()}</div>
                      </div>
                    </div>
                  ))}
                {(!recentLogs?.logs || recentLogs.logs.length === 0) && (
                  <div className="text-center py-8 text-slate-400">
                    <p className="text-4xl mb-2">📝</p>
                    <p className="font-bold">No logs found</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )

      case 'notifications':
        return (
          <div className="space-y-6">
            {/* Alert Stats */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-5 text-center">
                <div className="text-3xl font-black text-red-400">{notifications?.alertCount ?? 0}</div>
                <div className="text-xs text-slate-400">Alerts</div>
              </div>
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-5 text-center">
                <div className="text-3xl font-black text-amber-400">{notifications?.warningCount ?? 0}</div>
                <div className="text-xs text-slate-400">Warnings</div>
              </div>
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-5 text-center">
                <div className="text-3xl font-black text-blue-400">{notifications?.unreadCount ?? 0}</div>
                <div className="text-xs text-slate-400">Unread</div>
              </div>
            </div>

            {/* Notification List */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <h3 className="text-lg font-black text-white mb-4">Notifications</h3>
              <div className="space-y-2">
                {notifications?.notifications?.map((notif: any) => (
                  <div key={notif.id} className={`flex items-start gap-3 p-4 rounded-xl ${
                    notif.type === 'alert' ? 'bg-red-500/10 border border-red-500/20' : 'bg-amber-500/10 border border-amber-500/20'
                  }`}>
                    <span className="text-xl">{notif.type === 'alert' ? '🚨' : '⚠️'}</span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-black text-white">{notif.title}</span>
                        {notif.actionRequired && (
                          <span className="px-2 py-0.5 bg-red-500/20 text-red-400 rounded text-xs font-bold">Action Required</span>
                        )}
                      </div>
                      <div className="text-sm text-slate-400 mt-1">{notif.message}</div>
                      <div className="text-xs text-slate-500 mt-2">{new Date(notif.timestamp).toLocaleString()}</div>
                    </div>
                  </div>
                ))}
                {(!notifications?.notifications || notifications.notifications.length === 0) && (
                  <div className="text-center py-8 text-slate-400">
                    <p className="text-4xl mb-2">🔔</p>
                    <p className="font-bold">No notifications</p>
                    <p className="text-sm mt-1">All systems operating normally</p>
                  </div>
                )}
              </div>
            </div>

            {/* Notification Preferences */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <h3 className="text-lg font-black text-white mb-4">Alert Thresholds</h3>
              <div className="grid grid-cols-2 gap-4">
                {notificationPrefs?.thresholds && Object.entries(notificationPrefs.thresholds).map(([key, value]: [string, any]) => (
                  <div key={key} className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                    <span className="text-sm text-white capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                    <span className="text-sm font-bold text-slate-400">{value}{key.includes('Percent') ? '%' : key.includes('Ms') ? 'ms' : ''}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )

      case 'apihealth':
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

      case 'diagnose':
        return (
          <div className="space-y-4 md:space-y-6">
            <div className={`${isDark ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'} border rounded-2xl p-4 md:p-6`}>
              <h3 className={`text-base md:text-lg font-black ${isDark ? 'text-white' : 'text-slate-900'} mb-4`}>System Diagnosis</h3>
              <p className={`text-xs md:text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'} mb-4`}>Run comprehensive checks across all system components: database, agents, payments, security, and external services.</p>
              <button onClick={runDiagnose} className="px-4 md:px-6 py-2 md:py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-xs md:text-sm transition-all">
                🔍 Run Full Diagnosis
              </button>
            </div>

            {healthLogs && healthLogs.length > 0 && (
              <div className={`${isDark ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'} border rounded-2xl p-4 md:p-6`}>
                <h3 className={`text-base md:text-lg font-black ${isDark ? 'text-white' : 'text-slate-900'} mb-4`}>Recent Health Checks</h3>
                <div className="space-y-2">
                  {healthLogs.map((log: any) => (
                    <div key={log._id} className={`flex flex-col md:flex-row md:items-center justify-between p-3 ${isDark ? 'bg-white/5' : 'bg-slate-100'} rounded-xl gap-2`}>
                      <div className="flex items-center gap-3">
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${log.status === 'healthy' ? 'bg-emerald-400' : log.status === 'degraded' ? 'bg-amber-400' : 'bg-red-400'}`} />
                        <span className={`text-xs md:text-sm ${isDark ? 'text-white' : 'text-slate-900'} font-medium`}>{log.component}</span>
                        <span className="text-[10px] md:text-xs text-slate-400 truncate max-w-[150px] md:max-w-none">{log.details}</span>
                      </div>
                      <div className="text-right">
                        <span className={`text-[10px] md:text-xs font-bold ${statusColor(log.severity)}`}>{log.severity}</span>
                        <div className="text-[10px] md:text-xs text-slate-500">{new Date(log.timestamp).toLocaleString()}</div>
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
          <div className="space-y-4 md:space-y-6">
            <div className={`${isDark ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'} border rounded-2xl p-4 md:p-6`}>
              <h3 className={`text-base md:text-lg font-black ${isDark ? 'text-white' : 'text-slate-900'} mb-4`}>System Healing</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
                <button onClick={runHeal} className="px-4 md:px-6 py-3 md:py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs md:text-sm transition-all">
                  🩹 Auto-Heal<br />
                  <span className="text-[10px] md:text-xs font-normal opacity-75">Fix detected issues automatically</span>
                </button>
                <button onClick={runForceHeal} className="px-4 md:px-6 py-3 md:py-4 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-bold text-xs md:text-sm transition-all">
                  ⚡ Force Heal<br />
                  <span className="text-[10px] md:text-xs font-normal opacity-75">Deep repair with system reset</span>
                </button>
                <button onClick={runVerify} className="px-4 md:px-6 py-3 md:py-4 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-bold text-xs md:text-sm transition-all">
                  ✅ Verify<br />
                  <span className="text-[10px] md:text-xs font-normal opacity-75">Confirm system integrity</span>
                </button>
              </div>
            </div>

            <div className={`${isDark ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'} border rounded-2xl p-4 md:p-6`}>
              <h3 className={`text-base md:text-lg font-black ${isDark ? 'text-white' : 'text-slate-900'} mb-4`}>Manual Fixes</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
                <button onClick={async () => {
                  try {
                    const r = await manualFix({ adminToken, component: 'agents', fixType: 're_register_all', description: 'Re-register all agents' })
                    setCommandOutput(JSON.stringify(r, null, 2))
                  } catch (err) {
                    setCommandOutput(`Error: ${err instanceof Error ? err.message : String(err)}`)
                  }
                }} className="px-3 md:px-4 py-2 md:py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-bold text-xs md:text-sm transition-all">
                  🤖 Re-register Agents
                </button>
                <button onClick={async () => {
                  try {
                    const r = await manualFix({ adminToken, component: 'wallets', fixType: 're_initialize', description: 'Re-initialize all wallets' })
                    setCommandOutput(JSON.stringify(r, null, 2))
                  } catch (err) {
                    setCommandOutput(`Error: ${err instanceof Error ? err.message : String(err)}`)
                  }
                }} className="px-3 md:px-4 py-2 md:py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-bold text-xs md:text-sm transition-all">
                  💰 Re-init Wallets
                </button>
                <button onClick={async () => {
                  try {
                    const r = await manualFix({ adminToken, component: 'security', fixType: 'clear_expired_blocks', description: 'Clear expired IP blocks' })
                    setCommandOutput(JSON.stringify(r, null, 2))
                  } catch (err) {
                    setCommandOutput(`Error: ${err instanceof Error ? err.message : String(err)}`)
                  }
                }} className="px-3 md:px-4 py-2 md:py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-bold text-xs md:text-sm transition-all">
                  🛡️ Clear Expired Blocks
                </button>
              </div>
            </div>

            {commandOutput && (
              <div className={`${isDark ? 'bg-slate-900 border-white/10' : 'bg-slate-100 border-slate-200'} border rounded-2xl p-3 md:p-4`}>
                <div className="flex items-center justify-between mb-2">
                  <h4 className={`text-xs md:text-sm font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Result</h4>
                  <button onClick={() => setCommandOutput(null)} className="text-xs text-slate-500 hover:text-white">Clear</button>
                </div>
                <pre className="text-[10px] md:text-xs text-emerald-400 overflow-x-auto max-h-48 md:max-h-64 overflow-y-auto font-mono whitespace-pre-wrap">{commandOutput}</pre>
              </div>
            )}
          </div>
        )

      case 'security':
        return (
          <div className="space-y-4 md:space-y-6">
            <div className={`${isDark ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'} border rounded-2xl p-4 md:p-6`}>
              <h3 className={`text-base md:text-lg font-black ${isDark ? 'text-white' : 'text-slate-900'} mb-4`}>Security Operations</h3>
              <button onClick={runSecurityScan} className="px-4 md:px-6 py-2 md:py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold text-xs md:text-sm transition-all">
                🛡️ Run Security Scan
              </button>
            </div>

            {securityEvents && securityEvents.length > 0 && (
              <div className={`${isDark ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'} border rounded-2xl p-4 md:p-6`}>
                <h3 className={`text-base md:text-lg font-black ${isDark ? 'text-white' : 'text-slate-900'} mb-4`}>Security Events</h3>
                <div className="space-y-2">
                  {securityEvents.map((event: any) => (
                    <div key={event._id} className={`flex flex-col md:flex-row md:items-center justify-between p-3 ${isDark ? 'bg-white/5' : 'bg-slate-100'} rounded-xl gap-2`}>
                      <div className="flex items-center gap-3">
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${event.blocked ? 'bg-red-400' : 'bg-amber-400'}`} />
                        <div>
                          <span className={`text-xs md:text-sm ${isDark ? 'text-white' : 'text-slate-900'} font-medium`}>{event.eventType.replace(/_/g, ' ')}</span>
                          <div className="text-[10px] md:text-xs text-slate-400 truncate max-w-[200px] md:max-w-none">{event.description}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`text-[10px] md:text-xs font-bold ${statusColor(event.severity)}`}>{event.severity}</span>
                        <div className="text-[10px] md:text-xs text-slate-500">{new Date(event.timestamp).toLocaleString()}</div>
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
          <div className="space-y-4 md:space-y-6">
            {/* Stats Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
              {[
                { label: 'Total Runs', value: autoHealStats?.totalRuns ?? 0, icon: '🔄', color: 'from-blue-500/20 to-blue-600/10' },
                { label: 'Success Rate', value: `${autoHealStats?.successRate ?? 100}%`, icon: '✅', color: 'from-emerald-500/20 to-emerald-600/10' },
                { label: 'Issues Fixed', value: autoHealStats?.totalIssuesFixed ?? 0, icon: '🔧', color: 'from-purple-500/20 to-purple-600/10' },
                { label: 'Critical Alerts', value: autoHealStats?.criticalAlerts ?? 0, icon: '🚨', color: 'from-red-500/20 to-red-600/10' },
              ].map((card) => (
                <div key={card.label} className={`bg-gradient-to-br ${card.color} ${isDark ? 'border-white/10' : 'border-slate-200'} border rounded-2xl p-4 md:p-5`}>
                  <div className="text-xl md:text-2xl mb-2">{card.icon}</div>
                  <div className={`text-xl md:text-2xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>{card.value}</div>
                  <div className="text-[10px] md:text-xs text-slate-400 mt-1">{card.label}</div>
                </div>
              ))}
            </div>

            {/* Run Status Breakdown */}
            {autoHealStats?.runsByStatus && (
              <div className={`${isDark ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'} border rounded-2xl p-4 md:p-6`}>
                <h3 className={`text-base md:text-lg font-black ${isDark ? 'text-white' : 'text-slate-900'} mb-4`}>Run Status Breakdown</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                  <div className="text-center p-2 md:p-3 bg-emerald-500/10 rounded-xl">
                    <div className="text-xl md:text-2xl font-black text-emerald-400">{autoHealStats.runsByStatus.success}</div>
                    <div className="text-[10px] md:text-xs text-slate-400">Success</div>
                  </div>
                  <div className="text-center p-2 md:p-3 bg-amber-500/10 rounded-xl">
                    <div className="text-xl md:text-2xl font-black text-amber-400">{autoHealStats.runsByStatus.partial}</div>
                    <div className="text-[10px] md:text-xs text-slate-400">Partial</div>
                  </div>
                  <div className="text-center p-2 md:p-3 bg-red-500/10 rounded-xl">
                    <div className="text-xl md:text-2xl font-black text-red-400">{autoHealStats.runsByStatus.failed}</div>
                    <div className="text-[10px] md:text-xs text-slate-400">Failed</div>
                  </div>
                  <div className="text-center p-2 md:p-3 bg-blue-500/10 rounded-xl">
                    <div className="text-xl md:text-2xl font-black text-blue-400">{autoHealStats.runsByStatus.running}</div>
                    <div className="text-[10px] md:text-xs text-slate-400">Running</div>
                  </div>
                </div>
              </div>
            )}

            {/* Latest Run */}
            {autoHealStats?.latestRun && (
              <div className={`bg-gradient-to-br from-emerald-500/10 to-blue-500/10 ${isDark ? 'border-white/10' : 'border-slate-200'} border rounded-2xl p-4 md:p-6`}>
                <h3 className={`text-base md:text-lg font-black ${isDark ? 'text-white' : 'text-slate-900'} mb-3`}>Latest Run</h3>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                  <div>
                    <span className={`px-3 py-1 rounded-full text-[10px] md:text-xs font-bold uppercase ${autoHealStats.latestRun.status === 'success' ? 'bg-emerald-500/20 text-emerald-400' : autoHealStats.latestRun.status === 'failed' ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'}`}>
                      {autoHealStats.latestRun.status}
                    </span>
                    <span className={`text-xs md:text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'} ml-3`}>{autoHealStats.latestRun.runId}</span>
                  </div>
                  <div className="text-right text-[10px] md:text-xs text-slate-400">
                    <div>{new Date(autoHealStats.latestRun.startedAt).toLocaleString()}</div>
                    {autoHealStats.latestRun.durationMs && <div>{autoHealStats.latestRun.durationMs}ms</div>}
                  </div>
                </div>
                {autoHealStats.latestRun.sections && (
                  <div className="mt-3 flex flex-wrap gap-1.5 md:gap-2">
                    {autoHealStats.latestRun.sections.map((s: any, i: number) => (
                      <span key={i} className={`px-1.5 md:px-2 py-0.5 md:py-1 rounded text-[10px] md:text-xs font-bold ${s.status === 'ok' ? 'bg-emerald-500/20 text-emerald-400' : s.status === 'warn' ? 'bg-amber-500/20 text-amber-400' : 'bg-red-500/20 text-red-400'}`}>
                        {s.name}: {s.status}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Run History */}
            <div className={`${isDark ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'} border rounded-2xl p-4 md:p-6`}>
              <h3 className={`text-base md:text-lg font-black ${isDark ? 'text-white' : 'text-slate-900'} mb-4`}>Run History</h3>
              <div className="space-y-2 max-h-[30vh] md:max-h-[40vh] overflow-y-auto">
                {autoHealRuns?.map((run: any) => (
                  <div key={run._id} className={`flex flex-col md:flex-row md:items-center justify-between p-3 ${isDark ? 'bg-white/5 hover:bg-white/10' : 'bg-slate-100 hover:bg-slate-200'} rounded-xl transition-colors gap-2`}>
                    <div className="flex items-center gap-3">
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${run.status === 'success' ? 'bg-emerald-400' : run.status === 'failed' ? 'bg-red-400' : run.status === 'partial' ? 'bg-amber-400' : 'bg-blue-400'}`} />
                      <div>
                        <span className={`text-xs md:text-sm ${isDark ? 'text-white' : 'text-slate-900'} font-medium`}>{run.runId}</span>
                        <div className="text-[10px] md:text-xs text-slate-400">
                          {run.issuesFound} issues found, {run.issuesFixed} fixed
                          {run.commitSha && ` • ${run.commitSha.slice(0, 7)}`}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`text-[10px] md:text-xs font-bold ${run.status === 'success' ? 'text-emerald-400' : run.status === 'failed' ? 'text-red-400' : 'text-amber-400'}`}>{run.status}</span>
                      <div className="text-[10px] md:text-xs text-slate-500">{new Date(run.startedAt).toLocaleString()}</div>
                    </div>
                  </div>
                ))}
                {(!autoHealRuns || autoHealRuns.length === 0) && (
                  <p className={`text-xs md:text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'} text-center py-4`}>No auto-heal runs recorded yet</p>
                )}
              </div>
            </div>

            {/* Self-Update Button */}
            <div className={`${isDark ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'} border rounded-2xl p-4 md:p-6`}>
              <h3 className={`text-base md:text-lg font-black ${isDark ? 'text-white' : 'text-slate-900'} mb-4`}>Maintenance</h3>
              <button onClick={runSelfUpdate} className="px-4 md:px-6 py-2 md:py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-xs md:text-sm transition-all">
                🔄 Run Self-Update
              </button>
              <p className={`text-[10px] md:text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'} mt-2`}>Cleans expired blocks, archives old data, optimizes thresholds</p>
            </div>
          </div>
        )

      case 'secmonitor':
        return (
          <div className="space-y-4 md:space-y-6">
            {/* Threat Level Banner */}
            <div className={`border rounded-2xl p-4 md:p-6 ${
              securityDashboard?.threatLevel === 'critical' ? 'bg-red-500/10 border-red-500/30' :
              securityDashboard?.threatLevel === 'high' ? 'bg-orange-500/10 border-orange-500/30' :
              securityDashboard?.threatLevel === 'medium' ? 'bg-amber-500/10 border-amber-500/30' :
              'bg-emerald-500/10 border-emerald-500/30'
            }`}>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div>
                  <h3 className={`text-base md:text-lg font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>Security Status</h3>
                  <p className={`text-xs md:text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Real-time threat monitoring across all components</p>
                </div>
                <span className={`self-start md:self-auto px-3 md:px-4 py-1.5 md:py-2 rounded-full text-xs md:text-sm font-black uppercase ${
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
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
              {[
                { label: 'Events (24h)', value: securityDashboard?.summary?.totalEvents24h ?? 0, icon: '📊', color: 'from-blue-500/20 to-blue-600/10' },
                { label: 'Critical', value: securityDashboard?.summary?.criticalEvents ?? 0, icon: '🔴', color: 'from-red-500/20 to-red-600/10' },
                { label: 'Blocked IPs', value: securityDashboard?.summary?.blockedIps ?? 0, icon: '🚫', color: 'from-purple-500/20 to-purple-600/10' },
                { label: 'Failed Logins (1h)', value: securityDashboard?.summary?.failedLogins1h ?? 0, icon: '🔑', color: 'from-amber-500/20 to-amber-600/10' },
              ].map((card) => (
                <div key={card.label} className={`bg-gradient-to-br ${card.color} ${isDark ? 'border-white/10' : 'border-slate-200'} border rounded-2xl p-4 md:p-5`}>
                  <div className="text-xl md:text-2xl mb-2">{card.icon}</div>
                  <div className={`text-xl md:text-2xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>{card.value}</div>
                  <div className="text-[10px] md:text-xs text-slate-400 mt-1">{card.label}</div>
                </div>
              ))}
            </div>

            {/* Component Breakdown */}
            <div className={`${isDark ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'} border rounded-2xl p-4 md:p-6`}>
              <h3 className={`text-base md:text-lg font-black ${isDark ? 'text-white' : 'text-slate-900'} mb-4`}>Threats by Component</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                {[
                  { name: 'Frontend', key: 'frontend', icon: '🌐' },
                  { name: 'Backend', key: 'backend', icon: '⚙️' },
                  { name: 'Agents', key: 'agents', icon: '🤖' },
                  { name: 'Dashboard', key: 'dashboard', icon: '📊' },
                ].map((comp) => {
                  const data = securityDashboard?.byComponent?.[comp.key];
                  return (
                    <div key={comp.key} className={`${isDark ? 'bg-white/5 border-white/10' : 'bg-white border-slate-200'} border rounded-xl p-3 md:p-4`}>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-lg md:text-xl">{comp.icon}</span>
                        <span className={`text-xs md:text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{comp.name}</span>
                      </div>
                      <div className={`text-xl md:text-2xl font-black ${data?.threats > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                        {data?.threats ?? 0}
                      </div>
                      <div className="text-[10px] md:text-xs text-slate-400">threats detected</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Attack Type Breakdown */}
            {securityDashboard?.attackTypes && Object.keys(securityDashboard.attackTypes).length > 0 && (
              <div className={`${isDark ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'} border rounded-2xl p-4 md:p-6`}>
                <h3 className={`text-base md:text-lg font-black ${isDark ? 'text-white' : 'text-slate-900'} mb-4`}>Attack Types</h3>
                <div className="space-y-2">
                  {Object.entries(securityDashboard.attackTypes)
                    .sort(([,a], [,b]) => (b as number) - (a as number))
                    .slice(0, 10)
                    .map(([type, count]) => (
                      <div key={type} className={`flex items-center justify-between p-2 ${isDark ? 'bg-white/5' : 'bg-slate-100'} rounded-lg`}>
                        <span className={`text-xs md:text-sm ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{type.replace(/_/g, ' ')}</span>
                        <span className={`text-xs md:text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{count as number}</span>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Rate Limited IPs */}
            {securityDashboard?.rateLimitedIps && securityDashboard.rateLimitedIps.length > 0 && (
              <div className={`${isDark ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'} border rounded-2xl p-4 md:p-6`}>
                <h3 className={`text-base md:text-lg font-black ${isDark ? 'text-white' : 'text-slate-900'} mb-4`}>Rate Limited IPs</h3>
                <div className="space-y-2">
                  {securityDashboard.rateLimitedIps.map((item: any) => (
                    <div key={item.ip} className="flex flex-col md:flex-row md:items-center justify-between p-3 bg-red-500/10 border border-red-500/20 rounded-xl gap-2">
                      <div className="flex items-center gap-3">
                        <span className="w-2 h-2 rounded-full bg-red-400" />
                        <span className={`text-xs md:text-sm ${isDark ? 'text-white' : 'text-slate-900'} font-mono`}>{item.ip}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] md:text-xs text-red-400">{item.count} attempts</span>
                        <button
                          onClick={() => setBlockIPModal({ ip: item.ip, reason: 'Rate limit exceeded' })}
                          className="px-2 md:px-3 py-1 bg-red-600/20 text-red-400 rounded-lg text-[10px] md:text-xs font-bold hover:bg-red-600/40"
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
              <div className={`${isDark ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'} border rounded-2xl p-4 md:p-6`}>
                <h3 className={`text-base md:text-lg font-black ${isDark ? 'text-white' : 'text-slate-900'} mb-4`}>Active IP Blocks</h3>
                <div className="space-y-2 max-h-[25vh] md:max-h-[30vh] overflow-y-auto">
                  {securityDashboard.activeBlocks.map((block: any) => (
                    <div key={block._id} className={`flex flex-col md:flex-row md:items-center justify-between p-3 ${isDark ? 'bg-white/5' : 'bg-slate-100'} rounded-xl gap-2`}>
                      <div className="flex items-center gap-3">
                        <span className="w-2 h-2 rounded-full bg-red-400" />
                        <div>
                          <span className={`text-xs md:text-sm ${isDark ? 'text-white' : 'text-slate-900'} font-mono`}>{block.ip}</span>
                          <div className="text-[10px] md:text-xs text-slate-400">{block.reason}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] md:text-xs text-slate-500">{new Date(block.blockedAt).toLocaleString()}</span>
                        <button
                          onClick={async () => {
                            try {
                              await unblockIPMutation({ adminToken, ip: block.ip })
                              setCommandOutput(`Unblocked ${block.ip}`)
                            } catch (err) {
                              setCommandOutput(`Error unblocking IP: ${err instanceof Error ? err.message : String(err)}`)
                            }
                          }}
                          className="px-2 md:px-3 py-1 bg-emerald-600/20 text-emerald-400 rounded-lg text-[10px] md:text-xs font-bold hover:bg-emerald-600/40"
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
            <div className={`${isDark ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'} border rounded-2xl p-4 md:p-6`}>
              <h3 className={`text-base md:text-lg font-black ${isDark ? 'text-white' : 'text-slate-900'} mb-4`}>Recent Security Events</h3>
              <div className="space-y-2 max-h-[30vh] md:max-h-[40vh] overflow-y-auto">
                {securityDashboard?.recentEvents?.map((event: any, idx: number) => (
                  <div key={event._id || idx} className={`flex flex-col md:flex-row md:items-center justify-between p-3 ${isDark ? 'bg-white/5' : 'bg-slate-100'} rounded-xl gap-2`}>
                    <div className="flex items-center gap-3">
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${event.blocked ? 'bg-red-400' : event.severity === 'critical' ? 'bg-red-500' : event.severity === 'high' ? 'bg-orange-400' : 'bg-amber-400'}`} />
                      <div>
                        <span className={`text-xs md:text-sm ${isDark ? 'text-white' : 'text-slate-900'} font-medium`}>{(event.eventType || event.category || 'unknown').replace(/_/g, ' ')}</span>
                        <div className="text-[10px] md:text-xs text-slate-400 truncate max-w-[200px] md:max-w-none">{event.description || event.details}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`text-[10px] md:text-xs font-bold ${statusColor(event.severity)}`}>{event.severity}</span>
                      <div className="text-[10px] md:text-xs text-slate-500">{new Date(event.timestamp || event.createdAt).toLocaleString()}</div>
                    </div>
                  </div>
                ))}
                {(!securityDashboard?.recentEvents || securityDashboard.recentEvents.length === 0) && (
                  <p className={`text-xs md:text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'} text-center py-4`}>No security events in the last 24 hours</p>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className={`${isDark ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'} border rounded-2xl p-4 md:p-6`}>
              <h3 className={`text-base md:text-lg font-black ${isDark ? 'text-white' : 'text-slate-900'} mb-4`}>Security Actions</h3>
              <div className="flex gap-2 md:gap-3 flex-wrap">
                <button onClick={runSecurityScan} className="px-3 md:px-4 py-1.5 md:py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold text-xs md:text-sm transition-all">
                  🛡️ Run Security Scan
                </button>
                <button onClick={runSelfUpdate} className="px-3 md:px-4 py-1.5 md:py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-xs md:text-sm transition-all">
                  🔄 Self-Update
                </button>
                <button onClick={() => setBlockIPModal({ ip: '', reason: '' })} className="px-3 md:px-4 py-1.5 md:py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-bold text-xs md:text-sm transition-all">
                  🚫 Block IP
                </button>
              </div>
            </div>
          </div>
        )

      case 'deployment':
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

      case 'agents':
        return (
          <div className="space-y-4 md:space-y-6">
            <div className={`${isDark ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'} border rounded-2xl p-4 md:p-6`}>
              <h3 className={`text-base md:text-lg font-black ${isDark ? 'text-white' : 'text-slate-900'} mb-4`}>Agent Registry ({agents?.length || 0} agents)</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                {agents?.map((agent: any) => (
                  <div key={agent._id} className={`${isDark ? 'bg-white/5 border-white/10' : 'bg-white border-slate-200'} border rounded-xl p-3 md:p-4`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-xs md:text-sm font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>{agent.agentId} — {agent.agentName}</span>
                      <span className={`text-[10px] md:text-xs font-bold ${statusColor(agent.status)}`}>{agent.status}</span>
                    </div>
                    <div className="text-[10px] md:text-xs text-slate-400 mb-2 truncate">
                      Capabilities: {agent.capabilities?.join(', ')}
                    </div>
                    <div className="flex items-center gap-3 md:gap-4 text-[10px] md:text-xs text-slate-400">
                      <span>Health: {agent.healthScore}%</span>
                      <span>Tasks: {agent.totalTasks}</span>
                    </div>
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={async () => {
                          try {
                            await suspendAgentMutation({ adminToken, agentId: agent.agentId })
                          } catch (err) {
                            console.error('[Mimo] Failed to suspend agent:', err)
                          }
                        }}
                        className="px-2 md:px-3 py-1 bg-amber-600/20 text-amber-400 rounded-lg text-[10px] md:text-xs font-bold hover:bg-amber-600/40"
                      >
                        Suspend
                      </button>
                      <button
                        onClick={async () => {
                          if (confirm(`Delete agent ${agent.agentId}?`)) {
                            try {
                              await deleteAgentMutation({ adminToken, agentId: agent.agentId })
                            } catch (err) {
                              console.error('[Mimo] Failed to delete agent:', err)
                            }
                          }
                        }}
                        className="px-2 md:px-3 py-1 bg-red-600/20 text-red-400 rounded-lg text-[10px] md:text-xs font-bold hover:bg-red-600/40"
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
          <div className="space-y-4 md:space-y-6">
            <div className={`${isDark ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'} border rounded-2xl p-4 md:p-6`}>
              <h3 className={`text-base md:text-lg font-black ${isDark ? 'text-white' : 'text-slate-900'} mb-4`}>Command History</h3>
              <div className="space-y-2">
                {commands?.map((cmd: any) => (
                  <div key={cmd._id} className={`flex flex-col md:flex-row md:items-center justify-between p-3 ${isDark ? 'bg-white/5' : 'bg-slate-100'} rounded-xl gap-2`}>
                    <div className="flex items-center gap-2 md:gap-3">
                      <span className={`text-[10px] md:text-xs font-bold px-2 py-1 rounded ${cmd.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400' : cmd.status === 'failed' ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'}`}>
                        {cmd.status}
                      </span>
                      <span className={`text-xs md:text-sm ${isDark ? 'text-white' : 'text-slate-900'} font-medium truncate max-w-[150px] md:max-w-none`}>{cmd.command}</span>
                      <span className="text-[10px] md:text-xs text-slate-400 hidden sm:inline">by {cmd.issuedBy}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] md:text-xs text-slate-500">{new Date(cmd.startedAt).toLocaleString()}</div>
                      {cmd.durationMs && <div className="text-[10px] md:text-xs text-slate-500">{cmd.durationMs}ms</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className={`${isDark ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'} border rounded-2xl p-4 md:p-6`}>
              <h3 className={`text-base md:text-lg font-black ${isDark ? 'text-white' : 'text-slate-900'} mb-4`}>Audit Logs</h3>
              <div className="space-y-2">
                {auditLogs?.map((log: any) => (
                  <div key={log._id} className={`flex flex-col md:flex-row md:items-center justify-between p-3 ${isDark ? 'bg-white/5' : 'bg-slate-100'} rounded-xl gap-2`}>
                    <div className="flex items-center gap-2 md:gap-3">
                      <span className="text-[10px] md:text-xs text-slate-400">{log.action}</span>
                      <span className={`text-xs md:text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>{log.actor}</span>
                      {log.target && <span className="text-[10px] md:text-xs text-slate-400">→ {log.target}</span>}
                    </div>
                    <div className="text-[10px] md:text-xs text-slate-500">{new Date(log.timestamp).toLocaleString()}</div>
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

  const filteredTabs = MIMO_TABS.filter((tab) => tab.category === activeCategory)

  return (
    <div className={`min-h-screen ${isDark ? 'dark' : 'light'}`}>
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="fixed inset-0 bg-black/60" onClick={() => setSidebarOpen(false)} />
          <div className="fixed left-0 top-0 h-full w-72 bg-[#0a0a0f] border-r border-white/10 p-4 overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-black text-white">Navigation</h3>
              <button onClick={() => setSidebarOpen(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            {TAB_CATEGORIES.map((cat) => (
              <div key={cat.id} className="mb-4">
                <button
                  onClick={() => setActiveCategory(cat.id)}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-bold transition-all ${
                    activeCategory === cat.id ? 'bg-orange-500 text-white' : 'text-slate-400 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <span>{cat.icon}</span>
                  <span>{cat.label}</span>
                </button>
                {activeCategory === cat.id && (
                  <div className="mt-2 space-y-1">
                    {MIMO_TABS.filter((t) => t.category === cat.id).map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => { setActiveTab(tab.id); setSidebarOpen(false) }}
                        className={`w-full flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-all ${
                          activeTab === tab.id ? 'bg-[#FF6B35] text-white' : 'text-slate-400 hover:text-white hover:bg-white/10'
                        }`}
                      >
                        <span>{tab.icon}</span>
                        <span>{tab.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-4 md:space-y-6 p-4 md:p-6">
        {/* Block IP Modal */}
        {blockIPModal && (
          <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
            <div className={`${isDark ? 'bg-[#0a0a0f]' : 'bg-white'} border ${isDark ? 'border-white/10' : 'border-slate-200'} rounded-2xl p-6 w-full max-w-md`}>
              <h3 className={`text-lg font-black ${isDark ? 'text-white' : 'text-slate-900'} mb-4`}>Block IP Address</h3>
              <div className="space-y-3">
                <input
                  placeholder="IP Address"
                  value={blockIPModal.ip}
                  onChange={(e) => setBlockIPModal({ ...blockIPModal, ip: e.target.value })}
                  className={`w-full px-3 py-2 rounded-xl text-sm ${isDark ? 'bg-white/5 border-white/10 text-white' : 'bg-slate-100 border-slate-200 text-slate-900'} border`}
                />
                <input
                  placeholder="Reason"
                  value={blockIPModal.reason}
                  onChange={(e) => setBlockIPModal({ ...blockIPModal, reason: e.target.value })}
                  className={`w-full px-3 py-2 rounded-xl text-sm ${isDark ? 'bg-white/5 border-white/10 text-white' : 'bg-slate-100 border-slate-200 text-slate-900'} border`}
                />
                <div className="flex gap-2">
                  <button onClick={async () => {
                    if (blockIPModal.ip && blockIPModal.reason) {
                      await blockIPMutation({ adminToken, ip: blockIPModal.ip, reason: blockIPModal.reason })
                      setCommandOutput(`Blocked ${blockIPModal.ip}`)
                      setBlockIPModal(null)
                    }
                  }} className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold">Block</button>
                  <button onClick={() => setBlockIPModal(null)} className={`px-4 py-2 rounded-xl text-xs font-bold ${isDark ? 'bg-white/5 border-white/10 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-600'} border`}>Cancel</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 bg-white/10 rounded-lg text-white"
            >
              ☰
            </button>
            <div>
              <h2 className="text-xl md:text-2xl font-black tracking-tight text-white flex items-center gap-2 md:gap-3 flex-wrap">
                🧠 Mimo V.2.5
                <span className="text-[10px] md:text-xs px-2 md:px-3 py-1 bg-purple-500/20 text-purple-400 rounded-full font-bold">AUTONOMOUS INTELLIGENCE</span>
              </h2>
              <p className="text-xs md:text-sm text-slate-400 mt-1">Self-diagnose, self-heal, deploy, and manage all agents</p>
            </div>
          </div>
          <div className="flex items-center gap-2 md:gap-3">
            {/* Auto-Refresh Toggle */}
            <div className={`flex items-center gap-2 px-3 py-2 rounded-xl ${isDark ? 'bg-white/5 border-white/10' : 'bg-slate-100 border-slate-200'} border`}>
              <button
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`w-8 h-5 rounded-full transition-all ${autoRefresh ? 'bg-emerald-500' : 'bg-slate-600'}`}
                title={autoRefresh ? 'Auto-refresh ON' : 'Auto-refresh OFF'}
              >
                <div className={`w-4 h-4 bg-white rounded-full transition-all transform ${autoRefresh ? 'translate-x-4' : 'translate-x-0.5'}`} />
              </button>
              <span className="text-xs text-slate-400 hidden md:inline">Auto</span>
            </div>

            {/* Refresh Interval Selector */}
            {autoRefresh && (
              <div className={`flex gap-1 p-1 rounded-xl ${isDark ? 'bg-white/5 border-white/10' : 'bg-slate-100 border-slate-200'} border`}>
                {refreshOptions.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setRefreshInterval(opt.value)}
                    className={`px-2 py-1 rounded-lg text-[10px] md:text-xs font-bold transition-all ${
                      refreshInterval === opt.value
                        ? 'bg-emerald-500 text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}

            {/* Manual Refresh Button */}
            <button
              onClick={() => window.location.reload()}
              className={`p-2 md:p-3 rounded-xl transition-all ${isDark ? 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30' : 'bg-blue-100 text-blue-600 hover:bg-blue-200'}`}
              title="Refresh Now"
            >
              🔄
            </button>

            {/* Dark Mode Toggle */}
            <button
              onClick={toggleDarkMode}
              className={`p-2 md:p-3 rounded-xl transition-all ${isDark ? 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30' : 'bg-slate-700/20 text-slate-300 hover:bg-slate-700/30'}`}
              title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {isDark ? '☀️' : '🌙'}
            </button>
            {/* Health Badge */}
            <div className={`px-3 md:px-4 py-2 rounded-xl text-xs md:text-sm ${isDark ? 'bg-white/5 border-white/10 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-700'} border`}>
              Health: <span className={`font-black ${statusColor(coreState?.status || 'operational')}`}>{coreState?.overallHealth ?? 100}%</span>
            </div>
          </div>
        </div>

        {/* Desktop Category Tabs */}
        <div className="hidden lg:flex gap-2">
          {TAB_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                activeCategory === cat.id
                  ? 'bg-orange-500 text-white'
                  : `${isDark ? 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10' : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200'}`
              }`}
            >
              <span>{cat.icon}</span>
              <span>{cat.label}</span>
            </button>
          ))}
        </div>

        {/* Tab Navigation */}
        <div className={`flex gap-1 ${isDark ? 'bg-white/5 border-white/10' : 'bg-slate-100 border-slate-200'} border rounded-2xl p-1 overflow-x-auto`}>
          {filteredTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 md:gap-2 px-3 md:px-4 py-2 md:py-2.5 rounded-xl text-xs md:text-sm font-medium transition-all duration-200 whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-[#FF6B35] text-white shadow-lg shadow-[#FF6B35]/20'
                  : `${isDark ? 'text-slate-400 hover:text-white hover:bg-white/10' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'}`
              }`}
            >
              <span>{tab.icon}</span>
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="min-h-[50vh] md:min-h-[60vh]">
          {renderTab()}
        </div>
      </div>
    </div>
  )
}
