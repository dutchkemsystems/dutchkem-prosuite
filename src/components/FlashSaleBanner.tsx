import { useEffect, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

interface FlashSale {
  _id: string;
  name: string;
  discountPercent: number;
  endsAt: number;
  maxUses: number | null;
  currentUses: number;
  applicablePlans: string[];
}

interface Countdown {
  hours: number;
  minutes: number;
  seconds: number;
}

export function FlashSaleBanner() {
  const flashSales = useQuery(api.flashSales.getActiveFlashSales, {});
  const [countdowns, setCountdowns] = useState<Record<string, Countdown>>({});

  useEffect(() => {
    if (!flashSales || flashSales.length === 0) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const newCountdowns: Record<string, Countdown> = {};

      for (const sale of flashSales) {
        const remaining = sale.endsAt - now;
        if (remaining > 0) {
          newCountdowns[sale._id] = {
            hours: Math.floor(remaining / (1000 * 60 * 60)),
            minutes: Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60)),
            seconds: Math.floor((remaining % (1000 * 60)) / 1000),
          };
        }
      }

      setCountdowns(newCountdowns);
    }, 1000);

    return () => clearInterval(interval);
  }, [flashSales]);

  if (!flashSales || flashSales.length === 0) return null;

  return (
    <div className="space-y-3">
      {flashSales.map((sale) => {
        const countdown = countdowns[sale._id];
        if (!countdown) return null;

        const remainingUses = sale.maxUses
          ? sale.maxUses - sale.currentUses
          : null;

        return (
          <div
            key={sale._id}
            className="relative overflow-hidden rounded-xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-red-500/10 p-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-amber-500 text-lg font-bold text-black">
                  {sale.discountPercent}%OFF
                </div>
                <div>
                  <h3 className="font-semibold text-amber-400">{sale.name}</h3>
                  <p className="text-sm text-gray-400">
                    Limited time offer
                    {remainingUses !== null && (
                      <span className="ml-2 text-red-400">
                        Only {remainingUses} spots left!
                      </span>
                    )}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  <div className="rounded bg-amber-500/20 px-2 py-1 text-center">
                    <div className="text-lg font-bold text-amber-400">
                      {String(countdown.hours).padStart(2, "0")}
                    </div>
                    <div className="text-[10px] text-gray-500">HRS</div>
                  </div>
                  <div className="text-lg font-bold text-amber-400">:</div>
                  <div className="rounded bg-amber-500/20 px-2 py-1 text-center">
                    <div className="text-lg font-bold text-amber-400">
                      {String(countdown.minutes).padStart(2, "0")}
                    </div>
                    <div className="text-[10px] text-gray-500">MIN</div>
                  </div>
                  <div className="text-lg font-bold text-amber-400">:</div>
                  <div className="rounded bg-amber-500/20 px-2 py-1 text-center">
                    <div className="text-lg font-bold text-amber-400">
                      {String(countdown.seconds).padStart(2, "0")}
                    </div>
                    <div className="text-[10px] text-gray-500">SEC</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Animated progress bar */}
            <div className="mt-3 h-1 overflow-hidden rounded-full bg-amber-500/20">
              <div
                className="h-full animate-pulse bg-gradient-to-r from-amber-500 to-orange-500"
                style={{
                  width: `${Math.max(10, (countdown.hours * 3600 + countdown.minutes * 60 + countdown.seconds) / (24 * 3600) * 100)}%`,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
