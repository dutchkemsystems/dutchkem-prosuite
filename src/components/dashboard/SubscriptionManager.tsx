import { useState } from 'react'
import { useQuery, useAction } from 'convex/react'
import { api } from '../../../convex/_generated/api'

function formatNgN(amount: number): string {
  return `₦${amount.toLocaleString()}`
}

export function SubscriptionManager({ userId, email }: { userId: string; email?: string }) {
  const plans = useQuery(api.revenue_growth.getSubscriptionPlans)
  const userCredits = useQuery(api.revenue_credits.getCreditBalance, userId ? { userId } : 'skip')
  const initiateSubscription = useAction(api.kora_checkout.initiateSubscriptionPurchase)
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null)
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly')
  const [isProcessing, setIsProcessing] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  // Check actual subscription status from credits table
  const currentPlan = userCredits?.plan || null

  const handleUpgrade = async (planId: string) => {
    if (!email) {
      setToast('Email required for payment')
      setTimeout(() => setToast(null), 3000)
      return
    }
    setIsProcessing(true)
    try {
      const result = await initiateSubscription({ userId, planId, billingCycle, email })
      if (result.success && result.checkoutUrl) {
        window.open(result.checkoutUrl, '_blank')
        setToast('Payment window opened. Complete payment to activate your plan.')
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

  return (
    <div className="space-y-6">
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-emerald-500/90 text-white px-5 py-3 rounded-xl shadow-lg text-sm font-medium">
          ✓ {toast}
        </div>
      )}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-white">My Subscription</h2>
          <p className="text-sm text-slate-400 mt-1">Manage your plan and billing</p>
        </div>
        <div className={`px-4 py-2 rounded-xl ${currentPlan ? 'bg-orange-500/10 border border-orange-500/20' : 'bg-slate-700/50 border border-slate-600'}`}>
          <span className={`font-bold text-sm ${currentPlan ? 'text-orange-400' : 'text-slate-400'}`}>
            {currentPlan ? `${currentPlan} Plan` : 'No Active Plan'}
          </span>
        </div>
      </div>

      {/* Current Plan Status */}
      <div className="bg-gradient-to-br from-orange-500/10 to-orange-600/5 border border-orange-500/20 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-white">Current Plan</h3>
            <p className="text-sm text-slate-400">{currentPlan ? 'Your active subscription' : 'Subscribe to get started'}</p>
          </div>
          <span className="text-3xl font-black text-orange-500 capitalize">{currentPlan || 'None'}</span>
        </div>
        <div className="grid grid-cols-3 gap-4 mt-4">
          <div className="bg-white/5 rounded-xl p-4 text-center">
            <div className="text-2xl font-black text-white">{userCredits?.balance ?? 0}</div>
            <div className="text-xs text-slate-400 mt-1">Credits Balance</div>
          </div>
          <div className="bg-white/5 rounded-xl p-4 text-center">
            <div className="text-2xl font-black text-white">{userCredits?.lifetimeUsed ?? 0}</div>
            <div className="text-xs text-slate-400 mt-1">Credits Used</div>
          </div>
          <div className="bg-white/5 rounded-xl p-4 text-center">
            <div className="text-2xl font-black text-white">{userCredits?.lifetimePurchased ?? 0}</div>
            <div className="text-xs text-slate-400 mt-1">Total Purchased</div>
          </div>
        </div>
      </div>

      {/* Billing Toggle */}
      <div className="flex items-center justify-center gap-4">
        <span className={`text-sm font-medium ${billingCycle === 'monthly' ? 'text-white' : 'text-slate-400'}`}>Monthly</span>
        <button
          onClick={() => setBillingCycle(billingCycle === 'monthly' ? 'annual' : 'monthly')}
          className={`w-14 h-7 rounded-full transition-colors ${billingCycle === 'annual' ? 'bg-orange-500' : 'bg-slate-700'}`}
        >
          <div className={`w-5 h-5 bg-white rounded-full transition-transform ${billingCycle === 'annual' ? 'translate-x-8' : 'translate-x-1'}`} />
        </button>
        <span className={`text-sm font-medium ${billingCycle === 'annual' ? 'text-white' : 'text-slate-400'}`}>
          Annual <span className="text-emerald-400 text-xs">(Save 20%)</span>
        </span>
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {(plans ?? []).map((plan: any) => {
          const price = billingCycle === 'annual' ? plan.annualPriceNgn : plan.monthlyPriceNgn
          const isCurrent = currentPlan === plan.planId
          const isPopular = plan.planId === 'pro'

          return (
            <div
              key={plan.planId}
              className={`relative bg-white/5 border rounded-2xl p-6 transition-all hover:scale-[1.02] ${
                isCurrent ? 'border-orange-500/50 bg-orange-500/5' : 'border-white/10 hover:border-white/20'
              } ${isPopular ? 'ring-2 ring-orange-500/30' : ''}`}
            >
              {isPopular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-orange-500 text-white text-xs font-black rounded-full uppercase tracking-wider">
                  Popular
                </div>
              )}
              {isCurrent && (
                <div className="absolute top-4 right-4 px-3 py-1 bg-emerald-500/20 text-emerald-400 text-xs font-bold rounded-full">
                  Current
                </div>
              )}

              <h3 className="text-xl font-bold text-white mb-2">{plan.name}</h3>
              <p className="text-sm text-slate-400 mb-4">{plan.description}</p>

              <div className="mb-6">
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-black text-white">{formatNgN(price)}</span>
                  <span className="text-sm text-slate-400">/{billingCycle === 'annual' ? 'year' : 'mo'}</span>
                </div>
                {billingCycle === 'annual' && (
                  <p className="text-xs text-emerald-400 mt-1">
                    Save {plan.annualDiscountPercent}% ({formatNgN(plan.monthlyPriceNgn * 12 - plan.annualPriceNgn)})
                  </p>
                )}
              </div>

              <div className="space-y-3 mb-6">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">Credits</span>
                  <span className="text-white font-bold">{plan.creditsIncluded.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">Messages/Month</span>
                  <span className="text-white font-bold">{plan.messageLimitMonthly === -1 ? 'Unlimited' : plan.messageLimitMonthly}</span>
                </div>
              </div>

              <div className="space-y-2 mb-6">
                {(plan.features ?? []).map((f: string, i: number) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-slate-300">
                    <span className="text-emerald-400">✓</span>
                    <span>{f}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={() => handleUpgrade(plan.planId)}
                className={`w-full py-3 rounded-xl font-bold text-sm transition-all ${
                  isCurrent
                    ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                    : 'bg-orange-500 hover:bg-orange-600 text-white'
                }`}
                disabled={isCurrent || isProcessing}
              >
                {isCurrent ? 'Current Plan' : isProcessing ? 'Processing...' : (currentPlan ? 'Upgrade' : 'Subscribe Now')}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
