import { Link, useNavigate } from '@tanstack/react-router'
import { useAuthActions } from "@convex-dev/auth/react"
import React, { useEffect, useState } from "react"
import { useMutation } from "convex/react"
import { api } from "../../../convex/_generated/api"
import { CompanyLogo } from '~/components/CompanyLogo';
import { FlashSaleBanner } from '~/components/FlashSaleBanner';
import { getExistingSubscription, isPushSupported, subscribeToPush, subscriptionToJSON, unsubscribeFromPush } from '~/lib/push';

export function DashboardSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
      <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );
}

export function TabButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: string, label: string }) {
  return (
    <button 
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
        active ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
      }`}
    >
      <span className="text-lg">{icon}</span>
      {label}
    </button>
  );
}

export function Header({ user, notifications }: { user: any, notifications: Array<any> }) {
  const { signOut } = useAuthActions();
  const navigate = useNavigate();
  const [time, setTime] = useState(new Date().toLocaleTimeString());
  const [showNotifs, setShowNotifs] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushSupported, setPushSupported] = useState(false);
  const subscribeToPushAction = useMutation(api.pushNotifications.subscribe);
  const unsubscribeFromPushAction = useMutation(api.pushNotifications.unsubscribe);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date().toLocaleTimeString()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    setPushSupported(isPushSupported());
    checkPushStatus();
  }, []);

  const checkPushStatus = async () => {
    const subscription = await getExistingSubscription();
    setPushEnabled(!!subscription);
  };

  const handlePushToggle = async () => {
    if (pushEnabled) {
      await unsubscribeFromPush();
      await unsubscribeFromPushAction({});
      setPushEnabled(false);
    } else {
      const subscription = await subscribeToPush();
      if (subscription) {
        const json = subscriptionToJSON(subscription);
        await subscribeToPushAction(json);
        setPushEnabled(true);
      }
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-white">Welcome back, {user.name || 'User'}! 👋</h1>
            <div className="flex items-center gap-3 mt-1">
              <p className="text-slate-300 text-[10px] font-black uppercase tracking-widest">{new Date().toLocaleDateString('en-NG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} • {time}</p>
              <div className="h-3 w-px bg-slate-600"></div>
              <p className="text-orange-400 text-[10px] font-black uppercase tracking-widest">TIN: 2512403526652</p>
            </div>
          </div>
      <div className="flex items-center gap-4">
        <div className="hidden md:block">
          <FlashSaleBanner />
        </div>

        {pushSupported && (
          <button
            onClick={handlePushToggle}
            className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all border ${
              pushEnabled
                ? 'bg-green-600 border-green-500 text-white shadow-lg'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
            }`}
            title={pushEnabled ? 'Push notifications enabled' : 'Enable push notifications'}
          >
            {pushEnabled ? '🔔' : '🔕'}
          </button>
        )}

        <div className="relative">
          <button 
            onClick={() => setShowNotifs(!showNotifs)}
            className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all border ${
              showNotifs ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg' : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            🔔
          </button>
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-600 text-[10px] text-white flex items-center justify-center rounded-full border-2 border-slate-950 font-black shadow-lg">
              {unreadCount}
            </span>
          )}

          {showNotifs && (
            <div className="absolute right-0 mt-4 w-80 bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl z-50 overflow-hidden ">
              <div className="p-4 border-b border-slate-800 bg-slate-900/50 flex justify-between items-center">
                <h3 className="font-black text-xs uppercase tracking-widest">Notifications</h3>
                <button className="text-[10px] font-black text-indigo-400 uppercase">Mark all read</button>
              </div>
              <div className="max-h-96 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center text-slate-500 text-xs italic">No new notifications</div>
                ) : (
                  notifications.map(n => (
                    <div key={n._id} className={`p-4 border-b border-slate-800 hover:bg-slate-800/30 transition-colors cursor-pointer ${!n.read ? 'bg-indigo-600/5' : ''}`}>
                      <p className="text-xs font-black mb-1">{n.title}</p>
                      <p className="text-[10px] text-slate-400 leading-relaxed">{n.message}</p>
                      <p className="text-[9px] text-slate-600 mt-2 font-bold uppercase">{new Date(n.createdAt).toLocaleTimeString()}</p>
                    </div>
                  ))
                )}
              </div>
              <button className="w-full py-3 bg-slate-800 text-[10px] font-black uppercase tracking-widest hover:bg-slate-700 transition-all">View All Notifications</button>
            </div>
          )}
        </div>
        <div className="flex items-center gap-3 pl-4 border-l border-slate-800 group relative cursor-pointer">
          <div className="text-right hidden md:block">
            <p className="text-sm font-black text-white leading-none">{user.name || 'Account'}</p>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{user.email}</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center font-black overflow-hidden border-2 border-indigo-500/20 shadow-lg group-hover:scale-105 transition-transform">
            {user.image ? <img src={user.image} alt="Avatar" className="w-full h-full object-cover" /> : <span className="text-white">{user.name?.[0] || 'U'}</span>}
          </div>
          
          <div className="absolute right-0 top-full mt-4 w-48 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl z-50 overflow-hidden opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 translate-y-2 group-hover:translate-y-0">
             <div className="p-2 space-y-1">
                 <button className="w-full text-left px-4 py-3 text-xs font-bold text-slate-300 hover:bg-slate-800 hover:text-white rounded-xl transition-colors">Profile Settings</button>
                 <button className="w-full text-left px-4 py-3 text-xs font-bold text-slate-300 hover:bg-slate-800 hover:text-white rounded-xl transition-colors">Billing & Plans</button>
                <button onClick={async () => { try { await signOut(); } catch {} navigate({ to: '/auth' }); }} className="w-full text-left px-4 py-3 text-xs font-bold text-red-400 hover:bg-red-500/10 rounded-xl transition-colors">Sign Out</button>
             </div>
          </div>
        </div>
      </div>
    </header>
  );
}

export function StatCard({ label, value, icon, color }: { label: string, value: any, icon: string, color: string }) {
  const colors: any = {
    indigo: "bg-indigo-600/10 text-indigo-400 border-indigo-500/20",
    emerald: "bg-emerald-600/10 text-emerald-400 border-emerald-500/20",
    blue: "bg-blue-600/10 text-blue-400 border-blue-500/20",
    amber: "bg-amber-600/10 text-amber-400 border-amber-500/20",
    teal: "bg-teal-600/10 text-teal-400 border-teal-500/20",
  };
  return (
    <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl">
      <div className={`w-10 h-10 rounded-xl mb-3 flex items-center justify-center text-xl border ${colors[color]}`}>
        {icon}
      </div>
      <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-1">{label}</p>
      <h4 className="text-xl font-bold text-white">{value}</h4>
    </div>
  );
}

export function Section({ title, children, actionLabel }: { title: string, children: any, actionLabel?: string }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-black text-white">{title}</h3>
        {actionLabel && <button className="text-xs text-indigo-400 font-bold hover:underline">{actionLabel} →</button>}
      </div>
      {children}
    </div>
  );
}

export function SubscriptionRow({ sub }: { sub: any }) {
  const daysRemaining = Math.max(0, Math.ceil((sub.endsAt - Date.now()) / (1000 * 60 * 60 * 24)));
  const percentage = Math.min(100, Math.max(0, (daysRemaining / 30) * 100));
  const priceMap: Record<string, string> = { weekly: "₦3,500/wk", monthly: "₦12,500/mo", quarterly: "₦32,000/qtr", yearly: "₦120,000/yr" };

  return (
    <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4 group hover:border-indigo-500/50 transition-all">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-indigo-600/10 rounded-xl flex items-center justify-center text-2xl border border-indigo-500/20 group-hover:scale-110 transition-transform">
          🤖
        </div>
        <div>
          <p className="font-black capitalize text-lg tracking-tight">{sub.plan} Agent Access</p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded font-black uppercase">{priceMap[sub.plan] || "₦12,500/mo"}</span>
            <span className="text-[10px] text-slate-500 italic">Next: {new Date(sub.endsAt).toLocaleDateString()}</span>
          </div>
        </div>
      </div>
      <div className="flex-grow max-w-md mx-4">
        <div className="flex justify-between text-[10px] uppercase font-black tracking-widest text-slate-500 mb-2">
          <span>{daysRemaining} Days remaining</span>
          <span className="text-emerald-400">ACTIVE ✅</span>
        </div>
        <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden border border-slate-700/50">
          <div className="h-full bg-gradient-to-r from-indigo-600 to-indigo-400 rounded-full transition-all duration-1000" style={{ width: `${percentage}%` }}></div>
        </div>
      </div>
      <div className="flex gap-2">
        <button className="px-4 py-2 bg-slate-800 text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-slate-700 transition-all border border-slate-700">Pause</button>
        <button className="px-4 py-2 bg-indigo-600 text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20">Upgrade</button>
      </div>
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const styles: any = {
    completed: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    "in-progress": "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
    revision: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  };
  return (
    <span className={`px-2 py-1 rounded-md text-[10px] font-bold border uppercase tracking-tighter ${styles[status] || styles["in-progress"]}`}>
      {status}
    </span>
  );
}

export function EmptyState({ icon, text }: { icon: string, text: string }) {
  return (
    <div className="p-12 text-center border-2 border-dashed border-slate-800 rounded-2xl">
      <div className="text-4xl mb-4">{icon}</div>
      <p className="text-slate-500 text-sm">{text}</p>
    </div>
  );
}

export function ActionButton({ icon, text, highlight, onClick }: { icon: string, text: string, highlight?: boolean, onClick?: () => void }) {
  return (
    <button onClick={onClick} className={`w-full py-3 px-4 rounded-xl font-bold flex items-center gap-3 transition-all ${
      highlight 
        ? 'bg-white text-indigo-600 hover:bg-slate-100 shadow-lg' 
        : 'bg-indigo-500 text-white hover:bg-indigo-400 border border-indigo-400/30'
    }`}>
      <span className="text-lg">{icon}</span>
      <span className="text-sm">{text}</span>
    </button>
  );
}

export function Input({ label, value, placeholder, disabled }: { label: string, value?: string, placeholder?: string, disabled?: boolean }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] uppercase font-bold text-slate-500 tracking-widest">{label}</label>
      <input 
        defaultValue={value}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all disabled:opacity-50 text-sm" 
      />
    </div>
  );
}

export function Toggle({ label, description, active }: { label: string, description: string, active?: boolean }) {
  return (
    <div className="flex items-center justify-between p-4 bg-slate-800/20 rounded-xl border border-slate-800">
      <div className="max-w-[80%]">
        <p className="text-sm font-bold">{label}</p>
        <p className="text-[10px] text-slate-500 leading-tight">{description}</p>
      </div>
      <button className={`w-12 h-6 rounded-full relative transition-all ${active ? 'bg-indigo-600' : 'bg-slate-700'}`}>
        <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${active ? 'right-1' : 'left-1'}`}></div>
      </button>
    </div>
  );
}

export function Footer() {
  return (
    <footer className="bg-slate-900 border-t border-slate-800 p-8 mt-auto">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
        <div className="text-center md:text-left">
          <p className="text-sm font-bold text-slate-300">Powered by Dutchkem Ventures ProSuite NG+</p>
          <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-tighter">© 2026 Dutchkem Ventures. RC: 9489855. All rights reserved.</p>
        </div>
        <div className="flex gap-6 text-xs text-slate-500 font-medium">
          <a href="/terms" className="hover:text-indigo-400">Terms of Service</a>
          <a href="/privacy" className="hover:text-indigo-400">Privacy Policy</a>
          <a href="/contact" className="hover:text-indigo-400">Help Center</a>
          <a href="/contact" className="hover:text-indigo-400">Contact Us</a>
        </div>
        <div className="flex gap-4">
          <SocialIcon icon="🐦" />
          <SocialIcon icon="📸" />
          <SocialIcon icon="💼" />
          <SocialIcon icon="💬" />
        </div>
      </div>
    </footer>
  );
}

function SocialIcon({ icon }: { icon: string }) {
  return (
    <button className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center hover:bg-slate-700 transition-all grayscale hover:grayscale-0">
      {icon}
    </button>
  );
}
