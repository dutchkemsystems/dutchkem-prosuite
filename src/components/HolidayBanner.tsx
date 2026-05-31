import { useSuspenseQuery } from "@tanstack/react-query";
import { convexQuery } from "@convex-dev/react-query";
import { api } from "../../convex/_generated/api";
import { useState, useEffect } from "react";

export function HolidayBanner() {
  const { data: discount } = useSuspenseQuery(convexQuery(api.holidays.getActiveDiscount, {})) as any;
  const [isVisible, setIsVisible] = useState(true);
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    if (!discount) return;

    const timer = setInterval(() => {
      const now = Date.now();
      const diff = discount.ends_at - now;

      if (diff <= 0) {
        setTimeLeft("Offer ended");
        clearInterval(timer);
      } else {
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
        const mins = Math.floor((diff / (1000 * 60)) % 60);
        setTimeLeft(`${days}d ${hours}h ${mins}m`);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [discount]);

  if (!discount || !isVisible) return null;

  return (
    <div className="bg-gradient-to-r from-red-600 via-orange-600 to-red-600 text-white relative py-3 px-4 shadow-2xl animate-in fade-in slide-in-from-top duration-500 z-50">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <span className="text-3xl animate-bounce">{discount.banner_icon}</span>
          <div className="text-center md:text-left">
            <p className="font-black uppercase tracking-tighter text-lg md:text-xl leading-none">
              {discount.banner_text}
            </p>
            <p className="text-[10px] font-bold opacity-80 uppercase tracking-widest mt-1">
              Limited time offer for all Dutchkem AI Agents
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="bg-white/20 backdrop-blur-md rounded-xl px-4 py-2 border border-white/30 text-center min-w-[120px]">
            <p className="text-[8px] font-black uppercase tracking-widest opacity-70">Ends in</p>
            <p className="font-mono font-black text-sm">{timeLeft}</p>
          </div>
          
          <a href="/auth" className="bg-white text-orange-600 px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-orange-50 transition-all shadow-xl active:scale-95 whitespace-nowrap">
            Shop Now →
          </a>
          
          <button 
            onClick={() => setIsVisible(false)}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
            title="Close"
          >
            ✕
          </button>
        </div>
      </div>
      
      {/* Decorative sparkles */}
      <div className="absolute top-1 left-1/4 w-1 h-1 bg-white rounded-full animate-ping"></div>
      <div className="absolute bottom-2 right-1/3 w-1.5 h-1.5 bg-white rounded-full animate-pulse delay-75"></div>
      <div className="absolute top-1/2 left-10 w-1 h-1 bg-white rounded-full animate-pulse"></div>
    </div>
  );
}
