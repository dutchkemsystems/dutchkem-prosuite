import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAuthActions } from "@convex-dev/auth/react";

/**
 * InactivityLogout - 10-minute inactivity timer with popup warning
 * Works on both Admin Dashboard and Client Dashboard
 * 
 * Timeline:
 * - 0-9:30 → User active, timer running silently
 * - 9:30 → Popup appears: "Are you still there?"
 * - 9:30-10:00 → 30 seconds to respond
 * - 10:00 → Force logout if no response
 */
export function InactivityLogout({ 
  adminMode = false,
  logoutPath = "/auth" 
}: { 
  adminMode?: boolean;
  logoutPath?: string;
}) {
  const navigate = useNavigate();
  const { signOut } = useAuthActions();
  const [showPopup, setShowPopup] = useState(false);
  const [countdown, setCountdown] = useState(30);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());
  const popupShownRef = useRef(false);

  const INACTIVITY_LIMIT = 10 * 60 * 1000; // 10 minutes
  const WARNING_AT = 9.5 * 60 * 1000; // 9 minutes 30 seconds
  const FORCE_LOGOUT_AFTER = 30; // 30 seconds after popup

  const logout = useCallback(async () => {
    // Clear all timers
    if (timerRef.current) clearTimeout(timerRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
    
    setShowPopup(false);
    popupShownRef.current = false;

    try {
      if (adminMode) {
        localStorage.removeItem("admin_session_token");
      }
      await signOut();
    } catch {
      // Sign out even if error
    }
    navigate({ to: logoutPath });
  }, [adminMode, logoutPath, navigate, signOut]);

  const resetTimer = useCallback(() => {
    lastActivityRef.current = Date.now();
    popupShownRef.current = false;
    setShowPopup(false);
    setCountdown(FORCE_LOGOUT_AFTER);

    if (timerRef.current) clearTimeout(timerRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);

    // Set warning timer (9:30)
    timerRef.current = setTimeout(() => {
      setShowPopup(true);
      popupShownRef.current = true;

      // Start countdown
      let remaining = FORCE_LOGOUT_AFTER;
      setCountdown(remaining);

      countdownRef.current = setInterval(() => {
        remaining--;
        setCountdown(remaining);
        if (remaining <= 0) {
          clearInterval(countdownRef.current!);
          logout();
        }
      }, 1000);
    }, WARNING_AT);
  }, [logout]);

  const handleActivity = useCallback(() => {
    // Only reset if popup is not showing
    // If popup is showing, we don't reset - we let the countdown continue
    if (!popupShownRef.current) {
      lastActivityRef.current = Date.now();
    }
  }, []);

  const handleStayLoggedIn = useCallback(() => {
    resetTimer();
  }, [resetTimer]);

  const handleLogoutNow = useCallback(() => {
    logout();
  }, [logout]);

  useEffect(() => {
    // Start the timer
    resetTimer();

    // Activity events
    const events = [
      "mousedown",
      "mousemove",
      "keydown",
      "scroll",
      "touchstart",
      "click",
      "keypress",
    ];

    // Throttle activity handler to avoid excessive resets
    let lastCall = 0;
    const throttledHandler = () => {
      const now = Date.now();
      if (now - lastCall > 1000) { // Max once per second
        lastCall = now;
        handleActivity();
      }
    };

    events.forEach((event) => {
      document.addEventListener(event, throttledHandler, { passive: true });
    });

    // Also reset on focus
    window.addEventListener("focus", throttledHandler);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
      events.forEach((event) => {
        document.removeEventListener(event, throttledHandler);
      });
      window.removeEventListener("focus", throttledHandler);
    };
  }, [resetTimer, handleActivity]);

  if (!showPopup) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl p-10 max-w-md mx-4 shadow-2xl space-y-6">
        <div className="text-center space-y-4">
          <div className="text-5xl">⏰</div>
          <h3 className="text-2xl font-black text-white uppercase tracking-tighter">
            Are You Still There?
          </h3>
          <p className="text-slate-400 text-sm">
            You&apos;ve been inactive for a while. For your security, you&apos;ll be
            logged out automatically.
          </p>
        </div>

        {/* Countdown */}
        <div className="text-center">
          <div className="inline-flex items-center gap-2 px-6 py-3 bg-red-500/10 border border-red-500/20 rounded-2xl">
            <span className="text-red-500 font-black text-2xl font-mono">{countdown}</span>
            <span className="text-red-400 text-xs font-bold uppercase">seconds remaining</span>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex gap-4">
          <button
            onClick={handleLogoutNow}
            className="flex-1 py-4 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl text-sm font-bold transition-all"
          >
            Logout Now
          </button>
          <button
            onClick={handleStayLoggedIn}
            className="flex-1 py-4 bg-orange-600 hover:bg-orange-500 text-white rounded-2xl text-sm font-bold transition-all"
          >
            Stay Logged In
          </button>
        </div>

        <p className="text-center text-slate-600 text-[9px] uppercase tracking-widest">
          {adminMode ? "Admin Session" : "User Session"} • Auto-logout after 10 min inactivity
        </p>
      </div>
    </div>
  );
}
