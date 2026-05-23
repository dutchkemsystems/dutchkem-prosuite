import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/security')({
  component: SecurityPage,
})

function SecurityPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-300">
      <main className="max-w-5xl mx-auto px-4 py-24 md:py-32 space-y-24">
        <div className="text-center space-y-4">
          <div className="inline-block px-4 py-1 bg-emerald-500/10 text-emerald-400 text-[10px] font-black uppercase tracking-widest rounded-full border border-emerald-500/20">Bank-Grade Protection</div>
          <h1 className="text-4xl md:text-7xl font-black tracking-tighter text-white uppercase">Security Architecture</h1>
          <p className="text-slate-500 font-bold uppercase tracking-widest max-w-2xl mx-auto">
            10 layers of institutional defense protecting your data and transactions 24/7.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <SecurityLayer num="01" title="AES-256 Encryption" desc="All personal data is encrypted at rest using industry-standard AES-256 protocols." />
          <SecurityLayer num="02" title="TLS 1.3 Transmission" desc="Every byte of data in transit is shielded by TLS 1.3 encryption." />
          <SecurityLayer num="03" title="MFA Enforcement" desc="Optional for users, mandatory for all administrative access points." />
          <SecurityLayer num="04" title="Single Session Lock" desc="Prevents concurrent logins to eliminate account sharing risks." />
          <SecurityLayer num="05" title="IP Whitelisting" desc="Administrative consoles are restricted to authorized institutional IPs." />
          <SecurityLayer num="06" title="Granular Rate Limiting" desc="Automated protection against brute-force and DDoS attempts." />
          <SecurityLayer num="07" title="Guardian AI" desc="Proprietary real-time fraud detection for all financial operations." />
          <SecurityLayer num="08" title="Secure Wallet Sweep" desc="Bank details are never stored in plaintext on our servers." />
          <SecurityLayer num="09" title="Immutable Audit Logs" desc="Every platform action is recorded in non-rewritable system logs." />
          <SecurityLayer num="10" title="Penetration Testing" desc="Quarterly third-party audits by certified cybersecurity firms." />
        </div>

        <div className="pt-12 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="p-8 bg-slate-900 rounded-3xl border border-slate-800 space-y-4 text-center">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-500">PCI DSS</h3>
            <p className="text-white font-black uppercase tracking-tighter">Compliant via Kora</p>
          </div>
          <div className="p-8 bg-slate-900 rounded-3xl border border-slate-800 space-y-4 text-center">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-500">GDPR</h3>
            <p className="text-white font-black uppercase tracking-tighter">Global Data Ready</p>
          </div>
          <div className="p-8 bg-slate-900 rounded-3xl border border-slate-800 space-y-4 text-center">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-500">NDPR</h3>
            <p className="text-white font-black uppercase tracking-tighter">Nigeria Data Protection</p>
          </div>
        </div>

        <div className="p-12 bg-white text-slate-900 rounded-[3rem] shadow-2xl flex flex-col md:flex-row justify-between items-center gap-8">
           <div className="space-y-2">
             <h3 className="text-2xl font-black uppercase tracking-tight">Security Contact</h3>
             <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Report vulnerabilities or request audit reports</p>
           </div>
           <a href="mailto:security@dutchkem.com" className="px-10 py-5 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-black transition-all">security@dutchkem.com</a>
        </div>
      </main>
    </div>
  )
}

function SecurityLayer({ num, title, desc }: any) {
  return (
    <div className="p-8 bg-slate-900/50 rounded-3xl border border-slate-800 hover:border-emerald-500/30 transition-all group">
       <div className="text-emerald-500 text-xs font-black mb-4 flex justify-between items-center">
         <span>LAYER {num}</span>
         <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
       </div>
       <h3 className="text-xl font-black text-white uppercase tracking-tighter mb-2 group-hover:text-emerald-400 transition-colors">{title}</h3>
       <p className="text-sm text-slate-500 font-bold leading-relaxed">{desc}</p>
    </div>
  )
}
