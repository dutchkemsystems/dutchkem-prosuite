import { useState } from 'react'
import { Link } from '@tanstack/react-router'

const plans = [
  {
    name: 'Growth',
    price: '25,000',
    period: '/month',
    description: 'Perfect for startups scaling with AI',
    features: [
      'All 15 Expert Agents',
      'Agent Marketplace Access',
      'Knowledge Graph (Basic)',
      'Companion Agent (1 user)',
      '10,000 API calls/month',
      'Email Support',
      'Standard Analytics',
    ],
    cta: 'Start Growth Plan',
    featured: false,
  },
  {
    name: 'Enterprise',
    price: '80,000',
    period: '/month',
    description: 'For teams that need full agentic power',
    features: [
      'Everything in Growth',
      'Multi-Agent Orchestration',
      'Agentic Payments (₦5M limit)',
      'Emotional AI & Memory',
      'Knowledge Graph (Advanced)',
      'Companion Agent (10 users)',
      '100,000 API calls/month',
      'Priority 24/7 Support',
      'Custom Agent Builder',
      'White-label Dashboard',
    ],
    cta: 'Start Enterprise',
    featured: true,
    savings: 'Most Popular',
  },
  {
    name: 'Scale',
    price: '200,000',
    period: '/month',
    description: 'Unlimited AI for large organizations',
    features: [
      'Everything in Enterprise',
      'Unlimited API Calls',
      'On-Premise Deployment',
      'Dedicated Success Manager',
      'Custom Model Fine-tuning',
      'SSO & SAML Integration',
      'SLA 99.99% Uptime',
      'White-glove Onboarding',
      'Unlimited Companion Agents',
      'Custom Integrations',
    ],
    cta: 'Contact Sales',
    featured: false,
  },
]

export function EnterprisePricing() {
  const [annual, setAnnual] = useState(false)

  return (
    <section className="py-32 bg-white relative overflow-hidden">
      <div className="absolute top-0 right-0 w-96 h-96 bg-orange-100/30 blur-[100px] -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-100/20 blur-[100px] translate-y-1/2 -translate-x-1/2" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-20">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 border border-emerald-100 rounded-full text-[10px] font-black uppercase tracking-[0.3em] text-emerald-600 mb-8">
            Enterprise Pricing
          </div>
          <h2 className="text-4xl md:text-6xl font-black text-slate-950 mb-6 tracking-tighter">
            Scale Your <span className="bg-gradient-to-r from-orange-500 to-indigo-600 bg-clip-text text-transparent">AI Workforce</span>
          </h2>
          <p className="text-lg text-slate-500 max-w-2xl mx-auto font-medium">
            Choose the plan that matches your ambition. All plans include our core 15 expert agents.
          </p>

          {/* Annual toggle */}
          <div className="flex items-center justify-center gap-4 mt-10">
            <span className={`text-sm font-bold transition-colors ${!annual ? 'text-slate-950' : 'text-slate-400'}`}>Monthly</span>
            <button
              onClick={() => setAnnual(!annual)}
              className={`relative w-14 h-7 rounded-full transition-colors ${annual ? 'bg-orange-500' : 'bg-slate-300'}`}
            >
              <div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-transform shadow-lg ${annual ? 'translate-x-8' : 'translate-x-1'}`} />
            </button>
            <span className={`text-sm font-bold transition-colors ${annual ? 'text-slate-950' : 'text-slate-400'}`}>
              Annual <span className="text-[10px] font-black text-emerald-500 bg-emerald-50 px-2 py-1 rounded-full ml-1">SAVE 20%</span>
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
          {plans.map((plan, i) => {
            const monthlyPrice = parseInt(plan.price.replace(/,/g, ''))
            const displayPrice = annual ? Math.floor(monthlyPrice * 0.8) : monthlyPrice

            return (
              <div key={i} className={`relative rounded-[2.5rem] transition-all duration-500 hover:scale-[1.02] ${plan.featured ? 'bg-gradient-to-br from-orange-500 to-orange-600 p-1 shadow-[0_30px_100px_rgba(255,107,53,0.3)]' : 'bg-slate-200 p-1 hover:bg-slate-300'}`}>
                {plan.savings && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-6 py-2 bg-emerald-500 text-white text-[10px] font-black rounded-full shadow-2xl uppercase tracking-[0.2em] z-10">
                    {plan.savings}
                  </div>
                )}
                <div className="bg-white p-10 rounded-[2.4rem] h-full flex flex-col relative overflow-hidden">
                  {plan.featured && <div className="absolute top-0 left-0 w-full h-3 bg-gradient-to-r from-orange-500 to-orange-600" />}

                  <h3 className="text-[11px] font-black uppercase tracking-[0.5em] text-slate-300 mb-6">{plan.name}</h3>
                  <p className="text-sm text-slate-500 font-medium mb-8">{plan.description}</p>

                  <div className="flex items-baseline gap-1 mb-10">
                    <span className="text-2xl font-black text-slate-950">₦</span>
                    <span className="text-5xl font-black text-slate-950 tracking-tighter">{displayPrice.toLocaleString()}</span>
                    <span className="text-sm font-black text-slate-400">{plan.period}</span>
                  </div>

                  {annual && (
                    <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-6 -mt-4">
                      ₦{(displayPrice * 12).toLocaleString()}/year — Save ₦{((monthlyPrice - displayPrice) * 12).toLocaleString()}
                    </p>
                  )}

                  <div className="space-y-4 mb-10 flex-grow">
                    {plan.features.map((f, j) => (
                      <div key={j} className="flex items-start gap-3">
                        <span className="w-5 h-5 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-[10px] font-black flex-shrink-0 mt-0.5">✓</span>
                        <span className="text-sm text-slate-600 font-medium">{f}</span>
                      </div>
                    ))}
                  </div>

                  <Link to="/auth" className={`block w-full py-5 rounded-2xl font-black text-[11px] uppercase tracking-[0.3em] text-center transition-all shadow-lg ${
                    plan.featured
                      ? 'bg-slate-950 text-white hover:bg-black active:scale-95'
                      : 'bg-slate-100 text-slate-950 hover:bg-slate-200'
                  }`}>
                    {plan.cta}
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
