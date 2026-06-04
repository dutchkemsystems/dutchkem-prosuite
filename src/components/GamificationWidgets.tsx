import { useState, useEffect } from "react";
import { useQuery } from "convex/react";

import { api } from "../../convex/_generated/api";

// ═══════════════════════════════════════════════════════════════════
// GAMIFICATION PROFILE — XP, levels, streaks, achievements
// ═══════════════════════════════════════════════════════════════════

export function GamificationProfile() {
  const profile = useQuery(api.gamification.getUserProfile, {});

  if (!profile) return null;

  return (
    <div className="space-y-4">
      {/* Level & XP */}
      <div className="rounded-2xl border border-white/5 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-500 text-2xl">
            {profile.currentLevel.icon}
          </div>
          <div className="flex-1">
            <div className="text-sm font-black text-white">
              Level {profile.currentLevel.level}: {profile.currentLevel.name}
            </div>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500"
                style={{ width: `${profile.xpProgress}%` }}
              />
            </div>
            <div className="mt-1 text-[10px] text-slate-400">
              {profile.totalXp.toLocaleString()} XP
              {profile.nextLevel && (
                <span>
                  {" "}
                  · {(profile.nextLevel.minXp - profile.totalXp).toLocaleString()} XP to next
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Streak */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-white/5 bg-white/5 p-3 text-center">
          <div className="text-2xl">🔥</div>
          <div className="mt-1 text-lg font-black text-white">{profile.streakDays}</div>
          <div className="text-[10px] text-slate-400">Day Streak</div>
        </div>
        <div className="rounded-xl border border-white/5 bg-white/5 p-3 text-center">
          <div className="text-2xl">🏆</div>
          <div className="mt-1 text-lg font-black text-white">{profile.longestStreak}</div>
          <div className="text-[10px] text-slate-400">Best Streak</div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-white/5 bg-white/5 p-3 text-center">
          <div className="text-lg font-black text-white">{profile.totalActions}</div>
          <div className="text-[10px] text-slate-400">Actions</div>
        </div>
        <div className="rounded-xl border border-white/5 bg-white/5 p-3 text-center">
          <div className="text-lg font-black text-white">{profile.level}</div>
          <div className="text-[10px] text-slate-400">Level</div>
        </div>
        <div className="rounded-xl border border-white/5 bg-white/5 p-3 text-center">
          <div className="text-lg font-black text-white">{profile.badges.length}</div>
          <div className="text-[10px] text-slate-400">Badges</div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// ACHIEVEMENTS LIST — Earned achievements with rarity
// ═══════════════════════════════════════════════════════════════════

const RARITY_COLORS = {
  common: "bg-gray-500/20 text-gray-400 border-gray-500/30",
  uncommon: "bg-green-500/20 text-green-400 border-green-500/30",
  rare: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  epic: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  legendary: "bg-amber-500/20 text-amber-400 border-amber-500/30",
};

export function AchievementsList() {
  const achievements = useQuery(api.gamification.getAchievements, {});
  const allAchievements = useQuery(api.gamification.getAllAchievements, {});

  if (!achievements || !allAchievements) return null;

  const earnedIds = new Set(achievements.map((a) => a.achievementId));

  return (
    <div className="rounded-2xl border border-white/5 bg-white/5 p-4">
      <h4 className="mb-3 text-sm font-black text-white">
        🏅 Achievements ({earnedIds.size}/{allAchievements.length})
      </h4>

      <div className="grid grid-cols-2 gap-2">
        {allAchievements.map((ach) => {
          const isEarned = earnedIds.has(ach.id);
          const rarityColor = RARITY_COLORS[ach.rarity];

          return (
            <div
              key={ach.id}
              className={`rounded-xl border p-3 transition-all ${
                isEarned
                  ? `${rarityColor} border-current/30`
                  : "border-white/5 bg-white/5 opacity-50"
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-xl">{isEarned ? ach.icon : "🔒"}</span>
                <div>
                  <div className="text-xs font-bold text-white">{ach.name}</div>
                  <div className="text-[9px] text-slate-400">{ach.description}</div>
                </div>
              </div>
              {isEarned && (
                <div className="mt-2 text-[9px] font-bold uppercase">
                  {ach.rarity}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// POINTS HISTORY — Recent point-earning actions
// ═══════════════════════════════════════════════════════════════════

export function PointsHistory() {
  const history = useQuery(api.gamification.getPointHistory, { limit: 10 });

  if (!history || history.length === 0) return null;

  const ACTION_ICONS: Record<string, string> = {
    subscribe_weekly: "💳",
    subscribe_monthly: "💳",
    subscribe_quarterly: "💳",
    subscribe_yearly: "💳",
    referral_signup: "🤝",
    referral_conversion: "🤝",
    connect_platform: "🌐",
    social_post: "📣",
    daily_login: "📅",
    weekly_streak_bonus: "🔥",
    leave_review: "⭐",
    complete_job: "✅",
    publish_book: "📚",
  };

  return (
    <div className="rounded-2xl border border-white/5 bg-white/5 p-4">
      <h4 className="mb-3 text-sm font-black text-white">📜 Recent Activity</h4>

      <div className="space-y-2">
        {history.map((entry) => (
          <div
            key={entry._id}
            className="flex items-center justify-between rounded-xl border border-white/5 bg-white/5 p-3"
          >
            <div className="flex items-center gap-3">
              <span className="text-lg">
                {ACTION_ICONS[entry.action] || "🎯"}
              </span>
              <div>
                <div className="text-xs font-bold text-white">
                  {entry.action.replace(/_/g, " ")}
                </div>
                <div className="text-[9px] text-slate-400">
                  {new Date(entry.createdAt).toLocaleDateString()}
                </div>
              </div>
            </div>
            <div className="text-sm font-bold text-green-400">
              +{entry.points} XP
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// LEADERBOARD — Top users ranking
// ═══════════════════════════════════════════════════════════════════

export function Leaderboard() {
  const leaderboard = useQuery(api.gamification.getLeaderboard, { limit: 10 });

  if (!leaderboard || leaderboard.length === 0) return null;

  return (
    <div className="rounded-2xl border border-white/5 bg-white/5 p-4">
      <h4 className="mb-3 text-sm font-black text-white">🏆 Leaderboard</h4>

      <div className="space-y-2">
        {leaderboard.map((entry) => (
          <div
            key={entry.userId}
            className={`flex items-center gap-3 rounded-xl border p-3 ${
              entry.rank <= 3
                ? "border-amber-500/30 bg-amber-500/5"
                : "border-white/5 bg-white/5"
            }`}
          >
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-lg font-bold ${
                entry.rank === 1
                  ? "bg-amber-500 text-black"
                  : entry.rank === 2
                  ? "bg-slate-400 text-black"
                  : entry.rank === 3
                  ? "bg-amber-700 text-white"
                  : "bg-white/10 text-slate-400"
              }`}
            >
              {entry.rank}
            </div>
            <div className="flex-1">
              <div className="text-sm font-bold text-white">
                {entry.levelInfo.icon} Level {entry.level}
              </div>
              <div className="text-[10px] text-slate-400">
                🔥 {entry.currentStreak} day streak
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm font-bold text-indigo-400">
                {entry.totalXp.toLocaleString()} XP
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
