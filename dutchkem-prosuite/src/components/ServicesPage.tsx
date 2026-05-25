import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, Check, ArrowRight, X } from 'lucide-react';
import { agents, categories, type Agent } from '../data/agents';

interface ServicesPageProps {
  selectedCategory: string;
  setSelectedCategory: (cat: string) => void;
  setCurrentPage: (page: string) => void;
}

export default function ServicesPage({ selectedCategory, setSelectedCategory, setCurrentPage }: ServicesPageProps) {
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);

  const filtered = selectedCategory === 'all' 
    ? agents 
    : agents.filter(a => a.category === selectedCategory);

  return (
    <section className="py-24 bg-cream min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-navy">
            Pick Your Fighter. <span className="text-coral">We Have 13.</span>
          </h2>
          <p className="mt-4 text-navy/60 text-lg max-w-2xl mx-auto">
            Whatever you're facing — an assignment, a deadline, a stolen phone, a visa application — there's an AI agent here who eats that problem for breakfast. Find yours.
          </p>
        </motion.div>

        {/* Category Filters */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex flex-wrap justify-center gap-2 mb-10"
        >
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer flex items-center gap-2 ${
                selectedCategory === cat.id
                  ? 'bg-navy text-white shadow-lg'
                  : 'bg-white text-navy/70 hover:bg-white hover:text-navy hover:shadow-md border border-gray-100'
              }`}
            >
              <span>{cat.icon}</span>
              {cat.name}
            </button>
          ))}
        </motion.div>

        {/* Agent Cards Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence mode="popLayout">
            {filtered.map((agent, i) => (
              <motion.div
                key={agent.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => setSelectedAgent(agent)}
                className="group bg-white rounded-2xl overflow-hidden border border-gray-100 hover:border-coral/30 hover:shadow-xl hover:shadow-coral/5 transition-all duration-300 cursor-pointer"
                whileHover={{ scale: 1.02 }}
              >
                {/* Card Top Bar */}
                <div
                  className="h-2"
                  style={{ background: `linear-gradient(90deg, ${agent.color}, ${agent.color}88)` }}
                />
                
                <div className="p-6">
                  {/* Icon & ID */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                        style={{ background: `${agent.color}15` }}
                      >
                        {agent.icon}
                      </div>
                      <div>
                        <p className="font-mono text-xs text-navy/40 font-medium">{agent.id}</p>
                        <h3 className="font-display font-bold text-lg text-navy">{agent.name}</h3>
                      </div>
                    </div>
                    <ChevronRight
                      size={20}
                      className="text-navy/30 group-hover:text-coral group-hover:translate-x-1 transition-all mt-1"
                    />
                  </div>

                  {/* Role */}
                  <p className="text-navy/60 text-sm mb-4">{agent.role}</p>

                  {/* Top Services Preview */}
                  <div className="space-y-2 mb-4">
                    {agent.services.slice(0, 3).map((service, j) => (
                      <div key={j} className="flex items-center justify-between text-sm">
                        <span className="text-navy/70 truncate mr-2">{service.name}</span>
                        <span className="text-coral font-semibold whitespace-nowrap font-mono text-xs">{service.price}</span>
                      </div>
                    ))}
                    {agent.services.length > 3 && (
                      <p className="text-xs text-navy/40">+{agent.services.length - 3} more services</p>
                    )}
                  </div>

                  {/* Features Pills */}
                  <div className="flex flex-wrap gap-1.5">
                    {agent.features.slice(0, 3).map((feat, j) => (
                      <span
                        key={j}
                        className="px-2 py-1 bg-cream rounded-md text-xs text-navy/60"
                      >
                        {feat.length > 25 ? feat.slice(0, 25) + '...' : feat}
                      </span>
                    ))}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Agent Detail Modal */}
      <AnimatePresence>
        {selectedAgent && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setSelectedAgent(null)}
          >
            <motion.div
              initial={{ opacity: 0, y: 40, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 40, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
            >
              {/* Modal Header */}
              <div className="relative p-6 pb-4" style={{ background: `linear-gradient(135deg, ${selectedAgent.color}10, ${selectedAgent.color}05)` }}>
                <button
                  onClick={() => setSelectedAgent(null)}
                  className="absolute top-4 right-4 p-2 rounded-xl bg-white/80 hover:bg-white transition-colors cursor-pointer"
                >
                  <X size={20} className="text-navy/60" />
                </button>
                <div className="flex items-center gap-4">
                  <div
                    className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl"
                    style={{ background: `${selectedAgent.color}20` }}
                  >
                    {selectedAgent.icon}
                  </div>
                  <div>
                    <p className="font-mono text-sm text-navy/40">{selectedAgent.id}</p>
                    <h3 className="font-display text-2xl font-bold text-navy">{selectedAgent.name}</h3>
                    <p className="text-navy/60 text-sm mt-1">{selectedAgent.role}</p>
                  </div>
                </div>
              </div>

              {/* Services Table */}
              <div className="p-6">
                <h4 className="font-display font-bold text-navy mb-4">Services & Pricing</h4>
                <div className="bg-cream rounded-xl overflow-hidden">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-navy/10">
                        <th className="text-left px-4 py-3 text-xs font-semibold text-navy/50 uppercase">Service</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-navy/50 uppercase">Price</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedAgent.services.map((service, i) => (
                        <tr key={i} className="border-b border-navy/5 last:border-0">
                          <td className="px-4 py-3">
                            <p className="text-sm text-navy font-medium">{service.name}</p>
                            {service.description && (
                              <p className="text-xs text-navy/40 mt-0.5">⏱ {service.description}</p>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className="font-mono text-sm font-semibold text-coral">{service.price}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Features */}
                <h4 className="font-display font-bold text-navy mt-6 mb-3">Features</h4>
                <div className="grid sm:grid-cols-2 gap-2">
                  {selectedAgent.features.map((feat, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <Check size={16} className="text-forest mt-0.5 shrink-0" />
                      <span className="text-sm text-navy/70">{feat}</span>
                    </div>
                  ))}
                </div>

                {/* CTA */}
                <button
                  onClick={() => {
                    setSelectedAgent(null);
                    setCurrentPage('chat');
                  }}
                  className="mt-6 w-full py-4 bg-gradient-to-r from-coral to-coral-dark text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-coral/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  Get Started with {selectedAgent.name}
                  <ArrowRight size={18} />
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
