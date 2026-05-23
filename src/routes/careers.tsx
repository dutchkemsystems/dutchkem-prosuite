import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/careers')({
  component: CareersPage,
})

function CareersPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <main className="max-w-4xl mx-auto px-4 py-24 md:py-32 space-y-24">
        <div className="space-y-6">
          <div className="inline-block px-4 py-1.5 bg-orange-100 text-orange-600 text-[10px] font-black uppercase tracking-widest rounded-full">Join the workforce</div>
          <h1 className="text-4xl md:text-7xl font-black tracking-tighter text-slate-950 uppercase leading-none">Build the future of expert services.</h1>
          <p className="text-lg text-slate-500 font-bold uppercase tracking-widest max-w-2xl">
            We're looking for visionary thinkers to help us expand Africa's leading agent-powered platform.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 pt-12">
          <div className="space-y-12">
            <h2 className="text-2xl font-black uppercase tracking-widest text-slate-950">Why Work With Us</h2>
            <div className="space-y-8">
              <BenefitItem title="Remote-First" desc="Work from anywhere in Nigeria with our distributed team model." />
              <BenefitItem title="Compensation" desc="Competitive base pay plus aggressive performance-based bonuses." />
              <BenefitItem title="Development" desc="₦50,000 annual budget for your professional certifications and learning." />
              <BenefitItem title="Leave Policy" desc="20 days of paid annual leave plus all Nigerian public holidays." />
            </div>
          </div>

          <div className="p-12 bg-white rounded-[3rem] shadow-2xl border border-slate-100 space-y-8">
            <h2 className="text-xl font-black uppercase tracking-widest text-slate-950">Application Process</h2>
            <div className="space-y-6">
              <ProcessStep num="1" title="Initial Contact" desc="Submit CV and cover letter to careers@dutchkem.com" />
              <ProcessStep num="2" title="Screening" desc="15-minute alignment call with our talent team." />
              <ProcessStep num="3" title="Assessment" desc="Technical or creative project based on the role." />
              <ProcessStep num="4" title="Final Review" desc="Deep dive interview with the departmental leads." />
            </div>
          </div>
        </div>

        <div className="pt-24 space-y-12">
          <div className="flex justify-between items-end border-b border-slate-200 pb-8">
             <h2 className="text-3xl font-black uppercase tracking-tight text-slate-950">Open Positions</h2>
             <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">0 Openings</span>
          </div>
          
          <div className="py-20 text-center space-y-4">
             <div className="text-4xl">🌑</div>
             <h3 className="text-xl font-black uppercase tracking-tighter">No current openings</h3>
             <p className="text-slate-500 font-bold text-sm uppercase tracking-widest max-w-md mx-auto leading-relaxed">
                We don't have any active roles right now, but we're always scouting. 
                Send your portfolio to <span className="text-orange-600">careers@dutchkem.com</span> and we'll keep you in our talent pool.
             </p>
          </div>
        </div>
      </main>
    </div>
  )
}

function BenefitItem({ title, desc }: { title: string, desc: string }) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-black uppercase tracking-[0.2em] text-orange-600">{title}</h3>
      <p className="text-slate-500 font-bold leading-relaxed">{desc}</p>
    </div>
  )
}

function ProcessStep({ num, title, desc }: any) {
  return (
    <div className="flex gap-4">
      <div className="w-8 h-8 rounded-full bg-slate-950 text-white flex items-center justify-center text-xs font-black flex-shrink-0">{num}</div>
      <div className="space-y-1">
        <h4 className="text-sm font-black uppercase tracking-widest text-slate-950">{title}</h4>
        <p className="text-xs text-slate-400 font-bold leading-relaxed">{desc}</p>
      </div>
    </div>
  )
}
