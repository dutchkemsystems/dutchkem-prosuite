import { Component, Suspense, useState } from "react";
import type { ReactNode } from "react";

export class ErrorBoundary extends Component<{ children: ReactNode; fallback?: ReactNode }, { hasError: boolean; error: Error | null }> {
  state = { hasError: false, error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { hasError: true, error }; }
  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="p-8 bg-red-500/10 border border-red-500/20 rounded-3xl text-center">
          <p className="text-red-500 font-black text-sm uppercase tracking-widest">Something went wrong</p>
          <p className="text-red-400 text-xs mt-2">{this.state.error?.message}</p>
          <button onClick={() => this.setState({ hasError: false, error: null })} className="mt-4 px-6 py-2 bg-slate-800 text-white rounded-xl text-xs font-bold">Retry</button>
        </div>
      );
    }
    return this.props.children;
  }
}

export function AdminSuspense({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary>
      <Suspense fallback={
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      }>
        {children}
      </Suspense>
    </ErrorBoundary>
  );
}

export function AdminTab({ active, onClick, icon, label, onClose }: any) {
  return (
    <button onClick={() => { onClick(); if (onClose) onClose(); }} className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all group ${
      active ? 'bg-orange-600 text-white shadow-2xl shadow-orange-600/20' : 'text-slate-500 hover:bg-slate-800 hover:text-slate-200'
    }`}>
      <span className={`text-xl transition-transform group-hover:scale-125 ${active ? 'scale-110' : ''}`}>{icon}</span> {label}
    </button>
  );
}

export function MetricCard({ label, value, icon, color, subValue, onClick }: any) {
  const colors: any = {
    red: "from-red-500/20 to-red-600/5 border-red-500/20 text-red-500",
    blue: "from-blue-500/20 to-blue-600/5 border-blue-500/20 text-blue-500",
    emerald: "from-emerald-500/20 to-emerald-600/5 border-emerald-500/20 text-emerald-500",
    amber: "from-amber-500/20 to-amber-600/5 border-amber-500/20 text-amber-500",
    indigo: "from-indigo-500/20 to-indigo-600/5 border-indigo-500/20 text-indigo-500",
    teal: "from-teal-500/20 to-teal-600/5 border-teal-500/20 text-teal-500",
  };
  return (
    <div onClick={onClick} className={`p-8 bg-gradient-to-br ${colors[color]} border rounded-[2.5rem] shadow-2xl hover:scale-[1.02] transition-all relative overflow-hidden group ${onClick ? "cursor-pointer" : ""}`}>
      <div className="flex justify-between items-start mb-6">
         <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl bg-white shadow-xl">{icon}</div>
         {subValue && <span className="text-[10px] font-black uppercase tracking-widest opacity-60 bg-white/10 px-3 py-1 rounded-full">{subValue}</span>}
      </div>
      <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] mb-2">{label}</p>
      <h4 className="text-4xl font-black text-white tracking-tighter">{value}</h4>
      {onClick && <p className="text-[8px] font-black uppercase tracking-widest opacity-40 mt-2">Click to view details</p>}
    </div>
  );
}

export function SecurityBar({ label, value, color }: any) {
  const colors: any = { indigo: "bg-indigo-500", emerald: "bg-emerald-500" };
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-[9px] font-black uppercase tracking-widest text-slate-500"><span>{label}</span><span>{value}%</span></div>
      <div className="h-1 w-full bg-slate-800 rounded-full overflow-hidden">
        <div className={`h-full ${colors[color]} rounded-full`} style={{ width: `${value}%` }}></div>
      </div>
    </div>
  );
}

export function UpdateCycleItem({ label, date, status, color }: any) {
  return (
    <div className="flex justify-between items-center p-6 bg-slate-900 rounded-2xl border border-white/5">
      <div>
        <p className="text-sm font-black text-white uppercase tracking-tight">{label}</p>
        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{date}</p>
      </div>
      <span className={`px-4 py-1 rounded-full text-[8px] font-black uppercase border ${color === 'orange' ? 'bg-orange-500/10 text-orange-500 border-orange-500/20' : 'bg-slate-800 text-slate-500 border-white/5'}`}>{status}</span>
    </div>
  );
}

export function ProfileAction({ label, className, onClick }: { label: string; className?: string; onClick?: () => void }) {
  return (
    <button onClick={onClick} className={`w-full text-left px-4 py-3 text-xs font-bold text-slate-400 hover:bg-slate-800 hover:text-white rounded-xl transition-all ${className || ''}`}>
      {label}
    </button>
  );
}

export function Footer() {
  return (
    <footer className="bg-slate-900 border-t border-slate-800 p-10 mt-auto">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-10">
        <div className="text-center md:text-left space-y-2">
          <p className="text-sm font-black text-white uppercase tracking-widest">Dutchkem Ventures Prosuite NG+ — RC: 9489855 | TIN: 2512403526652</p>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-relaxed">
            26, Opeki Road, Ipaja, Ayobo, Lagos | Tel: (+234)-911-339-3525
          </p>
          <p className="text-[9px] text-slate-600 font-black uppercase tracking-[0.4em]">© 2026 Dutchkem Ventures. All rights reserved.</p>
        </div>
        <div className="flex gap-4">
          <div className="px-6 py-3 bg-slate-950 rounded-2xl border border-white/5 flex items-center gap-3">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">System Entropy: Secure</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

export function LoadingScreen() {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white p-8">
      <div className="relative mb-12">
         <div className="w-24 h-24 border-4 border-slate-900 rounded-full"></div>
         <div className="absolute inset-0 border-t-4 border-orange-600 rounded-full animate-spin"></div>
      </div>
      <h2 className="text-3xl font-black uppercase tracking-[0.4em] text-white animate-pulse mb-4">Hardening Environment</h2>
      <p className="text-slate-500 font-black text-[10px] uppercase tracking-[0.5em] text-center max-w-md">Verifying Encryption Layers • Syncing Secure Nodes • Activating UAE Engine</p>
    </div>
  );
}
