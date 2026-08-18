import { useCallback, useState } from 'react'
import { useMutation } from 'convex/react'
import { useSuspenseQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { api } from '../../../../convex/_generated/api'
import { useDarkMode } from './useDarkMode'

export function useMimoData(adminToken: string) {
  const [commandOutput, setCommandOutput] = useState<string | null>(null)
  const [blockIPModal, setBlockIPModal] = useState<{ ip: string; reason: string } | null>(null)
  const [cronSubTab, setCronSubTab] = useState<'overview' | 'jobs' | 'history' | 'categories'>('overview')
  const [cronCategoryFilter, setCronCategoryFilter] = useState<string | null>(null)
  const [dbSubTab, setDbSubTab] = useState<'tables' | 'indexes'>('tables')
  const [logFilter, setLogFilter] = useState<string>('all')
  const { isDark, toggle: toggleDarkMode } = useDarkMode()

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
const { data: coreState } = safeQuery(convexQuery(api.mimo_core.getCoreState, { adminToken }), { status: 'operational', overallHealth: 100, version: '2.5', totalDiagnoses: 0, totalHeals: 0 })
  const { data: stats } = safeQuery(convexQuery(api.mimo_core.getDashboardStats, { adminToken }), { agentCount: 0, healthLogs24h: 0, securityEvents24h: 0, commands24h: 0, criticalEvents: 0 })
  const { data: agents } = safeQuery<Array<unknown>>(convexQuery(api.mimo_core.listAgents, { adminToken }), [])
  const { data: healthLogs } = safeQuery<Array<unknown>>(convexQuery(api.mimo_core.listHealthLogs, { adminToken, limit: 30 }), [])
  const { data: securityEvents } = safeQuery<Array<unknown>>(convexQuery(api.mimo_core.listSecurityEvents, { adminToken, limit: 30 }), [])
  const { data: commands } = safeQuery<Array<unknown>>(convexQuery(api.mimo_core.listCommandHistory, { adminToken, limit: 30 }), [])
  const { data: deployments } = safeQuery<Array<unknown>>(convexQuery(api.mimo_core.listDeployments, { adminToken, limit: 10 }), [])
  const { data: auditLogs } = safeQuery<Array<unknown>>(convexQuery(api.mimo_core.listAuditLogs, { adminToken, limit: 30 }), [])

  const { data: autoHealRuns } = safeQuery<Array<unknown>>(convexQuery(api.mimo_core.listAutoHealRuns, { adminToken, limit: 30 }), [])
  const { data: autoHealStats } = safeQuery(convexQuery(api.mimo_core.getAutoHealStats, { adminToken }), { totalRuns: 0, successRate: 100, totalIssuesFixed: 0, criticalAlerts: 0, runsByStatus: { success: 0, partial: 0, failed: 0, running: 0 }, latestRun: undefined as any })
  const { data: securityDashboard } = safeQuery(convexQuery(api.mimo_core.getSecurityDashboard, { adminToken }), { threatLevel: 'low', summary: { totalEvents24h: 0, criticalEvents: 0, blockedIps: 0, failedLogins1h: 0 }, byComponent: {} as Record<string, any>, attackTypes: {}, recentEvents: [], activeBlocks: [], rateLimitedIps: [] })

  // Cron Jobs queries
  const { data: cronJobs } = safeQuery<Array<unknown>>(convexQuery(api.mimo_core.listCronJobs, { adminToken }), [])
  const { data: cronStats } = safeQuery(convexQuery(api.mimo_core.getCronStats, { adminToken }), { totalJobs: 0, enabledJobs: 0, executions24h: 0, failed24h: 0, success24h: 0, avgDurationMs: 0 })
  const { data: cronExecutions } = safeQuery<Array<unknown>>(convexQuery(api.mimo_core.getCronExecutionHistory, { adminToken, limit: 50 }), [])
  const { data: cronCategories } = safeQuery(convexQuery(api.mimo_core.getCronCategories, { adminToken }), {})

  // Tab-specific queries
  const { data: performanceMetrics } = safeQuery(convexQuery(api.mimo_core.getPerformanceMetrics, { adminToken }), { responseTime: { avg: 0, p50: 0, p95: 0, p99: 0 }, throughput: { requestsPerHour: 0, requestsPerDay: 0 }, errors: { count1h: 0, rate: 0 }, system: { cpu: 0, memory: 0, disk: 0 }, agents: { total: 0, healthy: 0, degraded: 0, down: 0 } })
  const { data: apiCosts } = safeQuery(convexQuery(api.mimo_core.getApiCosts, { adminToken }), { today: 0, thisMonth: 0, byProvider: {} })
  const { data: databaseStats } = safeQuery(convexQuery(api.mimo_core.getDatabaseStats, { adminToken }), { totalTables: 0, totalRows: 0, tables: [] })
  const { data: databaseIndexes } = safeQuery(convexQuery(api.mimo_core.getDatabaseIndexes, { adminToken }), { indexes: [] })
  const { data: environmentConfig } = safeQuery(convexQuery(api.mimo_core.getEnvironmentConfig, { adminToken }), { environment: 'production', apiKeys: [], featureFlags: {} })
  const { data: recentLogs } = safeQuery(convexQuery(api.mimo_core.getRecentLogs, { adminToken, limit: 100 }), { logs: [], stats: { critical: 0, error: 0, warning: 0, info: 0 } })
  const { data: notifications } = safeQuery(convexQuery(api.mimo_core.getNotifications, { adminToken, limit: 50 }), { notifications: [], alertCount: 0, warningCount: 0, unreadCount: 0 })
  const { data: notificationPrefs } = safeQuery(convexQuery(api.mimo_core.getNotificationPreferences, { adminToken }), { thresholds: {} })
  const { data: apiHealth } = safeQuery(convexQuery(api.mimo_core.getApiHealth, { adminToken }), { summary: { healthy: 0, degraded: 0, down: 0, totalCostToday: 0 }, services: [] })
  const { data: agentTestConfig } = safeQuery(convexQuery(api.mimo_core.getAgentTestConfig, { adminToken }), { enabled: false })
  const { data: agentTestResults } = safeQuery<Array<unknown>>(convexQuery(api.mimo_core.getAgentTestResults, { adminToken }), [])

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

  return {
    isDark,
    toggleDarkMode,
    commandOutput,
    setCommandOutput,
    blockIPModal,
    setBlockIPModal,
    cronSubTab,
    setCronSubTab,
    cronCategoryFilter,
    setCronCategoryFilter,
    dbSubTab,
    setDbSubTab,
    logFilter,
    setLogFilter,
    adminToken,
    coreState,
    stats,
    agents,
    healthLogs,
    securityEvents,
    commands,
    deployments,
    auditLogs,
    autoHealRuns,
    autoHealStats,
    securityDashboard,
    cronJobs,
    cronStats,
    cronExecutions,
    cronCategories,
    performanceMetrics,
    apiCosts,
    databaseStats,
    databaseIndexes,
    environmentConfig,
    recentLogs,
    notifications,
    notificationPrefs,
    apiHealth,
    agentTestConfig,
    agentTestResults,
    runDiagnose,
    runHeal,
    runForceHeal,
    runSecurityScan,
    runVerify,
    runDeploy,
    runSelfUpdate,
    manualFix,
    blockIPMutation,
    unblockIPMutation,
    triggerCronJob,
    toggleCronJobMutation,
    seedCronJobsMutation,
    testAllAgentsMutation,
    testAgentChatMutation,
    suspendAgentMutation,
    deleteAgentMutation,
    statusColor,
  }
}

export type MimoData = ReturnType<typeof useMimoData>