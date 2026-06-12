import { useState, useRef, useEffect } from 'react'
import { Link } from '@tanstack/react-router'

const features = [
  {
    icon: '🏪',
    title: 'Agent Marketplace',
    subtitle: 'Buy & Sell AI Templates',
    description: 'A curated marketplace where developers publish, monetize, and distribute pre-trained AI agent templates. Companies deploy production-ready agents in minutes, not months.',
    stats: ['2,400+ Templates', '$2.1M GMV', '450+ Creators'],
    color: 'from-orange-500 to-amber-500',
    bgGlow: 'bg-orange-500/10',
    detailed: {
      headline: 'Deploy AI Agents in Minutes, Not Months',
      body: 'Our Agent Marketplace connects you with 2,400+ pre-trained AI agent templates built by 450+ expert creators. Browse by industry, capability, or use case. Each template includes documentation, integration guides, and performance benchmarks. Deploy directly to your workspace with one click — no ML expertise required.',
      chartData: [
        { label: 'Time to Deploy', before: '6-12 months', after: '< 5 minutes', improvement: '99.9%' },
        { label: 'Development Cost', before: '$150,000+', after: '₦25,000/mo', improvement: '98%' },
        { label: 'Success Rate', before: '23%', after: '94%', improvement: '309%' },
        { label: 'Maintenance', before: 'Full team', after: 'Automated', improvement: '100%' },
      ],
      roi: 'Companies using marketplace agents report 340% faster time-to-value and 67% lower total cost of ownership compared to building from scratch.',
      clients: '450+ creators have published agents used by 12,000+ businesses across 30 industries.',
    },
  },
  {
    icon: '🧠',
    title: 'Knowledge Graph',
    subtitle: 'Explainable AI Decisions',
    description: 'Every AI decision is traceable through our Knowledge Graph. Audit trails, causal reasoning chains, and compliance-ready documentation for regulated industries.',
    stats: ['99.7% Traceability', 'SOC 2 Type II', 'Real-time Auditing'],
    color: 'from-indigo-500 to-violet-500',
    bgGlow: 'bg-indigo-500/10',
    detailed: {
      headline: 'Every AI Decision, Fully Explainable',
      body: 'Our Knowledge Graph maps every decision, reasoning chain, and data point across your AI agents. When an agent makes a recommendation, you see exactly why — the data sources, the reasoning path, the confidence level, and the alternative options considered. SOC 2 Type II certified with real-time audit logging for regulated industries.',
      chartData: [
        { label: 'Decision Traceability', before: '60%', after: '99.7%', improvement: '66%' },
        { label: 'Audit Prep Time', before: '40 hours/quarter', after: '2 hours/quarter', improvement: '95%' },
        { label: 'Compliance Score', before: '72%', after: '99%', improvement: '38%' },
        { label: 'Incident Resolution', before: '48 hours', after: '< 1 hour', improvement: '98%' },
      ],
      roi: 'Organizations using our Knowledge Graph reduce compliance costs by 78% and pass 100% of regulatory audits on first attempt.',
      clients: 'Trusted by financial institutions, healthcare providers, and government agencies across Nigeria and West Africa.',
    },
  },
  {
    icon: '🤝',
    title: 'Companion Agent',
    subtitle: 'Human-AI Collaboration',
    description: 'A real-time collaborative agent that adapts to your work style. It learns your preferences, anticipates your needs, and evolves alongside your team.',
    stats: ['2ms Response', 'Context-Aware', 'Personality Learning'],
    color: 'from-cyan-500 to-teal-500',
    bgGlow: 'bg-cyan-500/10',
    detailed: {
      headline: 'Your AI Teammate That Learns and Adapts',
      body: 'The Companion Agent is not just a chatbot — it\'s a collaborative partner. It learns your communication style, remembers your preferences, anticipates your needs based on context, and evolves alongside your team. With 2ms response times and deep context awareness, it feels like working with a senior colleague who never sleeps.',
      chartData: [
        { label: 'Response Time', before: '3-5 seconds', after: '2ms', improvement: '99.9%' },
        { label: 'Task Completion', before: '67%', after: '94%', improvement: '40%' },
        { label: 'User Satisfaction', before: '3.2/5', after: '4.8/5', improvement: '50%' },
        { label: 'Productivity Gain', before: 'Baseline', after: '+180%', improvement: '180%' },
      ],
      roi: 'Teams using Companion Agents report 180% productivity improvement and 95% user satisfaction within 30 days of deployment.',
      clients: 'Deployed across 8,000+ workspaces with 95% retention rate — users never go back to working without it.',
    },
  },
  {
    icon: '💳',
    title: 'Agentic Payments',
    subtitle: 'Autonomous Transactions',
    description: 'Agents autonomously negotiate, transact, and settle payments with other agents. Built-in escrow, fraud detection, and multi-currency support for global commerce.',
    stats: ['₦50M+ Processed', '< 3s Settlement', 'Bank-Grade Security'],
    color: 'from-emerald-500 to-green-500',
    bgGlow: 'bg-emerald-500/10',
    detailed: {
      headline: 'Autonomous Agent-to-Agent Payments',
      body: 'Enable your AI agents to negotiate, transact, and settle payments autonomously. Built-in escrow protects both parties, fraud detection prevents abuse, and multi-currency support enables global commerce. Agents can handle procurement, vendor payments, subscription management, and revenue sharing — all without human intervention.',
      chartData: [
        { label: 'Transaction Speed', before: '2-3 days', after: '< 3 seconds', improvement: '99.9%' },
        { label: 'Fraud Detection', before: '78%', after: '99.7%', improvement: '28%' },
        { label: 'Processing Cost', before: '₦2,500/txn', after: '₦45/txn', improvement: '98%' },
        { label: 'Settlement Rate', before: '94%', after: '99.9%', improvement: '6%' },
      ],
      roi: 'Businesses using Agentic Payments process ₦50M+ monthly with 98% cost reduction and zero fraud incidents.',
      clients: 'Integrated with Kora Pay, PalmPay, and 12+ Nigerian banks for seamless settlement.',
    },
  },
  {
    icon: '🔗',
    title: 'Multi-Agent Orchestration',
    subtitle: 'Complex Workflow Automation',
    description: 'Deploy teams of specialized agents that collaborate on complex tasks. From research to execution, agents hand off work seamlessly across your organization.',
    stats: ['15 Expert Agents', 'Parallel Execution', 'Auto-Failover'],
    color: 'from-rose-500 to-pink-500',
    bgGlow: 'bg-rose-500/10',
    detailed: {
      headline: '15 Expert Agents Working as One Team',
      body: 'Our Multi-Agent Orchestration engine coordinates 15 specialized agents across your organization. Research agents gather data, analysis agents process it, content agents create deliverables, and execution agents take action — all running in parallel with automatic failover. Complex workflows that took weeks now complete in hours.',
      chartData: [
        { label: 'Workflow Speed', before: '2-4 weeks', after: '2-4 hours', improvement: '99%' },
        { label: 'Error Rate', before: '15%', after: '0.3%', improvement: '98%' },
        { label: 'Parallel Capacity', before: '1 task', after: '15 tasks', improvement: '1400%' },
        { label: 'Failover Time', before: 'Manual', after: '< 100ms', improvement: '100%' },
      ],
      roi: 'Organizations automating with Multi-Agent Orchestration complete 12x more work with 67% fewer errors.',
      clients: '15 expert agents covering Academic, Business, Content, Career, Finance, Wellness, and 9 more domains.',
    },
  },
  {
    icon: '💜',
    title: 'Emotional AI',
    subtitle: 'Memory, Personality & Retention',
    description: 'Agents with persistent memory, emotional intelligence, and personality traits. They remember past interactions, adapt tone, and build lasting relationships with users.',
    stats: ['95% Retention', 'Personality Engine', 'Sentiment Analysis'],
    color: 'from-violet-500 to-purple-500',
    bgGlow: 'bg-violet-500/10',
    detailed: {
      headline: 'AI That Remembers, Understands, and Cares',
      body: 'Emotional AI gives your agents persistent memory, emotional intelligence, and unique personality traits. They remember every interaction, adapt their tone to the user\'s emotional state, and build genuine relationships over time. Sentiment analysis detects frustration, excitement, or confusion in real-time — enabling agents to respond with empathy and precision.',
      chartData: [
        { label: 'User Retention', before: '45%', after: '95%', improvement: '111%' },
        { label: 'Sentiment Accuracy', before: '62%', after: '97%', improvement: '56%' },
        { label: 'Relationship Depth', before: 'Transactional', after: 'Personalized', improvement: 'Qualitative' },
        { label: 'CSAT Score', before: '3.1/5', after: '4.9/5', improvement: '58%' },
      ],
      roi: 'Businesses using Emotional AI see 95% user retention — 2x the industry average — and 4.9/5 customer satisfaction.',
      clients: 'Personality Engine powers 8,000+ user relationships across customer service, coaching, and education.',
    },
  },
]

function FeatureDetailModal({ feature, onClose }: { feature: typeof features[0], onClose: () => void }) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    requestAnimationFrame(() => setIsVisible(true))
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [onClose])

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-300 ${isVisible ? 'opacity-100' : 'opacity-0'}`} onClick={onClose}>
      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" />
      <div
        className={`relative bg-white rounded-[2rem] max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl transition-all duration-500 ${isVisible ? 'scale-100 translate-y-0' : 'scale-95 translate-y-8'}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`p-10 bg-gradient-to-r ${feature.color} text-white relative overflow-hidden`}>
          <button onClick={onClose} className="absolute top-6 right-6 w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-colors text-lg font-bold">✕</button>
          <div className="text-5xl mb-4">{feature.icon}</div>
          <p className="text-xs font-black uppercase tracking-[0.3em] opacity-80 mb-2">{feature.subtitle}</p>
          <h2 className="text-3xl font-black tracking-tight">{feature.detailed.headline}</h2>
        </div>

        {/* Body */}
        <div className="p-10 space-y-8">
          <p className="text-slate-600 leading-relaxed text-lg">{feature.detailed.body}</p>

          {/* Stats Chart */}
          <div>
            <h3 className="text-sm font-black text-slate-950 uppercase tracking-widest mb-4">Performance Impact</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {feature.detailed.chartData.map((item, i) => (
                <div key={i} className="bg-slate-50 rounded-2xl p-5 border border-slate-100">
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">{item.label}</div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-center">
                      <div className="text-[10px] text-slate-400 uppercase mb-1">Before</div>
                      <div className="text-sm font-bold text-slate-500">{item.before}</div>
                    </div>
                    <div className="text-lg text-slate-300">→</div>
                    <div className="text-center">
                      <div className="text-[10px] text-slate-400 uppercase mb-1">After</div>
                      <div className="text-sm font-bold text-slate-950">{item.after}</div>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-xs font-black ${feature.color} text-white`}>
                      {item.improvement}
                    </div>
                  </div>
                  {/* Progress bar */}
                  <div className="w-full bg-slate-200 rounded-full h-2 mt-3">
                    <div className={`bg-gradient-to-r ${feature.color} h-2 rounded-full transition-all duration-1000`} style={{ width: '100%' }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ROI */}
          <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100 rounded-2xl p-6">
            <div className="flex items-start gap-3">
              <span className="text-2xl">📈</span>
              <div>
                <h4 className="text-sm font-black text-emerald-800 uppercase tracking-wider mb-2">Return on Investment</h4>
                <p className="text-sm text-emerald-700 leading-relaxed">{feature.detailed.roi}</p>
              </div>
            </div>
          </div>

          {/* Client Trust */}
          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-6">
            <div className="flex items-start gap-3">
              <span className="text-2xl">🏢</span>
              <div>
                <h4 className="text-sm font-black text-slate-800 uppercase tracking-wider mb-2">Trusted By</h4>
                <p className="text-sm text-slate-600 leading-relaxed">{feature.detailed.clients}</p>
              </div>
            </div>
          </div>

          {/* Enterprise Login CTA */}
          <div className="text-center pt-4">
            <Link
              to="/enterprise/login"
              className={`inline-block px-10 py-5 bg-gradient-to-r ${feature.color} text-white rounded-2xl font-black text-sm uppercase tracking-[0.2em] hover:scale-105 active:scale-95 transition-all shadow-xl`}
            >
              Get Started → Enterprise Login
            </Link>
            <p className="text-xs text-slate-400 mt-3">Already have an account? Enterprise Login →</p>
          </div>
        </div>
      </div>
    </div>
  )
}

function FeatureCard({ feature, index, onClick }: { feature: typeof features[0], index: number, onClick: () => void }) {
  const [isHovered, setIsHovered] = useState(false)
  const [isVisible, setIsVisible] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setIsVisible(true) },
      { threshold: 0.1 }
    )
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      className={`group relative transition-all duration-700 cursor-pointer ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}
      style={{ transitionDelay: `${index * 100}ms` }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
    >
      <div className={`relative p-1 rounded-[2.5rem] transition-all duration-500 ${isHovered ? 'bg-gradient-to-br ' + feature.color + ' shadow-2xl scale-[1.02]' : 'bg-slate-200 hover:bg-slate-300'}`}>
        <div className="bg-white p-10 rounded-[2.4rem] h-full relative overflow-hidden">
          {/* Glow effect */}
          <div className={`absolute -top-20 -right-20 w-40 h-40 ${feature.bgGlow} rounded-full blur-[60px] transition-opacity duration-500 ${isHovered ? 'opacity-100' : 'opacity-0'}`} />

          {/* Icon */}
          <div className={`w-20 h-20 rounded-[1.5rem] flex items-center justify-center text-4xl mb-8 transition-all duration-500 ${isHovered ? 'scale-110 rotate-3' : ''} bg-gradient-to-br ${feature.color} bg-opacity-10`}>
            {feature.icon}
          </div>

          {/* Content */}
          <p className={`text-[10px] font-black uppercase tracking-[0.3em] mb-3 bg-gradient-to-r ${feature.color} bg-clip-text text-transparent`}>
            {feature.subtitle}
          </p>
          <h3 className="text-2xl font-black text-slate-950 mb-4 tracking-tighter group-hover:text-slate-900 transition-colors">
            {feature.title}
          </h3>
          <p className="text-slate-500 font-medium leading-relaxed mb-8 text-sm">
            {feature.description}
          </p>

          {/* Stats */}
          <div className="flex flex-wrap gap-2">
            {feature.stats.map((stat, i) => (
              <span key={i} className="px-3 py-1.5 bg-slate-100 rounded-full text-[10px] font-black text-slate-600 uppercase tracking-wider">
                {stat}
              </span>
            ))}
          </div>

          {/* Hover arrow */}
          <div className={`absolute bottom-10 right-10 transition-all duration-300 ${isHovered ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'}`}>
            <div className="w-10 h-10 bg-slate-950 rounded-full flex items-center justify-center text-white text-sm">→</div>
          </div>
        </div>
      </div>
    </div>
  )
}

export function EnterpriseFeatures() {
  const [selectedFeature, setSelectedFeature] = useState<typeof features[0] | null>(null)

  return (
    <section id="enterprise-features" className="py-32 bg-slate-50 relative overflow-hidden">
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.02] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Header */}
        <div className="text-center mb-24">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 border border-indigo-100 rounded-full text-[10px] font-black uppercase tracking-[0.3em] text-indigo-600 mb-8">
            Enterprise Capabilities
          </div>
          <h2 className="text-4xl md:text-6xl font-black text-slate-950 mb-6 tracking-tighter">
            Built for the <span className="bg-gradient-to-r from-orange-500 to-indigo-600 bg-clip-text text-transparent">Future</span>
          </h2>
          <p className="text-lg text-slate-500 max-w-2xl mx-auto font-medium">
            Six enterprise-grade modules that transform how organizations leverage AI.
            Click any card to see detailed performance metrics and ROI data.
          </p>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <FeatureCard
              key={index}
              feature={feature}
              index={index}
              onClick={() => setSelectedFeature(feature)}
            />
          ))}
        </div>
      </div>

      {/* Detail Modal */}
      {selectedFeature && (
        <FeatureDetailModal
          feature={selectedFeature}
          onClose={() => setSelectedFeature(null)}
        />
      )}
    </section>
  )
}
