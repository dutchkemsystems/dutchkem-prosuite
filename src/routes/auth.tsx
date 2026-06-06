import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useAuthActions } from "@convex-dev/auth/react";
import { useState, useEffect } from "react";
import { Authenticated, Unauthenticated } from "convex/react";
import { CompanyLogo } from "~/components/CompanyLogo";

export const Route = createFileRoute('/auth')({
  component: AuthPage,
})

function AuthPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4 relative overflow-hidden">
      {/* Decorative background */}
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,theme(colors.indigo.900/20),transparent)] pointer-events-none"></div>
      
      <div className="max-w-md w-full relative z-10">
        <div className="text-center mb-10 flex flex-col items-center">
          <CompanyLogo className="w-32 h-32 mb-6" />
          <h1 className="text-3xl font-black text-white uppercase tracking-tighter mb-2">ProSuite NG+</h1>
          <p className="text-slate-400 font-medium">Verify your identity to access the portal</p>
        </div>

        <Unauthenticated>
          <PhoneAuthForm />
        </Unauthenticated>

        <Authenticated>
          <AuthenticatedRedirect />
        </Authenticated>
      </div>
    </div>
  )
}

function AuthenticatedRedirect() {
  const navigate = useNavigate();
  
  useEffect(() => {
    const timer = setTimeout(() => {
      navigate({ to: '/dashboard' });
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="bg-slate-900 border border-slate-800 p-10 rounded-[2.5rem] shadow-2xl text-center animate-in fade-in zoom-in-95 duration-500">
      <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center text-emerald-500 text-4xl mx-auto mb-6 border border-emerald-500/20">✓</div>
      <h2 className="text-2xl font-black text-white mb-2 uppercase tracking-tight">Identity Verified</h2>
      <p className="text-slate-400 mb-8 font-medium">Welcome to Dutchkem Ventures ProSuite NG+. <br/>Initializing your workspace...</p>
      <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden">
        <div className="h-full bg-emerald-500 animate-loading-bar"></div>
      </div>
    </div>
  );
}

function PhoneAuthForm() {
  const { signIn } = useAuthActions();
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handlePhoneSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    
    const formData = new FormData(e.currentTarget);
    const phoneValue = formData.get("phone") as string;
    
    // Simple validation
    if (!phoneValue.match(/^\+?[0-9]{10,15}$/)) {
      setError("Please enter a valid telephone number (e.g. +234...)");
      setIsLoading(false);
      return;
    }

    setPhone(phoneValue);

    try {
      // Use the termii-otp provider we created
      await signIn("termii-otp", formData);
      setStep("otp");
    } catch (err: any) {
      const msg = err?.message || String(err || '');
      if (msg.includes('insufficient balance') || msg.includes('SMS delivery failed')) {
        setError("SMS service is temporarily out of credits. Please contact support or try again later.");
      } else if (msg.includes('Country Inactive')) {
        setError("SMS service not available for this region. Please contact support.");
      } else if (msg.includes('TERMII') || msg.includes('termii') || msg.includes('API Key')) {
        setError("SMS service temporarily unavailable. Please contact support or try again later.");
      } else if (msg.includes('network') || msg.includes('fetch')) {
        setError("Network error. Check your connection and try again.");
      } else {
        console.error("[Auth] signIn error:", err);
        setError("Failed to send verification code. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    const formData = new FormData(e.currentTarget);
    
    try {
      await signIn("termii-otp", formData);
      // Redirect happens automatically via Authenticated wrapper
    } catch (err: any) {
      setError("Invalid or expired code. Please check and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (step === "phone") {
    return (
      <form onSubmit={handlePhoneSubmit} className="bg-slate-900 border border-slate-800 p-10 rounded-[2.5rem] shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="space-y-6">
          <div>
            <label className="block text-[10px] uppercase font-black text-slate-500 tracking-[0.2em] mb-2">Telephone Number</label>
            <div className="relative">
              <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 font-bold">🇳🇬</span>
              <input
                name="phone"
                type="tel"
                placeholder="+234 812 345 6789"
                required
                autoFocus
                className="w-full bg-slate-950 border border-slate-700 rounded-2xl px-12 py-5 text-white font-black text-lg focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all"
              />
            </div>
          </div>
          
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl">
              <p className="text-red-500 text-xs font-bold text-center uppercase tracking-tight">{error}</p>
            </div>
          )}

          <button 
            disabled={isLoading}
            type="submit"
            className="w-full bg-gradient-primary text-white py-5 rounded-2xl font-black text-lg hover:scale-105 active:scale-95 transition-all disabled:opacity-50 shadow-xl shadow-orange-500/20"
          >
            {isLoading ? "REQUESTING CODE..." : "SEND ACCESS CODE"}
          </button>
          
          <div className="flex items-center gap-4 py-2">
            <div className="h-px bg-slate-800 flex-grow"></div>
            <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Enterprise Security</span>
            <div className="h-px bg-slate-800 flex-grow"></div>
          </div>
          
          <p className="text-[9px] text-slate-500 text-center font-bold uppercase tracking-widest leading-relaxed">
            By continuing, you agree to receive a one-time security code. Standard messaging rates apply.
          </p>
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={handleOtpSubmit} className="bg-slate-900 border border-slate-800 p-10 rounded-[2.5rem] shadow-2xl animate-in fade-in zoom-in-95 duration-300">
      <div className="space-y-6">
        <div className="text-center">
          <div className="text-4xl mb-4">📱</div>
          <h2 className="text-xl font-black text-white uppercase tracking-tight mb-1">Verify Phone</h2>
          <p className="text-slate-400 text-xs font-medium">Code sent to <span className="text-white font-bold">{phone}</span></p>
        </div>
        
        <div>
          <input name="phone" value={phone} type="hidden" />
          <input
            name="code"
            placeholder="000000"
            required
            autoComplete="one-time-code"
            inputMode="numeric"
            autoFocus
            className="w-full bg-slate-950 border border-slate-700 rounded-2xl px-5 py-6 text-white font-black text-4xl tracking-[0.6em] text-center focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all"
          />
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl">
            <p className="text-red-500 text-xs font-bold text-center uppercase tracking-tight">{error}</p>
          </div>
        )}

        <button 
          disabled={isLoading}
          type="submit"
          className="w-full bg-gradient-primary text-white py-5 rounded-2xl font-black text-lg hover:scale-105 active:scale-95 transition-all disabled:opacity-50 shadow-xl shadow-orange-500/20"
        >
          {isLoading ? "VERIFYING..." : "GRANT ACCESS"}
        </button>
        
        <button 
          type="button" 
          onClick={() => setStep("phone")}
          className="w-full text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] hover:text-slate-300 transition-colors"
        >
          Change Telephone Number
        </button>
      </div>
    </form>
  );
}
