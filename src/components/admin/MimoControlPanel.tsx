import { useState } from 'react'
import { MIMO_TABS, TAB_CATEGORIES, type MimoTabId, type TabCategory } from './mimo/constants'
import { useMimoData } from './mimo/useMimoData'
import { DashboardTab } from './mimo/tabs/DashboardTab'
import { CronJobsTab } from './mimo/tabs/CronJobsTab'
import { AgentTestTab } from './mimo/tabs/AgentTestTab'
import { PerformanceTab } from './mimo/tabs/PerformanceTab'
import { DatabaseTab } from './mimo/tabs/DatabaseTab'
import { ConfigTab } from './mimo/tabs/ConfigTab'
import { LogsTab } from './mimo/tabs/LogsTab'
import { NotificationsTab } from './mimo/tabs/NotificationsTab'
import { ApiHealthTab } from './mimo/tabs/ApiHealthTab'
import { DiagnoseTab } from './mimo/tabs/DiagnoseTab'
import { HealingTab } from './mimo/tabs/HealingTab'
import { SecurityTab } from './mimo/tabs/SecurityTab'
import { AutoHealTab } from './mimo/tabs/AutoHealTab'
import { SecMonitorTab } from './mimo/tabs/SecMonitorTab'
import { DeploymentTab } from './mimo/tabs/DeploymentTab'
import { AgentsTab } from './mimo/tabs/AgentsTab'
import { HistoryTab } from './mimo/tabs/HistoryTab'

export function MimoControlPanel({ adminToken }: { adminToken: string }) {
  const [activeTab, setActiveTab] = useState<MimoTabId>('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [activeCategory, setActiveCategory] = useState<TabCategory>('core')
  const [autoRefresh, setAutoRefresh] = useState(false)
  const [refreshInterval, setRefreshInterval] = useState(60000)

  const mimo = useMimoData(adminToken)
  const {
    isDark,
    toggleDarkMode,
    coreState,
    statusColor,
    blockIPModal,
    setBlockIPModal,
    blockIPMutation,
    setCommandOutput,
  } = mimo

  const refreshOptions = [
    { label: '30s', value: 30000 },
    { label: '1m', value: 60000 },
    { label: '5m', value: 300000 },
    { label: 'Off', value: 0 },
  ]

  const renderTab = () => {
    switch (activeTab) {
      case 'dashboard': return <DashboardTab mimo={mimo} />
      case 'cronjobs': return <CronJobsTab mimo={mimo} />
      case 'agenttest': return <AgentTestTab mimo={mimo} />
      case 'performance': return <PerformanceTab mimo={mimo} />
      case 'database': return <DatabaseTab mimo={mimo} />
      case 'config': return <ConfigTab mimo={mimo} />
      case 'logs': return <LogsTab mimo={mimo} />
      case 'notifications': return <NotificationsTab mimo={mimo} />
      case 'apihealth': return <ApiHealthTab mimo={mimo} />
      case 'diagnose': return <DiagnoseTab mimo={mimo} />
      case 'healing': return <HealingTab mimo={mimo} />
      case 'security': return <SecurityTab mimo={mimo} />
      case 'autoheal': return <AutoHealTab mimo={mimo} />
      case 'secmonitor': return <SecMonitorTab mimo={mimo} />
      case 'deployment': return <DeploymentTab mimo={mimo} />
      case 'agents': return <AgentsTab mimo={mimo} />
      case 'history': return <HistoryTab mimo={mimo} />
      default: return null
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