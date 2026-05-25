import { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, ArrowRight, Shield, Clock, CreditCard } from 'lucide-react';
import { bundlePackages, agents } from '../data/agents';

interface PricingPageProps {
  setCurrentPage: (page: string) => void;
}

export default function PricingPage({ setCurrentPage }: PricingPageProps) {
  const [activeTab, setActiveTab] = useState<'bundles' | 'individual'>('bundles');

  return (
    <section className="py-24 bg-cream min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <img src="/images/dutchkem-logo.png" alt="Dutchkem Ventures" className="w-20 h-20 object-contain mx-auto mb-4 drop-shadow-lg rounded-xl" />
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-navy">
            Invest in Results,<br /><span className="text-coral">Not Empty Promises</span>
          </h2>
          <p className="mt-4 text-navy/60 text-lg max-w-3xl mx-auto">
            Our prices are a fraction of what freelancers charge — with better quality, faster delivery, 
            and AI precision that humans can't match. Every service includes 2 free revisions, editable 
            downloads, and 24/7 support. No hidden fees. No surprises.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            {['✅ 2 Free Revisions', '✅ Editable Downloads', '✅ 24/7 AI Support', '✅ Plagiarism-Free', '✅ Money-Back Guarantee'].map((perk, i) => (
              <span key={i} className="px-3 py-1.5 bg-forest/10 text-forest text-sm font-medium rounded-full">{perk}</span>
            ))}
          </div>
        </motion.div>

        {/* Payment Info Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="max-w-xl mx-auto mb-12"
        >
          <div className="bg-gradient-to-br from-navy to-navy-dark rounded-3xl p-6 sm:p-8 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-40 h-40 bg-coral/10 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-40 h-40 bg-gold/10 rounded-full blur-3xl" />
            
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-4">
                <CreditCard size={20} className="text-gold" />
                <span className="font-semibold text-sm text-white/70 uppercase tracking-wider">Instant Secure Payment</span>
              </div>

              <div className="space-y-4">
                <p className="text-white/80 text-lg font-medium">Pay instantly. Agent starts automatically.</p>
                <div className="grid grid-cols-2 gap-3">
                  {['💳 Debit/Credit Card', '🏦 Bank Transfer', '📱 USSD', '💰 Mobile Money'].map((m, i) => (
                    <div key={i} className="bg-white/10 rounded-lg p-2 text-center text-xs text-white/70">{m}</div>
                  ))}
                </div>
                <div className="flex items-center gap-3 pt-2">
                  <Shield size={16} className="text-forest-light" />
                  <span className="text-xs text-white/40">Powered by Kora Pay • Bank-grade encryption • Auto-confirmation</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Tabs */}
        <div className="flex justify-center mb-8">
          <div className="bg-white rounded-xl p-1 border border-gray-100 flex">
            <button
              onClick={() => setActiveTab('bundles')}
              className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                activeTab === 'bundles' ? 'bg-navy text-white' : 'text-navy/60 hover:text-navy'
              }`}
            >
              🏛️ ServiceMart Bundles
            </button>
            <button
              onClick={() => setActiveTab('individual')}
              className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                activeTab === 'individual' ? 'bg-navy text-white' : 'text-navy/60 hover:text-navy'
              }`}
            >
              🤖 Individual Agents
            </button>
          </div>
        </div>

        {/* Bundles */}
        {activeTab === 'bundles' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="grid md:grid-cols-3 gap-6 mb-12">
              {bundlePackages.map((bundle, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className={`relative bg-white rounded-3xl overflow-hidden border-2 ${
                    i === 1 ? 'border-gold shadow-xl shadow-gold/10 scale-105' : 'border-gray-100'
                  }`}
                >
                  {i === 1 && (
                    <div className="bg-gradient-to-r from-gold to-gold-dark text-navy text-center py-1.5 text-xs font-bold uppercase tracking-wider">
                      ⭐ Most Popular
                    </div>
                  )}
                  <div className="p-6 sm:p-8">
                    <h3 className="font-display text-xl font-bold text-navy">{bundle.name}</h3>
                    <p className="text-navy/50 text-sm mt-1">{bundle.services}</p>
                    
                    <div className="mt-4">
                      <span className="font-display text-4xl font-bold text-navy">{bundle.price}</span>
                      <span className="text-navy/40 text-sm ml-1">flat</span>
                    </div>
                    
                    <div className="mt-3 inline-flex items-center gap-1 px-3 py-1 bg-forest/10 rounded-full text-forest text-sm font-medium">
                      <Check size={14} />
                      {bundle.savings}
                    </div>

                    <ul className="mt-6 space-y-3">
                      {[
                        'NIN/BVN FREE in bundle',
                        'Priority processing',
                        '10% loyalty discount (2nd+ purchase)',
                        '₦1,000 referral reward',
                        'Dedicated WhatsApp support',
                      ].slice(0, i === 2 ? 5 : i === 1 ? 4 : 3).map((item, j) => (
                        <li key={j} className="flex items-start gap-2 text-sm text-navy/70">
                          <Check size={16} className="text-forest shrink-0 mt-0.5" />
                          {item}
                        </li>
                      ))}
                    </ul>

                    <button
                      onClick={() => setCurrentPage('chat')}
                      className={`mt-6 w-full py-3.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 cursor-pointer transition-all ${
                        i === 1
                          ? 'bg-gradient-to-r from-gold to-gold-dark text-navy hover:shadow-lg hover:shadow-gold/30'
                          : 'bg-navy text-white hover:bg-navy-light'
                      }`}
                    >
                      Choose {bundle.name}
                      <ArrowRight size={16} />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* ServiceMart Services Table */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100">
              <h3 className="font-display text-xl font-bold text-navy mb-6">
                🏛️ ServiceMart NG — Professional Services
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-navy/10">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-navy/50 uppercase">#</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-navy/50 uppercase">Service</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-navy/50 uppercase">Price</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-navy/50 uppercase">Delivery</th>
                    </tr>
                  </thead>
                  <tbody>
                    {agents.find(a => a.id === 'A13')?.services.map((s, i) => (
                      <tr key={i} className="border-b border-navy/5 last:border-0 hover:bg-cream/50 transition-colors">
                        <td className="px-4 py-3 text-sm font-mono text-navy/40">{i + 1}</td>
                        <td className="px-4 py-3 text-sm font-medium text-navy">{s.name}</td>
                        <td className="px-4 py-3 text-right font-mono text-sm font-semibold text-coral">{s.price}</td>
                        <td className="px-4 py-3 text-right">
                          <span className="inline-flex items-center gap-1 text-xs text-navy/50">
                            <Clock size={12} />
                            {s.description}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}

        {/* Individual Agents Pricing */}
        {activeTab === 'individual' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {agents.filter(a => a.id !== 'A13').map((agent, i) => (
              <motion.div
                key={agent.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="bg-white rounded-2xl border border-gray-100 overflow-hidden"
              >
                <div className="p-5 flex items-center justify-between cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                      style={{ background: `${agent.color}15` }}
                    >
                      {agent.icon}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-navy/40">{agent.id}</span>
                        <h3 className="font-display font-bold text-navy">{agent.name}</h3>
                      </div>
                      <p className="text-sm text-navy/50">{agent.role}</p>
                    </div>
                  </div>
                  <span className="text-sm text-navy/40 font-mono">
                    {agent.services.length} services
                  </span>
                </div>
                <div className="px-5 pb-5">
                  <div className="bg-cream rounded-xl overflow-hidden">
                    {agent.services.map((s, j) => (
                      <div key={j} className="flex items-center justify-between px-4 py-2.5 border-b border-white last:border-0">
                        <span className="text-sm text-navy/70">{s.name}</span>
                        <span className="font-mono text-sm font-semibold text-coral whitespace-nowrap ml-4">{s.price}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* Payment Process */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-16"
        >
          <h3 className="font-display text-2xl font-bold text-navy text-center mb-8">How Payment Works</h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { step: '1', title: 'Select Service', desc: 'Choose your agent or bundle', icon: '🎯' },
              { step: '2', title: 'Pay Instantly', desc: 'Card, bank transfer, or USSD via Kora Pay', icon: '💳' },
              { step: '3', title: 'Auto-Confirmed', desc: 'Payment confirms automatically — no waiting', icon: '⚡' },
              { step: '4', title: 'Agent Delivers', desc: 'Your AI agent starts working immediately', icon: '✅' },
            ].map((item, i) => (
              <div key={i} className="bg-white rounded-2xl p-6 border border-gray-100 text-center relative">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-7 h-7 rounded-full bg-navy text-white text-xs font-bold flex items-center justify-center">
                  {item.step}
                </div>
                <span className="text-3xl">{item.icon}</span>
                <h4 className="font-bold text-navy mt-3">{item.title}</h4>
                <p className="text-sm text-navy/50 mt-1">{item.desc}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
