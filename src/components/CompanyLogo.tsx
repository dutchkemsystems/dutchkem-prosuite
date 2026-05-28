interface CompanyLogoProps {
  className?: string;
  showText?: boolean;
}

export function CompanyLogo({ className = "w-16 h-16", showText = false }: CompanyLogoProps) {
  return (
    <div className={`relative flex items-center gap-4 ${className.includes('w-') ? '' : 'w-fit'}`}>
      <div className={`relative ${className} group`}>
        <svg viewBox="0 0 200 240" className="w-full h-full drop-shadow-2xl" xmlns="http://www.w3.org/2000/svg">
          {/* Outer ornate frame */}
          <defs>
            <linearGradient id="shieldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#8B0000" />
              <stop offset="50%" stopColor="#A52A2A" />
              <stop offset="100%" stopColor="#800000" />
            </linearGradient>
            <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#D4AF37" />
              <stop offset="50%" stopColor="#FFD700" />
              <stop offset="100%" stopColor="#B8860B" />
            </linearGradient>
            <linearGradient id="roseGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#F5E6D3" />
              <stop offset="50%" stopColor="#E8D5B7" />
              <stop offset="100%" stopColor="#DEC4A0" />
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
              <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
          </defs>

          {/* Ornate outer frame - baroque style */}
          <path d="M100 5 L170 30 L190 80 L185 140 L170 180 L140 210 L100 230 L60 210 L30 180 L15 140 L10 80 L30 30 Z" 
                fill="url(#goldGrad)" stroke="#B8860B" strokeWidth="2" filter="url(#glow)"/>
          
          {/* Inner shield */}
          <path d="M100 15 L162 38 L180 82 L176 135 L162 172 L135 200 L100 218 L65 200 L38 172 L24 135 L20 82 L38 38 Z" 
                fill="url(#shieldGrad)" stroke="#D4AF37" strokeWidth="1.5"/>
          
          {/* Gold inner border */}
          <path d="M100 22 L155 42 L172 82 L168 130 L155 165 L132 192 L100 208 L68 192 L45 165 L32 130 L28 82 L45 42 Z" 
                fill="none" stroke="#D4AF37" strokeWidth="0.8" opacity="0.5"/>

          {/* Top rose */}
          <ellipse cx="100" cy="28" rx="18" ry="14" fill="url(#roseGrad)" stroke="#C4A882" strokeWidth="0.5"/>
          <path d="M92 28 Q100 18 108 28 Q100 22 92 28" fill="#E8D5B7" opacity="0.7"/>
          <path d="M88 32 Q100 20 112 32" fill="none" stroke="#C4A882" strokeWidth="0.5"/>
          
          {/* Top leaves */}
          <path d="M78 20 Q85 10 95 18" fill="#2D5016" opacity="0.8"/>
          <path d="M122 20 Q115 10 105 18" fill="#2D5016" opacity="0.8"/>
          <path d="M72 28 Q80 18 88 25" fill="#3A6B1E" opacity="0.6"/>
          <path d="M128 28 Q120 18 112 25" fill="#3A6B1E" opacity="0.6"/>

          {/* Left rose */}
          <ellipse cx="35" cy="110" rx="14" ry="12" fill="url(#roseGrad)" stroke="#C4A882" strokeWidth="0.5"/>
          <path d="M28 110 Q35 100 42 110 Q35 104 28 110" fill="#E8D5B7" opacity="0.7"/>
          
          {/* Left leaves */}
          <path d="M22 95 Q30 85 38 92" fill="#2D5016" opacity="0.8"/>
          <path d="M18 105 Q25 95 33 100" fill="#3A6B1E" opacity="0.6"/>
          <path d="M20 125 Q28 118 35 122" fill="#2D5016" opacity="0.7"/>

          {/* Right rose */}
          <ellipse cx="165" cy="110" rx="14" ry="12" fill="url(#roseGrad)" stroke="#C4A882" strokeWidth="0.5"/>
          <path d="M158 110 Q165 100 172 110 Q165 104 158 110" fill="#E8D5B7" opacity="0.7"/>
          
          {/* Right leaves */}
          <path d="M178 95 Q170 85 162 92" fill="#2D5016" opacity="0.8"/>
          <path d="M182 105 Q175 95 167 100" fill="#3A6B1E" opacity="0.6"/>
          <path d="M180 125 Q172 118 165 122" fill="#2D5016" opacity="0.7"/>

          {/* Bottom center rose */}
          <ellipse cx="100" cy="198" rx="16" ry="13" fill="url(#roseGrad)" stroke="#C4A882" strokeWidth="0.5"/>
          <path d="M92 198 Q100 188 108 198 Q100 192 92 198" fill="#E8D5B7" opacity="0.7"/>
          
          {/* Bottom leaves */}
          <path d="M78 205 Q88 195 95 200" fill="#2D5016" opacity="0.8"/>
          <path d="M122 205 Q112 195 105 200" fill="#2D5016" opacity="0.8"/>
          <path d="M72 195 Q82 188 90 192" fill="#3A6B1E" opacity="0.6"/>
          <path d="M128 195 Q118 188 110 192" fill="#3A6B1E" opacity="0.6"/>

          {/* Baroque scrollwork left */}
          <path d="M45 60 Q35 55 30 65 Q25 75 35 78 Q28 82 22 78" fill="none" stroke="#D4AF37" strokeWidth="1.2" opacity="0.7"/>
          <path d="M42 155 Q32 160 28 150 Q24 140 34 138" fill="none" stroke="#D4AF37" strokeWidth="1" opacity="0.6"/>
          
          {/* Baroque scrollwork right */}
          <path d="M155 60 Q165 55 170 65 Q175 75 165 78 Q172 82 178 78" fill="none" stroke="#D4AF37" strokeWidth="1.2" opacity="0.7"/>
          <path d="M158 155 Q168 160 172 150 Q176 140 166 138" fill="none" stroke="#D4AF37" strokeWidth="1" opacity="0.6"/>

          {/* Text - Dutchkem */}
          <text x="100" y="105" textAnchor="middle" fontFamily="Georgia, serif" fontSize="22" fontWeight="bold" fill="#D4AF37" filter="url(#glow)">
            Dutchkem
          </text>
          
          {/* Text - Ventures */}
          <text x="100" y="135" textAnchor="middle" fontFamily="Georgia, serif" fontSize="18" fill="#FFD700" letterSpacing="2">
            Ventures
          </text>

          {/* Metallic sheen overlay */}
          <path d="M100 15 L162 38 L180 82 L176 135 L162 172 L135 200 L100 218 L68 192 L45 165 L32 130 L28 82 L45 42 Z" 
                fill="url(#shieldGrad)" opacity="0.1"/>
          
          {/* Subtle highlight */}
          <ellipse cx="85" cy="70" rx="30" ry="20" fill="white" opacity="0.05"/>
        </svg>
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
