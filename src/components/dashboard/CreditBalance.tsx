import { useState, useEffect } from 'react'
import { useConvex, useMutation, useAction } from 'convex/react'
import { api } from '../../../convex/_generated/api'

function formatNgN(amount: number): string {
  return `₦${amount.toLocaleString()}`
}

export function CreditBalance({ userId, email }: { userId: string; email?: string }) {
  const convex = useConvex()
  const [credits, setCredits] = useState<any>(undefined)
  const [expiryConfig, setExpiryConfig] = useState<any>(undefined)
  const [expiringCredits, setExpiringCredits] = useState<any>(undefined)
  const [transactions, setTransactions] = useState<any>(undefined)
  const initiatePurchase = useAction(api.kora_checkout.initiateCreditPurchase)
  const setAutoRecharge = useMutation(api.revenue_credits.setAutoRecharge)

  useEffect(() => {
    if (userId) convex.query(api.revenue_credits.getCreditBalance, { userId }).then(setCredits).catch(() => {})
  }, [userId])
  useEffect(() => {
    convex.query(api.revenue_growth.getCreditExpiryConfig, {}).then(setExpiryConfig).catch(() => {})
  }, [])
  useEffect(() => {
    if (userId) convex.query(api.revenue_growth.getExpiringCredits, { userId }).then(setExpiringCredits).catch(() => {})
  }, [userId])
  useEffect(() => {
    if (userId) convex.query(api.revenue_credits.getCreditTransactions, { userId, limit: 10 }).then(setTransactions).catch(() => {})
  }, [userId])

  const [showPurchase, setShowPurchase] = useState(false)
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [showAutoRechargeSettings, setShowAutoRechargeSettings] = useState(false)
  const [autoRechargeThreshold, setAutoRechargeThreshold] = useState(credits?.autoRechargeThreshold ?? 50)
  const [autoRechargeAmount, setAutoRechargeAmount] = useState(credits?.autoRechargeAmount ?? 500)

  if (credits === undefined) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div><h2 className="text-2xl font-black text-white">Credit Balance</h2></div>
        </div>
        <div className="bg-gradient-to-br from-orange-500/10 to-orange-600/5 border border-orange-500/20 rounded-2xl p-6">
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-white/10 rounded w-32"></div>
            <div className="h-10 bg-white/10 rounded w-48"></div>
          </div>
        </div>
      </div>
    )
  }

  const packages = [
    { id: 'starter', credits: 1000, price: 1000, label: 'Starter', icon: '🚀' },
    { id: 'basic', credits: 5000, price: 5000, label: 'Basic', icon: '⚡' },
    { id: 'standard', credits: 8000, price: 8000, label: 'Standard', icon: '📦' },
    { id: 'pro', credits: 15000, price: 15000, label: 'Pro', icon: '💎' },
    { id: 'premium', credits: 35000, price: 35000, label: 'Premium', icon: '👑' },
    { id: 'enterprise', credits: 100000, price: 100000, label: 'Enterprise', icon: '🏢' },
  ]

  const handlePurchase = async () => {
    if (!selectedPackage || !email) return
    setIsProcessing(true)
    try {
      const result = await initiatePurchase({ userId, packageId: selectedPackage, email })
      if (result.success && result.checkoutUrl) {
        window.open(result.checkoutUrl, '_blank')
        setToast('Payment window opened. Complete payment to receive credits.')
        setTimeout(() => setToast(null), 5000)
      } else {
        setToast(result.error || 'Payment failed')
        setTimeout(() => setToast(null), 5000)
      }
    } catch (err: any) {
      setToast(err.message || 'Payment failed')
      setTimeout(() => setToast(null), 5000)
    }
    setIsProcessing(false)
  }

  const balance = credits?.balance ?? 0
  const expiringAmount = expiringCredits?.totalExpiring ?? 0

  return (
    <div className="space-y-6">
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-emerald-500/90 text-white px-5 py-3 rounded-xl shadow-lg text-sm font-medium">
          ✓ {toast}
        </div>
      )}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-white">Credit Balance</h2>
          <p className="text-sm text-slate-400 mt-1">Purchase and manage your credits</p>
        </div>
        <button
          onClick={() => setShowPurchase(!showPurchase)}
          className="px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold text-sm transition-all"
        >
          + Purchase Credits
        </button>
      </div>

      {/* Balance Card */}
      <div className="bg-gradient-to-br from-orange-500/10 to-orange-600/5 border border-orange-500/20 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm text-slate-400">Available Balance</p>
            <p className="text-5xl font-black text-white mt-1">{balance.toLocaleString()}</p>
            <p className="text-sm text-slate-400 mt-1">credits</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-slate-400">Lifetime Used</p>
            <p className="text-2xl font-black text-slate-300 mt-1">{(credits?.lifetimeUsed ?? 0).toLocaleString()}</p>
          </div>
        </div>

        {/* Expiry Warning */}
        {expiryConfig?.enabled && expiringAmount > 0 && (
          <div className="mt-4 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
            <div className="flex items-center gap-3">
              <span className="text-2xl">⚠️</span>
              <div>
                <p className="text-amber-400 font-bold text-sm">Credits Expiring Soon</p>
                <p className="text-amber-300/70 text-xs mt-1">
                  {expiringAmount.toLocaleString()} credits will expire in {expiryConfig.warningDays} days
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Auto-Recharge */}
        <div className="mt-4 p-4 bg-white/5 rounded-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white font-bold text-sm">Auto-Recharge</p>
              <p className="text-slate-400 text-xs mt-1">
                {credits?.autoRechargeEnabled ? 'Enabled' : 'Disabled'} — 
                {credits?.autoRechargeEnabled ? ` Recharge ${credits.autoRechargeAmount} credits when balance drops below ${credits.autoRechargeThreshold}` : ' Enable to never run out of credits'}
              </p>
            </div>
            <button
              onClick={async () => {
                try {
                  await setAutoRecharge({
                    userId,
                    enabled: !credits?.autoRechargeEnabled,
                    threshold: credits?.autoRechargeThreshold ?? 50,
                    amount: credits?.autoRechargeAmount ?? 500,
                  })
                  setToast(credits?.autoRechargeEnabled ? 'Auto-recharge disabled' : 'Auto-recharge enabled')
                  setTimeout(() => setToast(null), 3000)
                } catch (err: any) {
                  setToast(err.message || 'Failed to update')
                  setTimeout(() => setToast(null), 3000)
                }
              }}
              className={`w-12 h-6 rounded-full transition-colors ${credits?.autoRechargeEnabled ? 'bg-orange-500' : 'bg-slate-700'}`}
            >
              <div className={`w-5 h-5 bg-white rounded-full transition-transform ${credits?.autoRechargeEnabled ? 'translate-x-6' : 'translate-x-0.5'}`} />
            </button>
          </div>
          
          {/* Auto-Recharge Settings Toggle */}
          {credits?.autoRechargeEnabled && (
            <div className="mt-3">
              <button
                onClick={() => setShowAutoRechargeSettings(!showAutoRechargeSettings)}
                className="text-xs text-orange-400 hover:text-orange-300 font-medium"
              >
                {showAutoRechargeSettings ? 'Hide Settings' : 'Configure Settings'}
              </button>
              
              {showAutoRechargeSettings && (
                <div className="mt-3 space-y-3 p-3 bg-white/5 rounded-xl">
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">Recharge when balance below</label>
                    <input
                      type="number"
                      value={autoRechargeThreshold}
                      onChange={(e) => setAutoRechargeThreshold(Number(e.target.value))}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">Recharge amount (credits)</label>
                    <input
                      type="number"
                      value={autoRechargeAmount}
                      onChange={(e) => setAutoRechargeAmount(Number(e.target.value))}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
                    />
                  </div>
                  <button
                    onClick={async () => {
                      try {
                        await setAutoRecharge({
                          userId,
                          enabled: true,
                          threshold: autoRechargeThreshold,
                          amount: autoRechargeAmount,
                        })
                        setToast('Auto-recharge settings saved')
                        setTimeout(() => setToast(null), 3000)
                      } catch (err: any) {
                        setToast(err.message || 'Failed to save')
                        setTimeout(() => setToast(null), 3000)
                      }
                    }}
                    className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-medium transition-all"
                  >
                    Save Settings
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Purchase Modal */}
      {showPurchase && (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <h3 className="text-lg font-bold text-white mb-4">Purchase Credits</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {packages.map((pkg) => (
              <button
                key={pkg.id}
                onClick={() => setSelectedPackage(pkg.id)}
                className={`p-4 rounded-xl border transition-all text-left ${
                  selectedPackage === pkg.id
                    ? 'border-orange-500 bg-orange-500/10'
                    : 'border-white/10 hover:border-white/20'
                }`}
              >
                <span className="text-2xl">{pkg.icon}</span>
                <div className="mt-2">
                  <p className="text-white font-bold">{pkg.label}</p>
                  <p className="text-orange-400 font-black">{formatNgN(pkg.price)}</p>
                  <p className="text-xs text-slate-400">{pkg.credits.toLocaleString()} credits</p>
                </div>
              </button>
            ))}
          </div>
          <div className="mt-4 flex gap-3">
            <button
              onClick={handlePurchase}
              disabled={!selectedPackage || isProcessing}
              className="px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold text-sm transition-all disabled:opacity-50"
            >
              {isProcessing ? 'Processing...' : 'Pay with Kora Pay'}
            </button>
            <button
              onClick={() => { setShowPurchase(false); setSelectedPackage(null) }}
              className="px-6 py-3 bg-white/5 hover:bg-white/10 text-slate-300 rounded-xl font-bold text-sm transition-all"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Recent Transactions */}
      <div>
        <h3 className="text-lg font-bold text-white mb-3">Recent Transactions</h3>
        <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
          <div className="grid grid-cols-[1fr_auto_auto_auto] px-5 py-3 border-b border-white/5 text-sm text-slate-400 font-medium">
            <div>Type</div>
            <div>Amount</div>
            <div>Balance</div>
            <div>Date</div>
          </div>
          {(transactions ?? []).map((t: any, i: number) => (
            <div key={t._id ?? i} className="grid grid-cols-[1fr_auto_auto_auto] px-5 py-3 border-b border-white/5 hover:bg-white/5 transition-colors text-sm">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${t.amount > 0 ? 'bg-emerald-400' : 'bg-red-400'}`} />
                <span className="text-white capitalize">{t.transactionType}</span>
              </div>
              <div className={t.amount > 0 ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'}>
                {t.amount > 0 ? '+' : ''}{t.amount.toLocaleString()}
              </div>
              <div className="text-slate-300">{t.balanceAfter?.toLocaleString() ?? '—'}</div>
              <div className="text-slate-400">{t.createdAt ? new Date(t.createdAt).toLocaleDateString() : '—'}</div>
            </div>
          ))}
          {(!transactions || transactions.length === 0) && (
            <div className="px-5 py-8 text-center text-slate-500 text-sm">No transactions yet</div>
          )}
        </div>
      </div>
    </div>
  )
}
