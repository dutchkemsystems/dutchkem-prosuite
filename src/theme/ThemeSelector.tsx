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
      {/* Preview bar with theme gradient */}
      <div
        className="h-24 w-full relative overflow-hidden"
        style={{ background: theme.background }}
      >
        <div
          className="absolute top-3 left-3 w-3 h-3 rounded-full"
          style={{ background: c.primary, boxShadow: `0 0 10px ${c.primary}80` }}
        />
        <div
          className="absolute top-3 left-8 w-3 h-3 rounded-full"
          style={{ background: c.secondary, boxShadow: `0 0 10px ${c.secondary}80` }}
        />
        <div
          className="absolute top-3 left-[3.25rem] w-3 h-3 rounded-full"
          style={{ background: c.accent, boxShadow: `0 0 10px ${c.accent}80` }}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-4xl opacity-80 group-hover:scale-125 transition-transform duration-300">
            {theme.icon}
          </span>
        </div>
        <div
          className="absolute bottom-0 left-0 right-0 h-8"
          style={{ background: `linear-gradient(to top, rgba(0,0,0,0.6), transparent)` }}
        />
      </div>

      {/* Theme info */}
      <div className="p-3 flex-1 flex flex-col justify-between">
        <div>
          <h4 className="text-sm font-bold text-white mb-0.5">{theme.name}</h4>
          <p className="text-[10px] text-slate-400 leading-tight">{theme.description}</p>
        </div>
        <div className="flex items-center justify-between mt-2">
          <span className="text-[9px] text-slate-500 uppercase tracking-wider">{theme.mood}</span>
          {active && (
            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold text-white" style={{ background: c.primary }}>
              Active
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

export default function ThemeSelector() {
  const { currentTheme, changeTheme } = useTheme();

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {THEME_LIST.map((theme) => (
          <ThemeCard
            key={theme.id}
            theme={theme}
            active={currentTheme.id === theme.id}
            onSelect={() => changeTheme(theme.id)}
          />
        ))}
      </div>
      <p className="text-[10px] text-slate-500 text-center">
        Click any theme to apply it instantly. Your selection is saved automatically.
      </p>
    </div>
  );
}
