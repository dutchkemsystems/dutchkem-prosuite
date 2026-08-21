import { useState } from 'react'
import { OverviewTab } from './OverviewTab'
import { SubscriptionsTab } from './SubscriptionsTab'
import { AgentPricingTab } from './AgentPricingTab'
import { EnterpriseAddonsTab } from './EnterpriseAddonsTab'
import { CreditsTab } from './CreditsTab'
import { SocialTab } from './SocialTab'
import { MarketplaceTab } from './MarketplaceTab'
import { OutcomesTab } from './OutcomesTab'
import { WhiteLabelTab } from './WhiteLabelTab'
import { AnalyticsTab } from './AnalyticsTab'
import { CommerceTab } from './CommerceTab'
import { ConsultingTab } from './ConsultingTab'
import { ApiAccessTab } from './ApiAccessTab'
import { AutoEngageTab } from './AutoEngageTab'

type RevenueTab =
  | 'overview'
  | 'subscriptions'
  | 'agent_pricing'
  | 'enterprise_addons'
  | 'credits'
  | 'social'
  | 'marketplace'
  | 'outcomes'
  | 'whitelabel'
  | 'analytics'
  | 'commerce'
  | 'consulting'
  | 'api_access'
  | 'auto_engage'

const TABS: { id: RevenueTab; label: string; icon: string }[] = [
  { id: 'overview', label: 'Overview', icon: '📊' },
  { id: 'subscriptions', label: 'Subscriptions', icon: '💳' },
  { id: 'agent_pricing', label: 'Agent Pricing', icon: '🤖' },
  { id: 'enterprise_addons', label: 'Enterprise Add-ons', icon: '🏢' },
  { id: 'credits', label: 'Credits', icon: '💰' },
  { id: 'social', label: 'Social Commerce', icon: '📱' },
  { id: 'marketplace', label: 'Marketplace', icon: '🏪' },
  { id: 'outcomes', label: 'Outcome Pricing', icon: '🎯' },
  { id: 'whitelabel', label: 'White Label', icon: '🏷️' },
  { id: 'analytics', label: 'Analytics', icon: '📈' },
  { id: 'commerce', label: 'Commerce', icon: '🛒' },
  { id: 'consulting', label: 'Consulting', icon: '👨‍💼' },
  { id: 'api_access', label: 'API Access', icon: '🔑' },
  { id: 'auto_engage', label: 'Auto-Engage', icon: '🤖' },
]

// ─── MAIN COMPONENT ───────────────────────────────────────────

export function RevenueHub({ adminToken }: { adminToken: string }) {
  const [activeTab, setActiveTab] = useState<RevenueTab>('overview')

  const renderTab = () => {
    switch (activeTab) {
      case 'overview':
        return <OverviewTab adminToken={adminToken} />
      case 'subscriptions':
        return <SubscriptionsTab adminToken={adminToken} />
      case 'agent_pricing':
        return <AgentPricingTab adminToken={adminToken} />
      case 'enterprise_addons':
        return <EnterpriseAddonsTab adminToken={adminToken} />
      case 'credits':
        return <CreditsTab adminToken={adminToken} />
      case 'social':
        return <SocialTab adminToken={adminToken} />
      case 'marketplace':
        return <MarketplaceTab adminToken={adminToken} />
      case 'outcomes':
        return <OutcomesTab adminToken={adminToken} />
      case 'whitelabel':
        return <WhiteLabelTab adminToken={adminToken} />
      case 'analytics':
        return <AnalyticsTab adminToken={adminToken} />
      case 'commerce':
        return <CommerceTab />
      case 'consulting':
        return <ConsultingTab adminToken={adminToken} />
      case 'api_access':
        return <ApiAccessTab adminToken={adminToken} />
      case 'auto_engage':
        return <AutoEngageTab adminToken={adminToken} />
      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Revenue Hub</h1>
          <p className="text-sm text-slate-400 mt-1">All {TABS.length - 1} revenue streams — Prosuite NG+</p>
        </div>
        <div className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-slate-300">
          {TABS.length - 1} Revenue Features
        </div>
      </div>

      <div className="flex gap-1 bg-white/5 border border-white/10 rounded-2xl p-1 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-[#FF6B35] text-white shadow-lg shadow-[#FF6B35]/20'
                : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
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
