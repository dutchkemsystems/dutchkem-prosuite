import { useState } from 'react'
import { useQuery, useMutation, useAction } from 'convex/react'
import { api } from '../../../convex/_generated/api'

type ClientWhatsAppProps = {
  userId: string
  userEmail?: string
}

export function ClientWhatsApp({ userId, userEmail }: ClientWhatsAppProps) {
  const [activeSection, setActiveSection] = useState<'overview' | 'messaging' | 'contacts' | 'settings' | 'plans'>('overview')
  const [toast, setToast] = useState<{ type: string; msg: string } | null>(null)
  const [messageForm, setMessageForm] = useState({ to: '', message: '', type: 'transactional' as string })
  const [purchasing, setPurchasing] = useState<string | null>(null)
  const [phoneNumber, setPhoneNumber] = useState('')

  const subscriptions: any = useQuery(api.whatsapp_dual.getSubscriptions, { systemType: 'admin' })
  const tiers: any = useQuery(api.whatsapp_dual.getPricingTiers, { clientType: 'individual' })
  const usageLogs: any = useQuery(api.whatsapp_dual.getUsageLogs, { userId })

  const initiatePayment = useAction(api.kora_checkout.initiateWhatsAppSubscription)

  const userSub = subscriptions?.find((s: any) => s.userId === userId && s.status === 'active')
  const activeTier = userSub ? tiers?.find((t: any) => t._id === userSub.tierId) : null

  const showToast = (type: string, msg: string) => {
    setToast({ type, msg })
    setTimeout(() => setToast(null), 4000)
  }

  const handleSubscribe = async (tierId: string) => {
    if (!phoneNumber || phoneNumber.length < 10) {
      showToast('error', 'Please enter a valid phone number (e.g. 2348012345678)')
      return
    }

    setPurchasing(tierId)
    try {
      const result = await initiatePayment({
        userId,
        tierId,
        systemType: 'admin',
        phoneNumber: phoneNumber.replace(/[^0-9]/g, ''),
        email: userEmail || 'client@dutchkem.com',
      })

      if (result.success) {
        if (result.reference === 'FREE_TIER') {
          showToast('success', 'Free tier activated! You can now send messages.')
        } else if (result.checkoutUrl) {
          window.open(result.checkoutUrl, '_blank')
          showToast('success', 'Payment page opened. Complete payment to activate WhatsApp.')
        }
      } else {
        showToast('error', result.error || 'Payment failed')
      }
    } catch (e: any) {
      showToast('error', e.message || 'Payment error')
    } finally {
      setPurchasing(null)
    }
  }

  const sections = [
    { id: 'overview' as const, label: 'Overview', icon: '📊' },
    ...(userSub ? [{ id: 'messaging' as const, label: 'Messaging', icon: '💬' }] : []),
    ...(userSub ? [{ id: 'contacts' as const, label: 'Contacts', icon: '👥' }] : []),
    { id: 'plans' as const, label: userSub ? 'Upgrade Plan' : 'Plans', icon: '💳' },
    ...(userSub ? [{ id: 'settings' as const, label: 'Settings', icon: '⚙️' }] : []),
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black">📱 WhatsApp Integration</h2>
          {userSub ? (
            <p className="text-xs text-slate-400 mt-1">Tier: {activeTier?.name} • {userSub.messagesUsed}/{userSub.messagesLimit} messages used</p>
          ) : (
            <p className="text-xs text-slate-400 mt-1">Select a plan to activate WhatsApp messaging</p>
          )}
        </div>
        {userSub && (
          <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 rounded-full text-xs font-bold">🟢 Active</span>
        )}
      </div>

      {userSub && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <div className="flex justify-between text-xs mb-2">
            <span className="text-slate-400">Messages Used</span>
            <span className="text-white font-bold">{userSub.messagesUsed} / {userSub.messagesLimit}</span>
          </div>
          <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all" style={{
              width: `${Math.min((userSub.messagesUsed / userSub.messagesLimit) * 100, 100)}%`,
              backgroundColor: (userSub.messagesUsed / userSub.messagesLimit) > 90 ? '#ef4444' : (userSub.messagesUsed / userSub.messagesLimit) > 70 ? '#f59e0b' : '#10b981',
            }} />
          </div>
        </div>
      )}

      <div className="flex gap-1 bg-slate-800 rounded-xl p-1">
        {sections.map(s => (
          <button key={s.id} onClick={() => setActiveSection(s.id)}
            className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all ${
              activeSection === s.id ? 'bg-orange-500 text-white' : 'text-slate-400 hover:text-white'
            }`}>
            {s.icon} {s.label}
          </button>
        ))}
      </div>

      {activeSection === 'overview' && (
        <div className="space-y-4">
          {userSub ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
                  <p className="text-2xl font-black text-emerald-400">{userSub.messagesUsed}</p>
                  <p className="text-[10px] text-slate-500 uppercase">Messages Sent</p>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
                  <p className="text-2xl font-black text-white">{userSub.messagesLimit - userSub.messagesUsed}</p>
                  <p className="text-[10px] text-slate-500 uppercase">Remaining</p>
                </div>
              </div>
              <div className="bg-blue-500/5 border border-blue-500/20 rounded-2xl p-4">
                <p className="text-sm font-bold text-blue-400">Your Plan: {activeTier?.name}</p>
                <p className="text-xs text-slate-400 mt-1">₦{activeTier?.priceNgn.toLocaleString()}/mo • {activeTier?.messagesPerMonth.toLocaleString()} messages • {activeTier?.agentLimit} agents</p>
              </div>
              <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-4">
                <p className="text-sm font-bold text-emerald-400">💬 Customer Support Chat</p>
                <p className="text-xs text-slate-400 mt-1">Send and receive messages with AI-powered support. All messaging features are active on your {activeTier?.name} plan.</p>
                <button onClick={() => setActiveSection('messaging')}
                  className="mt-3 px-4 py-2 bg-emerald-500 text-white rounded-xl text-xs font-bold hover:bg-emerald-600 transition-all">
                  Open Chat →
                </button>
              </div>
            </>
          ) : (
            <div className="space-y-4">
              <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border border-emerald-500/20 rounded-2xl p-6">
                <p className="text-lg font-bold text-white mb-2">Activate WhatsApp Messaging</p>
                <p className="text-sm text-slate-400">Choose a plan to start sending and receiving messages via WhatsApp.</p>
              </div>
              <div className="bg-blue-500/5 border border-blue-500/20 rounded-2xl p-4 flex items-start gap-3">
                <span className="text-xl">💡</span>
                <div>
                  <p className="text-sm font-bold text-blue-400">How it works</p>
                  <p className="text-xs text-slate-400 mt-1">1. Select a plan → 2. Pay via Kora Pay → 3. Start messaging your contacts</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeSection === 'messaging' && userSub && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <h3 className="font-bold text-sm mb-3">💬 Send Message</h3>
            <input type="tel" placeholder="Phone number (e.g. 2348012345678)" value={messageForm.to}
              onChange={(e) => setMessageForm({ ...messageForm, to: e.target.value })}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white mb-3" />
            <textarea placeholder="Type your message..." value={messageForm.message} rows={3}
              onChange={(e) => setMessageForm({ ...messageForm, message: e.target.value })}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white mb-3" />
            <select value={messageForm.type} onChange={(e) => setMessageForm({ ...messageForm, type: e.target.value })}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white mb-3">
              <option value="transactional">Transactional (₦5/msg)</option>
              <option value="support">Support (₦2/msg)</option>
              <option value="marketing">Marketing (₦10/msg)</option>
            </select>
            <button className="w-full bg-orange-500 text-white py-3 rounded-xl font-bold text-sm">📤 Send Message</button>
          </div>
        </div>
      )}

      {activeSection === 'contacts' && userSub && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <h3 className="font-bold text-sm mb-3">👥 Your Contacts</h3>
          <p className="text-xs text-slate-400">Contacts are synced from your WhatsApp account.</p>
        </div>
      )}

      {activeSection === 'plans' && (
        <div className="space-y-4">
          <h3 className="font-black">{userSub ? '🔄 Upgrade or Change Plan' : '💳 Choose a Plan'}</h3>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
            <label className="text-[10px] uppercase font-black text-slate-500 tracking-[0.3em] mb-2 block">Your WhatsApp Number</label>
            <input type="tel" placeholder="e.g. 2348012345678" value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white" />
            <p className="text-[10px] text-slate-500 mt-1">Include country code (234 for Nigeria)</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {tiers?.filter((t: any) => t.clientType === 'individual' && t.isActive).map((tier: any) => {
              const isCurrent = activeTier?._id === tier._id
              return (
                <div key={tier._id} className={`rounded-2xl border-l-4 p-5 transition-all ${
                  isCurrent ? 'bg-orange-500/10 border-l-orange-500 ring-1 ring-orange-500/30' :
                  tier.priceNgn === 0 ? 'bg-slate-800 border-l-emerald-500' : 'bg-slate-900 border-l-orange-500 hover:border-l-orange-400'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-black text-white">{tier.name}</span>
                    <div className="flex gap-1">
                      {isCurrent && (
                        <span className="px-2 py-0.5 bg-orange-500/10 text-orange-400 rounded-full text-[10px] font-bold">CURRENT</span>
                      )}
                      {tier.priceNgn === 0 && (
                        <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded-full text-[10px] font-bold">FREE</span>
                      )}
                    </div>
                  </div>
                  <p className="text-3xl font-black text-emerald-400">
                    {tier.priceNgn === 0 ? 'Free' : `₦${tier.priceNgn.toLocaleString()}`}
                    {tier.priceNgn > 0 && <span className="text-xs text-slate-500">/mo</span>}
                  </p>
                  <p className="text-xs text-slate-400 mt-2">{tier.messagesPerMonth.toLocaleString()} messages/month</p>
                  <p className="text-xs text-slate-400">{tier.agentLimit} agent{tier.agentLimit > 1 ? 's' : ''}</p>
                  <div className="flex flex-wrap gap-1 mt-3">
                    {tier.features.map((f: string) => (
                      <span key={f} className="px-2 py-0.5 bg-slate-700 rounded text-[10px] text-slate-300">{f}</span>
                    ))}
                  </div>
                  <button
                    onClick={() => handleSubscribe(tier._id)}
                    disabled={purchasing === tier._id || isCurrent}
                    className={`w-full mt-4 py-3 rounded-xl font-bold text-sm transition-all ${
                      isCurrent ? 'bg-slate-700 text-slate-500 cursor-not-allowed' :
                      tier.priceNgn === 0
                        ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                        : 'bg-orange-500 text-white hover:bg-orange-600'
                    } disabled:opacity-50`}>
                    {isCurrent ? '✅ Current Plan' : purchasing === tier._id ? '⏳ Processing...' : tier.priceNgn === 0 ? '✅ Activate Free' : `💳 Subscribe ₦${tier.priceNgn.toLocaleString()}`}
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {activeSection === 'settings' && userSub && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <h3 className="font-bold text-sm mb-3">⚙️ WhatsApp Settings</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-400">Auto-renew</span>
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${userSub.autoRenew ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                {userSub.autoRenew ? 'ON' : 'OFF'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-400">Phone Number</span>
              <span className="text-sm text-white font-bold">{userSub.phoneNumber}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-400">Expires</span>
              <span className="text-sm text-white">{new Date(userSub.endDate).toLocaleDateString()}</span>
            </div>
          </div>
        </div>
      )}

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
