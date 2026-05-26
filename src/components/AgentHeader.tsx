import { Link } from '@tanstack/react-router'
import { useAuthActions } from "@convex-dev/auth/react"
import { CompanyLogo } from './CompanyLogo'

export function AgentHeader({ agentName }: { agentName: string }) {
  const { signOut } = useAuthActions();

  return (
    <header className="h-24 border-b border-slate-800 flex items-center justify-between px-6 bg-slate-900/80 backdrop-blur-xl sticky top-0 z-50">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
           <button 
             onClick={() => window.history.back()}
             className="w-10 h-10 bg-slate-800 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 transition-all border border-slate-700"
             title="Go Back"
           >
             ←
           </button>
           <button 
             onClick={() => window.history.forward()}
             className="w-10 h-10 bg-slate-800 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 transition-all border border-slate-700"
             title="Go Forward"
           >
             →
           </button>
        </div>

        <Link to="/" className="group flex items-center gap-4 border-l border-slate-800 pl-6">
          <CompanyLogo className="w-12 h-12" showText />
        </Link>
      </div>

      <div className="flex items-center gap-4">
        <div className="hidden md:flex flex-col items-end mr-4">
           <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Active Workspace</span>
           <h2 className="text-base font-black text-white uppercase tracking-tight">{agentName}</h2>
        </div>

        <div className="flex items-center gap-2">
          <Link to="/" className="text-xs font-black text-white uppercase tracking-widest transition-all px-6 py-3 bg-gradient-primary rounded-xl hover:scale-105 shadow-lg shadow-orange-500/10">
             AGENT HUB
          </Link>
          <button 
            onClick={() => void signOut()}
            className="text-xs font-black text-slate-400 hover:text-red-500 uppercase tracking-widest transition-colors px-4 py-3 bg-slate-800 rounded-xl border border-slate-700 hover:border-red-500/50"
          >
            LOGOUT
          </button>
        </div>
      </div>
    </header>
  );
}
