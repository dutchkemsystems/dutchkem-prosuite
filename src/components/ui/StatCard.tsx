const STAT_CARD_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  indigo: { bg: 'from-indigo-500/10 to-indigo-600/5', border: 'border-indigo-500/20', text: 'text-indigo-300' },
  emerald: { bg: 'from-emerald-500/10 to-emerald-600/5', border: 'border-emerald-500/20', text: 'text-emerald-300' },
  rose: { bg: 'from-rose-500/10 to-rose-600/5', border: 'border-rose-500/20', text: 'text-rose-300' },
  blue: { bg: 'from-blue-500/10 to-blue-600/5', border: 'border-blue-500/20', text: 'text-blue-300' },
  amber: { bg: 'from-amber-500/10 to-amber-600/5', border: 'border-amber-500/20', text: 'text-amber-300' },
  purple: { bg: 'from-purple-500/10 to-purple-600/5', border: 'border-purple-500/20', text: 'text-purple-300' },
  pink: { bg: 'from-pink-500/10 to-pink-600/5', border: 'border-pink-500/20', text: 'text-pink-300' },
  slate: { bg: 'from-slate-500/10 to-slate-600/5', border: 'border-slate-500/20', text: 'text-slate-300' },
};

type StatCardProps = {
  label: string;
  value: string | number;
  icon: string;
  color?: string;
};

export function StatCard({ label, value, icon, color = "slate" }: StatCardProps) {
  const c = STAT_CARD_COLORS[color] || STAT_CARD_COLORS.slate;
  return (
    <div className={`bg-gradient-to-br ${c.bg} ${c.border} border rounded-2xl p-4`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-slate-400 uppercase font-bold">{label}</span>
        <span className="text-xl">{icon}</span>
      </div>
      <div className={`text-2xl font-black ${c.text}`}>{value}</div>
    </div>
  );
}
