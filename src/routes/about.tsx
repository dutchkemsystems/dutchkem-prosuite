import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/about')({
  component: AboutPage,
})

function AboutPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 selection:bg-orange-100 selection:text-orange-900">
      <main className="max-w-4xl mx-auto px-4 py-24 md:py-32">
        <div className="space-y-12">
          <div className="space-y-4">
            <h1 className="text-4xl md:text-6xl font-black tracking-tighter text-slate-950 uppercase">About Dutchkem Ventures Prosuite NG+</h1>
            <p className="text-sm font-black text-orange-600 uppercase tracking-widest">RC: 9489855</p>
          </div>

          <div className="prose prose-slate prose-lg max-w-none space-y-8 text-slate-600 leading-relaxed font-medium">
            <p>
              Dutchkem Ventures Prosuite NG+ is a registered Nigerian technology company (RC: 9489855) dedicated to democratizing access to professional services through intelligent automation.
            </p>
            <p>
              Our platform connects Nigerians with 15 specialized expert agents — from academic writing to business planning, content creation to career coaching, film production to language translation.
            </p>
            <p>
              Headquartered in Lagos, we serve customers across all 36 states and the FCT, delivering instant results with bank-grade security.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-12">
            <div className="p-10 bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 space-y-4">
              <h2 className="text-xl font-black uppercase tracking-widest text-slate-950">Mission</h2>
              <p className="text-slate-500 font-bold uppercase tracking-tight leading-relaxed">
                To stop struggling and start winning — making professional services accessible, affordable, and instant for every Nigerian.
              </p>
            </div>
            <div className="p-10 bg-slate-950 rounded-[2.5rem] shadow-2xl space-y-4">
              <h2 className="text-xl font-black uppercase tracking-widest text-white">Vision</h2>
              <p className="text-slate-400 font-bold uppercase tracking-tight leading-relaxed">
                To become Africa's leading agent-powered service delivery platform, empowering millions to achieve their goals faster.
              </p>
            </div>
          </div>

          <div className="space-y-8 pt-12">
            <h2 className="text-3xl font-black tracking-tighter text-slate-950 uppercase">Core Values</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <ValueCard title="Excellence" desc="We deliver professional-grade results every time" />
              <ValueCard title="Integrity" desc="Bank-grade security and transparent pricing" />
              <ValueCard title="Innovation" desc="Continuous improvement with bi-annual updates" />
              <ValueCard title="Customer First" desc="24/7 support and 2 free revisions" />
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

function ValueCard({ title, desc }: { title: string, desc: string }) {
  return (
    <div className="p-8 bg-white rounded-3xl border border-slate-100 hover:border-orange-500/20 transition-all group">
      <h3 className="text-lg font-black uppercase tracking-widest text-slate-950 mb-2 group-hover:text-orange-600 transition-colors">{title}</h3>
      <p className="text-sm text-slate-500 font-bold leading-relaxed">{desc}</p>
    </div>
  )
}
