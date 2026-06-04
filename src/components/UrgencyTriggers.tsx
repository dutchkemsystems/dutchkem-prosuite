import { useEffect, useState } from "react";
import { useQuery } from "convex/react";

import { api } from "../../convex/_generated/api";

interface UrgencyProps {
  planId: string;
  planName?: string;
}

interface UrgencyData {
  recentPurchases: number;
  activeViewers: number;
  lowStock: boolean;
  trending: boolean;
}

export function UrgencyTriggers({ planId, planName }: UrgencyProps) {
  const urgencyData = useQuery(api.flashSales.getUrgencyStats, { planId });
  const [viewerCount, setViewerCount] = useState(0);

  // Simulate fluctuating viewer count
  useEffect(() => {
    if (!urgencyData) return;

    setViewerCount(urgencyData.activeViewers);

    const interval = setInterval(() => {
      setViewerCount((prev) => {
        const change = Math.floor(Math.random() * 3) - 1; // -1, 0, or 1
        return Math.max(1, prev + change);
      });
    }, 5000);

    return () => clearInterval(interval);
  }, [urgencyData]);

  if (!urgencyData) return null;

  const triggers = [];

  // Recent purchases trigger
  if (urgencyData.recentPurchases > 0) {
    triggers.push({
      icon: "🔥",
      text: `${urgencyData.recentPurchases} user${urgencyData.recentPurchases > 1 ? "s" : ""} purchased in the last hour`,
      color: "text-orange-400",
    });
  }

  // Active viewers trigger
  if (viewerCount > 0) {
    triggers.push({
      icon: "👁️",
      text: `${viewerCount} ${viewerCount === 1 ? "person is" : "people are"} viewing this plan right now`,
      color: "text-blue-400",
    });
  }

  // Low stock trigger
  if (urgencyData.lowStock) {
    triggers.push({
      icon: "⚡",
      text: "Low availability — selling fast!",
      color: "text-red-400",
    });
  }

  // Trending trigger
  if (urgencyData.trending && !urgencyData.lowStock) {
    triggers.push({
      icon: "📈",
      text: "Trending — popular choice this week",
      color: "text-green-400",
    });
  }

  if (triggers.length === 0) return null;

  return (
    <div className="space-y-2">
      {triggers.map((trigger, i) => (
        <div
          key={i}
          className="flex items-center gap-2 rounded-lg border border-white/5 bg-white/5 px-3 py-2"
        >
          <span className="text-sm">{trigger.icon}</span>
          <span className={`text-xs ${trigger.color}`}>{trigger.text}</span>
        </div>
      ))}
    </div>
  );
}

// Compact version for inline use
export function UrgencyBadge({ planId }: { planId: string }) {
  const urgencyData = useQuery(api.flashSales.getUrgencyStats, { planId });

  if (!urgencyData) return null;

  if (urgencyData.lowStock) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-500/20 px-2 py-0.5 text-xs text-red-400">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-400" />
        Low Stock
      </span>
    );
  }

  if (urgencyData.trending) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-green-500/20 px-2 py-0.5 text-xs text-green-400">
        🔥 Trending
      </span>
    );
  }

  if (urgencyData.recentPurchases > 0) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-orange-500/20 px-2 py-0.5 text-xs text-orange-400">
        {urgencyData.recentPurchases} purchased recently
      </span>
    );
  }

  return null;
}

// Countdown timer component
export function CountdownTimer({
  endsAt,
  onEnd,
}: {
  endsAt: number;
  onEnd?: () => void;
}) {
  const [remaining, setRemaining] = useState(endsAt - Date.now());

  useEffect(() => {
    if (remaining <= 0) {
      onEnd?.();
      return;
    }

    const interval = setInterval(() => {
      setRemaining(endsAt - Date.now());
    }, 1000);

    return () => clearInterval(interval);
  }, [endsAt, onEnd]);

  if (remaining <= 0) {
    return <span className="text-sm text-gray-500">Sale ended</span>;
  }

  const hours = Math.floor(remaining / (1000 * 60 * 60));
  const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((remaining % (1000 * 60)) / 1000);

  return (
    <div className="flex items-center gap-1 font-mono">
      <span className="rounded bg-white/10 px-1.5 py-0.5 text-sm">
        {String(hours).padStart(2, "0")}
      </span>
      <span>:</span>
      <span className="rounded bg-white/10 px-1.5 py-0.5 text-sm">
        {String(minutes).padStart(2, "0")}
      </span>
      <span>:</span>
      <span className="rounded bg-white/10 px-1.5 py-0.5 text-sm">
        {String(seconds).padStart(2, "0")}
      </span>
    </div>
  );
}
