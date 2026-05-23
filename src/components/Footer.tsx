import { Link } from '@tanstack/react-router';
import { CompanyLogo } from './CompanyLogo';

function FooterColumn({ title, links }: { title: string, links: {label: string, href: string}[] }) {
  return (
    <div className="flex flex-col gap-6">
      <h4 className="text-xs font-black uppercase tracking-[0.2em] text-slate-950">{title}</h4>
      <div className="flex flex-col gap-4">
        {links.map(link => (
          <Link key={link.label} to={link.href as any} className="text-sm font-bold text-slate-400 hover:text-orange-600 transition-colors capitalize">{link.label}</Link>
        ))}
      </div>
    </div>
  )
}

function SocialIcon({ icon }: { icon: string }) {
  return (
    <button className="w-12 h-12 rounded-2xl bg-white border border-slate-100 flex items-center justify-center hover:bg-orange-600 hover:text-white hover:border-orange-600 hover:shadow-2xl hover:shadow-orange-500/40 transition-all text-sm font-black text-slate-400 group">
      {icon}
    </button>
  );
}

export function Footer() {
  return (
    <footer className="bg-white border-t border-slate-100 py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-start gap-16">
        <div className="flex flex-col gap-6">
          <div className="flex items-center gap-3">
            <CompanyLogo className="w-14 h-14" showText />
          </div>
          <div className="space-y-1">
             <p className="text-slate-950 text-xs font-black uppercase tracking-widest">Dutchkem Ventures Prosuite NG+ — RC: 9489855</p>
             <p className="text-slate-400 text-xs font-bold leading-relaxed">
               26, Opeki Road, Ipaja, Ayobo, Lagos.<br />
               Tel: (+234)-911-339-3525<br />
               Email: contact@dutchkem.com
             </p>
          </div>
          <div className="flex gap-4">
             <SocialIcon icon="𝕏" />
             <SocialIcon icon="📸" />
             <SocialIcon icon="💼" />
          </div>
        </div>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-16 md:gap-24 text-[11px] font-black uppercase tracking-widest">
          <FooterColumn title="Platform" links={[{label: 'Features', href: '/#features'}, {label: 'Process', href: '/#how-it-works'}, {label: 'Agents', href: '/#features'}]} />
          <FooterColumn title="Company" links={[{label: 'About', href: '/about'}, {label: 'Contact', href: '/contact'}, {label: 'Careers', href: '/careers'}]} />
          <FooterColumn title="Legal" links={[{label: 'Privacy', href: '/privacy'}, {label: 'Terms', href: '/terms'}, {label: 'Security', href: '/security'}]} />
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 mt-24 pt-8 border-t border-slate-50 flex flex-col md:flex-row justify-between items-center gap-6">
         <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.3em]">© 2026 Dutchkem Ventures. RC: 9489855. All rights reserved. Edition v3.0.4</p>
         <div className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-400">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
            SYSTEMS STATUS: OPTIMAL
         </div>
      </div>
    </footer>
  );
}
