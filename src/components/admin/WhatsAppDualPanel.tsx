import { useState } from 'react'
import { useQuery, useMutation, useAction } from 'convex/react'
import { api } from '../../../convex/_generated/api'

const MODEL_ICONS: Record<string, string> = {
  groq: '⚡', openrouter: '🧠', aiml: '🎨', mimo: '🚀', nvidia: '🟢',
}

export function WhatsAppDualPanel({ adminToken }: { adminToken: string }) {
  const [activeSystem, setActiveSystem] = useState<'admin' | 'enterprise'>('admin')
  const [activeTab, setActiveTab] = useState<'overview' | 'sessions' | 'pricing' | 'subscriptions' | 'ads' | 'safety' | 'revenue' | 'failed'>('overview')
  const [toast, setToast] = useState<{ type: string; msg: string } | null>(null)

  const adminStatus: any = useQuery(api.whatsapp_dual.getSystemStatus, { systemType: 'admin' })
  const enterpriseStatus: any = useQuery(api.whatsapp_dual.getSystemStatus, { systemType: 'enterprise' })
  const tiers: any = useQuery(api.whatsapp_dual.getPricingTiers, {})
  const rates: any = useQuery(api.whatsapp_dual.getMessageRates, {})
  const adminSubs: any = useQuery(api.whatsapp_dual.getSubscriptions, { systemType: 'admin' })
  const enterpriseSubs: any = useQuery(api.whatsapp_dual.getSubscriptions, { systemType: 'enterprise' })
  const blacklist: any = useQuery(api.whatsapp_dual.getBlacklist, {})
  const campaigns: any = useQuery(api.whatsapp_dual.getAdCampaigns, {})
  const revenue: any = useQuery(api.whatsapp_dual.getRevenueReport, { period: 'monthly' })
  const adminSessionStatus: any = useQuery(api.whatsapp_openwa.getSessionStatus, { sessionType: 'admin' })
  const enterpriseSessionStatus: any = useQuery(api.whatsapp_openwa.getSessionStatus, { sessionType: 'enterprise' })
  const adminHealth: any = useQuery(api.whatsapp_openwa.checkServerHealth, { sessionType: 'admin' })
  const enterpriseHealth: any = useQuery(api.whatsapp_openwa.checkServerHealth, { sessionType: 'enterprise' })
  const adminContacts: any = useQuery(api.whatsapp_openwa.getContacts, { sessionType: 'admin' })
  const adminGroups: any = useQuery(api.whatsapp_openwa.getGroups, { sessionType: 'admin' })
  const masterKillSwitch: any = useQuery(api.whatsapp_dual.getMasterKillSwitchStatus, {})

  const toggleSystem = useMutation(api.whatsapp_dual.toggleSystem)
  const togglePricingTier = useMutation(api.whatsapp_dual.togglePricingTier)
  const seedDefaults = useMutation(api.whatsapp_dual.seedWhatsAppDefaults)
  const startSession = useMutation(api.whatsapp_openwa.startSession)
  const stopSession = useMutation(api.whatsapp_openwa.stopSession)
  const failedMessages: any = useQuery(api.whatsapp_openwa.getFailedMessages, {})
  const retryFailedMessage = useMutation(api.whatsapp_openwa.retryFailedMessage)
  const deleteFailedMessage = useMutation(api.whatsapp_openwa.deleteFailedMessage)

  // Ad Orchestrator
  const adStatus: any = useQuery(api.adOrchestrator.getOrchestratorStatus)
  const toggleAdOrchestrator = useMutation(api.adOrchestrator.toggleOrchestrator)
  const toggleAdPlatform = useMutation(api.adOrchestrator.togglePlatform)

  const status = activeSystem === 'admin' ? adminStatus : enterpriseStatus
  const subs = activeSystem === 'admin' ? adminSubs : enterpriseSubs

  const showToast = (type: string, msg: string) => {
    setToast({ type, msg })
    setTimeout(() => setToast(null), 4000)
  }

  const handleToggle = async () => {
    if (!status?.status) return
    const newEnabled = !status.status.isEnabled
    try {
      const result = await toggleSystem({
        systemType: activeSystem,
        enabled: newEnabled,
        adminToken,
      })
      if (result.success) {
        showToast('success', `${activeSystem.toUpperCase()} WhatsApp ${newEnabled ? 'ENABLED' : 'DISABLED'} for ${result.affectedClients} clients`)
      }
    } catch (e: any) {
      showToast('error', e.message)
    }
  }

  const handleSeed = async () => {
    try {
      const result = await seedDefaults({ adminToken })
      showToast('success', `Seeded ${result.seeded} default records`)
    } catch (e: any) {
      showToast('error', e.message)
    }
  }

  const handleStartSession = async (sessionType: 'admin' | 'enterprise') => {
    try {
      await startSession({ sessionType, adminToken })
      showToast('success', `${sessionType} session starting...`)
    } catch (e: any) {
      showToast('error', e.message)
    }
  }

  const handleStopSession = async (sessionType: 'admin' | 'enterprise') => {
    try {
      await stopSession({ sessionType, adminToken })
      showToast('success', `${sessionType} session stopped`)
    } catch (e: any) {
      showToast('error', e.message)
    }
  }

  const isEnabled = status?.status?.isEnabled ?? true
  const activeClients = status?.activeClients ?? 0
  const totalMessages = status?.totalMessages ?? 0

  const tabs = [
    { id: 'overview' as const, label: 'Overview', icon: '📊' },
    { id: 'sessions' as const, label: 'Sessions', icon: '📱' },
    { id: 'pricing' as const, label: 'Pricing', icon: '💰' },
    { id: 'subscriptions' as const, label: 'Subscriptions', icon: '📋' },
    { id: 'failed' as const, label: 'Failed', icon: '⚠️' },
    { id: 'ads' as const, label: 'Global Ads', icon: '🌍' },
    { id: 'safety' as const, label: 'Safety', icon: '🛡️' },
    { id: 'revenue' as const, label: 'Revenue', icon: '📈' },
  ]

  if (!adminStatus || !enterpriseStatus) {
    return (
      <div className="space-y-6">
        <h2 className="text-xl font-black">📱 WhatsApp Dual System</h2>
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black">📱 WhatsApp Dual System</h2>
          <p className="text-xs text-slate-400 mt-1">Business Number: +234-9113393525 | Dutchkem Ventures</p>
        </div>
        <button onClick={handleSeed}
          className="px-4 py-2 bg-slate-700 text-white rounded-xl text-xs font-bold hover:bg-slate-600">
          🔄 Seed Defaults
        </button>
      </div>

      {/* Master Kill Switch Alert */}
      {masterKillSwitch && !masterKillSwitch.enabled && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🛑</span>
            <div>
              <p className="font-black text-red-400">MASTER KILL SWITCH ACTIVE</p>
              <p className="text-xs text-slate-400 mt-1">{masterKillSwitch.message}</p>
              <p className="text-[10px] text-slate-500 mt-1">Source: {masterKillSwitch.source}</p>
            </div>
          </div>
        </div>
      )}

      {/* Expiring Subscriptions Warning */}
      {subs && subs.some((s: any) => {
        if (s.status !== 'active' || !s.endDate) return false
        const daysLeft = Math.ceil((s.endDate - Date.now()) / (24 * 60 * 60 * 1000))
        return daysLeft <= 7 && daysLeft > 0
      }) && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">⏰</span>
            <div>
              <p className="font-black text-amber-400">Subscriptions Expiring Soon</p>
              <p className="text-xs text-slate-400 mt-1">
                {subs.filter((s: any) => {
                  if (s.status !== 'active' || !s.endDate) return false
                  const daysLeft = Math.ceil((s.endDate - Date.now()) / (24 * 60 * 60 * 1000))
                  return daysLeft <= 7 && daysLeft > 0
                }).length} subscription(s) expiring within 7 days (3-day grace period applies)
              </p>
            </div>
          </div>
        </div>
      )}

      {/* System Switcher */}
      <div className="flex gap-2">
        {(['admin', 'enterprise'] as const).map((sys) => {
          const sysStatus = sys === 'admin' ? adminStatus : enterpriseStatus
          const sysEnabled = sysStatus?.status?.isEnabled ?? true
          return (
            <button key={sys} onClick={() => setActiveSystem(sys)}
              className={`flex-1 p-4 rounded-2xl border-l-4 transition-all ${
                activeSystem === sys
                  ? 'bg-slate-800 border-orange-500'
                  : 'bg-slate-900/50 border-slate-700 hover:bg-slate-800/50'
              }`}>
              <div className="flex items-center justify-between">
                <div className="text-left">
                  <p className="font-black text-sm">{sys === 'admin' ? '👤 Admin WhatsApp' : '🏢 Enterprise WhatsApp'}</p>
                  <p className="text-[10px] text-slate-400 mt-1">{sysStatus?.activeClients ?? 0} active clients</p>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  sysEnabled ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                }`}>
                  {sysEnabled ? '🟢 ON' : '🔴 OFF'}
                </span>
              </div>
            </button>
          )
        })}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-800 rounded-xl p-1">
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === tab.id ? 'bg-orange-500 text-white' : 'text-slate-400 hover:text-white'
            }`}>
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          {/* Toggle Card */}
          <div className={`rounded-2xl border-l-4 p-5 transition-all ${
            isEnabled ? 'bg-emerald-500/5 border-emerald-500/30' : 'bg-red-500/5 border-red-500/30'
          }`}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="font-black text-lg">📱 WhatsApp Service</p>
                <p className="text-xs text-slate-400 mt-1">+234-9113393525 | Dutchkem Ventures</p>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                isEnabled ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
              }`}>
                {isEnabled ? '🟢 Active' : '🔴 Inactive'}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="text-center">
                <p className="text-2xl font-black text-white">{activeClients}</p>
                <p className="text-[10px] text-slate-500 uppercase">Active Clients</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-black text-blue-400">{totalMessages.toLocaleString()}</p>
                <p className="text-[10px] text-slate-500 uppercase">Messages Sent</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-black text-emerald-400">₦{(revenue?.totalRevenue ?? 0).toLocaleString()}</p>
                <p className="text-[10px] text-slate-500 uppercase">Revenue</p>
              </div>
            </div>
            <button onClick={handleToggle}
              className={`w-full py-3 rounded-xl font-bold text-sm transition-all ${
                isEnabled ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-emerald-500 text-white hover:bg-emerald-600'
              }`}>
              {isEnabled ? '🔴 Disable WhatsApp' : '🟢 Enable WhatsApp'}
            </button>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
              <p className="text-xl font-black text-white">{subs?.length ?? 0}</p>
              <p className="text-[10px] text-slate-500 uppercase">Subscriptions</p>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
              <p className="text-xl font-black text-white">{blacklist?.length ?? 0}</p>
              <p className="text-[10px] text-slate-500 uppercase">Blacklisted</p>
            </div>
          </div>
        </div>
      )}

      {/* Sessions Tab */}
      {activeTab === 'sessions' && (
        <div className="space-y-4">
          <h3 className="font-black">📱 WhatsApp Sessions (OpenWA)</h3>
          <p className="text-xs text-slate-400">Connect to WhatsApp via OpenWA. Scan QR code to authenticate.</p>

          {(['admin', 'enterprise'] as const).map((sys) => {
            const sessStatus = sys === 'admin' ? adminSessionStatus : enterpriseSessionStatus
            const health = sys === 'admin' ? adminHealth : enterpriseHealth
            const connected = sessStatus?.connected ?? false
            const isStale = health?.isStale ?? false

            return (
              <div key={sys} className={`rounded-2xl border-l-4 p-5 transition-all ${
                connected && !isStale ? 'bg-emerald-500/5 border-emerald-500/30' :
                connected && isStale ? 'bg-amber-500/5 border-amber-500/30' :
                'bg-slate-900 border-slate-800'
              }`}>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="font-black">{sys === 'admin' ? '👤 Admin Session' : '🏢 Enterprise Session'}</p>
                    <p className="text-[10px] text-slate-400 mt-1">Business: +234-9113393525</p>
                  </div>
                  <div className="text-right">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                      connected && !isStale ? 'bg-emerald-500/10 text-emerald-400' :
                      connected && isStale ? 'bg-amber-500/10 text-amber-400' :
                      'bg-red-500/10 text-red-400'
                    }`}>
                      {connected && !isStale ? '🟢 Connected' :
                       connected && isStale ? `⚠️ Stale (${health?.minutesSincePing || '?'}min)` :
                       '🔴 Disconnected'}
                    </span>
                    {health?.canSendMessages === false && connected && (
                      <p className="text-[9px] text-amber-400 mt-1">Cannot send messages — reconnect required</p>
                    )}
                  </div>
                </div>

                {sessStatus?.qr && !connected && (
                  <div className="bg-white p-4 rounded-xl text-center mb-3">
                    <p className="text-xs text-slate-600 mb-2">Scan QR Code with WhatsApp</p>
                    <img src={`data:image/png;base64,${sessStatus.qr}`} alt="QR Code" className="mx-auto" style={{ maxWidth: 256 }} />
                    <p className="text-[9px] text-slate-500 mt-2">Open WhatsApp → Settings → Linked Devices → Link a Device</p>
                  </div>
                )}

                {!sessStatus?.qr && !connected && sessStatus?.status === 'starting' && (
                  <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-xl text-center mb-3">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <div className="w-4 h-4 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
                      <p className="text-xs font-bold text-amber-400">Starting session...</p>
                    </div>
                    <p className="text-[9px] text-slate-500">Waiting for OpenWA server to generate QR code</p>
                  </div>
                )}

                {!connected && sessStatus?.status !== 'starting' && (
                  <div className="bg-slate-800 p-4 rounded-xl text-center mb-3">
                    <p className="text-xs text-slate-400 mb-3">Click the toggle below to start the WhatsApp session</p>
                    <p className="text-[9px] text-slate-500">The OpenWA server will generate a QR code to scan</p>
                  </div>
                )}

                <div className="flex items-center gap-3">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" checked={connected}
                      onChange={async () => {
                        if (connected) {
                          await handleStopSession(sys)
                        } else {
                          await handleStartSession(sys)
                        }
                      }}
                      className="sr-only peer" />
                    <div className="w-11 h-6 bg-slate-700 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500" />
                  </label>
                  <span className={`text-xs font-bold ${connected ? 'text-emerald-400' : 'text-red-400'}`}>
                    {connected ? '🟢 Connected' : '🔴 Disconnected'}
                  </span>
                </div>
              </div>
            )
          })}

          {/* Contacts & Groups (admin only) */}
          {activeSystem === 'admin' && adminSessionStatus?.connected && (
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
                <h4 className="font-bold text-sm mb-2">👥 Contacts ({adminContacts?.contacts?.length ?? 0})</h4>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {(adminContacts?.contacts ?? []).slice(0, 10).map((c: any) => (
                    <div key={c.id} className="flex items-center gap-2 text-xs">
                      <span className="w-2 h-2 rounded-full bg-emerald-400" />
                      <span className="text-slate-300">{c.name}</span>
                      <span className="text-slate-500">{c.phone}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
                <h4 className="font-bold text-sm mb-2">👥 Groups ({adminGroups?.groups?.length ?? 0})</h4>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {(adminGroups?.groups ?? []).slice(0, 10).map((g: any) => (
                    <div key={g.id} className="flex items-center gap-2 text-xs">
                      <span className="w-2 h-2 rounded-full bg-blue-400" />
                      <span className="text-slate-300">{g.name}</span>
                      <span className="text-slate-500">{g.members} members</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Pricing Tab */}
      {activeTab === 'pricing' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-black">💰 Pricing Tiers</h3>
            <p className="text-xs text-slate-400">Toggle tiers to enable/disable for clients and agents</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {(tiers ?? []).map((tier: any) => (
              <div key={tier._id} className={`rounded-2xl border-l-4 p-4 transition-all ${
                tier.isActive ? 'bg-emerald-500/5 border-emerald-500/30' : 'bg-slate-900/50 border-red-500/30 opacity-70'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-black text-sm">{tier.name}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      tier.clientType === 'enterprise' ? 'bg-purple-500/10 text-purple-400' : 'bg-blue-500/10 text-blue-400'
                    }`}>
                      {tier.clientType}
                    </span>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    tier.isActive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                  }`}>
                    {tier.isActive ? '🟢 Active' : '🔴 Disabled'}
                  </span>
                </div>
                <p className="text-2xl font-black text-emerald-400">₦{tier.priceNgn.toLocaleString()}<span className="text-xs text-slate-500">/mo</span></p>
                <p className="text-xs text-slate-400 mt-1">{tier.messagesPerMonth.toLocaleString()} messages • {tier.agentLimit} agents</p>
                <div className="flex flex-wrap gap-1 mt-2">
                  {tier.features.map((f: string) => (
                    <span key={f} className="px-2 py-0.5 bg-slate-800 rounded text-[10px] text-slate-400">{f}</span>
                  ))}
                </div>
                <div className="mt-3 pt-3 border-t border-slate-800">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" checked={tier.isActive}
                      onChange={async () => {
                        try {
                          await togglePricingTier({ tierId: tier._id, isActive: !tier.isActive, adminToken })
                          showToast('success', `${tier.name} ${!tier.isActive ? 'ENABLED' : 'DISABLED'}`)
                        } catch (e: any) { showToast('error', e.message) }
                      }}
                      className="sr-only peer" />
                    <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500" />
                  </label>
                  <span className="ml-3 text-xs text-slate-400">{tier.isActive ? '✅ Sending allowed' : '🚫 Sending blocked'}</span>
                </div>
              </div>
            ))}
          </div>

          <h3 className="font-black mt-6">💸 Message Rates (Overage)</h3>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
            <table className="w-full">
              <thead><tr className="border-b border-slate-800">
                <th className="text-left px-4 py-3 text-[10px] text-slate-500 uppercase font-bold">Type</th>
                <th className="text-right px-4 py-3 text-[10px] text-slate-500 uppercase font-bold">Rate</th>
              </tr></thead>
              <tbody>
                {(rates ?? []).map((r: any) => (
                  <tr key={r._id} className="border-b border-slate-800/50">
                    <td className="px-4 py-3 text-xs font-bold capitalize">{r.messageType}</td>
                    <td className="px-4 py-3 text-right text-xs font-bold text-emerald-400">₦{r.rateNgn}/msg</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Subscriptions Tab */}
      {activeTab === 'subscriptions' && (
        <div className="space-y-4">
          <h3 className="font-black">📋 {activeSystem === 'admin' ? 'Client' : 'Enterprise'} Subscriptions</h3>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
            <table className="w-full">
              <thead><tr className="border-b border-slate-800">
                <th className="text-left px-4 py-3 text-[10px] text-slate-500 uppercase font-bold">Phone</th>
                <th className="text-left px-4 py-3 text-[10px] text-slate-500 uppercase font-bold">Status</th>
                <th className="text-right px-4 py-3 text-[10px] text-slate-500 uppercase font-bold">Used</th>
                <th className="text-right px-4 py-3 text-[10px] text-slate-500 uppercase font-bold">Limit</th>
                <th className="text-right px-4 py-3 text-[10px] text-slate-500 uppercase font-bold">Usage</th>
                <th className="text-right px-4 py-3 text-[10px] text-slate-500 uppercase font-bold">Expires</th>
              </tr></thead>
              <tbody>
                {(subs ?? []).map((sub: any) => {
                  const usagePct = sub.messagesLimit > 0 ? (sub.messagesUsed / sub.messagesLimit) * 100 : 0
                  const daysLeft = sub.endDate ? Math.ceil((sub.endDate - Date.now()) / (24 * 60 * 60 * 1000)) : null
                  const isExpiringSoon = daysLeft !== null && daysLeft <= 7 && daysLeft > 0
                  const isExpired = daysLeft !== null && daysLeft <= 0
                  return (
                    <tr key={sub._id} className="border-b border-slate-800/50">
                      <td className="px-4 py-3 text-xs font-bold">{sub.phoneNumber}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          sub.status === 'active' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                        }`}>{sub.status}</span>
                      </td>
                      <td className="px-4 py-3 text-right text-xs">{sub.messagesUsed.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right text-xs">{sub.messagesLimit.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="w-20 h-2 bg-slate-800 rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{
                            width: `${Math.min(usagePct, 100)}%`,
                            backgroundColor: usagePct > 90 ? '#ef4444' : usagePct > 70 ? '#f59e0b' : '#10b981',
                          }} />
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {daysLeft !== null ? (
                          <span className={`text-[10px] font-bold ${
                            isExpired ? 'text-red-400' : isExpiringSoon ? 'text-amber-400' : 'text-slate-400'
                          }`}>
                            {isExpired ? 'Expired' : `${daysLeft}d`}
                            {isExpiringSoon && ' (grace)'}
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-500">-</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
                {(!subs || subs.length === 0) && (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-xs text-slate-500">No subscriptions yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Failed Messages Tab */}
      {activeTab === 'failed' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-black">⚠️ Failed Messages</h3>
              <p className="text-xs text-slate-400 mt-1">{failedMessages?.length ?? 0} messages failed to send</p>
            </div>
          </div>

          {(!failedMessages || failedMessages.length === 0) ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center">
              <p className="text-3xl mb-2">✅</p>
              <p className="text-sm font-bold text-slate-400">No failed messages</p>
              <p className="text-xs text-slate-500 mt-1">All messages are being delivered successfully</p>
            </div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
              <table className="w-full">
                <thead><tr className="border-b border-slate-800">
                  <th className="text-left px-4 py-3 text-[10px] text-slate-500 uppercase font-bold">To</th>
                  <th className="text-left px-4 py-3 text-[10px] text-slate-500 uppercase font-bold">Session</th>
                  <th className="text-left px-4 py-3 text-[10px] text-slate-500 uppercase font-bold">Type</th>
                  <th className="text-left px-4 py-3 text-[10px] text-slate-500 uppercase font-bold">Error</th>
                  <th className="text-right px-4 py-3 text-[10px] text-slate-500 uppercase font-bold">Retries</th>
                  <th className="text-right px-4 py-3 text-[10px] text-slate-500 uppercase font-bold">Actions</th>
                </tr></thead>
                <tbody>
                  {(failedMessages ?? []).map((msg: any) => (
                    <tr key={msg._id} className="border-b border-slate-800/50">
                      <td className="px-4 py-3 text-xs font-bold">{msg.to}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          msg.sessionType === 'admin' ? 'bg-blue-500/10 text-blue-400' : 'bg-purple-500/10 text-purple-400'
                        }`}>{msg.sessionType}</span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-400">{msg.messageType}</td>
                      <td className="px-4 py-3 text-xs text-red-400 max-w-[200px] truncate">{msg.error}</td>
                      <td className="px-4 py-3 text-right text-xs">{msg.retryCount}/3</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex gap-1 justify-end">
                          <button
                            onClick={async () => {
                              try {
                                await retryFailedMessage({ messageId: msg._id, adminToken })
                                showToast('success', 'Message queued for retry')
                              } catch (e: any) { showToast('error', e.message) }
                            }}
                            className="px-2 py-1 bg-emerald-500/10 text-emerald-400 rounded text-[10px] font-bold hover:bg-emerald-500/20"
                          >Retry</button>
                          <button
                            onClick={async () => {
                              try {
                                await deleteFailedMessage({ messageId: msg._id, adminToken })
                                showToast('success', 'Message deleted')
                              } catch (e: any) { showToast('error', e.message) }
                            }}
                            className="px-2 py-1 bg-red-500/10 text-red-400 rounded text-[10px] font-bold hover:bg-red-500/20"
                          >Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Global Ads Tab */}
      {activeTab === 'ads' && (
        <div className="space-y-4">
          {/* Master Toggle */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="font-black">🌍 Global Ad Automation</p>
                <p className="text-xs text-slate-400">Auto-post adverts across all platforms</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" checked={adStatus?.enabled ?? false}
                  onChange={async () => {
                    try {
                      await toggleAdOrchestrator({
                        enabled: !(adStatus?.enabled ?? false),
                        adminToken
                      })
                      showToast('success', `Ad Orchestrator ${!(adStatus?.enabled ?? false) ? 'ENABLED' : 'DISABLED'}`)
                    } catch (e: any) {
                      showToast('error', e.message)
                    }
                  }}
                  className="sr-only peer" />
                <div className="w-11 h-6 bg-slate-700 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500" />
              </label>
            </div>
            
            {/* WhatsApp Compliance Notice */}
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 mb-4">
              <p className="text-xs text-amber-400 font-bold">⚠️ WhatsApp Compliance Rules</p>
              <ul className="text-[10px] text-slate-400 mt-1 space-y-0.5">
                <li>• Only NEW contacts receive adverts (no spam to existing)</li>
                <li>• Rate limit: 1,000 messages/day maximum</li>
                <li>• 1% complaint threshold - auto-pause if exceeded</li>
                <li>• Business hours only: 8AM - 8PM WAT</li>
                <li>• Opt-out mechanism included in every message</li>
              </ul>
            </div>
            
            {/* Platform toggles */}
            <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
              {(adStatus?.platforms ?? []).map((p: any) => (
                <div key={p.id} className="flex items-center gap-2 bg-slate-800 rounded-lg p-2">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" checked={p.enabled}
                      onChange={async () => {
                        try {
                          await toggleAdPlatform({
                            platformId: p.id,
                            enabled: !p.enabled,
                            adminToken
                          })
                          showToast('success', `${p.id} ${!p.enabled ? 'ENABLED' : 'DISABLED'}`)
                        } catch (e: any) {
                          showToast('error', e.message)
                        }
                      }}
                      className="sr-only peer" />
                    <div className="w-9 h-5 bg-slate-700 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500" />
                  </label>
                  <span className="text-[10px] text-slate-400 truncate">{p.id}</span>
                </div>
              ))}
            </div>
            
            {/* Stats */}
            <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-slate-800">
              <div className="text-center">
                <p className="text-lg font-black text-white">{adStatus?.totalGenerated ?? 0}</p>
                <p className="text-[10px] text-slate-500">Generated</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-black text-emerald-400">{adStatus?.totalPosted ?? 0}</p>
                <p className="text-[10px] text-slate-500">Posted</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-black text-blue-400">{adStatus?.platforms?.filter((p: any) => p.enabled).length ?? 0}</p>
                <p className="text-[10px] text-slate-500">Active Platforms</p>
              </div>
            </div>
          </div>

          {/* Campaigns */}
          <div>
            <h3 className="font-black mb-3">📋 Campaigns</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {(campaigns ?? []).map((c: any) => (
                <div key={c._id} className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-black text-sm">{c.name}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      c.status === 'active' ? 'bg-emerald-500/10 text-emerald-400' :
                      c.status === 'completed' ? 'bg-blue-500/10 text-blue-400' : 'bg-slate-700 text-slate-400'
                    }`}>{c.status}</span>
                  </div>
                  <p className="text-xs text-slate-400 mb-2">{c.headline}</p>
                  <div className="flex gap-3 text-[10px] text-slate-500">
                    <span>Sent: {c.sentCount}</span>
                    <span>Failed: {c.failedCount}</span>
                    <span>Target: {c.targetCount}</span>
                  </div>
                </div>
              ))}
              {(!campaigns || campaigns.length === 0) && (
                <div className="col-span-3 bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center">
                  <p className="text-3xl mb-2">🌍</p>
                  <p className="text-sm font-bold text-slate-400">No campaigns yet</p>
                  <p className="text-xs text-slate-500 mt-1">Enable the orchestrator to auto-generate campaigns</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Safety Tab */}
      {activeTab === 'safety' && (
        <div className="space-y-4">
          <h3 className="font-black">🛡️ Safety & Blacklist</h3>
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
              <p className="text-2xl font-black text-red-400">{blacklist?.length ?? 0}</p>
              <p className="text-[10px] text-slate-500 uppercase">Blacklisted</p>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
              <p className="text-2xl font-black text-amber-400">1%</p>
              <p className="text-[10px] text-slate-500 uppercase">Complaint Threshold</p>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
              <p className="text-2xl font-black text-blue-400">1,000</p>
              <p className="text-[10px] text-slate-500 uppercase">Rate Limit/Day</p>
            </div>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
            <table className="w-full">
              <thead><tr className="border-b border-slate-800">
                <th className="text-left px-4 py-3 text-[10px] text-slate-500 uppercase font-bold">Phone</th>
                <th className="text-left px-4 py-3 text-[10px] text-slate-500 uppercase font-bold">Reason</th>
                <th className="text-right px-4 py-3 text-[10px] text-slate-500 uppercase font-bold">Complaints</th>
                <th className="text-right px-4 py-3 text-[10px] text-slate-500 uppercase font-bold">Blocked</th>
              </tr></thead>
              <tbody>
                {(blacklist ?? []).map((b: any) => (
                  <tr key={b._id} className="border-b border-slate-800/50">
                    <td className="px-4 py-3 text-xs font-bold">{b.phoneNumber}</td>
                    <td className="px-4 py-3 text-xs text-slate-400">{b.reason}</td>
                    <td className="px-4 py-3 text-right text-xs text-red-400">{b.complaintCount}</td>
                    <td className="px-4 py-3 text-right text-xs text-slate-400">{new Date(b.blockedAt).toLocaleDateString()}</td>
                  </tr>
                ))}
                {(!blacklist || blacklist.length === 0) && (
                  <tr><td colSpan={4} className="px-4 py-8 text-center text-xs text-slate-500">No blacklisted numbers</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Revenue Tab */}
      {activeTab === 'revenue' && revenue && (
        <div className="space-y-4">
          <h3 className="font-black">📈 Revenue Report</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border border-emerald-500/20 rounded-2xl p-4 text-center">
              <p className="text-2xl font-black text-emerald-400">₦{(revenue.totalRevenue ?? 0).toLocaleString()}</p>
              <p className="text-[10px] text-slate-500 uppercase mt-1">Revenue (Monthly)</p>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
              <p className="text-2xl font-black text-white">₦{(revenue.projectedAnnual ?? 0).toLocaleString()}</p>
              <p className="text-[10px] text-slate-500 uppercase mt-1">Projected Annual</p>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
              <p className="text-2xl font-black text-white">{(revenue.transactionCount ?? 0).toLocaleString()}</p>
              <p className="text-[10px] text-slate-500 uppercase mt-1">Transactions</p>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
              <p className="text-2xl font-black text-blue-400">{Object.keys(revenue.byType ?? {}).length}</p>
              <p className="text-[10px] text-slate-500 uppercase mt-1">Revenue Sources</p>
            </div>
          </div>
          {Object.keys(revenue.byType ?? {}).length > 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <h4 className="text-sm font-bold mb-3">Revenue by Type</h4>
              <div className="space-y-2">
                {Object.entries(revenue.byType ?? {}).sort(([,a]: [string,any], [,b]: [string,any]) => b - a).map(([type, amount]: [string, any]) => (
                  <div key={type} className="flex items-center gap-3">
                    <span className="text-xs font-bold w-24 capitalize">{type}</span>
                    <div className="flex-1 h-3 bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full" style={{
                        width: `${(amount / Math.max(revenue.totalRevenue, 1)) * 100}%`
                      }} />
                    </div>
                    <span className="text-xs font-bold text-emerald-400 w-20 text-right">₦{amount.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 px-5 py-3 rounded-2xl shadow-2xl z-50 animate-pulse ${
          toast.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'
        }`}>
          <p className="text-sm font-bold">{toast.msg}</p>
        </div>
      )}
    </div>
  )
}
