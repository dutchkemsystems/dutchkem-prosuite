import { useState, useEffect } from "react";
import { useQuery } from "convex/react";

import { api } from "../../convex/_generated/api";

// ═══════════════════════════════════════════════════════════════════
// EXIT-INTENT POPUP — Captures leaving users with targeted offers
// ═══════════════════════════════════════════════════════════════════

interface ExitIntentPopupProps {
  onDismiss?: () => void;
  onConvert?: (code: string) => void;
}

export function ExitIntentPopup({ onDismiss, onConvert }: ExitIntentPopupProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [hasShown, setHasShown] = useState(false);
  const [countdown, setCountdown] = useState({ hours: 24, minutes: 0, seconds: 0 });

  const popupConfig = useQuery(api.exitIntent.getPopupConfig, {});
  const displaySettings = useQuery(api.exitIntent.getDisplaySettings, {});

  // Exit intent detection
  useEffect(() => {
    if (hasShown || !displaySettings) return;

    const handleMouseLeave = (e: MouseEvent) => {
      // Only trigger when mouse leaves from top of viewport
      if (e.clientY <= displaySettings.exitIntentThreshold) {
        // Check cooldown
        const lastDismissed = localStorage.getItem("exit_popup_dismissed");
        if (lastDismissed) {
          const daysSince = (Date.now() - parseInt(lastDismissed)) / (1000 * 60 * 60 * 24);
          if (daysSince < displaySettings.dismissCooldownDays) return;
        }

        const lastConverted = localStorage.getItem("exit_popup_converted");
        if (lastConverted) {
          const daysSince = (Date.now() - parseInt(lastConverted)) / (1000 * 60 * 60 * 24);
          if (daysSince < displaySettings.conversionCooldownDays) return;
        }

        // Check session impressions
        const sessionCount = parseInt(sessionStorage.getItem("exit_popup_count") || "0");
        if (sessionCount >= displaySettings.maxImpressionsPerSession) return;

        setIsVisible(true);
        setHasShown(true);
        sessionStorage.setItem("exit_popup_count", String(sessionCount + 1));
      }
    };

    // Delay before enabling
    const timer = setTimeout(() => {
      document.addEventListener("mouseleave", handleMouseLeave);
    }, displaySettings.showDelayMs);

    return () => {
      clearTimeout(timer);
      document.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [hasShown, displaySettings]);

  // Countdown timer
  useEffect(() => {
    if (!isVisible) return;

    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev.seconds > 0) {
          return { ...prev, seconds: prev.seconds - 1 };
        } else if (prev.minutes > 0) {
          return { ...prev, minutes: prev.minutes - 1, seconds: 59 };
        } else if (prev.hours > 0) {
          return { hours: prev.hours - 1, minutes: 59, seconds: 59 };
        }
        return prev;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isVisible]);

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem("exit_popup_dismissed", String(Date.now()));
    onDismiss?.();
  };

  const handleConvert = () => {
    setIsVisible(false);
    localStorage.setItem("exit_popup_converted", String(Date.now()));
    if (popupConfig?.code) {
      onConvert?.(popupConfig.code);
    }
  };

  if (!isVisible || !popupConfig) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative mx-4 w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900 to-slate-800 shadow-2xl animate-in zoom-in-95 duration-300">
        {/* Close button */}
        <button
          onClick={handleDismiss}
          className="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white/60 transition-colors hover:bg-white/20 hover:text-white"
        >
          ✕
        </button>

        {/* Header */}
        <div className="relative bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-8 text-center">
          <div className="mb-2 text-4xl font-black text-white">{popupConfig.offer}</div>
          <div className="text-sm text-white/80">{popupConfig.subtitle}</div>
        </div>

        {/* Content */}
        <div className="px-6 py-6">
          <h3 className="mb-2 text-xl font-black text-white">{popupConfig.title}</h3>

          {/* Countdown */}
          <div className="mb-4 flex items-center justify-center gap-2">
            <span className="text-xs text-slate-400">Offer expires in:</span>
            <div className="flex gap-1">
              <span className="rounded bg-white/10 px-2 py-1 font-mono text-sm font-bold text-white">
                {String(countdown.hours).padStart(2, "0")}
              </span>
              <span className="text-white">:</span>
              <span className="rounded bg-white/10 px-2 py-1 font-mono text-sm font-bold text-white">
                {String(countdown.minutes).padStart(2, "0")}
              </span>
              <span className="text-white">:</span>
              <span className="rounded bg-white/10 px-2 py-1 font-mono text-sm font-bold text-white">
                {String(countdown.seconds).padStart(2, "0")}
              </span>
            </div>
          </div>

          {/* Promo code */}
          {popupConfig.code && (
            <div className="mb-4 rounded-xl border border-dashed border-indigo-500/50 bg-indigo-500/10 p-3 text-center">
              <div className="text-[10px] font-bold uppercase tracking-widest text-indigo-400">
                Use code at checkout
              </div>
              <div className="mt-1 font-mono text-lg font-black text-white">
                {popupConfig.code}
              </div>
            </div>
          )}

          {/* CTA Button */}
          <button
            onClick={handleConvert}
            className="w-full rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 py-4 font-black text-white shadow-lg transition-all hover:from-indigo-500 hover:to-purple-500 hover:shadow-xl"
          >
            {popupConfig.cta}
          </button>

          {/* Urgency text */}
          <p className="mt-3 text-center text-[10px] text-slate-500">{popupConfig.urgency}</p>
        </div>

        {/* Dismiss link */}
        <div className="border-t border-white/5 px-6 py-3 text-center">
          <button
            onClick={handleDismiss}
            className="text-xs text-slate-500 transition-colors hover:text-white"
          >
            No thanks, I'll pay full price
          </button>
        </div>
      </div>
    </div>
  );
}
