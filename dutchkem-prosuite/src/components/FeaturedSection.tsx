import { motion } from 'framer-motion';
import { ArrowRight, Check, Star } from 'lucide-react';
import { agents, bundlePackages } from '../data/agents';

interface FeaturedProps {
  setCurrentPage: (page: string) => void;
}

export default function FeaturedSection({ setCurrentPage }: FeaturedProps) {
  const featured = agents.filter(a => ['A1', 'A8', 'A10', 'A13'].includes(a.id));

  return (
    <>
      {/* Featured Agents */}
      <section className="py-20 bg-cream">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-navy">
              One Platform. <span className="text-coral">13 Experts.</span> Zero Stress.
            </h2>
            <p className="mt-3 text-navy/50 max-w-xl mx-auto">
              Each agent is a specialist trained on millions of data points. Pick yours and watch the magic happen.
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {featured.map((agent, i) => (
              <motion.div
                key={agent.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="group bg-white rounded-2xl overflow-hidden border border-gray-100 hover:shadow-xl hover:shadow-coral/5 transition-all duration-300 cursor-pointer"
                onClick={() => setCurrentPage('services')}
              >
                <div className="h-2" style={{ background: `linear-gradient(90deg, ${agent.color}, ${agent.color}88)` }} />
                <div className="p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center text-2xl"
                      style={{ background: `${agent.color}15` }}
                    >
                      {agent.icon}
                    </div>
                    <div>
                      <p className="font-mono text-[10px] text-navy/30">{agent.id}</p>
                      <h3 className="font-display font-bold text-navy">{agent.name}</h3>
                    </div>
                  </div>
                  <p className="text-sm text-navy/50 mb-4">{agent.role}</p>
                  <div className="space-y-1.5">
                    {agent.features.slice(0, 3).map((f, j) => (
                      <div key={j} className="flex items-center gap-1.5 text-xs text-navy/60">
                        <Check size={12} className="text-forest shrink-0" />
                        <span className="truncate">{f}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 pt-3 border-t border-gray-50">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-navy/40">{agent.services.length} services</span>
                      <span className="text-xs text-coral font-medium group-hover:translate-x-1 transition-transform flex items-center gap-1">
                        View details <ArrowRight size={12} />
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="mt-8 text-center">
            <button
              onClick={() => setCurrentPage('services')}
              className="px-8 py-3 bg-navy text-white font-semibold rounded-xl hover:bg-navy-light transition-colors cursor-pointer"
            >
              Meet All 13 Agents — Find Your Perfect Match →
            </button>
          </div>
        </div>
      </section>

      {/* ServiceMart Bundles */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <span className="inline-flex items-center gap-2 px-4 py-2 bg-forest/10 rounded-full text-forest text-sm font-medium mb-3">
              🚀 Smart Bundles
            </span>
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-navy">
              Why Pay Full Price? <span className="text-forest">Bundle & Save.</span>
            </h2>
            <p className="mt-3 text-navy/50 max-w-xl mx-auto">
              Combine services and keep more money in your pocket. Our most popular bundles deliver maximum value.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6 mb-12">
            {bundlePackages.map((bundle, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className={`relative bg-white rounded-3xl overflow-hidden border-2 ${
                  i === 1 ? 'border-gold shadow-xl shadow-gold/10' : 'border-gray-100'
                }`}
              >
                {i === 1 && (
                  <div className="bg-gradient-to-r from-gold to-gold-dark text-navy text-center py-1.5 text-xs font-bold uppercase tracking-wider">
                    ⭐ Most Popular
                  </div>
                )}
                <div className="p-8">
                  <h3 className="font-display text-xl font-bold text-navy">{bundle.name}</h3>
                  <p className="text-navy/40 text-sm mt-1">{bundle.services}</p>
                  <div className="mt-4">
                    <span className="font-display text-4xl font-bold text-navy">{bundle.price}</span>
                    <span className="text-navy/40 text-sm ml-1">flat</span>
                  </div>
                  <div className="mt-2 inline-flex items-center gap-1 px-3 py-1 bg-forest/10 rounded-full text-forest text-sm font-medium">
                    <Star size={14} />
                    {bundle.savings}
                  </div>
                  <button
                    onClick={() => setCurrentPage('pricing')}
                    className={`mt-6 w-full py-3.5 rounded-xl font-semibold text-sm cursor-pointer transition-all ${
                      i === 1
                        ? 'bg-gradient-to-r from-gold to-gold-dark text-navy hover:shadow-lg'
                        : 'bg-navy text-white hover:bg-navy-light'
                    }`}
                  >
                    Get Started →
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-cream">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-navy">
              From <span className="text-coral">"I Need Help"</span> to <span className="text-forest">"It's Done"</span> in 4 Steps
            </h2>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { step: '01', icon: '📱', title: 'Verify Your Phone', desc: 'Enter your number, get an OTP via SMS, you\'re in. 30 seconds.' },
              { step: '02', icon: '🤖', title: 'Pick Your Expert', desc: 'Choose from 13 AI specialists — each one trained for YOUR exact need.' },
              { step: '03', icon: '💳', title: 'Instant Payment', desc: 'Pay with card, bank transfer, or USSD. Auto-confirmed, no waiting.' },
              { step: '04', icon: '🎉', title: 'Agent Delivers', desc: 'Your AI agent starts immediately. Results delivered. 3 free revisions.' },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="relative"
              >
                <div className="bg-white rounded-2xl p-6 border border-gray-100 text-center relative z-10">
                  <span className="font-mono text-xs text-coral font-bold">{item.step}</span>
                  <div className="text-4xl my-4">{item.icon}</div>
                  <h3 className="font-display font-bold text-navy mb-2">{item.title}</h3>
                  <p className="text-sm text-navy/50">{item.desc}</p>
                </div>
                {i < 3 && (
                  <div className="hidden lg:block absolute top-1/2 -right-3 w-6 text-navy/10 z-0">
                    <ArrowRight size={24} />
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-navy">
              Don't Take Our Word For It. <span className="text-gold">Hear From Them.</span>
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                name: 'Adebayo O.',
                role: 'PhD Student, UNILAG',
                text: 'I was panicking — my thesis was due in 2 weeks and I had nothing. Academic Pro didn\'t just write it, it taught me. I submitted on time and my supervisor said it was my best chapter yet. Worth every kobo.',
                rating: 5,
              },
              {
                name: 'Blessing A.',
                role: 'JAMB Candidate, Abuja',
                text: 'I scored 287 in JAMB after using the ServiceMart AI tutor for just 3 weeks. The past questions with instant explanations changed everything. My friends who used textbooks scored 190. ₦3,000 well spent!',
                rating: 5,
              },
              {
                name: 'Ibrahim M.',
                role: 'YouTuber, 50K Subscribers',
                text: 'MediaStudio transcribed my Yoruba podcast, ContentPro wrote my video scripts, and my channel grew from 8K to 50K in 4 months. These AI agents understand Nigerian content like no freelancer I\'ve hired.',
                rating: 5,
              },
            ].map((t, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-cream rounded-2xl p-6 border border-gray-100"
              >
                <div className="flex gap-0.5 mb-4">
                  {Array.from({ length: t.rating }).map((_, j) => (
                    <Star key={j} size={16} className="text-gold fill-gold" />
                  ))}
                </div>
                <p className="text-navy/70 text-sm leading-relaxed mb-4">"{t.text}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-coral to-gold flex items-center justify-center text-white text-xs font-bold">
                    {t.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <p className="font-bold text-sm text-navy">{t.name}</p>
                    <p className="text-xs text-navy/40">{t.role}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-br from-navy via-navy-dark to-navy relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `radial-gradient(circle at 30% 50%, rgba(232,83,58,0.4) 0%, transparent 50%),
                             radial-gradient(circle at 70% 50%, rgba(245,166,35,0.4) 0%, transparent 50%)`,
          }} />
        </div>
        <div className="relative max-w-4xl mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <img src="/images/dutchkem-logo.png" alt="Dutchkem Ventures" className="w-20 h-20 object-contain mx-auto mb-6 drop-shadow-2xl rounded-xl" />
            <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
              Your Problem Ends Here.
            </h2>
            <p className="font-display text-xl text-gold mb-4">
              Seriously. Right here. Right now.
            </p>
            <p className="text-white/50 text-lg mb-8 max-w-2xl mx-auto">
              10,000+ Nigerians already stopped stressing and started winning. The only question is — why haven't you?
              Prices start from ₦2,000. Results delivered in minutes. 2 free revisions included.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => setCurrentPage('chat')}
                className="group px-10 py-5 bg-gradient-to-r from-coral to-gold text-white font-bold rounded-2xl hover:shadow-xl hover:shadow-coral/30 transition-all flex items-center justify-center gap-2 cursor-pointer text-lg"
              >
                Chat With an Agent Now — Free to Ask
                <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
              </button>
              <button
                onClick={() => setCurrentPage('pricing')}
                className="px-8 py-5 bg-white/10 text-white font-semibold rounded-2xl hover:bg-white/20 transition-all border border-white/20 cursor-pointer"
              >
                See All Prices
              </button>
            </div>
          </motion.div>
        </div>
      </section>
    </>
  );
}
