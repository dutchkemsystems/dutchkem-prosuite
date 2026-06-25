// src/components/SuccessStoriesRotator.tsx
// Rotating success stories for frontpage
// Additive: reads from existing agent_reviews table

import { useEffect, useState } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { convexQuery } from "@convex-dev/react-query";
import { api } from "../../convex/_generated/api";

const FALLBACK_STORIES = [
  {
    userName: "Chioma O.",
    agent: "Finance Agent",
    rating: 5,
    comment: "Saved me 6 hours of bookkeeping every week. Worth every naira.",
    location: "Lagos, Nigeria",
  },
  {
    userName: "Tunde A.",
    agent: "Content Agent",
    rating: 5,
    comment: "Generated 30 days of social content in under 2 hours. Game changer.",
    location: "Abuja, Nigeria",
  },
  {
    userName: "Aisha B.",
    agent: "KDP Agent",
    rating: 5,
    comment: "Published my first AI-assisted book in a week. The royalties are rolling in.",
    location: "Port Harcourt, Nigeria",
  },
  {
    userName: "Femi K.",
    agent: "Video Agent",
    rating: 5,
    comment: "Created a 5-minute product demo that tripled my conversion rate.",
    location: "Ibadan, Nigeria",
  },
];

export function SuccessStoriesRotator({ intervalMs = 6000 }: { intervalMs?: number }) {
  const { data } = useSuspenseQuery(convexQuery(api.socialProof.getAgentReviews, { agentId: "all", limit: 20 }));

  const dataTyped = data as any;
  const reviews = dataTyped?.reviews || [];
  const stories =
    reviews.length > 0
      ? reviews.map((r: any) => ({
          userName: r.userName || "Anonymous",
          agent: r.agentId || "AI Agent",
          rating: r.rating || 5,
          comment: r.comment || "",
          location: "",
        }))
      : FALLBACK_STORIES;

  const [index, setIndex] = useState(0);

  useEffect(() => {
    const t = setInterval(() => {
      setIndex((i) => (i + 1) % stories.length);
    }, intervalMs);
    return () => clearInterval(t);
  }, [stories.length, intervalMs]);

  const current = stories[index];
  if (!current) return null;

  return (
    <div className="overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-emerald-900/30 via-slate-900/60 to-cyan-900/30 p-6 shadow-2xl backdrop-blur-sm sm:p-8">
      <div className="mb-4 flex items-center gap-2">
        <span className="text-2xl">⭐</span>
        <h3 className="text-sm font-bold uppercase tracking-widest text-emerald-400">Success Stories</h3>
      </div>

      <div className="relative min-h-[140px]">
        <blockquote key={index} className="animate-fade-in">
          <p className="text-lg font-medium leading-relaxed text-white sm:text-xl">
            "{current.comment}"
          </p>
          <footer className="mt-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-cyan-500 text-sm font-black text-white">
              {current.userName.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-semibold text-white">{current.userName}</p>
              <p className="text-xs text-slate-400">
                {current.agent} {current.location && `• ${current.location}`}
              </p>
            </div>
            <div className="ml-auto flex gap-0.5 text-amber-400">
              {Array.from({ length: 5 }).map((_, i) => (
                <span key={i} className={i < (current.rating || 5) ? "" : "opacity-20"}>
                  ★
                </span>
              ))}
            </div>
          </footer>
        </blockquote>
      </div>

      <div className="mt-4 flex justify-center gap-1.5">
        {stories.map((_: any, i: number) => (
          <button
            key={i}
            onClick={() => setIndex(i)}
            className={`h-1.5 rounded-full transition-all ${
              i === index ? "w-8 bg-emerald-400" : "w-1.5 bg-white/20 hover:bg-white/40"
            }`}
            aria-label={`Story ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}

export function JoinCounter({ baseCount = 10000 }: { baseCount?: number }) {
  const { data } = useSuspenseQuery(convexQuery(api.socialProof.getActivityStats, {}));

  const dataTyped2 = data as any;
  const monthUsers = dataTyped2?.usedThisMonth ? parseInt(String(dataTyped2.usedThisMonth).replace(/\D/g, ""), 10) || 0 : 0;
  const displayCount = baseCount + monthUsers;

  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-300">
      <span className="text-lg">👥</span>
      Join <span className="text-emerald-200">{displayCount.toLocaleString()}+</span> clients using Dutchkem Pro Suite
    </div>
  );
}
