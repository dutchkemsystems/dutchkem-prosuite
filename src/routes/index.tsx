import { Link, createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { useSuspenseQuery } from "@tanstack/react-query";
import { convexQuery } from "@convex-dev/react-query";
import { api } from "../../convex/_generated/api";
import { JoinCounter, SuccessStoriesRotator } from '~/components/SuccessStoriesRotator';

function StatItem({ value, label }: { value: string, label: string }) {
  return (
    <div className="p-10 glass-card rounded-[3rem] hover:scale-105 transition-all cursor-default group border border-slate-200/50">
      <p className="text-5xl font-black text-slate-950 mb-3 group-hover:text-orange-500 transition-colors tracking-tighter leading-none">{value}</p>
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] leading-none">{label}</p>
    </div>
  )
}

function AgentCard({ icon, title, desc, link, isPopular }: { icon: string, title: string, desc: string, link: string, isPopular?: boolean }) {
  return (
    <Link to={link} className="group relative p-0.5 bg-gradient-to-br from-slate-200 via-slate-100 to-slate-200 rounded-[3rem] hover:from-orange-400 hover:to-orange-600 transition-all duration-700 shadow-2xl shadow-slate-200/40 overflow-hidden active:scale-[0.98]">
      {isPopular && (
        <div className="absolute top-10 right-[-3.5rem] rotate-45 bg-orange-600 text-white text-[9px] font-black py-2 px-16 shadow-2xl z-10 uppercase tracking-[0.3em]">
           POPULAR
        </div>
      )}
      <div className="h-full bg-white p-12 rounded-[2.9rem] transition-all flex flex-col items-center text-center group-hover:bg-slate-50/30">
        <div className="w-28 h-24 bg-slate-50 rounded-full flex items-center justify-center text-5xl mb-10 shadow-inner group-hover:scale-110 group-hover:rotate-3 transition-all relative overflow-hidden border border-slate-100">
           <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-orange-600/5 opacity-5 group-hover:opacity-20 transition-opacity"></div>
           {icon}
        </div>
        <h3 className="text-2xl font-black text-slate-950 mb-4 group-hover:text-orange-600 transition-colors uppercase tracking-tighter leading-none">{title}</h3>
        <p className="text-slate-500 leading-relaxed text-sm font-bold mb-12 opacity-80 group-hover:opacity-100 transition-opacity">
          {desc}
        </p>
        <div className="mt-auto flex items-center gap-3 text-[11px] font-black uppercase tracking-[0.3em] text-orange-600 group-hover:gap-6 transition-all">
          EXPLORE AGENT <span className="text-lg">→</span>
        </div>
      </div>
    </Link>
  )
}

function ProcessStep({ step, title, desc }: { step: string, title: string, desc: string }) {
  return (
    <div className="flex flex-col items-center text-center group cursor-default relative">
      <div className="w-24 h-24 bg-slate-900 rounded-[2.5rem] flex items-center justify-center mb-10 relative border-2 border-slate-800 group-hover:border-orange-500 transition-all shadow-2xl group-hover:shadow-orange-500/20">
         <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 to-orange-600/10 opacity-0 group-hover:opacity-100 transition-opacity rounded-[2.4rem]"></div>
         <span className="text-3xl font-black relative z-10 text-slate-700 group-hover:text-white transition-colors">{step}</span>
         <div className="absolute inset-0 rounded-[2.5rem] bg-orange-500/20 animate-ping opacity-0 group-hover:opacity-100 transition-opacity"></div>
      </div>
      <h3 className="text-xl font-black uppercase tracking-widest mb-4 text-white group-hover:text-orange-500 transition-colors">{title}</h3>
      <p className="text-sm text-slate-500 font-bold leading-relaxed max-w-[240px] uppercase tracking-tighter">{desc}</p>
    </div>
  )
}

function PriceCard({ title, price, features, isFeatured, savings }: { title: string, price: string, features: Array<string>, isFeatured?: boolean, savings?: string }) {
  const { data: discount } = useSuspenseQuery(convexQuery(api.holidays.getActiveDiscount, {}));
  
  const originalPrice = parseInt(price.replace(/,/g, ''));
  const discountPercent = (discount)?.percent || 0;
  const discountedPrice = discountPercent > 0 ? Math.floor(originalPrice * (1 - discountPercent / 100)) : originalPrice;

  return (
    <div className={`p-0.5 rounded-[3.5rem] relative transition-all duration-700 hover:scale-[1.04] ${
      isFeatured ? 'bg-gradient-to-br from-orange-500 to-orange-600 shadow-[0_40px_120px_rgba(255,107,53,0.35)]' : 'bg-slate-200 hover:bg-slate-300 shadow-2xl'
    }`}>
      {(savings || discountPercent > 0) && (
        <div className={`absolute top-12 -right-4 px-6 py-2.5 ${discountPercent > 0 ? 'bg-red-600' : 'bg-emerald-500'} text-white text-[10px] font-black rounded-2xl shadow-2xl animate-bounce uppercase tracking-[0.3em] z-10 border-4 border-white`}>
           {discountPercent > 0 ? `${discountPercent}% HOLIDAY` : `${savings} OFF`}
        </div>
      )}
      <div className="bg-white p-14 rounded-[3.4rem] flex flex-col h-full items-center text-center relative overflow-hidden">
        {isFeatured && <div className="absolute top-0 left-0 w-full h-3 bg-gradient-to-r from-orange-500 to-orange-600"></div>}
        <h3 className="text-[11px] font-black uppercase tracking-[0.5em] text-slate-300 mb-12">{title}</h3>
        <div className="flex flex-col items-center mb-14">
          {discountPercent > 0 && (
            <span className="text-sm font-bold text-slate-400 line-through opacity-50 mb-1">
              ₦{price}
            </span>
          )}
          <div className="flex items-baseline gap-1 sm:gap-2">
             <span className="text-2xl sm:text-4xl font-black text-slate-950 tracking-tighter">₦</span>
             <span className="text-4xl sm:text-6xl lg:text-8xl font-black text-slate-950 tracking-tighter">{discountedPrice.toLocaleString()}</span>
             <span className="text-xs sm:text-sm font-black text-slate-400 uppercase tracking-widest">/month</span>
          </div>
        </div>
        <div className="w-full space-y-7 mb-20 flex-grow text-left">
          {features.map((f, i) => (
            <div key={i} className="flex items-center gap-5 text-sm font-bold text-slate-700 group/item">
               <span className="w-7 h-7 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-[11px] font-black border border-emerald-100">✓</span> 
               <span className="group-hover/item:translate-x-2 transition-transform">{f}</span>
            </div>
          ))}
        </div>
        <Link to="/auth" className={`block w-full py-7 rounded-[2rem] font-black text-[11px] uppercase tracking-[0.4em] transition-all shadow-xl text-center ${
          isFeatured 
            ? 'bg-slate-950 text-white hover:bg-black active:scale-95 shadow-slate-900/20' 
            : 'bg-slate-100 text-slate-950 hover:bg-slate-200 shadow-slate-200/50'
        }`}>
          GET STARTED NOW
        </Link>
      </div>
    </div>
  )
}

function TestimonialCard({ author, role, content }: { author: string, role: string, content: string }) {
  return (
    <div className="p-12 bg-white rounded-[3rem] shadow-2xl shadow-slate-200/50 border border-slate-100 hover:border-orange-500/30 transition-all group relative overflow-hidden">
       <div className="absolute top-10 right-12 text-6xl text-slate-50 font-serif leading-none select-none">“</div>
       <div className="flex gap-1 text-orange-400 mb-8">
          {"★★★★★".split("").map((_s, i) => <span key={i} className="text-xl">★</span>)}
       </div>
       <p className="text-xl text-slate-700 font-bold tracking-tight leading-relaxed mb-10 relative z-10 italic">
          {content}
       </p>
       <div className="flex items-center gap-5 relative z-10">
          <div className="w-16 h-16 bg-slate-950 rounded-2xl flex items-center justify-center text-white font-black text-2xl shadow-xl group-hover:rotate-6 transition-transform">{author[0]}</div>
          <div className="text-left">
             <p className="text-lg font-black uppercase tracking-tighter text-slate-950">{author}</p>
             <p className="text-[10px] font-black text-orange-600 uppercase tracking-[0.3em]">{role}</p>
          </div>
       </div>
    </div>
  )
}

function Home() {
  const [completedToday, setCompletedToday] = useState(847);
  const [showBackToTop, setShowBackToTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 500);
    };
    window.addEventListener('scroll', handleScroll);

    const interval = setInterval(() => {
      setCompletedToday(prev => prev + Math.floor(Math.random() * 2));
    }, 5000);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      clearInterval(interval);
    };
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 text-slate-900 selection:bg-orange-100 selection:text-orange-900 overflow-x-hidden">
      <main className="flex-grow">
        {/* Hero Section */}
        <section className="relative pt-32 pb-32 lg:pt-48 lg:pb-48 overflow-hidden">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,theme(colors.orange.50),transparent)]"></div>
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-orange-400/10 rounded-full blur-[120px] animate-float"></div>
          <div className="absolute bottom-1/4 right-1/4 w-[30rem] h-[30rem] bg-indigo-400/5 rounded-full blur-[120px] animate-float" style={{ animationDelay: '-3s' }}></div>

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative">
            <div className="inline-flex items-center gap-2 rounded-full px-6 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-orange-600 ring-2 ring-orange-600/10 mb-12 bg-white shadow-xl animate-in fade-in slide-in-from-top-4 duration-700">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
              </span>
              🔥 15 Expert Agents Live — 24/7
            </div>
            
            <h1 className="clamp-h1 font-black tracking-[-0.04em] text-slate-950 mb-10 leading-[0.95] animate-in fade-in slide-in-from-bottom-12 duration-1000">
              Stop <span className="italic font-serif text-slate-400 underline decoration-orange-500/20">Struggling</span>. <br />
              <span className="text-gradient-primary">Start Winning.</span>
            </h1>
            
            <p className="text-lg md:text-xl text-slate-500 max-w-2xl mx-auto mb-16 leading-relaxed font-medium animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-200">
              Transform your business with 15 expert agents that write your essays, 
              optimize your business models, and secure your growth with bank-grade intelligence.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-6 justify-center items-center animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-300">
              <Link to="/auth" className="group relative px-12 py-6 bg-slate-950 text-white font-black text-sm uppercase tracking-widest rounded-3xl shadow-2xl hover:scale-105 active:scale-95 transition-all overflow-hidden border-2 border-slate-800">
                <span className="relative z-10 flex items-center gap-3">Deploy Expert Workforce <span className="group-hover:translate-x-2 transition-transform">→</span></span>
                <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 to-orange-600/10 opacity-0 group-hover:opacity-10 transition-opacity"></div>
              </Link>
              <a href="#features" className="px-12 py-6 bg-white text-slate-900 font-black text-sm uppercase tracking-widest rounded-3xl border-2 border-slate-100 hover:bg-slate-50 transition-all hover:border-slate-200 shadow-xl shadow-slate-200/50">
                Browse 15 Agents
              </a>
            </div>

            <p className="mt-8 text-[10px] font-black uppercase tracking-[0.4em] text-slate-300">RC: 9489855</p>

            {/* Live Stats Ticker */}
            <div className="mt-20 flex flex-col items-center gap-4 animate-in fade-in duration-1000 delay-500">
               <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Real-time Performance</p>
               <div className="flex items-center gap-3 px-6 py-3 bg-slate-900 rounded-2xl text-white font-black text-sm shadow-2xl border border-slate-800">
                  <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                  <span className="text-orange-500 font-mono">{completedToday.toLocaleString()}</span> PROJECTS COMPLETED TODAY
               </div>
            </div>

            {/* Micro-interaction Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto mt-24">
              <StatItem value="10,000+" label="Active Clients" />
              <StatItem value="4.9★" label="Trust Rating" />
              <StatItem value="15" label="Expert Agents Ready Now" />
            </div>
          </div>
        </section>

        {/* Logo Cloud */}
        <section className="py-20 border-y border-slate-100 bg-white">
          <div className="max-w-7xl mx-auto px-4 text-center">
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-300 mb-12">Authorized Payment Partners</p>
            <div className="flex flex-wrap justify-center items-center gap-16 md:gap-24 grayscale opacity-30 hover:grayscale-0 hover:opacity-100 transition-all duration-700 font-black text-slate-900 text-2xl tracking-tighter">
               <div>PAYSTACK</div>
               <div>KORAPAY</div>
               <div>FLUTTERWAVE</div>
               <div>OPAY</div>
               <div>STRIPE</div>
            </div>
          </div>
        </section>

        {/* Agents Grid */}
        <section id="features" className="py-32 relative bg-slate-50">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.02] pointer-events-none"></div>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center mb-24">
            <h2 className="clamp-h2 font-black text-slate-950 mb-6 uppercase tracking-tighter">One Platform. 15 Experts. Zero Stress.</h2>
            <div className="w-32 h-2 bg-gradient-to-r from-orange-500 to-orange-600 mx-auto rounded-full mb-10"></div>
            <p className="text-lg text-slate-500 max-w-2xl mx-auto font-bold uppercase tracking-widest leading-relaxed">
              Expert Agents Ready Now — Professional Intelligence for every vertical.
            </p>
          </div>
          
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10">
            <AgentCard icon="🎓" title="Academic Writer" link="/academic-writer" desc="Expert academic writer: thesis specialist, research papers, and dissertation support." />
            <AgentCard icon="💼" title="Business Advisor" link="/business-consultant" desc="Expert business planning: institutional-grade plans and strategic models." isPopular />
            <AgentCard icon="✍️" title="Content Strategist" link="/content-writer" desc="Expert content writer: viral social media captions and high-converting sales copy." />
            <AgentCard icon="📄" title="Career Coach" link="/career-coach" desc="Expert career services: ATS-friendly CVs and LinkedIn optimization for pros." />
            <AgentCard icon="🛍️" title="Personal Shopper" link="/personal-shopper" desc="Expert shopping agent: real-time price comparisons across global stores." />
            <AgentCard icon="📝" title="Exam Specialist" link="/exam-prep" desc="Expert exam prep: PMP, CFA, AWS, GRE, and GMAT preparation guides." />
            <AgentCard icon="💰" title="Finance Advisor" link="/finance-advisor" desc="Expert finance advisor: personalized budgeting and investment strategies." />
            <AgentCard icon="🎬" title="MediaStudio Pro" link="/video-production" desc="Expert film production: cinematic 2D/3D animation and anime series pilots." isPopular />
            <AgentCard icon="🏥" title="Wellness Coach" link="/wellness-coach" desc="Expert wellness coaching: personalized 7-day meal plans and home workouts." />
            <AgentCard icon="🧹" title="Home Specialist" link="/home-management" desc="Expert home management: cleaning schedules and seasonal maintenance planning." />
            <AgentCard icon="🗣️" title="Language Coach" link="/language-coach" desc="Expert language coaching: translate across 16 languages with live practice." />
            <AgentCard icon="✈️" title="Travel Planner" link="/travel-planner" desc="Expert travel planning: detailed itineraries for Nigerian and global travel." />
            <AgentCard icon="🚀" title="Exam & Career Success" link="/exam-success" desc="Expert-powered exam success: JAMB/WAEC prep and interview coaching." isPopular />
            <AgentCard icon="🗣️📝" title="Translation Hub" link="/translation-hub" desc="Expert hybrid language services: Professional translation hub." />
            <AgentCard icon="🎉" title="Event Coordinator" link="/event-planner" desc="Expert event planning: full-scale planning for corporate galas and weddings." />
          </div>
        </section>

        {/* Process Section */}
        <section id="how-it-works" className="py-32 bg-slate-950 text-white overflow-hidden relative">
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,theme(colors.indigo.900/20),transparent)]"></div>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center mb-32 relative z-10">
            <h2 className="clamp-h2 font-black uppercase tracking-widest mb-6">Simple Deployment</h2>
            <p className="text-slate-500 font-bold uppercase tracking-[0.3em]">Four steps to absolute efficiency.</p>
          </div>

          <div className="max-w-7xl mx-auto px-4 relative z-10">
             <div className="hidden lg:block timeline-connector opacity-50"></div>
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-16 relative">
                <ProcessStep step="01" title="Choose Agent" desc="Select from our elite 15 specialized expert agents tailored for your vertical." />
                <ProcessStep step="02" title="Brief the Agent" desc="Provide your project goals and specific requirements via our secure portal." />
                <ProcessStep step="03" title="Agent Execution" desc="Our high-performance NVIDIA NIM AI models generate your output with 99.9% accuracy." />
                <ProcessStep step="04" title="Deploy" desc="Download your verified files and scale your operations instantly." />
             </div>
          </div>
        </section>

        {/* Pricing Bundles */}
        <section id="pricing" className="py-32 bg-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-orange-100/30 blur-[100px] -translate-y-1/2 translate-x-1/2"></div>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center mb-24 relative z-10">
            <h2 className="clamp-h2 font-black text-slate-950 mb-6 uppercase tracking-tighter">Value Bundles</h2>
            <div className="w-24 h-1.5 bg-orange-500 mx-auto rounded-full mb-8"></div>
            <p className="text-lg text-slate-500 font-bold uppercase tracking-widest">Premium intelligence, scalable pricing.</p>
          </div>

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-3 gap-10 items-stretch relative z-10">
            <PriceCard 
              title="Starter Bundle" 
              price="5,000" 
              features={["3 Specialized Agents", "Standard Support", "Standard Latency", "Basic Analytics"]} 
            />
            <PriceCard 
              title="Pro Suite NG+" 
              price="15,000" 
              isFeatured
              savings="₦1,500"
              features={["All 15 Specialized Expert Agents", "Priority Support", "NVIDIA NIM AI Latency", "Guardian AI Monitoring", "Bulk Exports"]} 
            />
            <PriceCard 
              title="Enterprise Elite" 
              price="50,000" 
              features={["Custom API Access", "Dedicated Success Manager", "White-label Output", "Unlimited Revisions", "On-prem Options"]} 
            />
          </div>
        </section>

        {/* Testimonials */}
        <section className="py-32 bg-slate-50 relative overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 text-center mb-24">
            <h3 className="text-xl font-black uppercase tracking-tight text-slate-950 mb-6">Agent Verdicts</h3>
            <p className="text-slate-500 font-bold uppercase tracking-[0.2em] italic">Validated by leading innovators.</p>
          </div>
          <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-2 gap-10">
            <TestimonialCard 
              author="Adeola O." 
              role="CEO, Lagos Ventures"
              content="The Business Advisor agent built a 50-page financial model in seconds. It saved us months of analyst time and significant capital."
            />
            <TestimonialCard 
              author="Musa B." 
              role="Freelance Developer"
              content="The Content Strategist agent creates social posts that actually convert. My engagement up by 400% in just two weeks of deployment."
            />
            <TestimonialCard 
              author="Chinelo K." 
              role="Academic Researcher"
              content="The Academic Writer is peerless. The citations are perfect and the depth of analysis is PhD level. A total game changer for my thesis."
            />
            <TestimonialCard 
              author="Oladotun A." 
              role="Tech Entrepreneur"
              content="Guardian AI gives me peace of mind. I know every payment is verified and my data is secure within the ProSuite ecosystem."
            />
          </div>
        </section>

        {/* Rotating Success Stories — additive, uses real reviews from database */}
        <section className="py-24 bg-white relative overflow-hidden">
          <div className="max-w-3xl mx-auto px-4">
            <SuccessStoriesRotator intervalMs={7000} />
          </div>
        </section>

        {/* Final CTA */}
        <section className="relative py-48 bg-slate-950 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-orange-600/10 to-indigo-600/10"></div>

          <div className="max-w-4xl mx-auto px-4 text-center relative z-10">
            <div className="mb-8 flex justify-center">
              <JoinCounter baseCount={10000} />
            </div>
            <h2 className="text-5xl md:text-7xl font-black text-white mb-12 leading-[1.1] tracking-tighter">Ready to Deploy Your <br /><span className="text-gradient-primary">Digital Workforce?</span></h2>
            <Link to="/auth" className="inline-flex items-center gap-6 px-16 py-8 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-black text-2xl rounded-full shadow-[0_20px_80px_rgba(255,107,53,0.5)] hover:scale-105 active:scale-95 transition-all group animate-pulse-glow">
                   LAUNCH NOW 🚀
                   <span className="group-hover:translate-x-3 transition-transform text-3xl">→</span>
                </Link>
            <p className="mt-12 text-slate-500 font-black uppercase tracking-[0.4em] text-[10px]">Bank-Grade Encryption Enabled • RC: 9489855 • End-to-End Secure</p>
          </div>
        </section>
      </main>

      {/* Back to Top Button */}
      <button 
        onClick={scrollToTop}
        className={`fixed bottom-10 right-10 w-16 h-16 bg-white border-2 border-slate-100 shadow-2xl rounded-2xl flex items-center justify-center text-2xl hover:bg-slate-50 transition-all z-40 transform ${
          showBackToTop ? 'translate-y-0 opacity-100' : 'translate-y-24 opacity-0'
        }`}
      >
        🔝
      </button>
    </div>
  )
}

export const Route = createFileRoute('/')({
  component: Home,
})
