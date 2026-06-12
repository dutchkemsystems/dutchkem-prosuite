import { useState, useRef, useEffect } from 'react'
import { Link } from '@tanstack/react-router'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  Filler,
} from 'chart.js'
import { Bar, Line } from 'react-chartjs-2'

ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement,
  BarElement, Title, Tooltip, Legend, ArcElement, Filler
)

const buttons = [
  { id: 'marketplace', icon: '🤖', label: 'Agent Marketplace', color: '#FF6B35' },
  { id: 'knowledge', icon: '🧠', label: 'Knowledge Graph', color: '#1E3A8A' },
  { id: 'companion', icon: '🤝', label: 'Companion Agent', color: '#00A86B' },
  { id: 'payments', icon: '💳', label: 'Agentic Payments', color: '#f59e0b' },
  { id: 'orchestration', icon: '🔄', label: 'Multi-Agent Orchestration', color: '#8B5CF6' },
  { id: 'emotional', icon: '💖', label: 'Emotional AI', color: '#EC4899' },
]

const content = {
  marketplace: {
    headline: 'Buy, Sell & Monetize AI Agents',
    subheadline: 'Turn your AI capabilities into a revenue stream',
    description: 'Our Agent Marketplace lets you publish pre-built AI agent templates that other businesses can install and use immediately. Set your own pricing (one-time, subscription, or revenue share) and earn 70% of every sale. Over 1,000+ businesses are already looking for ready-to-deploy AI solutions.',
    stats: [
      { value: '70%', label: 'Developer Revenue Share', icon: '💰' },
      { value: '1,000+', label: 'Potential Buyers', icon: '👥' },
      { value: '5 min', label: 'Average Install Time', icon: '⚡' },
    ],
    chartType: 'bar' as const,
    chartData: {
      labels: ['Year 1', 'Year 2', 'Year 3'],
      datasets: [
        { label: 'Agent Templates Available', data: [50, 200, 500], backgroundColor: '#FF6B35', borderRadius: 8 },
        { label: 'Monthly Transactions', data: [100, 500, 2000], backgroundColor: '#1E3A8A', borderRadius: 8 },
      ],
    },
    roiText: 'Developers on our platform earn an average of ₦250,000 - ₦2,500,000 monthly from template sales.',
    ctaText: 'Get Started → Enterprise Login',
    ctaLink: '/enterprise/login',
  },
  knowledge: {
    headline: 'Explainable, Traceable AI Decisions',
    subheadline: 'Every AI conclusion backed by auditable sources',
    description: 'Our Knowledge Graph technology traces every AI decision back to its source data – complete audit trail for compliance and trust. Perfect for regulated industries like finance, healthcare, and legal services. Reduce compliance costs by 60% with automated reasoning traces.',
    stats: [
      { value: '100%', label: 'Decision Traceability', icon: '📜' },
      { value: '60%', label: 'Compliance Cost Reduction', icon: '💰' },
      { value: '< 100ms', label: 'Query Response Time', icon: '⚡' },
    ],
    chartType: 'line' as const,
    chartData: {
      labels: ['Without KG', 'With KG'],
      datasets: [{
        label: 'Client Trust Score',
        data: [45, 92],
        borderColor: '#1E3A8A',
        backgroundColor: 'rgba(30,58,138,0.15)',
        fill: true,
        tension: 0.4,
        pointRadius: 8,
        pointBackgroundColor: '#1E3A8A',
      }],
    },
    roiText: 'Enterprises using Knowledge Graph report 85% faster audit completion and 40% higher client trust scores.',
    ctaText: 'Get Started → Enterprise Login',
    ctaLink: '/enterprise/login',
  },
  companion: {
    headline: 'AI That Works Alongside Your Team',
    subheadline: 'Real-time guidance during customer calls and support tickets',
    description: 'Companion Agent listens to live conversations and provides step-by-step guidance, compliance prompts, and next-best-action recommendations. Reduces average handle time by 40% and improves first-call resolution by 55%. Works with your existing CRM, ticketing system, and phone infrastructure.',
    stats: [
      { value: '40%', label: 'Reduced Handle Time', icon: '⏱️' },
      { value: '55%', label: 'Better First-Call Resolution', icon: '📈' },
      { value: '24/7', label: 'Always Available', icon: '🕒' },
    ],
    chartType: 'bar' as const,
    chartData: {
      labels: ['Avg Handle Time (min)', 'First-Call Resolution %', 'Customer Satisfaction'],
      datasets: [
        { label: 'Without Companion', data: [12, 62, 3.4], backgroundColor: '#d1d5db', borderRadius: 8 },
        { label: 'With Companion Agent', data: [7, 85, 4.7], backgroundColor: '#00A86B', borderRadius: 8 },
      ],
    },
    roiText: 'One contact center reduced operational costs by ₦12.5M annually after deploying Companion Agent.',
    ctaText: 'Get Started → Enterprise Login',
    ctaLink: '/enterprise/login',
  },
  payments: {
    headline: 'Autonomous Agent-to-Agent Commerce',
    subheadline: 'Let your AI agents pay other agents for services – within your limits',
    description: 'Enable your agents to hire specialized agents for specific tasks, with automatic payment processing and settlement. Set spending limits per agent. Receive real-time notifications for all transactions. Create complex workflows where agents collaborate and compensate each other autonomously.',
    stats: [
      { value: '100%', label: 'Autonomous', icon: '🤖' },
      { value: '30+', label: 'Integration Partners', icon: '🔌' },
      { value: 'Real-time', label: 'Settlement', icon: '⚡' },
    ],
    chartType: 'line' as const,
    chartData: {
      labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
      datasets: [{
        label: 'Transaction Volume (₦M)',
        data: [5.2, 8.4, 12.1, 18.5, 24.3, 31.8],
        borderColor: '#f59e0b',
        backgroundColor: 'rgba(245,158,11,0.15)',
        fill: true,
        tension: 0.4,
        pointRadius: 6,
        pointBackgroundColor: '#f59e0b',
      }],
    },
    roiText: 'Companies using agentic payments have reduced manual reconciliation costs by 90% and accelerated workflows by 300%.',
    ctaText: 'Get Started → Enterprise Login',
    ctaLink: '/enterprise/login',
  },
  orchestration: {
    headline: 'Coordinate Multiple AI Agents as One Team',
    subheadline: 'Complex workflows executed by specialized agents working together',
    description: 'Create workflows where lead agents delegate tasks to specialized sub-agents – research → analysis → content → delivery. Real-time coordination logs show exactly what each agent contributed. Ideal for end-to-end business processes (lead generation to contract signing).',
    stats: [
      { value: '5-10x', label: 'Faster Workflows', icon: '🚀' },
      { value: '15', label: 'Specialized Agents', icon: '🤖' },
      { value: '100%', label: 'Task Traceability', icon: '📋' },
    ],
    chartType: 'bar' as const,
    chartData: {
      labels: ['Lead Generation', 'Proposal Drafting', 'Client Onboarding', 'Report Generation'],
      datasets: [
        { label: 'Manual Process (hrs)', data: [8, 12, 24, 6], backgroundColor: '#d1d5db', borderRadius: 8 },
        { label: 'Agent Orchestration (hrs)', data: [1, 2, 4, 0.5], backgroundColor: '#8B5CF6', borderRadius: 8 },
      ],
    },
    roiText: 'One marketing agency reduced project delivery time from 5 days to 6 hours using multi-agent orchestration.',
    ctaText: 'Get Started → Enterprise Login',
    ctaLink: '/enterprise/login',
  },
  emotional: {
    headline: 'AI That Remembers, Feels, and Grows',
    subheadline: 'Build long-term relationships with memory and personality',
    description: 'Agents store long-term memories, preferences, and emotional context from every interaction. Sentiment analysis adapts the agent\'s personality to each user\'s mood and communication style. Diary entries and music taste integration create deeper, more engaging user experiences.',
    stats: [
      { value: '3x', label: 'Higher Retention', icon: '❤️' },
      { value: '85%', label: 'User Satisfaction', icon: '😊' },
      { value: '2x', label: 'Lifetime Value', icon: '💰' },
    ],
    chartType: 'line' as const,
    chartData: {
      labels: ['Month 1', 'Month 3', 'Month 6', 'Month 12'],
      datasets: [
        { label: 'Standard AI', data: [100, 60, 35, 15], borderColor: '#9ca3af', tension: 0.4, pointRadius: 6, pointBackgroundColor: '#9ca3af' },
        { label: 'Emotional AI', data: [100, 85, 70, 55], borderColor: '#EC4899', backgroundColor: 'rgba(236,72,153,0.12)', fill: true, tension: 0.4, pointRadius: 6, pointBackgroundColor: '#EC4899' },
      ],
    },
    roiText: 'Apps using Emotional AI report 3x higher user retention and 2x customer lifetime value.',
    ctaText: 'Get Started → Enterprise Login',
    ctaLink: '/enterprise/login',
  },
}

function AnimatedStatCard({ stat, isVisible }: { stat: { value: string; label: string; icon: string }; isVisible: boolean }) {
  return (
    <div className={`flex-1 min-w-[120px] p-5 rounded-2xl border transition-all duration-500 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`} style={{ background: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.08)' }}>
      <div className="text-3xl mb-2">{stat.icon}</div>
      <div className="text-2xl font-black text-white mb-1">{stat.value}</div>
      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{stat.label}</div>
    </div>
  )
}

export function BuiltForFuture() {
  const [active, setActive] = useState('marketplace')
  const [animKey, setAnimKey] = useState(0)
  const [isVisible, setIsVisible] = useState(false)
  const sectionRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setIsVisible(true) },
      { threshold: 0.1 }
    )
    if (sectionRef.current) observer.observe(sectionRef.current)
    return () => observer.disconnect()
  }, [])

  const handleSelect = (id: string) => {
    setActive(id)
    setAnimKey(k => k + 1)
  }

  const current = content[active as keyof typeof content]
  const activeBtn = buttons.find(b => b.id === active)!

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom' as const, labels: { color: '#94a3b8', font: { size: 11, weight: 'bold' as const } } },
      tooltip: { backgroundColor: '#1e293b', titleColor: '#f8fafc', bodyColor: '#cbd5e1', borderColor: '#334155', borderWidth: 1, cornerRadius: 12, padding: 12 },
    },
    scales: {
      x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#64748b', font: { size: 11 } } },
      y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#64748b', font: { size: 11 } } },
    },
  }

  return (
    <section ref={sectionRef} className="py-32 relative overflow-hidden" style={{ background: 'linear-gradient(180deg, #0f172a 0%, #020617 100%)' }}>
      {/* Subtle grid pattern */}
      <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Header */}
        <div className={`text-center mb-16 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="inline-flex items-center gap-2 px-5 py-2.5 bg-white/5 backdrop-blur-xl border border-white/10 rounded-full text-[11px] font-black uppercase tracking-[0.2em] text-orange-400 mb-8">
            Enterprise Capabilities
          </div>
          <h2 className="text-4xl md:text-6xl font-black text-white mb-6 tracking-tighter">
            🚀 Built For <span className="bg-gradient-to-r from-orange-400 via-orange-500 to-pink-500 bg-clip-text text-transparent">Future</span>
          </h2>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto font-medium">
            Six enterprise-grade capabilities that transform how organizations leverage AI.
            Click any module to explore detailed analysis and ROI data.
          </p>
        </div>

        {/* Buttons */}
        <div className={`flex flex-wrap justify-center gap-3 mb-12 transition-all duration-700 delay-200 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          {buttons.map((btn) => (
            <button
              key={btn.id}
              onClick={() => handleSelect(btn.id)}
              className={`flex items-center gap-2.5 px-6 py-3.5 rounded-2xl font-black text-sm tracking-tight transition-all duration-300 ${
                active === btn.id
                  ? 'text-white shadow-lg scale-105'
                  : 'text-slate-400 bg-white/5 border border-white/5 hover:bg-white/10 hover:text-white hover:scale-[1.02]'
              }`}
              style={active === btn.id ? { background: btn.color, boxShadow: `0 8px 30px ${btn.color}40` } : undefined}
            >
              <span className="text-xl">{btn.icon}</span>
              <span className="hidden sm:inline">{btn.label}</span>
            </button>
          ))}
        </div>

        {/* Content Panel */}
        <div
          key={animKey}
          className="rounded-[2.5rem] border border-white/5 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500"
          style={{ background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(20px)' }}
        >
          <div className="p-8 md:p-12 lg:p-16">
            <div className="grid lg:grid-cols-2 gap-12 items-start">
              {/* Left: Content */}
              <div className="space-y-8">
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-3xl">{activeBtn.icon}</span>
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] px-3 py-1 rounded-full" style={{ color: activeBtn.color, background: `${activeBtn.color}15` }}>
                      {activeBtn.label}
                    </span>
                  </div>
                  <h3 className="text-3xl md:text-4xl font-black text-white mb-3 tracking-tighter leading-tight">
                    {current.headline}
                  </h3>
                  <p className="text-base font-bold" style={{ color: activeBtn.color }}>
                    {current.subheadline}
                  </p>
                </div>

                <p className="text-slate-400 leading-relaxed font-medium">
                  {current.description}
                </p>

                {/* Stats */}
                <div className="flex flex-wrap gap-4">
                  {current.stats.map((stat, i) => (
                    <AnimatedStatCard key={`${animKey}-${i}`} stat={stat} isVisible={true} />
                  ))}
                </div>

                {/* ROI Box */}
                <div className="p-5 rounded-2xl border-l-4 flex items-start gap-4" style={{ background: 'rgba(16,185,129,0.08)', borderColor: '#10b981' }}>
                  <span className="text-2xl flex-shrink-0 mt-0.5">📈</span>
                  <p className="text-sm text-slate-300 font-medium leading-relaxed">{current.roiText}</p>
                </div>

                {/* CTA */}
                <Link
                  to={current.ctaLink}
                  className="inline-flex items-center gap-3 px-8 py-4 rounded-2xl font-black text-sm text-white transition-all duration-300 hover:scale-105 hover:shadow-lg"
                  style={{ background: activeBtn.color }}
                >
                  {current.ctaText}
                </Link>
              </div>

              {/* Right: Chart */}
              <div className="flex items-center justify-center">
                <div className="w-full p-6 rounded-2xl" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <h4 className="text-white font-black text-center mb-6 tracking-tight">
                    {current.chartType === 'bar' ? '📊 Performance Comparison' : '📈 Growth Trend'}
                  </h4>
                  <div className="h-[320px]">
                    {current.chartType === 'bar' ? (
                      <Bar data={current.chartData} options={chartOptions} />
                    ) : (
                      <Line data={current.chartData} options={chartOptions} />
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
