import { Link } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { useConvexAuth } from 'convex/react';
import { CompanyLogo } from './CompanyLogo';

export function Navbar() {
  const { isAuthenticated } = useConvexAuth();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [companyOpen, setCompanyOpen] = useState(false);
  const [legalOpen, setLegalOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    const close = () => { setMobileOpen(false); setCompanyOpen(false); setLegalOpen(false); };
    window.addEventListener('resize', close);
    return () => window.removeEventListener('resize', close);
  }, []);

  return (
    <>
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        isScrolled ? 'py-3 md:py-4 bg-white/90 backdrop-blur-xl shadow-2xl shadow-orange-500/10' : 'py-4 md:py-8 bg-transparent'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <Link to="/" className="flex items-center gap-3 group cursor-pointer">
              <CompanyLogo className="w-10 h-10 md:w-14 md:h-14" showText />
            </Link>
            
            {/* Desktop Nav */}
            <div className="hidden lg:flex items-center gap-6 xl:gap-8 text-[11px] font-black uppercase tracking-widest text-slate-500">
              <Link to="/" className="hover:text-orange-600 transition-colors text-slate-600 py-2">Platform</Link>
              <Link to="/" hash="features" className="hover:text-orange-600 transition-colors text-slate-600 py-2">Features</Link>
              <Link to="/" hash="how-it-works" className="hover:text-orange-600 transition-colors text-slate-600 py-2">Process</Link>
              
              {/* Company Dropdown - Click/tap on desktop, hover also works */}
              <div className="relative">
                <button 
                  onClick={() => { setCompanyOpen(!companyOpen); setLegalOpen(false); }}
                  onMouseEnter={() => setCompanyOpen(true)}
                  onMouseLeave={() => setCompanyOpen(false)}
                  className="flex items-center gap-1 hover:text-orange-600 transition-colors text-slate-600 uppercase tracking-widest font-black py-2"
                >
                  Company <span className="text-[8px]">▼</span>
                </button>
                <div 
                  className={`absolute top-full left-0 pt-2 transition-all duration-200 ${companyOpen ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-2 pointer-events-none'}`}
                  onMouseEnter={() => setCompanyOpen(true)}
                  onMouseLeave={() => setCompanyOpen(false)}
                >
                  <div className="bg-white border border-slate-100 rounded-2xl shadow-2xl p-4 min-w-[160px] flex flex-col gap-1">
                    <Link to="/about" onClick={() => setCompanyOpen(false)} className="hover:text-orange-600 transition-colors py-2 px-3 rounded-lg hover:bg-orange-50">About</Link>
                    <Link to="/contact" onClick={() => setCompanyOpen(false)} className="hover:text-orange-600 transition-colors py-2 px-3 rounded-lg hover:bg-orange-50">Contact</Link>
                    <Link to="/careers" onClick={() => setCompanyOpen(false)} className="hover:text-orange-600 transition-colors py-2 px-3 rounded-lg hover:bg-orange-50">Careers</Link>
                  </div>
                </div>
              </div>

              {/* Legal Dropdown */}
              <div className="relative">
                <button 
                  onClick={() => { setLegalOpen(!legalOpen); setCompanyOpen(false); }}
                  onMouseEnter={() => setLegalOpen(true)}
                  onMouseLeave={() => setLegalOpen(false)}
                  className="flex items-center gap-1 hover:text-orange-600 transition-colors text-slate-600 uppercase tracking-widest font-black py-2"
                >
                  Legal <span className="text-[8px]">▼</span>
                </button>
                <div 
                  className={`absolute top-full left-0 pt-2 transition-all duration-200 ${legalOpen ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-2 pointer-events-none'}`}
                  onMouseEnter={() => setLegalOpen(true)}
                  onMouseLeave={() => setLegalOpen(false)}
                >
                  <div className="bg-white border border-slate-100 rounded-2xl shadow-2xl p-4 min-w-[160px] flex flex-col gap-1">
                    <Link to="/privacy" onClick={() => setLegalOpen(false)} className="hover:text-orange-600 transition-colors py-2 px-3 rounded-lg hover:bg-orange-50">Privacy</Link>
                    <Link to="/terms" onClick={() => setLegalOpen(false)} className="hover:text-orange-600 transition-colors py-2 px-3 rounded-lg hover:bg-orange-50">Terms</Link>
                    <Link to="/security" onClick={() => setLegalOpen(false)} className="hover:text-orange-600 transition-colors py-2 px-3 rounded-lg hover:bg-orange-50">Security</Link>
                  </div>
                </div>
              </div>
              
              {isAuthenticated ? (
                <Link to="/dashboard" className="px-6 py-3 bg-slate-900 text-white rounded-2xl hover:bg-black transition-all shadow-xl shadow-slate-900/20 flex items-center gap-2 font-black ml-2">
                  DASHBOARD <span className="text-orange-500">→</span>
                </Link>
              ) : (
                <Link to="/auth" className="px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-2xl shadow-orange-500/30 flex items-center gap-2 font-black ml-2">
                  GET STARTED <span>🔥</span>
                </Link>
              )}
            </div>

            {/* Mobile Hamburger */}
            <button 
              onClick={() => setMobileOpen(!mobileOpen)}
              className="lg:hidden w-12 h-12 flex items-center justify-center text-slate-900 rounded-xl hover:bg-slate-100 transition-colors"
              aria-label="Toggle menu"
            >
              {mobileOpen ? (
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"></path></svg>
              ) : (
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 6h16M4 12h16m-7 6h7"></path></svg>
              )}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Menu Drawer */}
      <div className={`fixed inset-0 z-40 lg:hidden transition-all duration-300 ${mobileOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setMobileOpen(false)}></div>
        <div className={`absolute top-0 right-0 h-full w-80 max-w-[85vw] bg-white shadow-2xl transform transition-transform duration-300 ${mobileOpen ? 'translate-x-0' : 'translate-x-full'}`}>
          <div className="p-6 border-b border-slate-100 flex justify-between items-center">
            <CompanyLogo className="w-10 h-10" />
            <button onClick={() => setMobileOpen(false)} className="w-12 h-12 flex items-center justify-center rounded-xl hover:bg-slate-100" aria-label="Close menu">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
          </div>
          
          <div className="p-6 space-y-2">
            <Link to="/" onClick={() => setMobileOpen(false)} className="block py-3 px-4 text-sm font-bold text-slate-700 hover:bg-orange-50 hover:text-orange-600 rounded-xl transition-colors">Platform</Link>
            <Link to="/" hash="features" onClick={() => setMobileOpen(false)} className="block py-3 px-4 text-sm font-bold text-slate-700 hover:bg-orange-50 hover:text-orange-600 rounded-xl transition-colors">Features</Link>
            <Link to="/" hash="how-it-works" onClick={() => setMobileOpen(false)} className="block py-3 px-4 text-sm font-bold text-slate-700 hover:bg-orange-50 hover:text-orange-600 rounded-xl transition-colors">Process</Link>
            
            {/* Mobile Company */}
            <button onClick={() => setCompanyOpen(!companyOpen)} className="flex items-center justify-between w-full py-3 px-4 text-sm font-bold text-slate-700 hover:bg-orange-50 hover:text-orange-600 rounded-xl transition-colors">
              Company <span className={`text-xs transition-transform ${companyOpen ? 'rotate-180' : ''}`}>▼</span>
            </button>
            {companyOpen && (
              <div className="pl-4 space-y-1">
                <Link to="/about" onClick={() => setMobileOpen(false)} className="block py-2 px-4 text-sm text-slate-600 hover:text-orange-600 rounded-lg">About</Link>
                <Link to="/contact" onClick={() => setMobileOpen(false)} className="block py-2 px-4 text-sm text-slate-600 hover:text-orange-600 rounded-lg">Contact</Link>
                <Link to="/careers" onClick={() => setMobileOpen(false)} className="block py-2 px-4 text-sm text-slate-600 hover:text-orange-600 rounded-lg">Careers</Link>
              </div>
            )}
            
            {/* Mobile Legal */}
            <button onClick={() => setLegalOpen(!legalOpen)} className="flex items-center justify-between w-full py-3 px-4 text-sm font-bold text-slate-700 hover:bg-orange-50 hover:text-orange-600 rounded-xl transition-colors">
              Legal <span className={`text-xs transition-transform ${legalOpen ? 'rotate-180' : ''}`}>▼</span>
            </button>
            {legalOpen && (
              <div className="pl-4 space-y-1">
                <Link to="/privacy" onClick={() => setMobileOpen(false)} className="block py-2 px-4 text-sm text-slate-600 hover:text-orange-600 rounded-lg">Privacy</Link>
                <Link to="/terms" onClick={() => setMobileOpen(false)} className="block py-2 px-4 text-sm text-slate-600 hover:text-orange-600 rounded-lg">Terms</Link>
                <Link to="/security" onClick={() => setMobileOpen(false)} className="block py-2 px-4 text-sm text-slate-600 hover:text-orange-600 rounded-lg">Security</Link>
              </div>
            )}
            
            <div className="pt-4 border-t border-slate-100">
              {isAuthenticated ? (
                <Link to="/dashboard" onClick={() => setMobileOpen(false)} className="block w-full py-4 bg-slate-900 text-white text-center rounded-2xl font-black text-sm">DASHBOARD →</Link>
              ) : (
                <Link to="/auth" onClick={() => setMobileOpen(false)} className="block w-full py-4 bg-gradient-to-r from-orange-500 to-orange-600 text-white text-center rounded-2xl font-black text-sm">GET STARTED 🔥</Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
