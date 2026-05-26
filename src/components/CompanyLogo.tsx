interface CompanyLogoProps {
  className?: string;
  showText?: boolean;
}

export function CompanyLogo({ className = "w-16 h-16", showText = false }: CompanyLogoProps) {
  return (
    <div className={`relative flex items-center gap-4 ${className.includes('w-') ? '' : 'w-fit'}`}>
      <div className={`relative ${className} group`}>
        {/* Ornate Gold Frame (Baroque style scrolls/leaves approximation) */}
        <div className="absolute inset-[-10%] rounded-[20%] border-[3px] border-[#D4AF37] opacity-80 blur-[0.5px]"></div>
        <div className="absolute inset-[-5%] rounded-[15%] border-[2px] border-[#FFD700] shadow-[0_0_15px_rgba(212,175,55,0.4)]"></div>
        
        {/* Baroque Scrolls (Stylized) */}
        <div className="absolute -top-2 -left-2 w-6 h-6 border-t-2 border-l-2 border-[#D4AF37] rounded-tl-full rotate-12"></div>
        <div className="absolute -top-2 -right-2 w-6 h-6 border-t-2 border-r-2 border-[#D4AF37] rounded-tr-full -rotate-12"></div>
        <div className="absolute -bottom-2 -left-2 w-6 h-6 border-b-2 border-l-2 border-[#D4AF37] rounded-bl-full -rotate-12"></div>
        <div className="absolute -bottom-2 -right-2 w-6 h-6 border-b-2 border-r-2 border-[#D4AF37] rounded-br-full rotate-12"></div>

        {/* The Shield */}
        <div className="relative w-full h-full bg-[#800000] rounded-b-[40%] rounded-t-[10%] border-2 border-[#D4AF37] flex items-center justify-center overflow-hidden shadow-2xl shadow-black/50">
          {/* Subtle gold inner border */}
          <div className="absolute inset-1 border border-[#D4AF37]/30 rounded-b-[38%] rounded-t-[8%]"></div>
          
          {/* Roses (Stylized) */}
          <div className="absolute top-1 left-1 text-[10px] animate-pulse">🌹</div>
          <div className="absolute top-1 right-1 text-[10px] animate-pulse delay-75">🌹</div>
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-[12px]">🌹</div>
          <div className="absolute top-1/2 left-0 -translate-y-1/2 text-[8px] opacity-70">🌸</div>
          <div className="absolute top-1/2 right-0 -translate-y-1/2 text-[8px] opacity-70">🌸</div>

          {/* Shield Text */}
          <div className="z-10 text-center px-2">
             <span className="block text-[6px] font-serif font-bold text-[#D4AF37] uppercase tracking-tighter leading-none mb-0.5">Dutchkem</span>
             <span className="block text-[5px] font-serif text-[#FFD700] uppercase tracking-widest leading-none">Ventures</span>
          </div>
          
          {/* Metallic Sheen */}
          <div className="absolute inset-0 bg-gradient-to-tr from-white/10 via-transparent to-black/20 pointer-events-none"></div>
        </div>
        
        {/* Photorealistic Cream Roses (Emoji representation for now) */}
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-xl drop-shadow-md">🌹</div>
      </div>
      
      {showText && (
        <div className="flex flex-col">
          <span className="text-xl font-black tracking-tighter text-slate-950 uppercase leading-none">
            Dutchkem
          </span>
          <span className="text-[9px] font-black tracking-[0.3em] text-[#800000] uppercase leading-none mt-1">
            Ventures ProSuite NG+
          </span>
          <span className="text-[7px] font-bold text-slate-400 mt-0.5 uppercase tracking-widest">RC: 9489855</span>
        </div>
      )}
    </div>
  );
}
