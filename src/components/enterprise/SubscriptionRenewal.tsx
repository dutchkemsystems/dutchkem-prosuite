import { useState } from 'react'
import { useAction } from 'convex/react'
import { api } from '../../../convex/_generated/api'

const PLANS = [
  { id: 'growth' as const, name: 'Growth', price: 25000, features: ['5 agents', 'Basic analytics', 'Email support'] },
  { id: 'professional' as const, name: 'Professional', price: 75000, features: ['15 agents', 'Advanced analytics', 'Priority support', 'Custom workflows'] },
  { id: 'enterprise' as const, name: 'Enterprise', price: 250000, features: ['Unlimited agents', 'Full analytics', 'Dedicated support', 'Custom integrations', 'White-label'] },
]

export function SubscriptionRenewal({ org, token }: { org: any; token: string }) {
  const initiatePayment = useAction(api.enterprise_payments.initiateSubscriptionPayment)
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)

  const daysLeft = org.subscriptionEndsAt
    ? Math.max(0, Math.ceil((org.subscriptionEndsAt - Date.now()) / (1000 * 60 * 60 * 24)))
    : null

  const isExpired = daysLeft !== null && daysLeft === 0
  const isExpiring = daysLeft !== null && daysLeft <= 7 && daysLeft > 0

  const handleRenew = async (planId: string) => {
    setSelectedPlan(planId)
    setLoading(true)
    setToast(null)
    try {
      const result = await initiatePayment({
        plan: planId as any,
        paymentMethod: 'card',
        token,
        returnUrl: `${window.location.origin}/enterprise/dashboard?payment=success`,
      })
      if (result.checkoutUrl) {
        window.open(result.checkoutUrl, '_blank')
        setToast({ type: 'success', msg: `Payment window opened for ${planId} plan. Complete payment to activate.` })
      } else {
        setToast({ type: 'error', msg: result.error || 'Failed to initialize payment' })
      }
    } catch (err: any) {
      setToast({ type: 'error', msg: err.message || 'Payment failed' })
    }
    setLoading(false)
  }

  return (
    <div className="space-y-6">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-2xl shadow-2xl font-bold text-sm ${toast.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'}`}>
          {toast.msg}
        </div>
      )}

      {/* Current Subscription Status */}
      <div className={`p-6 rounded-2xl border ${
        isExpired ? 'bg-red-500/10 border-red-500/30' :
        isExpiring ? 'bg-amber-500/10 border-amber-500/30' :
        'bg-emerald-500/10 border-emerald-500/30'
      }`}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-black text-white capitalize">{org.plan || 'Free'} Plan</h3>
            <p className="text-sm text-slate-400 mt-1">
              {isExpired ? 'Your subscription has expired' :
               isExpiring ? `Expires in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}` :
               daysLeft !== null ? `${daysLeft} days remaining` : 'Active'}
            </p>
          </div>
          <div className={`px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest ${
            isExpired ? 'bg-red-500/20 text-red-400' :
            isExpiring ? 'bg-amber-500/20 text-amber-400' :
            'bg-emerald-500/20 text-emerald-400'
          }`}>
            {isExpired ? 'Expired' : isExpiring ? 'Expiring Soon' : 'Active'}
          </div>
        </div>
      </div>

      {/* Renewal Plans */}
      <div>
        <h3 className="text-xl font-black text-white mb-2">Renew Your Subscription</h3>
        <p className="text-sm text-slate-400">Choose a plan to continue using enterprise features. Payment goes to Dutchkem Ventures via Kora Pay.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {PLANS.map((plan) => {
          const isCurrent = org.plan === plan.id
          const isSelected = selectedPlan === plan.id
          return (
            <div
              key={plan.id}
              className={`relative p-0.5 rounded-3xl transition-all duration-300 ${
                isCurrent ? 'bg-gradient-to-br from-orange-500 to-orange-600 shadow-[0_20px_60px_rgba(255,107,53,0.3)]' :
                'bg-slate-700 hover:bg-slate-600'
              }`}
            >
              {isCurrent && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-orange-500 text-white text-[10px] font-black uppercase tracking-widest rounded-full">
                  Current Plan
                </div>
              )}
              <div className="bg-slate-900 p-8 rounded-[2.5rem] h-full flex flex-col">
                <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest">{plan.name}</h4>
                <div className="flex items-baseline gap-1 mt-4 mb-6">
                  <span className="text-lg font-black text-slate-500">₦</span>
                  <span className="text-4xl font-black text-white">{plan.price.toLocaleString()}</span>
                  <span className="text-xs font-black text-slate-500">/month</span>
                </div>
                <ul className="space-y-3 mb-8 flex-grow">
                  {plan.features.map((f, i) => (
                    <li key={i} className="flex items-center gap-3 text-sm text-slate-300">
                      <span className="w-5 h-5 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center text-[10px]">✓</span>
                      {f}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => handleRenew(plan.id)}
                  disabled={loading || isCurrent}
                  className={`w-full py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all ${
                    isCurrent
                      ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                      : isSelected && loading
                      ? 'bg-orange-500/50 text-white cursor-wait'
                      : 'bg-slate-800 text-white hover:bg-orange-500 active:scale-95'
                  }`}
                >
                  {isCurrent ? 'Current Plan' : isSelected && loading ? 'Processing...' : isExpired ? 'Renew Now' : 'Switch & Pay'}
                </button>
              </div>
            </div>
          )
        })}
      </div>

      <div className="text-center text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-4">
        Payments processed securely via Kora Pay • Funds route to Dutchkem Ventures wallet • Auto-sweep to designated account
      </div>
    </div>
  )
}
