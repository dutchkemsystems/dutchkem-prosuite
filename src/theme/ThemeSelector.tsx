import { useTheme } from "./ThemeContext";
import { THEME_LIST, type Theme } from "./themes";

function ThemeCard({ theme, active, onSelect }: { theme: Theme; active: boolean; onSelect: () => void }) {
  const c = theme.colors;
  return (
    <button
      onClick={onSelect}
      className="group relative flex flex-col rounded-2xl overflow-hidden transition-all duration-300 hover:scale-[1.02]"
      style={{
        border: active
          ? `2px solid ${c.primary}`
          : "2px solid rgba(255,255,255,0.08)",
        background: active
          ? `linear-gradient(135deg, ${c.primary}15, ${c.secondary}10)`
          : "rgba(255,255,255,0.03)",
        boxShadow: active ? `0 0 30px ${c.primary}30` : "none",
      }}
    >
      {/* Preview bar */}
      <div
        className="h-24 w-full relative overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${c.bg}, ${c.bgSecondary}, ${c.bgTertiary})`,
        }}
      >
        {/* Mini effect indicators */}
        <div
          className="absolute top-3 left-3 w-3 h-3 rounded-full"
          style={{ background: c.primary, boxShadow: `0 0 10px ${c.primary}80` }}
        />
        <div
          className="absolute top-3 left-8 w-3 h-3 rounded-full"
          style={{ background: c.secondary, boxShadow: `0 0 10px ${c.secondary}80` }}
        />
        <div
          className="absolute top-3 left-13 w-3 h-3 rounded-full"
          style={{ background: c.accent, boxShadow: `0 0 10px ${c.accent}80` }}
        />

        {/* Large icon */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-4xl opacity-80 group-hover:scale-125 transition-transform duration-300">
            {theme.icon}
          </span>
        </div>

        {/* Gradient overlay */}
        <div
          className="absolute bottom-0 left-0 right-0 h-8"
          style={{
            background: `linear-gradient(to top, ${c.bg}, transparent)`,
          }}
        />
      </div>

      {/* Info */}
      <div className="p-4 text-left">
        <div className="flex items-center justify-between mb-1">
          <h4 className="text-sm font-black text-white tracking-wide">{theme.name}</h4>
          {active && (
            <span
              className="w-5 h-5 rounded-full flex items-center justify-center text-[10px]"
              style={{ background: c.primary }}
            >
              &#10003;
            </span>
          )}
        </div>
        <p className="text-[11px] text-slate-400 font-medium">{theme.description}</p>
        <div className="flex items-center gap-2 mt-3">
          <span
            className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest"
            style={{
              background: `${c.primary}20`,
              color: c.primary,
              border: `1px solid ${c.primary}40`,
            }}
          >
            {theme.mood}
          </span>
          <span className="text-[9px] text-slate-500 uppercase font-bold tracking-widest">
            {theme.effects.type}
          </span>
        </div>
      </div>

      {/* Active glow border animation */}
      {active && (
        <div
          className="absolute inset-0 rounded-2xl pointer-events-none"
          style={{
            border: `2px solid ${c.primary}`,
            animation: "themeGlow 2s ease-in-out infinite",
          }}
        />
      )}
    </button>
  );
}

export default function ThemeSelector() {
  const { currentTheme, changeTheme } = useTheme();

  return (
    <div className="space-y-6">
      <style>{`
        @keyframes themeGlow {
          0%, 100% { box-shadow: 0 0 10px var(--theme-primary, #6C3CE1); }
          50% { box-shadow: 0 0 25px var(--theme-primary, #6C3CE1); }
        }
      `}</style>

      {/* Current theme indicator */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
            style={{
              background: `linear-gradient(135deg, ${currentTheme.colors.bg}, ${currentTheme.colors.bgSecondary})`,
              border: `2px solid ${currentTheme.colors.primary}40`,
              boxShadow: `0 0 20px ${currentTheme.colors.primary}20`,
            }}
          >
            {currentTheme.icon}
          </div>
          <div>
            <h3 className="text-lg font-black text-white tracking-tight">
              Dashboard Theme
            </h3>
            <p className="text-xs text-slate-400 font-medium">
              Active: <span style={{ color: currentTheme.colors.primary }}>{currentTheme.name}</span> — {currentTheme.description}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div
            className="w-4 h-4 rounded-full"
            style={{ background: currentTheme.colors.primary }}
          />
          <div
            className="w-4 h-4 rounded-full"
            style={{ background: currentTheme.colors.secondary }}
          />
          <div
            className="w-4 h-4 rounded-full"
            style={{ background: currentTheme.colors.accent }}
          />
        </div>
      </div>

      {/* Theme grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {THEME_LIST.map((theme) => (
          <ThemeCard
            key={theme.id}
            theme={theme}
            active={currentTheme.id === theme.id}
            onSelect={() => changeTheme(theme.id)}
          />
        ))}
      </div>

      {/* Preview section */}
      <div className="rounded-2xl p-6 border border-white/5" style={{ background: "rgba(255,255,255,0.02)" }}>
        <h4 className="text-sm font-black text-white uppercase tracking-widest mb-4">
          Live Preview
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Preview card 1 */}
          <div
            className="rounded-xl p-4"
            style={{
              background: currentTheme.colors.card,
              border: `1px solid ${currentTheme.colors.cardBorder}`,
            }}
          >
            <div className="flex items-center gap-3 mb-3">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center text-sm"
                style={{ background: `${currentTheme.colors.primary}20` }}
              >
                <span style={{ color: currentTheme.colors.primary }}>&#9733;</span>
              </div>
              <div>
                <p className="text-xs font-bold text-white">Revenue Card</p>
                <p className="text-[10px] text-slate-400">This month</p>
              </div>
            </div>
            <p className="text-2xl font-black text-white">&#8358;2.4M</p>
            <div
              className="mt-2 h-1.5 rounded-full overflow-hidden"
              style={{ background: "rgba(255,255,255,0.05)" }}
            >
              <div
                className="h-full rounded-full"
                style={{ width: "65%", background: currentTheme.colors.primary }}
              />
            </div>
          </div>

          {/* Preview card 2 */}
          <div
            className="rounded-xl p-4"
            style={{
              background: currentTheme.colors.card,
              border: `1px solid ${currentTheme.colors.cardBorder}`,
            }}
          >
            <div className="flex items-center gap-3 mb-3">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center text-sm"
                style={{ background: `${currentTheme.colors.secondary}20` }}
              >
                <span style={{ color: currentTheme.colors.secondary }}>&#9881;</span>
              </div>
              <div>
                <p className="text-xs font-bold text-white">Active Tasks</p>
                <p className="text-[10px] text-slate-400">In progress</p>
              </div>
            </div>
            <p className="text-2xl font-black text-white">24</p>
            <div
              className="mt-2 h-1.5 rounded-full overflow-hidden"
              style={{ background: "rgba(255,255,255,0.05)" }}
            >
              <div
                className="h-full rounded-full"
                style={{ width: "80%", background: currentTheme.colors.secondary }}
              />
            </div>
          </div>

          {/* Preview card 3 */}
          <div
            className="rounded-xl p-4"
            style={{
              background: currentTheme.colors.card,
              border: `1px solid ${currentTheme.colors.cardBorder}`,
            }}
          >
            <div className="flex items-center gap-3 mb-3">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center text-sm"
                style={{ background: `${currentTheme.colors.accent}20` }}
              >
                <span style={{ color: currentTheme.colors.accent }}>&#9829;</span>
              </div>
              <div>
                <p className="text-xs font-bold text-white">Satisfaction</p>
                <p className="text-[10px] text-slate-400">User rating</p>
              </div>
            </div>
            <p className="text-2xl font-black text-white">98%</p>
            <div
              className="mt-2 h-1.5 rounded-full overflow-hidden"
              style={{ background: "rgba(255,255,255,0.05)" }}
            >
              <div
                className="h-full rounded-full"
                style={{ width: "98%", background: currentTheme.colors.accent }}
              />
            </div>
          </div>
        </div>

        {/* Preview button */}
        <div className="mt-4 flex gap-3">
          <button
            className="px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all hover:scale-105"
            style={{
              background: currentTheme.colors.button,
              color: "#fff",
              boxShadow: `0 4px 15px ${currentTheme.colors.shadow}`,
            }}
          >
            Primary Button
          </button>
          <button
            className="px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all hover:scale-105"
            style={{
              background: "transparent",
              color: currentTheme.colors.primary,
              border: `2px solid ${currentTheme.colors.primary}40`,
            }}
          >
            Secondary
          </button>
        </div>
      </div>
    </div>
  );
}
