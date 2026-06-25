import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useAuthActions } from "@convex-dev/auth/react";
import { useEffect, useState } from "react";
import { Authenticated, Unauthenticated } from "convex/react";
import { CompanyLogo } from "~/components/CompanyLogo";
import { AnimatedBackground } from "~/components/AnimatedBackground";

export const Route = createFileRoute('/auth')({
  component: AuthPage,
})

function AuthPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      <AnimatedBackground variant="login" />
      
      <div className="max-w-md w-full relative z-10">
        <div className="text-center mb-10 flex flex-col items-center">
          <div className="mb-6 p-4 bg-white/10 backdrop-blur-sm rounded-3xl border border-white/20">
            <CompanyLogo className="w-28 h-28" />
          </div>
          <h1 className="text-4xl font-black text-white uppercase tracking-tighter mb-2 drop-shadow-lg">ProSuite NG+</h1>
          <p className="text-white/80 font-medium text-lg">15 Expert AI Agents at Your Fingertips</p>
          <p className="text-white/60 text-sm mt-2">Sign in to start your journey</p>
        </div>

        <Unauthenticated>
          <GoogleSignInButton />
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
    <div className="bg-slate-900 border border-slate-800 p-10 rounded-[2.5rem] shadow-2xl text-center ">
      <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center text-emerald-500 text-4xl mx-auto mb-6 border border-emerald-500/20">✓</div>
      <h2 className="text-2xl font-black text-white mb-2 uppercase tracking-tight">Identity Verified</h2>
      <p className="text-slate-400 mb-8 font-medium">Welcome to Dutchkem Ventures ProSuite NG+. <br/>Initializing your workspace...</p>
      <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden">
        <div className="h-full bg-emerald-500 animate-loading-bar"></div>
      </div>
    </div>
  );
}

function GoogleSignInButton() {
  const { signIn } = useAuthActions();
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  return (
    <div className="bg-white/10 backdrop-blur-lg border border-white/20 p-10 rounded-[2.5rem] shadow-2xl ">
      <div className="space-y-6">
        <div className="text-center">
          <div className="text-4xl mb-4">🚀</div>
          <h2 className="text-2xl font-black text-white uppercase tracking-tight mb-1">Get Started</h2>
          <p className="text-white/70 text-sm font-medium">One click to access 15 AI experts</p>
        </div>

        {error && (
          <div className="bg-red-500/20 border border-red-500/30 p-4 rounded-xl">
            <p className="text-red-300 text-xs font-bold text-center uppercase tracking-tight">{error}</p>
          </div>
        )}

        <button
          type="button"
          disabled={isLoading}
          onClick={async () => {
            setError("")
            setIsLoading(true)
            try {
              await signIn("google", { redirectTo: "/dashboard" })
            } catch (err: any) {
              console.error("[Auth] Google sign-in error:", err)
              setError("Google Sign-In failed. Please try again.")
            } finally {
              setIsLoading(false)
            }
          }}
          className="w-full bg-white text-slate-900 py-5 rounded-2xl font-black text-lg hover:bg-slate-100 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-3 shadow-xl hover:shadow-2xl"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          SIGN IN WITH GOOGLE
        </button>

        <div className="text-center">
          <p className="text-white/50 text-xs font-medium">
            🔒 Bank-grade encryption • Your data is safe
          </p>
        </div>
      </div>
    </div>
  )
}
