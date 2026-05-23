import { Link } from '@tanstack/react-router';
import { useState, useEffect } from 'react';
import { useConvexAuth } from 'convex/react';
import { CompanyLogo } from './CompanyLogo';

export function Navbar() {
  const { isAuthenticated } = useConvexAuth();
  const [isScrolled, setIsScrolled] = useState(false);
  const [showCompanyMenu, setShowCompanyMenu] = useState(false);
  const [showLegalMenu, setShowLegalMenu] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
      isScrolled ? 'py-4 bg-white/80 backdrop-blur-md shadow-2xl shadow-orange-500/10' : 'py-8 bg-transparent'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center">
          <Link to="/" className="flex items-center gap-4 group cursor-pointer">
            <CompanyLogo className="w-14 h-14" showText />
          </Link>
          
          <div className="hidden lg:flex items-center gap-8 text-[11px] font-black uppercase tracking-widest text-slate-500">
            <Link to="/" className="hover:text-orange-600 transition-colors text-slate-600">Platform</Link>
            <Link to="/" hash="features" className="hover:text-orange-600 transition-colors text-slate-600">Features</Link>
            <Link to="/" hash="how-it-works" className="hover:text-orange-600 transition-colors text-slate-600">Process</Link>
            
            <div className="relative group" onMouseEnter={() => setShowCompanyMenu(true)} onMouseLeave={() => setShowCompanyMenu(false)}>
              <button className="flex items-center gap-1 hover:text-orange-600 transition-colors text-slate-600 uppercase tracking-widest font-black">
                Company <span className="text-[8px]">▼</span>
              </button>
              <div className={`absolute top-full left-0 pt-4 transition-all duration-300 ${showCompanyMenu ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'}`}>
                <div className="bg-white border border-slate-100 rounded-2xl shadow-2xl p-6 min-w-[160px] flex flex-col gap-4">
                  <Link to="/about" className="hover:text-orange-600 transition-colors">About</Link>
                  <Link to="/contact" className="hover:text-orange-600 transition-colors">Contact</Link>
                  <Link to="/careers" className="hover:text-orange-600 transition-colors">Careers</Link>
                </div>
              </div>
            </div>

            <div className="relative group" onMouseEnter={() => setShowLegalMenu(true)} onMouseLeave={() => setShowLegalMenu(false)}>
              <button className="flex items-center gap-1 hover:text-orange-600 transition-colors text-slate-600 uppercase tracking-widest font-black">
                Legal <span className="text-[8px]">▼</span>
              </button>
              <div className={`absolute top-full left-0 pt-4 transition-all duration-300 ${showLegalMenu ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'}`}>
                <div className="bg-white border border-slate-100 rounded-2xl shadow-2xl p-6 min-w-[160px] flex flex-col gap-4">
                  <Link to="/privacy" className="hover:text-orange-600 transition-colors">Privacy</Link>
                  <Link to="/terms" className="hover:text-orange-600 transition-colors">Terms</Link>
                  <Link to="/security" className="hover:text-orange-600 transition-colors">Security</Link>
                </div>
              </div>
            </div>
            
            {isAuthenticated ? (
              <Link to="/dashboard" className="px-8 py-4 bg-slate-900 text-white rounded-2xl hover:bg-black transition-all transform hover:scale-105 shadow-xl shadow-slate-900/20 flex items-center gap-2 font-black ml-4">
                DASHBOARD <span className="text-orange-500">→</span>
              </Link>
            ) : (
              <Link to="/auth" className="px-8 py-4 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-2xl shadow-orange-500/30 flex items-center gap-2 font-black ml-4">
                GET STARTED <span className="animate-pulse">🔥</span>
              </Link>
            )}
          </div>

          <button className="lg:hidden w-10 h-10 flex items-center justify-center text-slate-900">
             <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M4 6h16M4 12h16m-7 6h7"></path></svg>
          </button>
        </div>
      </div>
    </nav>
  );
}
